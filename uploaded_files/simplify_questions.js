const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not set.");
    process.exit(1);
}

const rawPath = path.join(__dirname, 'questions_raw.txt');
const outPath = path.join(__dirname, 'questions_clean.txt');

async function run() {
    console.log("Reading raw questions from:", rawPath);
    if (!fs.existsSync(rawPath)) {
        console.error("File does not exist!");
        process.exit(1);
    }

    const rawContent = fs.readFileSync(rawPath, 'utf8');
    // Split by question boundaries (e.g. Q. or q.)
    const rawBlocks = rawContent.split(/\n+(?=Q\.)/i).map(b => b.trim()).filter(Boolean);
    console.log(`Total raw blocks loaded: ${rawBlocks.length}`);

    const cleanedQuestions = [];
    const chunkSize = 5;

    for (let i = 0; i < rawBlocks.length; i += chunkSize) {
        const chunk = rawBlocks.slice(i, i + chunkSize);
        const chunkText = chunk.join('\n\n=== NEW BLOCK ===\n\n');
        
        console.log(`Processing chunk ${Math.floor(i / chunkSize) + 1} (${i + 1} to ${Math.min(i + chunkSize, rawBlocks.length)})...`);
        
        const prompt = `You are an elite expert proofreader and editor for RPSC RAS exam materials. 
I have a set of questions that look AI-generated (overly verbose, containing unnecessary academic fluff).

Your job is to rewrite them to look strictly human-made and clear, while respecting the following guidelines:
1. Shorten the questions: Remove all verbose AI fluff. Keep them direct, punchy, and natural.
2. Zero Summarization: Do not omit or change any micro-facts, coordinate numbers, historical dates (e.g. 646 AD), or committee/dynasty/ruler/place names.
3. Keep the sequence: Maintain the exact sequence of questions. Do not drop or miss any questions.
4. Correctness: Verify each question's facts against standard history. Correct any factual errors.
5. Format match type questions: If you find any match-the-following style questions, convert the columns into a clean markdown table form (do NOT use ASCII border symbols or code characters for lines).
6. Explanations in point form: Convert paragraph explanations into a clean list of bullet points (e.g., "- Point 1\\n- Point 2") for readability.
7. Output format: Keep the exact pattern of the input blocks (Q., options A/B/C/D, Correct: [Answer], Explanation: [Bullets]).

Here is the chunk to edit:
${chunkText}

Provide ONLY the cleaned, human-like questions in the same order. Do not write any markdown code fences, headers, or conversational text.`;

        try {
            // Direct REST API call to Gemini
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Gemini API returned status ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            if (text) {
                cleanedQuestions.push(text.trim());
                console.log(` -> Chunk ${Math.floor(i / chunkSize) + 1} processed successfully.`);
            } else {
                console.warn(` -> Warning: Empty text response for chunk starting at ${i}`);
            }
        } catch (e) {
            console.error(`Error on chunk starting at ${i}:`, e.message);
        }
        
        // Wait 1 second to stay well within standard rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    let finalText = cleanedQuestions.join('\n\n');
    finalText = finalText.replace(/\n{3,}/g, '\n\n');

    fs.writeFileSync(outPath, finalText, 'utf8');
    console.log("Successfully wrote cleaned questions to:", outPath);
}

run();
