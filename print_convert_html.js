const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend\\server.js', 'utf8');
const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('function convertHtmlToTextWithListNumbering'));
if (startIdx !== -1) {
  console.log(lines.slice(startIdx, startIdx + 120).join('\n'));
} else {
  console.log("Not found");
}
