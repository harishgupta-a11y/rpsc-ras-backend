const db = require('./database/db');
const aiEngine = require('./ai_engine');

async function run() {
    console.log("=== SCANNING & ENRICHING ALL REVISION NOTES IN DATABASE ===");
    try {
        // Fetch all notes
        const notes = await db.all("SELECT * FROM revision_notes");
        console.log(`Found ${notes.length} notes in database to enrich.`);

        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            console.log(`\n[${i+1}/${notes.length}] Processing Note ID ${note.note_id}: "${note.title}"`);
            
            // Check if already enriched to avoid calling Gemini unnecessarily
            if (note.content.includes("🧠 Memory Trick") || note.content.includes("🚨 EXAM TRAP") || note.content.includes("graph TD")) {
                console.log(`-> Note already appears to be enriched. Skipping.`);
                continue;
            }

            console.log(`-> Calling Gemini AI to extract tricks, warnings and flowchart codes...`);
            const enrichedText = await aiEngine.enrichRevisionNotes(note.content, note.title);

            if (enrichedText && enrichedText !== note.content) {
                await db.run("UPDATE revision_notes SET content = ? WHERE note_id = ?", [enrichedText, note.note_id]);
                console.log(`-> Successfully enriched and saved!`);
            } else {
                console.log(`-> No additions made or AI skipped.`);
            }
        }
        console.log("\nAll notes processed successfully!");
    } catch (e) {
        console.error("Enrichment run failed:", e.message);
    }
}

run();
