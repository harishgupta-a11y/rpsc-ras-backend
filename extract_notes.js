const fs = require('fs');
const path = require('path');

const bankPath = path.join(__dirname, 'database', 'subtopics_notes_bank.json');
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));

[2117, 2119, 2125, 2127].forEach(id => {
    // Find the item with minuteTopicId === id
    const item = Object.values(bank).find(x => x.minuteTopicId === id);
    if (item) {
        console.log(`=== TOPIC ${id}: ${item.topicName} ===`);
        console.log(`Content Length: ${item.content.length}`);
        console.log(item.content.substring(0, 1000));
        console.log("\n===================================\n");
    } else {
        console.log(`Topic ${id} not found`);
    }
});
