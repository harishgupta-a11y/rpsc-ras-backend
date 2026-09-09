/**
 * RPSC RAS Continuous Question Generator Worker
 * 
 * Iterates through syllabus topics one by one.
 * For each topic, systematically generates 20 questions in EACH format:
 * 1. CLASSICAL (20 questions)
 * 2. STATEMENT (20 questions)
 * 3. ASSERTION_REASON (20 questions)
 * 4. MATCH (20 questions)
 * 
 * Enforces:
 * - 41 districts in Rajasthan Geography
 * - Economic Survey 2025-26 & Budget 2026-27 updates
 * - Core keywords ending with colon (:)
 * - Zero fluff & 100% micro-facts
 * - Maximum 60% overlap against existing questions in Turso DB
 * - Live logging and status updates
 */

const fs = require('fs');
const path = require('path');
const db = require('./database/db');
const { generateAndPersistQuestions } = require('./auto_question_generator');

const STATUS_FILE = path.join(__dirname, '..', '..', 'brain', 'f5f193c2-d358-455c-81a2-e70244869f98', 'scratch', 'live_generation_status.json');
const LOG_FILE = path.join(__dirname, '..', '..', 'brain', 'f5f193c2-d358-455c-81a2-e70244869f98', 'scratch', 'generation_log.txt');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function updateLiveStatus(statusObj) {
    try {
        fs.writeFileSync(STATUS_FILE, JSON.stringify(statusObj, null, 2), 'utf8');
    } catch (e) {
        // ignore file write errors
    }
}

function appendLog(message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    console.log(line.trim());
    try {
        fs.appendFileSync(LOG_FILE, line, 'utf8');
    } catch (e) {
        // ignore log write errors
    }
}

async function runContinuousWorker() {
    appendLog('=== Starting RPSC RAS Continuous Question Generator ===');

    // Fetch all topics in order of need (fewer questions first)
    let topics = [];
    try {
        topics = await db.all(`
            SELECT s.subject_id, s.subject_name, t.topic_id, t.topic_name, count(q.question_id) as q_cnt
            FROM subjects s
            JOIN units u ON s.subject_id = u.subject_id
            JOIN topics t ON u.unit_id = t.unit_id
            LEFT JOIN questions q ON t.topic_id = q.topic_id
            GROUP BY s.subject_id, s.subject_name, t.topic_id, t.topic_name
            ORDER BY q_cnt ASC, t.topic_id ASC
        `);
        appendLog(`Loaded ${topics.length} total topics across all subjects.`);
    } catch (e) {
        appendLog('CRITICAL: Failed to query topics: ' + e.message);
        return;
    }

    const FORMATS = ['CLASSICAL', 'STATEMENT', 'ASSERTION_REASON', 'MATCH'];
    let totalGeneratedThisRun = 0;

    for (let tIdx = 0; tIdx < topics.length; tIdx++) {
        const topic = topics[tIdx];
        appendLog(`\n>>> Processing Topic ${topic.topic_id} (${tIdx + 1}/${topics.length}): "${topic.topic_name}" [Subject: ${topic.subject_name}]`);

        for (const format of FORMATS) {
            appendLog(`Generating 20 ${format} questions for Topic ${topic.topic_id} ("${topic.topic_name}")...`);

            let attempts = 0;
            let success = false;

            while (attempts < 3 && !success) {
                attempts++;
                try {
                    const inserted = await generateAndPersistQuestions(db, {
                        topicId: topic.topic_id,
                        language: 'HI', // Primary official medium for RPSC
                        difficulty: 'ADVANCED',
                        questionFormat: format,
                        count: 20
                    });

                    if (inserted && inserted.length > 0) {
                        totalGeneratedThisRun += inserted.length;
                        success = true;

                        // Query current topic total and overall DB total
                        const tCountRes = await db.all('SELECT count(*) as cnt FROM questions WHERE topic_id = ?', [topic.topic_id]);
                        const dbTotalRes = await db.all('SELECT count(*) as total FROM questions');
                        const topicTotal = tCountRes?.[0]?.cnt || 0;
                        const dbTotal = dbTotalRes?.[0]?.total || 0;

                        const message = `COMPLETED: Topic ${topic.topic_id} ("${topic.topic_name}") | Format: ${format} | Added: ${inserted.length} questions | Topic Total: ${topicTotal} | Total in DB: ${dbTotal}`;
                        appendLog(message);

                        updateLiveStatus({
                            last_updated: new Date().toISOString(),
                            status: 'RUNNING',
                            current_topic_id: topic.topic_id,
                            current_topic_name: topic.topic_name,
                            subject_name: topic.subject_name,
                            last_format_completed: format,
                            questions_added_last_batch: inserted.length,
                            total_generated_this_session: totalGeneratedThisRun,
                            current_topic_question_count: topicTotal,
                            database_total_questions: dbTotal,
                            last_message: message
                        });
                    } else {
                        appendLog(`WARNING: 0 questions returned for ${format} on Topic ${topic.topic_id}. Retrying...`);
                    }
                } catch (err) {
                    appendLog(`ERROR on Topic ${topic.topic_id} (${format}, attempt ${attempts}): ${err.message}`);
                    if (err.message && (err.message.includes('429') || err.message.includes('quota'))) {
                        appendLog('Rate limit encountered. Cooling down for 15 seconds...');
                        await sleep(15000);
                    } else {
                        await sleep(5000);
                    }
                }
            }

            // Respect Gemini RPM limit (15 requests/minute -> 4-5 seconds sleep)
            appendLog('Cooling down for 4.5 seconds to respect rate limits...');
            await sleep(4500);
        }
    }

    appendLog(`=== Continuous Worker finished processing all ${topics.length} topics! Total generated: ${totalGeneratedThisRun} ===`);
    updateLiveStatus({
        last_updated: new Date().toISOString(),
        status: 'COMPLETED',
        total_generated_this_session: totalGeneratedThisRun
    });
}

// Start worker
runContinuousWorker().catch(err => {
    appendLog('CRITICAL UNHANDLED ERROR in Continuous Worker: ' + err.message);
});
