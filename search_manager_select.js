const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'simulator', 'app.js');
const content = fs.readFileSync(appJsPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('onManagerSourceChange')) {
        console.log(`${idx + 1}: ${line.trim()}`);
        for (let i = 1; i <= 40; i++) {
            console.log(`${idx + 1 + i}: ${lines[idx + i]}`);
        }
    }
});
