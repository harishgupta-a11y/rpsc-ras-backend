const { createClient } = require('@libsql/client');

const url = 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg';

const client = createClient({ url, authToken: token });

async function main() {
    try {
        // 1. Get current topics for subject 6
        console.log("\n=== CURRENT TOPICS for Subject 6 ===");
        const topicsRes = await client.execute(`
            SELECT t.topic_id, t.topic_name, t.topic_name_hi
            FROM topics t
            JOIN units u ON t.unit_id = u.unit_id
            WHERE u.subject_id = 6
            ORDER BY t.topic_id
        `);
        topicsRes.rows.forEach(r => console.log(`topic_id=${r.topic_id}: ${r.topic_name}`));

        // 2. Check minute_topics schema first
        const schemaRes = await client.execute("PRAGMA table_info(minute_topics)");
        console.log("\n=== MINUTE_TOPICS SCHEMA ===");
        schemaRes.rows.forEach(r => console.log(`  col: ${r.name} (${r.type})`));

        // 3. Get minute_topics (subtopics) for each of these topics
        const topicIds = topicsRes.rows.map(r => r.topic_id);
        console.log("\n=== CURRENT MINUTE_TOPICS (Subtopics) ===");
        const mtRes = await client.execute(`
            SELECT * FROM minute_topics
            WHERE topic_id IN (${topicIds.join(',')})
            ORDER BY topic_id, minute_topic_id
        `);
        mtRes.rows.forEach(r => console.log(`  minute_topic_id=${r.minute_topic_id} [topic ${r.topic_id}]: ${JSON.stringify(r)}`.slice(0, 200)));


        // 3. Check if any questions are linked
        console.log("\n=== PRE QUESTIONS linked to these subtopics ===");
        if (mtRes.rows.length > 0) {
            const mtIds = mtRes.rows.map(r => r.minute_topic_id);
            const qRes = await client.execute(`
                SELECT minute_topic_id, COUNT(*) as cnt
                FROM questions
                WHERE minute_topic_id IN (${mtIds.join(',')})
                GROUP BY minute_topic_id
            `);
            qRes.rows.forEach(r => console.log(`  minute_topic_id=${r.minute_topic_id}: ${r.cnt} questions`));
        }

        // 4. Check mains questions
        console.log("\n=== MAINS QUESTIONS linked to these topics ===");
        const mqRes = await client.execute(`
            SELECT topic_id, COUNT(*) as cnt
            FROM mains_questions
            WHERE topic_id IN (${topicIds.join(',')})
            GROUP BY topic_id
        `);
        mqRes.rows.forEach(r => console.log(`  topic_id=${r.topic_id}: ${r.cnt} mains questions`));

        // 5. Check revision notes
        console.log("\n=== REVISION NOTES linked to these minute_topics ===");
        if (mtRes.rows.length > 0) {
            const mtIds = mtRes.rows.map(r => r.minute_topic_id);
            const notesRes = await client.execute(`
                SELECT minute_topic_id, COUNT(*) as cnt
                FROM revision_notes
                WHERE minute_topic_id IN (${mtIds.join(',')})
                GROUP BY minute_topic_id
            `);
            notesRes.rows.forEach(r => console.log(`  minute_topic_id=${r.minute_topic_id}: ${r.cnt} revision notes`));
        }

        // 6. Get max IDs to know where to start new entries
        const maxTopicRes = await client.execute('SELECT MAX(topic_id) as max_id FROM topics');
        const maxMtRes = await client.execute('SELECT MAX(minute_topic_id) as max_id FROM minute_topics');
        console.log(`\n=== MAX IDs ===`);
        console.log(`Max topic_id: ${maxTopicRes.rows[0].max_id}`);
        console.log(`Max minute_topic_id: ${maxMtRes.rows[0].max_id}`);

        // 7. Get unit_id for subject 6
        const unitRes = await client.execute('SELECT unit_id FROM units WHERE subject_id = 6');
        console.log(`Unit_id for subject 6: ${unitRes.rows[0].unit_id}`);

    } catch(err) {
        console.error("Error:", err.message);
    } finally {
        client.close();
    }
}

main();
