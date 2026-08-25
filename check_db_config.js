const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'backend', 'database', 'db.js');
const dbContent = fs.readFileSync(dbPath, 'utf8');

console.log("Checking DB variables in db.js...");
const lines = dbContent.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('process.env.TURSO') || line.includes('createClient') || line.includes('url:') || line.includes('authToken:')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
