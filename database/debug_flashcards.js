const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    env.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
    console.log("=== RUNNING FLASHCARD DIAGNOSTICS ===");
    try {
        // 1. Check if the subtopic (minute_topic) exists
        const mtRes = await client.execute({
            sql: "SELECT * FROM minute_topics WHERE minute_topic_id = 2125",
            args: []
        });
        console.log("\n1. Minute Topic 2125 in DB:", mtRes.rows);

        // 2. Check questions for subtopic 2125
        const qRes = await client.execute({
            sql: "SELECT language, COUNT(*) as count FROM questions WHERE minute_topic_id = 2125 GROUP BY language",
            args: []
        });
        console.log("\n2. Questions count for Subtopic 2125 in DB:", qRes.rows);

        // 3. Check if any flashcards already exist for 2125
        const fRes = await client.execute({
            sql: "SELECT language, COUNT(*) as count FROM flashcards WHERE minute_topic_id = 2125 GROUP BY language",
            args: []
        });
        console.log("\n3. Extracted Flashcards count in DB:", fRes.rows);

    } catch (e) {
        console.error("Error during diagnostics:", e.message);
    } finally {
        await client.close();
    }
}
run();
