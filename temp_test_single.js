const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const filePath = path.join(__dirname, 'uploaded_files', '1782501603575_rajasthan_ancient_history_questions.docx');

async function testSingle() {
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
        console.log(`HTML length: ${result.value.length}`);
        
        // Let's count img tags
        const imgCount = (result.value.match(/<img/g) || []).length;
        // Let's count table tags
        const tableCount = (result.value.match(/<table/g) || []).length;
        
        console.log(` - Embedded Images: ${imgCount}`);
        console.log(` - Tables: ${tableCount}`);
        
        // Find if there are tables or images and print them
        if (tableCount > 0) {
            console.log("\nFound Tables! Preview first table:");
            const startIdx = result.value.indexOf('<table');
            const endIdx = result.value.indexOf('</table>') + 8;
            console.log(result.value.substring(startIdx, endIdx));
        }

        if (imgCount > 0) {
            console.log("\nFound Images! Preview first image tag:");
            const startIdx = result.value.indexOf('<img');
            const endIdx = result.value.indexOf('>', startIdx) + 1;
            console.log(result.value.substring(startIdx, endIdx));
        }
        
    } catch (e) {
        console.error(`Error parsing:`, e.message);
    }
}

testSingle();
