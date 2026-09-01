const fs = require('fs');
const path = require('path');
const mammoth = require('C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/node_modules/mammoth');
const { createClient } = require('@libsql/client');

// Load environment variables
if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    env.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}

const dbUrl = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'rpsc_ras.db')}`;
const dbToken = process.env.TURSO_AUTH_TOKEN || '';

const client = createClient({
    url: dbUrl,
    authToken: dbToken
});

// Helper to convert HTML to clean text
function convertHtmlToText(html) {
    let text = html;
    text = text.replace(/<p[^>]*>/g, '\n');
    text = text.replace(/<\/p>/g, '\n');
    text = text.replace(/<br\s*\/?>/g, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/\n\s*\n+/g, '\n\n');
    return text.trim();
}

// Fetch Google Doc text via export endpoint
async function fetchGoogleDocText(gdocUrl) {
    let docId = '';
    const match = gdocUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) docId = match[1];
    else throw new Error("Invalid Google Doc URL format.");

    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    const res = await fetch(exportUrl);
    if (!res.ok) throw new Error("Failed to download Google Doc. Ensure it is shared as 'Anyone with the link can view'.");
    return await res.text();
}

// Call Gemini API to clean questions in chunks
async function cleanQuestionsBatch(rawBlocks) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in environment.");
    }

    const cleanedQuestions = [];
    const chunkSize = 5;

    for (let i = 0; i < rawBlocks.length; i += chunkSize) {
        const chunk = rawBlocks.slice(i, i + chunkSize);
        const chunkText = chunk.join('\n\n=== NEW BLOCK ===\n\n');
        
        console.log(` -> AI cleaning questions ${i + 1} to ${Math.min(i + chunkSize, rawBlocks.length)}...`);
        
        const prompt = `You are an elite expert proofreader and editor for RPSC RAS exam materials. 
I have a set of questions that look AI-generated (overly verbose, containing unnecessary academic fluff).

Your job is to rewrite them to look strictly human-made and clear, while respecting the following guidelines:
1. Shorten the questions: Remove all verbose AI fluff. Keep them direct, punchy, and natural.
2. Zero Summarization: Do not omit or change any micro-facts, coordinate numbers, historical dates (e.g. 646 AD), or committee/dynasty/ruler/place names.
3. Keep the sequence: Maintain the exact sequence of questions. Do not drop or miss any questions.
4. Correctness: Verify each question's facts against standard history. Correct any factual errors.
5. Format match type questions: If you find any match-the-following style questions, convert the columns into a clean markdown table form (do NOT use ASCII border symbols or code characters for lines).
6. Explanations in point form: Convert paragraph explanations into a clean list of bullet points (e.g., "- Point 1\\n- Point 2") for readability.
7. Output format: Use EXACTLY this pattern per question block:
Q. [question text]
1) [option 1]
2) [option 2]
3) [option 3]
4) [option 4]
Correct: [1/2/3/4]
Explanation:
- [bullet point]

CRITICAL: Options MUST use 1) 2) 3) 4) — NOT A) B) C) D). Correct: must be a single digit (1, 2, 3, or 4).

Here is the chunk to edit:
${chunkText}

Provide ONLY the cleaned, human-like questions in the same order. Do not write any markdown code fences, headers, or conversational text.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini API returned status ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
            cleanedQuestions.push(text.trim());
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // rate limit buffer
    }

    return cleanedQuestions.join('\n\n');
}

// Parse plain text block into structured database fields
function parseCleanedBlock(block) {
    const rawLines = block.split('\n').map(l => l.trim()).filter(Boolean);
    let questionText = '';
    let optA = '', optB = '', optC = '', optD = '';
    let correct = '';
    let explanationLines = [];
    let parsingExp = false;
    
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        
        if (line.startsWith('Q.')) {
            questionText = line.replace(/^Q\.\s*/, '').trim();
            continue;
        }
        if (line.startsWith('1)')) { optA = line.replace(/^1\)\s*/, '').trim(); continue; }
        if (line.startsWith('2)')) { optB = line.replace(/^2\)\s*/, '').trim(); continue; }
        if (line.startsWith('3)')) { optC = line.replace(/^3\)\s*/, '').trim(); continue; }
        if (line.startsWith('4)')) { optD = line.replace(/^4\)\s*/, '').trim(); continue; }
        // Also support legacy A/B/C/D for backward compatibility
        if (line.startsWith('A)')) { optA = line.replace(/^A\)\s*/, '').trim(); continue; }
        if (line.startsWith('B)')) { optB = line.replace(/^B\)\s*/, '').trim(); continue; }
        if (line.startsWith('C)')) { optC = line.replace(/^C\)\s*/, '').trim(); continue; }
        if (line.startsWith('D)')) { optD = line.replace(/^D\)\s*/, '').trim(); continue; }
        if (line.startsWith('Correct:')) {
            let raw = line.replace(/^Correct:\s*/, '').trim();
            // Normalize letter to number if legacy format
            const letterMap = { A: '1', B: '2', C: '3', D: '4' };
            correct = letterMap[raw.toUpperCase()] || raw;
            continue;
        }
        if (line.startsWith('Explanation:')) {
            parsingExp = true;
            const expVal = line.replace(/^Explanation:\s*/, '').trim();
            if (expVal) explanationLines.push(expVal);
            continue;
        }
        
        if (!parsingExp && !optA && !correct) {
            questionText += '\n' + line;
        } else if (parsingExp) {
            explanationLines.push(line);
        }
    }
    
    return {
        question: questionText.trim(),
        A: optA,
        B: optB,
        C: optC,
        D: optD,
        correct: correct,
        explanation: explanationLines.join('\n').trim()
    };
}

