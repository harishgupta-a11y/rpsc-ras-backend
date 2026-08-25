const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg'
});

async function main() {
  const res = await client.execute("SELECT question_id, question_text FROM questions");
  console.log(`Total questions: ${res.rows.length}`);
  
  const matches = [];
  const regex = /\r?\n\s*(\d+)\.\s*(Statement|Reason|Assertion|Reason \(R\)|Assertion \(A\)|उत्तर|व्याख्या|कथन)/i;

  for (const row of res.rows) {
    const text = row.question_text;
    const m = text.match(regex);
    if (m) {
      matches.push({
        id: row.question_id,
        matched_line: m[0].trim(),
        text: text
      });
    }
  }

  console.log(`Found ${matches.length} questions matching the pattern:`);
  matches.forEach(m => {
    console.log(`ID: ${m.id} | Matched Line: "${m.matched_line}"`);
    console.log("-------------------");
    console.log(m.text);
    console.log("===================\n");
  });

  client.close();
}
main().catch(e => { console.error(e); client.close(); });
