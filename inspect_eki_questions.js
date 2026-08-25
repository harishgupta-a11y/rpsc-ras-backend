const { createClient } = require('@libsql/client');

const client = createClient({
    url: "libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg"
});

async function main() {
    try {
        const res = await client.execute(`
            SELECT question_id, question_text, detailed_explanation, language 
            FROM questions 
            WHERE (question_text LIKE '%Chaura%' OR question_text LIKE '%चोरा%' OR question_text LIKE '%चौरा%'
               OR detailed_explanation LIKE '%Chaura%' OR detailed_explanation LIKE '%चोरा%' OR detailed_explanation LIKE '%चौरा%')
        `);
        console.log(`Found ${res.rows.length} Eki questions:`);
        res.rows.forEach(r => {
            console.log(`ID: ${r.question_id} | Lang: ${r.language}`);
            console.log("Q:", r.question_text);
            console.log("Exp:", r.detailed_explanation);
            console.log("-----------------------------------------");
        });
    } catch(e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
main();
