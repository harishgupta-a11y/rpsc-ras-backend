// RPSC RAS Exam Prep SQLite/LibSQL Database Controller
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const DB_FILE = path.join(__dirname, 'rpsc_ras.db');
const dbUrl = process.env.TURSO_DATABASE_URL || `file:${DB_FILE}`;
const dbToken = process.env.TURSO_AUTH_TOKEN || '';

console.log(`Connecting to database at: ${dbUrl.startsWith('file:') ? 'Local file' : dbUrl}`);

const client = createClient({
    url: dbUrl,
    authToken: dbToken
});

// Helper to run query as a promise
async function run(sql, params = []) {
    // If it's a PRAGMA statement and we are on a remote Turso database, skip it
    if (sql.trim().toUpperCase().startsWith('PRAGMA') && !dbUrl.startsWith('file:')) {
        return { lastID: undefined, changes: 0 };
    }
    try {
        const res = await client.execute({ sql, args: params });
        return {
            lastID: res.lastInsertRowid ? Number(res.lastInsertRowid) : undefined,
            changes: res.rowsAffected
        };
    } catch (err) {
        throw err;
    }
}

// Helper to get single row
async function get(sql, params = []) {
    try {
        const res = await client.execute({ sql, args: params });
        return res.rows[0] || null;
    } catch (err) {
        throw err;
    }
}

// Helper to get all rows
async function all(sql, params = []) {
    try {
        const res = await client.execute({ sql, args: params });
        return res.rows;
    } catch (err) {
        throw err;
    }
}

