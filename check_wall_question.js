const fs = require('fs');
const { createClient } = require('@libsql/client');

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

async function main() {
    try {
        const res = await client.execute({
            sql: "SELECT * FROM pyq_questions WHERE detailed_explanation LIKE '%four bounding vertical walls%' OR question_text LIKE '%four bounding vertical walls%' LIMIT 1"
        });
        if (res.rows.length > 0) {
            const r = res.rows[0];
            console.log(`=== FOUND QUESTION ID: ${r.question_id || r.id} ===`);
            console.log(`Text: ${r.question_text || r.text}`);
            console.log(`Explanation:\n${r.detailed_explanation || r.explanation}`);
        } else {
            console.log("No question found for walls.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.close();
    }
}

main();
