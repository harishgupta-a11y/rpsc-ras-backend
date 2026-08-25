const { createClient } = require('@libsql/client');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'database', 'rpsc_ras.db');
const client = createClient({
    url: `file:${DB_FILE}`
});

async function run() {
    try {
        console.log("Local Database Question Counts:");
        
        const qCount = await client.execute("SELECT COUNT(*) as count FROM questions");
        console.log(` - Practice MCQs: ${qCount.rows[0].count}`);
        
        const mqCount = await client.execute("SELECT COUNT(*) as count FROM mains_questions");
        console.log(` - Mains Questions: ${mqCount.rows[0].count}`);
        
        const pyqCount = await client.execute("SELECT COUNT(*) as count FROM pyq_questions");
        console.log(` - PYQ Questions: ${pyqCount.rows[0].count}`);

        const subtopics = await client.execute("SELECT * FROM minute_topics ORDER BY minute_topic_id DESC LIMIT 10");
        console.log("\nLatest 10 subtopics in local DB:");
        for (const row of subtopics.rows) {
            console.log(` - ID ${row.minute_topic_id}: ${row.minute_topic_name} (Topic ID: ${row.topic_id}, Language: ${row.language})`);
        }
    } catch (e) {
        console.error(e.message);
    } finally {
        client.close();
    }
}

run();
