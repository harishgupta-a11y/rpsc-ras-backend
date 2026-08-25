const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, 'simulator', 'index.html');
const content = fs.readFileSync(indexHtmlPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('manager-source-select') || (idx > 500 && idx < 650 && line.includes('<option'))) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
