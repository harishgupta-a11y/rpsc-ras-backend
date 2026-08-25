const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
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

const files = walkDir('frontend-mobile/src');
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('renderContentText')) {
        console.log(`Found in: ${file}`);
    }
});
