const fs = require('fs');
const content = fs.readFileSync('auto_watcher.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('cleanFieldText')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
