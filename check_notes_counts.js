const { createClient } = require('@libsql/client');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const dbUrl = env.match(/TURSO_DATABASE_URL=(.*)/)[1].trim();
const dbToken = env.match(/TURSO_AUTH_TOKEN=(.*)/)[1].trim();

const client = createClient({
    url: dbUrl,
    authToken: dbToken
});

async function main() {
    try {
        const res = await client.execute("SELECT note_id, title FROM revision_notes LIMIT 20");
        console.log(`Found ${res.rows.length} notes on Turso.`);
        res.rows.forEach(r => {
            console.log(`Note ID: ${r.note_id} | Title: ${r.title}`);
        });
    } catch (e) {
        console.error(e);
    }
}
main();
