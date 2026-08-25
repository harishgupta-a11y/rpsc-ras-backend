const { createClient } = require('@libsql/client');

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

const mappings = [
    // English mappings
    { from: 2117, to: 2357 },
    { from: 2119, to: 2357 },
    { from: 2125, to: 2359 },
    { from: 2127, to: 2359 },
    { from: 2135, to: 2361 },
    { from: 2139, to: 2363 },
    { from: 2141, to: 2363 },
    { from: 2145, to: 2365 },
    { from: 2147, to: 2367 },
    { from: 2157, to: 2369 },
    { from: 2163, to: 2375 },
    { from: 2165, to: 2375 },

    // Hindi mappings
    { from: 2118, to: 2358 },
    { from: 2120, to: 2358 },
    { from: 2126, to: 2360 },
    { from: 2128, to: 2360 },
    { from: 2136, to: 2362 },
    { from: 2140, to: 2364 },
    { from: 2142, to: 2364 },
    { from: 2146, to: 2366 },
    { from: 2148, to: 2368 },
    { from: 2158, to: 2370 },
    { from: 2164, to: 2376 },
    { from: 2166, to: 2376 }
];

async function main() {
    try {
        console.log("Remapping mains_questions table in remote Turso DB...");
        let totalUpdated = 0;
        
        for (const mapping of mappings) {
            const res = await client.execute({
                sql: "UPDATE mains_questions SET topic_id = 101, minute_topic_id = ? WHERE minute_topic_id = ?",
                args: [mapping.to, mapping.from]
            });
            console.log(`  Mapped minute_topic_id ${mapping.from} -> ${mapping.to}. Rows affected: ${res.rowsAffected}`);
            totalUpdated += res.rowsAffected;
        }

        console.log(`Total mains_questions rows updated: ${totalUpdated}`);

        console.log("\nRunning Verification - Counting Mains questions for Topic 101 subtopics...");
        const verifyRes = await client.execute(`
            SELECT minute_topic_id, language, COUNT(*) as cnt 
            FROM mains_questions 
            WHERE topic_id = 101 
            GROUP BY minute_topic_id, language
            ORDER BY minute_topic_id
        `);
        console.log("Verification results:", verifyRes.rows);

    } catch (err) {
        console.error("Error remapping mains questions:", err);
    } finally {
        await client.close();
    }
}

main();
