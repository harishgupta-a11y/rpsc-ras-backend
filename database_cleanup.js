const { createClient } = require('@libsql/client');

const client = createClient({
    url: "libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io",
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg"
});

async function main() {
    try {
        console.log("Starting database cleanup and migrations...");

        // 1. Correct the Sirohi Eki Movement questions (Chaura -> Bhula) and fix the translation mixup
        const ekiUpdates = [
            {
                id: 5774,
                q: "Assertion (A): Motilal Tejawat managed to escape into the forests after Mewar State forces fired on the tribal gathering at Bhula on 7 May 1922.\nReason (R): Following his escape, Motilal Tejawat continued his armed rebellion from the forests and never surrendered to the state authorities.",
                exp: "The Assertion is true, but the Reason is false. After the Bhula Massacre on 7 May 1922, Motilal Tejawat successfully escaped into the forests and continued the movement. However, he eventually surrendered to the state authorities in the year 1929, making the Reason false."
            },
            {
                id: 5775,
                q: "कथन (A): 7 मई 1922 को भूला में आदिवासी सभा पर मेवाड़ राज्य की सेना द्वारा की गई गोलीबारी के बाद मोतीलाल तेजावत जंगलों में भागने में सफल रहे।\nकारण (R): अपने पलायन के बाद, मोतीलाल तेजावत ने जंगलों से अपना सशस्त्र विद्रोह जारी रखा और राज्य के अधिकारियों के सामने कभी आत्मसमर्पण नहीं किया।",
                exp: "कथन सही है, लेकिन कारण गलत है। 7 मई 1922 को भूला हत्याकांड के बाद, मोतीलाल तेजावत जंगलों में भागने में सफल रहे और आंदोलन जारी रखा। हालाँकि, उन्होंने अंततः वर्ष 1929 में राज्य के अधिकारियों के सामने आत्मसमर्पण कर दिया, जिससे कारण गलत हो जाता है।"
            },
            {
                id: 5782,
                q: "Match the key events of the tribal movements in Rajasthan with their corresponding years or exact dates:\n\n| Column I (Event) | Column II (Year / Date) |\n|---|---|\n| 1. Foundation of Samp Sabha | a. 17 November 1913 |\n| 2. Mangarh Hill Massacre | b. 7 May 1922 |\n| 3. Launch of Eki Movement | c. 1883 |\n| 4. Occurrence of Bhula Massacre | d. March 1921 |\n\nSelect the correct answer using the codes given below:",
                exp: "The Samp Sabha was founded in 1883; the Mangarh Hill massacre occurred on 17 November 1913; the Eki Movement was launched in March 1921; and the Bhula massacre took place on 7 May 1922."
            },
            {
                id: 5783,
                q: "राजस्थान में आदिवासी आंदोलनों की प्रमुख घटनाओं को उनके संबंधित वर्षों या सटीक तिथियों से सुमेलित कीजिए:\n\n| कॉलम I (घटना) | कॉलम II (वर्ष / तिथि) |\n|---|---|\n| 1. संप सभा की स्थापना | a. 17 नवंबर 1913 |\n| 2. मानगढ़ पहाड़ी हत्याकांड | b. 7 मई 1922 |\n| 3. एकी आंदोलन की शुरुआत | c. 1883 |\n| 4. भूला हत्याकांड का होना | d. मार्च 1921 |\n\nनीचे दिए गए कूट का उपयोग करके सही उत्तर चुनिए:",
                exp: "संप सभा की स्थापना 1883 में हुई थी; मानगढ़ पहाड़ी हत्याकांड 17 नवंबर 1913 को हुआ था; एकी आंदोलन की शुरुआत मार्च 1921 में हुई थी; और भूला हत्याकांड 7 मई 1922 को हुआ था।"
            },
            {
                id: 5806,
                q: "Match the major historical events of tribal movements with their exact dates/years:\n\n| Column I (Event) | Column II (Date/Year) |\n|---|---|\n| 1. Mangarh Hill Massacre | a. 1883 |\n| 2. Bhula Massacre | b. 1924 |\n| 3. Foundation of Samp Sabha | c. 17 November 1913 |\n| 4. Promulgation of Criminal Tribes Act | d. 7 May 1922 |\n\nSelect the correct answer using the codes given below:",
                exp: "The Mangarh Hill Massacre occurred on 17 November 1913. The Bhula Massacre occurred on 7 May 1922 during the Eki Movement. The Samp Sabha was founded in 1883. The Criminal Tribes Act was enacted in 1924."
            },
            {
                id: 5807,
                q: "जनजतीय आंदोलनों की प्रमुख ऐतिहासिक घटनाओं को उनकी सटीक तिथियों/वर्षों के साथ सुमेलित कीजिए:\n\n| कॉलम I (घटना) | कॉलम II (तिथि/वर्ष) |\n|---|---|\n| 1. मानगढ़ पहाड़ी हत्याकांड | a. 1883 |\n| 2. भूला हत्याकांड | b. 1924 |\n| 3. संप सभा की स्थापना | c. 17 नवंबर 1913 |\n| 4. आपराधिक जनजाति अधिनियम का लागू होना | d. 7 मई 1922 |\n\nनीचे दिए गए कोड का उपयोग करके सही उत्तर चुनिए:",
                exp: "मानगढ़ पहाड़ी हत्याकांड 17 नवंबर 1913 को हुआ था। भूला हत्याकांड एकी आंदोलन के दौरान 7 मई 1922 को हुआ था। संप सभा की स्थापना 1883 में हुई थी। आपराधिक जनजाति अधिनियम 1924 में लागू किया गया था।"
            },
            {
                id: 5816,
                q: "During the Eki Movement, a major tragedy occurred at Bhula on 7 May 1922, where British political officers and state forces fired upon a peaceful assembly of tribals. In which region was the Bhula massacre centered?",
                exp: "The Bhula massacre (7 May 1922) occurred in the Sirohi/Mathasiya area when Mewar and Sirohi state forces along with British officers opened fire on the tribals gathered under Motilal Tejawat. Approximately 1,200 tribals were killed."
            },
            {
                id: 5817,
                q: "एकी आंदोलन के दौरान, 7 मई 1922 को भूला में एक बड़ा हादसा हुआ, जहाँ ब्रिटिश राजनीतिक अधिकारियों और राज्य बलों ने आदिवासियों की एक शांतिपूर्ण सभा पर गोलीबारी की थी। भूला हत्याकांड किस क्षेत्र में केंद्रित था?",
                exp: "भूला हत्याकांड (7 मई 1922) सिरोही/मथासिया क्षेत्र में हुआ था, जब ब्रिटिश अधिकारियों तथा मेवाड़ और सिरोही राज्य बलों ने मिलकर, मोतीलाल तेजावत के नेतृत्व में एकत्रित हुए आदिवासियों पर गोलीबारी की थी। लगभग 1,200 आदिवासी मारे गए थे।"
            }
        ];

        for (const item of ekiUpdates) {
            await client.execute({
                sql: `UPDATE questions SET question_text = ?, detailed_explanation = ? WHERE question_id = ?`,
                args: [item.q, item.exp, item.id]
            });
            console.log(`Updated Eki Question ID: ${item.id}`);
        }

        // 2. Scan and remove all "According to the notes / reference notes" phrases from all questions
        console.log("Cleaning reference notes phrasing from Prelims questions...");
        const preQuestions = await client.execute(`SELECT question_id, question_text, detailed_explanation FROM questions`);
        for (const r of preQuestions.rows) {
            let qText = r.question_text || "";
            let expText = r.detailed_explanation || "";
            let changed = false;

            const cleanPhrases = [
                /According to the (?:reference\s+)?notes,\s*/gi,
                /According to the (?:reference\s+)?material,\s*/gi,
                /According to the provided (?:reference\s+)?notes,\s*/gi,
                /संदर्भ नोट्स के अनुसार,\s*/gi,
                /संदर्भ सामग्री के अनुसार,\s*/gi,
                /अभिलेखों के अनुसार,\s*/gi,
                /नोट्स के अनुसार,\s*/gi
            ];

            cleanPhrases.forEach(regex => {
                if (regex.test(qText)) {
                    qText = qText.replace(regex, (match) => {
                        // Capitalize the next character if the matched phrase is at the beginning
                        return "";
                    });
                    // Capitalize the first letter if it was cleaned from the start
                    qText = qText.trim();
                    if (qText.length > 0) {
                        qText = qText.charAt(0).toUpperCase() + qText.slice(1);
                    }
                    changed = true;
                }
                if (regex.test(expText)) {
                    expText = expText.replace(regex, "");
                    changed = true;
                }
            });

            if (changed) {
                await client.execute({
                    sql: `UPDATE questions SET question_text = ?, detailed_explanation = ? WHERE question_id = ?`,
                    args: [qText, expText, r.question_id]
                });
            }
        }
        console.log("Prelims reference notes clean-up completed.");

        // 3. Scan and remove reference notes phrases from Mains questions/answers
        console.log("Cleaning reference notes phrasing from Mains questions...");
        const mainsQuestions = await client.execute(`SELECT mains_question_id, question_text, model_answer, word_limit, language FROM mains_questions`);
        for (const r of mainsQuestions.rows) {
            let qText = r.question_text || "";
            let aText = r.model_answer || "";
            let changed = false;

            const cleanPhrases = [
                /According to the (?:reference\s+)?notes,\s*/gi,
                /According to the (?:reference\s+)?material,\s*/gi,
                /According to the provided (?:reference\s+)?notes,\s*/gi,
                /संदर्भ नोट्स के अनुसार,\s*/gi,
                /संदर्भ सामग्री के अनुसार,\s*/gi,
                /अभिलेखों के अनुसार,\s*/gi,
                /नोट्स के अनुसार,\s*/gi
            ];

            cleanPhrases.forEach(regex => {
                if (regex.test(qText)) {
                    qText = qText.replace(regex, "");
                    qText = qText.trim();
                    if (qText.length > 0) {
                        qText = qText.charAt(0).toUpperCase() + qText.slice(1);
                    }
                    changed = true;
                }
                if (regex.test(aText)) {
                    aText = aText.replace(regex, "");
                    changed = true;
                }
            });

            // 4. Fix missing Mains marks/words suffixes (e.g. 16 questions having only word limit)
            const marks = r.word_limit === 50 ? 5 : 10;
            const wordLimit = r.word_limit || 50;
            
            const isEn = r.language === 'EN';
            const suffixEn = `(${marks} Marks, ${wordLimit} Words)`;
            const suffixHi = `(${marks} अंक, ${wordLimit} शब्द)`;

            // Check if suffix already contains standard terms.
            // If it only has "(50 शब्द)" or similar, clean it and append the correct suffix
            const hasProperSuffix = isEn 
                ? (qText.includes("Marks") && qText.includes("Words"))
                : (qText.includes("अंक") && qText.includes("शब्द"));

            if (!hasProperSuffix) {
                // Strip incomplete suffixes like "(50 शब्द)" or "(150 शब्द)"
                qText = qText.replace(/\(\s*\d+\s*(?:शब्द|words)\s*\)/gi, "").trim();
                qText = qText.replace(/\(\s*\d+\s*(?:अंक|marks)\s*\)/gi, "").trim();
                qText = `${qText} ${isEn ? suffixEn : suffixHi}`;
                changed = true;
            }

            // 5. Clean up broken table headers: e.g. **|**: ---
            if (aText.includes("**|**: ---")) {
                aText = aText.replace(/\*\*\|\*\*:\s*---\s*\|/gi, "| --- |");
                aText = aText.replace(/\*\*\|\*\*:\s*---/gi, "| ---");
                changed = true;
            }

            if (changed) {
                await client.execute({
                    sql: `UPDATE mains_questions SET question_text = ?, model_answer = ? WHERE mains_question_id = ?`,
                    args: [qText, aText, r.mains_question_id]
                });
            }
        }
        console.log("Mains questions clean-up completed.");
        console.log("Database migrations executed successfully!");

    } catch(e) {
        console.error("Migration Error:", e);
    } finally {
        await client.close();
    }
}
main();
