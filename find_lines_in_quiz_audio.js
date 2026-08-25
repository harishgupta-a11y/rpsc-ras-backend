const fs = require('fs');
const content = fs.readFileSync('frontend-mobile/src/screens/QuizAudioScreen.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('processedText') || line.includes('renderTable')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
