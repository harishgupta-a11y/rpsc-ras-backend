const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_FILE = path.join(__dirname, 'database', 'rpsc_ras.db');
const db = new sqlite3.Database(DB_FILE);

function formatAssertionReason(text) {
    if (!text) return "";
    let clean = text.trim();
    // Put Reason on a new line with a 1-line gap
    clean = clean.replace(/\s*(Reason|कारण)\s*[\(\[]\s*R\s*[\)\]]\s*[:\-]/gi, '\n\nReason (R):');
    clean = clean.replace(/\s*(Assertion|कथन)\s*[\(\[]\s*A\s*[\)\]]\s*[:\-]/gi, '\n\nAssertion (A):');
    
    // Collapse spacing and handle newlines cleanly
    clean = clean
        .replace(/[ \t]+/g, ' ')
        .replace(/[ \t]+([\.\?,;])/g, '$1')
        .replace(/[ \t]+$/gm, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    
    return clean;
}

function cleanExplanation(text) {
    if (!text) return "";
    let clean = text.trim();
    
    // If there is leakage (contains B) or C) or D) and then Explanation:)
    const match = clean.match(/^[\s\S]*?(?:Explanation|Exp|व्याख्या|स्पष्टीकरण)\s*[:\-]\s*([\s\S]*)$/i);
    if (match) {
        return match[1].trim();
    }
    return clean;
}

function repairOptionD(text) {
    if (!text) return "";
    let clean = text.trim();
    if (clean === 'A is incorrect but R is') {
        return 'A is incorrect but R is correct';
    }
    if (clean === 'A is false but R is') {
        return 'A is false but R is true';
    }
    if (clean === 'A wrong but R is') {
        return 'A is wrong but R is correct';
    }
    return clean;
}

db.serialize(() => {
    db.all("SELECT rowid, question_text, option_d, detailed_explanation FROM questions WHERE question_text LIKE '%Assertion%' OR question_text LIKE '%Reason%' OR question_text LIKE '%कथन%' OR question_text LIKE '%कारण%'", [], (err, rows) => {
        if (err) {
            console.error("Error reading questions:", err.message);
            return;
        }
        
        let updatedCount = 0;
        rows.forEach(row => {
            const formattedQ = formatAssertionReason(row.question_text);
            const cleanedExp = cleanExplanation(row.detailed_explanation);
            const repairedD = repairOptionD(row.option_d);
            
            if (formattedQ !== row.question_text || cleanedExp !== row.detailed_explanation || repairedD !== row.option_d) {
                db.run("UPDATE questions SET question_text = ?, detailed_explanation = ?, option_d = ? WHERE rowid = ?", [formattedQ, cleanedExp, repairedD, row.rowid], (upErr) => {
                    if (upErr) {
                        console.error(`Failed to update questions rowid ${row.rowid}:`, upErr.message);
                    }
                });
                updatedCount++;
            }
        });
        console.log(`Updated/Formatted ${updatedCount} practice questions in database.`);
    });

    db.all("SELECT rowid, question_text, option_d, detailed_explanation FROM pyq_questions WHERE question_text LIKE '%Assertion%' OR question_text LIKE '%Reason%' OR question_text LIKE '%कथन%' OR question_text LIKE '%कारण%'", [], (err, rows) => {
        if (err) {
            console.error("Error reading pyq_questions:", err.message);
            return;
        }
        
        let updatedCount = 0;
        rows.forEach(row => {
            const formattedQ = formatAssertionReason(row.question_text);
            const cleanedExp = cleanExplanation(row.detailed_explanation);
            const repairedD = repairOptionD(row.option_d);
            
            if (formattedQ !== row.question_text || cleanedExp !== row.detailed_explanation || repairedD !== row.option_d) {
                db.run("UPDATE pyq_questions SET question_text = ?, detailed_explanation = ?, option_d = ? WHERE rowid = ?", [formattedQ, cleanedExp, repairedD, row.rowid], (upErr) => {
                    if (upErr) {
                        console.error(`Failed to update pyq_questions rowid ${row.rowid}:`, upErr.message);
                    }
                });
                updatedCount++;
            }
        });
        console.log(`Updated/Formatted ${updatedCount} PYQ questions in database.`);
    });
});
