const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend\\server.js', 'utf8');
const match = content.match(/function\s+joinMidSentenceLineBreaks[\s\S]*?\n}/);
if (match) {
  console.log(match[0]);
} else {
  console.log("Not found with simple regex, printing occurrences:");
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('joinMidSentenceLineBreaks')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
  // Print 50 lines around the first occurrence in server.js
  const firstIdx = lines.findIndex(l => l.includes('cleanFieldText'));
  if (firstIdx !== -1) {
    console.log("--- server.js lines around cleanFieldText ---");
    console.log(lines.slice(firstIdx, firstIdx + 100).join('\n'));
  }
}
