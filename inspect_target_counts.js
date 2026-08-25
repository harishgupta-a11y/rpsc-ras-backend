const { createClient } = require("@libsql/client");
const path = require("path");

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
    console.error("ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set.");
    process.exit(1);
}

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function run() {
    console.log("Checking remote question counts...");
    
    // Prelims Questions counts
    for (const id of [2117, 2119, 2125, 2127]) {
        const resEN = await client.execute({
            sql: "SELECT COUNT(*) as cnt FROM questions WHERE minute_topic_id = ? AND language = 'EN'",
            args: [id]
        });
        const resHI = await client.execute({
            sql: "SELECT COUNT(*) as cnt FROM questions WHERE minute_topic_id = ? AND language = 'HI'",
            args: [id + 1]
        });
        console.log(`Prelims Subtopic ${id} (EN): ${resEN.rows[0].cnt} | Subtopic ${id + 1} (HI): ${resHI.rows[0].cnt}`);
    }

    // Mains Questions counts
    for (const id of [2357, 2358, 2359, 2360]) {
        const res = await client.execute({
            sql: "SELECT COUNT(*) as cnt FROM mains_questions WHERE minute_topic_id = ?",
            args: [id]
        });
        console.log(`Mains Subtopic ${id}: ${res.rows[0].cnt}`);
    }
}

run().catch(console.error);
