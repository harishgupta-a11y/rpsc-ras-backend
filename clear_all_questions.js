const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'rpsc_ras.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("DELETE FROM questions", [], function(err) {
        if (err) console.error('Error clearing prelims:', err.message);
        else console.log('✅ Cleared', this.changes, 'rows from questions table');
    });
    db.run("DELETE FROM mains_questions", [], function(err) {
        if (err) console.error('Error clearing mains:', err.message);
        else console.log('✅ Cleared', this.changes, 'rows from mains_questions table');
        db.close(() => console.log('✅ All questions cleared. Database is now empty.'));
    });
});