// Initialize Database Tables
async function initDatabase() {
    try {
        // Enable foreign key constraints
        await run("PRAGMA foreign_keys = ON;");

        // 1. Users Table
        await run(`
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                mobile_number TEXT UNIQUE NOT NULL,
                expiry_timestamp INTEGER DEFAULT NULL,
                active_plan TEXT DEFAULT '24-Hour Free Trial'
            );
        `);

        // Migration: Alter table if active_plan doesn't exist
        try {
            await run("ALTER TABLE users ADD COLUMN active_plan TEXT DEFAULT '24-Hour Free Trial';");
        } catch (e) {
            // Column already exists
        }

        // 2. User Quiz History Table
        await run(`
            CREATE TABLE IF NOT EXISTS user_quiz_history (
                user_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                attempted_timestamp INTEGER NOT NULL,
                PRIMARY KEY (user_id, question_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
        `);

        // 3. Subjects Table
        await run(`
            CREATE TABLE IF NOT EXISTS subjects (
                subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
                tier_type TEXT CHECK(tier_type IN ('PRE', 'MAINS')) NOT NULL,
                subject_name TEXT NOT NULL
            );
        `);

        // 4. Units Table
        await run(`
            CREATE TABLE IF NOT EXISTS units (
                unit_id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject_id INTEGER NOT NULL,
                unit_name TEXT NOT NULL,
                FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
            );
        `);

        // 5. Topics Table
        await run(`
            CREATE TABLE IF NOT EXISTS topics (
                topic_id INTEGER PRIMARY KEY AUTOINCREMENT,
                unit_id INTEGER NOT NULL,
                topic_name TEXT NOT NULL,
                FOREIGN KEY (unit_id) REFERENCES units(unit_id) ON DELETE CASCADE
            );
        `);

        // 6. Question Bank Table
        await run(`
            CREATE TABLE IF NOT EXISTS questions (
                question_id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                option_a TEXT NOT NULL,
                option_b TEXT NOT NULL,
                option_c TEXT NOT NULL,
                option_d TEXT NOT NULL,
                correct_option TEXT CHECK(correct_option IN ('A', 'B', 'C', 'D')) NOT NULL,
                detailed_explanation TEXT NOT NULL,
                FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE CASCADE
            );
        `);
        // 7. Minute Topics Table
        await run(`
            CREATE TABLE IF NOT EXISTS minute_topics (
                minute_topic_id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic_id INTEGER NOT NULL,
                minute_topic_name TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'EN',
                FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE CASCADE
            );
        `);

        // 8. PYQ Exams Table
        await run(`
            CREATE TABLE IF NOT EXISTS pyq_exams (
                exam_id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_name TEXT NOT NULL,
                exam_year INTEGER NOT NULL
            );
        `);

        // 9. PYQ Questions Table
        await run(`
            CREATE TABLE IF NOT EXISTS pyq_questions (
                pyq_question_id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                option_a TEXT NOT NULL,
                option_b TEXT NOT NULL,
                option_c TEXT NOT NULL,
                option_d TEXT NOT NULL,
                correct_option TEXT CHECK(correct_option IN ('A', 'B', 'C', 'D')) NOT NULL,
                detailed_explanation TEXT NOT NULL,
                language TEXT DEFAULT 'EN' CHECK(language IN ('EN', 'HI')),
                sequence_order INTEGER NOT NULL,
                FOREIGN KEY (exam_id) REFERENCES pyq_exams(exam_id) ON DELETE CASCADE
            );
        `);

        // 10. Support Queries Table
        await run(`
            CREATE TABLE IF NOT EXISTS support_queries (
                query_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                query_text TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
        `);

        // 11. Mains Questions Table
        await run(`
            CREATE TABLE IF NOT EXISTS mains_questions (
                mains_question_id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                model_answer TEXT NOT NULL,
                language TEXT DEFAULT 'EN' CHECK(language IN ('EN', 'HI')),
                sequence_order INTEGER NOT NULL,
                FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE CASCADE
            );
        `);

        // 12. App Settings Table
        await run(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);

        // Migrations: Add columns if not present
        try {
            await run("ALTER TABLE questions ADD COLUMN minute_topic_id INTEGER DEFAULT NULL;");
        } catch (e) {
            // Ignore if column already exists
        }
        try {
            await run("ALTER TABLE questions ADD COLUMN language TEXT DEFAULT 'EN';");
        } catch (e) {
            // Ignore if column already exists
        }
        try {
            await run("ALTER TABLE users ADD COLUMN has_used_trial INTEGER DEFAULT 0;");
        } catch (e) {
            // Ignore if column already exists
        }
        try {
            await run("ALTER TABLE mains_questions ADD COLUMN minute_topic_id INTEGER DEFAULT NULL;");
        } catch (e) {
            // Ignore if column already exists
        }
        try {
            await run("ALTER TABLE mains_questions ADD COLUMN exam_id INTEGER DEFAULT NULL;");
        } catch (e) {
            // Ignore if column already exists
        }
        try {
            await run("ALTER TABLE pyq_exams ADD COLUMN tier_type TEXT CHECK(tier_type IN ('PRE', 'MAINS')) NOT NULL DEFAULT 'PRE';");
        } catch (e) {
            // Ignore if column already exists
        }
        try {
            await run("ALTER TABLE minute_topics ADD COLUMN language TEXT NOT NULL DEFAULT 'EN';");
        } catch (e) {
            // Ignore if column already exists
        }

        // Migration: Reset minute topics for topics 11, 12, 13, and 102 to use new clean RPSC syllabus subtopics
        try {
            await run("DELETE FROM minute_topics WHERE topic_id IN (11, 12, 13, 102);");
        } catch (e) {
            console.error("Failed to clear old sub-topics:", e);
        }
        // Migration: Update parent topics 11, 12, 13 to match new syllabus text
        try {
            await run("UPDATE topics SET topic_name = 'Cultural Foundations of India - Indus & Vedic Age; Religious ideas of 6th Century BC (Ajivakas, Buddhism & Jainism)' WHERE topic_id = 11");
            await run("UPDATE topics SET topic_name = 'Achievements of prominent rulers of major dynasties: Maurya, Kushan, Satavahan, Gupta, Chalukya, Pallava and Chola' WHERE topic_id = 12");
            await run("UPDATE topics SET topic_name = 'Art, Architecture, Scientific Development & Indian Knowledge/Value System in Ancient India' WHERE topic_id = 13");
        } catch (e) {
            console.error("Failed to migrate parent topic names:", e);
        }
        console.log("All SQLite tables verified successfully.");

        // Seed default PYQ Exams if none exist or if we need to update to 22 exams
        const pyqExamsCount = await get("SELECT COUNT(*) as count FROM pyq_exams");
        if (pyqExamsCount.count < 22) {
            await run("DELETE FROM pyq_questions;");
            await run("DELETE FROM pyq_exams;");
            try {
                await run("DELETE FROM sqlite_sequence WHERE name IN ('pyq_exams', 'pyq_questions');");
            } catch (seqErr) {}

            const preYears = [2023, 2021, 2018, 2016, 2013, 2012, 2010, 2008, 2007, 2003, 2000];
            for (const year of preYears) {
                await run("INSERT INTO pyq_exams (exam_name, exam_year, tier_type) VALUES (?, ?, 'PRE')", [`RPSC RAS Prelims ${year}`, year]);
            }

            const mainsYears = [2023, 2021, 2018, 2016, 2013, 2012, 2010, 2008, 2007, 2003, 2000];
            for (const year of mainsYears) {
                await run("INSERT INTO pyq_exams (exam_name, exam_year, tier_type) VALUES (?, ?, 'MAINS')", [`RPSC RAS Mains ${year}`, year]);
            }
            console.log("Seeded 22 default PYQ Exams (11 Pre and 11 Mains).");
        }

        // Seed default test user 9876543210 with active subscription
        const testUser = await get("SELECT * FROM users WHERE mobile_number = '9876543210'");
        if (!testUser) {
            await run("INSERT INTO users (mobile_number, expiry_timestamp) VALUES ('9876543210', ?)", [Date.now() + 365 * 24 * 60 * 60 * 1000]);
            console.log("Seeded default test user 9876543210 with active subscription.");
        }

        // Check if database needs seeding or migration
        const topicCount = await get("SELECT COUNT(*) as count FROM topics");
        if (topicCount.count < 80) {
            console.log("Database has outdated syllabus (count < 30). Re-seeding...");
            // Truncate tables and reset sequences safely
            await run("DELETE FROM user_quiz_history;");
            await run("DELETE FROM questions;");
            await run("DELETE FROM topics;");
            await run("DELETE FROM units;");
            await run("DELETE FROM subjects;");
            try {
                await run("DELETE FROM sqlite_sequence WHERE name IN ('subjects', 'units', 'topics', 'questions');");
            } catch (seqErr) {
                // Ignore if sqlite_sequence doesn't exist
            }
            await seedSyllabusAndSampleQuestions();
        }

        // Seed Sub-topics for Ancient Indian History in Pre (Topic 11, 12, 13) and Mains (Topic 102)
        const subtopicSeeds = [
            // Pre Topic 11 (EN) - Cultural Foundations (Indus, Vedic, 6th Century BC Ideas)
            { topic_id: 11, name: 'Indus Valley Civilisation (IVC): Town Planning & Seals', lang: 'EN' },
            { topic_id: 11, name: 'Indus Valley Civilisation (IVC): Sites, Discoveries & Trade', lang: 'EN' },
            { topic_id: 11, name: 'Rigvedic Period: Polity, Assemblies (Sabha & Samiti) & Society', lang: 'EN' },
            { topic_id: 11, name: 'Later Vedic Period: Literature, Varna & Rituals', lang: 'EN' },
            { topic_id: 11, name: 'Rise of Jainism: Teachings of Mahavira & Jain Philosophy', lang: 'EN' },
            { topic_id: 11, name: 'Rise of Buddhism: Teachings of Buddha & Buddhist Philosophy', lang: 'EN' },
            { topic_id: 11, name: 'Buddhist Councils & Sects (Hinayana & Mahayana)', lang: 'EN' },
            { topic_id: 11, name: 'Ajivakas and other Heterodox Sects of 6th Century BC', lang: 'EN' },
            // Pre Topic 11 (HI)
            { topic_id: 11, name: 'सिंधु घाटी सभ्यता: नगर नियोजन और मुहरें', lang: 'HI' },
            { topic_id: 11, name: 'सिंधु घाटी सभ्यता: स्थल, खोजें और व्यापार', lang: 'HI' },
            { topic_id: 11, name: 'ऋग्वैदिक काल: राजनीति, सभाएं (सभा और समिति) और समाज', lang: 'HI' },
            { topic_id: 11, name: 'उत्तर वैदिक काल: साहित्य, वर्ण और अनुष्ठान', lang: 'HI' },
            { topic_id: 11, name: 'जैन धर्म का उदय: महावीर की शिक्षाएं और जैन दर्शन', lang: 'HI' },
            { topic_id: 11, name: 'बौद्ध धर्म का उदय: बुद्ध की शिक्षाएं और बौद्ध दर्शन', lang: 'HI' },
            { topic_id: 11, name: 'बौद्ध संगीतियां और संप्रदाय (हीनयान और महायान)', lang: 'HI' },
            { topic_id: 11, name: '6वीं शताब्दी ईसा पूर्व के आजीवक और अन्य नास्तिक संप्रदाय', lang: 'HI' },

            // Pre Topic 12 (EN) - Prominent Dynasties & Ruler Achievements
            { topic_id: 12, name: 'Maurya Dynasty: Chandragupta Maurya & Bindusara', lang: 'EN' },
            { topic_id: 12, name: 'Maurya Dynasty: Ashoka the Great & Dhamma Policy', lang: 'EN' },
            { topic_id: 12, name: 'Ashokan Edicts & Rock Inscriptions (Bhabru Edict)', lang: 'EN' },
            { topic_id: 12, name: 'Kushan Dynasty: Rulers & Achievements of Kanishka', lang: 'EN' },
            { topic_id: 12, name: 'Satavahan Dynasty: Rulers, Land Grants & Maternal Titles', lang: 'EN' },
            { topic_id: 12, name: 'Gupta Dynasty: Achievements of Samudragupta & Allahabad Prasasti', lang: 'EN' },
            { topic_id: 12, name: 'Gupta Dynasty: Chandragupta II & Cultural Achievements', lang: 'EN' },
            { topic_id: 12, name: 'Chalukyas of Badami: Pulakeshin II & Achievements', lang: 'EN' },
            { topic_id: 12, name: 'Pallavas of Kanchi: Rulers & Rock-cut Monuments', lang: 'EN' },
            { topic_id: 12, name: 'Chola Dynasty: Rulers, Navy & Local Self-Government', lang: 'EN' },
            // Pre Topic 12 (HI)
            { topic_id: 12, name: 'मौर्य राजवंश: चंद्रगुप्त मौर्य और बिंदुसार', lang: 'HI' },
            { topic_id: 12, name: 'मौर्य राजवंश: महान अशोक और धम्म नीति', lang: 'HI' },
            { topic_id: 12, name: 'अशोक के शिलालेख और स्तंभ लेख (भाब्रू शिलालेख)', lang: 'HI' },
            { topic_id: 12, name: 'कुषाण राजवंश: शासक और कनिष्क की उपलब्धियां', lang: 'HI' },
            { topic_id: 12, name: 'सातवाहन राजवंश: शासक, भूमि दान और मातृ नाम', lang: 'HI' },
            { topic_id: 12, name: 'गुप्त राजवंश: समुद्रगुप्त की उपलब्धियां और इलाहाबाद प्रशस्ति', lang: 'HI' },
            { topic_id: 12, name: 'गुप्त राजवंश: चंद्रगुप्त द्वितीय और सांस्कृतिक उपलब्धियां', lang: 'HI' },
            { topic_id: 12, name: 'बादामी के चालुक्य: पुलकेशिन द्वितीय और उपलब्धियां', lang: 'HI' },
            { topic_id: 12, name: 'कांची के पल्लव: शासक और रॉक-कट स्मारक', lang: 'HI' },
            { topic_id: 12, name: 'चोल राजवंश: शासक, नौसेना और स्थानीय स्वशासन', lang: 'HI' },

            // Pre Topic 13 (EN) - Art, Science & Value Systems
            { topic_id: 13, name: 'Ancient Temple Architecture (Nagara, Dravida, Vesara)', lang: 'EN' },
            { topic_id: 13, name: 'Ancient Rock-cut Caves, Stupas & Paintings (Ajanta & Ellora)', lang: 'EN' },
            { topic_id: 13, name: 'Scientific Development in Ancient India (Mathematics, Astronomy, Medicine)', lang: 'EN' },
            { topic_id: 13, name: 'Varna & Ashram Systems (Four Life Stages)', lang: 'EN' },
            { topic_id: 13, name: 'Purushartha System (Dharma, Artha, Kama, Moksha)', lang: 'EN' },
            { topic_id: 13, name: 'Sanskara System (16 Rites of Passage)', lang: 'EN' },
            { topic_id: 13, name: 'Six Systems of Indian Philosophy (Shad-Darshana)', lang: 'EN' },
            { topic_id: 13, name: 'Ancient Education System: Universities (Takshashila, Nalanda, Valabhi)', lang: 'EN' },
            // Pre Topic 13 (HI)
            { topic_id: 13, name: 'प्राचीन मंदिर वास्तुकला (नागर, द्रविड़, वेसर)', lang: 'HI' },
            { topic_id: 13, name: 'प्राचीन गुफाएं, स्तूप और चित्रकला (अजंता और एलोरा)', lang: 'HI' },
            { topic_id: 13, name: 'प्राचीन भारत में वैज्ञानिक विकास (गणित, खगोल विज्ञान, चिकित्सा)', lang: 'HI' },
            { topic_id: 13, name: 'वर्ण और आश्रम प्रणालियां (जीवन के चार चरण)', lang: 'HI' },
            { topic_id: 13, name: 'पुरुषार्थ प्रणाली (धर्म, अर्थ, काम, मोक्ष)', lang: 'HI' },
            { topic_id: 13, name: 'संस्कार प्रणाली (16 संस्कार)', lang: 'HI' },
            { topic_id: 13, name: 'भारतीय दर्शन की छह प्रणालियां (षड्दर्शन)', lang: 'HI' },
            { topic_id: 13, name: 'प्राचीन शिक्षा प्रणाली: विश्वविद्यालय (तक्षशिला, नालंदा, वल्लभी)', lang: 'HI' },

            // Mains Topic 102 (EN) - Complete Ancient History
            { topic_id: 102, name: 'Indus Valley Civilisation (IVC): Town Planning & Seals', lang: 'EN' },
            { topic_id: 102, name: 'Indus Valley Civilisation (IVC): Sites, Discoveries & Trade', lang: 'EN' },
            { topic_id: 102, name: 'Rigvedic Period: Polity, Assemblies (Sabha & Samiti) & Society', lang: 'EN' },
            { topic_id: 102, name: 'Later Vedic Period: Literature, Varna & Rituals', lang: 'EN' },
            { topic_id: 102, name: 'Rise of Jainism: Teachings of Mahavira & Jain Philosophy', lang: 'EN' },
            { topic_id: 102, name: 'Rise of Buddhism: Teachings of Buddha & Buddhist Philosophy', lang: 'EN' },
            { topic_id: 102, name: 'Buddhist Councils & Sects (Hinayana & Mahayana)', lang: 'EN' },
            { topic_id: 102, name: 'Ajivakas and other Heterodox Sects of 6th Century BC', lang: 'EN' },
            { topic_id: 102, name: 'Maurya Dynasty: Chandragupta Maurya & Bindusara', lang: 'EN' },
            { topic_id: 102, name: 'Maurya Dynasty: Ashoka the Great & Dhamma Policy', lang: 'EN' },
            { topic_id: 102, name: 'Ashokan Edicts & Rock Inscriptions (Bhabru Edict)', lang: 'EN' },
            { topic_id: 102, name: 'Kushan Dynasty: Rulers & Achievements of Kanishka', lang: 'EN' },
            { topic_id: 102, name: 'Satavahan Dynasty: Rulers, Land Grants & Maternal Titles', lang: 'EN' },
            { topic_id: 102, name: 'Gupta Dynasty: Achievements of Samudragupta & Allahabad Prasasti', lang: 'EN' },
            { topic_id: 102, name: 'Gupta Dynasty: Chandragupta II & Cultural Achievements', lang: 'EN' },
            { topic_id: 102, name: 'Chalukyas of Badami: Pulakeshin II & Achievements', lang: 'EN' },
            { topic_id: 102, name: 'Pallavas of Kanchi: Rulers & Rock-cut Monuments', lang: 'EN' },
            { topic_id: 102, name: 'Chola Dynasty: Rulers, Navy & Local Self-Government', lang: 'EN' },
            { topic_id: 102, name: 'Ancient Temple Architecture (Nagara, Dravida, Vesara)', lang: 'EN' },
            { topic_id: 102, name: 'Ancient Rock-cut Caves, Stupas & Paintings (Ajanta & Ellora)', lang: 'EN' },
            { topic_id: 102, name: 'Scientific Development in Ancient India (Mathematics, Astronomy, Medicine)', lang: 'EN' },
            { topic_id: 102, name: 'Varna & Ashram Systems (Four Life Stages)', lang: 'EN' },
            { topic_id: 102, name: 'Purushartha System (Dharma, Artha, Kama, Moksha)', lang: 'EN' },
            { topic_id: 102, name: 'Sanskara System (16 Rites of Passage)', lang: 'EN' },
            { topic_id: 102, name: 'Six Systems of Indian Philosophy (Shad-Darshana)', lang: 'EN' },
            { topic_id: 102, name: 'Ancient Education System: Universities (Takshashila, Nalanda, Valabhi)', lang: 'EN' },
            // Mains Topic 102 (HI)
            { topic_id: 102, name: 'सिंधु घाटी सभ्यता: नगर नियोजन और मुहरें', lang: 'HI' },
            { topic_id: 102, name: 'सिंधु घाटी सभ्यता: स्थल, खोजें और व्यापार', lang: 'HI' },
            { topic_id: 102, name: 'ऋग्वैदिक काल: राजनीति, सभाएं (सभा और समिति) और समाज', lang: 'HI' },
            { topic_id: 102, name: 'उत्तर वैदिक काल: साहित्य, वर्ण और अनुष्ठान', lang: 'HI' },
            { topic_id: 102, name: 'जैन धर्म का उदय: महावीर की शिक्षाएं और जैन दर्शन', lang: 'HI' },
            { topic_id: 102, name: 'बौद्ध धर्म का उदय: बुद्ध की शिक्षाएं और बौद्ध दर्शन', lang: 'HI' },
            { topic_id: 102, name: 'बौद्ध संगीतियां और संप्रदाय (हीनयान और महायान)', lang: 'HI' },
            { topic_id: 102, name: '6वीं शताब्दी ईसा पूर्व के आजीवक और अन्य नास्तिक संप्रदाय', lang: 'HI' },
            { topic_id: 102, name: 'मौर्य राजवंश: चंद्रगुप्त मौर्य और बिंदुसार', lang: 'HI' },
            { topic_id: 102, name: 'मौर्य राजवंश: महान अशोक और धम्म नीति', lang: 'HI' },
            { topic_id: 102, name: 'अशोक के शिलालेख और स्तंभ लेख (भाब्रू शिलालेख)', lang: 'HI' },
            { topic_id: 102, name: 'कुषाण राजवंश: शासक और कनिष्क की उपलब्धियां', lang: 'HI' },
            { topic_id: 102, name: 'सातवाहन राजवंश: शासक, भूमि दान और मातृ नाम', lang: 'HI' },
            { topic_id: 102, name: 'गुप्त राजवंश: समुद्रगुप्त की उपलब्धियां और इलाहाबाद प्रशस्ति', lang: 'HI' },
            { topic_id: 102, name: 'गुप्त राजवंश: चंद्रगुप्त द्वितीय और सांस्कृतिक उपलब्धियां', lang: 'HI' },
            { topic_id: 102, name: 'बादामी के चालुक्य: पुलकेशिन द्वितीय और उपलब्धियां', lang: 'HI' },
            { topic_id: 102, name: 'कांची के पल्लव: शासक और रॉक-कट स्मारक', lang: 'HI' },
            { topic_id: 102, name: 'चोल राजवंश: शासक, नौसेना और स्थानीय स्वशासन', lang: 'HI' },
            { topic_id: 102, name: 'प्राचीन मंदिर वास्तुकला (नागर, द्रविड़, वेसर)', lang: 'HI' },
            { topic_id: 102, name: 'प्राचीन गुफाएं, स्तूप और चित्रकला (अजंता और एलोरा)', lang: 'HI' },
            { topic_id: 102, name: 'प्राचीन भारत में वैज्ञानिक विकास (गणित, खगोल विज्ञान, चिकित्सा)', lang: 'HI' },
            { topic_id: 102, name: 'वर्ण और आश्रम प्रणालियां (जीवन के चार चरण)', lang: 'HI' },
            { topic_id: 102, name: 'पुरुषार्थ प्रणाली (धर्म, अर्थ, काम, मोक्ष)', lang: 'HI' },
            { topic_id: 102, name: 'संस्कार प्रणाली (16 संस्कार)', lang: 'HI' },
            { topic_id: 102, name: 'भारतीय दर्शन की छह प्रणालियां (षड्दर्शन)', lang: 'HI' },
            { topic_id: 102, name: 'प्राचीन शिक्षा प्रणाली: विश्वविद्यालय (तक्षशिला, नालंदा, वल्लभी)', lang: 'HI' }
        ];

        for (const s of subtopicSeeds) {
            const exists = await get("SELECT * FROM minute_topics WHERE topic_id = ? AND minute_topic_name = ? AND language = ?", [s.topic_id, s.name, s.lang]);
            if (!exists) {
                await run("INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (?, ?, ?)", [s.topic_id, s.name, s.lang]);
            }
        }
        console.log("Seeded Ancient Indian History sub-topics for Pre and Mains (both EN and HI).");

        // Clean up any existing placeholder/fake questions safely on startup
        await run("DELETE FROM questions WHERE question_text LIKE 'Practice MCQ Question for%'");
        await run("DELETE FROM questions WHERE question_text LIKE 'सब-टॉपिक:%के लिए अभ्यास प्रश्न'");
        await run("DELETE FROM mains_questions WHERE question_text LIKE 'Explain the key components%'");
        await run("DELETE FROM mains_questions WHERE question_text LIKE 'सब-टॉपिक:%के प्रमुख घटकों%'");
        console.log("Safely cleaned up database placeholder questions.");

// 2.5 Seed custom high-quality questions for Ancient Indian History (IVC: Town Planning & Seals)
        const mtPreEn = await get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 11 AND minute_topic_name = 'Indus Valley Civilisation (IVC): Town Planning & Seals' AND language = 'EN'");
        const mtPreHi = await get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 11 AND minute_topic_name = 'सिंधु घाटी सभ्यता: नगर नियोजन और मुहरें' AND language = 'HI'");
        const mtMainsEn = await get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 102 AND minute_topic_name = 'Indus Valley Civilisation (IVC): Town Planning & Seals' AND language = 'EN'");
        const mtMainsHi = await get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 102 AND minute_topic_name = 'सिंधु घाटी सभ्यता: नगर नियोजन और मुहरें' AND language = 'HI'");

        const id_122 = mtPreEn ? mtPreEn.minute_topic_id : 122;
        const id_130 = mtPreHi ? mtPreHi.minute_topic_id : 130;
        const id_174 = mtMainsEn ? mtMainsEn.minute_topic_id : 174;
        const id_200 = mtMainsHi ? mtMainsHi.minute_topic_id : 200;

        const ivcPreCount = await get("SELECT COUNT(*) as count FROM questions WHERE minute_topic_id = ?", [id_122]);
        if (ivcPreCount.count === 0) {
            console.log("Seeding custom high-quality questions for IVC...");
            const customPreQuestions = [
                {
                    lang: 'EN',
                    subtopic_id: 122,
                    text: `Q. Which of the following is correct regarding the use of burnt bricks in the Harappan civilization?
A) They were used only in the citadel area and not in the lower town.
B) Egypt and Mesopotamia used baked bricks to a much larger extent than Harappa.
C) The use of burnt bricks was a distinctive feature of Harappan cities compared to Egypt, where dried mud bricks were mainly used.
D) Burnt bricks were only used for constructing drains and public baths.`,
                    option_a: 'They were used only in the citadel area and not in the lower town.',
                    option_b: 'Egypt and Mesopotamia used baked bricks to a much larger extent than Harappa.',
                    option_c: 'The use of burnt bricks was a distinctive feature of Harappan cities compared to Egypt, where dried mud bricks were mainly used.',
                    option_d: 'Burnt bricks were only used for constructing drains and public baths.',
                    correct: 'C',
                    explanation: 'While contemporary Egypt primarily used dried mud bricks, Harappan cities utilized burnt bricks on a massive scale for both public and private structures.'
                },
                {
                    lang: 'HI',
                    subtopic_id: 130,
                    text: `Q. हड़प्पा सभ्यता में पकी हुई ईंटों (burnt bricks) के उपयोग के संबंध में निम्नलिखित में से कौन सा कथन सही है?
A) इनका उपयोग केवल दुर्ग (citadel) क्षेत्र में किया जाता था न कि निचले शहर में।
B) मिस्र और मेसोपोटामिया में हड़प्पा की तुलना में पकी हुई ईंटों का बहुत बड़े पैमाने पर उपयोग किया जाता था।
C) पकी हुई ईंटों का उपयोग मिस्र की तुलना में हड़प्पा के शहरों की एक विशिष्ट विशेषता थी, जहाँ मुख्य रूप से सूखी मिट्टी की ईंटों का उपयोग किया जाता था।
D) पकी हुई ईंटों का उपयोग केवल नालियों और सार्वजनिक स्नानागारों के निर्माण के लिए किया जाता था।`,
                    option_a: 'इनका उपयोग केवल दुर्ग (citadel) क्षेत्र में किया जाता था न कि निचले शहर में।',
                    option_b: 'मिस्र और मेसोपोटामिया में हड़प्पा की तुलना में पकी हुई ईंटों का बहुत बड़े पैमाने पर उपयोग किया जाता था।',
                    option_c: 'पकी हुई ईंटों का उपयोग मिस्र की तुलना में हड़प्पा के शहरों की एक विशिष्ट विशेषता थी, जहाँ मुख्य रूप से सूखी मिट्टी की ईंटों का उपयोग किया जाता था।',
                    option_d: 'पकी हुई ईंटों का उपयोग केवल नालियों और सार्वजनिक स्नानागारों के निर्माण के लिए किया जाता था।',
                    correct: 'C',
                    explanation: 'जबकि समकालीन मिस्र में मुख्य रूप से धूप में सुखाई गई मिट्टी की ईंटों का उपयोग किया जाता था, हड़प्पा के शहरों ने सार्वजनिक और निजी दोनों संरचनाओं के लिए बड़े पैमाने पर पकी हुई ईंटों का उपयोग किया।'
                },
                {
                    lang: 'EN',
                    subtopic_id: 122,
                    text: `Q. Match List-I (Harappan Site) with List-II (Key Architectural/Town Planning Feature) and select the correct answer:
List-I:
a) Kalibangan
b) Dholavira
c) Harappa
d) Mohenjodaro

List-II:
1) Great Bath and Citadel
2) Row of six granaries
3) Ploughed field and fire altars
4) Divided into three distinct parts

A) a-3, b-4, c-2, d-1
B) a-1, b-2, c-3, d-4
C) a-3, b-1, c-2, d-4
D) a-4, b-3, c-1, d-2`,
                    option_a: 'a-3, b-4, c-2, d-1',
                    option_b: 'a-1, b-2, c-3, d-4',
                    option_c: 'a-3, b-1, c-2, d-4',
                    option_d: 'a-4, b-3, c-1, d-2',
                    correct: 'A',
                    explanation: 'Kalibangan is famous for a ploughed field and fire altars; Dholavira is unique for being divided into three parts; Harappa contains rows of six granaries; Mohenjodaro houses the famous Great Bath.'
                },
                {
                    lang: 'HI',
                    subtopic_id: 130,
                    text: `Q. सूची-I (हड़प्पा स्थल) को सूची-II (प्रमुख वास्तुकला/नगर नियोजन विशेषता) से सुमेलित कीजिए और सही उत्तर का चयन कीजिए:
सूची-I:
a) कालीबंगा
b) धोलावीरा
c) हड़प्पा
d) मोहनजोदड़ो

सूची-II:
1) विशाल स्नानागार और दुर्ग
2) छह अन्नागारों की पंक्ति
3) जुता हुआ खेत और अग्निकुंड
4) तीन अलग-अलग भागों में विभाजित

A) a-3, b-4, c-2, d-1
B) a-1, b-2, c-3, d-4
C) a-3, b-1, c-2, d-4
D) a-4, b-3, c-1, d-2`,
                    option_a: 'a-3, b-4, c-2, d-1',
                    option_b: 'a-1, b-2, c-3, d-4',
                    option_c: 'a-3, b-1, c-2, d-4',
                    option_d: 'a-4, b-3, c-1, d-2',
                    correct: 'A',
                    explanation: 'कालीबंगा जुते हुए खेत और अग्निकुंडों के लिए प्रसिद्ध है; धोलावीरा तीन भागों में विभाजित होने के लिए विशिष्ट है; हड़प्पा में छह अन्नागारों की पंक्तियाँ हैं; मोहनजोदड़ो में प्रसिद्ध विशाल स्नानागार स्थित है।'
                },
                {
                    lang: 'EN',
                    subtopic_id: 122,
                    text: `Q. Consider the following statements regarding the drainage system of Harappan cities:
1. Every small or big house had its own courtyard and bathroom.
2. The street drains were equipped with manholes and covered with bricks or stone slabs.
3. Channelling wastewater directly into open fields without a pipe network was the standard practice.

Which of the statements given above is/are correct?
A) 1 and 2 only
B) 2 and 3 only
C) 1 and 3 only
D) 1, 2 and 3`,
                    option_a: '1 and 2 only',
                    option_b: '2 and 3 only',
                    option_c: '1 and 3 only',
                    option_d: '1, 2 and 3',
                    correct: 'A',
                    explanation: 'Statements 1 and 2 are correct. Statement 3 is incorrect because the Harappans had a highly advanced drainage network where house drains connected directly to main street sewers, not open fields.'
                },
                {
                    lang: 'HI',
                    subtopic_id: 130,
                    text: `Q. हड़प्पा के शहरों की जल निकासी प्रणाली (drainage system) के संबंध में निम्नलिखित कथनों पर विचार कीजिए:
1. प्रत्येक छोटे या बड़े घर का अपना आंगन और स्नानघर होता था।
2. सड़कों की नालियां मैनहोल (सफाई द्वारों) से सुसज्जित थीं और ईंटों या पत्थर की पट्टियों से ढकी हुई थीं।
3. बिना पाइप नेटवर्क के सीधे खुले खेतों में अपशिष्ट जल को बहाना मानक अभ्यास था।

उपर्युक्त कथनों में से कौन सा/से सही है/हैं?
A) केवल 1 और 2
B) केवल 2 और 3
C) केवल 1 और 3
D) 1, 2 और 3`,
                    option_a: 'केवल 1 और 2',
                    option_b: 'केवल 2 और 3',
                    option_c: 'केवल 1 और 3',
                    option_d: '1, 2 और 3',
                    correct: 'A',
                    explanation: 'कथन 1 और 2 सही हैं। कथन 3 गलत है क्योंकि हड़प्पा वासियों के पास एक अत्यधिक उन्नत जल निकासी नेटवर्क था जहाँ घरों की नालियाँ सीधे मुख्य सड़क के गटर से जुड़ी थीं, न कि खुले खेतों से।'
                },
                {
                    lang: 'EN',
                    subtopic_id: 122,
                    text: `Q. Consider the following statements:
Assertion (A): The political organization of Harappa was likely dominated by a class of merchants rather than priests.
Reason (R): In sharp contrast to Mesopotamia, no temples or religious structures of a monumental scale (except the Great Bath) have been found at Harappan sites.

Choose the correct option:
A) Both A and R are true and R is the correct explanation of A
B) Both A and R are true but R is not the correct explanation of A
C) A is true but R is false
D) A is false but R is true`,
                    option_a: 'Both A and R are true and R is the correct explanation of A',
                    option_b: 'Both A and R are true but R is not the correct explanation of A',
                    option_c: 'A is true but R is false',
                    option_d: 'A is false but R is true',
                    correct: 'A',
                    explanation: 'Because no temples or monumental structures representing direct rule of priests are found in Harappa (unlike Mesopotamia), historians conclude that Harappa was likely ruled by a class of merchants focused on commerce.'
                },
                {
                    lang: 'HI',
                    subtopic_id: 130,
                    text: `Q. निम्नलिखित कथनों पर विचार कीजिए:
अभिकथन (A): हड़प्पा के राजनीतिक संगठन पर पुजारियों के बजाय व्यापारियों के एक वर्ग का प्रभुत्व होने की संभावना थी।
कारण (R): मेसोपोटामिया के विपरीत, हड़प्पा स्थलों पर विशाल स्तर पर कोई मंदिर या धार्मिक संरचनाएं (विशाल स्नानागार को छोड़कर) नहीं मिली हैं।

सही विकल्प का चयन कीजिए:
A) A और R दोनों सही हैं और R, A की सही व्याख्या करता है
B) A और R दोनों सही हैं लेकिन R, A की सही व्याख्या नहीं करता है
C) A सही है लेकिन R गलत है
D) A गलत है लेकिन R सही है`,
                    option_a: 'A और R दोनों सही हैं और R, A की सही व्याख्या करता है',
                    option_b: 'A और R दोनों सही हैं लेकिन R, A की सही व्याख्या नहीं करता है',
                    option_c: 'A सही है लेकिन R गलत है',
                    option_d: 'A गलत है लेकिन R सही है',
                    correct: 'A',
                    explanation: 'कथन (A) और कारण (R) दोनों सही हैं और कारण, अभिकथन की सही व्याख्या करता है।'
                },
                {
                    lang: 'EN',
                    subtopic_id: 122,
                    text: `Q. Consider the following statements regarding the famous "Pasupati Seal" discovered at Mohenjo-daro:
1. The deity has three heads and horns, sitting in the posture of a yogi.
2. The deity is surrounded by a tiger, an elephant, a rhinoceros, and a buffalo.
3. Two deer are depicted sitting at the feet of the deity.

Which of the statements given above are correct?
A) 1 and 2 only
B) 2 and 3 only
C) 1 and 3 only
D) 1, 2 and 3`,
                    option_a: '1 and 2 only',
                    option_b: '2 and 3 only',
                    option_c: '1 and 3 only',
                    option_d: '1, 2 and 3',
                    correct: 'D',
                    explanation: 'All three statements are correct. The seal depicts a horned yogic figure surrounded by four animals facing four directions (elephant, tiger, rhino, buffalo) and two deer at the feet.'
                },
                {
                    lang: 'HI',
                    subtopic_id: 130,
                    text: `Q. मोहनजोदड़ो से प्राप्त प्रसिद्ध "पशुपति मुहर" के संबंध में निम्नलिखित कथनों पर विचार कीजिए:
1. देवता के तीन सिर और सींग हैं, जो एक योगी की मुद्रा में बैठे हैं।
2. देवता एक बाघ, एक हाथी, एक गैंडे और एक भैंसे से घिरे हुए हैं।
3. देवता के चरणों में दो हिरण बैठे हुए दर्शाए गए हैं।

उपर्युक्त कथनों में से कौन से सही हैं?
A) केवल 1 और 2
B) केवल 2 और 3
C) केवल 1 और 3
D) 1, 2 और 3`,
                    option_a: 'केवल 1 और 2',
                    option_b: 'केवल 2 और 3',
                    option_c: 'केवल 1 और 3',
                    option_d: '1, 2 और 3',
                    correct: 'D',
                    explanation: 'तीनों कथन सही हैं। मुहर में एक सींग वाले योगी की आकृति को दर्शाया गया है जो चार दिशाओं का सामना करने वाले चार जानवरों (हाथी, बाघ, गैंडा, भैंसा) से घिरे हैं और चरणों में दो हिरण हैं।'
                }
            ];

            for (const q of customPreQuestions) {
                const targetId = q.lang === 'EN' ? id_122 : id_130;
                await run(`
                    INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language)
                    VALUES (11, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct, q.explanation, targetId, q.lang]);
            }

            const customMainsQuestions = [
                {
                    lang: 'EN',
                    subtopic_id: 174,
                    text: `Q. Critically examine the layout and social stratification reflected in the town planning of Harappan cities. [5 Marks, 50 Words]`,
                    model_answer: `**Introduction**: Harappan town planning shows a clear, planned layout reflecting socio-political organization.
**Body (Social Stratification)**:
* **The Citadel (Upper Town)**: Located on a raised platform to the west; contained public buildings, granaries, and was occupied by the ruling class.
* **The Lower Town**: Located to the east; contained grid-patterned houses inhabited by commoners.
**Conclusion**: This dual-division indicates administrative hierarchy and class stratification.`
                },
                {
                    lang: 'HI',
                    subtopic_id: 200,
                    text: `Q. हड़प्पा के शहरों के नगर नियोजन में परिलक्षित लेआउट और सामाजिक स्तरीकरण का आलोचनात्मक परीक्षण कीजिए। [5 अंक, 50 शब्द]`,
                    model_answer: `**परिचय**: हड़प्पा नगर नियोजन सामाजिक-राजनीतिक संगठन को दर्शाने वाला एक स्पष्ट, नियोजित लेआउट दिखाता है।
**मुख्य भाग (सामाजिक स्तरीकरण)**:
* **दुर्ग (उच्च शहर)**: पश्चिम में एक ऊंचे मंच पर स्थित था; इसमें सार्वजनिक इमारतें, अन्नागार थे, और यह शासक वर्ग के अधीन था।
* **निचला शहर**: पूर्व में स्थित था; इसमें ग्रिड-पैटर्न वाले घर थे जिसमें आम लोग निवास करते थे।
**निष्कर्ष**: यह दोहरा विभाजन प्रशासनिक पदानुक्रम और वर्ग स्तरीकरण को दर्शाता है।`
                },
                {
                    lang: 'EN',
                    subtopic_id: 174,
                    text: `Q. Discuss the metallurgical technology and artistic features of Harappan seals and bronze sculptures. [10 Marks, 150 Words]`,
                    model_answer: `**Introduction**: The Harappan civilization (Bronze Age) demonstrated advanced metallurgical skills and unique artistic traditions.

**Body**:
* **Metallurgical Advancements**:
  * Utilized the **"Lost-Wax"** (cire perdue) technique for casting bronze (e.g., the 4-inch *Dancing Girl* and bull figurines).
  * Imported tin from Afghanistan and copper from Khetri mines (Rajasthan).
* **Artistic Features of Seals**:
  * Carved primarily from soft **steatite** in square formats (2x2).
  * Feature realistic animal engravings (unicorn, humped bull, rhinoceros) and pictographic script.
  * Served commercial and administrative functions.

| Medium | Key Art Piece | Technique / Style |
|---|---|---|
| Bronze | Dancing Girl | Lost-Wax Casting |
| Steatite | Pasupati Seal | Intaglio Carving |
| Terracotta | Mother Goddess | Pinching Technique |

**Conclusion**: Harappan metallurgy and seal-carving reflect a highly organized urban craft economy.`
                },
                {
                    lang: 'HI',
                    subtopic_id: 200,
                    text: `Q. हड़प्पा की मुहरों और कांस्य मूर्तियों की धातुशोधन तकनीक और कलात्मक विशेषताओं की चर्चा कीजिए। [10 अंक, 150 शब्द]`,
                    model_answer: `**परिचय**: हड़प्पा सभ्यता (कांस्य युग) ने उन्नत धातु कौशल और अद्वितीय कलात्मक परंपराओं का प्रदर्शन किया।

**मुख्य भाग**:
* **धातुशोधन प्रगति**:
  * कांस्य ढलाई के लिए **"लुप्त मोम"** (Lost-Wax) तकनीक का उपयोग किया (जैसे, 4 इंच की *नर्तकी की मूर्ति* और बैल की मूर्तियां)।
  * अफगानिस्तान से टिन और खेतड़ी खानों (राजस्थान) से तांबे का आयात किया।
* **मुहरों की कलात्मक विशेषताएं**:
  * मुख्य रूप से चौकोर प्रारूप (2x2) में नरम **स्टीटाइट** से नक्काशीदार।
  * यथार्थवादी पशु नक्काशी (एक सींग वाला बैल, कूबड़ वाला बैल, गैंडा) और चित्रात्मक लिपि शामिल हैं।
  * व्यावसायिक और प्रशासनिक कार्यों के लिए उपयोग किया जाता था।

| माध्यम | प्रमुख कलाकृति | तकनीक / शैली |
|---|---|---|
| कांस्य | नर्तकी की मूर्ति | लुप्त मोम ढलाई |
| स्टीटाइट | पशुपति मुहर | अन्तर्गर्त नक्काशी |
| टेराकोटा | मातृदेवी की मूर्ति | पिंचिंग तकनीक |

**निष्कर्ष**: हड़प्पा का धातु कर्म और मुहर-नक्काशी एक अत्यधिक संगठित शहरी शिल्प अर्थव्यवस्था को दर्शाती है।`
                }
            ];

            for (const q of customMainsQuestions) {
                const targetId = q.lang === 'EN' ? id_174 : id_200;
                await run(`
                    INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id)
                    VALUES (102, ?, ?, ?, 1, ?)
                `, [q.text, q.model_answer, q.lang, targetId]);
            }
            console.log("Custom high-quality questions for IVC seeded successfully.");
        }

        // 2.6 Seed custom high-quality questions for IVC (Sites, Discoveries & Trade)
        const mtPre2En = await get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 11 AND minute_topic_name = 'Indus Valley Civilisation (IVC): Sites, Discoveries & Trade' AND language = 'EN'");
        const mtPre2Hi = await get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 11 AND minute_topic_name = 'सिंधु घाटी सभ्यता: स्थल, खोजें और व्यापार' AND language = 'HI'");
        const mtMains2En = await get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 102 AND minute_topic_name = 'Indus Valley Civilisation (IVC): Sites, Discoveries & Trade' AND language = 'EN'");
        const mtMains2Hi = await get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 102 AND minute_topic_name = 'सिंधु घाटी सभ्यता: स्थल, खोजें और व्यापार' AND language = 'HI'");

        if (mtPre2En && mtPre2Hi && mtMains2En && mtMains2Hi) {
            const ivc2PreCount = await get("SELECT COUNT(*) as count FROM questions WHERE minute_topic_id = ?", [mtPre2En.minute_topic_id]);
            if (ivc2PreCount.count === 0) {
                console.log("Seeding custom high-quality questions for IVC Sites & Trade...");
                const customPreQuestions2 = [
                    {
                        lang: 'EN',
                        subtopic_id: mtPre2En.minute_topic_id,
                        text: `Q. Which of the following Harappan sites has yielded evidence of a dockyard, indicating overseas trade?
A) Kalibangan
B) Lothal
C) Rakhigarhi
D) Banawali`,
                        option_a: 'Kalibangan',
                        option_b: 'Lothal',
                        option_c: 'Rakhigarhi',
                        option_d: 'Banawali',
                        correct: 'B',
                        explanation: 'Lothal, located in Gujarat, had a massive brick basin which has been identified by archaeologists as a tidal dockyard connected to the Gulf of Khambhat.'
                    },
                    {
                        lang: 'HI',
                        subtopic_id: mtPre2Hi.minute_topic_id,
                        text: `Q. निम्नलिखित में से किस हड़प्पा स्थल से गोदीवाड़ा (dockyard) के प्रमाण मिले हैं, जो विदेशी व्यापार का संकेत देते हैं?
