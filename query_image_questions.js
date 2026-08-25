const fs = require('fs');
const path = require('path');

const dir = "C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend";

console.log("=== SEARCHING BACKEND SOURCE FILES FOR '[IMAGE:' ===");

function searchDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    files.forEach(f => {
        const fullPath = path.join(currentDir, f);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (f !== 'node_modules' && f !== '.git' && f !== 'database') {
                searchDir(fullPath);
            }
        } else if (f.endsWith('.js') || f.endsWith('.json')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('[IMAGE:') || content.includes('IMAGE:')) {
                console.log(`Found reference in file: ${fullPath}`);
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (line.includes('[IMAGE:') || line.includes('IMAGE:')) {
                        console.log(`  L${idx+1}: ${line.trim()}`);
                    }
                });
            }
        }
    });
}

searchDir(dir);
