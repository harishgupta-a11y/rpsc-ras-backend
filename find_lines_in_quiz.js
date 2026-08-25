const fs = require('fs');
const lines = fs.readFileSync('frontend-mobile/src/screens/QuizScreen.js', 'utf8').split('\n');

lines.forEach((line, index) => {
    if (line.toLowerCase().includes('table') || line.toLowerCase().includes('image')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
