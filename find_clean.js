const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend\\server.js', 'utf8');
const match = content.match(/function\s+cleanFieldText[\s\S]*?}/) || content.match(/const\s+cleanFieldText[\s\S]*?}/);
if (match) {
  console.log(match[0]);
} else {
  console.log("Not found with simple regex, printing occurrences:");
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('cleanFieldText')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}
