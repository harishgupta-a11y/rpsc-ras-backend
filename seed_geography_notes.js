const fs = require('fs');
const path = require('path');
const db = require('./database/db');

async function run() {
    console.log("=== SEEDING GEOGRAPHY NOTES FROM GDOC ===");
    
    // 1. Locate the downloaded GDoc notes text file
    const docPath = "C:/Users/aNKIT/.gemini/antigravity/brain/f5f193c2-d358-455c-81a2-e70244869f98/.system_generated/steps/7223/content.md";
    if (!fs.existsSync(docPath)) {
        console.error("Error: Could not find GDoc notes cache file. Please run the reader again.");
        process.exit(1);
    }
    
    let content = fs.readFileSync(docPath, 'utf8');
    
    // Strip metadata headers (first 7 lines)
    const lines = content.split('\n');
    if (lines[0].startsWith("Title:") && lines[2].startsWith("Description:")) {
        content = lines.slice(7).join('\n');
    }
    
    try {
        // 2. Find the first subtopic of Geography of Rajasthan (Subject ID 4)
        const targetSubtopic = await db.get(`
            SELECT mt.minute_topic_id, mt.minute_topic_name, t.topic_name, s.subject_name
            FROM minute_topics mt
            JOIN topics t ON mt.topic_id = t.topic_id
            JOIN units u ON t.unit_id = u.unit_id
            JOIN subjects s ON u.subject_id = s.subject_id
            WHERE u.subject_id = 4 AND mt.language = 'EN'
            LIMIT 1
        `);
        
        if (!targetSubtopic) {
            console.error("Error: Could not find any English subtopic under Subject 4 (Geography of Rajasthan) in the database.");
            process.exit(1);
        }
        
        const subtopicId = targetSubtopic.minute_topic_id;
        const subtopicName = targetSubtopic.minute_topic_name;
        
        console.log(`Target Subtopic Found:`);
        console.log(`  - Subject: ${targetSubtopic.subject_name}`);
        console.log(`  - Topic: ${targetSubtopic.topic_name}`);
        console.log(`  - Subtopic: "${subtopicName}" (ID ${subtopicId})`);
        
        // 3. Insert or Update Revision Notes table
        // Check if revision note exists
        const existingNote = await db.get("SELECT note_id FROM revision_notes WHERE minute_topic_id = ? AND language = 'EN'", [subtopicId]);
        
        if (existingNote) {
            await db.run("UPDATE revision_notes SET content = ?, title = ? WHERE note_id = ?", [content, subtopicName, existingNote.note_id]);
            console.log(`\nSuccessfully updated existing revision notes for "${subtopicName}"`);
        } else {
            await db.run("INSERT INTO revision_notes (minute_topic_id, title, content, language) VALUES (?, ?, ?, 'EN')", [subtopicId, subtopicName, content]);
            console.log(`\nSuccessfully created new revision notes for "${subtopicName}"`);
        }
        
        console.log("\n========================================================");
        console.log("TESTING CHECKLIST:");
        console.log("1. Open your Mobile App (with local Expo dev server running).");
        console.log("2. Log in using test number: 9876543210");
        console.log("3. Select Subject: Geography of Rajasthan");
        console.log("4. Choose Topic: " + targetSubtopic.topic_name);
        console.log("5. Select Sub-topic: " + subtopicName);
        console.log("6. Tap the Gold Revision Notes Banner at the bottom!");
        console.log("========================================================");
        
    } catch (e) {
        console.error("Database seeding failed:", e.message);
    }
}

run();
