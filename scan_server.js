const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');

const searchTerms = ['upload', 'docx', 'table', 'diagram', 'assertion', 'reason', 'mammoth', 'xml'];
searchTerms.forEach(term => {
    let index = 0;
    let count = 0;
    while ((index = content.toLowerCase().indexOf(term, index)) !== -1) {
        count++;
        index += term.length;
    }
    console.log(`Term "${term}": found ${count} occurrences`);
});
