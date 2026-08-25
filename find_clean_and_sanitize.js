const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === 'node_portable') return;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (file.endsWith('.js')) {
            results.push(fullPath);
        }
    });
    return results;
}

walkDir('.').forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('cleanFieldText')) {
        console.log(`cleanFieldText found in: ${file}`);
    }
    if (content.includes('sanitizeFieldText')) {
        console.log(`sanitizeFieldText found in: ${file}`);
    }
});
