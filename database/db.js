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
                expiry_timestamp INTEGER DEFAULT NULL
            );
        `);

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
        const flagPath = path.join(__dirname, 'placeholder_seeded.flag');
        if (!fs.existsSync(flagPath)) {
            await seedPlaceholderQuestionsIfNeeded();
            fs.writeFileSync(flagPath, 'true', 'utf8');
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
                "Ancient India: Indus Valley & Vedic Civilizations, Rigvedic polity and assemblies (Sabha & Samiti)",
                "Ancient India: Buddhism, Jainism, six systems of philosophy & religious reform movements",
                "Ancient & Medieval India: Achievements of Mauryas, Guptas, Harshavardhana, Cholas, Pallavas & Rashtrakutas",
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
        const allMinuteTopics = await all("SELECT minute_topic_id, topic_id, minute_topic_name FROM minute_topics");
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
    updateUserSubscription: (mobile, expiry) => run("UPDATE users SET expiry_timestamp = ? WHERE mobile_number = ?", [expiry, mobile]),
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
