const { createClient } = require('@libsql/client');

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

function cleanMainsData(q) {
    let qEn = q.question_text || "";
    let qHi = q.question_text || "";
    let aEn = q.model_answer || "";
    let aHi = q.model_answer || "";
    
    const isEn = q.language === 'EN';
    
    // 1. Append marks and words suffix if missing
    // We can infer the marks and word limit from the question context or table columns (if present),
    // or by checking the length of the suggested answer!
    // E.g. if word_limit column exists, use it. In this DB, the column word_limit exists!
    const marks = q.word_limit === 50 ? 5 : 10;
    const wordLimit = q.word_limit || 50;
    
    const marksSuffixEn = `(${marks} Marks, ${wordLimit} Words)`;
    const marksSuffixHi = `(${marks} अंक, ${wordLimit} शब्द)`;
    
    if (isEn) {
        if (!qEn.includes("Marks") && !qEn.includes("Words")) {
            qEn = `${qEn.trim()} ${marksSuffixEn}`;
        }
    } else {
        if (!qHi.includes("अंक") && !qHi.includes("शब्द")) {
            qHi = `${qHi.trim()} ${marksSuffixHi}`;
        }
    }

    // 2. Remove introduction/body/conclusion words and labels (even with leading bullet prefixes)
    const labelRegex = /(?:^|\n)[\s*-]*\*?\*?(?:Introduction|Body|Conclusion|प्रस्तावना|निष्कर्ष|भूमिका|मुख्य भाग)\*?\*?:\s*/gi;
    let answer = isEn ? aEn : aHi;
    answer = answer.replace(labelRegex, (match) => match.startsWith('\n') ? '\n' : '');

    // 3. Make headings/titles bold if they are in the form "- Title: " or "* Title: " or at start of line
    const headingPattern = /^(\s*(?:[-*]\s+)?)([^:\n]+):\s*/gm;
    answer = answer.replace(headingPattern, (match, prefix, title) => {
        const cleanTitle = title.trim();
        
        // Skip if already bolded
        if (cleanTitle.startsWith('**') && cleanTitle.endsWith('**')) {
            return match;
        }
        
        // Skip if too long to be a heading (e.g. > 60 chars)
        if (cleanTitle.length > 60) {
            return match;
        }
        
        // Skip common ignore labels
        const lowerTitle = cleanTitle.toLowerCase();
        const ignoreList = ['http', 'https', 'note', 'tip', 'warning', 'important', 'नोट', 'विशेष', 'ध्यान दें', 'प्रस्तावना', 'निष्कर्ष', 'भूमिका', 'मुख्य भाग'];
        if (ignoreList.includes(lowerTitle)) {
            return match;
        }
        
        return `${prefix}**${cleanTitle}**: `;
    });

    // 4. Clean up unnecessary/stray star marks (like triple stars *** or empty bold tags **** or isolated stars)
    answer = answer.replace(/\*\*\*/g, '**');
    answer = answer.replace(/\*\*\*\*/g, '');

    return {
        questionText: isEn ? qEn : qHi,
        modelAnswer: answer
    };
}

async function main() {
    try {
        console.log("Fetching all remote mains questions...");
        const res = await client.execute("SELECT mains_question_id, topic_id, question_text, model_answer, language, word_limit FROM mains_questions");
        console.log(`Total mains questions fetched: ${res.rows.length}`);

        let count = 0;
        for (const row of res.rows) {
            const { questionText, modelAnswer } = cleanMainsData(row);
            
            await client.execute({
                sql: "UPDATE mains_questions SET question_text = ?, model_answer = ? WHERE mains_question_id = ?",
                args: [questionText, modelAnswer, row.mains_question_id]
            });
            count++;
            if (count % 100 === 0) {
                console.log(`  Updated ${count} questions...`);
            }
        }
        console.log(`All ${count} mains questions updated successfully.`);

        // Verification
        console.log("\nVerifying first 2 questions...");
        const verifyRes = await client.execute("SELECT question_text, model_answer FROM mains_questions WHERE topic_id = 101 LIMIT 2");
        verifyRes.rows.forEach((r, idx) => {
            console.log(`\n=== QUESTION ${idx + 1} ===`);
            console.log(r.question_text);
            console.log("--- ANSWER ---");
            console.log(r.model_answer);
        });

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.close();
    }
}

main();