A) कालीबंगा
B) लोथल
C) राखीगढ़ी
D) बनावली`,
                        option_a: 'कालीबंगा',
                        option_b: 'लोथल',
                        option_c: 'राखीगढ़ी',
                        option_d: 'बनावली',
                        correct: 'B',
                        explanation: 'गुजरात में स्थित लोथल में ईंटों का एक बड़ा बेसिन था जिसे पुरातत्वविदों द्वारा खंभात की खाड़ी से जुड़े एक गोदीवाड़ा के रूप में पहचाना गया है।'
                    },
                    {
                        lang: 'EN',
                        subtopic_id: mtPre2En.minute_topic_id,
                        text: `Q. Consider the following statements regarding Harappan trade relations:
1. The Harappans maintained close commercial links with Mesopotamia, which is attested by cuneiform inscriptions referring to Meluhha.
2. The primary export items of Harappa were lapis lazuli and silver.
3. Lothal and Sutkagen-dor served as important ports/outposts facilitating maritime trade.

Which of the statements given above are correct?
A) 1 and 2 only
B) 2 and 3 only
C) 1 and 3 only
D) 1, 2 and 3`,
                        option_a: '1 and 2 only',
                        option_b: '2 and 3 only',
                        option_c: '1 and 3 only',
                        option_d: '1, 2 and 3',
                        correct: 'C',
                        explanation: 'Statements 1 and 3 are correct. Statement 2 is incorrect because lapis lazuli was imported (from Badakhshan) rather than exported, and silver was not a primary export of the Harappan civilization.'
                    },
                    {
                        lang: 'HI',
                        subtopic_id: mtPre2Hi.minute_topic_id,
                        text: `Q. हड़प्पा के व्यापारिक संबंधों के संबंध में निम्नलिखित कथनों पर विचार कीजिए:
