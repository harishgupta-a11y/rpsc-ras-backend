const fs = require('fs');
const path = require('path');

const screensDir = 'frontend-mobile/src/screens';
const keywords = ['table', 'diagram', 'assertion', 'reason', 'markdown', 'render', 'html', 'tabletext', 'image'];

fs.readdirSync(screensDir).forEach(file => {
    if (!file.endsWith('.js')) return;
    const content = fs.readFileSync(path.join(screensDir, file), 'utf8');
    console.log(`=== File: ${file} ===`);
    keywords.forEach(kw => {
        let count = 0;
        let idx = 0;
        while ((idx = content.toLowerCase().indexOf(kw, idx)) !== -1) {
            count++;
            idx += kw.length;
        }
        if (count > 0) {
            console.log(`  - Keyword "${kw}": found ${count} occurrences`);
        }
    });
});
