const { createClient } = require('@libsql/client');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'database', 'rpsc_ras.db');
const client = createClient({
    url: `file:${DB_FILE}`
});

async function run() {
    try {
        console.log("Local Database Check (Mains Questions):");
        
        // Query mains_questions for minute_topic_id = 4 or any other subtopic containing 'guhil'
        const qCount = await client.execute({
            sql: "SELECT COUNT(*) as count FROM mains_questions WHERE minute_topic_id = 4",
            args: []
        });
        console.log(`\nMains Guhils (ID 4) Total Questions: ${qCount.rows[0].count}`);
        
        // Print the question texts
        const questions = await client.execute({
            sql: "SELECT question_id, question_text FROM mains_questions WHERE minute_topic_id = 4 ORDER BY question_id ASC",
            args: []
        });
        console.log("\nQuestion list:");
        questions.rows.forEach((q, idx) => {
            console.log(`[${idx + 1}] ID ${q.question_id}: ${q.question_text.substring(0, 100)}...`);
        });
    } catch (e) {
        console.error(e.message);
    } finally {
        client.close();
    }
}

run();