1. हड़प्पा वासियों ने मेसोपोटामिया के साथ निकट व्यावसायिक संबंध बनाए रखे, जिसकी पुष्टि मेलुहा का संदर्भ देने वाले कीलाक्षर (cuneiform) शिलालेखों से होती है।
2. हड़प्पा के प्राथमिक निर्यात सामान लापीस लाजुली (लाजवर्त) और चांदी थे।
3. लोथल और सुत्कागेन-डोर ने समुद्री व्यापार को सुविधाजनक बनाने वाले महत्वपूर्ण बंदरगाहों/चौकियों के रूप में कार्य किया।

उपर्युक्त कथनों में से कौन से सही हैं?
A) केवल 1 और 2
B) केवल 2 और 3
C) केवल 1 और 3
D) 1, 2 और 3`,
                        option_a: 'केवल 1 और 2',
                        option_b: 'केवल 2 और 3',
                        option_c: 'केवल 1 और 3',
                        option_d: '1, 2 और 3',
                        correct: 'C',
                        explanation: 'कथन 1 और 3 सही हैं। कथन 2 गलत है क्योंकि लाजवर्त आयात किया जाता था (बदख्शां से) न कि निर्यात, और चांदी हड़प्पा सभ्यता का प्राथमिक निर्यात नहीं थी।'
                    },
                    {
                        lang: 'EN',
                        subtopic_id: mtPre2En.minute_topic_id,
                        text: `Q. Consider the following statements:
Assertion (A): The Harappans utilized a highly standardized system of weights and measures.
Reason (R): Harappan weight sets were cubical and followed a strictly binary system in lower denominations, transitioning to decimal multiples at higher values.

Choose the correct option:
A) Both A and R are true and R is the correct explanation of A
B) Both A and R are true but R is not the correct explanation of A
C) A is true but R is false
D) A is false but R is true`,
                        option_a: 'Both A and R are true and R is the correct explanation of A',
                        option_b: 'Both A and R are true but R is not the correct explanation of A',
                        option_c: 'A is true but R is false',
                        option_d: 'A is false but R is true',
                        correct: 'A',
                        explanation: 'Both statements are true. The standardization of trade across vast territories was made possible precisely because of this unified binary-decimal chert weight system.'
                    },
                    {
                        lang: 'HI',
                        subtopic_id: mtPre2Hi.minute_topic_id,
                        text: `Q. निम्नलिखित कथनों पर विचार कीजिए:
अभिकथन (A): हड़प्पा वासियों ने बाट और माप की एक अत्यधिक मानकीकृत प्रणाली का उपयोग किया।
कारण (R): हड़प्पा के बाटों के सेट घनाकार थे और निचले मूल्यों में सख्ती से द्विआधारी (binary) प्रणाली का पालन करते थे, जो उच्च मूल्यों पर दशमलव गुणकों में परिवर्तित हो जाते थे।

