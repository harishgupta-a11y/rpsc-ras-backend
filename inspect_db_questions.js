const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'rpsc_ras.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT DISTINCT minute_topic_id, COUNT(*) as cnt FROM questions GROUP BY minute_topic_id", [], (err, rows) => {
  if (err) console.error(err);
  else console.log("Prelims Questions by minute_topic_id:", rows);
  
  db.all("SELECT DISTINCT minute_topic_id, COUNT(*) as cnt FROM mains_questions GROUP BY minute_topic_id", [], (err, rows2) => {
    if (err) console.error(err);
    else console.log("Mains Questions by minute_topic_id:", rows2);
    db.close();
  });
});
