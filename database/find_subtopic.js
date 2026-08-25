const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'rpsc_ras.db');

// Simple string similarity helper (Levenshtein distance / fuzzy matching)
function calculateFuzzyScore(s1, s2) {
    const words1 = s1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const words2 = s2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    
    let matchCount = 0;
    for (const w1 of words1) {
        if (words2.some(w2 => w2.includes(w1) || w1.includes(w2))) {
            matchCount++;
        }
    }
    return matchCount;
}

function search(query) {
    if (!query) {
        console.error("Please provide a search query. Example: node find_subtopic.js 'mewar history'");
        process.exit(1);
    }
    
    console.log(`Searching database for closest match to: "${query}"...\n`);
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
        SELECT mt.minute_topic_id, mt.minute_topic_name, t.topic_id, t.topic_name, s.subject_name 
        FROM minute_topics mt
        JOIN topics t ON mt.topic_id = t.topic_id
        JOIN units u ON t.unit_id = u.unit_id
        JOIN subjects s ON u.subject_id = s.subject_id
    `, (err, rows) => {
        if (err) {
            console.error("Error reading database:", err.message);
            db.close();
            process.exit(1);
        }
        
        // Calculate scores
        const scored = rows.map(row => {
            const score = calculateFuzzyScore(query, row.minute_topic_name) * 2 + 
                          calculateFuzzyScore(query, row.topic_name) * 1;
            return { ...row, score };
        });
        
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        
        // Filter out non-matching results (score must be > 0)
        const matches = scored.filter(m => m.score > 0).slice(0, 3);
        
        if (matches.length === 0) {
            console.log("No clear matches found. Showing general topics list:");
            // Show first 5 general topics as suggestions
            rows.slice(0, 5).forEach(r => {
                console.log(` - Subject: ${r.subject_name} | Sub-topic: "${r.minute_topic_name}" (ID: ${r.minute_topic_id}, Topic ID: ${r.topic_id})`);
            });
        } else {
            console.log("Top Matches Found:");
            matches.forEach((m, idx) => {
                console.log(`${idx + 1}. [Score: ${m.score}]`);
                console.log(`   -> Subject:    ${m.subject_name}`);
                console.log(`   -> Topic:      "${m.topic_name}" (Topic ID: ${m.topic_id})`);
                console.log(`   -> Sub-topic:  "${m.minute_topic_name}" (Sub-topic ID: ${m.minute_topic_id})`);
                console.log();
            });
            console.log(`Recommended Command:`);
            console.log(`node upload_questions.js --file "./yourfile.docx" --topic ${matches[0].topic_id} --subtopic ${matches[0].minute_topic_id}`);
        }
        db.close();
    });
}

// Run search using command line arguments
const queryArg = process.argv.slice(2).join(' ');
search(queryArg);
