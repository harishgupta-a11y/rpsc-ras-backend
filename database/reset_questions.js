const db = require('./db.js');

async function reset() {
    try {
        console.log("Stopping foreign key checks...");
        await db.run("PRAGMA foreign_keys = OFF;");

        console.log("Clearing user quiz history...");
        await db.run("DELETE FROM user_quiz_history;");

        console.log("Clearing all custom questions...");
        await db.run("DELETE FROM questions;");

        console.log("Clearing all Mains questions...");
        await db.run("DELETE FROM mains_questions;");

        console.log("Clearing all subtopics (minute_topics)...");
        await db.run("DELETE FROM minute_topics;");

        try {
            await db.run("DELETE FROM sqlite_sequence WHERE name IN ('questions', 'mains_questions', 'minute_topics');");
        } catch (seqErr) {}

        console.log("Re-enabling foreign key checks...");
        await db.run("PRAGMA foreign_keys = ON;");

        console.log("Database cleared successfully!");
        
        // Re-run database seeding to restore default structures (without duplicating questions)
        console.log("Running default database seed check...");
        await db.initDatabase();

    } catch (err) {
        console.error("Reset error:", err.message);
    }
}

setTimeout(reset, 1000);
