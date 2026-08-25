const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/database/rpsc_ras.db');

const tables = [
  'users',
  'user_quiz_history',
  'subjects',
  'units',
  'topics',
  'questions',
  'minute_topics',
  'pyq_exams',
  'pyq_questions',
  'support_queries',
  'mains_questions',
  'app_settings'
];

async function getCount(tbl) {
    return new Promise((resolve) => {
        db.get(`SELECT COUNT(*) as cnt FROM ${tbl}`, (err, row) => {
            if (err) resolve(-1);
            else resolve(row.cnt);
        });
    });
}

async function main() {
    console.log("=== LOCAL DB TABLE COUNTS ===");
    for (const tbl of tables) {
        const cnt = await getCount(tbl);
        console.log(`  Table: ${tbl} | Count: ${cnt}`);
    }
    db.close();
}

main();
