const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function checkDocx(filename) {
    const filePath = path.join('uploaded_files', filename);
    if (!fs.existsSync(filePath)) {
        console.log(`File ${filename} does not exist.`);
        return;
    }
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        console.log(`=== File: ${filename} (First 1500 chars) ===`);
        console.log(result.value.substring(0, 1500));
        console.log("=========================================\n");
    } catch (err) {
        console.error(`Error reading ${filename}:`, err.message);
    }
}

async function main() {
    await checkDocx('1782558082844_festivals.docx');
    await checkDocx('1782558402434_festivals.docx');
    await checkDocx('1782715148213_HM-Tribal_Movement.docx');
}

main();
