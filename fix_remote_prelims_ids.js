const { createClient } = require('@libsql/client');

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

const subtopics = [2117, 2119, 2125, 2127, 2135, 2139, 2141, 2145, 2147, 2157, 2163, 2165];

async function main() {
    try {
        console.log("Fixing remote questions table (moving Hindi questions to minute_topic_id + 1)...");
        let totalUpdated = 0;
        
        for (const id of subtopics) {
            const res = await client.execute({
                sql: "UPDATE questions SET minute_topic_id = ? WHERE minute_topic_id = ? AND language = 'HI'",
                args: [id + 1, id]
            });
            console.log(`  Mapped Hindi questions for subtopic ${id} -> ${id + 1}. Rows affected: ${res.rowsAffected}`);
            totalUpdated += res.rowsAffected;
        }

        console.log(`Total questions rows updated: ${totalUpdated}`);

        console.log("\nRunning Verification - Counting questions grouped by minute_topic_id and language...");
        const verifyRes = await client.execute(`
            SELECT minute_topic_id, language, COUNT(*) as cnt 
            FROM questions 
            WHERE minute_topic_id IN (2117, 2118, 2119, 2120, 2125, 2126, 2127, 2128, 2135, 2136, 2139, 2140, 2141, 2142, 2145, 2146, 2147, 2148, 2157, 2158, 2163, 2164, 2165, 2166) 
            GROUP BY minute_topic_id, language
            ORDER BY minute_topic_id
        `);
        console.log("Verification results:", verifyRes.rows);

    } catch (err) {
        console.error("Error fixing remote questions:", err);
    } finally {
        await client.close();
    }
}

main();
