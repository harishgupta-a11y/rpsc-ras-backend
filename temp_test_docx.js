const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const dir = path.join(__dirname, 'uploaded_files');

async function testFile(filename) {
    const filePath = path.join(dir, filename);
    try {
        const result = await mammoth.convertToHtml({ 
            path: filePath,
            convertImage: mammoth.images.inline(async (element) => {
                const imageBuffer = await element.read();
                return {
                    src: `data:${element.contentType};base64,${imageBuffer.toString('base64').substring(0, 30)}...`
                };
            })
        });
        console.log(`\n=================== FILE: ${filename} ===================`);
        console.log(`HTML length: ${result.value.length}`);
        
        // Let's count img tags
        const imgCount = (result.value.match(/<img/g) || []).length;
        // Let's count table tags
        const tableCount = (result.value.match(/<table/g) || []).length;
        
        console.log(` - Embedded Images: ${imgCount}`);
        console.log(` - Tables: ${tableCount}`);
        
        // Print the first 500 characters of HTML
        console.log("HTML Preview (first 500 chars):");
        console.log(result.value.substring(0, 500));
        
        // Print if there are any math-like structures (e.g. frac, sub, sup, m:oMath)
        const hasMath = result.value.includes('math') || result.value.includes('Math') || result.value.includes('sup') || result.value.includes('sub');
        console.log(` - Has math keywords/tags: ${hasMath}`);
        
    } catch (e) {
        console.error(`Error parsing ${filename}:`, e.message);
    }
}

async function main() {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith('.docx')) {
            await testFile(file);
        }
    }
}

main();
