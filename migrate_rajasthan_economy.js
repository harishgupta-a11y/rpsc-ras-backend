const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const client = createClient({
  url: 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg'
});

// ─── NEW TOPIC STRUCTURE FOR SUBJECT 8 ───────────────────────────────────────
const TOPICS = [
  {
    topic_name:    'Macro Overview and State Budget',
    topic_name_hi: 'मैक्रो अवलोकन और राज्य बजट',
    subtopics: [
      { en: 'Macro Overview of Rajasthan Economy',
        hi: 'राजस्थान अर्थव्यवस्था का मैक्रो अवलोकन' },
      { en: 'Rajasthan State Budget Analysis',
        hi: 'राजस्थान राज्य बजट विश्लेषण' },
    ]
  },
  {
    topic_name:    'Core Economic Sectors',
    topic_name_hi: 'प्रमुख आर्थिक क्षेत्र',
    subtopics: [
      { en: 'Agriculture Sector: Status, Issues & Initiatives',
        hi: 'कृषि क्षेत्र: स्थिति, मुद्दे व पहल' },
      { en: 'Industry Sector: Status, Issues & Initiatives',
        hi: 'उद्योग क्षेत्र: स्थिति, मुद्दे व पहल' },
      { en: 'Service Sector: Status, Issues & Initiatives',
        hi: 'सेवा क्षेत्र: स्थिति, मुद्दे व पहल' },
    ]
  },
  {
    topic_name:    'Infrastructure Development',
    topic_name_hi: 'बुनियादी ढांचा विकास',
    subtopics: [
      { en: 'Infrastructure Development: Energy Sector',
        hi: 'बुनियादी ढांचा विकास: ऊर्जा क्षेत्र' },
      { en: 'Infrastructure Development: Transportation Sector',
        hi: 'बुनियादी ढांचा विकास: परिवहन क्षेत्र' },
      { en: 'Infrastructure Development: Communication Sector',
        hi: 'बुनियादी ढांचा विकास: संचार क्षेत्र' },
    ]
  },
  {
    topic_name:    'Rural Development & Local Governance',
    topic_name_hi: 'ग्रामीण विकास और स्थानीय शासन',
    subtopics: [
      { en: 'Rural Development Strategies & Programs',
        hi: 'ग्रामीण विकास रणनीतियां व कार्यक्रम' },
      { en: 'Panchayati Raj Institutions & Governance',
        hi: 'पंचायती राज संस्थान व शासन' },
      { en: 'State Finance Commission: Role & Recommendations',
        hi: 'राज्य वित्त आयोग: भूमिका व सिफारिशें' },
    ]
  },
  {
    topic_name:    'Basic Social Services',
    topic_name_hi: 'बुनियादी सामाजिक सेवाएं',
    subtopics: [
      { en: 'Basic Social Services: Education Infrastructure',
        hi: 'बुनियादी सामाजिक सेवाएं: शिक्षा बुनियादी ढांचा' },
      { en: 'Basic Social Services: Health Infrastructure',
        hi: 'बुनियादी सामाजिक सेवाएं: स्वास्थ्य बुनियादी ढांचा' },
    ]
  },
  {
    topic_name:    'Government Welfare & Social Security',
    topic_name_hi: 'सरकारी कल्याण और सामाजिक सुरक्षा',
    subtopics: [
      { en: 'Major Welfare Schemes of Government of Rajasthan',
        hi: 'राजस्थान सरकार की प्रमुख कल्याणकारी योजनाएं' },
    ]
  },
];

// ─── DESKTOP FOLDER NAMES ───────────────────────────────────────────────────
const DESKTOP  = path.join(process.env.USERPROFILE || require('os').homedir(), 'Desktop');
const EN_ROOT  = path.join(DESKTOP, 'Subject_8_Economy_of_Rajasthan');
const HI_ROOT  = path.join(DESKTOP, 'विषय_8_राजस्थान_की_अर्थव्यवस्था');

const TOPIC_EN_FOLDERS = [
  'Topic_1_Macro_Overview_and_State_Budget',
  'Topic_2_Core_Economic_Sectors',
  'Topic_3_Infrastructure_Development',
  'Topic_4_Rural_Development_and_Local_Governance',
  'Topic_5_Basic_Social_Services',
  'Topic_6_Government_Welfare_and_Social_Security',
];
const TOPIC_HI_FOLDERS = [
  'विषय_1_मैक्रो_अवलोकन_और_राज्य_बजट',
  'विषय_2_प्रमुख_आर्थिक_क्षेत्र',
  'विषय_3_बुनियादी_ढांचा_विकास',
  'विषय_4_ग्रामीण_विकास_और_स्थानीय_शासन',
  'विषय_5_बुनियादी_सामाजिक_सेवाएं',
  'विषय_6_सरकारी_कल्याण_और_सामाजिक_सुरक्षा',
];

