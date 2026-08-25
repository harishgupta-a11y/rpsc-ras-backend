const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/database/rpsc_ras.db');

db.all(`
    SELECT minute_topic_id, language, COUNT(*) as cnt 
    FROM questions 
    WHERE minute_topic_id IN (2117, 2118, 2119, 2120) 
    GROUP BY minute_topic_id, language
`, (err, rows) => {
    if (err) console.error(err);
    else console.log("Local questions counts:", rows);
    
    db.all(`
        SELECT minute_topic_id, language, COUNT(*) as cnt 
        FROM mains_questions 
        WHERE minute_topic_id IN (2117, 2118, 2119, 2120) 
        GROUP BY minute_topic_id, language
    `, (err2, rows2) => {
        if (err2) console.error(err2);
        else console.log("Local mains questions counts:", rows2);
        db.close();
    });
});
