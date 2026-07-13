const fs = require('fs');
const path = require('path');
const db = require('./db.js');

const GENERATED_DIR = path.join(__dirname, 'generated');

// Programmatic sanitization helper function
const sanitizeFieldText = (val) => {
    if (typeof val !== 'string') return '';
    let cleaned = val.trim();
    
    // 1. Remove trailing bold markers
    if (cleaned.endsWith('**')) {
        cleaned = cleaned.slice(0, -2).trim();
    }
    if (cleaned.startsWith('**') && !cleaned.endsWith('**') && (cleaned.match(/\*\*/g) || []).length === 1) {
        cleaned = cleaned.slice(2).trim();
    }

    // 2. Remove leading question number prefixes (e.g. Q. 1, Q1, Q. 1), Question 1:, 1., प्र. 1, प्रश्न 1:)
    // Order matters: प्रश्न must come before प्र
    cleaned = cleaned.replace(/^\s*(?:Q\s*\.?\s*\d*\s*[\)\.:\-]?|Question\s*\d*\s*[\)\.:\-]?|प्रश्न\s*\d*\s*[\)\.:\-]?|प्र\s*\.?\s*\d*\s*[\)\.:\-]?|\d+\s*[\)\.:\-]+)\s*/i, '');

    // 3. Remove option letter prefixes (e.g. A) content, B. content -> content)
    cleaned = cleaned.replace(/^\s*[A-D]\s*[\)\.:\-]+\s*/i, '');

    // 4. Remove citation brackets and page references (e.g. (p. 12), (pp. 4-5), [1], [Ref: Page 4], (Ref: 12))
    cleaned = cleaned.replace(/[\(\[]\s*(?:pp?\.?\s*\d+(?:\s*-\s*\d+)?|Ref\s*:\s*[^\)\]]*|Page\s*\d+|[0-9]+)\s*[\)\]]/gi, '');

    // 5. Remove common conversational boilerplate/wrapper lines
    cleaned = cleaned.replace(/^\s*(?:English\s+Version|Hindi\s+Version|English\s+Translation|Hindi\s+Translation|Explanation\s*:?|व्याख्या\s*:?)\s*$/gim, '');

    // Remove common trailing AI conversational wraps from the end of the text
    cleaned = cleaned.replace(/\s*(?:Let\s+me\s+know\s+if\s+you\s+would\s+like|Hope\s+this\s+helps|Hope\s+these\s+questions|Here\s+is\s+the\s+first|designed\s+according\s+to\s+your|designed\s+to\s+challenge|following\s+the\s+same\s+strict|highly\s+utility|if\s+you\s+need\s+more)[\s\S]*$/i, '');

    // Remove spaces before punctuation marks (e.g. "detail ." -> "detail.")
    cleaned = cleaned.replace(/\s+([\.\?,;])/g, '$1');

    // 6. Remove duplicate double spaces or trailing dots/newlines
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
};

async function seedPrelims(filePath) {
    console.log(`[Seed] Ingesting Prelims MCQs from: ${path.basename(filePath)}`);
    let fileContent = fs.readFileSync(filePath, 'utf8');
    if (fileContent.startsWith('\uFEFF')) {
        fileContent = fileContent.slice(1);
    }
    const data = JSON.parse(fileContent);
    const filename = path.basename(filePath);
    
    // Parse minuteTopicId from filename (e.g. pre_mcqs_2117_batch1.json -> 2117)
    const match = filename.match(/pre_mcqs_(\d+)_batch/);
    if (!match) {
        throw new Error(`Invalid filename pattern for ${filename}. Expected pre_mcqs_<minuteTopicId>_batch<N>.json`);
    }
    const minuteTopicId = parseInt(match[1]);

    // Resolve Topic ID
    const mt = await db.get("SELECT topic_id FROM minute_topics WHERE minute_topic_id = ?", [minuteTopicId]);
    if (!mt) {
        throw new Error(`Minute Topic ID ${minuteTopicId} not found in database.`);
    }
    const topicId = mt.topic_id;

    let insertCount = 0;
    const mcqs = data.mcqs || data;
    for (const item of mcqs) {
        // Insert English MCQ
        await db.run(`
            INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'EN')
        `, [
            topicId,
            sanitizeFieldText(item.question_en),
            sanitizeFieldText(item.options_en.A),
            sanitizeFieldText(item.options_en.B),
            sanitizeFieldText(item.options_en.C),
            sanitizeFieldText(item.options_en.D),
            item.correct_option.trim().toUpperCase(),
            sanitizeFieldText(item.explanation_en),
            minuteTopicId
        ]);

        // Insert Hindi MCQ
        await db.run(`
            INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'HI')
        `, [
            topicId,
            sanitizeFieldText(item.question_hi),
            sanitizeFieldText(item.options_hi.A),
            sanitizeFieldText(item.options_hi.B),
            sanitizeFieldText(item.options_hi.C),
            sanitizeFieldText(item.options_hi.D),
            item.correct_option.trim().toUpperCase(),
            sanitizeFieldText(item.explanation_hi),
            minuteTopicId
        ]);

        insertCount += 2;
    }
    console.log(`      ✅ Seeded ${insertCount} Prelims rows for Minute Topic ID ${minuteTopicId}.`);
    return insertCount;
}

