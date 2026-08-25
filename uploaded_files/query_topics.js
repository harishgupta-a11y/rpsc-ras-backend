const { createClient } = require('@libsql/client');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'database', 'rpsc_ras.db');
const client = createClient({
    url: `file:${DB_FILE}`
});

async function run() {
    try {
        const units = await client.execute("SELECT * FROM units");
        console.log("Units:");
        for (const row of units.rows) {
            console.log(` - Unit ID ${row.unit_id} (Subject ID ${row.subject_id}): ${row.unit_name}`);
        }

        const topics = await client.execute("SELECT topic_id, unit_id, topic_name FROM topics");
        console.log("\nTopics:");
        for (const row of topics.rows) {
            console.log(` - ID ${row.topic_id} (Unit ID ${row.unit_id}): ${row.topic_name}`);
        }
    } catch (e) {
        console.error(e.message);
    } finally {
        client.close();
    }
}

run();
