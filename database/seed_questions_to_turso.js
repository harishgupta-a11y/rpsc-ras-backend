const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

// Load environment variables from .env
if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    env.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}

const rawPath = path.join(__dirname, '..', 'uploaded_files', 'questions_clean.txt');
const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

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
            
            if (line.startsWith('Q.')) {
                questionText = line.replace(/^Q\.\s*/, '').trim();
                continue;
            }
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
            if (line.startsWith('Correct:')) {
                correct = line.replace(/^Correct:\s*/, '').trim();
                continue;
            }
            if (line.startsWith('Explanation:')) {
                parsingExp = true;
                const expVal = line.replace(/^Explanation:\s*/, '').trim();
                if (expVal) explanationLines.push(expVal);
                continue;
            }
            
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

    try {
        console.log("Connecting to Turso production database...");
        
        // 1. Clear existing questions for Guhil dynasty in Turso to avoid duplicates
        await client.execute({
            sql: "DELETE FROM questions WHERE minute_topic_id = 2125",
            args: []
        });
        console.log("Wiped existing questions for minute_topic_id = 2125 in Turso.");

        // 2. Upload in batches
        let count = 0;
        for (const q of parsed) {
            await client.execute({
                sql: `
                    INSERT INTO questions (
                        topic_id, question_text, option_a, option_b, option_c, option_d, 
                        correct_option, detailed_explanation, minute_topic_id, language, difficulty
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
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
                    'FOUNDATION' // difficulty
                ]
            });
            count++;
        }

        console.log(`Successfully uploaded ${count} questions directly to your production Turso database!`);
    } catch (e) {
        console.error("Error seeding to Turso:", e.message);
    } finally {
        await client.close();
    }
}

run();
