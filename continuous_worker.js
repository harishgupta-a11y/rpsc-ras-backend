/**
 * RPSC RAS 24/7 Cloud Background Worker
 * 
 * Runs continuously in the cloud on Render.
 * Cycles through all 103 syllabus topics, prioritizing topics with fewest questions.
 * Generates synchronized bilingual question pairs (EN + HI) using the user's exact prompts.
 */

const fs = require('fs');
const path = require('path');
const db = require('./database/db');
const { generateAndPersistQuestions } = require('./auto_question_generator');

const STATUS_FILE = path.join(__dirname, 'public', 'generation_status.json');
const LOG_FILE = path.join(__dirname, 'generation_log.txt');

let isRunning = false;
let shouldStop = false;
let batchCounter = 0;
let currentStatus = {
    isRunning: false,
    status: 'IDLE',
    current_topic_id: null,
    current_topic_name: null,
    currentTopic: null,
    currentFormat: null,
    batchNumber: 0,
    language: 'Bilingual (EN + HI)',
    subject_name: null,
    last_format_completed: null,
    questions_added_last_batch: 0,
    total_generated_this_session: 0,
    current_topic_question_count: 0,
    database_total_questions: 0,
    last_updated: new Date().toISOString(),
    last_message: 'Worker ready to start'
};

function sleep(ms) {
    const start = Date.now();
    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (shouldStop || Date.now() - start >= ms) {
                clearInterval(interval);
                resolve();
            }
        }, 200);
    });
}

function updateLiveStatus(statusObj) {
    currentStatus = { ...currentStatus, ...statusObj, last_updated: new Date().toISOString() };
    try {
        fs.writeFileSync(STATUS_FILE, JSON.stringify(currentStatus, null, 2), 'utf8');
    } catch (e) {}
}

function appendLog(message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    console.log(line.trim());
    try {
        fs.appendFileSync(LOG_FILE, line, 'utf8');
    } catch (e) {}
}

const CYCLE_STEPS = [
    { format: 'CLASSICAL', difficulty: 'FOUNDATION' },
    { format: 'CLASSICAL', difficulty: 'ADVANCED' },
    { format: 'STATEMENT', difficulty: 'FOUNDATION' },
    { format: 'STATEMENT', difficulty: 'ADVANCED' },
    { format: 'ASSERTION_REASON', difficulty: 'FOUNDATION' },
    { format: 'ASSERTION_REASON', difficulty: 'ADVANCED' },
    { format: 'MATCH', difficulty: 'FOUNDATION' },
    { format: 'MATCH', difficulty: 'ADVANCED' }
];

