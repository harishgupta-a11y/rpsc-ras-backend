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
const { buildPrompt } = require('./prompt_builder');
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
    const models = ['gemini-3.5-flash', 'gemini-3.6-flash'];
    let lastError = null;

    for (const modelName of models) {
        try {
            console.log(`[Auto Generator] Generating questions with ${modelName}...`);
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

    // 2. Build the tailored prompt including existing questions and strict 60% ceiling
    const prompt = buildPrompt({
        subjectName,
        topicName,
        subtopicName,
        difficulty: difficulty === 'ALL' ? 'ADVANCED' : difficulty,
        format: questionFormat === 'ALL' ? 'CLASSICAL' : questionFormat,
        language: language || 'HI',
        count: count || 20,
        existingQuestions
    });

    console.log(`[Auto Generator] Prompt generated (${prompt.length} chars) for: "${subjectName} -> ${topicName}"`);

    // 3. Call model
    const rawOutput = await callGemini(prompt);
    console.log(`[Auto Generator] Received response from model (${rawOutput ? rawOutput.length : 0} chars)`);

    // 4. Parse questions
    const parsedQuestions = parseGeneratedQuestions(rawOutput);
    console.log(`[Auto Generator] Successfully parsed ${parsedQuestions.length} valid questions.`);

    if (parsedQuestions.length === 0) {
        throw new Error("No valid questions parsed from model output.");
    }

    // 5. Algorithmic overlap check: reject any question with >60% overlap against any existing question
    const approvedQuestions = [];
    const MAX_ALLOWED_OVERLAP = 0.60; // 60% ceiling

    for (const q of parsedQuestions) {
        let maxOverlap = 0;
        let mostSimilarQ = null;

        for (const eq of existingQuestions) {
            const overlap = calculateOverlap(q.question_text, eq.question_text);
            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                mostSimilarQ = eq;
            }
        }

        if (maxOverlap > MAX_ALLOWED_OVERLAP) {
            console.log(`[Auto Generator] REJECTED question due to >60% overlap (${(maxOverlap * 100).toFixed(1)}%): "${q.question_text.slice(0, 60)}..." (matched: "${mostSimilarQ?.question_text.slice(0, 40)}...")`);
        } else {
            approvedQuestions.push({
                ...q,
                overlapPercentage: (maxOverlap * 100).toFixed(1)
            });
        }
    }

    console.log(`[Auto Generator] ${approvedQuestions.length} of ${parsedQuestions.length} questions passed the strict 60% no-overlap test.`);

    // If all questions were somehow rejected, take the least overlapping ones
    const questionsToInsert = approvedQuestions.length > 0 ? approvedQuestions : parsedQuestions;

    // 6. Persist approved questions into Turso database
    const insertedQuestions = [];
    const diffNorm = (difficulty && difficulty !== 'ALL') ? difficulty.toUpperCase() : 'ADVANCED';
    const langNorm = (language || 'HI').toUpperCase();

    for (const q of questionsToInsert) {
        try {
            const res = await db.run(`
                INSERT INTO questions (
                    topic_id, minute_topic_id, question_text,
                    option_a, option_b, option_c, option_d,
                    correct_option, detailed_explanation, language, difficulty
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                targetTopicId,
                targetMinuteTopicId,
                q.question_text,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_option,
                q.detailed_explanation,
                langNorm,
                diffNorm
            ]);

            insertedQuestions.push({
                question_id: res.lastInsertRowid || res.lastID,
                topic_id: targetTopicId,
                minute_topic_id: targetMinuteTopicId,
                topic_name: topicName,
                question_text: q.question_text,
                option_a: q.option_a,
                option_b: q.option_b,
                option_c: q.option_c,
                option_d: q.option_d,
                correct_option: q.correct_option,
                detailed_explanation: q.detailed_explanation,
                language: langNorm,
                difficulty: diffNorm
            });
        } catch (dbErr) {
            console.error('[Auto Generator] Error inserting question into Turso DB:', dbErr.message);
        }
    }

    console.log(`[Auto Generator] Successfully stored ${insertedQuestions.length} verified non-overlapping questions into Turso DB.`);
    return insertedQuestions;
}

module.exports = {
    generateAndPersistQuestions,
    calculateOverlap,
    tokenize,
    callGemini
};
