const sqlite3 = require('sqlite3').verbose();

const localDbPath = 'C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/database/rpsc_ras.db';
const db = new sqlite3.Database(localDbPath);

db.all("PRAGMA table_info(questions)", (err, rows) => {
    if (err) console.log(err);
    else {
        rows.forEach(r => console.log(`Col: ${r.name}, Type: ${r.type}`));
    }
    db.close();
});
