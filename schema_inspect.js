const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'rpsc_ras.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) { console.error(err); return; }
        console.log('Tables:', tables.map(t => t.name).join(', '));
        
        let done = 0;
        const tableList = tables.map(t => t.name);
        tableList.forEach(tbl => {
            db.all(`PRAGMA table_info(${tbl})`, [], (err, cols) => {
                if (err) { console.error(err); }
                else {
                    console.log(`\n[${tbl}] columns: ${cols.map(c => c.name).join(', ')}`);
                }
                done++;
                if (done === tableList.length) db.close();
            });
        });
    });
});
