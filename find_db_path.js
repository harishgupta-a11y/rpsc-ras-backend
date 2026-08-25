const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend\\database\\db.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('sqlite') || line.includes('Database')) {
        console.log(`Line ${i + 1}: ${line.trim()}`);
    }
});
