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
        
        // Alter tables to add localized columns
        try {
            await run("ALTER TABLE subjects ADD COLUMN subject_name_hi TEXT;");
        } catch (e) {}
        try {
            await run("ALTER TABLE units ADD COLUMN unit_name_hi TEXT;");
        } catch (e) {}
        try {
            await run("ALTER TABLE topics ADD COLUMN topic_name_hi TEXT;");
        } catch (e) {}

        // Seeding Hindi translations for subjects
        try {
            const subjectTrans = [
                { id: 1, name: "राजस्थान का इतिहास, कला, संस्कृति, साहित्य, परंपरा और विरासत" },
                { id: 2, name: "भारत का इतिहास (प्राचीन, मध्यकालीन और आधुनिक काल)" },
                { id: 3, name: "विश्व और भारत का भूगोल" },
                { id: 4, name: "राजस्थान का भूगोल" },
                { id: 5, name: "भारतीय संविधान, राजनीतिक व्यवस्था और शासन" },
                { id: 6, name: "राजस्थान की राजनीतिक और प्रशासनिक व्यवस्था" },
                { id: 7, name: "आर्थिक अवधारणाएं और भारतीय अर्थव्यवस्था" },
                { id: 8, name: "राजस्थान की अर्थव्यवस्था" },
                { id: 9, name: "विज्ञान और प्रौद्योगिकी" },
                { id: 10, name: "तर्कशक्ति और मानसिक योग्यता" },
                { id: 11, name: "सामयिकी और मुद्दे (राजस्थान के विशेष संदर्भ में)" },
                { id: 12, name: "प्रश्न पत्र I: सामान्य ज्ञान और सामान्य अध्ययन (200 अंक)" },
                { id: 13, name: "प्रश्न पत्र II: सामान्य ज्ञान और सामान्य अध्ययन (200 अंक)" },
                { id: 14, name: "प्रश्न पत्र III: सामान्य ज्ञान और सामान्य अध्ययन (200 अंक)" },
                { id: 15, name: "प्रश्न पत्र IV: सामान्य हिंदी और सामान्य अंग्रेजी (200 अंक)" }
            ];
            for (const s of subjectTrans) {
                await run("UPDATE subjects SET subject_name_hi = ? WHERE subject_id = ?", [s.name, s.id]);
            }
        } catch (err) {
            console.error("Failed to seed subject translations:", err.message);
        }

        // Seeding Hindi translations for units
        try {
            await run("UPDATE units SET unit_name_hi = 'मुख्य इकाई' WHERE unit_name = 'Core Unit'");
            await run("UPDATE units SET unit_name_hi = 'इकाई I: इतिहास' WHERE unit_id = 12");
            await run("UPDATE units SET unit_name_hi = 'इकाई II: अर्थशास्त्र' WHERE unit_id = 13");
            await run("UPDATE units SET unit_name_hi = 'इकाई III: समाजशास्त्र, प्रबंधन, लेखांकन और अंकेक्षण' WHERE unit_id = 14");
            await run("UPDATE units SET unit_name_hi = 'इकाई I: प्रशासनिक नीतिशास्त्र' WHERE unit_id = 15");
            await run("UPDATE units SET unit_name_hi = 'इकाई II: सामान्य विज्ञान और प्रौद्योगिकी' WHERE unit_id = 16");
            await run("UPDATE units SET unit_name_hi = 'इकाई III: पृथ्वी विज्ञान (भूगोल और भूविज्ञान)' WHERE unit_id = 17");
            await run("UPDATE units SET unit_name_hi = 'इकाई I: भारतीय राजनीति, शासन, भारत और अंतर्राष्ट्रीय मामले' WHERE unit_id = 18");
            await run("UPDATE units SET unit_name_hi = 'इकाई II: लोक प्रशासन की अवधारणाएं, मुद्दे और गतिकी' WHERE unit_id = 19");
            await run("UPDATE units SET unit_name_hi = 'इकाई III: व्यवहार और कानून' WHERE unit_id = 20");
            await run("UPDATE units SET unit_name_hi = 'इकाई I: सामान्य हिंदी' WHERE unit_id = 21");
            await run("UPDATE units SET unit_name_hi = 'इकाई II: सामान्य अंग्रेजी' WHERE unit_id = 22");
            await run("UPDATE units SET unit_name_hi = 'इकाई III: निबंध' WHERE unit_id = 23");
        } catch (err) {
            console.error("Failed to seed unit translations:", err.message);
        }

        // Seeding Hindi translations for topics
        try {
            const topicTrans = [
                { id: 1, name: "राजस्थान के प्रागैतिहासिक स्थल: पुरापाषाण से ताम्रपाषाण और कांस्य युग (कालीबंगा, आहड़, बैराठ, बागोर, गणेश्वर)" },
                { id: 2, name: "राजस्थान के प्रमुख राजवंश और उनकी उपलब्धियां: गुहिल, चौहान, राठौड़, परमार, कछवाहा" },
                { id: 3, name: "राजस्थान के प्रमुख राजवंशों की प्रशासनिक और राजस्व व्यवस्था" },
                { id: 4, name: "राजस्थान में राजनीतिक जागृति और 1857 का विद्रोह" },
                { id: 5, name: "राजस्थान में किसान, आदिवासी और प्रजामंडल आंदोलन" },
                { id: 6, name: "राजस्थान का एकीकरण: राज्य गठन के सात चरण" },
                { id: 7, name: "राजस्थान की स्थापत्य विरासत: किले, महल, मंदिर, बावड़ी और छतरियां" },
                { id: 8, name: "राजस्थान की प्रदर्शन कलाएँ: लोक संगीत, वाद्य यंत्र, लोक नृत्य और लोक नाटक" },
                { id: 9, name: "राजस्थानी बोलियाँ, भाषा और प्रमुख ऐतिहासिक साहित्य" },
                { id: 10, name: "राजस्थान के धार्मिक संप्रदाय, संत, लोक देवता (पंच पीर) और मेले/त्योहार" },
                { id: 11, name: "भारत की सांस्कृतिक आधार - सिंधु और वैदिक काल; 6वीं शताब्दी ईसा पूर्व के धार्मिक विचार (आजीवक, बौद्ध और जैन धर्म)" },
                { id: 12, name: "प्रमुख राजवंशों के प्रमुख शासकों की उपलब्धियाँ: मौर्य, कुषाण, सातवाहन, गुप्त, चालुक्य, पल्लव और चोल" },
                { id: 13, name: "प्राचीन भारत में कला, वास्तुकला, वैज्ञानिक विकास और भारतीय ज्ञान/मूल्य प्रणाली" },
                { id: 14, name: "मध्यकालीन भारत: दिल्ली सल्तनत और मुगल साम्राज्य - प्रशासन, कला, वास्तुकला और साहित्य" },
                { id: 15, name: "मध्यकालीन भारत: भक्ति आंदोलन, सूफीवाद और सांस्कृतिक संश्लेषण" },
                { id: 16, name: "आधुनि‍क भारत: 19वीं और 20वीं शताब्दी में सामाजिक-धार्मिक सुधार आंदोलन" },
                { id: 17, name: "आधुनि‍क भारत: भारतीय राष्ट्रीय आंदोलन - 1857 का विद्रोह, प्रारंभिक चरण, स्वदेशी, गांधीवादी युग और स्वतंत्रता संग्राम" },
                { id: 18, name: "स्वतंत्रता के बाद का भारत: रियासतों का एकीकरण और राज्यों का भाषाई पुनर्गठन" },
                { id: 19, name: "विश्व के प्रमुख भौतिक स्वरूप: पर्वत, पठार, मैदान, झीलें और हिमनद" },
                { id: 20, name: "भूकंप और ज्वालामुखी: प्रकार, कारण, प्रभाव और वैश्विक वितरण" },
                { id: 21, name: "भारत भौतिक स्वरूप: हिमालय, विशाल मैदान, प्रायद्वीपीय पठार, तटीय मैदान और द्वीप समूह" },
                { id: 22, name: "भारत अपवाह: प्रमुख नदी प्रणालियाँ, झीलें और बहुउद्देशीय परियोजनाएं" },
                { id: 23, name: "भारत के संसाधन: प्रमुख खनिज (लोहा, कोयला, बॉक्साइट, अभ्रक) और ऊर्जा संसाधन (पारंपरिक और नवीकरणीय)" },
                { id: 24, name: "भारत का आर्थिक भूगोल: कृषि, प्रमुख फसलें, सिंचाई प्रणालियाँ और कृषि आधारित उद्योग" },
                { id: 25, name: "राजस्थान भौतिक: भू-आकृतिक विभाजन, भूवैज्ञानिक संरचनाएं और जलवायु वर्गीकरण" },
                { id: 26, name: "राजस्थान अपवाह: प्रमुख नदी बेसिन, झीलें और जल संरक्षण प्रणालियाँ" },
                { id: 27, name: "राजस्थान के संसाधन: प्राकृतिक वनस्पति, वन क्षेत्र, वन्यजीव अभयारण्य और जैव विविधता" },
                { id: 28, name: "राजस्थान की मिट्टी: मिट्टी के प्रकार, वितरण, कटाव के मुद्दे और संरक्षण के तरीके" },
                { id: 29, name: "राजस्थान के खनिज: धात्विक और गैर-धात्विक खनिज, वितरण और प्रमुख खनन क्षेत्र" },
                { id: 30, name: "राजस्थान जनसांख्यिकी: जनसंख्या वितरण, वृद्धि, घनत्व, साक्षरता, लिंगानुपात और जनजातियाँ" },
                { id: 31, name: "संवैधानिक विकास और दर्शन: प्रस्तावना, मुख्य विशेषताएं, मौलिक अधिकार, कर्तव्य और नीति निदेशक तत्व (DPSP)" },
                { id: 32, name: "संघीय सरकार: कार्यपालिका (राष्ट्रपति, प्रधानमंत्री, मंत्रिपरिषद), संसद और सर्वोच्च न्यायालय" },
                { id: 33, name: "संवैधानिक और गैर-संवैधानिक निकाय: चुनाव आयोग, कैग (CAG), यूपीएससी (UPSC), एनएचआरसी (NHRC), नीति आयोग" },
                { id: 34, name: "भारतीय संघवाद: केंद्र-राज्य संबंध, गठबंधन की राजनीति और राष्ट्रीय एकीकरण" },
                { id: 35, name: "सार्वजनिक नीति और अधिकार: नागरिक चार्टर, सूचना का अधिकार (RTI), लोकपाल, लोकायुक्त और कानूनी अधिकार" },
                { id: 36, name: "राज्य सरकार: राज्यपाल, मुख्यमंत्री, मंत्रिपरिषद और विधानसभा" },
                { id: 37, name: "न्यायपालिका: राजस्थान उच्च न्यायालय और अधीनस्थ न्यायपालिका" },
                { id: 38, name: "राज्य आयोग: आरपीएससी (RPSC), राज्य चुनाव आयोग, राज्य सूचना आयोग और लोकायुक्त" },
                { id: 39, name: "स्थानीय स्वशासन: पंचायती राज संस्थाएं (73वां संशोधन) और शहरी स्थानीय निकाय (74वां संशोधन)" },
                { id: 40, name: "प्रशासनिक शासन: जिला प्रशासन, नागरिक-केंद्रित सेवाएं, आरटीपीएस (RTPS) अधिनियम और राजस्थान संपर्क" },
                { id: 41, name: "बुनियादी आर्थिक अवधारणाएं: राष्ट्रीय आय, मुद्रास्फीति, मौद्रिक नीति, राजकोषीय नीति और आरबीआई (RBI) बैंकिंग सुधार" },
                { id: 42, name: "लोक वित्त: कराधान प्रणाली, जीएसटी (GST), केंद्रीय बजट और सब्सिडी प्रबंधन" },
                { id: 43, name: "आर्थिक नियोजन और विकास: उपलब्धियां, आर्थिक विकास, मानव विकास सूचकांक (HDI) और गरीबी" },
                { id: 44, name: "भारतीय अर्थव्यवस्था के प्रमुख क्षेत्र: कृषि सुधार, औद्योगिक नीतियां, सेवा क्षेत्र और एफडीआई (FDI) नीतियां" },
                { id: 45, name: "कल्याणकारी पहल: सामाजिक सुरक्षा योजनाएं, वित्तीय समावेशन (जन धन, यूपीआई) और खाद्य सुरक्षा" },
                { id: 46, name: "राजस्थान एसडीपी और विकास: राज्य घरेलू उत्पाद, व्यापक आर्थिक अवलोकन और राज्य बजट रुझान" },
                { id: 47, name: "राजस्थान कृषि: कृषि उत्पादन, फसल पैटर्न, भूमि सुधार और सहकारी समितियां" },
                { id: 48, name: "राजस्थान उद्योग और बुनियादी ढांचा: एमएसएमई (MSME), औद्योगिक पार्क, रीको (RIICO), बिजली उत्पादन और सड़क नेटवर्क" },
                { id: 49, name: "राजस्थान सेवाएं और पर्यटन: पर्यटन क्षेत्र, heritage होटल, हस्तशिल्प निर्यात और राज्य राजस्व" },
                { id: 50, name: "राजस्थान कल्याणकारी योजनाएं: चिरंजीवी स्वास्थ्य, जन आधार, सामाजिक सुरक्षा पेंशन और ग्रामीण रोजगार (मनरेगा)" },
                { id: 51, name: "दैनिक विज्ञान: बुनियादी भौतिकी, रसायन विज्ञान, मानव शरीर प्रणालियाँ, भोजन और पोषण और सार्वजनिक स्वास्थ्य" },
                { id: 52, name: "सूचना और संचार प्रौद्योगिकी: कंप्यूटर, नेटवर्किंग, internet, कृत्रिम बुद्धिमत्ता (AI/ML), आईओटी (IoT)" },
                { id: 53, name: "अंतरिक्ष और रक्षा प्रौद्योगिकी: भारतीय अंतरिक्ष कार्यक्रम (इसरो, उपग्रह, चंद्रयान) और रक्षा प्रणालियाँ (डीआरडीओ, मिसाइल)" },
                { id: 54, name: "बायोटेक्नोलॉजी और नैनोटेक्नोलॉजी: अनुप्रयोग, जेनेटिक इंजीनियरिंग, क्लोनिंग और नैनोमैटेरियल्स" },
                { id: 55, name: "पर्यावरण विज्ञान: जैव विविधता संरक्षण, जलवायु परिवर्तन, ठोस अपशिष्ट प्रबंधन और पारिस्थितिकी तंत्र" },
                { id: 56, name: "तार्किक और विश्लेषणात्मक तर्क: कथन, तर्क, धारणाएं, कार्रवाई के पाठ्यक्रम, कोडिंग-डिकोडिंग" },
                { id: 57, name: "मानसिक क्षमता: संख्या श्रृंखला, अक्षरांकीय श्रृंखला, रक्त संबंध, दिशा परीक्षण, वेन आरेख" },
                { id: 58, name: "बुनियादी संख्यात्मकता: औसत, अनुपात-समानुपात, प्रतिशत, साधारण/चक्रवृद्धि ब्याज, समय-कार्य, प्रायिकता" },
                { id: 59, name: "डेटा व्याख्या: बार चार्ट, पाई चार्ट, तालिकाएं, रेखा आलेख और डेटा पर्याप्तता" },
                { id: 60, name: "राज्य स्तर: प्रमुख सामाजिक-राजनीतिक कार्यक्रम, योजनाएं, राज्य की उपलब्धियां और राजस्थान में चर्चा में रहे व्यक्तित्व" },
                { id: 61, name: "राष्ट्रीय स्तर: प्रमुख राष्ट्रीय कार्यक्रम, नियुक्तियां, नीतियां और द्विपक्षीय समझौते" },
                { id: 62, name: "अंतरराष्ट्रीय स्तर: वैश्विक शिखर सम्मेलन, विश्व संगठन, खेल प्रतियोगिताएं और अंतरराष्ट्रीय पुरस्कार" },
                { id: 101, name: "भाग ए - राजस्थान का इतिहास, कला, संस्कृति, साहित्य, परंपरा और विरासत" },
                { id: 102, name: "भाग बी - भारतीय इतिहास और संस्कृति" },
                { id: 103, name: "भाग सी - आधुनिक विश्व का इतिहास (1991 ई. तक)" },
                { id: 104, name: "भाग ए - भारतीय अर्थव्यवस्था" },
                { id: 105, name: "भाग बी - वैश्विक अर्थव्यवस्था" },
                { id: 106, name: "भाग सी - राजस्थान की अर्थव्यवस्था" },
                { id: 107, name: "भाग ए - समाजशास्त्र" },
                { id: 108, name: "भाग बी - प्रबंधन" },
                { id: 109, name: "भाग सी - लेखांकन और अंकेक्षण" },
                { id: 110, name: "इकाई I: प्रशासनिक नीतिशास्त्र" },
                { id: 111, name: "इकाई II: सामान्य विज्ञान और प्रौद्योगिकी" },
                { id: 112, name: "इकाई III: पृथ्वी विज्ञान (भूगोल और भूविज्ञान)" },
                { id: 113, name: "इकाई I: भारतीय राजनीति, शासन, भारत और अंतर्राष्ट्रीय मामले" },
                { id: 114, name: "इकाई II: लोक प्रशासन की अवधारणाएं, मुद्दे और गतिकी" },
                { id: 115, name: "इकाई III: व्यवहार और कानून" },
                { id: 116, name: "इकाई I: सामान्य हिंदी - भाग ए व्याकरण" },
                { id: 117, name: "इकाई I: सामान्य हिंदी - भाग बी और सी लेखन" },
                { id: 118, name: "इकाई II: सामान्य अंग्रेजी - भाग ए व्याकरण" },
                { id: 119, name: "इकाई II: सामान्य अंग्रेजी - भाग बी और सी लेखन" },
                { id: 120, name: "इकाई III: निबंध - संरचित विषयगत श्रेणियां" }
            ];
            for (const t of topicTrans) {
                await run("UPDATE topics SET topic_name_hi = ? WHERE topic_id = ?", [t.name, t.id]);
            }
        } catch (err) {
            console.error("Failed to seed topic translations:", err.message);
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

        // 2.7 Seed custom high-quality questions for Performing Arts of Rajasthan (Folk Dances, Music & Dramas - Topic 8 & 101)
        const performingArtsPreCount = await get("SELECT COUNT(*) as count FROM questions WHERE topic_id = 8");
        if (performingArtsPreCount.count <= 6) {
            console.log("Seeding custom high-quality questions for Performing Arts of Rajasthan (Pre)...");
            await run("DELETE FROM questions WHERE topic_id = 8");
            
            const customPreQuestions = [
                {
                    lang: 'EN',
                    text: 'Q. "Sawai" is a technical term associated with which folk dance of Rajasthan, representing a specific movement of the feet?\nA) Kalbelia\nB) Kathak\nC) Ghoomar\nD) Bhavai',
                    option_a: 'Kalbelia',
                    option_b: 'Kathak',
                    option_c: 'Ghoomar',
                    option_d: 'Bhavai',
                    correct: 'C',
                    explanation: 'In the Ghoomar dance, the performers move in a circular motion with intricate footwork. The specific fast movement or the distinct rhythmic steps taken by the dancers are locally known as \'Sawai\'. This dance was originally performed by the Bhil tribe to worship Goddess Saraswati and was later embraced by other Rajasthani communities.'
                },
                {
                    lang: 'HI',
                    text: 'Q. "सवाई" राजस्थान के किस लोक नृत्य से जुड़ा एक तकनीकी शब्द है, जो पैरों की एक विशिष्ट गति का प्रतिनिधित्व करता है?\nA) कालबेलिया\nB) कथक\nC) घूमर\nD) भवाई',
                    option_a: 'कालबेलिया',
                    option_b: 'कथक',
                    option_c: 'घूमर',
                    option_d: 'भवाई',
                    correct: 'C',
                    explanation: 'घूमर नृत्य में नर्तक जटिल फुटवर्क के साथ गोलाकार गति में चलते हैं। नर्तकियों द्वारा उठाए गए विशिष्ट तीव्र कदमों या लयबद्ध चरणों को स्थानीय रूप से \'सवाई\' कहा जाता है। यह नृत्य मूल रूप से भील जनजाति द्वारा देवी सरस्वती की पूजा के लिए किया जाता था और बाद में अन्य राजस्थानी समुदायों द्वारा अपनाया गया।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Consider the following statements regarding the \'Terah Tali\' dance:\n1. It is performed by women of the Kamad sect.\n2. It involves the use of 13 Manjeeras (cymbals).\n3. It is primarily performed during the fair of Baba Ramdevji.\n4. It originated from Padarla village in Pali.\nWhich of the statements given above are correct?\nA) 1 and 3 only\nB) 2 and 4 only\nC) 1, 2, and 3 only\nD) 1, 2, 3, and 4',
                    option_a: '1 and 3 only',
                    option_b: '2 and 4 only',
                    option_c: '1, 2, and 3 only',
                    option_d: '1, 2, 3, and 4',
                    correct: 'D',
                    explanation: 'All statements are correct. Terah Tali is a devotional dance performed by women of the Kamad community. They tie 13 Manjeeras (cymbals) to their body (mostly legs) and strike them with the ones in their hands in a rhythmic pattern while sitting. It is a key feature of the Ramdevra fair and originated in Padarla, Pali.'
                },
                {
                    lang: 'HI',
                    text: 'Q. \'तेरहताली\' नृत्य के संबंध में निम्नलिखित कथनों पर विचार कीजिए:\n1. यह कामड़ संप्रदाय की महिलाओं द्वारा किया जाता है।\n2. इसमें 13 मंजीरों का उपयोग शामिल है।\n3. यह मुख्य रूप से बाबा रामदेवजी के मेले के दौरान किया जाता है।\n4. इसकी उत्पत्ति पाली के पादरला गांव से हुई थी।\nउपरोक्त कथनों में से कौन से सही हैं?\nA) केवल 1 और 3\nB) केवल 2 और 4\nC) केवल 1, 2 और 3\nD) 1, 2, 3 और 4',
                    option_a: 'केवल 1 और 3',
                    option_b: 'केवल 2 और 4',
                    option_c: 'केवल 1, 2 और 3',
                    option_d: '1, 2, 3 और 4',
                    correct: 'D',
                    explanation: 'सभी कथन सही हैं। तेरहताली कामड़ समुदाय की महिलाओं द्वारा किया जाने वाला एक भक्ति नृत्य है। वे अपने शरीर (ज्यादातर पैरों) पर 13 मंजीरे बांधती हैं और बैठकर एक लयबद्ध पैटर्न में अपने हाथों में रखे मंजीरों से उन पर प्रहार करती हैं। यह रामदेवरा मेले की एक प्रमुख विशेषता है और इसकी उत्पत्ति पादरला, पाली में हुई थी।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Which of the following folk dances is unique because it is performed without any musical instrument?\nA) Valar\nB) Gair\nC) Rayan\nD) Kud',
                    option_a: 'Valar',
                    option_b: 'Gair',
                    option_c: 'Rayan',
                    option_d: 'Kud',
                    correct: 'A',
                    explanation: 'The Valar dance is a famous dance of the Garasia tribe, primarily performed in the Sirohi district. It is unique because it is performed without the accompaniment of any musical instrument. It involves slow, rhythmic movements by men and women in semi-circles.'
                },
                {
                    lang: 'HI',
                    text: 'Q. निम्नलिखित में से कौन सा लोक नृत्य अनोखा है क्योंकि यह बिना किसी वाद्य यंत्र के किया जाता है?\nA) वालर\nB) गैर\nC) रायण\nD) कूद',
                    option_a: 'वालर',
                    option_b: 'गैर',
                    option_c: 'रायण',
                    option_d: 'कूद',
                    correct: 'A',
                    explanation: 'वालर नृत्य गरासिया जनजाति का एक प्रसिद्ध नृत्य है, जो मुख्य रूप से सिरोही जिले में किया जाता है। यह अनोखा है क्योंकि यह बिना किसी वाद्य यंत्र के किया जाता है। इसमें पुरुषों और महिलाओं द्वारा अर्धवृत्त में धीमी, लयबद्ध गतियाँ शामिल होती हैं।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Match the following Regional Dances with their primary regions:\nDance | Region\nI. Bam Dance | a. Shekhawati\nII. Chang Dance | b. Alwar-Bharatpur\nIII. Dhol Dance | c. Jalore\nIV. Agni Dance | d. Bikaner (Katriyasar)\nSelect the correct option:\nA) I-b, II-a, III-c, IV-d\nB) I-a, II-b, III-d, IV-c\nC) I-b, II-a, III-d, IV-c\nD) I-c, II-d, III-a, IV-b',
                    option_a: 'I-b, II-a, III-c, IV-d',
                    option_b: 'I-a, II-b, III-d, IV-c',
                    option_c: 'I-b, II-a, III-d, IV-c',
                    option_d: 'I-c, II-d, III-a, IV-b',
                    correct: 'A',
                    explanation: 'Bam Dance (Bam Rasiya) is popular in the Alwar-Bharatpur region and involves a large drum (Bam). Chang dance is a male-dominated dance from the Shekhawati region performed during Holi. Dhol dance is a professional dance of the Jalore region performed by the Thakna style. Agni (Fire) dance is performed by the Jasnathi sect in Katriyasar, Bikaner.'
                },
                {
                    lang: 'HI',
                    text: 'Q. निम्नलिखित क्षेत्रीय नृत्यों को उनके प्राथमिक क्षेत्रों से सुमेलित कीजिए:\nनृत्य | क्षेत्र\nI. बम नृत्य | a. शेखावाटी\nII. चंग नृत्य | b. अलवर-भरतपुर\nIII. ढोल नृत्य | c. जालौर\nIV. अग्नि नृत्य | d. बीकानेर (कतरीयासर)\nसही विकल्प का चयन करें:\nA) I-b, II-a, III-c, IV-d\nB) I-a, II-b, III-d, IV-c\nC) I-b, II-a, III-d, IV-c\nD) I-c, II-d, III-a, IV-b',
                    option_a: 'I-b, II-a, III-c, IV-d',
                    option_b: 'I-a, II-b, III-d, IV-c',
                    option_c: 'I-b, II-a, III-d, IV-c',
                    option_d: 'I-c, II-d, III-a, IV-b',
                    correct: 'A',
                    explanation: 'बम नृत्य (बम रसिया) अलवर-भरतपुर क्षेत्र में लोकप्रिय है और इसमें एक बड़ा ड्रम (बम) शामिल है। चंग नृत्य होली के दौरान किया जाने वाला शेखावाटी क्षेत्र का पुरुष प्रधान नृत्य है। ढोल नृत्य जालौर क्षेत्र का एक व्यावसायिक नृत्य है जो थाकना शैली द्वारा किया जाता है। अग्नि नृत्य बीकानेर के कतरीयासर में जसनाथी संप्रदाय द्वारा किया जाता है।'
                },
                {
                    lang: 'EN',
                    text: 'Q. In which folk dance do performers balance seven to nine brass pitchers or earthen pots on their heads while dancing on the edge of a sword or crushed glass?\nA) Chari\nB) Bhavai\nC) Panihari\nD) Kalbelia',
                    option_a: 'Chari',
                    option_b: 'Bhavai',
                    option_c: 'Panihari',
                    option_d: 'Kalbelia',
                    correct: 'B',
                    explanation: 'Bhavai is a spectacular genre of folk dance known for its stunts. Performers, often from the Bhavai, Jat, Meena, or Kalbelia communities, balance multiple pots on their heads and perform difficult feats like dancing on glass, swords, or picking up a handkerchief from the ground with their mouth.'
                },
                {
                    lang: 'HI',
                    text: 'Q. किस लोक नृत्य में नर्तक अपने सिर पर सात से नौ पीतल के घड़े या मिट्टी के बर्तन संतुलित करते हुए तलवार की धार या कांच के टुकड़ों पर नृत्य करते हैं?\nA) चरी\nB) भवाई\nC) पणहारी\nD) कालबेलिया',
                    option_a: 'चरी',
                    option_b: 'भवाई',
                    option_c: 'पणहारी',
                    option_d: 'कालबेलिया',
                    correct: 'B',
                    explanation: 'भवाई लोक नृत्य की एक शानदार शैली है जो अपने स्टंट के लिए जानी जाती है। कलाकार, जो अक्सर भवाई, जाट, मीणा या कालबेलिया समुदायों से होते हैं, अपने सिर पर कई बर्तन संतुलित करते हैं और कांच, तलवारों पर नृत्य करने या अपने मुंह से जमीन से रुमाल उठाने जैसे कठिन कारनामे करते हैं।'
                },
                {
                    lang: 'EN',
                    text: 'Q. The \'Thakna\' style is associated with which musical instrument and dance form?\nA) Nagada - Gair Dance\nB) Dhol - Dhol Dance\nC) Chang - Gindar Dance\nD) Mandal - Gawri Dance',
                    option_a: 'Nagada - Gair Dance',
                    option_b: 'Dhol - Dhol Dance',
                    option_c: 'Chang - Gindar Dance',
                    option_d: 'Mandal - Gawri Dance',
                    correct: 'B',
                    explanation: 'The \'Thakna\' style refers to a specific rhythmic pattern played on the Dhol. This style is used to signal the beginning of the Dhol dance, which is famous in the Jalore region. It is traditionally performed by men of the Mali, Dholi, Sargara, and Bhil communities.'
                },
                {
                    lang: 'HI',
                    text: 'Q. \'थाकना\' शैली का संबंध किस वाद्य यंत्र और नृत्य रूप से है?\nA) नगाड़ा - गैर नृत्य\nB) ढोल - ढोल नृत्य\nC) चंग - गीदड़ नृत्य\nD) मांदल - गौरी नृत्य',
                    option_a: 'नगाड़ा - गैर नृत्य',
                    option_b: 'ढोल - ढोल नृत्य',
                    option_c: 'चंग - गीदड़ नृत्य',
                    option_d: 'मांदल - गौरी नृत्य',
                    correct: 'B',
                    explanation: '\'थाकना\' शैली ढोल पर बजाए जाने वाले एक विशिष्ट लयबद्ध पैटर्न को संदर्भित करती है। इस शैली का उपयोग ढोल नृत्य की शुरुआत का संकेत देने के लिए किया जाता है, जो जालौर क्षेत्र में प्रसिद्ध है। यह पारंपरिक रूप से माली, ढोली, सरगरा और भील समुदायों के पुरुषों द्वारा किया जाता है।'
                },
                {
                    lang: 'EN',
                    text: 'Q. \'Gulabo Sapera\' is a world-renowned exponent of which folk dance that was inscribed on the UNESCO Representative List of the Intangible Cultural Heritage of Humanity?\nA) Ghoomar\nB) Kalbelia\nC) Chari\nD) Kathputli',
                    option_a: 'Ghoomar',
                    option_b: 'Kalbelia',
                    option_c: 'Chari',
                    option_d: 'Kathputli',
                    correct: 'B',
                    explanation: 'Gulabo Sapera is the most famous dancer of the Kalbelia dance form. The Kalbelia folk songs and dances of Rajasthan were declared part of the UNESCO Intangible Cultural Heritage of Humanity in 2010. It is characterized by black swirling skirts and serpentine movements.'
                },
                {
                    lang: 'HI',
                    text: 'Q. \'गुलाबो सपेरा\' किस राजस्थानी लोक नृत्य की विश्व प्रसिद्ध प्रतिपादक हैं जिसे यूनेस्को की अमूर्त सांस्कृतिक विरासत सूची में शामिल किया गया?\nA) घूमर\nB) कालबेलिया\nC) चरी\nD) कठपुतली',
                    option_a: 'घूमर',
                    option_b: 'कालबेलिया',
                    option_c: 'चरी',
                    option_d: 'कठपुतली',
                    correct: 'B',
                    explanation: 'गुलाबो सपेरा कालबेलिया नृत्य शैली की सबसे प्रसिद्ध नर्तकी हैं। राजस्थान के कालबेलिया लोक गीतों और नृत्यों को 2010 में यूनेस्को की अमूर्त सांस्कृतिक विरासत का हिस्सा घोषित किया गया था। इसकी विशेषता काले रंग के लहराते स्कर्ट और सांप जैसी गतियाँ हैं।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Which dance is performed by the men of the Shekhawati region during Holi, where some men dress as women and are called \'Gangaur\' or \'Mehri\'?\nA) Ginder (Gindar)\nB) Chang\nC) Kachhi Ghodi\nD) Dhap',
                    option_a: 'Ginder (Gindar)',
                    option_b: 'Chang',
                    option_c: 'Kachhi Ghodi',
                    option_d: 'Dhap',
                    correct: 'A',
                    explanation: 'The Ginder (or Gindar) dance is a regional dance of Shekhawati performed during Holi. It is a male-only dance where some men dress in female attire to represent Gangaur (Gauri). It shares similarities with the Gair dance of Mewar but is specific to the Shekhawati region.'
                },
                {
                    lang: 'HI',
                    text: 'Q. होली के दौरान शेखावाटी क्षेत्र के पुरुषों द्वारा कौन सा नृत्य किया जाता है, जहां कुछ पुरुष महिलाओं के कपड़े पहनते हैं और उन्हें \'गणगौर\' या \'मेहरी\' कहा जाता है?\nA) गीदड़ (गींदर)\nB) चंग\nC) कच्छी घोड़ी\nD) ढाप',
                    option_a: 'गीदड़ (गींदर)',
                    option_b: 'चंग',
                    option_c: 'कच्छी घोड़ी',
                    option_d: 'ढाप',
                    correct: 'A',
                    explanation: 'गीदड़ (या गींदर) नृत्य होली के दौरान किया जाने वाला शेखावाटी का एक क्षेत्रीय नृत्य है। यह केवल पुरुषों द्वारा किया जाने वाला नृत्य है जहां कुछ पुरुष गणगौर (गौरी) का प्रतिनिधित्व करने के लिए महिलाओं की पोशाक पहनते हैं। यह मेवाड़ के गैर नृत्य के साथ समानताएं साझा करता है लेकिन शेखावाटी क्षेत्र के लिए विशिष्ट है।'
                },
                {
                    lang: 'EN',
                    text: 'Q. The \'Kachhi Ghodi\' dance, performed in the Shekhawati and Kuchaman regions, is primarily a:\nA) Devotional dance\nB) Martial/Pattern-making dance\nC) Harvest dance\nD) Funeral dance',
                    option_a: 'Devotional dance',
                    option_b: 'Martial/Pattern-making dance',
                    option_c: 'Harvest dance',
                    option_d: 'Funeral dance',
                    correct: 'B',
                    explanation: 'Kachhi Ghodi is a professional folk dance where men wear a dummy horse costume. It is a martial-style dance that depicts stories of local bandits (like Bhanwariya) and involves mock fights with swords. The dancers move in a manner that creates patterns resembling the opening and closing of a flower bud.'
                },
                {
                    lang: 'HI',
                    text: 'Q. शेखावाटी और कुचामन क्षेत्रों में किया जाने वाला \'कच्छी घोड़ी\' नृत्य मुख्य रूप से एक है:\nA) भक्ति नृत्य\nB) युद्ध/पैटर्न बनाने वाला नृत्य\nC) फसल कटाई नृत्य\nD) अंत्येष्टि नृत्य',
                    option_a: 'भक्ति नृत्य',
                    option_b: 'युद्ध/पैटर्न बनाने वाला नृत्य',
                    option_c: 'फसल कटाई नृत्य',
                    option_d: 'अंत्येष्टि नृत्य',
                    correct: 'B',
                    explanation: 'कच्छी घोड़ी एक व्यावसायिक लोक नृत्य है जहाँ पुरुष नकली घोड़े की पोशाक पहनते हैं। यह एक युद्ध-शैली का नृत्य है जो स्थानीय डाकुओं (जैसे भंवरिया) की कहानियों को दर्शाता है और इसमें तलवारों के साथ नकली लड़ाई शामिल होती है। नर्तक इस तरह से चलते हैं जिससे फूल की कली के खुलने और बंद होने जैसे पैटर्न बनते हैं।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Which dance form is associated with the \'Jasnathi Siddha\' sect and involves the chanting of "Fateh-Fateh"?\nA) Terah Tali\nB) Agni (Fire) Dance\nC) Gair\nD) Chari',
                    option_a: 'Terah Tali',
                    option_b: 'Agni (Fire) Dance',
                    option_c: 'Gair',
                    option_d: 'Chari',
                    correct: 'B',
                    explanation: 'The Agni (Fire) dance is performed by the men of the Jasnathi sect, originating from Katriyasar, Bikaner. The dancers step onto a bed of burning coals (Dhuna) chanting "Fateh-Fateh" (Victory-Victory). It displays their deep faith and protection by their Guru.'
                },
                {
                    lang: 'HI',
                    text: 'Q. कौन सा नृत्य रूप \'जसनाथी सिद्ध\' संप्रदाय से जुड़ा है और इसमें "फतेह-फतेह" का जाप शामिल है?\nA) तेरहताली\nB) अग्नि नृत्य\nC) गैर\nD) चरी',
                    option_a: 'तेरहताली',
                    option_b: 'अग्नि नृत्य',
                    option_c: 'गैर',
                    option_d: 'चरी',
                    correct: 'B',
                    explanation: 'अग्नि नृत्य कतरीयासर, बीकानेर के जसनाथी संप्रदाय के पुरुषों द्वारा किया जाता है। नर्तक "फतेह-फतेह" (विजय-विजय) का जाप करते हुए जलते कोयले (धुणा) के बिस्तरों पर कदम रखते हैं। यह उनके गहरे विश्वास और गुरु द्वारा सुरक्षा को दर्शाता है।'
                }
            ];

            for (const q of customPreQuestions) {
                await run(`
                    INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language)
                    VALUES (8, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct, q.explanation, q.lang]);
            }
            console.log("Seeded custom high-quality Pre questions for Performing Arts.");
        }

        const performingArtsMainsCount = await get("SELECT COUNT(*) as count FROM mains_questions WHERE topic_id = 101 AND exam_id IS NULL");
        if (performingArtsMainsCount.count <= 2) {
            console.log("Seeding custom high-quality questions for Performing Arts of Rajasthan (Mains)...");
            await run("DELETE FROM mains_questions WHERE topic_id = 101 AND exam_id IS NULL");

            const customMainsQuestions = [
                {
                    lang: 'EN',
                    text: 'Q. Define \'Sawai\' in the context of Ghoomar dance and explain its structural significance. [5 Marks, 50 Words]\n\nAnswer:',
                    model_answer: 'Introduction: \'Sawai\' is the defining technical footwork pattern of Ghoomar, the state dance of Rajasthan, symbolizing its classical grace.\n\nBody: It consists of a specific 8-step rhythmic movement (Ashta-taal) executed by dancers while spinning. It dictates the transition from slow posture shifts to high-speed circular motions.\n\nConclusion: Thus, Sawai elevates Ghoomar from a basic tribal routine to a highly structured, sophisticated folk art form.'
                },
                {
                    lang: 'HI',
                    text: 'Q. घूमर नृत्य के संदर्भ में \'सवाई\' को परिभाषित करें और इसके संरचनात्मक महत्व की व्याख्या करें। [5 अंक, 50 शब्द]\n\nउत्तर:',
                    model_answer: 'प्रस्तावना: \'सवाई\' राजस्थान के राज्य नृत्य घूमर की परिभाषित तकनीकी पदचाल (फुटवर्क) शैली है, जो इसकी शास्त्रीय गरिमा का प्रतीक है।\n\nमुख्य भाग: इसमें नर्तकियों द्वारा घूमते समय की जाने वाली एक विशिष्ट 8-चरणीय लयबद्ध गति (अष्ट-ताल) शामिल है। यह धीमी मुद्रा से तीव्र गति वाली गोलाकार गतियों में संक्रमण को निर्धारित करती है।\n\nनिष्कर्ष: इस प्रकार, सवाई घूमर को एक बुनियादी आदिवासी दिनचर्या से एक अत्यधिक संरचित, परिष्कृत लोक कला रूप में उन्नत करती है।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Analyze the occupational transition of the Kalbelia dance form post the Wildlife Protection Act, 1972. [5 Marks, 50 Words]\n\nAnswer:',
                    model_answer: 'Introduction: The Kalbelia dance of the traditional snake-charmer community represents a successful shift from nomadic survival to global intangible heritage.\n\nBody: The legal ban on catching snakes under the Wildlife Protection Act, 1972, forced the community to monetize their ritualistic, serpentine movements. They transformed street performances into professional stage arts.\n\nConclusion: This adaptive economic transition preserved their cultural identity, leading to its inclusion in the UNESCO Intangible Cultural Heritage list.'
                },
                {
                    lang: 'HI',
                    text: 'Q. वन्यजीव संरक्षण अधिनियम, 1972 के बाद कालबेलिया नृत्य शैली के व्यावसायिक संक्रमण का विश्लेषण करें। [5 अंक, 50 शब्द]\n\nउत्तर:',
                    model_answer: 'प्रस्तावना: पारंपरिक सपेरा समुदाय का कालबेलिया नृत्य खानाबदोश अस्तित्व से वैश्विक अमूर्त विरासत की ओर एक सफल बदलाव का प्रतिनिधित्व करता है।\n\nमुख्य भाग: वन्यजीव संरक्षण अधिनियम, 1972 के तहत सांपों को पकड़ने पर कानूनी प्रतिबंध ने समुदाय को अपनी अनुष्ठानिक, सर्पिलाकार गतियों को व्यावसायिक रूप देने के लिए मजबूर किया। उन्होंने सड़क पर होने वाले प्रदर्शनों को पेशेवर मंच कलाओं में बदल दिया।\n\nनिष्कर्ष: इस अनुकूलन आर्थिक संक्रमण ने उनकी सांस्कृतिक पहचान को बनाए रखा, जिससे इसे यूनेस्को की अमूर्त सांस्कृतिक विरासत सूची में शामिल किया गया।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Examine the ritualistic and performance dynamics of the \'Agni\' (Fire) dance. [5 Marks, 50 Words]\n\nAnswer:',
                    model_answer: 'Introduction: Agni dance is a specialized devotional performance native to Katriyasar (Bikaner), deeply intertwined with the socio-religious identity of the Jasnathi Siddha sect.\n\nBody: Performers enter a hypnotic state, walking over a bed of live charcoal (Dhuna) while chanting "Fateh-Fateh." The dance combines spiritual ecstasy with agrarian actions like crushing millet.\n\nConclusion: It serves as a powerful display of deep faith, psychological resilience, and divine protection.'
                },
                {
                    lang: 'HI',
                    text: 'Q. \'अग्नि\' नृत्य की अनुष्ठानिक और प्रदर्शन गतिशीलता का परीक्षण कीजिए। [5 अंक, 50 शब्द]\n\nउत्तर:',
                    model_answer: 'प्रस्तावना: अग्नि नृत्य कतरीयासर (बीकानेर) का एक विशिष्ट भक्ति प्रदर्शन है, जो जसनाथी सिद्ध संप्रदाय की सामाजिक-धार्मिक पहचान से गहराई से जुड़ा हुआ है।\n\nमुख्य भाग: नर्तक एक सम्मोहक अवस्था में प्रवेश करते हैं, "फतेह-फतेह" का जाप करते हुए जलते कोयले (धुणा) के बिस्तरों पर चलते हैं। यह नृत्य आध्यात्मिक आनंद को बाजरा कुचलने जैसी कृषि क्रियाओं के साथ जोड़ता है।\n\nनिष्कर्ष: यह गहरे विश्वास, मनोवैज्ञानिक लचीलेपन और दैवीय सुरक्षा के एक शक्तिशाली प्रदर्शन के रूप में कार्य करता है।'
                },
                {
                    lang: 'EN',
                    text: 'Q. "The folk dances of Rajasthan are not merely sources of entertainment but are deep reflections of the state\'s socio-religious fabric and geographical realities." Critically examine this statement with suitable examples. [10 Marks, 150 Words]\n\nAnswer:',
                    model_answer: 'Introduction: Rajasthan’s rich repository of folk dances is deeply intertwined with its harsh topography, tribal lineages, and devotional movements, transforming physical survival into expressive art.\n\nBody:\n* Geographical Realities: The acute water scarcity of the desert terrain directly shaped dances like Chari (Kishangarh) and Panihari, which celebrate the daily, arduous trek to fetch water. Similarly, open sand dunes of Bikaner provided the canvas for the sprawling Agni dance.\n* Socio-Religious Fabric: Dances serve as mediums of worship and social cohesion. The Terah Tali dance of the Kamad sect is an elaborate devotional offering to Baba Ramdevji, promoting subaltern spiritual equality. The Gawri dance-drama of the Bhils reinforces tribal ecology by honoring Lord Shiva and Mother Nature.\n* Tribal and Martial Identities: The martial heritage of the state is preserved through pattern-making dances like Kachhi Ghodi (Shekhawati) and the Hathi Mana sword dance of the Bhils.\n\nConclusion: Far from static entertainment, these dances act as living archives, preserving Rajasthan\'s historical memory, spiritual syncretism, and adaptive resilience.'
                },
                {
                    lang: 'HI',
                    text: 'Q. "राजस्थान के लोक नृत्य केवल मनोरंजन के साधन नहीं हैं बल्कि राज्य के सामाजिक-धार्मिक ताने-बाने और भौगोलिक वास्तविकताओं के गहरे प्रतिबिंब हैं।" उपयुक्त उदाहरणों के साथ इस कथन का समालोचनात्मक परीक्षण कीजिए। [10 अंक, 150 शब्द]\n\nउत्तर:',
                    model_answer: 'प्रस्तावना: राजस्थान के लोक नृत्यों का समृद्ध भंडार इसकी कठिन स्थलाकृति, जनजातीय वंशों और भक्ति आंदोलनों के साथ गहराई से जुड़ा हुआ है, जो भौतिक अस्तित्व को कलात्मक रूप में परिवर्तित करता है।\n\nमुख्य भाग:\n* भौगोलिक वास्तविकताएं: रेगिस्तानी इलाके में पानी की भारी कमी ने सीधे तौर पर चरी (किशनगढ़) और पणहारी जैसे नृत्यों को आकार दिया, जो पानी लाने की कठिन दैनिक यात्रा का उत्सव मनाते हैं। इसी तरह, बीकानेर के खुले रेत के टीलों ने फैले हुए अग्नि नृत्य के लिए मंच प्रदान किया।\n* सामाजिक-धार्मिक ताना-बाना: नृत्य पूजा और सामाजिक एकजुटता के माध्यम के रूप में कार्य करते हैं। कामड़ संप्रदाय का तेरहताली नृत्य बाबा रामदेवजी को समर्पित एक भक्ति प्रस्तुति है, जो आध्यात्मिक समानता को बढ़ावा देता है। भीलों का गौरी नृत्य-नाटक भगवान शिव और प्रकृति मां का सम्मान करके जनजातीय पारिस्थितिकी को सुदृढ़ करता है।\n* जनजातीय और सैन्य पहचान: राज्य की सैन्य विरासत को शेखावाटी के कच्छी घोड़ी और भीलों के हाथीमना तलवार नृत्य जैसे नृत्यों के माध्यम से संरक्षित किया गया है।\n\nनिष्कर्ष: स्थिर मनोरंजन से दूर, ये नृत्य जीवित अभिलेखागार के रूप में कार्य करते हैं, जो राजस्थान की ऐतिहासिक स्मृति, आध्यात्मिक समन्वय और अनुकूलन क्षमता को संरक्षित करते हैं।'
                }
            ];

            for (const q of customMainsQuestions) {
                await run(`
                    INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order)
                    VALUES (101, ?, ?, ?, 1)
                `, [q.text, q.model_answer, q.lang]);
            }
            console.log("Custom high-quality Performing Arts questions seeded successfully.");
        }

        // 2.8 Seed custom high-quality questions for Rajasthani Literature (Topic 9 & 101)
        const literaturePreCount = await get("SELECT COUNT(*) as count FROM questions WHERE topic_id = 9");
        if (literaturePreCount.count === 0) {
            console.log("Seeding custom high-quality questions for Rajasthani Literature (Pre)...");
            const customPreQuestions = [
                {
                    lang: 'EN',
                    text: 'Q. Consider the following statements regarding the \\'Dingal\\' and \\'Pingal\\' literary styles of Rajasthan:\\n1. Dingal is primarily a bardic style of Western Rajasthan, characterized by its aggressive and martial tone.\\n2. Pingal is a style of Eastern Rajasthan, heavily influenced by Brajbhasha, and written in Bhat and Charani traditions.\\nWhich of the statements given above is/are correct?\\nA) 1 only\\nB) 2 only\\nC) Both 1 and 2\\nD) Neither 1 nor 2',
                    option_a: '1 only',
                    option_b: '2 only',
                    option_c: 'Both 1 and 2',
                    option_d: 'Neither 1 nor 2',
                    correct: 'A',
                    explanation: 'Statement 1 is correct. Dingal is the primary bardic and martial literary style of Western Rajasthan (Marwar) associated with the Charan community. Statement 2 is incorrect because Pingal is indeed a style of Eastern Rajasthan influenced by Brajbhasha, but it is primarily written in the Bhat community tradition, while Dingal is written in the Charan tradition.'
                },
                {
                    lang: 'HI',
                    text: 'Q. Rajasthan की \\'डिंगल\\' और \\’पिंगल\\' साहित्यिक शैलियों के संबंध में निम्नलिखित कथनों पर विचार करें:\\n1. डिंगल मुख्य रूप से पश्चिमी राजस्थान की चारण शैली है, जो अपने युद्ध और वीर रस के लिए जानी जाती है।\\n2. पिंगल पूर्वी राजस्थान की शैली है, जो ब्रजभाषा से प्रभावित है और मुख्य रूप से भाटों द्वारा लिखी गई थी।\\nउपरोक्त कथनों में से कौन सा/से सही है/हैं?\\nA) केवल 1\\nB) केवल 2\\nC) 1 और 2 दोनों\\nD) न तो 1 और न ही 2',
                    option_a: 'केवल 1',
                    option_b: 'केवल 2',
                    option_c: '1 और 2 दोनों',
                    option_d: 'न तो 1 और न ही 2',
                    correct: 'C',
                    explanation: 'दोनों कथन सही हैं। डिंगल पश्चिमी राजस्थान (मारवाड़) की चारण समुदाय से जुड़ी वीर रस की शैली है। पिंगल पूर्वी राजस्थान की शैली है जो ब्रजभाषा से प्रभावित है और यह मुख्य रूप से भाट समुदाय की परंपरा में लिखी गई है।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Match the following Rajasthani literary works with their respective authors:\\nLiterary Work | Author\\nI. Vansh Bhaskar | a. Padmanabh\\nII. Kanha-de Prabandh | b. Suryamal Misran\\nIII. Vir Satsai | c. Kanhaiyalal Sethia\\nIV. Leeltans | d. Bankidas\\nSelect the correct option:\\nA) I-b, II-a, III-b, IV-c\\nB) I-a, II-b, III-c, IV-d\\nC) I-b, II-d, III-a, IV-c\\nD) I-c, II-a, III-d, IV-b',
                    option_a: 'I-b, II-a, III-b, IV-c',
                    option_b: 'I-a, II-b, III-c, IV-d',
                    option_c: 'I-b, II-d, III-a, IV-c',
                    option_d: 'I-c, II-a, III-d, IV-b',
                    correct: 'A',
                    explanation: 'Vansh Bhaskar and Vir Satsai are both authored by the legendary state poet Suryamal Misran of Bundi. Kanha-de Prabandh, which describes the siege of Jalore, was composed by Padmanabh. Leeltans is a famous modern work by Kanhaiyalal Sethia.'
                },
                {
                    lang: 'HI',
                    text: 'Q. निम्नलिखित राजस्थानी साहित्यिक कृतियों को उनके संबंधित लेखकों से सुमेलित करें:\\nसाहित्यिक कृति | लेखक\\nI. वंश भास्कर | a. पद्मनाभ\\nII. कान्हड़दे प्रबंध | b. सूर्यमल्ल मिश्रण\\nIII. वीर सतसई | c. कन्हैयालाल सेठिया\\nIV. लीलटांस | d. बांकीदास\\nसही विकल्प का चयन करें:\\nA) I-b, II-a, III-b, IV-c\\nB) I-a, II-b, III-c, IV-d\\nC) I-b, II-d, III-a, IV-c\\nD) I-c, II-a, III-d, IV-b',
                    option_a: 'I-b, II-a, III-b, IV-c',
                    option_b: 'I-a, II-b, III-c, IV-d',
                    option_c: 'I-b, II-d, III-a, IV-c',
                    option_d: 'I-c, II-a, III-d, IV-b',
                    correct: 'A',
                    explanation: 'वंश भास्कर और वीर सतसई दोनों बूंदी के प्रसिद्ध राज्य कवि सूर्यमल्ल मिश्रण द्वारा रचित हैं। कान्हड़दे प्रबंध, जो जालौर के घेराबंदी का वर्णन करता है, पद्मनाभ द्वारा रचित था। लीलटांस कन्हैयालाल सेठिया की एक प्रसिद्ध आधुनिक रचना है।'
                },
                {
                    lang: 'EN',
                    text: 'Q. The \\'Kuvalayamala\\', which provides the earliest historical reference to \\'Marubhasha\\' (the ancient form of Marwari), was written by which Jain scholar in 778 AD?\\nA) Udyotan Suri\\nB) Haribhadra Suri\\nC) Jineshwar Suri\\nD) Hemachandra Suri',
                    option_a: 'Udyotan Suri',
                    option_b: 'Haribhadra Suri',
                    option_c: 'Jineshwar Suri',
                    option_d: 'Hemachandra Suri',
                    correct: 'A',
                    explanation: 'Kuvalayamala is a famous Prakrit text composed by Udyotan Suri in 778 AD at Jalore. In this work, the author mentions 18 regional languages of India, including \\'Marubhasha\\\', describing the sweet and distinct character of the language spoken in Western Rajasthan.'
                },
                {
                    lang: 'HI',
                    text: 'Q. 778 ईस्वी में किस जैन विद्वान ने \\'कुवलयमाला\\' की रचना की थी, जिसमें \\'मरुभाषा\\' (मारवाड़ी का प्राचीन रूप) का सबसे पहला ऐतिहासिक संदर्भ मिलता है?\\nA) उद्योतन सूरी\\nB) हरिभद्र सूरी\\nC) जिनेश्वर सूरी\\nD) हेमचंद्र सूरी',
                    option_a: 'उद्योतन सूरी',
                    option_b: 'हरिभद्र सूरी',
                    option_c: 'जिनेश्वर सूरी',
                    option_d: 'हेमचंद्र सूरी',
                    correct: 'A',
                    explanation: 'कुवलयमाला उद्योतन सूरी द्वारा 778 ईस्वी में जालौर में रचित एक प्रसिद्ध प्राकृत ग्रंथ है। इस ग्रंथ में लेखक ने भारत की 18 क्षेत्रीय भाषाओं का उल्लेख किया है, जिसमें \\'मरुभाषा\\' भी शामिल है, जो पश्चिमी राजस्थान में बोली जाने वाली भाषा के मीठे चरित्र का वर्णन करती है।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Consider the following statements regarding the classification of Rajasthani dialects by George Abraham Grierson in the \\'Linguistic Survey of India\\\':\\n1. He classified Rajasthani dialects into five distinct subgroups.\\n2. He identified Marwari as the most widely spoken dialect of Western Rajasthan.\\n3. He placed Malvi and Nimadi under the Southern Rajasthani group.\\nWhich of the statements given above are correct?\\nA) 1 and 2 only\\nB) 2 and 3 only\\nC) 1 and 3 only\\nD) 1, 2, and 3',
                    option_a: '1 and 2 only',
                    option_b: '2 and 3 only',
                    option_c: '1 and 3 only',
                    option_d: '1, 2, and 3',
                    correct: 'D',
                    explanation: 'All statements are correct. George Abraham Grierson classified Rajasthani into five sub-groups: Western Rajasthani (Marwari, Mewari), Central-Eastern (Dhoondhari, Haroti), North-Eastern (Mewati, Ahirwati), Southern (Malvi, Nimadi), and South-Western. He highlighted Marwari as the standard dialect of the Western region.'
                },
                {
                    lang: 'HI',
                    text: 'Q. \\'भाषाई सर्वेक्षण\\' (Linguistic Survey of India) में जॉर्ज अब्राहम ग्रियर्सन द्वारा राजस्थानी बोलियों के वर्गीकरण के संबंध में निम्नलिखित कथनों पर विचार करें:\\n1. उन्होंने राजस्थानी बोलियों को पांच अलग-अलग समूहों में वर्गीकृत किया।\\n2. उन्होंने मारवाड़ी को पश्चिमी राजस्थान की सबसे व्यापक रूप से बोली जाने वाली बोली के रूप में पहचाना।\\n3. उन्होंने मालवी और निमाड़ी को दक्षिणी राजस्थानी समूह के अंतर्गत रखा।\\nउपरोक्त कथनों में से कौन से सही हैं?\\nA) केवल 1 और 2\\nB) केवल 2 और 3\\nC) केवल 1 और 3\\nD) 1, 2 और 3',
                    option_a: 'केवल 1 और 2',
                    option_b: 'केवल 2 और 3',
                    option_c: 'केवल 1 और 3',
                    option_d: '1, 2 और 3',
                    correct: 'D',
                    explanation: 'सभी कथन सही हैं। जॉर्ज अब्राहम ग्रियर्सन ने राजस्थानी को पांच उप-समूहों में वर्गीकृत किया: पश्चिमी राजस्थानी (मारवाड़ी, मेवाड़ी), मध्य-पूर्वी (ढूंढाड़ी, हाड़ौती), उत्तर-पूर्वी (मेवाती, अहीरवाटी), दक्षिणी (मालवी, निमाड़ी), और दक्षिण-पश्चिमी। उन्होंने मारवाड़ी को पश्चिमी क्षेत्र की मानक बोली के रूप में रेखांकित किया।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Which of the following modern Rajasthani poems, famous for its patriotic and regional pride, was composed by Kanhaiyalal Sethia and compares the land of Rajasthan to heaven?\\nA) Dharti Dhoran Ri\\nB) Pathal aur Pithal\\nC) Minjhar\\nD) Leeltans',
                    option_a: 'Dharti Dhoran Ri',
                    option_b: 'Pathal aur Pithal',
                    option_c: 'Minjhar',
                    option_d: 'Leeltans',
                    correct: 'A',
                    explanation: 'Dharti Dhoran Ri is the iconic poem by Kanhaiyalal Sethia celebrating the landscape, history, and cultural pride of Rajasthan.'
                },
                {
                    lang: 'HI',
                    text: 'Q. निम्नलिखित में से कौन सी आधुनिक राजस्थानी कविता, जो अपनी देशभक्ति और क्षेत्रीय गौरव के लिए प्रसिद्ध है, कन्हैयालाल सेठिया द्वारा रचित है और राजस्थान की भूमि की तुलना स्वर्ग से करती है?\\nA) धरती धोरां री\\nB) पीथल और पाथल\\nC) मिंझर\\nD) लीलटांस',
                    option_a: 'धरती धोरां री',
                    option_b: 'पीथल और पाथल',
                    option_c: 'मिंझर',
                    option_d: 'लीलटांस',
                    correct: 'A',
                    explanation: '\\'धरती धोरां री\\' कन्हैयालाल सेठिया की प्रसिद्ध कविता है जो राजस्थान के परिदृश्य, इतिहास और सांस्कृतिक गौरव का जश्न मनाती है।'
                }
            ];

            for (const q of customPreQuestions) {
                await run(`
                    INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language)
                    VALUES (9, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct, q.explanation, q.lang]);
            }
            console.log("Seeded custom high-quality Pre questions for Literature.");
        }

        const literatureMainsCount = await get("SELECT COUNT(*) as count FROM mains_questions WHERE topic_id = 101 AND question_text LIKE '%literature%'");
        if (literatureMainsCount.count === 0) {
            console.log("Seeding custom high-quality questions for Rajasthani Literature (Mains)...");
            const customMainsQuestions = [
                {
                    lang: 'EN',
                    text: 'Q. Define \\'Dingal\\' and \\'Pingal\\' styles of Rajasthani literature and highlight their structural differences. [5 Marks, 50 Words]\\n\\nAnswer:',
                    model_answer: 'Introduction: Dingal and Pingal are the primary classical styles that form the backbone of Rajasthani literature, reflecting regional linguistic divisions.\\n\\nBody:\\n* Dingal: Formulated in Western Rajasthan (Marwar) by the Charan community. It is written in a martial tone using Marwari.\\n* Pingal: Developed in Eastern Rajasthan (Mewat/Dhundhar) by the Bhat community. It is heavily influenced by Brajbhasha and is softer and more lyrical.\\n\\nConclusion: Together, these styles preserved the historical struggles and romantic heritage of medieval Rajasthan.'
                },
                {
                    lang: 'HI',
                    text: 'Q. राजस्थानी साहित्य की \\'डिंगल\\' और \\'पिंगल\\' शैलियों को परिभाषित कीजिए तथा उनके संरचनात्मक अंतरों को रेखांकित कीजिए। [5 अंक, 50 शब्द]\\n\\nउत्तर:',
                    model_answer: 'प्रस्तावना: डिंगल और पिंगल राजस्थानी साहित्य की रीढ़ बनाने वाली प्राथमिक शास्त्रीय शैलियाँ हैं, जो क्षेत्रीय भाषाई विभाजनों को दर्शाती हैं।\\n\\nमुख्य भाग:\\n* डिंगल: पश्चिमी राजस्थान (मारवाड़) में चारण समुदाय द्वारा विकसित की गई। यह मारवाड़ी का उपयोग करते हुए एक युद्ध और वीर रस की शैली है।\\n* पिंगल: पूर्वी राजस्थान (मेवात/ढूंढाड़) में भाट समुदाय द्वारा विकसित की गई। यह ब्रजभाषा से काफी प्रभावित है और अधिक मधुर व काव्यात्मक है।\\n\\nनिष्कर्ष: इन दोनों शैलियों ने मध्यकालीन राजस्थान के ऐतिहासिक संघर्षों और प्रेम विरासत को संरक्षित किया।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Examine the historical significance of \\'Nainsi ri Khyat\\' as a source of medieval history of Rajasthan. [5 Marks, 50 Words]\\n\\nAnswer:',
                    model_answer: 'Introduction: Written by Muhnot Nainsi (Diwan of Jodhpur), \\'Nainsi ri Khyat\\' is a foundational historical chronicle of Rajasthan.\\n\\nBody: It provides detailed geographical, economic, and political records of Marwar and neighboring Rajput states. Nainsi used local revenue records to compile pargana statistics, showing crop yields and caste structures.\\n\\nConclusion: Thus, it serves as the earliest reliable administrative gazetteer, transforming oral histories into documented historical evidence.'
                },
                {
                    lang: 'HI',
                    text: 'Q. राजस्थान के मध्यकालीन इतिहास के स्रोत के रूप में \\'नैणसी री ख्यात\\' के ऐतिहासिक महत्व का परीक्षण कीजिए। [5 अंक, 50 शब्द]\\n\\nउत्तर:',
                    model_answer: 'प्रस्तावना: जोधपुर के दीवान मुहणोत नैणसी द्वारा लिखित \\'नैणसी री ख्यात\\' राजस्थान का एक आधारभूत ऐतिहासिक ग्रंथ है।\\n\\nमुख्य भाग: यह मारवाड़ और पड़ोसी राजपूत राज्यों के विस्तृत भौगोलिक, आर्थिक और राजनीतिक रिकॉर्ड प्रदान करता है। नैणसी ने परगना के आंकड़ों को संकलित करने के लिए स्थानीय राजस्व रिकॉर्ड का उपयोग किया, जिससे फसलों की पैदावार और जातिगत संरचनाएं प्रदर्शित होती हैं।\\n\\nनिष्कर्ष: इस प्रकार, यह क्षेत्र के सबसे पहले विश्वसनीय प्रशासनिक गजेटियर के रूप में कार्य करता है, जो मौखिक इतिहास को प्रलेखित साक्ष्य में बदलता है।'
                },
                {
                    lang: 'EN',
                    text: 'Q. Discuss the regional distribution of major dialects of Rajasthan, noting their geocultural influences. Present your answer using a clean markdown table. [10 Marks, 150 Words]\\n\\nAnswer:',
                    model_answer: 'Introduction: The linguistic landscape of Rajasthan is highly diverse, showing gradual phonetic transitions based on geographic borders and historical migrations.\\n\\nBody:\\n\\nThe distribution and geocultural influences of major dialects are structured below:\n\n| Dialect | Primary Region | Core Geocultural Influence |\\n| :--- | :--- | :--- |\\n| **Marwari** | Western Rajasthan (Jodhpur, Bikaner, Barmer) | Considered the standard literary base of Dingal. |\\n| **Dhoondhari** | Central-Eastern (Jaipur, Tonk) | Transition dialect showing influence of standard Hindi. |\\n| **Haroti** | South-Eastern (Kota, Bundi, Jhalawar) | Spoken in the Hadoti region; structurally close to Dhoondhari. |\\n| **Mewati** | North-Eastern (Alwar, Bharatpur) | Transition dialect between Rajasthani and Brajbhasha/Haryanvi. |\\n| **Wagdi** | Southern Hills (Dungarpur, Banswara) | Heavily influenced by Gujarati; classified as \\'Bhili\\' by Grierson. |\\n\\nConclusion: This regional distribution demonstrates how geography, trade routes, and border interactions directly shaped the phonetic and grammatical structures of Rajasthan\'s dialects.'
                },
                {
                    lang: 'HI',
                    text: 'Q. राजस्थान की प्रमुख बोलियों के क्षेत्रीय वितरण की चर्चा कीजिए और उनके भौगोलिक-सांस्कृतिक प्रभावों को नोट कीजिए। एक साफ तालिका का उपयोग करें। [10 अंक, 150 शब्द]\\n\\nउत्तर:',
                    model_answer: 'प्रस्तावना: राजस्थान का भाषाई परिदृश्य अत्यधिक विविध है, जो भौगोलिक सीमाओं और ऐतिहासिक प्रवासों के आधार पर क्रमिक भाषाई बदलाव दिखाता है।\\n\\nमुख्य भाग:\\n\\nप्रमुख बोलियों का वितरण और उनका भौगोलिक-सांस्कृतिक प्रभाव नीचे दिया गया है:\n\n| बोली | प्राथमिक क्षेत्र | मुख्य भौगोलिक-सांस्कृतिक प्रभाव |\\n| :--- | :--- | :--- |\\n| **मारवाड़ी** | पश्चिमी राजस्थान (जोधपुर, बीकानेर, बाड़मेर) | डिंगल का मानक साहित्यिक आधार माना जाता है। |\\n| **ढूंढाड़ी** | मध्य-पूर्वी (जयपुर, टोंक) | | मानक हिंदी का प्रभाव दिखाने वाली संक्रमणकालीन बोली। |\\n| **हाड़ौती** | दक्षिण-पूर्वी (कोटा, बूंदी, झालावाड़) | हाड़ौती क्षेत्र में बोली जाती है; संरचनात्मक रूप से ढूंढाड़ी के करीब। |\\n| **मेवाती** | उत्तर-पूर्वी (अलवर, भरतपुर) | राजस्थानी और ब्रजभाषा/हरियाणवी के बीच संक्रमणकालीन बोली। |\\n| **वागड़ी** | दक्षिणी पहाड़ियाँ (डूंगरपुर, बांसवाड़ा) | गुजराती से काफी प्रभावित; ग्रियर्सन द्वारा \\'भीली\\' के रूप में वर्गीकृत। |\\n\\nनिष्कर्ष: यह क्षेत्रीय वितरण प्रदर्शित करता है कि किस प्रकार भूगोल, व्यापार मार्गों और सीमावर्ती संपर्कों ने राजस्थान की बोलियों की ध्वन्यात्मक और व्याकरणिक संरचनाओं को सीधे प्रभावित किया।'
                }
            ];

            for (const q of customMainsQuestions) {
                await run(`
                    INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order)
                    VALUES (101, ?, ?, ?, 1)
                `, [q.text, q.model_answer, q.lang]);
            }
            console.log("Seeded custom high-quality Literature questions for Mains.");
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
    // Full Syllabus hierarchy lookup
    getFullSyllabus: async (tier, language = 'EN') => {
        const nameCol = language === 'HI' ? 'subject_name_hi' : 'subject_name';
        const unitNameCol = language === 'HI' ? 'unit_name_hi' : 'unit_name';
        const topicNameCol = language === 'HI' ? 'topic_name_hi' : 'topic_name';

        const subjects = await all(`SELECT subject_id, tier_type, COALESCE(${nameCol}, subject_name) as subject_name FROM subjects WHERE tier_type = ?`, [tier]);
        for (const sub of subjects) {
            const units = await all(`SELECT unit_id, subject_id, COALESCE(${unitNameCol}, unit_name) as unit_name FROM units WHERE subject_id = ?`, [sub.subject_id]);
            let flatTopics = [];
            for (const unit of units) {
                const topics = await all(`SELECT topic_id, unit_id, COALESCE(${topicNameCol}, topic_name) as topic_name FROM topics WHERE unit_id = ?`, [unit.unit_id]);
                unit.topics = topics;
                flatTopics = flatTopics.concat(topics);
            }
            sub.units = units;
            sub.topics = flatTopics; // Direct subject-to-topic mapping for mobile app compatibility
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
