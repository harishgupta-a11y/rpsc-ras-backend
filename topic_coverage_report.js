const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'rpsc_ras.db');
const db = new sqlite3.Database(dbPath);

db.all([
    "SELECT mt.minute_topic_id, mt.minute_topic_name as name, t.topic_name,",
    "COALESCE(pq.cnt,0) as prelims, COALESCE(mq.cnt,0) as mains",
    "FROM minute_topics mt",
    "LEFT JOIN topics t ON mt.topic_id=t.topic_id",
    "LEFT JOIN (SELECT minute_topic_id, COUNT(*)/2 as cnt FROM questions GROUP BY minute_topic_id) pq",
    "  ON pq.minute_topic_id=mt.minute_topic_id",
    "LEFT JOIN (SELECT minute_topic_id, COUNT(*)/2 as cnt FROM mains_questions GROUP BY minute_topic_id) mq",
    "  ON mq.minute_topic_id=mt.minute_topic_id",
    "WHERE mt.language='EN'",
    "ORDER BY t.topic_id, mt.minute_topic_id"
].join(' '), [], (err, rows) => {
    if (err) { console.error(err); db.close(); return; }

    const hasQ = rows.filter(r => r.prelims > 0 || r.mains > 0);
    const noQ  = rows.filter(r => r.prelims === 0 && r.mains === 0);

    console.log('\n=== SUBTOPICS WITH QUESTIONS ===');
    hasQ.forEach(r => {
        const pStatus = r.prelims >= 50 ? '✅ 50' : '⚠️  ' + r.prelims + '/50';
        const mStatus = r.mains  >= 30 ? '✅ 30' : '⚠️  ' + r.mains  + '/30';
        console.log('[' + r.minute_topic_id + '] ' + r.name.substring(0, 60));
        console.log('    Prelims: ' + pStatus + '  |  Mains: ' + mStatus);
    });

    console.log('\n=== SUBTOPICS WITHOUT QUESTIONS (need seeding) ===');
    noQ.forEach(r => {
        console.log('[' + r.minute_topic_id + '] ' + r.name);
    });

    console.log('\n=== SUMMARY ===');
    console.log(hasQ.length + ' subtopics have questions');
    console.log(noQ.length  + ' subtopics are EMPTY');
    console.log('Total EN subtopics: ' + rows.length);
    db.close();
});
