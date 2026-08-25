const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@libsql/client');

const localDbPath = 'C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/database/rpsc_ras.db';
const localDb = new sqlite3.Database(localDbPath);

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function getLocalSubtopics() {
    return new Promise((resolve, reject) => {
        localDb.all("SELECT minute_topic_id, topic_id, minute_topic_name, language FROM minute_topics", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function main() {
    try {
        console.log("Reading subtopics from local database...");
        const localRows = await getLocalSubtopics();
        console.log(`Found ${localRows.length} subtopics locally.`);

        if (localRows.length === 0) {
            console.error("Local subtopics table is empty! Aborting.");
            return;
        }

        console.log("Clearing remote minute_topics table...");
        await client.execute("DELETE FROM minute_topics");
        console.log("Remote table cleared.");

        console.log("Syncing subtopics to remote Turso database...");
        // Let's insert them in batches of 50 to optimize network requests
        const batchSize = 50;
        for (let i = 0; i < localRows.length; i += batchSize) {
            const batch = localRows.slice(i, i + batchSize);
            
            // Build batch SQL
            // Turso supports multiple statements or single batch execute.
            // Let's use transaction batch.
            const statements = batch.map(r => ({
                sql: "INSERT INTO minute_topics (minute_topic_id, topic_id, minute_topic_name, language) VALUES (?, ?, ?, ?)",
                args: [r.minute_topic_id, r.topic_id, r.minute_topic_name, r.language]
            }));

            await client.batch(statements);
            console.log(`  Synced batch ${Math.floor(i / batchSize) + 1} (${i + batch.length}/${localRows.length})`);
        }

        console.log("Verification of remote table...");
        const countRes = await client.execute("SELECT COUNT(*) as cnt, MIN(minute_topic_id) as min_id, MAX(minute_topic_id) as max_id FROM minute_topics");
        console.log("Remote subtopics summary after sync:", countRes.rows[0]);

    } catch (err) {
        console.error("Fatal sync error:", err);
    } finally {
        localDb.close();
        await client.close();
    }
}

main();
