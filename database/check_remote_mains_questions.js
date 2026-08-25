process.env.TURSO_DATABASE_URL = "libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io";
process.env.TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg";

const db = require('C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend\\database\\db');

async function run() {
  const counts = await db.all("SELECT word_limit, COUNT(*) as count FROM mains_questions GROUP BY word_limit");
  console.log("Remote mains_questions by word_limit:", counts);
}

run().catch(console.error);