सही विकल्प का चयन कीजिए:
A) A और R दोनों सही हैं और R, A की सही व्याख्या करता है
B) A और R दोनों सही हैं लेकिन R, A की सही व्याख्या नहीं करता है
C) A सही है लेकिन R गलत है
D) A गलत है लेकिन R सही है`,
                        option_a: 'A और R दोनों सही हैं और R, A की सही व्याख्या करता है',
                        option_b: 'A और R दोनों सही हैं लेकिन R, A की सही व्याख्या नहीं करता है',
                        option_c: 'A सही है लेकिन R गलत है',
                        option_d: 'A गलत है लेकिन R सही है',
                        correct: 'A',
                        explanation: 'अभिकथन और कारण दोनों सही हैं और कारण अभिकथन की सही व्याख्या करता है।'
                    },
                    {
                        lang: 'EN',
                        subtopic_id: mtPre2En.minute_topic_id,
                        text: `Q. Match List-I (Harappan Site) with List-II (River) and select the correct answer:
List-I:
a) Harappa
b) Mohenjodaro
c) Kalibangan
d) Banawali

List-II:
1) Ghaggar
2) Sarasvati (Dry Bed)
3) Ravi
4) Indus

A) a-3, b-4, c-1, d-2
B) a-1, b-2, c-3, d-4
C) a-3, b-1, c-4, d-2
D) a-4, b-3, c-1, d-2`,
                        option_a: 'a-3, b-4, c-1, d-2',
                        option_b: 'a-1, b-2, c-3, d-4',
                        option_c: 'a-3, b-1, c-4, d-2',
                        option_d: 'a-4, b-3, c-1, d-2',
                        correct: 'A',
                        explanation: 'Harappa is on the Ravi; Mohenjodaro is on the Indus; Kalibangan is on the Ghaggar; Banawali is on the ancient dry bed of the Sarasvati.'
                    },
                    {
                        lang: 'HI',
                        subtopic_id: mtPre2Hi.minute_topic_id,
                        text: `Q. सूची-I (हड़प्पा स्थल) को सूची-II (नदी) से सुमेलित कीजिए और सही उत्तर का चयन कीजिए:
सूची-I:
a) हड़प्पा
b) मोहनजोदड़ो
c) कालीबंगा
d) बनावली

सूची-II:
1) घग्गर
2) सरस्वती (सूखा मार्ग)
3) रावी
4) सिंधु

A) a-3, b-4, c-1, d-2
B) a-1, b-2, c-3, d-4
C) a-3, b-1, c-4, d-2
D) a-4, b-3, c-1, d-2`,
                        option_a: 'a-3, b-4, c-1, d-2',
                        option_b: 'a-1, b-2, c-3, d-4',
                        option_c: 'a-3, b-1, c-4, d-2',
                        option_d: 'a-4, b-3, c-1, d-2',
                        correct: 'A',
                        explanation: 'हड़प्पा रावी नदी के तट पर है; मोहनजोदड़ो सिंधु नदी के तट पर है; कालीबंगा घग्गर नदी के तट पर है; बनावली सरस्वती नदी के प्राचीन सूखे मार्ग पर है।'
                    },
                    {
                        lang: 'EN',
                        subtopic_id: mtPre2En.minute_topic_id,
                        text: `Q. Consider the following statements regarding the Harappan script and writing system:
1. The script is pictographic and remains undeciphered to this day.
2. The writing style is boustrophedon, written from right to left in one line and left to right in the next.
3. Most inscriptions are long narratives carved on temple walls.

Which of the statements given above is/are correct?
A) 1 and 2 only
B) 2 and 3 only
C) 1 and 3 only
D) 1, 2 and 3`,
                        option_a: '1 and 2 only',
                        option_b: '2 and 3 only',
                        option_c: '1 and 3 only',
                        option_d: '1, 2 and 3',
                        correct: 'A',
                        explanation: 'Statements 1 and 2 are correct. Statement 3 is incorrect because Harappan writing is found primarily on small seals and copper tablets, not temple walls.'
                    },
                    {
                        lang: 'HI',
                        subtopic_id: mtPre2Hi.minute_topic_id,
                        text: `Q. हड़प्पा लिपि और लेखन प्रणाली के संबंध में निम्नलिखित कथनों पर विचार कीजिए:
1. लिपि चित्रात्मक (pictographic) है और आज तक इसे पढ़ा नहीं जा सका है।
2. लेखन शैली 'बाउस्ट्रोफेडन' (boustrophedon) है, जिसे एक पंक्ति में दाएं से बाएं और अगली पंक्ति में बाएं से दाएं लिखा जाता है।
3. अधिकांश शिलालेख मंदिरों की दीवारों पर उकेरे गए लंबे आख्यान हैं।

उपर्युक्त कथनों में से कौन सा/से सही है/हैं?
A) केवल 1 और 2
B) केवल 2 और 3
C) केवल 1 और 3
D) 1, 2 और 3`,
                        option_a: 'केवल 1 और 2',
                        option_b: 'केवल 2 और 3',
                        option_c: 'केवल 1 और 3',
                        option_d: '1, 2 और 3',
                        correct: 'A',
                        explanation: 'कथन 1 और 2 सही हैं। कथन 3 गलत है क्योंकि हड़प्पा की लिखावट मुख्य रूप से छोटी मुहरों और तांबे की पट्टियों पर मिली है, न कि मंदिरों की दीवारों पर।'
                    }
                ];

                for (const q of customPreQuestions2) {
                    await run(`
                        INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language)
                        VALUES (11, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct, q.explanation, q.subtopic_id, q.lang]);
                }

                const customMainsQuestions2 = [
                    {
                        lang: 'EN',
                        subtopic_id: mtMains2En.minute_topic_id,
                        text: `Q. Analyze the trade relations of the Harappan civilization with Mesopotamia. [5 Marks, 50 Words]`,
                        model_answer: `**Introduction**: Harappans engaged in long-distance trade with Mesopotamia through land and gulf routes.
**Body**:
* **Evidence**: Cuneiform texts refer to trade with 'Meluhha' (Indus region), exporting ivory, carnelian, and gold.
* **Ports**: Intermediate stations like Dilmun (Bahrain) and Makan served as vital trade outposts.
**Conclusion**: Trade was commercial and structured, enriching the urban Harappan economy.`
                    },
                    {
                        lang: 'HI',
                        subtopic_id: mtMains2Hi.minute_topic_id,
                        text: `Q. मेसोपोटामिया के साथ हड़प्पा सभ्यता के व्यापारिक संबंधों का विश्लेषण कीजिए। [5 अंक, 50 शब्द]`,
                        model_answer: `**परिचय**: हड़प्पावासियों ने भूमि और खाड़ी मार्गों के माध्यम से मेसोपोटामिया के साथ लंबी दूरी के व्यापार में भाग लिया।
**मुख्य भाग**:
* **साक्ष्य**: कीलाक्षर ग्रंथ 'मेलुहा' (सिंधु क्षेत्र) के साथ व्यापार का संदर्भ देते हैं, जहाँ से हाथी दांत, कार्नेलियन और सोने का निर्यात किया जाता था।
* **बंदरगाह**: दिलमुन (बहरीन) और माकन जैसे मध्यवर्ती स्टेशन महत्वपूर्ण व्यापारिक चौकियों के रूप में कार्य करते थे।
**निष्कर्ष**: यह व्यापार व्यावसायिक और संरचित था, जिसने हड़प्पा की शहरी अर्थव्यवस्था को समृद्ध बनाया।`
                    },
                    {
                        lang: 'EN',
                        subtopic_id: mtMains2En.minute_topic_id,
                        text: `Q. Discuss the archaeological significance and discoveries of major Harappan sites located in India. [10 Marks, 150 Words]`,
                        model_answer: `**Introduction**: Post-partition, extensive excavations in India revealed critical dimensions of Harappan urban planning and regional diversity.

**Body**:
* **Lothal (Gujarat)**:
  * Features a tidal dockyard, proving advanced maritime trade capabilities.
  * Yielded bead-maker workshops, double-burials, and terracotta ship models.
* **Kalibangan (Rajasthan)**:
  * Discovered a pre-Harappan ploughed field, showing early agrarian patterns.
  * Fire altars suggest ritualistic fire-worship.
* **Dholavira (Kutch, Gujarat)**:
  * Showcases a unique three-tier city layout (Citadel, Middle Town, Lower Town).
  * Contains an unparalleled water-harvesting system with sophisticated stone reservoirs.
* **Rakhigarhi (Haryana)**:
  * Now recognized as the largest Harappan site, providing crucial DNA data on ancient populations.

**Conclusion**: Discoveries in India expand our understanding of regional variation, water management, and maritime achievements of the Harappans.`
                    },
                    {
                        lang: 'HI',
                        subtopic_id: mtMains2Hi.minute_topic_id,
                        text: `Q. भारत में स्थित प्रमुख हड़प्पा स्थलों के पुरातात्विक महत्व और खोजों की चर्चा कीजिए। [10 अंक, 150 शब्द]`,
                        model_answer: `**परिचय**: विभाजन के बाद, भारत में व्यापक उत्खनन ने हड़प्पा के नगर नियोजन और क्षेत्रीय विविधता के महत्वपूर्ण आयामों को प्रकट किया।

**मुख्य भाग**:
* **लोथल (गुजरात)**:
  * एक गोदीवाड़ा (dockyard) की खोज, जो उन्नत समुद्री व्यापारिक क्षमताओं को सिद्ध करता है।
  * मनके बनाने की कार्यशाला और युगल समाधान के साक्ष्य मिले हैं।
* **कालीबंगा (राजस्थान)**:
  * एक पूर्व-हड़प्पा जुता हुआ खेत मिला है, जो प्रारंभिक कृषि पद्धतियों को दर्शाता है।
  * अग्निकुंडों के साक्ष्य अग्नि पूजा का संकेत देते हैं।
* **धोलावीरा (कच्छ, गुजरात)**:
  * तीन स्तरों वाले शहर का अभिनव लेआउट (दुर्ग, मध्य नगर और निचला नगर)।
  * परिष्कृत जलाशयों के साथ एक अद्वितीय जल संरक्षण और प्रबंधन प्रणाली।
* **राखीगढ़ी (हरियाणा)**:
  * वर्तमान में सबसे बड़ा हड़प्पा स्थल, जो प्राचीन आबादी के विषय में महत्वपूर्ण साक्ष्य प्रदान करता है।

**निष्कर्ष**: भारत में हुई ये खोजें हड़प्पा सभ्यता के क्षेत्रीय अंतरों, जल प्रबंधन और समुद्री कौशल के संबंध में हमारी समझ को विस्तृत करती हैं।`
                    }
                ];

                for (const q of customMainsQuestions2) {
                    await run(`
                        INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id)
                        VALUES (102, ?, ?, ?, 1, ?)
                    `, [q.text, q.model_answer, q.lang, q.subtopic_id]);
                }
                console.log("Custom high-quality questions for IVC Sites & Trade seeded successfully.");
            }
        }


    } catch (err) {
        console.error("Database initialization error:", err.message);
    }
}

