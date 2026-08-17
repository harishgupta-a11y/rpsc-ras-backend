
// Helper to extract PNG width and height from base64 string
function getPngDimensions(base64Str) {
    try {
        const matches = base64Str.match(/^data:image\/png;base64,(.+)$/);
        const data = matches ? matches[1] : base64Str;
        const buffer = Buffer.from(data, 'base64');
        
        // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
        if (buffer.readUInt32BE(0) === 0x89504E47 && buffer.readUInt32BE(4) === 0x0D0A1A0A) {
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);
            return { width, height };
        }
    } catch (e) {
        console.error("Failed to parse PNG dimensions:", e.message);
    }
    return null;
}

// RPSC RAS Exam Prep - Hot-Folder Document Ingestion Watcher
// Drop PDF, DOCX, or TXT files here to automatically update your SQLite database!

const axios = require('axios');

// Helper to convert raw LaTeX expressions ($...$ and $...$) to base64 images on ingest
async function convertLaTeXTextToImages(text) {
    if (!text) return "";
    
    let processed = text;
    
    // 1. Process block equations: $ ... $
    const blockRegex = /\$\$([\s\S]*?)\$\$/g;
    const blockMatches = [...processed.matchAll(blockRegex)];
    for (const match of blockMatches) {
        const fullFormula = match[0];
        const formulaText = match[1].trim();
        if (formulaText) {
            try {
                const encoded = encodeURIComponent(formulaText);
                const url = `https://latex.codecogs.com/png.image?\\dpi{150}\\bg{white}${encoded}`;
                const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
                if (response.status === 200) {
                    const base64 = Buffer.from(response.data).toString('base64');
                    // Block equations wrapped in newlines
                    processed = processed.replace(fullFormula, `\n[IMAGE:math:data:image/png;base64,${base64}]\n`);
                }
            } catch (err) {
                console.error("[LaTeX Block Convert Failed]", formulaText, err.message);
            }
        }
    }
    
    // 2. Process inline equations: $ ... $
    const inlineRegex = /\$([^\$\n]+?)\$/g;
    const inlineMatches = [...processed.matchAll(inlineRegex)];
    for (const match of inlineMatches) {
        const fullFormula = match[0];
        const formulaText = match[1].trim();
        // Skip currency or non-equation values (like $15 or $2460)
        if (formulaText && !/^\d+$/.test(formulaText) && !formulaText.startsWith('₹') && !/^[0-9\s,\.]+$/.test(formulaText)) {
            try {
                const encoded = encodeURIComponent(formulaText);
                const url = `https://latex.codecogs.com/png.image?\\dpi{150}\\bg{white}${encoded}`;
                const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
                if (response.status === 200) {
                    const base64 = Buffer.from(response.data).toString('base64');
                    // Inline equations kept inline
                    processed = processed.replace(fullFormula, `[IMAGE:math:data:image/png;base64,${base64}]`);
                }
            } catch (err) {
                console.error("[LaTeX Inline Convert Failed]", formulaText, err.message);
            }
        }
    }
    
    return processed;
}

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth-plus');
const { MathMLToLaTeX } = require('mathml-to-latex');
const sqlite3 = require('sqlite3').verbose();

// PDF parser polyfill for Node environment
if (global.DOMMatrix === undefined) {
    global.DOMMatrix = class DOMMatrix {};
}
const pdfParse = require('pdf-parse');

// Watcher configurations
const WATCH_DIR = __dirname;
const IMPORT_DIR = path.join(WATCH_DIR, 'import_directory');
const QUIZ_DIR = path.join(IMPORT_DIR, 'quizzes');
const THEORY_DIR = path.join(IMPORT_DIR, 'theory');
const PROCESSED_DIR = path.join(IMPORT_DIR, 'processed');
const DB_FILE = path.join(WATCH_DIR, 'database', 'rpsc_ras.db');

