const { createClient } = require('C:\\\\Users\\\\aNKIT\\\\.gemini\\\\antigravity\\\\scratch\\\\rpsc-ras-app\\\\backend\\\\node_modules\\\\@libsql\\\\client');

// Connect to production database using connection string from environment
const dbUrl = process.env.TURSO_DATABASE_URL || 'libsql://rpsc-ras-db-harishgupta-a11y.turso.io';
const dbToken = process.env.TURSO_AUTH_TOKEN || '';

const client = createClient({
    url: dbUrl,
    authToken: dbToken
});

async function main() {
    try {
        console.log(`Connecting to remote database: ${dbUrl}...`);
        
        const delPre = await client.execute("DELETE FROM questions WHERE minute_topic_id IS NULL");
        console.log(`Deleted ${delPre.rowsAffected} old Pre questions from remote database.`);

        const delMains = await client.execute("DELETE FROM mains_questions WHERE minute_topic_id IS NULL");
        console.log(`Deleted ${delMains.rowsAffected} old Mains questions from remote database.`);

        console.log("Remote database cleanup complete!");
    } catch(e) {
        console.error("Remote query failed:", e.message);
    }
}

main();
