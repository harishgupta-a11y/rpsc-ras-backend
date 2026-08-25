/**
 * seed_from_json.js
 * Seeds prelims MCQs and mains Q&As from JSON files into the database.
 * Usage: node seed_from_json.js <topicId> [batchNum]
 * Example: node seed_from_json.js 2119
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const topicId = process.argv[2];
const batchNum = process.argv[3] || 1;

if (!topicId) {
    console.error('Usage: node seed_from_json.js <topicId> [batchNum]');
    process.exit(1);
}

const dbPath = path.join(__dirname, 'database', 'rpsc_ras.db');
const generatedDir = path.join(__dirname, 'database', 'generated');
const db = new sqlite3.Database(dbPath);

async function run(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function get(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function seedPrelimsFile(filePath, topicId, parentTopicId) {
    console.log(`Reading prelims file: ${path.basename(filePath)}`);
    const raw = fs.readFileSync(filePath, 'utf8');
    let data;
    try { data = JSON.parse(raw); } catch(e) {
        console.error(`JSON parse error in ${filePath}: ${e.message}`);
        return 0;
    }
    const mcqs = data.mcqs || [];
    let count = 0;
    for (const q of mcqs) {
        // Insert English version
        await run(`INSERT INTO questions (topic_id, language, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [parentTopicId, 'EN', q.question_en, q.options_en.A, q.options_en.B, q.options_en.C, q.options_en.D, q.correct_option, q.explanation_en, topicId]);
        // Insert Hindi version
        await run(`INSERT INTO questions (topic_id, language, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [parentTopicId, 'HI', q.question_hi, q.options_hi.A, q.options_hi.B, q.options_hi.C, q.options_hi.D, q.correct_option, q.explanation_hi, topicId]);
        count++;
    }
    return count;
}

async function seedMainsFile(filePath, topicId, parentTopicId, startSeq) {
    console.log(`Reading mains file: ${path.basename(filePath)}`);
    const raw = fs.readFileSync(filePath, 'utf8');
    let data;
    try { data = JSON.parse(raw); } catch(e) {
        console.error(`JSON parse error in ${filePath}: ${e.message}`);
        return 0;
    }
    const mains = data.mains || [];
    let count = 0;
    for (const [i, q] of mains.entries()) {
        const seq = startSeq + i * 2;
        await run(`INSERT INTO mains_questions (topic_id, language, word_limit, question_text, model_answer, sequence_order, minute_topic_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [parentTopicId, 'EN', q.word_limit, q.question_en, q.answer_en, seq, topicId]);
        await run(`INSERT INTO mains_questions (topic_id, language, word_limit, question_text, model_answer, sequence_order, minute_topic_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [parentTopicId, 'HI', q.word_limit, q.question_hi, q.answer_hi, seq + 1, topicId]);
        count++;
    }
    return count;
}

async function checkSchema() {
    return new Promise((resolve) => {
        db.all("PRAGMA table_info(questions)", [], (err, rows) => {
            if (err) { resolve([]); return; }
            resolve(rows.map(r => r.name));
        });
    });
}

async function checkMainsSchema() {
    return new Promise((resolve) => {
        db.all("PRAGMA table_info(mains_questions)", [], (err, rows) => {
            if (err) { resolve([]); return; }
            resolve(rows.map(r => r.name));
        });
    });
}

async function main() {
    try {
        // Check schema first
        const cols = await checkSchema();
        const mainsColsAll = await checkMainsSchema();
        console.log('Questions table columns:', cols.join(', '));
        console.log('Mains table columns:', mainsColsAll.join(', '));

        // Add language column to questions if missing
        if (!cols.includes('language')) {
            await run("ALTER TABLE questions ADD COLUMN language TEXT DEFAULT 'EN'");
            console.log('Added language column to questions table');
        }
        // Add language column to mains_questions if missing
        if (!mainsColsAll.includes('language')) {
            await run("ALTER TABLE mains_questions ADD COLUMN language TEXT DEFAULT 'EN'");
            console.log('Added language column to mains_questions table');
        }

        // Resolve parent topic ID
        const mt = await get("SELECT topic_id FROM minute_topics WHERE minute_topic_id = ?", [topicId]);
        if (!mt) {
            console.error(`Error: Could not resolve parent topic_id for minute_topic_id: ${topicId}`);
            process.exit(1);
        }
        const parentTopicId = mt.topic_id;
        console.log(`Resolved parent topic_id: ${parentTopicId} for minute_topic_id: ${topicId}`);

        // --- IDEMPOTENCY: Clear existing questions for this minute_topic_id ---
        await run("DELETE FROM questions WHERE minute_topic_id = ?", [topicId]);
        console.log(`Cleared existing prelims questions for minute_topic_id: ${topicId}`);
        await run("DELETE FROM mains_questions WHERE minute_topic_id = ?", [topicId]);
        console.log(`Cleared existing mains questions for minute_topic_id: ${topicId}`);

        // --- Find and seed prelims files ---
        const files = fs.readdirSync(generatedDir);
        const prelimsFiles = files.filter(f => f.startsWith(`pre_mcqs_${topicId}_batch`));
        let totalPrelims = 0;
        for (const file of prelimsFiles.sort()) {
            const count = await seedPrelimsFile(path.join(generatedDir, file), topicId, parentTopicId);
            totalPrelims += count;
        }
        console.log(`✅ Seeded total of ${totalPrelims} prelims MCQs (${totalPrelims * 2} rows total: EN+HI) for topic ${topicId}`);

        // --- Find and seed mains files ---
        const mainsFiles = files.filter(f => f === `mains_qas_${topicId}.json` || f.startsWith(`mains_qs_${topicId}_batch`));
        let totalMains = 0;
        let startSeq = 1;
        for (const file of mainsFiles.sort()) {
            const count = await seedMainsFile(path.join(generatedDir, file), topicId, parentTopicId, startSeq);
            totalMains += count;
            startSeq += count * 2;
        }
        console.log(`✅ Seeded total of ${totalMains} mains Q&As (${totalMains * 2} rows total: EN+HI) for topic ${topicId}`);

        db.close(() => console.log('Done. DB connection closed.'));
    } catch (err) {
        console.error('Error:', err.message);
        db.close();
        process.exit(1);
    }
}

main();
