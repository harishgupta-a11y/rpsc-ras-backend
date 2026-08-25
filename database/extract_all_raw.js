const fs = require('fs');
const path = require('path');
const mammoth = require('C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/node_modules/mammoth');

const PATHS = {
    medieval: "C:/Users/aNKIT/Desktop/questions for ai/History/rajasthan/medival",
    modern: "C:/Users/aNKIT/Desktop/questions for ai/History/rajasthan/Modern",
    art_culture: "C:/Users/aNKIT/Desktop/questions for ai/art and culture"
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

async function processFolder(cat, folderName) {
    const folderPath = path.join(PATHS[cat], folderName);
    if (!fs.existsSync(folderPath)) return;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.docx'));
    const preFiles = files.filter(f => {
        const upper = f.toUpperCase();
        return (upper.startsWith('E-') || upper.startsWith('H-')) && !upper.startsWith('EM-') && !upper.startsWith('HM-');
    });

    for (const file of preFiles) {
        const filePath = path.join(folderPath, file);
        const outName = file.replace(/\.docx$/i, '_raw.txt');
        const outPath = path.join(folderPath, outName);

        try {
            const resHtml = await mammoth.convertToHtml({ path: filePath });
            const rawText = convertHtmlToText(resHtml.value);
            fs.writeFileSync(outPath, rawText, 'utf8');
            console.log(`Extracted: "${file}" -> "${outName}"`);
        } catch (e) {
            console.error(`Error extracting "${file}":`, e.message);
        }
    }
}

async function main() {
    console.log("=== STARTING RAW TEXT EXTRACTION ===");
    for (const [cat, basePath] of Object.entries(PATHS)) {
        if (!fs.existsSync(basePath)) continue;
        const folders = fs.readdirSync(basePath).filter(f => fs.statSync(path.join(basePath, f)).isDirectory());
        for (const folder of folders) {
            await processFolder(cat, folder);
        }
    }
    console.log("=== EXTRACTION COMPLETE ===");
}

main();
