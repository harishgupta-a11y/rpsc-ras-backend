const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const client = createClient({
  url: 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg'
});

// ─── NEW TOPIC STRUCTURE FOR SUBJECT 9 ───────────────────────────────────────
const TOPICS = [
  {
    topic_name:    'Basics of Everyday Science',
    topic_name_hi: 'दैनिक विज्ञान के मूल तत्व',
    subtopics: [
      { en: 'Physics: Mechanics, Optics, Electricity & Magnetism',
        hi: 'भौतिकी: यांत्रिकी, प्रकाशिकी, विद्युत व चुंबकत्व' },
      { en: 'Chemistry: Acids, Bases, Metals & Carbon Compounds',
        hi: 'रसायन विज्ञान: अम्ल, क्षार, धातु व कार्बन यौगिक' },
    ]
  },
  {
    topic_name:    'Computers, Information and Communication Technology',
    topic_name_hi: 'कंप्यूटर, सूचना और संचार प्रौद्योगिकी',
    subtopics: [
      { en: 'Computers & IT: Hardware, Software & Networking',
        hi: 'कंप्यूटर और आईटी: हार्डवेयर, सॉफ्टवेयर व नेटवर्किंग' },
      { en: 'Communication Technology & Emerging Tech',
        hi: 'संचार प्रौद्योगिकी व उभरती तकनीक' },
    ]
  },
  {
    topic_name:    'Defence and Space Technology (India)',
    topic_name_hi: 'रक्षा और अंतरिक्ष प्रौद्योगिकी (भारत)',
    subtopics: [
      { en: 'Space Technology & ISRO Missions',
        hi: 'अंतरिक्ष प्रौद्योगिकी व इसरो मिशन' },
      { en: 'Defence Technology & Missile Systems',
        hi: 'रक्षा प्रौद्योगिकी व मिसाइल प्रणाली' },
    ]
  },
  {
    topic_name:    'Genetics, Biotechnology and Nanotechnology',
    topic_name_hi: 'आनुवंशिकी, जैव प्रौद्योगिकी और नैनो प्रौद्योगिकी',
    subtopics: [
      { en: 'Genetics, Inheritance & Variation',
        hi: 'आनुवंशिकी, वंशानुक्रम व विविधता' },
      { en: 'Biotechnology & Genetic Engineering',
        hi: 'जैव प्रौद्योगिकी व जेनेटिक इंजीनियरिंग' },
      { en: 'Nanotechnology & Applications',
        hi: 'नैनो प्रौद्योगिकी व अनुप्रयोग' },
    ]
  },
  {
    topic_name:    'Human Health Care, Nutrition & Diseases',
    topic_name_hi: 'मानव स्वास्थ्य देखभाल, पोषण और रोग',
    subtopics: [
      { en: 'Human Health, Nutrition & Vitamins',
        hi: 'मानव स्वास्थ्य, पोषण व विटामिन' },
      { en: 'Human Diseases & Pathogens',
        hi: 'मानव रोग व रोगजनक' },
      { en: 'Public Health Programs & Immunization',
        hi: 'सार्वजनिक स्वास्थ्य कार्यक्रम व टीकाकरण' },
    ]
  },
  {
    topic_name:    'Environment, Ecology & Biodiversity',
    topic_name_hi: 'पर्यावरण, पारिस्थितिकी और जैव विविधता',
    subtopics: [
      { en: 'Ecology & Ecosystem Dynamics',
        hi: 'पारिस्थितिकी व पारिस्थितिकी तंत्र गतिकी' },
      { en: 'Environmental Changes & Impact Assessment',
        hi: 'पर्यावरणीय परिवर्तन व प्रभाव आकलन' },
      { en: 'Biodiversity & Conservation',
        hi: 'जैव विविधता व संरक्षण' },
    ]
  },
  {
    topic_name:    'Agriculture & Allied Sectors (Rajasthan Focus)',
    topic_name_hi: 'कृषि और संबद्ध क्षेत्र (राजस्थान फोकस)',
    subtopics: [
      { en: 'Agriculture & Horticulture in Rajasthan',
        hi: 'राजस्थान में कृषि व बागवानी' },
      { en: 'Animal Husbandry & Forestry in Rajasthan',
        hi: 'राजस्थान में पशुपालन व वानिकी' },
    ]
  },
  {
    topic_name:    'Nuclear Technology & Science Policies',
    topic_name_hi: 'परमाणु प्रौद्योगिकी और विज्ञान नीतियां',
    subtopics: [
      { en: 'Nuclear Technology & Institutions',
        hi: 'परमाणु प्रौद्योगिकी व संस्थान' },
      { en: 'Science Policies & Indian Scientists',
        hi: 'विज्ञान नीतियां व भारतीय वैज्ञानिक' },
    ]
  },
  {
    topic_name:    'Environmental Management, Water & IPR',
    topic_name_hi: 'पर्यावरण प्रबंधन, जल और बौद्धिक संपदा अधिकार',
    subtopics: [
      { en: 'Waste Management & Circular Economy',
        hi: 'अपशिष्ट प्रबंधन व परिपत्र अर्थव्यवस्था' },
      { en: 'Water Quality & Traditional Conservation in Rajasthan',
        hi: 'जल गुणवत्ता व पारंपरिक संरक्षण' },
      { en: 'Intellectual Property Rights (IPR) & Ethics',
        hi: 'बौद्धिक संपदा अधिकार (IPR) व नैतिकता' },
    ]
  },
];

