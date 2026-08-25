const { createClient } = require('@libsql/client');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database', 'rpsc_ras.db');
const dbUrl = process.env.TURSO_DATABASE_URL || `file:${DB_FILE}`;
const dbToken = process.env.TURSO_AUTH_TOKEN || '';

console.log(`Connecting to: ${dbUrl}`);

const client = createClient({
    url: dbUrl,
    authToken: dbToken
});

const subtopics = [
  // Topic 11
  1788, 1789, 1790, 1791, 1792, 1793,
  1796, 1797, 1798, 1799, 1800, 1801,
  // Topic 12
  1802, 1803, 1804, 1805, 1806, 1807, 1808, 1809, 1810, 1811,
  1812, 1813, 1814, 1815, 1816, 1817, 1818, 1819, 1820, 1821,
  // Topic 13
  1822, 1823, 1824, 1825, 1826, 1827, 1828, 1829,
  1830, 1831, 1832, 1833, 1834, 1835, 1836, 1837
];

async function main() {
    try {
        console.log("Deleting questions for custom history subtopics...");
        const res1 = await client.execute({
            sql: `DELETE FROM questions WHERE minute_topic_id IN (${subtopics.join(',')})`,
            args: []
        });
        console.log(`Deleted ${res1.rowsAffected || 0} Prelims MCQs.`);

        const res2 = await client.execute({
            sql: `DELETE FROM mains_questions WHERE minute_topic_id IN (${subtopics.join(',')})`,
            args: []
        });
        console.log(`Deleted ${res2.rowsAffected || 0} Mains descriptive questions.`);
        
        console.log("Database clean up complete.");
    } catch (e) {
        console.error("Clean up failed:", e.message);
    }
}

main();