async function seedMains(filePath) {
    console.log(`[Seed] Ingesting Mains questions from: ${path.basename(filePath)}`);
    let fileContent = fs.readFileSync(filePath, 'utf8');
    if (fileContent.startsWith('\uFEFF')) {
        fileContent = fileContent.slice(1);
    }
    const data = JSON.parse(fileContent);
    const filename = path.basename(filePath);

    // Parse minuteTopicId from filename (e.g. mains_qs_2117_batch1.json -> 2117)
    const match = filename.match(/mains_qs_(\d+)_batch/);
    if (!match) {
        throw new Error(`Invalid filename pattern for ${filename}. Expected mains_qs_<minuteTopicId>_batch<N>.json`);
    }
    const minuteTopicId = parseInt(match[1]);

    // Resolve Topic ID
    const mt = await db.get("SELECT topic_id FROM minute_topics WHERE minute_topic_id = ?", [minuteTopicId]);
    if (!mt) {
        throw new Error(`Minute Topic ID ${minuteTopicId} not found in database.`);
    }
    const topicId = mt.topic_id;

    // Get current sequence_order for mains
    const seqResult = await db.get("SELECT MAX(sequence_order) as maxSeq FROM mains_questions WHERE topic_id = ?", [topicId]);
    let currentSeq = seqResult && seqResult.maxSeq ? seqResult.maxSeq : 0;

    let insertCount = 0;
    const mains = data.mains || data;
    for (const item of mains) {
        currentSeq++;

        // Insert English Mains question
        await db.run(`
            INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id, word_limit)
            VALUES (?, ?, ?, 'EN', ?, ?, ?)
        `, [
            topicId,
            sanitizeFieldText(item.question_en) + ` (Marks: ${item.marks}, Word Limit: ${item.word_limit})`,
            sanitizeFieldText(item.answer_en),
            currentSeq,
            minuteTopicId,
            item.word_limit
        ]);

        // Insert Hindi Mains question
        await db.run(`
            INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id, word_limit)
            VALUES (?, ?, ?, 'HI', ?, ?, ?)
        `, [
            topicId,
            sanitizeFieldText(item.question_hi) + ` (अंक: ${item.marks}, शब्द सीमा: ${item.word_limit})`,
            sanitizeFieldText(item.answer_hi),
            currentSeq,
            minuteTopicId,
            item.word_limit
        ]);

        insertCount += 2;
    }
    console.log(`      ✅ Seeded ${insertCount} Mains rows for Minute Topic ID ${minuteTopicId}.`);
    return insertCount;
}

async function main() {
    console.log('🚀 Starting Offline Question Database Ingestion...');
    if (!fs.existsSync(GENERATED_DIR)) {
        console.log('No generated directory found. Please create backend/database/generated/ and add JSON files.');
        process.exit(0);
    }

    const files = fs.readdirSync(GENERATED_DIR);
    let totalPre = 0;
    let totalMains = 0;

    // Sort files to keep batch order logical
    files.sort();

    for (const file of files) {
        const filePath = path.join(GENERATED_DIR, file);
        if (!fs.statSync(filePath).isFile()) continue;

        try {
            if (file.startsWith('pre_mcqs_')) {
                totalPre += await seedPrelims(filePath);
            } else if (file.startsWith('mains_qs_')) {
                totalMains += await seedMains(filePath);
            }
        } catch (err) {
            console.error(`❌ Failed to seed file ${file}:`, err.message);
        }
    }

    console.log('='.repeat(60));
    console.log(`🎉 Ingestion Complete!`);
    console.log(`📦 Seeded Prelims Rows: ${totalPre} (${totalPre / 2} bilingual questions)`);
    console.log(`📦 Seeded Mains Rows: ${totalMains} (${totalMains / 2} bilingual questions)`);
    console.log('='.repeat(60));
}

main().catch(console.error);
