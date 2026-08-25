const fs = require('fs');
const path = require('path');

function searchDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && !file.startsWith('.')) {
                searchDir(fullPath);
            }
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                if (line.includes('seedPlaceholderQuestionsIfNeeded') && !fullPath.includes('locate_call') && !fullPath.includes('search_seeder') && !line.includes('async function')) {
                    console.log(`Found call in ${fullPath} at line ${idx + 1}: ${line.trim()}`);
                }
            });
        }
    });
}

searchDir(__dirname);
