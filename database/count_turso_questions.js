const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    env.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
    try {
        const res = await client.execute("SELECT COUNT(*) as count FROM questions");
        console.log("Total Live Questions in Production Turso DB:", res.rows[0].count);
        
        // Count by language
        const resLang = await client.execute("SELECT language, COUNT(*) as count FROM questions GROUP BY language");
        console.log("\nBreakdown by Language:");
        resLang.rows.forEach(r => {
            console.log(` - ${r.language}: ${r.count} questions`);
        });
    } catch(e) {
        console.error(e.message);
    } finally {
        await client.close();
    }
}
run();
