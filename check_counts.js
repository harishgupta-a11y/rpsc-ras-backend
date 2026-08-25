const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'database', 'rpsc_ras.db'));

const subtopics = [
  // Topic 11
  1788, 1789, 1790, 1791, 1792, 1793,
  1796, 1797, 1798, 1799, 1800, 1801,
  // Topic 12
  1802, 1803, 1804, 1805, 1806, 1807, 1808, 1809, 1810, 1811,
  1812, 1813, 1814, 1815, 1816, 1817, 1818, 1819, 1820, 1821,
  // Topic 13
  1822, 1823, 1824, 1825, 1826, 1827, 1828, 1829,
  1830, 1831, 1832, 1833, 1834, 1835, 1836, 1837
];

db.serialize(() => {
  console.log("=== QUESTIONS COUNTS BY LANGUAGE AND ID ===");
  db.all(`
    SELECT minute_topic_id, language, COUNT(*) as count 
    FROM questions 
    WHERE minute_topic_id IN (${subtopics.join(',')})
    GROUP BY minute_topic_id, language
    ORDER BY minute_topic_id, language
  `, (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    rows.forEach(r => {
      console.log(`Subtopic: ${r.minute_topic_id} | Lang: ${r.language} | Pre MCQ Count: ${r.count}`);
    });

    console.log("\n=== MAINS MODEL ANSWERS COUNTS BY LANGUAGE AND ID ===");
    db.all(`
      SELECT minute_topic_id, language, COUNT(*) as count 
      FROM mains_questions 
      WHERE minute_topic_id IN (${subtopics.join(',')})
      GROUP BY minute_topic_id, language
      ORDER BY minute_topic_id, language
    `, (err, rows2) => {
      if (err) {
        console.error(err);
        return;
      }
      rows2.forEach(r => {
        console.log(`Subtopic: ${r.minute_topic_id} | Lang: ${r.language} | Mains Qs Count: ${r.count}`);
      });
      db.close();
    });
  });
});
