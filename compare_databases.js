const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@libsql/client');
const path = require('path');

const localDbPath = 'C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/database/rpsc_ras.db';
const localDb = new sqlite3.Database(localDbPath);

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

const localIds = [2117, 2119, 2125, 2127, 2135, 2139, 2141, 2145, 2147, 2157, 2163];

async function getLocalRows() {
    return new Promise((resolve, reject) => {
        const placeholders = localIds.map(() => '?').join(',');
        localDb.all(`SELECT minute_topic_id, topic_id, minute_topic_name FROM minute_topics WHERE minute_topic_id IN (${placeholders})`, localIds, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function main() {
    try {
        console.log("=== LOCAL DB SUBTOPICS ===");
        const localRows = await getLocalRows();
        
        console.log("Local Rows:");
        localRows.forEach(r => {
            console.log(`  Local ID: ${r.minute_topic_id} | Topic ID: ${r.topic_id} | Name: ${r.minute_topic_name}`);
        });

        console.log("\n=== REMOTE TURSO DB SUBTOPICS ===");
        const remoteRes = await client.execute("SELECT minute_topic_id, topic_id, minute_topic_name FROM minute_topics");
        console.log("Remote Rows Total Count:", remoteRes.rows.length);

        // We want to map each local subtopic name to the remote subtopic name
        console.log("\n=== MAPPING ANALYSIS ===");
        for (const localRow of localRows) {
            // Find a match in remote
            const cleanedLocalName = localRow.minute_topic_name.toLowerCase().trim();
            const matches = remoteRes.rows.filter(r => {
                const cleanedRemoteName = r.minute_topic_name.toLowerCase().trim();
                return cleanedRemoteName === cleanedLocalName || 
                       cleanedRemoteName.includes(cleanedLocalName) || 
                       cleanedLocalName.includes(cleanedRemoteName);
            });

            console.log(`Local ID: ${localRow.minute_topic_id} ("${localRow.minute_topic_name}") matches in remote:`);
            if (matches.length === 0) {
                console.log("  ❌ NO MATCH FOUND");
            } else {
                matches.forEach(m => {
                    console.log(`  ✅ Remote ID: ${m.minute_topic_id} | Topic ID: ${m.topic_id} | Name: "${m.minute_topic_name}"`);
                });
            }
        }

    } catch (err) {
        console.error("Error comparing databases:", err);
    } finally {
        localDb.close();
        await client.close();
    }
}

main();
