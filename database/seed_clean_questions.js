const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const rawPath = path.join(__dirname, '..', 'uploaded_files', 'questions_clean.txt');
const dbPath = path.join(__dirname, 'rpsc_ras.db');

async function run() {
    console.log("Reading cleaned questions from:", rawPath);
    if (!fs.existsSync(rawPath)) {
        console.error("Cleaned questions file does not exist! Please run merge script first.");
        process.exit(1);
    }

    const content = fs.readFileSync(rawPath, 'utf8');
    const blocks = content.split(/\n+(?=Q\.)/i).map(b => b.trim()).filter(Boolean);
    console.log(`Loaded ${blocks.length} questions.`);

    const parsed = [];
    
    for (const block of blocks) {
        const rawLines = block.split('\n').map(l => l.trim()).filter(Boolean);
        
        let questionText = '';
        let optA = '', optB = '', optC = '', optD = '';
        let correct = '';
        let explanationLines = [];
        let parsingExp = false;
        
        for (let i = 0; i < rawLines.length; i++) {
            const line = rawLines[i];
            
            // Check if it's the question line
            if (line.startsWith('Q.')) {
                questionText = line.replace(/^Q\.\s*/, '').trim();
                continue;
            }
            
            // Match Options
            if (line.startsWith('A)')) {
                optA = line.replace(/^A\)\s*/, '').trim();
                continue;
            }
            if (line.startsWith('B)')) {
                optB = line.replace(/^B\)\s*/, '').trim();
                continue;
            }
            if (line.startsWith('C)')) {
                optC = line.replace(/^C\)\s*/, '').trim();
                continue;
            }
            if (line.startsWith('D)')) {
                optD = line.replace(/^D\)\s*/, '').trim();
                continue;
            }
            
            // Correct answer
            if (line.startsWith('Correct:')) {
                correct = line.replace(/^Correct:\s*/, '').trim();
                continue;
            }
            
            // Explanation
            if (line.startsWith('Explanation:')) {
                parsingExp = true;
                const expVal = line.replace(/^Explanation:\s*/, '').trim();
                if (expVal) explanationLines.push(expVal);
                continue;
            }
            
            // Accumulate question description (if it spans multiple lines, e.g. statements or tables)
            if (!parsingExp && !optA && !correct) {
                questionText += '\n' + line;
            } else if (parsingExp) {
                explanationLines.push(line);
            }
        }
        
        parsed.push({
            question: questionText.trim(),
            A: optA,
            B: optB,
            C: optC,
            D: optD,
            correct: correct,
            explanation: explanationLines.join('\n').trim()
        });
    }

    console.log(`Parsed ${parsed.length} questions successfully.`);

    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        // 1. Clear existing questions for Guhil dynasty subtopic to prevent duplication
        db.run("DELETE FROM questions WHERE minute_topic_id = 2125", (err) => {
            if (err) {
                console.error("Failed to clean table:", err.message);
                db.close();
                process.exit(1);
            }
            console.log("Cleared existing database questions for subtopic 2125.");
            
            // 2. Prepare insert statement
            const stmt = db.prepare(`
                INSERT INTO questions (
                    topic_id, question_text, option_a, option_b, option_c, option_d, 
                    correct_option, detailed_explanation, minute_topic_id, language, difficulty
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            let count = 0;
            for (const q of parsed) {
                stmt.run(
                    2, // topic_id
                    q.question,
                    q.A,
                    q.B,
                    q.C,
                    q.D,
                    q.correct,
                    q.explanation,
                    2125, // minute_topic_id
                    'EN', // language
                    'FOUNDATION', // difficulty
                    (errInsert) => {
                        if (errInsert) {
                            console.error("Failed to insert question:", q.question.substring(0, 30), errInsert.message);
                        }
                    }
                );
                count++;
            }
            
            stmt.finalize(() => {
                console.log(`Successfully seeded ${count} questions to local database!`);
                db.close();
            });
        });
    });
}

run();
