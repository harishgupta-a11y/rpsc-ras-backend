const axios = require('axios');
const mammoth = require('mammoth-plus');
const fs = require('fs');

const docId = '1ShbVCuuF-r--KGVqoVVdtbjL2f5Z12_4P16lf73hcJ4';
const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=docx`;

function cleanFieldText(text) {
    if (!text) return "";
    return text.replace(/<[^>]*>/g, '').trim();
}

async function printFirst50Lines() {
    try {
        const response = await axios.get(exportUrl, { responseType: 'arraybuffer' });
        const result = await mammoth.convertToHtml({
            arrayBuffer: Buffer.from(response.data)
        });
        
        let processedHtml = result.value;
        processedHtml = processedHtml
            .replace(/<\/p>/gi, '\n')
            .replace(/<\/tr>/gi, '\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n');
            
        const rawText = cleanFieldText(processedHtml);
        const lines = rawText.split('\n');
        
        console.log("=== FIRST 100 LINES ===");
        lines.slice(0, 100).forEach((line, idx) => {
            console.log(`L${idx+1}: ${line}`);
        });
    } catch (e) {
        console.error(e);
    }
}

printFirst50Lines();
