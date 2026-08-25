const { createClient } = require('@libsql/client');

const client = createClient({
    url: "libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg"
});

async function main() {
    try {
        const res = await client.execute(`
            SELECT question_id, question_text, correct_option, detailed_explanation, language, minute_topic_id 
            FROM questions 
            WHERE minute_topic_id IN (2127, 2128)
        `);
        console.log(`Found ${res.rows.length} Rathore Dynasty questions.`);
        
        // Group by pairs (since English is 2127 and Hindi is 2128)
        // We can match them based on their relative index or text similarity. Let's print them grouped by English and Hindi pairs.
        const enQuestions = res.rows.filter(r => r.language === 'EN');
        const hiQuestions = res.rows.filter(r => r.language === 'HI');
        
        console.log(`English count: ${enQuestions.length}, Hindi count: ${hiQuestions.length}`);
        
        for (let i = 0; i < Math.max(enQuestions.length, hiQuestions.length); i++) {
            console.log(`\n================== PAIR ${i + 1} ==================`);
            if (enQuestions[i]) {
                console.log(`[EN - ID ${enQuestions[i].question_id}] Q: ${enQuestions[i].question_text}`);
                console.log(`  Correct: ${enQuestions[i].correct_option}`);
                console.log(`  Exp: ${enQuestions[i].detailed_explanation}`);
            }
            if (hiQuestions[i]) {
                console.log(`[HI - ID ${hiQuestions[i].question_id}] Q: ${hiQuestions[i].question_text}`);
                console.log(`  Correct: ${hiQuestions[i].correct_option}`);
                console.log(`  Exp: ${hiQuestions[i].detailed_explanation}`);
            }
        }
    } catch(e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
main();
