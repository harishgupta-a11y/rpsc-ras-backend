const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg'
});

async function main() {
  const schema = await client.execute('PRAGMA table_info(topics)');
  console.log('TOPICS COLUMNS:', schema.rows.map(r => r.name).join(', '));

  const t = await client.execute('SELECT * FROM topics WHERE unit_id=7 ORDER BY topic_id');
  console.log('\nTOPICS for unit_id=7 (Economics):');
  t.rows.forEach(r => console.log(' ', JSON.stringify(r)));

  const mx = await client.execute('SELECT MAX(minute_topic_id) as mx FROM minute_topics');
  console.log('\nMAX minute_topic_id:', mx.rows[0].mx);

  client.close();
}
main().catch(e => { console.error(e.message); client.close(); });
