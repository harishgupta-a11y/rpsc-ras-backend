// RPSC RAS Exam Prep - Hot-Folder Document Ingestion Watcher
// Drop DOCX or TXT files here to automatically update your SQLite database!

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const sqlite3 = require('sqlite3').verbose();

// Watcher configurations
const WATCH_DIR = __dirname;
const IMPORT_DIR = path.join(WATCH_DIR, 'import_directory');
const QUIZ_DIR = path.join(IMPORT_DIR, 'quizzes');
const PROCESSED_DIR = path.join(IMPORT_DIR, 'processed');
const DB_FILE = path.join(WATCH_DIR, 'database', 'rpsc_ras.db');

// Ensure directories exist
if (!fs.existsSync(QUIZ_DIR)) fs.mkdirSync(QUIZ_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

console.log(`====================================================`);
` RPSC RAS App: Hot-Folder File Ingestion Active`;
console.log(` Monitoring Directory: ${QUIZ_DIR}`);
console.log(` Target Database: ${DB_FILE}`);
console.log(` Mode: STRICT OFFLINE REGEX PARSER (AI generation Banned)`);
console.log(`====================================================`);

// Connect to SQLite Database
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error("[Watcher Error] Database connection failed:", err.message);
    } else {
        console.log("[Watcher] Connected to SQLite database.");
    }
});

// Start watcher loop (checks folder every 3 seconds)
setInterval(checkDirectories, 3000);

async function checkDirectories() {
    try {
        const quizFiles = fs.readdirSync(QUIZ_DIR);
        for (const file of quizFiles) {
            const filePath = path.join(QUIZ_DIR, file);
            if (fs.statSync(filePath).isFile()) {
                await processIngestionFile(filePath);
            }
        }
    } catch (err) {
        console.error("[Watcher Error] Scanning failed:", err.message);
    }
}

async function processIngestionFile(filePath) {
    const filename = path.basename(filePath);
    console.log(`[Watcher] New file detected: ${filename}`);

    // Parse Topic ID from filename (must start with digits, e.g. "101_questions.docx" -> topic ID 101)
    const topicIdMatch = filename.match(/^(\d+)/);
    if (!topicIdMatch) {
        console.error(`[Watcher Error] Filename "${filename}" must start with a topic ID number (e.g. 101_questions.txt). Skipping.`);
        moveFileToProcessed(filePath, `error_${filename}`);
        return;
    }
    const topicId = parseInt(topicIdMatch[1]);

    try {
        const ext = path.extname(filePath).toLowerCase();
        let rawText = "";

        if (ext === '.txt') {
            rawText = fs.readFileSync(filePath, 'utf8');
        } else if (ext === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            rawText = result.value;
        } else {
            console.error(`[Watcher Error] Unsupported file format "${ext}" for: ${filename}. Skipping.`);
            moveFileToProcessed(filePath, `error_${filename}`);
            return;
        }

        if (!rawText.trim()) {
            console.error(`[Watcher Error] Extracted text from "${filename}" is empty. Skipping.`);
            moveFileToProcessed(filePath, `error_${filename}`);
            return;
        }

        console.log(`[Watcher] Extracted ${rawText.length} characters of raw text. Parsing content...`);

        // Parse questions using strict regex triggers
        const blocks = rawText.split(/(?=Q\.)/);
        const parsedQuestions = [];

        for (const block of blocks) {
            if (!block.trim() || !block.includes("A)")) continue;

            const qMatch = block.match(/Q\.([\s\S]*?)(?=\bA\))/i);
            const aMatch = block.match(/\bA\)([\s\S]*?)(\bB\))/i); // wait, make it robust
            const bMatch = block.match(/\bB\)([\s\S]*?)(?=\bC\))/i);
            const cMatch = block.match(/\bC\)([\s\S]*?)(?=\bD\))/i);
            const dMatch = block.match(/\bD\)([\s\S]*?)(?=Correct:|Answer:)/i);
            const correctMatch = block.match(/(?:Correct|Answer)[\s:]*([A-D])/i);
            const expMatch = block.match(/(?:Explanation|Exp)[\s:]*([\s\S]*?)$/i);

            // Re-apply a robust split since options may not have spaces around them
            const optAMatch = block.match(/\bA\)([\s\S]*?)(?=\b[B-D]\)|Correct:|Answer:)/i);
            const optBMatch = block.match(/\bB\)([\s\S]*?)(?=\b[C-D]\)|Correct:|Answer:)/i);
            const optCMatch = block.match(/\bC\)([\s\S]*?)(?=\b[D]\)|Correct:|Answer:)/i);
            const optDMatch = block.match(/\bD\)([\s\S]*?)(?=\bCorrect:|\bAnswer:)/i);

            if (qMatch && optAMatch && optBMatch && correctMatch) {
                parsedQuestions.push({
                    question_text: qMatch[1].trim(),
                    option_a: optAMatch[1].trim(),
                    option_b: optBMatch[1].trim(),
                    option_c: optCMatch ? optCMatch[1].trim() : "None of the above",
                    option_d: optDMatch ? optDMatch[1].trim() : "All of the above",
                    correct_option: correctMatch[1].trim().toUpperCase(),
                    detailed_explanation: expMatch ? expMatch[1].trim() : "Ingested from watcher hot-folder."
                });
            }
        }

        if (parsedQuestions.length === 0) {
            console.error(`[Watcher Error] Could not parse any questions from "${filename}". Check triggers formatting.`);
            moveFileToProcessed(filePath, `error_${filename}`);
            return;
        }

        // Insert into SQLite database
        let successCount = 0;
        for (const q of parsedQuestions) {
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [topicId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.detailed_explanation], function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
            successCount++;
        }

        console.log(`[Watcher Success] Ingested ${successCount} questions into Topic ID ${topicId} from ${filename}`);
        moveFileToProcessed(filePath, filename);

    } catch (err) {
        console.error(`[Watcher Error] Failed to process ${filename}:`, err.message);
        moveFileToProcessed(filePath, `failed_${filename}`);
    }
}

// Move file to processed folder
function moveFileToProcessed(filePath, originalName) {
    const destPath = path.join(PROCESSED_DIR, `${Date.now()}_${originalName}`);
    try {
        fs.renameSync(filePath, destPath);
        console.log(`[Watcher] Moved processed file to: ${destPath}`);
    } catch (e) {
        try {
            fs.copyFileSync(filePath, destPath);
            fs.unlinkSync(filePath);
            console.log(`[Watcher] Moved processed file to: ${destPath} (copy-fallback)`);
        } catch (err) {
            console.error(`[Watcher Error] Failed to archive ${originalName}:`, err.message);
        }
    }
}