// ─── DESKTOP FOLDER NAMES ───────────────────────────────────────────────────
const DESKTOP  = path.join(process.env.USERPROFILE || require('os').homedir(), 'Desktop');
const EN_ROOT  = path.join(DESKTOP, 'Subject_9_Science_and_Technology');
const HI_ROOT  = path.join(DESKTOP, 'विषय_9_विज्ञान_और_प्रौद्योगिकी');

const TOPIC_EN_FOLDERS = [
  'Topic_1_Basics_of_Everyday_Science',
  'Topic_2_Computers_Information_and_Communication_Technology',
  'Topic_3_Defence_and_Space_Technology_India',
  'Topic_4_Genetics_Biotechnology_and_Nanotechnology',
  'Topic_5_Human_Health_Care_Nutrition_and_Diseases',
  'Topic_6_Environment_Ecology_and_Biodiversity',
  'Topic_7_Agriculture_and_Allied_Sectors_Rajasthan_Focus',
  'Topic_8_Nuclear_Technology_and_Science_Policies',
  'Topic_9_Environmental_Management_Water_and_IPR',
];
const TOPIC_HI_FOLDERS = [
  'विषय_1_दैनिक_विज्ञान_के_मूल_तत्व',
  'विषय_2_कंप्यूटर_सूचना_और_संचार_प्रौद्योगिकी',
  'विषय_3_रक्षा_और_अंतरिक्ष_प्रौद्योगिकी_भारत',
  'विषय_4_आनुवंशिकी_जैव_प्रौद्योगिकी_और_नैनो_प्रौद्योगिकी',
  'विषय_5_मानव_स्वास्थ्य_देखभाल_पोषण_और_रोग',
  'विषय_6_पर्यावरण_पारिस्थितिकी_और_जैव_विविधता',
  'विषय_7_कृषि_और_संबद्ध_क्षेत्र_राजस्थान_फोकस',
  'विषय_8_परमाणु_प्रौद्योगिकी_और_विज्ञान_नीतियां',
  'विषय_9_पर्यावरण_प्रबंधन_जल_और_बौद्धिक_संपदा_अधिकार',
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
  // ── STEP 1: Delete old topics 51–55 and their minute_topics ────────────────
  console.log('=== STEP 1: Delete old topics 51–55 ===');
  await client.execute('DELETE FROM minute_topics WHERE topic_id BETWEEN 51 AND 55');
  await client.execute('DELETE FROM topics WHERE unit_id = 9');
  console.log('✅ Old topics and minute_topics deleted\n');

  // ── STEP 2: Insert 9 new topics ────────────────────────────────────────────
  console.log('=== STEP 2: Insert new topics ===');
  const topicIds = [];
  for (const t of TOPICS) {
    const res = await client.execute({
      sql: 'INSERT INTO topics (unit_id, topic_name, topic_name_hi) VALUES (?, ?, ?) RETURNING topic_id',
      args: [9, t.topic_name, t.topic_name_hi],
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
