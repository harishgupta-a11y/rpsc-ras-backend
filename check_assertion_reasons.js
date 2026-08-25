const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg'
});

async function main() {
  const res = await client.execute("SELECT question_id, question_text, language FROM questions WHERE question_text LIKE '%Assertion%' OR question_text LIKE '%Reason%' OR question_text LIKE '%कथन%' OR question_text LIKE '%कारण%'");
  console.log(`Total A-R candidate questions: ${res.rows.length}`);
  
  let sameLineCount = 0;
  for (const r of res.rows) {
    const text = r.question_text;
    // Check if Assertion and Reason are on the same paragraph or not separated by \n\n
    if (text.includes('Assertion (A)') && text.includes('Reason (R)') && !text.includes('\n\nReason (R)')) {
      sameLineCount++;
      console.log(`ID: ${r.question_id} (${r.language}) - Reason not split correctly:`);
      console.log(text);
      console.log('----------------------------------------');
    }
    if (text.includes('कथन (A)') && text.includes('कारण (R)') && !text.includes('\n\nकारण (R)')) {
      sameLineCount++;
      console.log(`ID: ${r.question_id} (${r.language}) - Reason (Hindi) not split correctly:`);
      console.log(text);
      console.log('----------------------------------------');
    }
  }
  console.log(`Total same-line A-R errors: ${sameLineCount}`);
  client.close();
}
main().catch(e => { console.error(e); client.close(); });
