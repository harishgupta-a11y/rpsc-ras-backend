const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@libsql/client');

const localDbPath = 'C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/database/rpsc_ras.db';
const localDb = new sqlite3.Database(localDbPath);

// Load environment variables manually
const dotenvContent = fs.readFileSync('C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/.env', 'utf8');
dotenvContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

function getLocalSubtopics() {
    return new Promise((resolve, reject) => {
        localDb.all("SELECT minute_topic_id, topic_id, minute_topic_name, language FROM minute_topics", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function runSql(sql, params = []) {
    return new Promise((resolve, reject) => {
        localDb.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function main() {
    try {
        console.log("Fetching subtopics from remote Turso database...");
        const remoteRes = await client.execute("SELECT minute_topic_id, topic_id, minute_topic_name, language FROM minute_topics");
        const remoteRows = remoteRes.rows;
        console.log(`Found ${remoteRows.length} subtopics on remote Turso.`);

        console.log("Fetching subtopics from local SQLite...");
        const localRows = await getLocalSubtopics();
        console.log(`Found ${localRows.length} subtopics locally.`);

        // Map local subtopics by ID + language
        const localMap = new Map();
        localRows.forEach(r => {
            localMap.set(`${r.minute_topic_id}_${r.language}`, r.minute_topic_name);
        });

        const updates = [];
        const inserts = [];

        remoteRows.forEach(r => {
            const key = `${r.minute_topic_id}_${r.language}`;
            if (localMap.has(key)) {
                const localName = localMap.get(key);
                if (localName !== r.minute_topic_name) {
                    updates.push(r);
                }
            } else {
                inserts.push(r);
            }
        });

        console.log(`Verification: ${updates.length} updates needed, ${inserts.length} inserts needed locally.`);

        if (updates.length === 0 && inserts.length === 0) {
            console.log("✅ Local SQLite database is already 100% in sync with remote Turso!");
            return;
        }

        // Apply inserts/updates locally
        await runSql("BEGIN TRANSACTION");
        for (const r of inserts) {
            await runSql("INSERT INTO minute_topics (minute_topic_id, topic_id, minute_topic_name, language) VALUES (?, ?, ?, ?)", [r.minute_topic_id, r.topic_id, r.minute_topic_name, r.language]);
        }
        for (const r of updates) {
            await runSql("UPDATE minute_topics SET minute_topic_name = ? WHERE minute_topic_id = ? AND language = ?", [r.minute_topic_name, r.minute_topic_id, r.language]);
            console.log(`  Updated Subtopic #${r.minute_topic_id} (${r.language}) name: "${localMap.get(`${r.minute_topic_id}_${r.language}`)}" -> "${r.minute_topic_name}"`);
        }
        await runSql("COMMIT");
        console.log("✅ Local SQLite database successfully synchronized with remote Turso!");

    } catch (e) {
        await runSql("ROLLBACK").catch(() => {});
        console.error("Sync error:", e.message);
    } finally {
        localDb.close();
        await client.close();
    }
}

main();