async function runWorkerLoop() {
    if (isRunning) {
        appendLog('[Cloud Worker] Already running. Skipping duplicate start.');
        return;
    }

    isRunning = true;
    shouldStop = false;
    appendLog('=== [Cloud Worker] Started 24/7 Background Pipeline on Render ===');
    updateLiveStatus({ 
        isRunning: true, 
        status: 'RUNNING', 
        last_message: 'Worker started 24/7 cloud generation' 
    });

    let sessionGenerated = 0;

    while (!shouldStop) {
        try {
            // Fetch topics ordered by question count ascending (lowest count first)
            const topics = await db.all(`
                SELECT s.subject_id, s.subject_name, t.topic_id, t.topic_name, count(q.question_id) as q_cnt
                FROM subjects s
                JOIN units u ON s.subject_id = u.subject_id
                JOIN topics t ON u.unit_id = t.unit_id
                LEFT JOIN questions q ON t.topic_id = q.topic_id
                GROUP BY s.subject_id, s.subject_name, t.topic_id, t.topic_name
                ORDER BY q_cnt ASC, t.topic_id ASC
            `);

            if (!topics || topics.length === 0) {
                appendLog('[Cloud Worker] No topics found in database. Sleeping 30s...');
                await sleep(30000);
                continue;
            }

            appendLog(`[Cloud Worker] Loaded ${topics.length} syllabus topics. Lowest count topic: Topic ${topics[0].topic_id} ("${topics[0].topic_name}" - ${topics[0].q_cnt} questions).`);

            for (let tIdx = 0; tIdx < topics.length; tIdx++) {
                if (shouldStop) break;

                const topic = topics[tIdx];
                appendLog(`\n>>> [Cloud Worker] Target ${tIdx + 1}/${topics.length}: Topic ${topic.topic_id} "${topic.topic_name}" [Subject: ${topic.subject_name}] (Current: ${topic.q_cnt} qs)`);

                for (const step of CYCLE_STEPS) {
                    if (shouldStop) break;

                    batchCounter++;
                    const stepLabel = `${step.format} (${step.difficulty})`;
                    appendLog(`[Cloud Worker] Generating ${stepLabel} for Topic ${topic.topic_id}...`);
                    updateLiveStatus({
                        isRunning: true,
                        status: 'RUNNING',
                        current_topic_id: topic.topic_id,
                        current_topic_name: topic.topic_name,
                        currentTopic: `Topic ${topic.topic_id}: ${topic.topic_name}`,
                        currentFormat: stepLabel,
                        batchNumber: batchCounter,
                        subject_name: topic.subject_name,
                        language: 'Bilingual (EN + HI)',
                        last_message: `Generating ${stepLabel} for Topic ${topic.topic_id} (${topic.topic_name})...`
                    });

                    let attempts = 0;
                    let success = false;

                    while (attempts < 3 && !success && !shouldStop) {
                        attempts++;
                        try {
                            // generateAndPersistQuestions generates in English using exact prompt,
                            // translates to Hindi using exact translation prompt,
                            // checks <60% overlap, and inserts both EN and HI pairs!
                            const inserted = await generateAndPersistQuestions(db, {
                                topicId: topic.topic_id,
                                language: 'EN',
                                difficulty: step.difficulty,
                                questionFormat: step.format,
                                count: 20
                            });

                            if (inserted && inserted.length > 0) {
                                sessionGenerated += inserted.length;
                                success = true;

                                const tCountRes = await db.all('SELECT count(*) as cnt FROM questions WHERE topic_id = ?', [topic.topic_id]);
                                const dbTotalRes = await db.all('SELECT count(*) as total FROM questions');
                                const topicTotal = tCountRes?.[0]?.cnt || 0;
                                const dbTotal = dbTotalRes?.[0]?.total || 0;

                                const msg = `SUCCESS: Topic ${topic.topic_id} | ${stepLabel} | Added: ${inserted.length} bilingual pairs | Topic Total: ${topicTotal} | Total in DB: ${dbTotal}`;
                                appendLog(msg);

                                updateLiveStatus({
                                    isRunning: true,
                                    status: 'RUNNING',
                                    current_topic_id: topic.topic_id,
                                    current_topic_name: topic.topic_name,
                                    currentTopic: `Topic ${topic.topic_id}: ${topic.topic_name}`,
                                    currentFormat: stepLabel,
                                    batchNumber: batchCounter,
                                    language: 'Bilingual (EN + HI)',
                                    subject_name: topic.subject_name,
                                    last_format_completed: stepLabel,
                                    questions_added_last_batch: inserted.length,
                                    total_generated_this_session: sessionGenerated,
                                    current_topic_question_count: topicTotal,
                                    database_total_questions: dbTotal,
                                    last_message: msg
                                });
                            } else {
                                appendLog(`[Cloud Worker] 0 questions returned for ${stepLabel} on Topic ${topic.topic_id}. Retrying...`);
                            }
                        } catch (err) {
                            appendLog(`[Cloud Worker] ERROR on Topic ${topic.topic_id} (${stepLabel}, attempt ${attempts}): ${err.message}`);
                            if (err.message && (err.message.includes('429') || err.message.includes('quota'))) {
                                appendLog('[Cloud Worker] Rate limit reached. Cooling down 20 seconds...');
                                updateLiveStatus({
                                    last_message: 'Rate limit reached. Cooling down 20 seconds...'
                                });
                                await sleep(20000);
                            } else {
                                await sleep(6000);
                            }
                        }
                    }

                    // Cooldown between batches to respect rate limits
                    await sleep(8000);
                }
            }

            if (!shouldStop) {
                appendLog(`[Cloud Worker] Completed full syllabus pass. Sleeping 60s before next cycle...`);
                await sleep(60000);
            }

        } catch (loopErr) {
            appendLog(`[Cloud Worker] Unexpected loop error: ${loopErr.message}. Cooling down 30s...`);
            await sleep(30000);
        }
    }

    isRunning = false;
    appendLog('=== [Cloud Worker] Stopped gracefully ===');
    updateLiveStatus({ isRunning: false, status: 'STOPPED', last_message: 'Worker stopped' });
}

function startWorker() {
    if (!isRunning) {
        updateLiveStatus({
            isRunning: true,
            status: 'STARTING',
            last_message: 'Worker initializing...'
        });
        runWorkerLoop().catch(err => {
            appendLog('[Cloud Worker] Fatal error: ' + err.message);
            isRunning = false;
            updateLiveStatus({
                isRunning: false,
                status: 'ERROR',
                last_message: 'Worker error: ' + err.message
            });
        });
        return { started: true, message: 'Cloud worker started' };
    }
    return { started: false, message: 'Worker is already running' };
}

function stopWorker() {
    if (isRunning) {
        shouldStop = true;
        updateLiveStatus({
            last_message: 'Stopping worker gracefully after current batch...'
        });
        return { stopping: true, message: 'Worker stop signal sent. It will stop after the current batch.' };
    }
    return { stopping: false, message: 'Worker is not running' };
}

function getWorkerStatus() {
    return {
        ...currentStatus,
        isRunning
    };
}

// If run directly via node continuous_worker.js
if (require.main === module) {
    startWorker();
}

module.exports = {
    startWorker,
    stopWorker,
    getWorkerStatus
};