function sanitize(str) {
  return str
    .replace(/[<>:"\/\\|?*]/g, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_')
    .replace(/_+$/, '')
    .trim();
}
function mkdirSafe(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

async function main() {
  // ── STEP 1: Delete old topics 46–50 and their minute_topics ────────────────
  console.log('=== STEP 1: Delete old topics 46–50 ===');
  await client.execute('DELETE FROM minute_topics WHERE topic_id BETWEEN 46 AND 50');
  await client.execute('DELETE FROM topics WHERE unit_id = 8');
  console.log('✅ Old topics and minute_topics deleted\n');

  // ── STEP 2: Insert 6 new topics ────────────────────────────────────────────
  console.log('=== STEP 2: Insert new topics ===');
  const topicIds = [];
  for (const t of TOPICS) {
    const res = await client.execute({
      sql: 'INSERT INTO topics (unit_id, topic_name, topic_name_hi) VALUES (?, ?, ?) RETURNING topic_id',
      args: [8, t.topic_name, t.topic_name_hi],
    });
    const tid = res.rows[0].topic_id;
    topicIds.push(tid);
    console.log(`  [topic_id=${tid}] ${t.topic_name}`);
  }
  console.log(`✅ Inserted ${topicIds.length} topics\n`);

  // ── STEP 3: Insert minute_topics (EN + HI per subtopic) ───────────────────
  console.log('=== STEP 3: Insert minute_topics ===');
  const insertedRows = []; // { topic_id, topicIdx, en_id, hi_id, en_name, hi_name }

  for (let i = 0; i < TOPICS.length; i++) {
    const topic_id = topicIds[i];
    for (const s of TOPICS[i].subtopics) {
      const enRes = await client.execute({
        sql: 'INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (?, ?, ?) RETURNING minute_topic_id',
        args: [topic_id, s.en, 'EN'],
      });
      const en_id = enRes.rows[0].minute_topic_id;

      const hiRes = await client.execute({
        sql: 'INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (?, ?, ?) RETURNING minute_topic_id',
        args: [topic_id, s.hi, 'HI'],
      });
      const hi_id = hiRes.rows[0].minute_topic_id;

      insertedRows.push({ topic_id, topicIdx: i, en_id, hi_id, en_name: s.en, hi_name: s.hi });
      console.log(`  Topic ${topic_id} | EN:${en_id} | HI:${hi_id} — ${s.en.substring(0, 55)}...`);
    }
  }
  console.log(`✅ Inserted ${insertedRows.length * 2} minute_topics (${insertedRows.length} subtopics × 2 languages)\n`);

  // ── STEP 4: Create desktop .docx files ────────────────────────────────────
  console.log('=== STEP 4: Create .docx files on Desktop ===');
  if (fs.existsSync(EN_ROOT)) fs.rmSync(EN_ROOT, { recursive: true, force: true });
  if (fs.existsSync(HI_ROOT)) fs.rmSync(HI_ROOT, { recursive: true, force: true });

  let totalFiles = 0;
  for (const r of insertedRows) {
    const safeEN  = sanitize(r.en_name);
    const safeHI  = sanitize(r.hi_name);
    const enDir   = path.join(EN_ROOT, TOPIC_EN_FOLDERS[r.topicIdx]);
    const hiDir   = path.join(HI_ROOT, TOPIC_HI_FOLDERS[r.topicIdx]);
    mkdirSafe(enDir);
    mkdirSafe(hiDir);

    for (const suffix of ['Foundation', 'Advanced', 'Notes']) {
      fs.writeFileSync(path.join(enDir, `${r.en_id}_${safeEN}_${suffix}.docx`), '', 'utf8');
      totalFiles++;
    }
    console.log(`  [EN] ${r.en_id}_${safeEN.substring(0,40)}... (Foundation/Advanced/Notes)`);

    for (const suffix of ['Foundation', 'Advanced', 'नोट्स']) {
      fs.writeFileSync(path.join(hiDir, `${r.hi_id}_${safeHI}_${suffix}.docx`), '', 'utf8');
      totalFiles++;
    }
    console.log(`  [HI] ${r.hi_id}_${safeHI.substring(0,40)}... (Foundation/Advanced/नोट्स)`);
  }

  console.log('\n========================================');
  console.log('  ALL DONE!');
  console.log(`  DB Topics   : ${topicIds.length} (IDs: ${topicIds.join(', ')})`);
  console.log(`  minute_topics: ${insertedRows.length * 2} inserted`);
  console.log(`  .docx files  : ${totalFiles} created on Desktop`);
  console.log('========================================');
  console.log(`\nEN → ${EN_ROOT}`);
  console.log(`HI → ${HI_ROOT}`);

  client.close();
}

main().catch(e => { console.error('ERROR:', e.message); client.close(); });
