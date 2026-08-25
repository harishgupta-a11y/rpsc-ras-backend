const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg'
});

async function main() {
  const res = await client.execute("SELECT question_id, question_text, language FROM questions WHERE question_text LIKE '%Reason (R)%' OR question_text LIKE '%कारण (R)%'");
  console.log(`Checking ${res.rows.length} questions for intro breaks...`);
  
  let fixedCount = 0;
  for (const row of res.rows) {
    const text = row.question_text;
    
    // Check if "Reason (R):" or "कारण (R):" was incorrectly split from the intro sentence
    // Pattern: "labeled as\n\nReason (R):" or "other as\n\nReason (R):" or "दूसरा को\n\nकारण (R):"
    const regexEN = /(labeled\s+as|other\s+as|other\s+labeled\s+as|other\s+is)\s*\r?\n\r?\n\s*(Reason\s*\(R\)\s*:)/gi;
    const regexHI = /(दूसरे\s+को|दूसरा\s+को|और)\s*\r?\n\r?\n\s*(कारण\s*\(R\)\s*:)/gi;
    
    let newText = text;
    if (regexEN.test(text)) {
      newText = text.replace(regexEN, '$1 $2');
    }
    if (regexHI.test(newText)) {
      newText = newText.replace(regexHI, '$1 $2');
    }
    
    if (newText !== text) {
      await client.execute({
        sql: "UPDATE questions SET question_text = ? WHERE question_id = ?",
        args: [newText, row.question_id]
      });
      console.log(`Fixed intro break for ID: ${row.question_id} (${row.language})`);
      fixedCount++;
    }
  }
  
  console.log(`Successfully fixed intro breaks for ${fixedCount} questions!`);
  client.close();
}

main().catch(e => {
  console.error(e);
  client.close();
});
