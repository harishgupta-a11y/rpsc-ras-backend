const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

lines.forEach((line, index) => {
    if (line.includes('convertHtmlToTextWithListNumbering')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
