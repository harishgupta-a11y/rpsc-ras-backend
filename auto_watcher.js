// RPSC RAS Exam Prep - Hot-Folder Document Ingestion Watcher
// Drop DOCX or TXT files here to automatically update your SQLite database!

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth-plus');
const { MathMLToLaTeX } = require('mathml-to-latex');
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

function cleanFieldText(text) {
    if (!text) return "";
    let clean = text.trim();
    
    // 1. Remove trailing double asterisks if they were captured from the next bold trigger
    if (clean.endsWith('**')) {
        clean = clean.slice(0, -2).trim();
    }
    // Also remove leading double asterisks if they are unbalanced
    if (clean.startsWith('**') && !clean.endsWith('**') && (clean.match(/\*\*/g) || []).length === 1) {
        clean = clean.slice(2).trim();
    }

    // 2. Remove leading question number prefixes (e.g. Q. 1, Q1, Q. 1), Question 1:, 1., प्र. 1, प्रश्न 1:)
    // Handles various delimiters like dot, closing bracket, colon, dash.
    // Order matters: प्रश्न must come before प्र to prevent matching only the first character.
    clean = clean.replace(/^\s*(?:Q\s*\.?\s*\d*\s*[\)\.:\-]?|Question\s*\d*\s*[\)\.:\-]?|प्रश्न\s*\d*\s*[\)\.:\-]?|प्र\s*\.?\s*\d*\s*[\)\.:\-]?|\d+\s*[\)\.:\-]+)\s*/i, '');

    // 3. Remove option letter prefixes (e.g. A) content, B. content -> content)
    clean = clean.replace(/^\s*[A-D]\s*[\)\.:\-]+\s*/i, '');

    // 4. Remove citation brackets and page references (e.g. (p. 12), (pp. 4-5), [Ref: Page 4], (Ref: 12)) but preserve pure numbers in brackets/parentheses like [1] or (2) to avoid breaking math/formula indices and lists.
    clean = clean.replace(/[\(\[]\s*(?:pp?\.?\s*\d+(?:\s*-\s*\d+)?|Ref\s*:\s*[^\)\]]*|Page\s*\d+)\s*[\)\]]/gi, '');

    // 5. Remove common conversational boilerplate/wrapper lines
    clean = clean.replace(/^\s*(?:English\s+Version|Hindi\s+Version|English\s+Translation|Hindi\s+Translation|Explanation\s*:?|व्याख्या\s*:?)\s*$/gim, '');

    // Remove common trailing AI conversational wraps from the end of the text
    clean = clean.replace(/\s*(?:Let\s+me\s+know\s+if\s+you\s+would\s+like|Hope\s+this\s+helps|Hope\s+these\s+questions|Here\s+is\s+the\s+first|designed\s+according\s+to\s+your|designed\s+to\s+challenge|following\s+the\s+same\s+strict|highly\s+utility|if\s+you\s+need\s+more)[\s\S]*$/i, '');

    // Format Assertion-Reason questions: put Reason on a new line with a 1-line gap
    clean = clean.replace(/\s*(Reason|कारण)\s*[\(\[]\s*R\s*[\)\]]\s*[:\-]/gi, '\n\nReason (R):');
    clean = clean.replace(/\s*(Assertion|कथन)\s*[\(\[]\s*A\s*[\)\]]\s*[:\-]/gi, '\n\nAssertion (A):');

    // Format statement-wise questions: put statements on separate lines with a 1-line gap
    clean = clean.replace(/\s*(Statement|कथन)\s*(\d+)\s*[:\.]?\s*/gi, '\n\n$1 $2: ');
    clean = clean.replace(/(?<=\s|^)(\d+)\.\s+(?=[A-Z\u0900-\u097F])/g, '\n\n$1. ');
    clean = clean.replace(/\s*(Which of the statements?\s+given\s+above|Which of the\s+(?:above\s+)?statements?|Select the correct answer|उपरोक्त\s+(?:कथनों\s+)?(?:में\s+से\s+)?कौन|नीचे\s+दिए\s+गए\s+कूट)/gi, '\n\n$1');

    // 6. Collapse spaces and preserve newlines (do not strip bold/italic asterisks)
    clean = clean
        .replace(/[ \t]+/g, ' ')
        .replace(/[ \t]+([\.\?,;])/g, '$1')
        .replace(/[ \t]+$/gm, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return clean;
}

