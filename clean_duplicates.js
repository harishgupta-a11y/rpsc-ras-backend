const { createClient } = require('@libsql/client');

const url = 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg';

const client = createClient({ url, authToken: token });

function cleanText(txt) {
    if (!txt) return '';
    return txt.toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, '') // remove punctuation
        .replace(/\s+/g, '')
        .trim();
}

async function cleanMCQDuplicates() {
    console.log("Fetching all Prelims questions...");
    const res = await client.execute("SELECT question_id, minute_topic_id, language, question_text FROM questions");
    const questions = res.rows;
    
    const map = {};
    let deletedCount = 0;
    
    questions.forEach(q => {
        const mtId = q.minute_topic_id;
        const lang = q.language;
        const clean = cleanText(q.question_text);
        
        if (!clean) return;
        
        if (!map[mtId]) map[mtId] = {};
        if (!map[mtId][lang]) map[mtId][lang] = {};
        
        if (!map[mtId][lang][clean]) {
            map[mtId][lang][clean] = [];
        }
        map[mtId][lang][clean].push(q.question_id);
    });
    
    for (const mtId in map) {
        for (const lang in map[mtId]) {
            for (const clean in map[mtId][lang]) {
                const ids = map[mtId][lang][clean];
                if (ids.length > 1) {
                    // Keep the first ID, delete the rest
                    const idsToDelete = ids.slice(1);
                    console.log(`[MCQ] Deleting duplicates for subtopic ${mtId} (${lang}): ids [${idsToDelete.join(', ')}]`);
                    for (const id of idsToDelete) {
                        await client.execute({
                            sql: "DELETE FROM questions WHERE question_id = ?",
                            args: [id]
                        });
                        deletedCount++;
                    }
                }
            }
        }
    }
    
    return deletedCount;
}

async function cleanMainsDuplicates() {
    console.log("Fetching all Mains questions...");
    const res = await client.execute("SELECT mains_question_id, minute_topic_id, language, question_text FROM mains_questions");
    const questions = res.rows;
    
    const map = {};
    let deletedCount = 0;
    
    questions.forEach(q => {
        const mtId = q.minute_topic_id;
        const lang = q.language;
        const clean = cleanText(q.question_text);
        
        if (!clean) return;
        
        if (!map[mtId]) map[mtId] = {};
        if (!map[mtId][lang]) map[mtId][lang] = {};
        
        if (!map[mtId][lang][clean]) {
            map[mtId][lang][clean] = [];
        }
        map[mtId][lang][clean].push(q.mains_question_id);
    });
    
    for (const mtId in map) {
        for (const lang in map[mtId]) {
            for (const clean in map[mtId][lang]) {
                const ids = map[mtId][lang][clean];
                if (ids.length > 1) {
                    // Keep the first ID, delete the rest
                    const idsToDelete = ids.slice(1);
                    console.log(`[Mains] Deleting duplicates for subtopic ${mtId} (${lang}): ids [${idsToDelete.join(', ')}]`);
                    for (const id of idsToDelete) {
                        await client.execute({
                            sql: "DELETE FROM mains_questions WHERE mains_question_id = ?",
                            args: [id]
                        });
                        deletedCount++;
                    }
                }
            }
        }
    }
    
    return deletedCount;
}

async function main() {
    try {
        const mcqDeleted = await cleanMCQDuplicates();
        console.log(`Successfully deleted ${mcqDeleted} duplicate MCQs.`);
        
        const mainsDeleted = await cleanMainsDuplicates();
        console.log(`Successfully deleted ${mainsDeleted} duplicate Mains questions.`);
    } catch(err) {
        console.error("Error cleaning duplicates:", err.message);
    } finally {
        client.close();
    }
}

main();
