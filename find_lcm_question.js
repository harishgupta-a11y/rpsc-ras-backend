const sqlite3 = require('sqlite3').verbose();

const localDbPath = 'C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/database/rpsc_ras.db';
const db = new sqlite3.Database(localDbPath);

function queryAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function main() {
    try {
        const rows = await queryAll("SELECT * FROM questions WHERE detailed_explanation LIKE '%Least Common Multiple%' LIMIT 1");
        console.log(`Found ${rows.length} matching questions.`);
        rows.forEach(r => {
            console.log(`=== QUESTION ID: ${r.question_id} ===`);
            console.log(`Text: ${r.question_text}`);
            console.log(`Explanation:\n${r.detailed_explanation}`);
        });
    } catch (e) {
        console.log("Error:", e.message);
    } finally {
        db.close();
    }
}

main();