// Ensure directories exist
if (!fs.existsSync(QUIZ_DIR)) fs.mkdirSync(QUIZ_DIR, { recursive: true });
if (!fs.existsSync(THEORY_DIR)) fs.mkdirSync(THEORY_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

console.log(`====================================================`);
console.log(` RPSC RAS App: Hot-Folder File Ingestion Active`);
console.log(` Monitoring Quizzes Dir: ${QUIZ_DIR}`);
console.log(` Monitoring Theory Dir:  ${THEORY_DIR}`);
console.log(` Target Database:        ${DB_FILE}`);
console.log(` Mode: STRICT OFFLINE REGEX PARSER (PDF, DOCX, TXT Support)`);
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
        // Process Quizzes
        const quizFiles = fs.readdirSync(QUIZ_DIR);
        for (const file of quizFiles) {
            const filePath = path.join(QUIZ_DIR, file);
            if (fs.statSync(filePath).isFile()) {
                await processIngestionFile(filePath, 'QUIZ');
            }
        }

        // Process Theory
        const theoryFiles = fs.readdirSync(THEORY_DIR);
        for (const file of theoryFiles) {
            const filePath = path.join(THEORY_DIR, file);
            if (fs.statSync(filePath).isFile()) {
                await processIngestionFile(filePath, 'THEORY');
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
    clean = clean.replace(/^\s*(?:Q\s*\.?\s*\d*\s*[\)\.:\-]?|Question\s*\d*\s*[\)\.:\-]?|प्रश्न\s*\d*\s*[\)\.:\-]?|प्र\s*\.?\s*\d*\s*[\)\.:\-]?|\d+\s*[\)\.:\-]+)\s*/i, '');

    // 3. Remove option letter prefixes (e.g. A) content, B. content -> content)
    clean = clean.replace(/^\s*[A-D]\s*[\)\.:\-]+\s*/i, '');

    // 4. Remove citation brackets and page references
    clean = clean.replace(/[\(\[]\s*(?:pp?\.?\s*\d+(?:\s*-\s*\d+)?|Ref\s*:\s*[^\)\]]*|Page\s*\d+)\s*[\)\]]/gi, '');

    // 5. Remove common conversational boilerplate/wrapper lines
    clean = clean.replace(/^\s*(?:English\s+Version|Hindi\s+Version|English\s+Translation|Hindi\s+Translation|Explanation\s*:?|व्याख्या\s*:?)\s*$/gim, '');

    // Remove common trailing AI conversational wraps
    clean = clean.replace(/\s*(?:Let\s+me\s+know\s+if\s+you\s+would\s+like|Hope\s+this\s+helps|Hope\s+these\s+questions|Here\s+is\s+the\s+first|designed\s+according\s+to\s+your|designed\s+to\s+challenge|following\s+the\s+same\s+strict|highly\s+utility|if\s+you\s+need\s+more)[\s\S]*$/i, '');

    // Format Assertion-Reason questions
    clean = clean.replace(/(?<=^|\n)\s*Reason\s*[\(\[]\s*R\s*[\)\]]\s*[:\-]/gi, '\n\nReason (R):');
    clean = clean.replace(/(?<=^|\n)\s*Assertion\s*[\(\[]\s*A\s*[\)\]]\s*[:\-]/gi, '\n\nAssertion (A):');
    clean = clean.replace(/(?<=^|\n)\s*कारण\s*[\(\[]\s*R\s*[\)\]]\s*[:\-]/g, '\n\nकारण (R):');
    clean = clean.replace(/(?<=^|\n)\s*कथन\s*[\(\[]\s*A\s*[\)\]]\s*[:\-]/g, '\n\nकथन (A):');

    // Format statement-wise questions
    clean = clean.replace(/\s*(Statement|कथन)\s*(\d+)\s*[:\.]?\s*/gi, '\n\n$1 $2: ');
    clean = clean.replace(/(?<=^|\n)([1-5])\.\s+(?=[A-Z\u0900-\u097F])/g, '\n\n$1. ');
    clean = clean.replace(/\s*(Which of the statements?\s+given\s+above|Which of the\s+(?:above\s+)?statements?|Select the correct answer|उपरोक्त\s+(?:कथनों\s+)?(?:में\s+से\s+)?कौन|नीचे\s+दिए\s+गए\s+कूट)/gi, '\n\n$1');

    // Fix legal citation word-number separation
    const keywords = ['Article', 'Section', 'Amendment', 'Part', 'Schedule', 'Clause', 'Act', 'अनुच्छेद', 'धारा', 'संशोधन', 'भाग', 'अनुसूची', 'अधिनियम'];
    const articleRegex = new RegExp(`\\b(${keywords.join('|')})\\s*\\r?\\n\\r?\\n\\s*(\\d+)\\b`, 'gi');
    clean = clean.replace(articleRegex, '$1 $2');

    // 6. Collapse spaces and preserve newlines
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
    
    processedHtml = processedHtml.replace(/<img\s+([^>]*?)>/gi, (match, attrs) => {
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        if (!srcMatch) return "";
        const src = srcMatch[1].replace(/[\r\n\s]+/g, '');
        
        const altMatch = attrs.match(/alt=["']([^"']+)["']/i);
        const altText = altMatch ? altMatch[1] : "";
        
        const isMathFormula = altText.toLowerCase().includes('math') || altText.toLowerCase().includes('equation') || altText.toLowerCase().includes('formula');
        
        let dimensions = "";
        
        // Auto-decode dimensions for base64 PNGs on the fly
        if (src.startsWith('data:image/png;base64,')) {
            const dims = getPngDimensions(src);
            if (dims) {
                dimensions = `width=${dims.width}&height=${dims.height}`;
            }
        }
        
        if (isMathFormula) {
            // Explicit math formula - keep inline
            return `[IMAGE:math:${src}]`;
        }
        
        if (dimensions && dimensions.startsWith('width=')) {
            const wMatch = dimensions.match(/width=(\d+)/);
            const hMatch = dimensions.match(/height=(\d+)/);
            const height = hMatch ? parseInt(hMatch[1]) : 0;
            
            if (height > 0 && height < 60) {
                // Inline / math equation image - keep on same line
                return `[IMAGE:${dimensions}:${src}]`;
            } else {
                // Block image - wrap in newlines
                return `\n[IMAGE:${dimensions}:${src}]\n`;
            }
        }
        // Fallback for no dimensions
        return `\n[IMAGE:${src}]\n`;
    });

    processedHtml = processedHtml.replace(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi, (match, tag, cellContent) => {
        let cleanCell = cellContent
            .replace(/<p\b[^>]*>/gi, '')
            .replace(/<\/p>/gi, ' ')
            .replace(/<br\s*\/?>/gi, ' ');
        return `<${tag}>${cleanCell}</${tag}>`;
    });

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

    processedHtml = processedHtml
        .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');

    processedHtml = processedHtml.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (match, olContent) => {
        let index = 1;
        return olContent.replace(/<li>([\s\S]*?)<\/li>/gi, (liMatch, liContent) => {
            return `<p>${index++}. ${liContent}</p>`;
        });
    });
    
    processedHtml = processedHtml.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (match, ulContent) => {
        return ulContent.replace(/<li>([\s\S]*?)<\/li>/gi, (liMatch, liContent) => {
            return `<p>- ${liContent}</p>`;
        });
    });

    let text = processedHtml
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '') 
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
    
    const lines = text.split(/\r?\n/);
    const cleanedLines = [];
    for (let idx = 0; idx < lines.length; idx++) {
        let current = lines[idx].trim();
        if (!current) {
            cleanedLines.push("");
            continue;
        }

        const isEmojiOnly = /^(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]|[\u2300-\u23FF])\s*$/.test(current);
        
        if (idx + 1 < lines.length) {
            const next = lines[idx + 1].trim();
            if (next.startsWith(':')) {
                current = current + next;
                idx++;
            } else if (isEmojiOnly) {
                const nextIsListOrHeading = /^(?:Section|Phase|#|-|•|\d+\.)/i.test(next);
                if (!nextIsListOrHeading) {
                    current = current + " " + next;
                    idx++;
                    if (idx + 1 < lines.length) {
                        const nextNext = lines[idx + 1].trim();
                        if (nextNext.startsWith(':')) {
                            current = current + nextNext;
                            idx++;
                        }
                    }
                }
            }
        }
        
        const isListBulletEmoji = /^[-•]\s*(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]|[\u2300-\u23FF])\s*$/.test(current);
        if (isListBulletEmoji && idx + 1 < lines.length) {
            const next = lines[idx + 1].trim();
            current = current + " " + next;
            idx++;
        }

        cleanedLines.push(current);
    }
    text = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n');
    
    return text;
}

