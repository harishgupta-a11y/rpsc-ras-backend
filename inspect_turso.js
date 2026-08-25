const fs = require('fs');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
if (fs.existsSync('.env')) {
    const env = fs.readFileSync('.env', 'utf8');
    env.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}

const { createClient } = require('@libsql/client');
const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
    try {
        const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        console.log("Tables in Turso:", tables.rows.map(r => r.name));
        
        // Let's check minute_topics
        // Search questions table for 'Paheba' or 'पाहेबा'
        console.log("Searching questions table for 'Paheba' or 'पाहेबा'...");
        const res = await client.execute(`
            SELECT question_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language 
            FROM questions 
            WHERE question_text LIKE '%Paheba%' 
               OR question_text LIKE '%पाहेबा%'
        `);
        console.log(`Found ${res.rows.length} matches:`);
        res.rows.forEach(r => {
            console.log(`ID: ${r.question_id} | Lang: ${r.language} | Correct: ${r.correct_option}`);
            console.log("Q:", r.question_text);
            console.log("A:", r.option_a);
            console.log("B:", r.option_b);
            console.log("C:", r.option_c);
            console.log("D:", r.option_d);
            console.log("Exp:", r.detailed_explanation);
            console.log("-----------------------------------------");
        });
        
        // Print 3 samples of 10 Marks answers to verify they have bold headers
        console.log("\nChecking sample 10 Marks answers (should have bold headers and no labels)...");
        const samples = await client.execute(`
            SELECT question_text, model_answer 
            FROM mains_questions 
            WHERE word_limit = 150 AND language = 'EN'
            LIMIT 3
        `);
        samples.rows.forEach((r, idx) => {
            console.log(`\n=== SAMPLE ${idx + 1} ===`);
            console.log("Question:", r.question_text);
            console.log("Answer:\n", r.model_answer);
        });
    } catch (err) {
        console.error("Error inspecting:", err);
    } finally {
        await client.close();
    }
}

main();
