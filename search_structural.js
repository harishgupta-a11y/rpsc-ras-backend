const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/rpsc_ras.db');

console.log('Searching questions table...');
db.all('SELECT * FROM questions', [], (err, rows) => {
  if (err) console.error(err);
  else {
    const matched = rows.filter(r => JSON.stringify(r).toLowerCase().includes('junction nodes'));
    console.log('Found in questions:', matched.length);
    matched.forEach(r => console.log('ID:', r.id, 'Text:', r.question_text?.substring(0, 100), 'Exp:', r.detailed_explanation?.substring(0, 100)));
  }
  
  console.log('Searching mains_questions table...');
  db.all('SELECT * FROM mains_questions', [], (err, rows2) => {
    if (err) console.error(err);
    else {
      const matched = rows2.filter(r => JSON.stringify(r).toLowerCase().includes('junction nodes'));
      console.log('Found in mains_questions:', matched.length);
      matched.forEach(r => console.log('ID:', r.id, 'Text:', r.question_text?.substring(0, 100)));
    }
    
    console.log('Searching revision_notes table...');
    db.all('SELECT * FROM revision_notes', [], (err, rows3) => {
      if (err) console.error(err);
      else {
        const matched = rows3.filter(r => JSON.stringify(r).toLowerCase().includes('junction nodes'));
        console.log('Found in revision_notes:', matched.length);
        matched.forEach(r => console.log('ID:', r.id, 'Title:', r.title));
      }
      db.close();
    });
  });
});
