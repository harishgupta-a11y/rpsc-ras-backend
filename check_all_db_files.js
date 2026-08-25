const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbFiles = [
    path.join(__dirname, 'rpsc_ras.db'),
    path.join(__dirname, 'database', 'rpsc_ras.db'),
    path.join(__dirname, 'database', 'database.sqlite')
];

dbFiles.forEach((dbPath) => {
    if (!fs.existsSync(dbPath)) return;
    
    const db = new sqlite3.Database(dbPath);
    db.all("SELECT question_id, question_text FROM questions WHERE question_text LIKE '%clock%' OR question_text LIKE '%180%' OR question_text LIKE '%boys%' OR question_text LIKE '%girls%' OR question_text LIKE '%Total Wall Area%' OR question_text LIKE '%surface area%'", [], (err, rows) => {
        if (err) {
            console.log(`[${path.basename(dbPath)}] Error: ${err.message}`);
        } else if (rows.length > 0) {
            console.log(`[${path.basename(dbPath)}] Found ${rows.length} rows!`);
            rows.forEach(r => {
                console.log(`  Q-ID: ${r.question_id} -> ${r.question_text.substring(0, 100)}...`);
            });
        } else {
            console.log(`[${path.basename(dbPath)}] 0 matching rows.`);
        }
        db.close();
    });
});
