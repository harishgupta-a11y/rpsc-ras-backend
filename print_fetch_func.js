const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend\\server.js', 'utf8');
const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('async function fetchGoogleDocText'));
if (startIdx !== -1) {
  console.log(lines.slice(startIdx, startIdx + 80).join('\n'));
} else {
  console.log("Not found");
}
