const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.expo') {
        searchDir(fullPath, query);
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.txt') || file.endsWith('.py')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(query)) {
          console.log(`Found in: ${fullPath}`);
        }
      }
    }
  }
}

searchDir('C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app', 'resigned en masse');
