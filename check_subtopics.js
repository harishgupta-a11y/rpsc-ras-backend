const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/database/rpsc_ras.db');

db.all(`SELECT minute_topic_id, topic_id, minute_topic_name FROM minute_topics WHERE language='EN' AND topic_id IN (1,2,3,4,5,6,7,8,9,10) ORDER BY topic_id, minute_topic_id`, (err, rows) => {
    if (err) console.error(err);
    else rows.forEach(r => console.log(r.minute_topic_id, '|', r.topic_id, '|', r.minute_topic_name));
    db.close();
});
