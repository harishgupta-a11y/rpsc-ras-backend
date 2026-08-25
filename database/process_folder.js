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

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

// Category to desktop path mapping
const PATHS = {
    medieval: "C:/Users/aNKIT/Desktop/questions for ai/History/rajasthan/medival",
    modern: "C:/Users/aNKIT/Desktop/questions for ai/History/rajasthan/Modern",
    art_culture: "C:/Users/aNKIT/Desktop/questions for ai/art and culture"
};

// Database topic/subtopic registry
const MAPPING = {
    // Medieval History
    "Administrative and Revenue System in Medieval Rajasthan": { topic: 3, subtopic: 2135, cat: 'medieval' },
    "Guhil Dynasty": { topic: 2, subtopic: 2125, cat: 'medieval' },
    "History of Chouhan": { topic: 2, subtopic: 2131, cat: 'medieval' },
    "Kachwaha Dynasty(make new)": { topic: 2, subtopic: 2129, cat: 'medieval' },
    "Parmar & Pratihar Dynasty": { topic: 2, subtopic: 2133, cat: 'medieval' },
    "Rathore Dynasty-mistakes rebuild": { topic: 2, subtopic: 2127, cat: 'medieval' },
    "Yadu and Jat Dynasty-Final": { topic: 2, subtopic: 2133, cat: 'medieval' },
    
    // Modern History
    "Integration of Rajasthan": { topic: 6, subtopic: 2145, cat: 'modern' },
    "Peasant Movement": { topic: 5, subtopic: 2139, cat: 'modern' },
    "Prajamandal Movement": { topic: 5, subtopic: 2143, cat: 'modern' },
    "Tribal Movement of Rajasthan": { topic: 5, subtopic: 2141, cat: 'modern' },
    
    // Art and Culture
    "Attires and Ornaments": { topic: 10, subtopic: 2169, cat: 'art_culture' },
    "Dialects of Rajasthan": { topic: 9, subtopic: 2159, cat: 'art_culture' },
    "Fairs and festivals": { topic: 10, subtopic: 2167, cat: 'art_culture' },
    "Fairs, Famous Temples, Urs, Mosques of Rajasthan": { topic: 7, subtopic: 2149, cat: 'art_culture' },
    "Folk Dance": { topic: 8, subtopic: 2155, cat: 'art_culture' },
    "Folk Deities of Rajasthan": { topic: 10, subtopic: 2165, cat: 'art_culture' },
    "Folk Musical Instruments of Rajasthan": { topic: 8, subtopic: 2157, cat: 'art_culture' },
    "Folk Songs of Rajasthan": { topic: 8, subtopic: 2157, cat: 'art_culture' },
    "Folk Theatre of Rajasthan": { topic: 8, subtopic: 2155, cat: 'art_culture' },
    "Forts of Rajasthan": { topic: 7, subtopic: 2147, cat: 'art_culture' },
    "Handicraft of Rajasthan": { topic: 7, subtopic: 2153, cat: 'art_culture' },
    "Literature of Rajasthan": { topic: 9, subtopic: 2161, cat: 'art_culture' },
    "Palaces and Havelis of Rajasthan": { topic: 7, subtopic: 2149, cat: 'art_culture' },
    "Rajasthani Painting": { topic: 7, subtopic: 2151, cat: 'art_culture' },
    "Saints and Sects": { topic: 10, subtopic: 2163, cat: 'art_culture' },
    "Social customs and traditions": { topic: 10, subtopic: 2169, cat: 'art_culture' },
    "Tribes of Rajasthan": { topic: 30, subtopic: 2273, cat: 'art_culture' }
};

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

