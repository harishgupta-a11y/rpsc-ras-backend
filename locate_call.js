const fs = require('fs');
const path = require('path');

const dbJsPath = path.join(__dirname, 'database', 'db.js');
const content = fs.readFileSync(dbJsPath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('INSERT INTO questions')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
