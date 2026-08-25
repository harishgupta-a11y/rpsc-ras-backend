const { createClient } = require('@libsql/client');

const url = 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg';

const client = createClient({ url, authToken: token });

async function main() {
    try {
        console.log("Checking topics for subject 6...");
        const res = await client.execute("SELECT u.unit_id, t.topic_id, t.topic_name FROM units u JOIN topics t ON u.unit_id = t.unit_id WHERE u.subject_id = 6");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch(err) {
        console.error("Error:", err.message);
    } finally {
        client.close();
    }
}

main();
