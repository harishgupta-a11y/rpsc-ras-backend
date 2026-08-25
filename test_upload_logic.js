const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

// Copy helper functions from server.js
function convertHtmlToTextWithListNumbering(html) {
    let processedHtml = html;
    
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

    // 4. Remove citation brackets and page references (e.g. (p. 12), (pp. 4-5), [1], [Ref: Page 4], (Ref: 12))
    clean = clean.replace(/[\(\[]\s*(?:pp?\.?\s*\d+(?:\s*-\s*\d+)?|Ref\s*:\s*[^\)\]]*|Page\s*\d+|[0-9]+)\s*[\)\]]/gi, '');

    // 5. Remove common conversational boilerplate/wrapper lines
    clean = clean.replace(/^\s*(?:English\s+Version|Hindi\s+Version|English\s+Translation|Hindi\s+Translation|Explanation\s*:?|व्याख्या\s*:?)\s*$/gim, '');

    // Remove common trailing AI conversational wraps from the end of the text
    clean = clean.replace(/\s*(?:Let\s+me\s+know\s+if\s+you\s+would\s+like|Hope\s+this\s+helps|Hope\s+these\s+questions|Here\s+is\s+the\s+first|designed\s+according\s+to\s+your|designed\s+to\s+challenge|following\s+the\s+same\s+strict|highly\s+utility|if\s+you\s+need\s+more)[\s\S]*$/i, '');

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

async function testUploadLogic() {
    const filename = '1782715148213_HM-Tribal_Movement.docx';
    const filePath = path.join(__dirname, 'uploaded_files', filename);
    console.log(`Parsing file: ${filePath}`);

    try {
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.convertToHtml({ 
            buffer: buffer,
            convertImage: mammoth.images.inline(async (element) => {
                const imageBuffer = await element.read();
                return {
                    src: `data:${element.contentType};base64,${imageBuffer.toString('base64').substring(0, 30)}...`
                };
            })
        });

        const rawText = convertHtmlToTextWithListNumbering(result.value);
        console.log(`Raw text length: ${rawText.length}`);
        
        // Parse Mains
        const blocks = rawText.split(/(?=(?:Q\.|प्र\.|प्रश्न\s*\d*[:\.]?))/i);
        console.log(`Total split blocks: ${blocks.length}`);

        const parsedQuestions = [];
        for (const block of blocks) {
            if (!block.trim() || (!block.includes("Answer:") && !block.includes("Answer") && !block.includes("उत्तर:") && !block.includes("मॉडल उत्तर:") && !block.includes("उत्तर") && !block.includes("मॉडल उत्तर"))) continue;

            const qMatch = block.match(/(?:Q\.|प्र\.|प्रश्न\s*\d*[:\.]?)([\s\S]*?)(?=(?:\*?\*?(?:Answer|Answer:|उत्तर:|मॉडल उत्तर:|उत्तर|मॉडल उत्तर)\*?\*?))/i);
            const ansMatch = block.match(/(?:\*?\*?(?:Answer|Answer:|उत्तर:|मॉडल उत्तर:|उत्तर|मॉडल उत्तर)\*?\*?)[\s*:]*([\s\S]*?)$/i);

            if (qMatch && ansMatch) {
                let answerText = ansMatch[1].trim();
                if (answerText.endsWith("---")) {
                    answerText = answerText.substring(0, answerText.length - 3).trim();
                }
                parsedQuestions.push({
                    question_text: cleanFieldText(qMatch[1]),
                    model_answer: cleanFieldText(answerText)
                });
            }
        }
        console.log(`Successfully parsed ${parsedQuestions.length} Mains questions.`);
        if (parsedQuestions.length > 0) {
            console.log("\nFirst Parsed Question:");
            console.log("Q:", parsedQuestions[0].question_text);
            console.log("A:", parsedQuestions[0].model_answer);
        }
    } catch (e) {
        console.error("Failed during test:", e.message);
    }
}

testUploadLogic();
