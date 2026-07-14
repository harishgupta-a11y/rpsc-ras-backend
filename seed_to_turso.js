/**
 * seed_to_turso.js
 * Seeds ALL generated prelims MCQs and mains Q&As directly into the Turso online database.
 */
const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
    console.error("ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set.");
    process.exit(1);
}

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const generatedDir = path.join(__dirname, "database", "generated");
const TOPICS_TO_SEED = [2117, 2119, 2125, 2127, 2135, 2139, 2141, 2145, 2147, 2157, 2163, 2165];

async function execute(sql, args) {
    args = args || [];
    const res = await client.execute({ sql, args });
    return res;
}

async function getParentTopicId(minuteTopicId) {
    const res = await execute("SELECT topic_id FROM minute_topics WHERE minute_topic_id = ?", [minuteTopicId]);
    if (!res.rows || res.rows.length === 0) return null;
    return Number(res.rows[0].topic_id);
}

async function seedPrelimsFile(filePath, minuteTopicId, parentTopicId) {
    console.log("  Reading: " + path.basename(filePath));
    const raw = fs.readFileSync(filePath, "utf8");
    let data;
    try { data = JSON.parse(raw); } catch(e) {
        console.error("  JSON error: " + e.message);
        return 0;
    }
    const mcqs = data.mcqs || [];
    let count = 0;
    for (const q of mcqs) {
        await execute(
            "INSERT INTO questions (topic_id, language, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [parentTopicId, "EN", q.question_en, q.options_en.A, q.options_en.B, q.options_en.C, q.options_en.D, q.correct_option, q.explanation_en, minuteTopicId]
        );
        await execute(
            "INSERT INTO questions (topic_id, language, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [parentTopicId, "HI", q.question_hi, q.options_hi.A, q.options_hi.B, q.options_hi.C, q.options_hi.D, q.correct_option, q.explanation_hi, minuteTopicId + 1]
        );
        count++;
    }
    return count;
}

const mainsMappings = {
    2117: 2357, 2119: 2357,
    2125: 2359, 2127: 2359,
    2135: 2361,
    2139: 2363, 2141: 2363,
    2145: 2365,
    2147: 2367,
    2157: 2369,
    2163: 2375, 2165: 2375
};

function getMainsMapping(mid, lang) {
    const baseId = lang === 'HI' ? mid + 1 : mid;
    const targetBase = mainsMappings[mid];
    if (targetBase) {
        return lang === 'HI' ? targetBase + 1 : targetBase;
    }
    return baseId;
}

async function seedMainsFile(filePath, minuteTopicId, parentTopicId, startSeq) {
    console.log("  Reading: " + path.basename(filePath));
    const raw = fs.readFileSync(filePath, "utf8");
    let data;
    try { data = JSON.parse(raw); } catch(e) {
        console.error("  JSON error: " + e.message);
        return 0;
    }
    const mains = data.mains || [];
    let count = 0;
    const mappedEnId = getMainsMapping(minuteTopicId, 'EN');
    const mappedHiId = getMainsMapping(minuteTopicId, 'HI');

    for (let i = 0; i < mains.length; i++) {
        const q = mains[i];
        const seq = startSeq + i * 2;
        await execute(
            "INSERT INTO mains_questions (topic_id, language, word_limit, question_text, model_answer, sequence_order, minute_topic_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [101, "EN", q.word_limit, q.question_en, q.answer_en, seq, mappedEnId]
        );
        await execute(
            "INSERT INTO mains_questions (topic_id, language, word_limit, question_text, model_answer, sequence_order, minute_topic_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [101, "HI", q.word_limit, q.question_hi, q.answer_hi, seq + 1, mappedHiId]
        );
        count++;
    }
    return count;
}

const clearedMainsIds = new Set();

async function seedTopic(minuteTopicId) {
    console.log("\n--- Subtopic ID: " + minuteTopicId + " ---");
    const parentTopicId = await getParentTopicId(minuteTopicId);
    if (!parentTopicId) {
        console.error("  ERROR: No parent topic found.");
        return;
    }
    console.log("  Parent topic_id: " + parentTopicId);
    await execute("DELETE FROM questions WHERE minute_topic_id IN (?, ?)", [minuteTopicId, minuteTopicId + 1]);
    
    const mappedEnId = getMainsMapping(minuteTopicId, 'EN');
    const mappedHiId = getMainsMapping(minuteTopicId, 'HI');
    if (!clearedMainsIds.has(mappedEnId)) {
        await execute("DELETE FROM mains_questions WHERE minute_topic_id IN (?, ?)", [mappedEnId, mappedHiId]);
        clearedMainsIds.add(mappedEnId);
        clearedMainsIds.add(mappedHiId);
        console.log("  Cleared old Mains data for mapped IDs: " + mappedEnId + ", " + mappedHiId);
    } else {
        console.log("  Mains data already cleared for this target in this run. Appending.");
    }
    console.log("  Cleared old Prelims data.");

    const files = fs.readdirSync(generatedDir);
    const pFiles = files.filter(function(f) { return f.startsWith("pre_mcqs_" + minuteTopicId + "_batch"); }).sort();
    let totalP = 0;
    for (const f of pFiles) {
        totalP += await seedPrelimsFile(path.join(generatedDir, f), minuteTopicId, parentTopicId);
    }
    console.log("  Prelims: " + totalP + " MCQs = " + (totalP*2) + " rows");

    const mFiles = files.filter(function(f) { return f === "mains_qas_" + minuteTopicId + ".json" || f.startsWith("mains_qs_" + minuteTopicId + "_batch"); }).sort();
    let totalM = 0, seq = 1;
    for (const f of mFiles) {
        const c = await seedMainsFile(path.join(generatedDir, f), minuteTopicId, parentTopicId, seq);
        totalM += c;
        seq += c * 2;
    }
    console.log("  Mains: " + totalM + " Q&As = " + (totalM*2) + " rows");
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
    console.log("==============================================");
    console.log("  SEEDING TO TURSO ONLINE DB");
    console.log("  URL: " + TURSO_URL);
    console.log("==============================================");
    for (const tid of TOPICS_TO_SEED) {
        try { await seedTopic(tid); }
        catch(e) { console.error("  FAILED topic " + tid + ":", e); }
    }
    console.log("\n=== VERIFICATION ===");
    for (const tid of TOPICS_TO_SEED) {
        try {
            const p = await execute("SELECT COUNT(*) as cnt FROM questions WHERE minute_topic_id IN (?, ?)", [tid, tid + 1]);
            const mappedEnId = getMainsMapping(tid, 'EN');
            const m = await execute("SELECT COUNT(*) as cnt FROM mains_questions WHERE minute_topic_id = ?", [mappedEnId]);
            console.log("  Subtopic " + tid + " (Mains mapped to " + mappedEnId + "): Prelims=" + Number(p.rows[0].cnt) + " | Mains=" + Number(m.rows[0].cnt));
        } catch(e) {
            console.error("  VERIFICATION FAILED for " + tid + ":", e);
        }
    }
    console.log("\nDONE!");
    await client.close();
}

main().catch(function(e) { console.error("Fatal:", e); process.exit(1); });

