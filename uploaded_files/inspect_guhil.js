const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

// Helper to keep formatting clean
function convertHtmlToTextWithListNumbering(html) {
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
    return text;
}

async function run() {
    const filePath = path.join(__dirname, '..', 'uploaded_files', 'E-Guhil_dynasty.docx');
    console.log("Analyzing file:", filePath);
    
    if (!fs.existsSync(filePath)) {
        console.error("File does not exist!");
        return;
    }

    try {
        const result = await mammoth.convertToHtml({ path: filePath });
        const rawText = convertHtmlToTextWithListNumbering(result.value);

        // Split by English Q. or Hindi प्र. / प्रश्न at the start of a block
        const blocks = rawText.split(/(?=(?:Q\.|प्र\.|प्रश्न\s*\d*[:\.]?))/i);
        console.log(`Total raw blocks found: ${blocks.length}`);

        let successCount = 0;
        let failCount = 0;

        blocks.forEach((block, index) => {
            const trimmed = block.trim();
            if (!trimmed) return;

            // Check if it looks like a question but fails parsing
            const hasA = trimmed.includes("A)");
            const qMatch = trimmed.match(/(?:Q\.|प्र\.|प्रश्न\s*\d*[:\.]?)([\s\S]*?)(?=(?<=^|\s)(?<!\()A\))/);
            const aMatch = trimmed.match(/(?<=^|\s)(?<!\()A\)([\s\S]*?)(?=(?<=^|\s)(?<!\()B\))/);
            const bMatch = trimmed.match(/(?<=^|\s)(?<!\()B\)([\s\S]*?)(?=(?<=^|\s)(?<!\()C\))/);
            const cMatch = trimmed.match(/(?<=^|\s)(?<!\()C\)([\s\S]*?)(?=(?<=^|\s)(?<!\()D\))/);
            const dMatch = trimmed.match(/(?<=^|\s)(?<!\()D\)([\s\S]*?)(?=(?<=^|[\r\n]|\s)(?:Correct|Answer|correct|answer|उत्तर|सही उत्तर):?)/i);
            const correctMatch = trimmed.match(/(?<=^|[\r\n]|\s)(?:Correct|Answer|correct|answer|उत्तर|सही उत्तर)[\s:]+([A-D])(?!\w)/i);
            const expMatch = trimmed.match(/(?<=^|[\r\n])(?:Explanation|Exp|explanation|exp|व्याख्या|स्पष्टीकरण)[\s:]+([\s\S]*?)$/i);

            const isParsed = qMatch && aMatch && bMatch && correctMatch;

            if (isParsed) {
                successCount++;
            } else {
                failCount++;
                console.log(`\n---------------------------------------`);
                console.log(`[FAILED BLOCK #${index + 1}]`);
                console.log(`Text:\n${trimmed}`);
                console.log(`Parser Diagnostics:`);
                console.log(` - Has Q. trigger: ${!!qMatch}`);
                console.log(` - Has A) option: ${!!aMatch}`);
                console.log(` - Has B) option: ${!!bMatch}`);
                console.log(` - Has C) option: ${!!cMatch}`);
                console.log(` - Has D) option: ${!!dMatch}`);
                console.log(` - Has Correct trigger: ${!!correctMatch} (Matched: ${correctMatch ? correctMatch[1] : 'None'})`);
                console.log(` - Has Explanation: ${!!expMatch}`);
                console.log(`---------------------------------------`);
            }
        });

        console.log(`\nSummary:`);
        console.log(` - Successfully Parsed: ${successCount}`);
        console.log(` - Failed to Parse: ${failCount}`);

    } catch (e) {
        console.error("Error analyzing docx:", e.message);
    }
}

run();
