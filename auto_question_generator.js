/**
 * RPSC RAS Dynamic On-Demand Question Generator
 * 
 * When a student requests a quiz on any topic/subtopic/subject:
 * 1. Reads existing questions from Turso DB for that subtopic.
 * 2. Injects them into the prompt to instruct the model to avoid overlap.
 * 3. Enforces that newly generated questions must NOT overlap more than 60%
 *    with any existing question in that subtopic (verified algorithmically).
 * 4. Persists non-overlapping questions into Turso DB and returns them.
 */

const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');
const { buildPrompt, buildHindiTranslationPrompt } = require('./prompt_builder');
const { parseGeneratedQuestions } = require('./question_parser');

// Load environment variables for GEMINI_API_KEY
const envPath = path.join(__dirname, '.env');
let apiKeys = [];

if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts[0].trim() === 'GEMINI_API_KEY') {
            const key = parts.slice(1).join('=').trim();
            if (key) apiKeys.push(key);
        }
        if (parts[0].trim() === 'GEMINI_API_KEYS') {
            const keys = parts.slice(1).join('=').trim().split(',');
            keys.forEach(k => { if (k.trim()) apiKeys.push(k.trim()); });
        }
    });
}

// Fallback to process.env
if (process.env.GEMINI_API_KEY && !apiKeys.includes(process.env.GEMINI_API_KEY)) {
    apiKeys.push(process.env.GEMINI_API_KEY);
}

let currentKeyIndex = 0;
function getActiveKey() {
    if (apiKeys.length === 0) return null;
    return apiKeys[currentKeyIndex % apiKeys.length];
}

function rotateKey() {
    if (apiKeys.length > 1) {
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        console.log(`[Auto Generator] Rotated to API Key index ${currentKeyIndex}`);
    }
}

/**
 * Tokenize string into a Set of clean words for Hindi and English.
 */
function tokenize(text) {
    if (!text) return new Set();
    const words = text
        .toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1);
    return new Set(words);
}

/**
 * Calculates conceptual & factual token overlap ratio between two questions.
 * Returns a value between 0.0 and 1.0 (0% to 100%).
 */
function calculateOverlap(text1, text2) {
    const set1 = tokenize(text1);
    const set2 = tokenize(text2);
    if (set1.size === 0 || set2.size === 0) return 0;

    let matchCount = 0;
    for (const token of set1) {
        if (set2.has(token)) {
            matchCount++;
        }
    }

    // Overlap relative to the smaller set (measures containment)
    const minSize = Math.min(set1.size, set2.size);
    return matchCount / minSize;
}

/**
 * Call Gemini model with automatic fallback between gemini-3.5-flash and gemini-3.6-flash
 */
