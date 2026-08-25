const { createClient } = require('@libsql/client');

const url = 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg';

const client = createClient({ url, authToken: token });

function cleanText(txt) {
    if (!txt) return '';
    return txt.toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, '') // remove punctuation, keeping English & Devanagari chars
        .replace(/\s+/g, '')
        .trim();
}

async function detectMCQDuplicates() {
    console.log("Fetching all Prelims questions...");
    const res = await client.execute("SELECT question_id, minute_topic_id, language, question_text FROM questions");
    const questions = res.rows;
    
    // Map of: minute_topic_id -> language -> cleanText -> [ids]
    const map = {};
    const duplicates = [];
    
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
        map[mtId][lang][clean].push(q);
    });
    
    for (const mtId in map) {
        for (const lang in map[mtId]) {
            for (const clean in map[mtId][lang]) {
                const list = map[mtId][lang][clean];
                if (list.length > 1) {
                    duplicates.push({
                        minute_topic_id: mtId,
                        language: lang,
                        text: list[0].question_text,
                        ids: list.map(x => x.question_id)
                    });
                }
            }
        }
    }
    
    return duplicates;
}

async function detectMainsDuplicates() {
    console.log("Fetching all Mains questions...");
    const res = await client.execute("SELECT mains_question_id, minute_topic_id, language, question_text FROM mains_questions");
    const questions = res.rows;
    
    const map = {};
    const duplicates = [];
    
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
        map[mtId][lang][clean].push(q);
    });
    
    for (const mtId in map) {
        for (const lang in map[mtId]) {
            for (const clean in map[mtId][lang]) {
                const list = map[mtId][lang][clean];
                if (list.length > 1) {
                    duplicates.push({
                        minute_topic_id: mtId,
                        language: lang,
                        text: list[0].question_text,
                        ids: list.map(x => x.mains_question_id)
                    });
                }
            }
        }
    }
    
    return duplicates;
}

async function main() {
    try {
        const mcqDups = await detectMCQDuplicates();
        console.log(`\nFound ${mcqDups.length} duplicate MCQ groups:`);
        mcqDups.forEach(d => {
            console.log(`- Subtopic ${d.minute_topic_id} (${d.language}): ids [${d.ids.join(', ')}]`);
            console.log(`  Text: "${d.text.substring(0, 80)}..."`);
        });
        
        const mainsDups = await detectMainsDuplicates();
        console.log(`\nFound ${mainsDups.length} duplicate Mains question groups:`);
        mainsDups.forEach(d => {
            console.log(`- Subtopic ${d.minute_topic_id} (${d.language}): ids [${d.ids.join(', ')}]`);
            console.log(`  Text: "${d.text.substring(0, 80)}..."`);
        });
    } catch(err) {
        console.error("Error detecting duplicates:", err.message);
    } finally {
        client.close();
    }
}

main();
