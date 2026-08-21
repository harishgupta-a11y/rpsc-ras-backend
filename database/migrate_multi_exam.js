/**
 * migrate_multi_exam.js
 * Database migration script to support multiple civil services exams.
 */
const { createClient } = require('@libsql/client');
const path = require('path');

const DB_FILE = path.join(__dirname, 'rpsc_ras.db');
const dbUrl = process.env.TURSO_DATABASE_URL || `file:${DB_FILE}`;
const dbToken = process.env.TURSO_AUTH_TOKEN || '';

console.log(`[Migration] Connecting to database at: ${dbUrl.startsWith('file:') ? 'Local file' : dbUrl}`);

const client = createClient({
    url: dbUrl,
    authToken: dbToken
});

async function runQuery(sql, params = []) {
    return client.execute({ sql, args: params });
}

async function migrate() {
    try {
        console.log("[Migration] Starting multi-exam database schema changes...");

        // 1. Create exams table
        await runQuery(`
            CREATE TABLE IF NOT EXISTS exams (
                exam_id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_code TEXT UNIQUE NOT NULL,
                exam_name TEXT NOT NULL,
                exam_name_hi TEXT NOT NULL,
                theme_primary TEXT NOT NULL,
                theme_secondary TEXT NOT NULL
            );
        `);
        console.log("[Migration] Verified 'exams' table exists.");

        // 2. Add exam_code column to subjects
        try {
            await runQuery("ALTER TABLE subjects ADD COLUMN exam_code TEXT DEFAULT 'RPSC';");
            console.log("[Migration] Added 'exam_code' column to 'subjects' table.");
        } catch (e) {
            console.log("[Migration] 'exam_code' column in 'subjects' already exists or could not be added.");
        }

        // 3. Add exam_code column to pyq_exams
        try {
            await runQuery("ALTER TABLE pyq_exams ADD COLUMN exam_code TEXT DEFAULT 'RPSC';");
            console.log("[Migration] Added 'exam_code' column to 'pyq_exams' table.");
        } catch (e) {
            console.log("[Migration] 'exam_code' column in 'pyq_exams' already exists or could not be added.");
        }

        // 4. Add exam_code column to test_series_exams
        try {
            await runQuery("ALTER TABLE test_series_exams ADD COLUMN exam_code TEXT DEFAULT 'RPSC';");
            console.log("[Migration] Added 'exam_code' column to 'test_series_exams' table.");
        } catch (e) {
            console.log("[Migration] 'exam_code' column in 'test_series_exams' already exists or could not be added.");
        }

        // 5. Seed default civil service exams
        const defaultExams = [
            { code: 'UPSC', name: 'Union Public Service Commission (CSE)', nameHi: 'संघ लोक सेवा आयोग (UPSC)', primary: '#1E3A8A', secondary: '#3B82F6' },
            { code: 'RPSC', name: 'Rajasthan Administrative Services (RAS)', nameHi: 'राजस्थान प्रशासनिक सेवा (RPSC RAS)', primary: '#0F172A', secondary: '#0EA5E9' },
            { code: 'BPSC', name: 'Bihar Public Service Commission (PCS)', nameHi: 'बिहार लोक सेवा आयोग (BPSC)', primary: '#7F1D1D', secondary: '#DC2626' },
            { code: 'UPPSC', name: 'Uttar Pradesh Public Service Commission (PCS)', nameHi: 'उत्तर प्रदेश लोक सेवा आयोग (UPPSC)', primary: '#7C2D12', secondary: '#F97316' },
            { code: 'MPSC', name: 'Maharashtra Public Service Commission (PCS)', nameHi: 'महाराष्ट्र लोक सेवा आयोग (MPSC)', primary: '#EA580C', secondary: '#F97316' },
            { code: 'MPPSC', name: 'Madhya Pradesh Public Service Commission (PCS)', nameHi: 'मध्य प्रदेश लोक सेवा आयोग (MPPSC)', primary: '#581C87', secondary: '#A855F7' },
            { code: 'TNPSC', name: 'Tamil Nadu Public Service Commission (PCS)', nameHi: 'तमिलनाडु लोक सेवा आयोग (TNPSC)', primary: '#047857', secondary: '#10B981' },
            { code: 'KPSC', name: 'Karnataka Public Service Commission (PCS)', nameHi: 'कर्नाटक लोक सेवा आयोग (KPSC)', primary: '#B91C1C', secondary: '#FBBF24' },
            { code: 'WBCS', name: 'West Bengal Civil Service', nameHi: 'पश्चिम बंगाल सिविल सेवा (WBCS)', primary: '#0369A1', secondary: '#06B6D4' },
            { code: 'APPSC', name: 'Andhra Pradesh Public Service Commission', nameHi: 'आंध्र प्रदेश लोक सेवा आयोग (APPSC)', primary: '#15803D', secondary: '#22C55E' }
        ];

        for (const exam of defaultExams) {
            try {
                await runQuery(`
                    INSERT INTO exams (exam_code, exam_name, exam_name_hi, theme_primary, theme_secondary)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(exam_code) DO UPDATE SET
                        exam_name = excluded.exam_name,
                        exam_name_hi = excluded.exam_name_hi,
                        theme_primary = excluded.theme_primary,
                        theme_secondary = excluded.theme_secondary
                `, [exam.code, exam.name, exam.nameHi, exam.primary, exam.secondary]);
            } catch (err) {
                console.error(`[Migration] Failed to seed/update exam ${exam.code}:`, err.message);
            }
        }
        
        console.log("[Migration] Successfully seeded default exams.");

        // 6. Ensure existing data is marked as RPSC if it was NULL or empty
        await runQuery("UPDATE subjects SET exam_code = 'RPSC' WHERE exam_code IS NULL OR exam_code = '';");
        await runQuery("UPDATE pyq_exams SET exam_code = 'RPSC' WHERE exam_code IS NULL OR exam_code = '';");
        await runQuery("UPDATE test_series_exams SET exam_code = 'RPSC' WHERE exam_code IS NULL OR exam_code = '';");
        
        console.log("[Migration] Migration completed successfully!");
    } catch (err) {
        console.error("[Migration] Migration failed with error:", err.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    migrate().then(() => process.exit(0));
}

module.exports = migrate;
