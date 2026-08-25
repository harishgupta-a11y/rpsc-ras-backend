const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const client = createClient({
  url: 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg'
});

async function main() {
  try {
    // 1. Fetch all subjects
    const subjectsRes = await client.execute('SELECT subject_id, subject_name FROM subjects ORDER BY subject_id');
    const subjects = subjectsRes.rows;

    // 2. Fetch all topics
    const topicsRes = await client.execute('SELECT topic_id, unit_id, topic_name, topic_name_hi FROM topics ORDER BY unit_id, topic_id');
    const topics = topicsRes.rows;

    // 3. Fetch all minute_topics
    const mtRes = await client.execute('SELECT minute_topic_id, topic_id, minute_topic_name, language FROM minute_topics ORDER BY topic_id, minute_topic_id');
    const minuteTopics = mtRes.rows;

    // Build the mapping structure
    const manifest = {};
    for (const s of subjects) {
      manifest[s.subject_id] = {
        name: s.subject_name,
        topics: {}
      };
    }

    for (const t of topics) {
      if (!manifest[t.unit_id]) continue;
      manifest[t.unit_id].topics[t.topic_id] = {
        name: t.topic_name,
        name_hi: t.topic_name_hi,
        minute_topics: []
      };
    }

    for (const mt of minuteTopics) {
      // Find which subject this topic belongs to
      const topic = topics.find(t => t.topic_id === mt.topic_id);
      if (!topic) continue;
      const unit_id = topic.unit_id;
      if (!manifest[unit_id] || !manifest[unit_id].topics[mt.topic_id]) continue;
      manifest[unit_id].topics[mt.topic_id].minute_topics.push(mt);
    }

    // Generate Markdown output
    let md = `# Comprehensive Syllabus Manifest (RPSC RAS)

This document contains a complete list of all Subjects, Topics, and Subtopics (with their unique Database ID codes and Language flags) currently configured in the RPSC RAS application backend.

`;

    for (const subjectId of Object.keys(manifest).sort((a,b) => a - b)) {
      const s = manifest[subjectId];
      md += `## Subject ${subjectId}: ${s.name}\n\n`;
      const topicIds = Object.keys(s.topics).sort((a,b) => a - b);
      
      if (topicIds.length === 0) {
        md += `*No topics defined for this subject.*\n\n`;
        continue;
      }

      for (const topicId of topicIds) {
        const t = s.topics[topicId];
        const topicName = t.name_hi ? `${t.name} / ${t.name_hi}` : t.name;
        md += `### 📌 Topic ID ${topicId}: ${topicName}\n\n`;

        if (t.minute_topics.length === 0) {
          md += `  *No subtopics defined for this topic.*\n\n`;
          continue;
        }

        // Group minute topics by name (since EN and HI usually exist in pairs)
        // Let's list each subtopic with its English/Hindi code
        md += `| Subtopic / Minute Topic Name | Language | Code (minute_topic_id) |\n`;
        md += `|:---|:---:|:---:|\n`;
        for (const mt of t.minute_topics) {
          md += `| ${mt.minute_topic_name} | \`${mt.language}\` | **${mt.minute_topic_id}** |\n`;
        }
        md += `\n`;
      }
      md += `\n---\n\n`;
    }

    // Write manifest to brain directory
    const filePath = path.join('C:', 'Users', 'aNKIT', '.gemini', 'antigravity', 'brain', '263e7e4c-841b-451f-aae0-b6ff38264f6f', 'comprehensive_syllabus_manifest.md');
    fs.writeFileSync(filePath, md, 'utf8');
    console.log(`Successfully wrote comprehensive syllabus manifest to: ${filePath}`);

  } catch (e) {
    console.error('Error generating syllabus manifest:', e.message);
  } finally {
    client.close();
  }
}

main();
