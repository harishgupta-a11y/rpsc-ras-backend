const { createClient } = require('@libsql/client');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database', 'rpsc_ras.db');
const client = createClient({
    url: `file:${DB_FILE}`
});

async function main() {
    try {
        const tables = ['subjects', 'units', 'topics', 'minute_topics', 'questions', 'mains_questions', 'revision_notes'];
        for (const table of tables) {
            const res = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`Table ${table}: ${res.rows[0].count} rows`);
        }
    } catch (e) {
        console.error(e);
    }
}
main();
