const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'rpsc_ras.db');
const db = new sqlite3.Database(dbPath);

const TARGET_IDS = [2117, 2119, 2125, 2127];
const placeholders = TARGET_IDS.map(() => '?').join(',');

db.serialize(() => {
    db.run(`DELETE FROM questions WHERE minute_topic_id IN (${placeholders})`, TARGET_IDS, function(err) {
        if (err) console.error('Error deleting prelims:', err.message);
        else console.log(`✅ Deleted ${this.changes} prelims rows for topics ${TARGET_IDS.join(', ')}`);
    });
    db.run(`DELETE FROM mains_questions WHERE minute_topic_id IN (${placeholders})`, TARGET_IDS, function(err) {
        if (err) console.error('Error deleting mains:', err.message);
        else console.log(`✅ Deleted ${this.changes} mains rows for topics ${TARGET_IDS.join(', ')}`);
        db.close(() => console.log('✅ DB closed. Ready for clean re-seed.'));
    });
});
