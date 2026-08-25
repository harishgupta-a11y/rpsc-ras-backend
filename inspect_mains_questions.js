const { createClient } = require('@libsql/client');

const url = 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg';

const client = createClient({ url, authToken: token });

async function main() {
    try {
        console.log("Fetching a sample of Mains questions...");
        const res = await client.execute("SELECT mains_question_id, topic_id, minute_topic_id, question_text, language, word_limit FROM mains_questions LIMIT 15");
        res.rows.forEach(row => {
            console.log(`ID: ${row.mains_question_id} | Subtopic: ${row.minute_topic_id} | Lang: ${row.language} | WordLimit: ${row.word_limit}`);
            console.log(`Text: "${row.question_text}"`);
            console.log("-".repeat(40));
        });
    } catch(err) {
        console.error("Error:", err.message);
    } finally {
        client.close();
    }
}

main();