async function cleanQuestionsBatch(rawBlocks) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

    const cleanedQuestions = [];
    const chunkSize = 5;
    const totalChunks = Math.ceil(rawBlocks.length / chunkSize);

    for (let i = 0; i < rawBlocks.length; i += chunkSize) {
        const chunk = rawBlocks.slice(i, i + chunkSize);
        const chunkText = chunk.join('\n\n=== NEW BLOCK ===\n\n');
        const chunkIndex = Math.floor(i / chunkSize) + 1;
        
        const prompt = `You are an elite expert proofreader and editor for RPSC RAS exam materials. 
I have a set of questions that look AI-generated (overly verbose, containing unnecessary academic fluff).

Your job is to rewrite them to look strictly human-made and clear, while respecting the following guidelines:
1. Shorten the questions: Remove all verbose AI fluff. Keep them direct, punchy, and natural.
2. Zero Summarization: Do not omit or change any micro-facts, coordinate numbers, historical dates (e.g. 646 AD), or committee/dynasty/ruler/place names.
3. Keep the sequence: Maintain the exact sequence of questions. Do not drop or miss any questions.
4. Correctness: Verify each question's facts against standard history. Correct any factual errors.
5. Format match type questions: If you find any match-the-following style questions, convert the columns into a clean markdown table form (do NOT use ASCII border symbols or code characters for lines).
6. Explanations in point form: Convert paragraph explanations into a clean list of bullet points (e.g., "- Point 1\\n- Point 2") for readability.
7. Output format: Keep the exact pattern of the input blocks (Q., options A/B/C/D, Correct: [Answer], Explanation: [Bullets]).

Here is the chunk to edit:
${chunkText}

Provide ONLY the cleaned, human-like questions in the same order. Do not write any markdown code fences, headers, or conversational text.`;

        let success = false;
        let retries = 3;
        let responseText = '';

        while (retries > 0 && !success) {
            console.log(`    -> [Chunk ${chunkIndex}/${totalChunks}] Sending request (Retries left: ${retries})...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
            
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (res.status === 429) {
                    console.warn(`    -> [Chunk ${chunkIndex}/${totalChunks}] Rate limit hit (429). Waiting 35 seconds to clear quota...`);
                    await new Promise(resolve => setTimeout(resolve, 35000));
                    continue; // Retry chunk immediately without losing a retry credit
                }

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(`Gemini API status ${res.status}: ${errText}`);
                }

                const data = await res.json();
                responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                if (responseText) {
                    success = true;
                    console.log(`    -> [Chunk ${chunkIndex}/${totalChunks}] Success!`);
                } else {
                    console.warn(`    -> [Chunk ${chunkIndex}/${totalChunks}] Received empty content, retrying...`);
                    retries--;
                }
            } catch (e) {
                clearTimeout(timeoutId);
                console.error(`    -> [Chunk ${chunkIndex}/${totalChunks}] Error: ${e.message}`);
                
                if (e.message.includes('429')) {
                    console.warn(`    -> [Chunk ${chunkIndex}/${totalChunks}] Quota exceeded (429). Waiting 35 seconds to clear quota...`);
                    await new Promise(resolve => setTimeout(resolve, 35000));
                    continue; // Retry chunk immediately without losing a retry credit
                }
                
                retries--;
                if (retries > 0) {
                    console.log("    -> Waiting 3 seconds before retry...");
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }

        if (!success) {
            throw new Error(`Failed to clean chunk ${chunkIndex} after multiple attempts.`);
        }

        cleanedQuestions.push(responseText.trim());
        await new Promise(resolve => setTimeout(resolve, 1500)); // stay rate limit safe (15 RPM)
    }

    return cleanedQuestions.join('\n\n');
}

function parseCleanedBlock(block) {
    const rawLines = block.split('\n').map(l => l.trim()).filter(Boolean);
    let questionText = '';
    let optA = '', optB = '', optC = '', optD = '';
    let correct = '';
    let explanationLines = [];
    let parsingExp = false;
    
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        if (line.startsWith('Q.')) { questionText = line.replace(/^Q\.\s*/, '').trim(); continue; }
        if (line.startsWith('A)')) { optA = line.replace(/^A\)\s*/, '').trim(); continue; }
        if (line.startsWith('B)')) { optB = line.replace(/^B\)\s*/, '').trim(); continue; }
        if (line.startsWith('C)')) { optC = line.replace(/^C\)\s*/, '').trim(); continue; }
        if (line.startsWith('D)')) { optD = line.replace(/^D\)\s*/, '').trim(); continue; }
        if (line.startsWith('Correct:')) { correct = line.replace(/^Correct:\s*/, '').trim(); continue; }
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
        A: optA, B: optB, C: optC, D: optD,
        correct: correct,
        explanation: explanationLines.join('\n').trim()
    };
}

async function processFolder(folderName, useAI = true) {
    const mapInfo = MAPPING[folderName];
    if (!mapInfo) {
        console.error(`Folder "${folderName}" has no mapped Topic/Sub-topic ID in registry.`);
        return;
    }

    const folderPath = path.join(PATHS[mapInfo.cat], folderName);
    console.log(`\n==================================================`);
    console.log(`PROCESSING FOLDER: "${folderName}" (AI Clean: ${useAI})`);
    console.log(`Path: ${folderPath}`);
    console.log(`DB Mapping -> Topic ID: ${mapInfo.topic}, Sub-topic ID: ${mapInfo.subtopic}`);
    console.log(`==================================================`);

    if (!fs.existsSync(folderPath)) {
        console.error(`Error: Folder does not exist on your laptop.`);
        return;
    }

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.docx'));
    // Pick only pre files (starts with E- or H-, skip EM- or HM-)
    const preFiles = files.filter(f => {
        const upper = f.toUpperCase();
        return (upper.startsWith('E-') || upper.startsWith('H-')) && !upper.startsWith('EM-') && !upper.startsWith('HM-');
    });

    if (preFiles.length === 0) {
        console.log("No Pre question (.docx starting with E- or H-) files found in this folder.");
        return;
    }

    // 1. Wipe existing questions for this subtopic in Turso once before uploading
    try {
        console.log(`Wiping existing questions in Turso for Sub-topic ID: ${mapInfo.subtopic}...`);
        await client.execute({
            sql: "DELETE FROM questions WHERE minute_topic_id = ?",
            args: [mapInfo.subtopic]
        });
        console.log("Database wiped successfully.");
    } catch (e) {
        console.error("Failed to clear existing database entries:", e.message);
        return;
    }

    for (const file of preFiles) {
        const lang = file.toUpperCase().startsWith('E-') ? 'EN' : 'HI';
        const filePath = path.join(folderPath, file);
        console.log(`\n-> Parsing File: ${file} (Lang: ${lang})`);

        try {
            const resHtml = await mammoth.convertToHtml({ path: filePath });
            const rawText = convertHtmlToText(resHtml.value);
            const rawBlocks = rawText.split(/\n+(?=Q\.)/i).map(b => b.trim()).filter(Boolean);
            console.log(`Loaded ${rawBlocks.length} raw questions.`);

            let finalBlocks = rawBlocks;
            if (useAI) {
                console.log("Sending to Gemini for cleaning...");
                const cleanedText = await cleanQuestionsBatch(rawBlocks);
                finalBlocks = cleanedText.split(/\n+(?=Q\.)/i).map(b => b.trim()).filter(Boolean);
            } else {
                console.log("Skipping AI cleaning (direct raw upload)...");
            }
            
            const parsedQuestions = finalBlocks.map(parseCleanedBlock);
            console.log(`Parsed ${parsedQuestions.length} questions. Uploading to Turso...`);

            let count = 0;
            for (const q of parsedQuestions) {
                if (!q.question || !q.A || !q.correct) {
                    console.warn(`Skipping invalid parsed question block.`);
                    continue;
                }
                await client.execute({
                    sql: `
                        INSERT INTO questions (
                            topic_id, question_text, option_a, option_b, option_c, option_d, 
                            correct_option, detailed_explanation, minute_topic_id, language, difficulty
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    args: [
                        mapInfo.topic,
                        q.question,
                        q.A, q.B, q.C, q.D,
                        q.correct,
                        q.explanation,
                        mapInfo.subtopic,
                        lang,
                        'FOUNDATION'
                    ]
                });
                count++;
            }
            console.log(`Successfully uploaded ${count} questions from "${file}" to Turso!`);
        } catch (e) {
            console.error(`Error processing file "${file}":`, e.message);
        }
    }
}

