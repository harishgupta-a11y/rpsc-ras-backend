const fs = require('fs');
const path = require('path');

const bankPath = path.join(__dirname, 'subtopics_notes_bank.json');
if (fs.existsSync(bankPath)) {
  const data = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  console.log("Total entries in bank:", data.length);
  for (const item of data) {
    if (item.content.includes('|')) {
      console.log(`Found '|' in entry with minuteTopicId: ${item.minuteTopicId}, topicName: ${item.topicName}`);
      console.log(item.content.substring(0, 500));
    }
  }
} else {
  console.log("File not found:", bankPath);
}