async function processIngestionFile(filePath, contentType) {
    const filename = path.basename(filePath);
    console.log(`[Watcher] New ${contentType} file detected: ${filename}`);

    // Parse Topic ID from filename (must start with digits, e.g. "101_questions.pdf")
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
        } else if (ext === '.pdf') {
            const buffer = fs.readFileSync(filePath);
            const uint8Array = new Uint8Array(buffer);
            const parser = new pdfParse.PDFParse(uint8Array);
            const data = await parser.getText();
            rawText = data.text;
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

        if (contentType === 'QUIZ') {
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
                        question_text: await convertLaTeXTextToImages(cleanFieldText(qMatch[1])),
                        option_a: await convertLaTeXTextToImages(cleanFieldText(aMatch[1])),
                        option_b: await convertLaTeXTextToImages(cleanFieldText(bMatch[1])),
                        option_c: cMatch ? await convertLaTeXTextToImages(cleanFieldText(cMatch[1])) : "None of the above",
                        option_d: dMatch ? await convertLaTeXTextToImages(cleanFieldText(dMatch[1])) : "All of the above",
                        correct_option: correctMatch[1].trim().toUpperCase(),
                        detailed_explanation: expMatch ? await convertLaTeXTextToImages(cleanFieldText(expMatch[1])) : "Ingested from watcher hot-folder."
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

        } else if (contentType === 'THEORY') {
            // Find subject_id and topic_name for topicId
            const topicRow = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT u.subject_id, t.topic_name 
                    FROM topics t 
                    JOIN units u ON t.unit_id = u.unit_id 
                    WHERE t.topic_id = ?
                `, [topicId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!topicRow) {
                console.error(`[Watcher Error] Topic ID ${topicId} not found in database. Skipping.`);
                moveFileToProcessed(filePath, `error_${filename}`);
                return;
            }

            const subjectId = topicRow.subject_id;
            const topicName = topicRow.topic_name;

            // Determine language from filename
            const isHi = filename.toLowerCase().includes('_hi') || filename.toLowerCase().includes('hindi');
            const language = isHi ? 'HI' : 'EN';

            const cleanContent = rawText.trim();

            // Check if revision note already exists
            const existingNote = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT note_id FROM revision_notes 
                    WHERE topic_id = ? AND language = ?
                `, [topicId, language], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (existingNote) {
                // Update
                await new Promise((resolve, reject) => {
                    db.run(`
                        UPDATE revision_notes 
                        SET title = ?, content = ? 
                        WHERE note_id = ?
                    `, [`${topicName} Notes`, cleanContent, existingNote.note_id], function(err) {
                        if (err) reject(err);
                        else resolve(this);
                    });
                });
                console.log(`[Watcher Success] Updated theory notes for Topic ID ${topicId} [${language}] from ${filename}`);
            } else {
                // Insert
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO revision_notes (title, content, subject_id, topic_id, language, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [`${topicName} Notes`, cleanContent, subjectId, topicId, language, Date.now()], function(err) {
                        if (err) reject(err);
                        else resolve(this);
                    });
                });
                console.log(`[Watcher Success] Ingested new theory notes for Topic ID ${topicId} [${language}] from ${filename}`);
            }
            moveFileToProcessed(filePath, filename);
        }

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
