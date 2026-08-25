const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'database', 'rpsc_ras.db'));

db.serialize(() => {
  db.all(`
    SELECT DISTINCT mt.topic_id, t.topic_name 
    FROM minute_topics mt
    LEFT JOIN topics t ON mt.topic_id = t.topic_id
  `, (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    rows.forEach(r => {
      console.log(`topic_id: ${r.topic_id} | name: ${r.topic_name}`);
    });
    db.close();
  });
});
