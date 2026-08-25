const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg'
});

async function main() {
  const res = await client.execute("SELECT question_id, question_text, language FROM questions WHERE question_text LIKE '%कारण (R)%' OR question_text LIKE '%Reason (R)%'");
  console.log(`Checking ${res.rows.length} questions for Assertion-Reason spacing...`);
  
  let fixedCount = 0;
  for (const row of res.rows) {
    const text = row.question_text;
    let newText = text;
    
    // If there is only a single newline (or no newline, just space) before Reason (R) / कारण (R), replace with \n\n
    // Matches \n (single newline) or space followed by Reason (R) / कारण (R)
    // Avoid doubling if already has \n\n
    if (text.includes('Reason (R)') && !text.includes('\n\nReason (R)')) {
      newText = text.replace(/(?<!\n)\r?\n\s*Reason\s*\(R\)/gi, '\n\nReason (R)');
    }
    if (text.includes('कारण (R)') && !text.includes('\n\nकारण (R)')) {
      newText = text.replace(/(?<!\n)\r?\n\s*कारण\s*\(R\)/gi, '\n\nकारण (R)');
    }
    
    if (newText !== text) {
      await client.execute({
        sql: "UPDATE questions SET question_text = ? WHERE question_id = ?",
        args: [newText, row.question_id]
      });
      console.log(`Fixed A-R spacing for ID: ${row.question_id} (${row.language})`);
      fixedCount++;
    }
  }
  
  console.log(`Successfully fixed A-R spacing for ${fixedCount} questions!`);
  client.close();
}

main().catch(e => {
  console.error(e);
  client.close();
});
