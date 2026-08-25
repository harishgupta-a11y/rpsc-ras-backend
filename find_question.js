const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg'
});

async function main() {
  // Let's search for the first question
  const res1 = await client.execute({
    sql: "SELECT question_id, question_text FROM questions WHERE question_text LIKE '%cannot be amended at all under Article%'",
    args: []
  });
  console.log("=== QUESTION 1 ===");
  res1.rows.forEach(r => {
    console.log("ID:", r.question_id);
    console.log("TEXT:\n" + r.question_text);
    console.log("-------------------");
  });

  // Let's search for the second question (October-November 1939)
  const res2 = await client.execute({
    sql: "SELECT question_id, question_text FROM questions WHERE question_text LIKE '%resigned en masse in October%'",
    args: []
  });
  console.log("=== QUESTION 2 ===");
  res2.rows.forEach(r => {
    console.log("ID:", r.question_id);
    console.log("TEXT:\n" + r.question_text);
    console.log("-------------------");
  });

  // Let's search for the third question (Forty-second Constitutional Amendment Act in 1976)
  const res3 = await client.execute({
    sql: "SELECT question_id, question_text FROM questions WHERE question_text LIKE '%amended by the Forty-second%'",
    args: []
  });
  console.log("=== QUESTION 3 ===");
  res3.rows.forEach(r => {
    console.log("ID:", r.question_id);
    console.log("TEXT:\n" + r.question_text);
    console.log("-------------------");
  });

  client.close();
}
main().catch(e => { console.error(e); client.close(); });
