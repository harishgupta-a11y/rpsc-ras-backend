const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, 'simulator', 'index.html');
const content = fs.readFileSync(indexHtmlPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('clear') || line.includes('Clear') || line.includes('Wipe') || line.includes('Delete')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