function convertMathMLToLaTeX(html) {
    if (!html) return "";
    return html.replace(/<math\b[^>]*>([\s\S]*?)<\/math>/gi, (match) => {
        try {
            let cleanMath = match
                .replace(/<(\/?)[a-z]+:math/gi, '<$1math')
                .replace(/<(\/?)[a-z]+:mrow/gi, '<$1mrow')
                .replace(/<(\/?)[a-z]+:mfrac/gi, '<$1mfrac')
                .replace(/<(\/?)[a-z]+:mi/gi, '<$1mi')
                .replace(/<(\/?)[a-z]+:mo/gi, '<$1mo')
                .replace(/<(\/?)[a-z]+:mn/gi, '<$1mn')
                .replace(/<(\/?)[a-z]+:msup/gi, '<$1msup')
                .replace(/<(\/?)[a-z]+:msub/gi, '<$1msub')
                .replace(/<(\/?)[a-z]+:msqrt/gi, '<$1msqrt')
                .replace(/<(\/?)[a-z]+:mroot/gi, '<$1mroot')
                .replace(/<(\/?)[a-z]+:mtext/gi, '<$1mtext');
            
            const latex = MathMLToLaTeX.convert(cleanMath);
            return `$ ${latex} $`;
        } catch (err) {
            console.error("MathML conversion failed for match:", match, err.message);
            return match;
        }
    });
}

