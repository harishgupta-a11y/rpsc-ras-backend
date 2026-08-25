const { createClient } = require('@libsql/client');

const client = createClient({
    url: "libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg"
});

async function main() {
    try {
        const res = await client.execute(`
            SELECT mains_question_id, question_text, language 
            FROM mains_questions
        `);
        console.log(`Total mains questions: ${res.rows.length}`);
        
        let missingCount = 0;
        res.rows.forEach(r => {
            const hasMarks = r.question_text.includes('Marks') || r.question_text.includes('अंक');
            const hasWords = r.question_text.includes('Word') || r.question_text.includes('शब्द');
            if (!hasMarks || !hasWords) {
                missingCount++;
                if (missingCount <= 10) {
                    console.log(`ID: ${r.mains_question_id} | Lang: ${r.language}`);
                    console.log("Q:", r.question_text);
                    console.log("-----------------------------------------");
                }
            }
        });
        console.log(`Total questions missing marks/words limits: ${missingCount}`);
    } catch(e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
main();
