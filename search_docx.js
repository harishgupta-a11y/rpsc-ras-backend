const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const dir = 'C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/uploaded_files';

async function searchFile(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value;
        
        const keywords = ['Sirohi', 'सिरोही', 'Bhula', 'भूला', 'Chaura', 'चोरा', 'Chora', 'नीमड़ा', 'Neemda'];
        console.log(`\nSearching in ${path.basename(filePath)}...`);
        
        keywords.forEach(kw => {
            const index = text.toLowerCase().indexOf(kw.toLowerCase());
            if (index !== -1) {
                console.log(`  Found "${kw}" at index ${index}.`);
                const isHM = filePath.includes('HM-Tribal_Movement');
                const start = Math.max(0, index - (isHM ? 300 : 50));
                const end = Math.min(text.length, index + (isHM ? 500 : 50));
                console.log(`    Context: "${text.substring(start, end).replace(/\n/g, ' ')}"`);
            }
        });
    } catch(e) {
        console.error(`Error parsing ${filePath}:`, e.message);
    }
}

async function main() {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith('.docx')) {
            await searchFile(path.join(dir, file));
        }
    }
}

main();