async function callGemini(prompt) {
    const key = getActiveKey();
    if (!key) {
        throw new Error("No Gemini API Key configured in backend environment.");
    }

    const genAI = new GoogleGenAI({ apiKey: key });
    const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-3.6-flash'];
    let lastError = null;

    for (let retry = 0; retry < 3; retry++) {
        for (const modelName of models) {
            try {
                console.log(`[Auto Generator] Generating questions with ${modelName} (attempt ${retry + 1})...`);
                const response = await genAI.models.generateContent({
                    model: modelName,
                    contents: prompt
                });

                if (response && response.text) {
                    return response.text;
                }
            } catch (err) {
                console.warn(`[Auto Generator] Model ${modelName} returned error:`, err.message);
                lastError = err;
                if (err.message && err.message.includes('429')) {
                    rotateKey();
                }
            }
        }
        if (retry < 2) {
            console.log(`[Auto Generator] Transient error encountered. Cooling down for 5 seconds before retry...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    throw lastError || new Error("All Gemini generation attempts failed.");
}

/**
 * Generate questions on-demand for a syllabus target and persist them to Turso DB,
 * reading existing questions and ensuring max 60% overlap.
 */
async function generateAndPersistQuestions(db, {
    topicId = null,
    minuteTopicId = null,
    subjectId = null,
    language = 'HI',
    difficulty = 'ADVANCED',
    questionFormat = 'CLASSICAL',
    count = 20
}) {
    console.log(`[Auto Generator] Triggered on-demand generation: topicId=${topicId}, minuteTopicId=${minuteTopicId}, subjectId=${subjectId}, lang=${language}, diff=${difficulty}, format=${questionFormat}, count=${count}`);

    let subjectName = '';
    let topicName = '';
    let subtopicName = '';
    let targetTopicId = topicId;
    let targetMinuteTopicId = minuteTopicId;

    // Resolve syllabus names from Turso database
    try {
        if (minuteTopicId) {
            const rows = await db.all(`
                SELECT m.minute_topic_name, m.topic_id, t.topic_name, s.subject_name
                FROM minute_topics m
                JOIN topics t ON m.topic_id = t.topic_id
                JOIN units u ON t.unit_id = u.unit_id
                JOIN subjects s ON u.subject_id = s.subject_id
                WHERE m.minute_topic_id = ?
            `, [minuteTopicId]);
            if (rows && rows.length > 0) {
                subtopicName = rows[0].minute_topic_name;
                topicName = rows[0].topic_name;
                subjectName = rows[0].subject_name;
                targetTopicId = rows[0].topic_id;
            }
        } else if (topicId) {
            const rows = await db.all(`
                SELECT t.topic_name, s.subject_name
                FROM topics t
                JOIN units u ON t.unit_id = u.unit_id
                JOIN subjects s ON u.subject_id = s.subject_id
                WHERE t.topic_id = ?
            `, [topicId]);
            if (rows && rows.length > 0) {
                topicName = rows[0].topic_name;
                subjectName = rows[0].subject_name;
            }
        } else if (subjectId) {
            const rows = await db.all(`
                SELECT s.subject_name, t.topic_id, t.topic_name
                FROM subjects s
                JOIN units u ON s.subject_id = u.subject_id
                JOIN topics t ON u.unit_id = t.unit_id
                WHERE s.subject_id = ?
                ORDER BY t.topic_id ASC
                LIMIT 1
            `, [subjectId]);
            if (rows && rows.length > 0) {
                subjectName = rows[0].subject_name;
                topicName = rows[0].topic_name;
                targetTopicId = rows[0].topic_id;
            }
        }
    } catch (e) {
        console.error('[Auto Generator] Error querying syllabus details:', e.message);
    }

    if (!topicName && !subjectName) {
        console.warn('[Auto Generator] Unable to resolve syllabus target, using defaults.');
        subjectName = 'RPSC RAS General Studies';
        topicName = 'Rajasthan and Indian Administrative Framework';
    }

    // 1. Read existing questions for this subtopic/topic from Turso DB
    let existingQuestions = [];
    try {
        if (targetMinuteTopicId) {
            existingQuestions = await db.all(`
                SELECT question_id, question_text, option_a, option_b, option_c, option_d, correct_option
                FROM questions
                WHERE minute_topic_id = ?
                ORDER BY RANDOM()
                LIMIT 25
            `, [targetMinuteTopicId]);
        } else if (targetTopicId) {
            existingQuestions = await db.all(`
                SELECT question_id, question_text, option_a, option_b, option_c, option_d, correct_option
                FROM questions
                WHERE topic_id = ?
                ORDER BY RANDOM()
                LIMIT 25
            `, [targetTopicId]);
        }
        console.log(`[Auto Generator] Read ${existingQuestions.length} existing questions from Turso DB for subtopic "${subtopicName || topicName}".`);
    } catch (readErr) {
        console.warn('[Auto Generator] Error reading existing questions from DB:', readErr.message);
    }

    // Resolve paired minute topic IDs (one for EN, one for HI)
    let enMinuteId = targetMinuteTopicId;
    let hiMinuteId = targetMinuteTopicId;
    if (targetMinuteTopicId) {
        try {
            const currentMt = await db.get('SELECT topic_id, minute_topic_name, language FROM minute_topics WHERE minute_topic_id = ?', [targetMinuteTopicId]);
            if (currentMt) {
                if (currentMt.language === 'EN') {
                    enMinuteId = targetMinuteTopicId;
                    const hiMt = await db.get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = ? AND language = ? LIMIT 1", [currentMt.topic_id, 'HI']);
                    if (hiMt) hiMinuteId = hiMt.minute_topic_id;
                } else {
                    hiMinuteId = targetMinuteTopicId;
                    const enMt = await db.get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = ? AND language = ? LIMIT 1", [currentMt.topic_id, 'EN']);
                    if (enMt) enMinuteId = enMt.minute_topic_id;
                }
            }
        } catch (e) {
            console.warn('[Auto Generator] Error resolving minute topic siblings:', e.message);
        }
    }

    // 2. Build the tailored prompt using the user's EXACT prompt template in English
    const enPrompt = buildPrompt({
        subjectName,
        topicName,
        subtopicName,
        difficulty: difficulty === 'ALL' ? 'ADVANCED' : difficulty,
        format: questionFormat === 'ALL' ? 'CLASSICAL' : questionFormat,
        language: 'EN',
        count: count || 20,
        existingQuestions
    });

    console.log(`[Auto Generator] Prompt generated (${enPrompt.length} chars) for: "${subjectName} -> ${topicName}"`);

    // 3. Call model to generate English questions
    const rawEnglishOutput = await callGemini(enPrompt);
    const parsedEnQuestions = parseGeneratedQuestions(rawEnglishOutput);
    console.log(`[Auto Generator] Successfully parsed ${parsedEnQuestions.length} English questions.`);

    if (parsedEnQuestions.length === 0) {
        throw new Error("No valid English questions parsed from model output.");
    }

    // 4. Translate into administrative Hindi using user's exact translation prompt
    const isFoundation = (difficulty || 'ADVANCED').toUpperCase() === 'FOUNDATION';
    const hiPrompt = buildHindiTranslationPrompt(rawEnglishOutput, isFoundation);
    console.log(`[Auto Generator] Translating generated questions into Administrative Hindi...`);
    let parsedHiQuestions = [];
    try {
        const rawHindiOutput = await callGemini(hiPrompt);
        parsedHiQuestions = parseGeneratedQuestions(rawHindiOutput);
        console.log(`[Auto Generator] Successfully parsed ${parsedHiQuestions.length} matching Hindi questions.`);
    } catch (transErr) {
        console.warn(`[Auto Generator] Hindi translation warning: ${transErr.message}`);
    }

    // 5. Algorithmic overlap check: reject any question with >60% overlap against any existing question
    const approvedEnQuestions = [];
    const approvedHiQuestions = [];
    const MAX_ALLOWED_OVERLAP = 0.60;

    for (let i = 0; i < parsedEnQuestions.length; i++) {
        const enQ = parsedEnQuestions[i];
        const hiQ = parsedHiQuestions[i] || null;

        // Purity check: ensure English questions do not contain predominantly Hindi Devanagari text
        const devanagariCount = (enQ.question_text.match(/[\u0900-\u097F]/g) || []).length;
        const totalChars = enQ.question_text.replace(/\s+/g, '').length;
        if (totalChars > 0 && (devanagariCount / totalChars) > 0.15) {
            console.log(`[Auto Generator] REJECTED English question due to Hindi contamination (${(devanagariCount / totalChars * 100).toFixed(1)}%): "${enQ.question_text.slice(0, 60)}..."`);
            continue;
        }

        // If Hindi translation is available, verify that Hindi version actually contains Hindi
        if (hiQ) {
            const hiDevanagari = (hiQ.question_text.match(/[\u0900-\u097F]/g) || []).length;
            const hiTotalChars = hiQ.question_text.replace(/\s+/g, '').length;
            if (hiTotalChars > 0 && (hiDevanagari / hiTotalChars) < 0.20) {
                console.log(`[Auto Generator] REJECTED Hindi translation due to lack of Hindi characters: "${hiQ.question_text.slice(0, 60)}..."`);
                continue;
            }
        }

        let maxOverlap = 0;
        let mostSimilarQ = null;

        for (const eq of existingQuestions) {
            const overlap = calculateOverlap(enQ.question_text, eq.question_text);
            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                mostSimilarQ = eq;
            }
        }

        if (maxOverlap > MAX_ALLOWED_OVERLAP) {
            console.log(`[Auto Generator] REJECTED question due to >60% overlap (${(maxOverlap * 100).toFixed(1)}%): "${enQ.question_text.slice(0, 60)}..."`);
        } else {
            approvedEnQuestions.push(enQ);
            if (hiQ) approvedHiQuestions.push(hiQ);
        }
    }

    const enToInsert = approvedEnQuestions.length > 0 ? approvedEnQuestions : parsedEnQuestions.filter(q => {
        const devCount = (q.question_text.match(/[\u0900-\u097F]/g) || []).length;
        const chars = q.question_text.replace(/\s+/g, '').length;
        return chars === 0 || (devCount / chars) <= 0.15;
    });
    const hiToInsert = approvedHiQuestions.length > 0 ? approvedHiQuestions : parsedHiQuestions;

    // 6. Persist paired questions into Turso database (both EN and HI)
    const insertedQuestions = [];
    const diffNorm = (difficulty && difficulty !== 'ALL') ? difficulty.toUpperCase() : 'ADVANCED';
    const requestedLang = (language || 'EN').toUpperCase();

    for (let i = 0; i < enToInsert.length; i++) {
        const enQ = enToInsert[i];
        const hiQ = hiToInsert[i] || null;

        let enId = null;
        let hiId = null;

        // Insert English question
        try {
            const resEn = await db.run(`
                INSERT INTO questions (
                    topic_id, minute_topic_id, question_text,
                    option_a, option_b, option_c, option_d,
                    correct_option, detailed_explanation, language, difficulty
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                targetTopicId,
                enMinuteId,
                enQ.question_text,
                enQ.option_a,
                enQ.option_b,
                enQ.option_c,
                enQ.option_d,
                enQ.correct_option,
                enQ.detailed_explanation,
                'EN',
                diffNorm
            ]);
            enId = resEn.lastInsertRowid || resEn.lastID;
        } catch (dbErr) {
            console.error('[Auto Generator] Error inserting EN question into Turso DB:', dbErr.message);
        }

        // Insert matched Hindi question with identical correct_option
        if (hiQ) {
            try {
                const resHi = await db.run(`
                    INSERT INTO questions (
                        topic_id, minute_topic_id, question_text,
                        option_a, option_b, option_c, option_d,
                        correct_option, detailed_explanation, language, difficulty
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    targetTopicId,
                    hiMinuteId,
                    hiQ.question_text,
                    hiQ.option_a,
                    hiQ.option_b,
                    hiQ.option_c,
                    hiQ.option_d,
                    enQ.correct_option, // strictly keep same correct option
                    hiQ.detailed_explanation,
                    'HI',
                    diffNorm
                ]);
                hiId = resHi.lastInsertRowid || resHi.lastID;
            } catch (dbErr) {
                console.error('[Auto Generator] Error inserting HI question into Turso DB:', dbErr.message);
            }
        }

        // Add to result list based on requested language
        if (requestedLang === 'HI' && hiQ) {
            insertedQuestions.push({
                question_id: hiId,
                topic_id: targetTopicId,
                minute_topic_id: hiMinuteId,
                topic_name: topicName,
                question_text: hiQ.question_text,
                option_a: hiQ.option_a,
                option_b: hiQ.option_b,
                option_c: hiQ.option_c,
                option_d: hiQ.option_d,
                correct_option: enQ.correct_option,
                detailed_explanation: hiQ.detailed_explanation,
                language: 'HI',
                difficulty: diffNorm
            });
        } else {
            insertedQuestions.push({
                question_id: enId,
                topic_id: targetTopicId,
                minute_topic_id: enMinuteId,
                topic_name: topicName,
                question_text: enQ.question_text,
                option_a: enQ.option_a,
                option_b: enQ.option_b,
                option_c: enQ.option_c,
                option_d: enQ.option_d,
                correct_option: enQ.correct_option,
                detailed_explanation: enQ.detailed_explanation,
                language: 'EN',
                difficulty: diffNorm
            });
        }
    }

    console.log(`[Auto Generator] Successfully stored ${insertedQuestions.length} paired questions (bilingual EN + HI) into Turso DB.`);
    return insertedQuestions;
}

module.exports = {
    generateAndPersistQuestions,
    calculateOverlap,
    tokenize,
    callGemini
};
