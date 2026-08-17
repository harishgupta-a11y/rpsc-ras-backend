const { createClient } = require('@libsql/client');

const client = createClient({
    url: "libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg"
});

async function runMigration() {
    console.log("Connecting to remote Turso database to run ALTER TABLE...");
    try {
        // Check current columns
        const info = await client.execute("PRAGMA table_info(pyq_questions)");
        const existingColumns = info.rows.map(r => r.name);
        
        if (!existingColumns.includes('topic_id')) {
            console.log("Adding topic_id column to pyq_questions...");
            await client.execute("ALTER TABLE pyq_questions ADD COLUMN topic_id INTEGER");
            console.log("Successfully added topic_id.");
        } else {
            console.log("topic_id column already exists.");
        }
        
        if (!existingColumns.includes('minute_topic_id')) {
            console.log("Adding minute_topic_id column to pyq_questions...");
            await client.execute("ALTER TABLE pyq_questions ADD COLUMN minute_topic_id INTEGER");
            console.log("Successfully added minute_topic_id.");
        } else {
            console.log("minute_topic_id column already exists.");
        }
        
        // Also check if pyq_exams has minute_topic_id (optional, useful for subtopic-only exam folders)
        const examInfo = await client.execute("PRAGMA table_info(pyq_exams)");
        const examColumns = examInfo.rows.map(r => r.name);
        if (!examColumns.includes('minute_topic_id')) {
            console.log("Adding minute_topic_id column to pyq_exams...");
            await client.execute("ALTER TABLE pyq_exams ADD COLUMN minute_topic_id INTEGER");
            console.log("Successfully added minute_topic_id to pyq_exams.");
        } else {
            console.log("minute_topic_id column already exists in pyq_exams.");
        }
        
        console.log("\nMigration completed successfully!");
    } catch (e) {
        console.error("Migration failed:", e.stack);
    } finally {
        client.close();
    }
}

runMigration();
