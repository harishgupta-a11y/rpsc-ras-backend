/**
 * seed_exams_data.js
 * Seeds syllabus structure and sample questions for UPSC and BPSC exams.
 */
const { createClient } = require('@libsql/client');
const path = require('path');

const DB_FILE = path.join(__dirname, 'rpsc_ras.db');
const dbUrl = process.env.TURSO_DATABASE_URL || `file:${DB_FILE}`;
const dbToken = process.env.TURSO_AUTH_TOKEN || '';

const client = createClient({
    url: dbUrl,
    authToken: dbToken
});

async function runQuery(sql, params = []) {
    return client.execute({ sql, args: params });
}

async function getQuery(sql, params = []) {
    const res = await client.execute({ sql, args: params });
    return res.rows[0] || null;
}

async function seed() {
    try {
        console.log("[Seeder] Starting UPSC and BPSC syllabus & questions seeding...");

        // --- 1. UPSC CSE Syllabus Seeding ---
        console.log("[Seeder] Seeding UPSC CSE...");
        
        // Check if UPSC subjects already exist
        const upscSubjectCheck = await getQuery("SELECT subject_id FROM subjects WHERE exam_code = 'UPSC' LIMIT 1;");
        let subjectPolityId, subjectHistoryId, subjectGeographyId;
        
        if (!upscSubjectCheck) {
            // Seed Subjects
            const s1 = await runQuery(`
                INSERT INTO subjects (tier_type, subject_name, exam_code) 
                VALUES ('PRE', 'Indian Polity & Governance', 'UPSC');
            `);
            subjectPolityId = Number(s1.lastInsertRowid);

            const s2 = await runQuery(`
                INSERT INTO subjects (tier_type, subject_name, exam_code) 
                VALUES ('PRE', 'History of India & Indian National Movement', 'UPSC');
            `);
            subjectHistoryId = Number(s2.lastInsertRowid);

            const s3 = await runQuery(`
                INSERT INTO subjects (tier_type, subject_name, exam_code) 
                VALUES ('PRE', 'Indian and World Geography', 'UPSC');
            `);
            subjectGeographyId = Number(s3.lastInsertRowid);

            console.log(`[Seeder] Seeded 3 UPSC Subjects. Polity ID: ${subjectPolityId}, History ID: ${subjectHistoryId}`);

            // Seed Units for Polity
            const u1 = await runQuery(`
                INSERT INTO units (subject_id, unit_name) 
                VALUES (?, 'Constitutional Framework');
            `, [subjectPolityId]);
            const unitConstFrameworkId = Number(u1.lastInsertRowid);

            const u2 = await runQuery(`
                INSERT INTO units (subject_id, unit_name) 
                VALUES (?, 'System of Government');
            `, [subjectPolityId]);
            const unitSysGovId = Number(u2.lastInsertRowid);

            // Seed Topics for Polity
            const t1 = await runQuery(`
                INSERT INTO topics (unit_id, topic_name) 
                VALUES (?, 'Preamble, Fundamental Rights & DPSP');
            `, [unitConstFrameworkId]);
            const topicFRId = Number(t1.lastInsertRowid);

            const t2 = await runQuery(`
                INSERT INTO topics (unit_id, topic_name) 
                VALUES (?, 'Parliamentary System & Central Executive');
            `, [unitSysGovId]);
            const topicParlId = Number(t2.lastInsertRowid);

            // Seed Minute Topics (Subtopics)
            await runQuery("INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (?, 'Fundamental Rights', 'EN');", [topicFRId]);
            await runQuery("INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (?, 'Preamble of the Constitution', 'EN');", [topicFRId]);
            await runQuery("INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (?, 'Directive Principles of State Policy', 'EN');", [topicFRId]);
            
            // Seed Units for History
            const u3 = await runQuery(`
                INSERT INTO units (subject_id, unit_name) 
                VALUES (?, 'Ancient and Medieval India');
            `, [subjectHistoryId]);
            const unitAncientHistId = Number(u3.lastInsertRowid);

            // Seed Topics for History
            const t3 = await runQuery(`
                INSERT INTO topics (unit_id, topic_name) 
                VALUES (?, 'Indus Valley Civilization & Vedic Period');
            `, [unitAncientHistId]);
            const topicIVCId = Number(t3.lastInsertRowid);

            const t4 = await runQuery(`
                INSERT INTO topics (unit_id, topic_name) 
                VALUES (?, 'Buddhism and Jainism teachings');
            `, [unitAncientHistId]);
            const topicBuddhismId = Number(t4.lastInsertRowid);

            // Seed Questions for Polity - Fundamental Rights
            await runQuery(`
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language)
                VALUES (?, 'Which article of the Indian Constitution guarantees the Right to Equality?', 
                'Article 14-18', 'Article 19-22', 'Article 23-24', 'Article 25-28', 'A', 
                'Articles 14 to 18 of the Indian Constitution guarantee the Right to Equality to all citizens of India, ensuring equality before law and prohibition of discrimination.', 'EN');
            `, [topicFRId]);

            await runQuery(`
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language)
                VALUES (?, 'Fundamental Rights are borrowed from the constitution of which country?', 
                'United Kingdom', 'United States of America', 'Ireland', 'USSR', 'B', 
                'Fundamental Rights in India are inspired by the Bill of Rights of the United States Constitution (USA).', 'EN');
            `, [topicFRId]);

            // Seed Questions for History - Buddhism
            await runQuery(`
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language)
                VALUES (?, 'Where did Gautama Buddha deliver his first sermon, known as Dharma Chakra Pravartana?', 
                'Lumbini', 'Bodh Gaya', 'Sarnath', 'Kushinagar', 'C', 
                'Gautama Buddha delivered his first sermon to the five ascetics at Sarnath (near Varanasi), which is referred to as Dharma Chakra Pravartana.', 'EN');
            `, [topicBuddhismId]);

            // Seed Questions in Hindi for testing Hindi mode
            await runQuery(`
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language)
                VALUES (?, 'भारतीय संविधान का कौन सा अनुच्छेद समानता के अधिकार की गारंटी देता है?', 
                'अनुच्छेद 14-18', 'अनुच्छेद 19-22', 'अनुच्छेद 23-24', 'अनुच्छेद 25-28', 'A', 
                'भारतीय संविधान के अनुच्छेद 14 से 18 सभी नागरिकों को समानता के अधिकार की गारंटी देते हैं।', 'HI');
            `, [topicFRId]);

            console.log("[Seeder] Seeded UPSC Syllabus structure and initial questions.");
        } else {
            console.log("[Seeder] UPSC CSE subjects already present. Skipping UPSC seeding.");
        }


        // --- 2. BPSC Syllabus Seeding ---
        console.log("[Seeder] Seeding BPSC...");
        const bpscSubjectCheck = await getQuery("SELECT subject_id FROM subjects WHERE exam_code = 'BPSC' LIMIT 1;");
        let subjectBpscGsId, subjectBpscHistId;
        
        if (!bpscSubjectCheck) {
            // Seed BPSC Subjects
            const s1 = await runQuery(`
                INSERT INTO subjects (tier_type, subject_name, exam_code) 
                VALUES ('PRE', 'General Studies (BPSC)', 'BPSC');
            `);
            subjectBpscGsId = Number(s1.lastInsertRowid);

            const s2 = await runQuery(`
                INSERT INTO subjects (tier_type, subject_name, exam_code) 
                VALUES ('PRE', 'Bihar Special History & Culture', 'BPSC');
            `);
            subjectBpscHistId = Number(s2.lastInsertRowid);

            console.log(`[Seeder] Seeded 2 BPSC Subjects. GS ID: ${subjectBpscGsId}, Bihar Hist ID: ${subjectBpscHistId}`);

            // Seed Units for Bihar Special History
            const u1 = await runQuery(`
                INSERT INTO units (subject_id, unit_name) 
                VALUES (?, 'Ancient History of Bihar');
            `, [subjectBpscHistId]);
            const unitBpscAncientId = Number(u1.lastInsertRowid);

            // Seed Topics
            const t1 = await runQuery(`
                INSERT INTO topics (unit_id, topic_name) 
                VALUES (?, 'Magadha Empire & Mauryan Dynasty in Bihar');
            `, [unitBpscAncientId]);
            const topicMagadhaId = Number(t1.lastInsertRowid);

            const t2 = await runQuery(`
                INSERT INTO topics (unit_id, topic_name) 
                VALUES (?, 'Nalanda & Vikramashila Buddhist Universities');
            `, [unitBpscAncientId]);
            const topicNalandaId = Number(t2.lastInsertRowid);

            // Seed Questions for BPSC - Magadha/Mauryan
            await runQuery(`
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language)
                VALUES (?, 'Who was the founder of the Mauryan Dynasty with Pataliputra as capital?', 
                'Chandragupta Maurya', 'Bimbisara', 'Ashoka the Great', 'Ajatashatru', 'A', 
                'Chandragupta Maurya founded the Mauryan Empire in 322 BCE with the help of Chanakya (Kautilya), establishing Pataliputra (modern Patna) as capital.', 'EN');
            `, [topicMagadhaId]);

            await runQuery(`
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language)
                VALUES (?, 'Which ancient university of Bihar was destroyed by Bakhtiyar Khilji in 1193 CE?', 
                'Vikramashila University', 'Nalanda University', 'Odantapuri University', 'Taxila University', 'B', 
                'Nalanda University, a renowned seat of Buddhist learning in Bihar, was destroyed by Turkic invader Bakhtiyar Khilji in 1193 CE.', 'EN');
            `, [topicNalandaId]);

            // Hindi BPSC Question
            await runQuery(`
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language)
                VALUES (?, 'पाटलिपुत्र को राजधानी बनाकर मौर्य राजवंश की स्थापना किसने की थी?', 
                'चन्द्रगुप्त मौर्य', 'बिम्बिसार', 'महान अशोक', 'अजातशत्रु', 'A', 
                'चन्द्रगुप्त मौर्य ने चाणक्य की सहायता से 322 ईसा पूर्व में मौर्य साम्राज्य की स्थापना की और पाटलिपुत्र को अपनी राजधानी बनाया।', 'HI');
            `, [topicMagadhaId]);

            console.log("[Seeder] Seeded BPSC Syllabus structure and initial questions.");
        } else {
            console.log("[Seeder] BPSC subjects already present. Skipping BPSC seeding.");
        }

        console.log("[Seeder] Seeding completed successfully!");
    } catch (err) {
        console.error("[Seeder] Seeding failed:", err.message);
        process.exit(1);
    }
}

seed().then(() => process.exit(0));
