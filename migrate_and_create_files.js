const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const url = 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg';
const client = createClient({ url, authToken: token });

// ─── EXACT SUBTOPIC DATA (as confirmed by user) ──────────────────────────────
// Each entry: { topic_id, en_name, hi_name }
const SUBTOPICS = [
  // Topic 135 - Executive & Legislative Framework
  { topic_id: 135, en: 'Governor: Constitutional Role, Discretionary Powers & State Precedents',
    hi: 'राज्यपाल: संवैधानिक भूमिका, विवेकाधीन शक्तियां और राज्य के उदाहरण' },
  { topic_id: 135, en: 'Chief Minister & Council of Ministers: Structure, Powers & Cabinet Decision-Making',
    hi: 'मुख्यमंत्री और मंत्रिपरिषद: संरचना, शक्तियां और कैबिनेट निर्णय प्रक्रिया' },
  { topic_id: 135, en: 'Rajasthan Legislative Assembly: Speaker, Committees, Bills & Parliamentary Procedures',
    hi: 'राजस्थान विधानसभा: अध्यक्ष, समितियाँ, विधेयक और संसदीय प्रक्रियाएं' },

  // Topic 136 - State Judiciary & Legal Hierarchy
  { topic_id: 136, en: 'Rajasthan High Court: History, Benches, Jurisdiction & Landmark Rulings',
    hi: 'राजस्थान उच्च न्यायालय: इतिहास, पीठ, अधिकार क्षेत्र और ऐतिहासिक निर्णय' },
  { topic_id: 136, en: 'Subordinate Judiciary & Legal Officers: District Courts, Lok Adalats & Advocate General',
    hi: 'अधीनस्थ न्यायपालिका और कानूनी अधिकारी: जिला अदालतें, लोक अदालतें और महाधिवक्ता' },

  // Topic 137 - State Secretariat & Departmental Administration
  { topic_id: 137, en: 'State Secretariat: Chief Secretary, Cabinet Secretariat & Administrative Machinery',
    hi: 'राज्य सचिवालय: मुख्य सचिव, कैबिनेट सचिवालय और प्रशासनिक तंत्र' },
  { topic_id: 137, en: 'State Directorates: Policy Execution, Executive Agencies & Departmental Heads',
    hi: 'राज्य निदेशालय: नीति निष्पादन, कार्यकारी एजेंसियां और विभागीय प्रमुख' },

  // Topic 138 - District & Grassroots Administration
  { topic_id: 138, en: 'District Governance: Divisional Commissioner & District Magistrate (Collector)',
    hi: 'जिला शासन: संभागीय आयुक्त और जिला मजिस्ट्रेट (कलेक्टर)' },
  { topic_id: 138, en: 'Law & Order and Land Revenue: Superintendent of Police (SP), SDO & Tehsildar',
    hi: 'कानून व्यवस्था और भू-राजस्व: पुलिस अधीक्षक (SP), SDO और तहसीलदार' },

  // Topic 139 - Commissions & Statutory Bodies
  { topic_id: 139, en: 'Constitutional Bodies: RPSC & Rajasthan State Election Commission',
    hi: 'संवैधानिक निकाय: RPSC और राजस्थान राज्य चुनाव आयोग' },
  { topic_id: 139, en: 'Statutory Bodies: State Information Commission & State Women Commission',
    hi: 'वैधानिक निकाय: राज्य सूचना आयोग और राज्य महिला आयोग' },
  { topic_id: 139, en: 'Revenue & Administrative Integrity: Board of Revenue & Lokayukt',
    hi: 'राजस्व और प्रशासनिक अखंडता: राजस्व मंडल और लोकायुक्त' },

  // Topic 140 - Local Self-Government & Decentralization
  { topic_id: 140, en: 'Panchayati Raj Administration: 73rd Amendment, Gram Sabha & Rural Governance',
    hi: 'पंचायती राज प्रशासन: 73वां संशोधन, ग्राम सभा और ग्रामीण शासन' },
  { topic_id: 140, en: 'Urban Local Bodies: 74th Amendment, Municipalities & Urban Governance',
    hi: 'शहरी स्थानीय निकाय: 74वां संशोधन, नगर पालिकाएं और शहरी शासन' },

  // Topic 141 - Public Policy, Citizen Rights & Administrative Accountability
  { topic_id: 141, en: 'Public Policy & Institutional Grievance Redressal: State Human Rights Commission & State Consumer Commission',
    hi: 'लोक नीति और संस्थागत शिकायत निवारण: राज्य मानवाधिकार आयोग और राज्य उपभोक्ता आयोग' },
  { topic_id: 141, en: "Citizen-Centric Administration: Citizen's Charters, Social Audit & Right to Information (RTI)",
    hi: 'नागरिक-केंद्रित प्रशासन: नागरिक चार्टर, सामाजिक अंकेक्षण (सोशल ऑडिट) और सूचना का अधिकार (RTI)' },
  { topic_id: 141, en: 'Public Service Delivery Initiatives: Rajasthan Public Service Guarantee Act (RTPS) & Rajasthan Sampark Portal',
    hi: 'सार्वजनिक सेवा वितरण पहल: राजस्थान लोक सेवा गारंटी अधिनियम (RTPS) और राजस्थान संपर्क पोर्टल' },
];

