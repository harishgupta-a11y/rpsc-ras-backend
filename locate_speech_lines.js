const fs = require('fs');
const path = require('path');

const quizScreenPath = path.join(__dirname, '..', 'frontend-mobile', 'src', 'screens', 'QuizScreen.js');
const content = fs.readFileSync(quizScreenPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('return') || line.includes('selectedTier') || line.includes('activeQuestion')) {
        if (line.trim().startsWith('return') || line.trim().startsWith('if') || line.trim().startsWith('const activeQuestion')) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    }
});
