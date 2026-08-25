const fs = require('fs');
const content = fs.readFileSync('database/seed_generated_questions.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('sanitizeFieldText')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
