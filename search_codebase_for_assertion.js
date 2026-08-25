const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === '.expo' || file === 'node_portable') return;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (file.endsWith('.js') || file.endsWith('.txt') || file.endsWith('.md')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walkDir('.');
files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const count = (content.match(/assertion/gi) || []).length;
        const countReason = (content.match(/reason/gi) || []).length;
        if (count > 0 || countReason > 0) {
            console.log(`File: ${file} | "assertion": ${count} | "reason": ${countReason}`);
        }
    } catch (e) {}
});
