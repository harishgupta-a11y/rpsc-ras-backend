const { createClient } = require('@libsql/client');

const client = createClient({
    url: "libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg"
});

async function main() {
    try {
        const ids = [5755, 5765, 5775, 5783];
        const res = await client.execute({
            sql: `SELECT question_id, question_text, detailed_explanation, language FROM questions WHERE question_id IN (${ids.join(',')})`,
            args: []
        });
        res.rows.forEach(r => {
            console.log(`\n========================================`);
            console.log(`ID: ${r.question_id} | Lang: ${r.language}`);
            console.log("Q:", r.question_text);
            console.log("Exp:", r.detailed_explanation);
        });
    } catch(e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
main();
