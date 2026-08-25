const fs = require('fs');
const path = require('path');

const dbJsPath = path.join(__dirname, 'database', 'db.js');
const content = fs.readFileSync(dbJsPath, 'utf8');

const lines = content.split('\n');
console.log('Total lines in db.js:', lines.length);

const matches = [];
lines.forEach((line, idx) => {
    if (line.includes('seed') || line.includes('insert') || line.includes('seeder') || line.includes('seeding')) {
        matches.push(`${idx + 1}: ${line.trim()}`);
    }
});

console.log('Found matching lines:', matches.slice(0, 100));