// ─── FILE CREATION HELPERS ────────────────────────────────────────────────────
const DESKTOP = path.join(process.env.USERPROFILE || require('os').homedir(), 'Desktop');
const EN_ROOT = path.join(DESKTOP, 'Subject_6_Political_and_Administrative_System_of_Rajasthan');
const HI_ROOT = path.join(DESKTOP, 'विषय_6_राजस्थान_की_राजनीतिक_और_प्रशासनिक_व्यवस्था');

const TOPIC_EN = {
  135: 'Topic_1_Executive_and_Legislative_Framework',
  136: 'Topic_2_State_Judiciary_and_Legal_Hierarchy',
  137: 'Topic_3_State_Secretariat_and_Departmental_Administration',
  138: 'Topic_4_District_and_Grassroots_Administration',
  139: 'Topic_5_Commissions_and_Statutory_Bodies',
  140: 'Topic_6_Local_Self_Government_and_Decentralization',
  141: 'Topic_7_Public_Policy_Citizen_Rights_and_Accountability',
};
const TOPIC_HI = {
  135: 'विषय_1_कार्यकारी_और_विधायी_ढांचा',
  136: 'विषय_2_राज्य_न्यायपालिका_और_कानूनी_पदानुक्रम',
  137: 'विषय_3_राज्य_सचिवालय_और_विभागीय_प्रशासन',
  138: 'विषय_4_जिला_और_जमीनी_स्तर_का_प्रशासन',
  139: 'विषय_5_आयोग_और_वैधानिक_निकाय',
  140: 'विषय_6_स्थानीय_स्वशासन_और_विकेंद्रीकरण',
  141: 'विषय_7_लोक_नीति_नागरिक_अधिकार_और_जवाबदेही',
};

function sanitize(str) {
  return str
    .replace(/[<>:"\/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_')
    .replace(/_+$/, '')
    .trim();
}
function mkdirSafe(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

async function main() {
  console.log('=== STEP 1: Delete old minute_topics (3564–3631) ===');
  await client.execute(`DELETE FROM minute_topics WHERE topic_id BETWEEN 135 AND 141`);
  console.log('✅ Old minute_topics deleted\n');

  console.log('=== STEP 2: Insert new minute_topics (2 per subtopic: EN + HI) ===');
  const insertedIds = []; // { en_id, hi_id, topic_id, en_name, hi_name }

  for (const s of SUBTOPICS) {
    // Insert EN
    const enRes = await client.execute({
      sql: `INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (?, ?, ?) RETURNING minute_topic_id`,
      args: [s.topic_id, s.en, 'EN'],
    });
    const en_id = enRes.rows[0].minute_topic_id;

    // Insert HI
    const hiRes = await client.execute({
      sql: `INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (?, ?, ?) RETURNING minute_topic_id`,
      args: [s.topic_id, s.hi, 'HI'],
    });
    const hi_id = hiRes.rows[0].minute_topic_id;

    insertedIds.push({ en_id, hi_id, topic_id: s.topic_id, en_name: s.en, hi_name: s.hi });
    console.log(`  [${s.topic_id}] EN:${en_id} | HI:${hi_id} — ${s.en.substring(0, 60)}...`);
  }
  console.log(`\n✅ Inserted ${insertedIds.length * 2} minute_topics (${insertedIds.length} subtopics × 2 languages)\n`);

  // ─── STEP 3: Create desktop files ──────────────────────────────────────────
  console.log('=== STEP 3: Create .docx files on Desktop ===');
  if (fs.existsSync(EN_ROOT)) fs.rmSync(EN_ROOT, { recursive: true, force: true });
  if (fs.existsSync(HI_ROOT)) fs.rmSync(HI_ROOT, { recursive: true, force: true });

  let totalFiles = 0;

  for (const s of insertedIds) {
    const safeEN = sanitize(s.en_name);
    const safeHI = sanitize(s.hi_name);
    const enDir  = path.join(EN_ROOT, TOPIC_EN[s.topic_id]);
    const hiDir  = path.join(HI_ROOT, TOPIC_HI[s.topic_id]);
    mkdirSafe(enDir);
    mkdirSafe(hiDir);

    // 3 EN files
    for (const suffix of ['Foundation', 'Advanced', 'Notes']) {
      const f = path.join(enDir, `${s.en_id}_${safeEN}_${suffix}.docx`);
      fs.writeFileSync(f, '', 'utf8');
      console.log(`[EN] ${s.en_id}_...${suffix}.docx`);
      totalFiles++;
    }

    // 3 HI files
    for (const suffix of ['Foundation', 'Advanced', 'नोट्स']) {
      const f = path.join(hiDir, `${s.hi_id}_${safeHI}_${suffix}.docx`);
      fs.writeFileSync(f, '', 'utf8');
      console.log(`[HI] ${s.hi_id}_...${suffix}.docx`);
      totalFiles++;
    }
  }

  console.log('\n========================================');
  console.log(`  ALL DONE!`);
  console.log(`  DB: ${insertedIds.length * 2} minute_topics inserted`);
  console.log(`  Files: ${totalFiles} .docx files created`);
  console.log('========================================');
  console.log(`\nEN → ${EN_ROOT}`);
  console.log(`HI → ${HI_ROOT}`);

  client.close();
}

main().catch(e => { console.error(e); client.close(); });
