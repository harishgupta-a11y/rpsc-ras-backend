const { createClient } = require('@libsql/client');

const client = createClient({
    url: "libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg"
});

async function main() {
    try {
        const res = await client.execute(`
            SELECT question_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language 
            FROM questions 
            WHERE question_text LIKE '%Paheba%' 
               OR question_text LIKE '%पाहेबा%'
               OR detailed_explanation LIKE '%Paheba%'
               OR detailed_explanation LIKE '%पाहेबा%'
        `);
        console.log(`Found ${res.rows.length} total matches:`);
        res.rows.forEach(r => {
            console.log(`\n========================================`);
            console.log(`ID: ${r.question_id} | Lang: ${r.language} | Correct: ${r.correct_option}`);
            console.log("Q:", r.question_text);
            console.log("A:", r.option_a);
            console.log("B:", r.option_b);
            console.log("C:", r.option_c);
            console.log("D:", r.option_d);
            console.log("Exp:", r.detailed_explanation);
        });
    } catch(e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
main();
