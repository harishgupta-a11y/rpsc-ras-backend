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

        // Migrations: Add language and minute_topic_id columns to questions if not present
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

        console.log("All SQLite tables verified successfully.");

        // Seed default PYQ Exams if none exist
        const pyqExamsCount = await get("SELECT COUNT(*) as count FROM pyq_exams");
        if (pyqExamsCount.count === 0) {
            const defaultExams = [
                { name: "RPSC RAS Prelims 2023", year: 2023 },
                { name: "RPSC RAS Prelims 2021", year: 2021 },
                { name: "RPSC RAS Prelims 2018", year: 2018 },
                { name: "RPSC RAS Prelims 2016", year: 2016 },
                { name: "RPSC RAS Prelims 2015", year: 2015 },
                { name: "RPSC RAS Prelims 2013", year: 2013 },
                { name: "RPSC RAS Prelims 2012", year: 2012 },
                { name: "RPSC RAS Prelims 2010", year: 2010 },
                { name: "RPSC RAS Prelims 2008", year: 2008 },
                { name: "RPSC RAS Prelims 2007", year: 2007 }
            ];
            for (const exam of defaultExams) {
                await run("INSERT INTO pyq_exams (exam_name, exam_year) VALUES (?, ?)", [exam.name, exam.year]);
            }
            console.log("Seeded 10 default PYQ Exams.");
            
            // Seed a sample question for RAS Pre 2023
            await run(`
                INSERT INTO pyq_questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language, sequence_order)
                VALUES (1, 'Which of the following sites has yielded the earliest evidence of agriculture in the Indian subcontinent?', 'Mehrgarh', 'Lahuradewa', 'Koldihwa', 'Bagor', 'A', 'Mehrgarh is a Neolithic site located on the Bolan pass on the Kachi plain of Balochistan, Pakistan. It provides the earliest evidence of farming and herding in South Asia.', 'EN', 1)
            `);
            // Seed a sample question in Hindi
            await run(`
                INSERT INTO pyq_questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language, sequence_order)
                VALUES (1, 'भारतीय उपमहाद्वीप में कृषि के प्राचीनतम साक्ष्य किस स्थल से प्राप्त हुए हैं?', 'मेहरगढ़', 'लहुरादेव', 'कोल्डिहवा', 'बागोर', 'A', 'मेहरगढ़ पाकिस्तान के बलूचिस्तान में कच्ची मैदान पर बोलन दर्रे के पास स्थित एक नवपाषाण कालीन स्थल है। यह दक्षिण एशिया में खेती और पशुपालन के सबसे पुराने साक्ष्य प्रदान करता है।', 'HI', 1)
            `);
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

        // --- SEED SAMPLE QUESTIONS ---
        // Seed some Pre questions for Topic 1: Pre-historic sites (Kalibangan, Ahar, Bairat)
        const samplePreQuestions = [
            {
                topic_id: 1,
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
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [q.topic_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.detailed_explanation]);
        }

        console.log("Sample question bank seeded successfully.");

    } catch (err) {
        console.error("Error seeding database:", err.message);
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
        const topicsStats = await all(`
            SELECT t.topic_id, t.topic_name, s.subject_name, COUNT(q.question_id) as q_count 
            FROM topics t
            JOIN units u ON t.unit_id = u.unit_id
            JOIN subjects s ON u.subject_id = s.subject_id
            LEFT JOIN questions q ON q.topic_id = t.topic_id
            GROUP BY t.topic_id
        `);
        return {
            usersCount: usersCount.count,
            questionsCount: questionsCount.count,
            topicsStats
        };
    },

    // Support Queries Operations
    saveSupportQuery: (userId, text, timestamp) => run("INSERT INTO support_queries (user_id, query_text, timestamp) VALUES (?, ?, ?)", [userId, text, timestamp]),
    getSupportQueries: () => all("SELECT sq.*, u.mobile_number FROM support_queries sq JOIN users u ON sq.user_id = u.user_id ORDER BY sq.timestamp DESC"),
    clearSupportQuery: (queryId) => run("DELETE FROM support_queries WHERE query_id = ?", [queryId]),

    // Minute Topics Operations
    getMinuteTopicsByTopic: (topicId) => all("SELECT * FROM minute_topics WHERE topic_id = ?", [topicId]),
    createMinuteTopic: (topicId, name) => run("INSERT INTO minute_topics (topic_id, minute_topic_name) VALUES (?, ?)", [topicId, name]),
    clearMinuteTopicQuestions: (minuteTopicId) => run("DELETE FROM questions WHERE minute_topic_id = ?", [minuteTopicId]),

    // PYQs Operations
    getPyqExams: () => all("SELECT * FROM pyq_exams ORDER BY exam_year DESC"),
    getPyqQuestions: (examId, language = 'EN') => all("SELECT * FROM pyq_questions WHERE exam_id = ? AND language = ? ORDER BY sequence_order ASC", [examId, language]),
    createPyqExam: (name, year) => run("INSERT INTO pyq_exams (exam_name, exam_year) VALUES (?, ?)", [name, year])
};

// Initialize DB immediately
initDatabase();
