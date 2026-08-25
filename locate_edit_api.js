const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'simulator', 'app.js');
const content = fs.readFileSync(appJsPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('update-question') || line.includes('delete-question')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
