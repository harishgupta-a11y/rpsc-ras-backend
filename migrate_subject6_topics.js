const { createClient } = require('@libsql/client');

const url = 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg';

const client = createClient({ url, authToken: token });

// ============================================================
// NEW 7-TOPIC SCHEME FOR SUBJECT 6
// unit_id = 6, subject_id = 6
// Old topic_ids: 36-40 (will be deleted)
// New topic_ids: 135-141
// New minute_topic_ids: 3564 onwards (4 per subtopic: EN_Foundation, HI_Foundation, EN_Advanced, HI_Advanced)
// ============================================================

const NEW_TOPICS = [
  {
    topic_id: 135,
    topic_name: "Executive & Legislative Framework",
    topic_name_hi: "कार्यकारी और विधायी ढांचा",
    unit_id: 6,
    subtopics: [
      {
        name_en: "Governor: Constitutional Role, Discretionary Powers & State Precedents",
        name_hi: "राज्यपाल: संवैधानिक भूमिका, विवेकाधीन शक्तियां और राज्य के उदाहरण",
      },
      {
        name_en: "Chief Minister & Council of Ministers: Structure, Powers & Cabinet Decision-Making",
        name_hi: "मुख्यमंत्री और मंत्रिपरिषद: संरचना, शक्तियां और कैबिनेट निर्णय प्रक्रिया",
      },
      {
        name_en: "Rajasthan Legislative Assembly: Speaker, Committees, Bills & Parliamentary Procedures",
        name_hi: "राजस्थान विधानसभा: अध्यक्ष, समितियाँ, विधेयक और संसदीय प्रक्रियाएं",
      },
    ],
  },
  {
    topic_id: 136,
    topic_name: "State Judiciary & Legal Hierarchy",
    topic_name_hi: "राज्य न्यायपालिका और कानूनी पदानुक्रम",
    unit_id: 6,
    subtopics: [
      {
        name_en: "Rajasthan High Court: History, Benches, Jurisdiction & Landmark Rulings",
        name_hi: "राजस्थान उच्च न्यायालय: इतिहास, पीठ, अधिकार क्षेत्र और ऐतिहासिक निर्णय",
      },
      {
        name_en: "Subordinate Judiciary & Legal Officers: District Courts, Lok Adalats & Advocate General",
        name_hi: "अधीनस्थ न्यायपालिका और कानूनी अधिकारी: जिला अदालतें, लोक अदालतें और महाधिवक्ता",
      },
    ],
  },
  {
    topic_id: 137,
    topic_name: "State Secretariat & Departmental Administration",
    topic_name_hi: "राज्य सचिवालय और विभागीय प्रशासन",
    unit_id: 6,
    subtopics: [
      {
        name_en: "State Secretariat: Chief Secretary, Cabinet Secretariat & Administrative Machinery",
        name_hi: "राज्य सचिवालय: मुख्य सचिव, कैबिनेट सचिवालय और प्रशासनिक तंत्र",
      },
      {
        name_en: "State Directorates: Policy Execution, Executive Agencies & Departmental Heads",
        name_hi: "राज्य निदेशालय: नीति निष्पादन, कार्यकारी एजेंसियां और विभागीय प्रमुख",
      },
    ],
  },
  {
    topic_id: 138,
    topic_name: "District & Grassroots Administration",
    topic_name_hi: "जिला और जमीनी स्तर का प्रशासन",
    unit_id: 6,
    subtopics: [
      {
        name_en: "District Governance: Divisional Commissioner & District Magistrate (Collector)",
        name_hi: "जिला शासन: संभागीय आयुक्त और जिला मजिस्ट्रेट (कलेक्टर)",
      },
      {
        name_en: "Law & Order and Land Revenue: Superintendent of Police (SP), SDO & Tehsildar",
        name_hi: "कानून व्यवस्था और भू-राजस्व: पुलिस अधीक्षक (SP), SDO और तहसीलदार",
      },
    ],
  },
  {
    topic_id: 139,
    topic_name: "Commissions & Statutory Bodies",
    topic_name_hi: "आयोग और वैधानिक निकाय",
    unit_id: 6,
    subtopics: [
      {
        name_en: "Constitutional Bodies: RPSC & Rajasthan State Election Commission",
        name_hi: "संवैधानिक निकाय: RPSC और राजस्थान राज्य चुनाव आयोग",
      },
      {
        name_en: "Statutory Bodies: State Information Commission & State Women Commission",
        name_hi: "वैधानिक निकाय: राज्य सूचना आयोग और राज्य महिला आयोग",
      },
      {
        name_en: "Revenue & Administrative Integrity: Board of Revenue & Lokayukt",
        name_hi: "राजस्व और प्रशासनिक अखंडता: राजस्व मंडल और लोकायुक्त",
      },
    ],
  },
  {
    topic_id: 140,
    topic_name: "Local Self-Government & Decentralization",
    topic_name_hi: "स्थानीय स्वशासन और विकेंद्रीकरण",
    unit_id: 6,
    subtopics: [
      {
        name_en: "Panchayati Raj Administration: 73rd Amendment, Gram Sabha & Rural Governance",
        name_hi: "पंचायती राज प्रशासन: 73वां संशोधन, ग्राम सभा और ग्रामीण शासन",
      },
      {
        name_en: "Urban Local Bodies: 74th Amendment, Municipalities & Urban Governance",
        name_hi: "शहरी स्थानीय निकाय: 74वां संशोधन, नगर पालिकाएं और शहरी शासन",
      },
    ],
  },
  {
    topic_id: 141,
    topic_name: "Public Policy, Citizen Rights & Administrative Accountability",
    topic_name_hi: "लोक नीति, नागरिक अधिकार और प्रशासनिक जवाबदेही",
    unit_id: 6,
    subtopics: [
      {
        name_en: "Public Policy & Institutional Grievance Redressal: State Human Rights Commission & State Consumer Commission",
        name_hi: "लोक नीति और संस्थागत शिकायत निवारण: राज्य मानवाधिकार आयोग और राज्य उपभोक्ता आयोग",
      },
      {
        name_en: "Citizen-Centric Administration: Citizen's Charters, Social Audit & Right to Information (RTI)",
        name_hi: "नागरिक-केंद्रित प्रशासन: नागरिक चार्टर, सामाजिक अंकेक्षण और सूचना का अधिकार (RTI)",
      },
      {
        name_en: "Public Service Delivery Initiatives: Rajasthan Public Service Guarantee Act (RTPS) & Rajasthan Sampark Portal",
        name_hi: "सार्वजनिक सेवा वितरण पहल: राजस्थान लोक सेवा गारंटी अधिनियम (RTPS) और राजस्थान संपर्क पोर्टल",
      },
    ],
  },
];

