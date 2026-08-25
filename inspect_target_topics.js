const { createClient } = require('@libsql/client');

const url = 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg';

const client = createClient({ url, authToken: token });

async function main() {
    try {
        console.log("Checking subtopic IDs of 2117, 2119, 2125, 2127 in mains_questions...");
        
        const targets = [2117, 2118, 2119, 2120, 2125, 2126, 2127, 2128];
        for (const tid of targets) {
            const res = await client.execute({
                sql: "SELECT mains_question_id, question_text, language FROM mains_questions WHERE minute_topic_id = ? LIMIT 3",
                args: [tid]
            });
            console.log(`Subtopic ID: ${tid} | Found: ${res.rows.length} questions`);
            res.rows.forEach(row => {
                console.log(`  - [${row.language}] "${row.question_text}"`);
            });
        }
    } catch(err) {
        console.error("Error:", err.message);
    } finally {
        client.close();
    }
}

main();
