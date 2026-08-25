const Database = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const dbPath = 'C:\\\\Users\\\\aNKIT\\\\.gemini\\\\antigravity\\\\scratch\\\\rpsc-ras-app\\\\backend\\\\database\\\\rpsc_ras.db';
const client = Database.createClient({ url: `file:${dbPath}` });

async function clear() {
  console.log("Wiping all tables...");
  await client.execute("DELETE FROM user_quiz_history;");
  await client.execute("DELETE FROM questions;");
  await client.execute("DELETE FROM mains_questions;");
  await client.execute("DELETE FROM pyq_questions;");
  try {
      await client.execute("DELETE FROM sqlite_sequence WHERE name IN ('questions', 'mains_questions', 'pyq_questions');");
  } catch (e) {
      console.log("No sequence reset needed.");
  }
  
  // Write flag
  const flagPath = 'C:\\\\Users\\\\aNKIT\\\\.gemini\\\\antigravity\\\\scratch\\\\rpsc-ras-app\\\\backend\\\\database\\\\placeholder_seeded.flag';
  fs.writeFileSync(flagPath, 'true', 'utf8');
  console.log("Database successfully cleaned and flag written!");
}

clear().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
