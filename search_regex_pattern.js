const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchDir(fullPath);
      }
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('(?<=\\s|^)(\\d+)\\.\\s+(?=[')) {
        console.log(`Found pattern in: ${fullPath}`);
      }
    }
  }
}

searchDir('C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend');
searchDir('C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\frontend-mobile');
