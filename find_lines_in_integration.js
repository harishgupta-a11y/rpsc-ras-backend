const fs = require('fs');
const content = fs.readFileSync('integration_questions_data.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.toLowerCase().includes('assertion') || line.toLowerCase().includes('reason')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
