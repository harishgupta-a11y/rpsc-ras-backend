const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg'
});

async function main() {
  const res = await client.execute("SELECT question_id, question_text FROM questions");
  console.log(`Total questions fetched: ${res.rows.length}`);

  // Regex to match the split pattern:
  // e.g. "Article\n\n368. Statement 2:" -> "Article 368.\n\nStatement 2:"
  // Group 1: The preceding word (e.g. Article)
  // Group 2: The article number/year (e.g. 368)
  // Group 3: The Statement/Reason/Assertion tag (e.g. Statement 2)
  const regex = /([A-Za-z0-9–\u0900-\u097F]+)\s*\r?\n\r?\n\s*(\d+)\.\s*(Statement\s*\d+|Reason\s*\(R\)|Assertion\s*\(A\)|Select|Question|कथन\s*\d+|कारण\s*\(R\)|कथन\s*\(A\)|प्रश्न)/gi;

  let fixedCount = 0;

  for (const row of res.rows) {
    const originalText = row.question_text;
    if (regex.test(originalText)) {
      // Perform the replacement
      const fixedText = originalText.replace(regex, (match, p1, p2, p3) => {
        return `${p1} ${p2}.\n\n${p3}`;
      });

      // Update in the database
      await client.execute({
        sql: "UPDATE questions SET question_text = ? WHERE question_id = ?",
        args: [fixedText, row.question_id]
      });

      console.log(`\n========================================`);
      console.log(`FIXED Question ID: ${row.question_id}`);
      console.log(`--- BEFORE ---`);
      console.log(originalText);
      console.log(`--- AFTER ---`);
      console.log(fixedText);
      
      fixedCount++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Successfully fixed ${fixedCount} questions in the database!`);
  console.log(`========================================`);

  client.close();
}

main().catch(e => {
  console.error("Error during DB fix:", e);
  client.close();
});
