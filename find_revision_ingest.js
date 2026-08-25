const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend\\server.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('/revision-notes') || line.includes('revision_notes') || line.toLowerCase().includes('revisionnote') || line.includes('upload-notes')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
