const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const client = createClient({
  url: 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg'
});

// ─── NEW TOPIC STRUCTURE ────────────────────────────────────────────────────
const TOPICS = [
  {
    topic_name:    'Economic Growth, Development & Sustainability',
    topic_name_hi: 'आर्थिक वृद्धि, विकास और सतत विकास',
    subtopics: [
      { en: 'Economic Growth and Development: Environmental Degradation and Sustainable Development',
        hi: 'आर्थिक वृद्धि और विकास: पर्यावरणीय क्षरण और सतत विकास' },
      { en: 'Measurement of Development: Conventional Method, Human Development Index and Related Indices',
        hi: 'विकास का मापन: पारंपरिक विधि, मानव विकास सूचकांक और संबंधित सूचकांक' },
    ]
  },
  {
    topic_name:    'Macroeconomic Policy & Public Finance',
    topic_name_hi: 'व्यापक आर्थिक नीति और सार्वजनिक वित्त',
    subtopics: [
      { en: 'Role of Monetary and Fiscal Policy in Economic Development',
        hi: 'आर्थिक विकास में मौद्रिक और राजकोषीय नीति की भूमिका' },
      { en: 'Recent Budget of Government of India and Resource Mobilization',
        hi: 'भारत सरकार का हालिया बजट और संसाधन जुटाना' },
      { en: 'Fiscal Federalism: Centre-State Financial Relations and Finance Commission',
        hi: 'राजकोषीय संघवाद: केंद्र-राज्य वित्तीय संबंध और वित्त आयोग' },
    ]
  },
  {
    topic_name:    'Core Sectors of the Indian Economy',
    topic_name_hi: 'भारतीय अर्थव्यवस्था के प्रमुख क्षेत्र',
    subtopics: [
      { en: 'Agricultural Development: Institutional and Technological Aspects, Reforms in Indian Agriculture and Government Initiatives',
        hi: 'कृषि विकास: संस्थागत और तकनीकी पहलू, भारतीय कृषि में सुधार और सरकारी पहल' },
      { en: 'Industrial Growth, Pattern and Policy: Industrial Reforms, Liberalization, Privatization and Globalization',
        hi: 'औद्योगिक विकास, प्रतिरूप और नीति: औद्योगिक सुधार, उदारीकरण, निजीकरण और वैश्वीकरण' },
      { en: 'Role of Service Sector in Economic Growth: Challenges, Opportunities, Energy, Transportation and Communication',
        hi: 'आर्थिक विकास में सेवा क्षेत्र की भूमिका: चुनौतियां, अवसर, ऊर्जा, परिवहन और संचार' },
    ]
  },
  {
    topic_name:    'Social Infrastructure and Empowerment',
    topic_name_hi: 'सामाजिक बुनियादी ढांचा और सशक्तिकरण',
    subtopics: [
      { en: 'Skill Development and Employment Generation: Programmes and Policies',
        hi: 'कौशल विकास और रोजगार सृजन: कार्यक्रम और नीतियां' },
      { en: 'Social Justice and Empowerment',
        hi: 'सामाजिक न्याय और सशक्तिकरण' },
    ]
  },
];

// ─── DESKTOP FOLDER NAMES ───────────────────────────────────────────────────
const DESKTOP  = path.join(process.env.USERPROFILE || require('os').homedir(), 'Desktop');
const EN_ROOT  = path.join(DESKTOP, 'Subject_7_Economic_Concepts_and_Indian_Economy');
const HI_ROOT  = path.join(DESKTOP, 'विषय_7_आर्थिक_अवधारणाएं_और_भारतीय_अर्थव्यवस्था');

const TOPIC_EN_FOLDERS = [
  'Topic_1_Economic_Growth_Development_and_Sustainability',
  'Topic_2_Macroeconomic_Policy_and_Public_Finance',
  'Topic_3_Core_Sectors_of_the_Indian_Economy',
  'Topic_4_Social_Infrastructure_and_Empowerment',
];
const TOPIC_HI_FOLDERS = [
  'विषय_1_आर्थिक_वृद्धि_विकास_और_सतत_विकास',
  'विषय_2_व्यापक_आर्थिक_नीति_और_सार्वजनिक_वित्त',
  'विषय_3_भारतीय_अर्थव्यवस्था_के_प्रमुख_क्षेत्र',
  'विषय_4_सामाजिक_बुनियादी_ढांचा_और_सशक्तिकरण',
];

function sanitize(str) {
  return str.replace(/[<>:"\/\\|?*]/g, '').replace(/\s+/g, '_').replace(/__+/g, '_').replace(/_+$/, '').trim();
}
function mkdirSafe(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

async function main() {
  // ── STEP 1: Delete old topics 41–45 and their minute_topics ────────────────
  console.log('=== STEP 1: Delete old topics 41–45 ===');
  await client.execute('DELETE FROM minute_topics WHERE topic_id BETWEEN 41 AND 45');
  await client.execute('DELETE FROM topics WHERE unit_id = 7');
  console.log('✅ Old topics and minute_topics deleted\n');

  // ── STEP 2: Insert 4 new topics ────────────────────────────────────────────
  console.log('=== STEP 2: Insert new topics ===');
  const topicIds = [];
  for (const t of TOPICS) {
    const res = await client.execute({
      sql: 'INSERT INTO topics (unit_id, topic_name, topic_name_hi) VALUES (?, ?, ?) RETURNING topic_id',
      args: [7, t.topic_name, t.topic_name_hi],
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