// Seed the 2026 Syllabus and Sample Questions
async function seedSyllabusAndSampleQuestions() {
    try {
        // --- SEED PRE SYLLABUS ---
        const preSubjects = [
            "History, Art, Culture, Literature, Tradition & Heritage of Rajasthan",
            "Indian History (Ancient, Medieval & Modern Period)",
            "Geography of World and India",
            "Geography of Rajasthan",
            "Indian Constitution, Political System & Governance",
            "Political and Administrative System of Rajasthan",
            "Economic Concepts and Indian Economy",
            "Economy of Rajasthan",
            "Science & Technology",
            "Reasoning & Mental Ability",
            "Current Affairs & Issues (with special reference to Rajasthan)"
        ];

        // Map pre subjects to their logical topics (62 detailed topics)
        const preTopicsMap = {
            1: [
                "Pre-historic sites of Rajasthan: Palaeolithic to Chalcolithic & Bronze Age (Kalibangan, Ahar, Bairat, Bagor, Ganeshwar)",
                "Major Dynasties of Rajasthan & their achievements: Guhil, Chauhan, Rathore, Parmar, Kachchawa",
                "Administrative & Revenue systems of major dynasties in Rajasthan",
                "Political awakening and 1857 Revolt in Rajasthan",
                "Peasant, tribal, and Praja Mandal movements in Rajasthan",
                "Integration of Rajasthan: The seven stages of state formation",
                "Architectural heritage of Rajasthan: Forts, palaces, temples, stepwells & cenotaphs",
                "Performing arts of Rajasthan: Folk music, instruments, folk dances & folk dramas",
                "Rajasthani dialects, language, and prominent historical literature",
                "Religious sects, saints, folk deities (Panch Peer) & fairs/festivals of Rajasthan"
            ],
            2: [
                "Cultural Foundations of India - Indus & Vedic Age; Religious ideas of 6th Century BC (Ajivakas, Buddhism & Jainism)",
                "Achievements of prominent rulers of major dynasties: Maurya, Kushan, Satavahan, Gupta, Chalukya, Pallava and Chola",
                "Art, Architecture, Scientific Development & Indian Knowledge/Value System in Ancient India",
                "Medieval India: Delhi Sultanate and Mughal Empire - administration, art, architecture & literature",
                "Medieval India: Bhakti movement, Sufism and cultural synthesis",
                "Modern India: Socio-religious reform movements in 19th & 20th centuries",
                "Modern India: Indian National Movement - 1857 Revolt, early phase, Swadeshi, Gandhian era & freedom struggle",
                "Post-independence India: Integration of princely states & linguistic reorganization of states"
            ],
            3: [
                "World Physical Geography: Major landforms (mountains, plateaus, plains, deserts) & climate types",
                "World Geography: Environmental issues, ecological hotspots, biodiversity & wildlife",
                "India Physical Geography: Physiographic divisions, major rivers, lakes & drainage systems",
                "India Geography: Climate systems, monsoons, forest types & soil classifications",
                "India Resources: Major minerals (iron, coal, bauxite, mica) & energy resources (conventional & renewable)",
                "India Economy Geography: Agriculture, major crops, irrigation systems & agro-based industries"
            ],
            4: [
                "Rajasthan Physical: Physiographic divisions, geological structures & climate classification",
                "Rajasthan Drainage: Major river basins, lakes & water conservation systems",
                "Rajasthan Resources: Natural vegetation, forest coverage, wildlife sanctuaries & biodiversity",
                "Rajasthan Soils: Soil types, distribution, erosion issues & conservation methods",
                "Rajasthan Minerals: Metallic & non-metallic minerals, distribution & major mining zones",
                "Rajasthan Demographics: Population distribution, growth, density, literacy, sex-ratio & tribes"
            ],
            5: [
                "Constitutional Development & Philosophy: Preamble, Salient Features, Fundamental Rights, Duties & DPSP",
                "Union Government: Executive (President, PM, Council of Ministers), Parliament & Supreme Court",
                "Constitutional & Non-Constitutional Bodies: Election Commission, CAG, UPSC, NHRC, NITI Aayog",
                "Indian Federalism: Centre-State relations, coalition politics & national integration",
                "Public Policy & Rights: Citizen charters, Right to Information (RTI), Lokpal, Lokayukta & legal rights"
            ],
            6: [
                "State Government: Governor, Chief Minister, Council of Ministers & Legislative Assembly",
                "Judiciary: Rajasthan High Court and subordinate judiciary",
                "State Commissions: RPSC, State Election Commission, State Information Commission & Lokayukta",
                "Local Self-Government: Panchayati Raj Institutions (73rd amendment) & Urban Local Bodies (74th amendment)",
                "Administrative Governance: District administration, citizen-centric services, RTPS Act & Rajasthan Sampark"
            ],
            7: [
                "Basic Economic Concepts: National Income, inflation, monetary policy, fiscal policy & RBI banking reforms",
                "Public Finance: Taxation system, GST, union budget & subsidy management",
                "Economic Planning & Development: Achievements, economic growth, human development index (HDI) & poverty",
                "Major Sectors of Indian Economy: Agricultural reforms, industrial policies, services sector & FDI policies",
                "Welfare Initiatives: Social security schemes, financial inclusion (Jan Dhan, UPI) & food security"
            ],
            8: [
                "Rajasthan SDP & Growth: State domestic product, macro-economic overview & state budget trends",
                "Rajasthan Agriculture: Agricultural production, cropping patterns, land reforms & cooperative societies",
                "Rajasthan Industry & Infrastructure: MSMEs, industrial parks, RIICO, power generation & road networks",
                "Rajasthan Services & Tourism: Tourism sector, heritage hotels, handicrafts export & state revenue",
                "Rajasthan Welfare Schemes: Chiranjeevi Health, Jan Aadhar, social security pensions & rural employment (MNREGA)"
            ],
            9: [
                "Everyday Science: Basic physics, chemistry, human body systems, food & nutrition & public health",
                "Information & Communication Technology: Computers, networking, internet, artificial intelligence (AI/ML), IoT",
                "Space & Defence Technology: Indian space program (ISRO, satellites, Chandrayaan) & defence systems (DRDO, missiles)",
                "Biotechnology & Nanotechnology: Applications, genetic engineering, cloning & nanomaterials",
                "Environmental Science: Biodiversity conservation, climate change, solid waste management & eco-systems"
            ],
            10: [
                "Logical & Analytical Reasoning: Statements, arguments, assumptions, courses of action, coding-decoding",
                "Mental Ability: Number series, alphanumeric series, blood relations, direction tests, venn diagrams",
                "Basic Numeracy: Averages, ratio-proportion, percentage, simple/compound interest, time-work, probability",
                "Data Interpretation: Bar charts, pie charts, tables, line graphs & data sufficiency"
            ],
            11: [
                "State Level: Major socio-political events, schemes, state achievements & personalities in news in Rajasthan",
                "National Level: Major national events, appointments, policies & bilateral agreements",
                "International Level: Global summits, world organizations, sports tournaments & international awards"
            ]
        };

        for (let i = 0; i < preSubjects.length; i++) {
            const subjectName = preSubjects[i];
            const subjectId = i + 1;
            // Insert Subject
            await run("INSERT INTO subjects (subject_id, tier_type, subject_name) VALUES (?, 'PRE', ?)", [subjectId, subjectName]);
            // Insert default Unit
            await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (?, ?, 'Core Unit')", [subjectId, subjectId]);
            // Insert Topics
            const topics = preTopicsMap[subjectId] || ["General Syllabus Topic"];
            for (let j = 0; j < topics.length; j++) {
                const topicName = topics[j];
                await run("INSERT INTO topics (unit_id, topic_name) VALUES (?, ?)", [subjectId, topicName]);
            }
        }

        // --- SEED MAINS SYLLABUS ---
        const mainsSubjects = [
            "PAPER I: GENERAL KNOWLEDGE AND GENERAL STUDIES (200 MARKS)",
            "PAPER II: GENERAL KNOWLEDGE AND GENERAL STUDIES (200 MARKS)",
            "PAPER III: GENERAL KNOWLEDGE AND GENERAL STUDIES (200 MARKS)",
            "PAPER IV: GENERAL HINDI AND GENERAL ENGLISH (200 MARKS)"
        ];

        // Insert Mains Subjects
        for (let i = 0; i < mainsSubjects.length; i++) {
            const subId = i + 12; // Start after Pre subjects
            await run("INSERT INTO subjects (subject_id, tier_type, subject_name) VALUES (?, 'MAINS', ?)", [subId, mainsSubjects[i]]);
        }

        // Seed Paper I Units & Topics
        // Unit I: History
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (12, 12, 'Unit I: History')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (101, 12, 'Part A - History, Art, Culture, Literature, Tradition and Heritage of Rajasthan')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (102, 12, 'Part B - Indian History & Culture')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (103, 12, 'Part C - History of Modern World (up to 1991 A.D.)')");

        // Unit II: Economics
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (13, 12, 'Unit II: Economics')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (104, 13, 'Part A - Indian Economy')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (105, 13, 'Part B - World Economy')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (106, 13, 'Part C - Economy of Rajasthan')");

        // Unit III: Sociology, Management, Accounting & Auditing
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (14, 12, 'Unit III: Sociology, Management, Accounting & Auditing')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (107, 14, 'Part A - Sociology')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (108, 14, 'Part B - Management')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (109, 14, 'Part C - Accounting & Auditing')");

        // Seed Paper II Units & Topics
        // Unit I: Administrative Ethics
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (15, 13, 'Unit I: Administrative Ethics')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (110, 15, 'Administrative Ethics & values, Rit/Rin, integrity, Geeta & Gandhian ethics, AI vs Conscience')");

        // Unit II: General Science & Technology
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (16, 13, 'Unit II: General Science & Technology')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (111, 16, 'Physics, Chemistry, Cell Biology, Biotech, Computer Science, Space/Defence, Quantum computing')");

        // Unit III: Earth Science (Geography & Geology)
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (17, 13, 'Unit III: Earth Science (Geography & Geology)')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (112, 17, 'World interior, Physical features, Climate, India physiography, Rajasthan geology & demographics')");

        // Seed Paper III Units & Topics
        // Unit I: Indian Polity, Governance, India and International Affairs and Current Affairs
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (18, 14, 'Unit I: Indian Polity, Governance, India & International Affairs')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (113, 18, 'Constitution, Union/State Executive, SC/HC, Party systems, Rajasthan Polity, Foreign Policy, G-20, QUAD')");

        // Unit II: Concepts, Issues and Dynamics of Public Administration
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (19, 14, 'Unit II: Concepts, Issues and Dynamics of Public Administration')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (114, 19, 'Evolution, NPA, NPM, Organisation principles, Personnel admin, comparative admin, Rajasthan admin')");

        // Unit III: Behavior and Law
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (20, 14, 'Unit III: Behavior and Law')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (115, 20, 'Emotional Intelligence, RAISEC Model, RTI/IT/DV/POSH/POCSO Acts, Land Revenue, BNS/BNSS 2023')");

        // Seed Paper IV Units & Topics
        // Unit I: General Hindi
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (21, 15, 'Unit I: General Hindi')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (116, 21, 'Part A Grammar (Prefix, Suffix, confusing words, corrections, idioms, admin terms)')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (117, 21, 'Part B & C (Precis, elaboration, translation formatting)')");

        // Unit II: General English
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (22, 15, 'Unit II: General English')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (118, 22, 'Part A Grammar & Usage (Prepositions, parts of speech, phrasal verbs, one-word substitutes)')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (119, 22, 'Parts B & C (Comprehension tracking, sentence translation formatting)')");

        // Unit III: Essay
        await run("INSERT INTO units (unit_id, subject_id, unit_name) VALUES (23, 15, 'Unit III: Essay')");
        await run("INSERT INTO topics (topic_id, unit_id, topic_name) VALUES (120, 23, 'Structured thematic essay buckets (Heritage, Society, Science, Economy, Disasters, Rajasthan Tourism)')");

        console.log("Mains syllabus structured successfully.");

        // --- SEED SAMPLE SUB-TOPICS (MINUTE TOPICS) ---
        const mtCount = await get("SELECT COUNT(*) as count FROM minute_topics WHERE topic_id = 1");
        if (mtCount.count === 0) {
            await run("INSERT INTO minute_topics (topic_id, minute_topic_name) VALUES (1, 'Kalibangan Site')");
            await run("INSERT INTO minute_topics (topic_id, minute_topic_name) VALUES (1, 'Ahar Culture')");
            await run("INSERT INTO minute_topics (topic_id, minute_topic_name) VALUES (1, 'Bairat Excavations')");
            await run("INSERT INTO minute_topics (topic_id, minute_topic_name) VALUES (1, 'Bagor Mesolithic Site')");
            await run("INSERT INTO minute_topics (topic_id, minute_topic_name) VALUES (1, 'Ganeshwar Copper Age')");
            console.log("Seeded 5 default sub-topics for Topic 1.");
        }

        // --- SEED SAMPLE QUESTIONS ---
        // Seed some Pre questions for Topic 1: Pre-historic sites (Kalibangan, Ahar, Bairat)
        const samplePreQuestions = [
            {
                topic_id: 1,
                minute_topic_id: 1, // Kalibangan Site
                question_text: "Which of the following Harappan archaeological sites in India has yielded the earliest evidence of a ploughed field?",
                option_a: "Banawali",
                option_b: "Kalibangan",
                option_c: "Rakhigarhi",
                option_d: "Dholavira",
                correct_option: "B",
                detailed_explanation: "Evidence of a pre-Harappan ploughed field was discovered during excavations at Kalibangan in Hanumangarh district, Rajasthan. It represents the earliest grid-pattern agricultural furrowing found in the ancient world."
            },
            {
                topic_id: 1,
                minute_topic_id: 1, // Kalibangan Site
                question_text: "The Kalibangan archaeological site is situated along the banks of which river in Rajasthan?",
                option_a: "Luni River",
                option_b: "Chambal River",
                option_c: "Ghaggar River",
                option_d: "Banas River",
                correct_option: "C",
                detailed_explanation: "Kalibangan, located in Hanumangarh district, is a major Harappan civilization site situated on the left bank of the seasonal Ghaggar River (identified by some as the ancient Sarasvati)."
            },
            {
                topic_id: 1,
                minute_topic_id: 2, // Ahar Culture
                question_text: "At which of the following pre-historic sites of Rajasthan, was a copper tool warehouse (Tamravati) discovered?",
                option_a: "Ahar",
                option_b: "Bairat",
                option_c: "Kalibangan",
                option_d: "Bagor",
                correct_option: "A",
                detailed_explanation: "Ahar, located near Udaipur on the Banas river basin, is known as Tamravati (the copper city) because of the abundance of copper tools and smelters discovered there."
            },
            {
                topic_id: 2,
                question_text: "Who was the real consolidator and real founder of the Guhil dynasty of Mewar who captured Chittor?",
                option_a: "Maharana Pratap",
                option_b: "Rana Sanga",
                option_c: "Bappa Rawal",
                option_d: "Rawal Jaitra Singh",
                correct_option: "C",
                detailed_explanation: "Bappa Rawal (historically identified as Kalbhoj) captured Chittor from Man Mori of the Mori dynasty in 734 AD and established the Guhil dynasty's dominance, constructing the temple of Eklingji."
            },
            {
                topic_id: 38,
                question_text: "Under RPSC administrative patterns, who appoints the Chairman of the Rajasthan Public Service Commission?",
                option_a: "The President of India",
                option_b: "The Governor of Rajasthan",
                option_c: "The Chief Justice of Rajasthan High Court",
                option_d: "The Chief Minister of Rajasthan",
                correct_option: "B",
                detailed_explanation: "As per Article 316 of the Constitution of India, the Chairman and other members of a State Public Service Commission are appointed by the Governor of the State. However, they can only be removed by the President of India."
            },
            {
                topic_id: 53,
                question_text: "Which Indian Satellite launch vehicle launched the historic Chandrayaan-3 mission?",
                option_a: "PSLV-C56",
                option_b: "GSLV-MkIII / LVM3",
                option_c: "SSLV-D2",
                option_d: "GSLV-F12",
                correct_option: "B",
                detailed_explanation: "LVM3-M4 (formerly GSLV Mark III) successfully launched Chandrayaan-3 into orbit from Sriharikota launch center on July 14, 2023."
            },
            {
                topic_id: 110,
                question_text: "Which of the following describes the moral concept of 'Rin' (debt) in Administrative Ethics derived from ancient Indian philosophy?",
                option_a: "Obligation to refund monetary loans taken from treasury",
                option_b: "Cosmic order governing natural processes",
                option_c: "Three-fold moral obligation towards Gods, Sages, and Ancestors",
                option_d: "State rules of administrative discipline",
                correct_option: "C",
                detailed_explanation: "In ancient Indian ethics, Rin represents the moral and spiritual debts an individual owes (Deva Rin to gods, Rishi Rin to sages, Pitru Rin to ancestors), emphasizing duty and selfless action."
            },
            {
                topic_id: 115,
                question_text: "Under the RTI Act 2005, what is the standard time limit for a Public Information Officer (PIO) to respond to an application?",
                option_a: "15 Days",
                option_b: "30 Days",
                option_c: "45 Days",
                option_d: "60 Days",
                correct_option: "B",
                detailed_explanation: "Under Section 7(1) of the RTI Act 2005, the PIO must either provide the information or reject the application within 30 days of receiving the request. (Reduced to 48 hours if it concerns the life or liberty of a person)."
            }
        ];

        for (const q of samplePreQuestions) {
            await run(`
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [q.topic_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.detailed_explanation, q.minute_topic_id || null]);
        }

        console.log("Sample question bank seeded successfully.");

        // Seed sample Mains questions if none exist
        const mainsQCount = await get("SELECT COUNT(*) as count FROM mains_questions");
        if (mainsQCount.count === 0) {
            const defaultMainsQs = [
                {
                    topic_id: 101,
                    question_text: "Discuss the political and cultural achievements of Bappa Rawal in the history of Mewar.",
                    model_answer: "Bappa Rawal (ruled c. 734-753 AD) is considered the real founder of Mewar dynasty. 1. Military achievements: He defeated the Arab invaders who were expanding into Western India. 2. Territorial consolidation: He captured the Chittor fort from Mori rulers. 3. Cultural contribution: He built the Eklingji Temple (deity of the Guhils) near Udaipur. He issued gold coins which established Mewar's economic autonomy.",
                    language: "EN",
                    sequence_order: 1
                },
                {
                    topic_id: 101,
                    question_text: "मेवाड़ के इतिहास में बप्पा रावल की राजनीतिक और सांस्कृतिक उपलब्धियों की चर्चा कीजिए।",
                    model_answer: "बप्पा रावल (शासन लगभग 734-753 ई.) को मेवाड़ राजवंश का वास्तविक संस्थापक माना जाता है। 1. सैन्य उपलब्धियाँ: उन्होंने पश्चिमी भारत में बढ़ रहे अरब आक्रमणकारियों को पराजित किया। 2. क्षेत्रीय एकीकरण: उन्होंने मोरी शासकों से चित्तौड़गढ़ किला जीता। 3. सांस्कृतिक योगदान: उन्होंने उदयपुर के निकट एकलिंगजी मंदिर का निर्माण कराया। उन्होंने सोने के सिक्के जारी किए जो मेवाड़ की आर्थिक स्वायत्तता को दर्शाते हैं।",
                    language: "HI",
                    sequence_order: 1
                },
                {
                    topic_id: 110,
                    question_text: "Examine the relevance of the Gandhian concept of Trusteeship in modern public administration.",
                    model_answer: "The Trusteeship model posits that wealthy individuals and public officials are mere trustees of societal resources. In public administration, it translates to: 1. Ethical stewardship of public funds. 2. Selfless service without personal gain. 3. Promoting social justice and equal opportunities for the vulnerable.",
                    language: "EN",
                    sequence_order: 1
                },
                {
                    topic_id: 110,
                    question_text: "आधुनिक लोक प्रशासन में गांधीवादी 'न्यासधारिता' (ट्रस्टीशिप) की अवधारणा की प्रासंगिकता का परीक्षण कीजिए।",
                    model_answer: "न्यासधारिता मॉडल का मानना है कि धनी व्यक्ति और सार्वजनिक अधिकारी समाज के संसाधनों के केवल ट्रस्टी (संरक्षक) हैं। लोक प्रशासन में, इसका अर्थ है: 1. सार्वजनिक धन का नैतिक प्रबंधन। 2. व्यक्तिगत लाभ के बिना निःस्वार्थ सेवा। 3. समाज के कमजोर वर्गों के लिए सामाजिक न्याय और समान अवसरों को बढ़ावा देना।",
                    language: "HI",
                    sequence_order: 1
                }
            ];
            for (const q of defaultMainsQs) {
                await run(`
                    INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order)
                    VALUES (?, ?, ?, ?, ?)
                `, [q.topic_id, q.question_text, q.model_answer, q.language, q.sequence_order]);
            }
            console.log("Seeded default Mains descriptive Q&As.");
        }

    } catch (err) {
        console.error("Error seeding database:", err.message);
    }
}

async function seedPlaceholderQuestionsIfNeeded() {
    try {
        console.log("Starting comprehensive database check and random question seeding...");

        // 1. Seed Pre syllabus topics with at least 3 EN and 3 HI questions
        const allPreTopics = await all("SELECT topic_id, topic_name FROM topics WHERE topic_id < 100");
        let preTopicsSeeded = 0;
        for (const topic of allPreTopics) {
            // Check English
            const enCount = await get("SELECT COUNT(*) as count FROM questions WHERE topic_id = ? AND language = 'EN' AND minute_topic_id IS NULL", [topic.topic_id]);
            const neededEn = 3 - enCount.count;
            for (let k = 0; k < neededEn; k++) {
                const suffix = neededEn > 1 ? ` (Sample ${k + 1})` : "";
                await run(`
                    INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EN')
                `, [
                    topic.topic_id,
                    `Practice MCQ Question${suffix} for: ${topic.topic_name}`,
                    `Option A regarding ${topic.topic_name}`,
                    `Option B regarding ${topic.topic_name}`,
                    `Option C regarding ${topic.topic_name}`,
                    `Option D regarding ${topic.topic_name}`,
                    'A',
                    `This is the detailed explanation for ${topic.topic_name}.`
                ]);
                preTopicsSeeded++;
            }
            // Check Hindi
            const hiCount = await get("SELECT COUNT(*) as count FROM questions WHERE topic_id = ? AND language = 'HI' AND minute_topic_id IS NULL", [topic.topic_id]);
            const neededHi = 3 - hiCount.count;
            for (let k = 0; k < neededHi; k++) {
                const suffix = neededHi > 1 ? ` (नमूना ${k + 1})` : "";
                await run(`
                    INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'HI')
                `, [
                    topic.topic_id,
                    `${topic.topic_name} के लिए अभ्यास प्रश्न${suffix}`,
                    `विकल्प A: ${topic.topic_name} का विवरण`,
                    `विकल्प B: ${topic.topic_name} का विवरण`,
                    `विकल्प C: ${topic.topic_name} का विवरण`,
                    `विकल्प D: ${topic.topic_name} का विवरण`,
                    'A',
                    `यह ${topic.topic_name} के लिए विस्तृत व्याख्या और आदर्श उत्तर है।`
                ]);
                preTopicsSeeded++;
            }
        }
        if (preTopicsSeeded > 0) {
            console.log(`Seeded ${preTopicsSeeded} placeholder questions for Pre syllabus topics.`);
        }

        // 2. Seed all minute topics (sub-topics) with at least 1 EN and 1 HI question
        const allMinuteTopics = await all("SELECT minute_topic_id, topic_id, minute_topic_name FROM minute_topics WHERE topic_id NOT IN (11, 12, 13, 102)");
        let minuteTopicsSeeded = 0;
        for (const mt of allMinuteTopics) {
            const isMains = mt.topic_id >= 100;
            if (isMains) {
                // Check English
                const enCount = await get("SELECT COUNT(*) as count FROM mains_questions WHERE minute_topic_id = ? AND language = 'EN'", [mt.minute_topic_id]);
                if (enCount.count === 0) {
                    await run(`
                        INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id)
                        VALUES (?, ?, ?, 'EN', 1, ?)
                    `, [
                        mt.topic_id,
                        `Explain the key components and administrative relevance of the sub-topic: ${mt.minute_topic_name}`,
                        `This is the suggested model answer for sub-topic ${mt.minute_topic_name}. It details all structural aspects and critical points required by RPSC Mains standards to score high marks.`,
                        mt.minute_topic_id
                    ]);
                    minuteTopicsSeeded++;
                }
                // Check Hindi
                const hiCount = await get("SELECT COUNT(*) as count FROM mains_questions WHERE minute_topic_id = ? AND language = 'HI'", [mt.minute_topic_id]);
                if (hiCount.count === 0) {
                    await run(`
                        INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id)
                        VALUES (?, ?, ?, 'HI', 1, ?)
                    `, [
                        mt.topic_id,
                        `सब-टॉपिक: ${mt.minute_topic_name} के प्रमुख घटकों और प्रशासनिक प्रासंगिकता की व्याख्या कीजिए।`,
                        `यह सब-टॉपिक ${mt.minute_topic_name} के लिए सुझाया गया मॉडल उत्तर है। इसमें आरपीएससी मुख्य परीक्षा के मानकों के अनुसार उच्च अंक प्राप्त करने के लिए सभी संरचनात्मक पहलुओं और महत्वपूर्ण बिंदुओं का विवरण दिया गया है।`,
                        mt.minute_topic_id
                    ]);
                    minuteTopicsSeeded++;
                }
            } else {
                // Check English
                const enCount = await get("SELECT COUNT(*) as count FROM questions WHERE minute_topic_id = ? AND language = 'EN'", [mt.minute_topic_id]);
                if (enCount.count === 0) {
                    await run(`
                        INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'EN')
                    `, [
                        mt.topic_id,
                        `Practice MCQ Question for Sub-topic: ${mt.minute_topic_name}`,
                        `Option A for ${mt.minute_topic_name}`,
                        `Option B for ${mt.minute_topic_name}`,
                        `Option C for ${mt.minute_topic_name}`,
                        `Option D for ${mt.minute_topic_name}`,
                        'A',
                        `This is the detailed explanation for sub-topic ${mt.minute_topic_name}.`,
                        mt.minute_topic_id
                    ]);
                    minuteTopicsSeeded++;
                }
                // Check Hindi
                const hiCount = await get("SELECT COUNT(*) as count FROM questions WHERE minute_topic_id = ? AND language = 'HI'", [mt.minute_topic_id]);
                if (hiCount.count === 0) {
                    await run(`
                        INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'HI')
                    `, [
                        mt.topic_id,
                        `सब-टॉपिक: ${mt.minute_topic_name} के लिए अभ्यास प्रश्न`,
                        `विकल्प A: ${mt.minute_topic_name} का विवरण`,
                        `विकल्प B: ${mt.minute_topic_name} का विवरण`,
                        `विकल्प C: ${mt.minute_topic_name} का विवरण`,
                        `विकल्प D: ${mt.minute_topic_name} का विवरण`,
                        'A',
                        `यह सब-टॉपिक ${mt.minute_topic_name} के लिए विस्तृत व्याख्या है।`,
                        mt.minute_topic_id
                    ]);
                    minuteTopicsSeeded++;
                }
            }
        }
        if (minuteTopicsSeeded > 0) {
            console.log(`Seeded ${minuteTopicsSeeded} placeholder questions for sub-topics.`);
        }

        

        // 3. Seed all PYQ exams with at least 1 EN and 1 HI question
        const allPyqExams = await all("SELECT exam_id, exam_name, exam_year, tier_type FROM pyq_exams");
        let pyqSeeded = 0;
        for (const exam of allPyqExams) {
            if (exam.tier_type === 'MAINS') {
                // Check English
                const enCount = await get("SELECT COUNT(*) as count FROM mains_questions WHERE exam_id = ? AND language = 'EN'", [exam.exam_id]);
                if (enCount.count === 0) {
                    await run(`
                        INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, exam_id)
                        VALUES (101, ?, ?, 'EN', 1, ?)
                    `, [
                        `Descriptive Past Year Question from ${exam.exam_name} (${exam.exam_year})`,
                        `This is the suggested model answer for the past year question from ${exam.exam_name}.`,
                        exam.exam_id
                    ]);
                    pyqSeeded++;
                }
                // Check Hindi
                const hiCount = await get("SELECT COUNT(*) as count FROM mains_questions WHERE exam_id = ? AND language = 'HI'", [exam.exam_id]);
                if (hiCount.count === 0) {
                    await run(`
                        INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, exam_id)
                        VALUES (101, ?, ?, 'HI', 1, ?)
                    `, [
                        `${exam.exam_name} (${exam.exam_year}) से वर्णनात्मक विगत वर्ष का प्रश्न`,
                        `यह ${exam.exam_name} विगत वर्ष की परीक्षा के प्रश्न के लिए सुझाया गया मॉडल उत्तर है।`,
                        exam.exam_id
                    ]);
                    pyqSeeded++;
                }
            } else {
                // Check English
                const enCount = await get("SELECT COUNT(*) as count FROM pyq_questions WHERE exam_id = ? AND language = 'EN'", [exam.exam_id]);
                if (enCount.count === 0) {
                    await run(`
                        INSERT INTO pyq_questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language, sequence_order)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EN', 1)
                    `, [
                        exam.exam_id,
                        `Past Year Question for ${exam.exam_name} (${exam.exam_year})`,
                        `Option A from official answer key`,
                        `Option B from official answer key`,
                        `Option C from official answer key`,
                        `Option D from official answer key`,
                        'A',
                        `This is the detailed explanation for ${exam.exam_name} past paper question.`
                    ]);
                    pyqSeeded++;
                }
                // Check Hindi
                const hiCount = await get("SELECT COUNT(*) as count FROM pyq_questions WHERE exam_id = ? AND language = 'HI'", [exam.exam_id]);
                if (hiCount.count === 0) {
                    await run(`
                        INSERT INTO pyq_questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language, sequence_order)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'HI', 1)
                    `, [
                        exam.exam_id,
                        `${exam.exam_name} (${exam.exam_year}) के लिए विगत वर्ष का प्रश्न`,
                        `विकल्प A: आधिकारिक उत्तर कुंजी के अनुसार`,
                        `विकल्प B: आधिकारिक उत्तर कुंजी के अनुसार`,
                        `विकल्प C: आधिकारिक उत्तर कुंजी के अनुसार`,
                        `विकल्प D: आधिकारिक उत्तर कुंजी के अनुसार`,
                        'A',
                        `यह ${exam.exam_name} विगत वर्ष की परीक्षा के प्रश्न का विस्तृत स्पष्टीकरण है।`
                    ]);
                    pyqSeeded++;
                }
            }
        }
        if (pyqSeeded > 0) {
            console.log(`Seeded ${pyqSeeded} placeholder questions for PYQ exams.`);
        }

        // 4. Seed all Mains topics with at least 1 EN and 1 HI descriptive question
        const allMainsTopics = await all("SELECT topic_id, topic_name FROM topics WHERE topic_id >= 100");
        let mainsSeeded = 0;
        for (const topic of allMainsTopics) {
            // Check English
            const enCount = await get("SELECT COUNT(*) as count FROM mains_questions WHERE topic_id = ? AND language = 'EN' AND exam_id IS NULL AND minute_topic_id IS NULL", [topic.topic_id]);
            if (enCount.count === 0) {
                await run(`
                    INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order)
                    VALUES (?, ?, ?, 'EN', 1)
                `, [
                    topic.topic_id,
                    `Explain the key components and administrative relevance of: ${topic.topic_name}`,
                    `This is the suggested model answer for ${topic.topic_name}. It details all structural aspects and critical points required by RPSC Mains standards to score high marks.`
                ]);
                mainsSeeded++;
            }
            // Check Hindi
            const hiCount = await get("SELECT COUNT(*) as count FROM mains_questions WHERE topic_id = ? AND language = 'HI' AND exam_id IS NULL AND minute_topic_id IS NULL", [topic.topic_id]);
            if (hiCount.count === 0) {
                await run(`
                    INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order)
                    VALUES (?, ?, ?, 'HI', 1)
                `, [
                    topic.topic_id,
                    `${topic.topic_name} के प्रमुख घटकों और प्रशासनिक प्रासंगिकता की व्याख्या कीजिए।`,
                    `यह ${topic.topic_name} के लिए सुझाया गया मॉडल उत्तर है। इसमें आरपीएससी मुख्य परीक्षा के मानकों के अनुसार उच्च अंक प्राप्त करने के लिए सभी संरचनात्मक पहलुओं और महत्वपूर्ण बिंदुओं का विवरण दिया गया है।`
                ]);
                mainsSeeded++;
            }
        }
        if (mainsSeeded > 0) {
            console.log(`Seeded ${mainsSeeded} placeholder questions for Mains topics.`);
        }

    } catch (e) {
        console.error("Error in seeding placeholder questions:", e.message);
    }
}

// Export database interface functions
module.exports = {
    initDatabase,
    run,
    get,
    all,
    
    // Core Auth Operations
    getUserByMobile: (mobile) => get("SELECT * FROM users WHERE mobile_number = ?", [mobile]),
    createUser: (mobile) => run("INSERT INTO users (mobile_number) VALUES (?)", [mobile]),
    updateUserSubscription: (mobile, expiry, planName = '24-Hour Free Trial') => run("UPDATE users SET expiry_timestamp = ?, active_plan = ? WHERE mobile_number = ?", [expiry, planName, mobile]),
    setUserTrialUsed: (mobile) => run("UPDATE users SET has_used_trial = 1 WHERE mobile_number = ?", [mobile]),
    
    // Syllabus Operations
    getSubjects: (tier) => all("SELECT * FROM subjects WHERE tier_type = ?", [tier]),
    getUnitsBySubject: (subId) => all("SELECT * FROM units WHERE subject_id = ?", [subId]),
    getTopicsByUnit: (unitId) => all("SELECT * FROM topics WHERE unit_id = ?", [unitId]),
    
    // Full Syllabus hierarchy lookup
    getFullSyllabus: async (tier) => {
        const subjects = await all("SELECT * FROM subjects WHERE tier_type = ?", [tier]);
        for (const sub of subjects) {
            const units = await all("SELECT * FROM units WHERE subject_id = ?", [sub.subject_id]);
            for (const unit of units) {
                unit.topics = await all("SELECT * FROM topics WHERE unit_id = ?", [unit.unit_id]);
            }
            sub.units = units;
        }
        return subjects;
    },

    // Strict No-Repeat Quiz Generator (with Language Filter & Minute Topic support)
    generateQuiz: async (userId, topicIds, limit = 10, language = 'EN', minuteTopicId = null) => {
        // Enforce Strict No-Repeat Guard and language filter
        let questions = [];
        if (minuteTopicId) {
            questions = await all(`
                SELECT q.*, t.topic_name FROM questions q
                JOIN topics t ON q.topic_id = t.topic_id
                WHERE q.minute_topic_id = ?
                  AND q.language = ?
                  AND q.question_id NOT IN (
                      SELECT question_id FROM user_quiz_history WHERE user_id = ?
                  )
                ORDER BY RANDOM()
                LIMIT ?
            `, [minuteTopicId, language, userId, limit]);
        } else {
            const placeholders = topicIds.map(() => '?').join(',');
            questions = await all(`
                SELECT q.*, t.topic_name FROM questions q
                JOIN topics t ON q.topic_id = t.topic_id
                WHERE q.topic_id IN (${placeholders})
                  AND q.language = ?
                  AND q.question_id NOT IN (
                      SELECT question_id FROM user_quiz_history WHERE user_id = ?
                  )
                ORDER BY RANDOM()
                LIMIT ?
            `, [...topicIds, language, userId, limit]);
        }

        // Guard: Recycle previously attempted questions if the pool is exhausted
        if (questions.length < limit) {
            console.log(`[Quiz Engine] Question pool exhausted for user ${userId} (${language}). Recycling.`);
            const extraLimit = limit - questions.length;
            let recycledQuestions = [];
            if (minuteTopicId) {
                recycledQuestions = await all(`
                    SELECT q.*, t.topic_name FROM questions q
                    JOIN topics t ON q.topic_id = t.topic_id
                    WHERE q.minute_topic_id = ?
                      AND q.language = ?
                    ORDER BY RANDOM()
                    LIMIT ?
                `, [minuteTopicId, language, extraLimit]);
            } else {
                const placeholders = topicIds.map(() => '?').join(',');
                recycledQuestions = await all(`
                    SELECT q.*, t.topic_name FROM questions q
                    JOIN topics t ON q.topic_id = t.topic_id
                    WHERE q.topic_id IN (${placeholders})
                      AND q.language = ?
                    ORDER BY RANDOM()
                    LIMIT ?
                `, [...topicIds, language, extraLimit]);
            }

            // Combine and ensure unique questions
            const loadedIds = new Set(questions.map(q => q.question_id));
            for (const rq of recycledQuestions) {
                if (!loadedIds.has(rq.question_id) && questions.length < limit) {
                    questions.push(rq);
                }
            }
        }

        return questions;
    },

    // Save user quiz attempts
    saveQuizAttempt: async (userId, questionId, timestamp) => {
        return run(`
            INSERT OR REPLACE INTO user_quiz_history (user_id, question_id, attempted_timestamp)
            VALUES (?, ?, ?)
        `, [userId, questionId, timestamp]);
    },

    // Admin Stats
    getAdminStats: async () => {
        const usersCount = await get("SELECT COUNT(*) as count FROM users");
        const questionsCount = await get("SELECT COUNT(*) as count FROM questions");
        const mainsQuestionsCount = await get("SELECT COUNT(*) as count FROM mains_questions");
        const topicsStats = await all(`
            SELECT t.topic_id, t.topic_name, s.subject_name, 
            (SELECT COUNT(*) FROM questions WHERE topic_id = t.topic_id) as q_count,
            (SELECT COUNT(*) FROM mains_questions WHERE topic_id = t.topic_id) as mq_count
            FROM topics t
            JOIN units u ON t.unit_id = u.unit_id
            JOIN subjects s ON u.subject_id = s.subject_id
            GROUP BY t.topic_id
        `);
        return {
            usersCount: usersCount.count,
            questionsCount: questionsCount.count,
            mainsQuestionsCount: mainsQuestionsCount.count,
            topicsStats
        };
    },

    // Support Queries Operations
    saveSupportQuery: (userId, text, timestamp) => run("INSERT INTO support_queries (user_id, query_text, timestamp) VALUES (?, ?, ?)", [userId, text, timestamp]),
    getSupportQueries: () => all("SELECT sq.*, u.mobile_number FROM support_queries sq JOIN users u ON sq.user_id = u.user_id ORDER BY sq.timestamp DESC"),
    clearSupportQuery: (queryId) => run("DELETE FROM support_queries WHERE query_id = ?", [queryId]),

    getMinuteTopicsByTopic: (topicId, language = 'EN') => all(`
        SELECT mt.*, 
               (SELECT COUNT(*) FROM questions q WHERE q.minute_topic_id = mt.minute_topic_id) as q_count,
               (SELECT COUNT(*) FROM mains_questions mq WHERE mq.minute_topic_id = mt.minute_topic_id) as mq_count
        FROM minute_topics mt
        WHERE mt.topic_id = ? AND mt.language = ?
    `, [topicId, language]),
    createMinuteTopic: (topicId, name, language = 'EN') => run("INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (?, ?, ?)", [topicId, name, language]),
    clearMinuteTopicQuestions: async (minuteTopicId) => {
        await run("DELETE FROM questions WHERE minute_topic_id = ?", [minuteTopicId]);
        await run("DELETE FROM mains_questions WHERE minute_topic_id = ?", [minuteTopicId]);
    },

    // PYQs Operations
    getPyqExams: () => all("SELECT * FROM pyq_exams ORDER BY exam_year DESC"),
    getPyqQuestions: (examId, language = 'EN') => all("SELECT * FROM pyq_questions WHERE exam_id = ? AND language = ? ORDER BY sequence_order ASC", [examId, language]),
    createPyqExam: (name, year, tier) => run("INSERT INTO pyq_exams (exam_name, exam_year, tier_type) VALUES (?, ?, ?)", [name, year, tier]),

    // Mains Questions Operations
    getMainsQuestions: (topicIds, language = 'EN') => {
        const placeholders = topicIds.map(() => '?').join(',');
        return all(`
            SELECT mq.*, t.topic_name 
            FROM mains_questions mq
            JOIN topics t ON mq.topic_id = t.topic_id
            WHERE mq.topic_id IN (${placeholders}) AND mq.language = ?
            ORDER BY mq.sequence_order ASC
        `, [...topicIds, language]);
    },
    createMainsQuestion: (topicId, questionText, modelAnswer, language, sequenceOrder) => run(`
        INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order)
        VALUES (?, ?, ?, ?, ?)
    `, [topicId, questionText, modelAnswer, language, sequenceOrder]),
    clearMainsQuestions: (topicId) => run("DELETE FROM mains_questions WHERE topic_id = ?", [topicId]),
    clearAllQuestions: async () => {
        await run("DELETE FROM user_quiz_history;");
        await run("DELETE FROM questions;");
        await run("DELETE FROM mains_questions;");
        await run("DELETE FROM pyq_questions;");
        try {
            await run("DELETE FROM sqlite_sequence WHERE name IN ('questions', 'mains_questions', 'pyq_questions');");
        } catch (seqErr) {
            // Ignore if sqlite_sequence doesn't exist
        }
        // Write the flag to prevent re-seeding placeholders on next server reboot
        const flagPath = path.join(__dirname, 'placeholder_seeded.flag');
        if (!fs.existsSync(flagPath)) {
            fs.writeFileSync(flagPath, 'true', 'utf8');
        }
    }
};

// Initialize DB immediately
initDatabase();
