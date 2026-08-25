const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend\\server.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(2140, 2240).join('\n'));