function convertHtmlToTextWithListNumbering(html) {
    let processedHtml = convertMathMLToLaTeX(html);
    
    // Convert inline images to safe placeholder strings [IMAGE:data:...] without newlines
    processedHtml = processedHtml.replace(/<img\s+[^>]*src=["'](data:image\/[^"']+)["'][^>]*>/gi, (match, src) => {
        const cleanSrc = src.replace(/[\r\n\s]+/g, ''); // strip all whitespaces/newlines from base64 string
        return `\n[IMAGE:${cleanSrc}]\n`;
    });

    // Strip paragraphs inside table cells to prevent cells from splitting onto newlines
    processedHtml = processedHtml.replace(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi, (match, tag, cellContent) => {
        let cleanCell = cellContent
            .replace(/<p\b[^>]*>/gi, '')
            .replace(/<\/p>/gi, ' ')
            .replace(/<br\s*\/?>/gi, ' ');
        return `<${tag}>${cleanCell}</${tag}>`;
    });

    // Format tables to clean text markdown style (pipes and dashes) for mobile grid rendering
    processedHtml = processedHtml.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (match, tableContent) => {
        let tableText = "\n";
        const rows = tableContent.split(/<\/tr>/gi);
        let headerParsed = false;
        for (const row of rows) {
            if (!row.trim()) continue;
            const cells = row.match(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi);
            if (cells) {
                const cellTexts = cells.map(cell => {
                    return cell.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
                });
                if (cellTexts.length > 0) {
                    tableText += `| ${cellTexts.join(' | ')} |\n`;
                    if (!headerParsed) {
                        const dividers = cellTexts.map(() => '---');
                        tableText += `| ${dividers.join(' | ')} |\n`;
                        headerParsed = true;
                    }
                }
            }
        }
        return tableText + "\n";
    });

    // Convert strong/bold tags to markdown **bold**
    processedHtml = processedHtml
        .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');

    // Find all <ol> groups and number the <li> items
    processedHtml = processedHtml.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (match, olContent) => {
        let index = 1;
        return olContent.replace(/<li>([\s\S]*?)<\/li>/gi, (liMatch, liContent) => {
            return `<p>${index++}. ${liContent}</p>`;
        });
    });
    
    // Replace all <ul> groups' <li> with "- "
    processedHtml = processedHtml.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (match, ulContent) => {
        return ulContent.replace(/<li>([\s\S]*?)<\/li>/gi, (liMatch, liContent) => {
            return `<p>- ${liContent}</p>`;
        });
    });

    // Strip other HTML tags and format paragraphs
    let text = processedHtml
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '') // remove all other tags
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
    
    return text;
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
            const buffer = fs.readFileSync(filePath);
            const result = await mammoth.convertToHtml({ 
                arrayBuffer: buffer,
                convertImage: mammoth.images.inline(async (element) => {
                    const imageBuffer = await element.read();
                    return {
                        src: `data:${element.contentType};base64,${imageBuffer.toString('base64')}`
                    };
                })
            });
            rawText = convertHtmlToTextWithListNumbering(result.value);
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

            const qMatch = block.match(/(?:Q\.|प्र\.|प्रश्न\s*\d*[:\.]?)([\s\S]*?)(?=(?<=^|\s)(?<!\()[Aa]\))/);
            const aMatch = block.match(/(?<=^|\s)(?<!\()[Aa]\)([\s\S]*?)(?=(?<=^|\s)(?<!\()[Bb]\))/);
            const bMatch = block.match(/(?<=^|\s)(?<!\()[Bb]\)([\s\S]*?)(?=(?<=^|\s)(?<!\()[Cc]\))/);
            const cMatch = block.match(/(?<=^|\s)(?<!\()[Cc]\)([\s\S]*?)(?=(?<=^|\s)(?<!\()[Dd]\))/);
            const dMatch = block.match(/(?<=^|\s)(?<!\()[Dd]\)([\s\S]*?)(?=(?:\r?\n[ \t]*(?:\*?\*?(?:Correct Answer|Correct Option|Answer Key|Correct|Answer|उत्तर|सही उत्तर)\*?\*?)\s*[:\-]|(?<=^|\s)(?:\*?\*?(?:Correct Answer|Correct Option|Answer Key|Correct|Answer|उत्तर|सही उत्तर)\*?\*?)\s*[:\-]|(?:\r?\n[ \t]*|(?<=^|\s))\*?\*?(?:Correct Answer|Correct Option|Answer Key|सही उत्तर)\*?\*?\s+))/i);
            const correctMatch = block.match(/(?:\r?\n[ \t]*(?:\*?\*?(?:Correct Answer|Correct Option|Answer Key|Correct|Answer|उत्तर|सही उत्तर)\*?\*?)\s*[:\-]|(?<=^|\s)(?:\*?\*?(?:Correct Answer|Correct Option|Answer Key|Correct|Answer|उत्तर|सही उत्तर)\*?\*?)\s*[:\-]|(?:\r?\n[ \t]*|(?<=^|\s))\*?\*?(?:Correct Answer|Correct Option|Answer Key|सही उत्तर)\*?\*?\s+)\s*([A-D])(?!\w|[\)\.])/i);
            const expMatch = block.match(/(?:\r?\n[ \t]*(?:\*?\*?(?:Explanation|Exp|व्याख्या|स्पष्टीकरण)\*?\*?)\s*[:\-]|(?<=^|\s)(?:\*?\*?(?:Explanation|Exp|व्याख्या|स्पष्टीकरण)\*?\*?)\s*[:\-][\s\S]*?)\s*([\s\S]*?)$/i);

            if (qMatch && aMatch && bMatch && correctMatch) {
                parsedQuestions.push({
                    question_text: cleanFieldText(qMatch[1]),
                    option_a: cleanFieldText(aMatch[1]),
                    option_b: cleanFieldText(bMatch[1]),
                    option_c: cMatch ? cleanFieldText(cMatch[1]) : "None of the above",
                    option_d: dMatch ? cleanFieldText(dMatch[1]) : "All of the above",
                    correct_option: correctMatch[1].trim().toUpperCase(),
                    detailed_explanation: expMatch ? cleanFieldText(expMatch[1]) : "Ingested from watcher hot-folder."
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
