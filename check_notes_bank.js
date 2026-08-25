const fs = require('fs');
const path = require('path');

const bankPath = path.join(__dirname, 'database', 'subtopics_notes_bank.json');
if (fs.existsSync(bankPath)) {
    const data = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
    Object.keys(data).forEach(key => {
        const item = data[key];
        console.log(`Key: ${key} | Type: ${typeof item}`);
        if (typeof item === 'string') {
            console.log(`  Length: ${item.length}`);
            console.log(`  Sample: ${item.substring(0, 150)}...`);
        } else if (item && typeof item === 'object') {
            console.log(`  Keys: ${Object.keys(item).join(', ')}`);
            if (item.title) console.log(`  Title: ${item.title}`);
            if (item.notes) console.log(`  Notes length: ${item.notes.length}`);
            if (item.minuteTopicId) console.log(`  minuteTopicId: ${item.minuteTopicId}`);
        }
    });
} else {
    console.log("notes bank not found");
}