// OLD topic_ids to delete
const OLD_TOPIC_IDS = [36, 37, 38, 39, 40];

async function runMigration() {
  try {
    console.log("=== STARTING MIGRATION ===\n");

    // STEP 1: Delete old minute_topics linked to old topics
    console.log("Step 1: Deleting old minute_topics...");
    const delMT = await client.execute(
      `DELETE FROM minute_topics WHERE topic_id IN (${OLD_TOPIC_IDS.join(',')})`
    );
    console.log(`  Deleted ${delMT.changes} minute_topics rows.`);

    // STEP 2: Delete old topics
    console.log("Step 2: Deleting old topics...");
    const delT = await client.execute(
      `DELETE FROM topics WHERE topic_id IN (${OLD_TOPIC_IDS.join(',')})`
    );
    console.log(`  Deleted ${delT.changes} topics rows.`);

    // STEP 3: Insert new topics
    console.log("Step 3: Inserting new topics...");
    for (const topic of NEW_TOPICS) {
      await client.execute({
        sql: `INSERT INTO topics (topic_id, unit_id, topic_name, topic_name_hi) VALUES (?, ?, ?, ?)`,
        args: [topic.topic_id, topic.unit_id, topic.topic_name, topic.topic_name_hi],
      });
      console.log(`  Inserted topic_id=${topic.topic_id}: ${topic.topic_name}`);
    }

    // STEP 4: Insert new minute_topics (4 per subtopic: EN Foundation, HI Foundation, EN Advanced, HI Advanced)
    console.log("\nStep 4: Inserting new minute_topics (subtopics)...");
    let mtId = 3564;
    for (const topic of NEW_TOPICS) {
      for (const st of topic.subtopics) {
        // English Foundation
        await client.execute({
          sql: `INSERT INTO minute_topics (minute_topic_id, topic_id, minute_topic_name, language) VALUES (?, ?, ?, ?)`,
          args: [mtId, topic.topic_id, `${st.name_en} - Core Concepts & Foundational Principles`, 'EN'],
        });
        console.log(`  [${mtId}] EN Foundation: ${st.name_en.slice(0, 60)}...`);
        mtId++;

        // Hindi Foundation
        await client.execute({
          sql: `INSERT INTO minute_topics (minute_topic_id, topic_id, minute_topic_name, language) VALUES (?, ?, ?, ?)`,
          args: [mtId, topic.topic_id, `${st.name_hi} - मुख्य अवधारणाएं एवं मूल सिद्धांत`, 'HI'],
        });
        console.log(`  [${mtId}] HI Foundation: ${st.name_hi.slice(0, 50)}...`);
        mtId++;

        // English Advanced
        await client.execute({
          sql: `INSERT INTO minute_topics (minute_topic_id, topic_id, minute_topic_name, language) VALUES (?, ?, ?, ?)`,
          args: [mtId, topic.topic_id, `${st.name_en} - Advanced Analysis, Schemes & Practice`, 'EN'],
        });
        console.log(`  [${mtId}] EN Advanced: ${st.name_en.slice(0, 60)}...`);
        mtId++;

        // Hindi Advanced
        await client.execute({
          sql: `INSERT INTO minute_topics (minute_topic_id, topic_id, minute_topic_name, language) VALUES (?, ?, ?, ?)`,
          args: [mtId, topic.topic_id, `${st.name_hi} - उन्नत विश्लेषण, योजनाएं एवं अभ्यास`, 'HI'],
        });
        console.log(`  [${mtId}] HI Advanced: ${st.name_hi.slice(0, 50)}...`);
        mtId++;
      }
    }

    // STEP 5: Verify
    console.log("\n=== VERIFICATION ===");
    const verifyTopics = await client.execute(
      `SELECT topic_id, topic_name FROM topics WHERE topic_id BETWEEN 135 AND 141 ORDER BY topic_id`
    );
    console.log(`New topics inserted: ${verifyTopics.rows.length}`);
    verifyTopics.rows.forEach(r => console.log(`  topic_id=${r.topic_id}: ${r.topic_name}`));

    const verifyMT = await client.execute(
      `SELECT COUNT(*) as cnt FROM minute_topics WHERE topic_id BETWEEN 135 AND 141`
    );
    console.log(`New minute_topics inserted: ${verifyMT.rows[0].cnt}`);

    console.log("\n=== MIGRATION COMPLETE ===");

  } catch (err) {
    console.error("MIGRATION FAILED:", err.message);
  } finally {
    client.close();
  }
}

runMigration();
