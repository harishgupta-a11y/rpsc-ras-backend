const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, 'server.js');
const content = fs.readFileSync(serverJsPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('function cleanFieldText')) {
        console.log(`${idx + 1}: ${line.trim()}`);
        // Let's print the next 20 lines too!
        for (let i = 1; i <= 20; i++) {
            console.log(`${idx + 1 + i}: ${lines[idx + i]}`);
        }
    }
});