async function main() {
    let mode = '';
    let targetFolder = '';
    const useAI = !process.argv.includes('--no-ai');

    for (let i = 2; i < process.argv.length; i++) {
        if (process.argv[i] === '--folder') {
            mode = 'single';
            targetFolder = process.argv[i + 1];
            break;
        } else if (process.argv[i] === '--all') {
            mode = 'all';
            break;
        }
    }

    if (!mode) {
        console.log("Usage Examples:");
        console.log("  node process_folder.js --folder \"Guhil Dynasty\"");
        console.log("  node process_folder.js --folder \"Guhil Dynasty\" --no-ai");
        console.log("  node process_folder.js --all");
        console.log("  node process_folder.js --all --no-ai");
        process.exit(1);
    }

    if (mode === 'single') {
        if (!targetFolder) {
            console.error("Error: --folder name is missing.");
            process.exit(1);
        }
        await processFolder(targetFolder, useAI);
    } else if (mode === 'all') {
        const folders = Object.keys(MAPPING);
        console.log(`Starting bulk upload for all ${folders.length} folders (AI Clean: ${useAI})...`);
        for (const folder of folders) {
            await processFolder(folder, useAI);
        }
        console.log("\n==================================================");
        console.log("ALL BATCH UPLOADS COMPLETED SUCCESSFULLY!");
        console.log("==================================================");
    }

    await client.close();
}

main();
