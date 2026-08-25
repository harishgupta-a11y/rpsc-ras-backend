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

async function searchTable(tableName, col1, col2) {
    try {
        const sql = `SELECT * FROM ${tableName} WHERE ${col1} LIKE '%between 1 and 156%' OR ${col2} LIKE '%between 1 and 156%'`;
        const rows = await queryAll(sql);
        if (rows.length > 0) {
            console.log(`Found ${rows.length} matches in table "${tableName}":`);
            rows.forEach(r => {
                console.log(`  ID: ${r.question_id || r.mains_question_id || r.id}`);
                console.log(`  Text: ${r.question_text || r.text}`);
                console.log(`  Explanation/Answer:\n${r.detailed_explanation || r.model_answer || r.solution || r.explanation}`);
            });
        }
    } catch (e) {
        // console.log(`Table ${tableName} search error:`, e.message);
    }
}

async function main() {
    await searchTable('questions', 'question_text', 'detailed_explanation');
    await searchTable('mains_questions', 'question_text', 'model_answer');
    await searchTable('pyq_questions', 'question_text', 'detailed_explanation');
    db.close();
}

main();