async function main() {
    // Parse CLI arguments
    const args = {};
    for (let i = 2; i < process.argv.length; i += 2) {
        const key = process.argv[i].replace('--', '');
        const val = process.argv[i + 1];
        args[key] = val;
    }

    const { file, gdoc, topic, subtopic, lang = 'EN', difficulty = 'FOUNDATION', clean = 'true' } = args;

    if (!topic || !subtopic) {
        console.error("Error: --topic [ID] and --subtopic [ID] are required arguments.");
        console.log("Usage: node upload_questions.js --file ./path.docx --topic 2 --subtopic 2125");
        console.log("   or: node upload_questions.js --gdoc https://docs.google.com/... --topic 2 --subtopic 2125");
        process.exit(1);
    }

    let rawText = '';

    // Step 1: Read content
    if (file) {
        const resolvedPath = path.resolve(file);
        console.log(`Loading local file: ${resolvedPath}`);
        if (!fs.existsSync(resolvedPath)) {
            console.error("Local file does not exist.");
            process.exit(1);
        }
        if (file.endsWith('.docx')) {
            const resHtml = await mammoth.convertToHtml({ path: resolvedPath });
            rawText = convertHtmlToText(resHtml.value);
        } else {
            rawText = fs.readFileSync(resolvedPath, 'utf8');
        }
    } else if (gdoc) {
        console.log(`Fetching Google Doc: ${gdoc}`);
        rawText = await fetchGoogleDocText(gdoc);
    } else {
        console.error("Error: Either --file or --gdoc must be provided.");
        process.exit(1);
    }

    // Split raw questions
    const rawBlocks = rawText.split(/\n+(?=Q\.)/i).map(b => b.trim()).filter(Boolean);
    console.log(`Loaded ${rawBlocks.length} raw questions.`);

    let cleanedText = '';
    if (clean === 'true') {
        console.log("Starting AI formatting...");
        cleanedText = await cleanQuestionsBatch(rawBlocks);
    } else {
        cleanedText = rawText;
    }

    // Step 2: Parse cleaned blocks
    const finalBlocks = cleanedText.split(/\n+(?=Q\.)/i).map(b => b.trim()).filter(Boolean);
    const parsedQuestions = finalBlocks.map(parseCleanedBlock);
    console.log(`Parsed ${parsedQuestions.length} structured questions for upload.`);

    // Step 3: Seed to Turso
    try {
        console.log("Connecting to Turso Cloud DB...");
        
        // Clear existing for the subtopic
        await client.execute({
            sql: "DELETE FROM questions WHERE minute_topic_id = ?",
            args: [parseInt(subtopic)]
        });
        console.log(`Cleared existing questions for minute_topic_id = ${subtopic} in Turso.`);

        let count = 0;
        for (const q of parsedQuestions) {
            await client.execute({
                sql: `
                    INSERT INTO questions (
                        topic_id, question_text, option_a, option_b, option_c, option_d, 
                        correct_option, detailed_explanation, minute_topic_id, language, difficulty
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    parseInt(topic),
                    q.question,
                    q.A,
                    q.B,
                    q.C,
                    q.D,
                    q.correct,
                    q.explanation,
                    parseInt(subtopic),
                    lang,
                    difficulty
                ]
            });
            count++;
        }
        console.log(`Successfully uploaded ${count} questions directly to your production Turso database!`);
    } catch (e) {
        console.error("Turso Upload Error:", e.message);
    } finally {
        await client.close();
    }
}

main();
