const { createClient } = require('@libsql/client');

const client = createClient({
    url: "libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg"
});

async function main() {
    try {
        const res = await client.execute("SELECT model_answer FROM mains_questions WHERE word_limit = 150 AND language = 'EN' LIMIT 3");
        const answer = res.rows[2].model_answer;
        console.log("=== ORIGINAL ANSWER ===");
        console.log(JSON.stringify(answer));
        
        console.log("\n=== REGEX MATCHES ===");
        const labelRegex = /(?:^|\n)[\s*-]*\*?\*?(?:Introduction|Body|Conclusion|Academic Impact|प्रस्तावना|निष्कर्ष|भूमिका|मुख्य भाग)\*?\*?:\s*/gi;
        const cleanAnswer = answer.replace(labelRegex, (match) => match.startsWith('\n') ? '\n' : '');
        console.log("CLEAN ANSWER:\n", cleanAnswer);
    } catch(e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
main();
