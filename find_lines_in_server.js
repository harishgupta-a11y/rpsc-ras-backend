const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

const terms = ['bookmarks'];

lines.forEach((line, index) => {
    const matchedTerms = terms.filter(t => line.toLowerCase().includes(t));
    if (matchedTerms.length > 0) {
        console.log(`Line ${index + 1}: [${matchedTerms.join(', ')}] ${line.trim()}`);
    }
});
