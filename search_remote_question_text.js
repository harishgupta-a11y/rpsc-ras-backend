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

async function searchTable(tableName, col1, col2) {
    try {
        const query = `SELECT * FROM ${tableName} WHERE ${col1} LIKE ? OR ${col2} LIKE ?`;
        const res = await client.execute({
            sql: query,
            args: ['%divisible by 2, 3, 4%', '%divisible by 2, 3, 4%']
        });
        if (res.rows.length > 0) {
            console.log(`Found ${res.rows.length} matches in remote table "${tableName}":`);
            res.rows.forEach(r => {
                console.log(`  ID: ${r.question_id || r.mains_question_id || r.id}`);
                console.log(`  Text: ${r.question_text || r.text}`);
                console.log(`  Explanation/Answer:\n${r.detailed_explanation || r.model_answer || r.solution || r.explanation}`);
            });
        }
    } catch (e) {
        console.log(`Table ${tableName} search error:`, e.message);
    }
}

async function main() {
    await searchTable('questions', 'question_text', 'detailed_explanation');
    await searchTable('mains_questions', 'question_text', 'model_answer');
    await searchTable('pyq_questions', 'question_text', 'detailed_explanation');
    await client.close();
}

main();
