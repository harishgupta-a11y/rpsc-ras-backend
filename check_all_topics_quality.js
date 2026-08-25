const { createClient } = require('@libsql/client');

const client = createClient({
    url: "libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg"
});

async function main() {
    try {
        const subtopicIds = [2117, 2119, 2125, 2127, 2135, 2139, 2141, 2145, 2147, 2157, 2163, 2165];
        
        console.log("=== PRELIMS QUALITY REPORT ===");
        for (const mid of subtopicIds) {
            // Check count of questions for English (mid) and Hindi (mid + 1)
            const countRes = await client.execute({
                sql: `SELECT COUNT(*) as count, language FROM questions WHERE minute_topic_id IN (?, ?) GROUP BY language`,
                args: [mid, mid + 1]
            });
            let enCount = 0, hiCount = 0;
            countRes.rows.forEach(r => {
                if (r.language === 'EN') enCount = r.count;
                if (r.language === 'HI') hiCount = r.count;
            });
            
            // Check question type distribution for English (mid)
            // Classical: standard MCQ (single line or single question)
            // Statement: questions with "1.", "2.", "3.", "I.", "II.", "III." and options like "1 and 2 only"
            // Assertion: containing "Assertion" or "Assertion (A)" or "Reason (R)"
            // Match the column: containing "Match the" or "Column I" or a markdown table
            const questionsRes = await client.execute({
                sql: `SELECT question_text, detailed_explanation FROM questions WHERE minute_topic_id = ? AND language = 'EN'`,
                args: [mid]
            });
            
            let classical = 0, statement = 0, assertion = 0, match = 0;
            let notesRef = 0;
            
            questionsRes.rows.forEach(r => {
                const text = r.question_text || "";
                const exp = r.detailed_explanation || "";
                
                if (text.includes("According to the notes") || text.includes("According to the reference") || exp.includes("According to the notes") || exp.includes("According to the reference")) {
                    notesRef++;
                }
                
                if (text.includes("Assertion") || text.includes("Reason (R)")) {
                    assertion++;
                } else if (text.includes("Match the") || text.includes("Column I") || text.includes("|")) {
                    match++;
                } else if (/\b(?:1|2|3|I|II|III)\.\s/i.test(text) && (text.includes("only") || text.includes("correct"))) {
                    statement++;
                } else {
                    classical++;
                }
            });
            
            console.log(`Subtopic ${mid}: En: ${enCount} | Hi: ${hiCount} | MCQ Types: [Classical: ${classical}, Statement: ${statement}, Assertion: ${assertion}, Match: ${match}] | NotesRef: ${notesRef}`);
        }
        
    } catch(e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
main();
