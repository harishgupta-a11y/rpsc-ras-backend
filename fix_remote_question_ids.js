const { createClient } = require('@libsql/client');

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
    try {
        console.log("Updating remote questions table...");
        const res1 = await client.execute(`
            UPDATE questions 
            SET minute_topic_id = minute_topic_id + 1 
            WHERE language = 'HI' 
              AND minute_topic_id >= 2117 
              AND minute_topic_id % 2 = 1
        `);
        console.log("Updated questions rows:", res1.rowsAffected);

        console.log("Updating remote mains_questions table...");
        const res2 = await client.execute(`
            UPDATE mains_questions 
            SET minute_topic_id = minute_topic_id + 1 
            WHERE language = 'HI' 
              AND minute_topic_id >= 2117 
              AND minute_topic_id % 2 = 1
        `);
        console.log("Updated mains_questions rows:", res2.rowsAffected);

        console.log("Verification checks...");
        const countRes = await client.execute(`
            SELECT minute_topic_id, language, COUNT(*) as cnt 
            FROM questions 
            WHERE minute_topic_id IN (2117, 2118, 2119, 2120) 
            GROUP BY minute_topic_id, language
        `);
        console.log("Questions counts grouped:", countRes.rows);

        const mainsCountRes = await client.execute(`
            SELECT minute_topic_id, language, COUNT(*) as cnt 
            FROM mains_questions 
            WHERE minute_topic_id IN (2117, 2118, 2119, 2120) 
            GROUP BY minute_topic_id, language
        `);
        console.log("Mains questions counts grouped:", mainsCountRes.rows);

    } catch (err) {
        console.error("Error fixing remote database IDs:", err);
    } finally {
        await client.close();
    }
}

main();
