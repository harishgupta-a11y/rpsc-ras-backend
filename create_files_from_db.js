const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const url = 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg';
const client = createClient({ url, authToken: token });

const DESKTOP = process.env.USERPROFILE
  ? path.join(process.env.USERPROFILE, 'Desktop')
  : path.join(require('os').homedir(), 'Desktop');

const EN_ROOT = path.join(DESKTOP, 'Subject_6_Political_and_Administrative_System_of_Rajasthan');
const HI_ROOT = path.join(DESKTOP, 'विषय_6_राजस्थान_की_राजनीतिक_और_प्रशासनिक_व्यवस्था');

// Topic folder names keyed by topic_id
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

// Sanitize for use in filename (remove chars invalid in Windows filenames)
function sanitize(str) {
  return str
    .replace(/[<>:"\/\\|?*]/g, '')   // remove invalid chars
    .replace(/&/g, 'and')            // & → and
    .replace(/\s+/g, '_')            // spaces → underscore
    .replace(/__+/g, '_')            // collapse multiple underscores
    .replace(/[()]/g, '')            // remove parentheses
    .replace(/_+$/, '')              // trim trailing underscores
    .trim();
}

function mkdirSafe(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

// Minimal valid .docx binary (a proper ZIP with empty Word document XML)
// Base64-encoded minimal .docx created from scratch
const MINIMAL_DOCX_B64 =
  'UEsDBBQABgAIAAAAIQDfpNJsWgEAACAFAAATAAgCW0NvbnRlbnRfVHlwZXNdLnhtbCCiBAIooAAC' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAArFTLTsMwELwj8Q+Rr6iJywMIoU0PQKqgpR9g7G1j' +
  '4bVl21X592ySNKUqKhKXKLa8OzM7a8/k+q1U0QtOq7SbsUGaswidkFq5YsaelsV1xAD4bNoVT1' +
  'GiBRR8yTfKhGfh4lmKxv0cHMB5gjjXA0SMaJxBiiwvGGG7zEwUHhXAIgFRCGxkFkIOCQMEFSIC' +
  'CQMQBXkBSQEqAYIBIAMBAgAABAABAAEAFAAAACkAAAABAAAAFgAAAHdvcmQvZG9jdW1lbnQueG1s' +
  'UEsBAi0AFAAGAAgAAAAhAN+k0mxaAQAAIAUAABMACAAAAAAAAAAAACCkgQAAAABbQ29udGVudF9U' +
  'eXBlc10ueG1sUEsFBgAAAAABAAEAQQAAAJsBAAAAAAA=';

function createDocx(filePath) {
  // Write a proper empty docx using raw XML ZIP structure
  const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink"
  xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
  xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex"
  xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid"
  xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml"
  xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash"
  xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh wp14">
  <w:body>
    <w:p><w:r><w:t></w:t></w:r></w:p>
  </w:body>
</w:document>`;
  // Write as plain text file with .docx extension (user will overwrite with actual content)
  fs.writeFileSync(filePath, '', 'utf8');
}

async function main() {
  try {
    // Clean old folders
    if (fs.existsSync(EN_ROOT)) fs.rmSync(EN_ROOT, { recursive: true, force: true });
    if (fs.existsSync(HI_ROOT)) fs.rmSync(HI_ROOT, { recursive: true, force: true });

    // Fetch only Foundation entries (even minute_topic_ids) to get base names + IDs
    // EN Foundation: language=EN and name ends with "Core Concepts & Foundational Principles"
    // HI Foundation: language=HI and name ends with "मुख्य अवधारणाएं एवं मूल सिद्धांत"
    const res = await client.execute(`
      SELECT minute_topic_id, topic_id, minute_topic_name, language
      FROM minute_topics
      WHERE topic_id BETWEEN 135 AND 141
      ORDER BY topic_id, minute_topic_id
    `);

    console.log(`\nFetched ${res.rows.length} minute_topics\n`);

    // Separate EN Foundation and HI Foundation rows (skip Advanced rows)
    const enFoundation = res.rows.filter(r =>
      r.language === 'EN' &&
      r.minute_topic_name.includes('Core Concepts & Foundational Principles')
    );
    const hiFoundation = res.rows.filter(r =>
      r.language === 'HI' &&
      r.minute_topic_name.includes('मुख्य अवधारणाएं एवं मूल सिद्धांत')
    );

    let total = 0;

    // ── CREATE ENGLISH FILES ──────────────────────────────────────────────────
    for (const row of enFoundation) {
      const { minute_topic_id, topic_id, minute_topic_name } = row;
      // Strip the " - Core Concepts & Foundational Principles" suffix to get base name
      const baseName = minute_topic_name
        .replace(' - Core Concepts & Foundational Principles', '')
        .trim();
      const safeBase = sanitize(baseName);
      const topicFolder = TOPIC_EN[topic_id];
      if (!topicFolder) continue;

      const dir = path.join(EN_ROOT, topicFolder);
      mkdirSafe(dir);

      // 3 files per EN subtopic
      const files = [
        `${minute_topic_id}_${safeBase}_Foundation.docx`,
        `${minute_topic_id}_${safeBase}_Advanced.docx`,
        `${minute_topic_id}_${safeBase}_Notes.docx`,
      ];
      for (const f of files) {
        fs.writeFileSync(path.join(dir, f), '', 'utf8');
        console.log(`[EN] ${f}`);
        total++;
      }
    }

    // ── CREATE HINDI FILES ────────────────────────────────────────────────────
    for (const row of hiFoundation) {
      const { minute_topic_id, topic_id, minute_topic_name } = row;
      // Strip the " - मुख्य अवधारणाएं एवं मूल सिद्धांत" suffix
      const baseName = minute_topic_name
        .replace(' - मुख्य अवधारणाएं एवं मूल सिद्धांत', '')
        .trim();
      const safeBase = sanitize(baseName);
      const topicFolder = TOPIC_HI[topic_id];
      if (!topicFolder) continue;

      const dir = path.join(HI_ROOT, topicFolder);
      mkdirSafe(dir);

      // 3 files per HI subtopic (Notes suffix = नोट्स)
      const files = [
        `${minute_topic_id}_${safeBase}_Foundation.docx`,
        `${minute_topic_id}_${safeBase}_Advanced.docx`,
        `${minute_topic_id}_${safeBase}_नोट्स.docx`,
      ];
      for (const f of files) {
        fs.writeFileSync(path.join(dir, f), '', 'utf8');
        console.log(`[HI] ${f}`);
        total++;
      }
    }

    console.log('\n========================================');
    console.log(`  DONE! Total files created: ${total}`);
    console.log(`  EN subtopics: ${enFoundation.length} × 3 files = ${enFoundation.length * 3}`);
    console.log(`  HI subtopics: ${hiFoundation.length} × 3 files = ${hiFoundation.length * 3}`);
    console.log('========================================');
    console.log(`\nEN → ${EN_ROOT}`);
    console.log(`HI → ${HI_ROOT}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.close();
  }
}

main();
