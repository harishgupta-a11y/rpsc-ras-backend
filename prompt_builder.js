/**
 * RPSC RAS Dynamic Question Prompt Builder
 * 
 * Implements strict exam-setting guidelines:
 * 1. Maximum Word Density & Core Non-Interrogative Style (Core Keywords ending with colon :)
 * 2. Zero Fluff & 100% Micro-facts (dates, coordinates, committees, acts, statistics)
 * 3. Specific District Requirement: 41 districts in Rajasthan right now
 * 4. Economic Survey 2025-26 & Union Budget 2026-27 integration
 * 5. Layout Constraints: Prefix "Q. ", Options "1)", "2)", "3)", "4)", "Correct: [1/2/3/4]", Bulleted Explanation
 * 6. Answer Key Distribution: Balanced across 1, 2, 3, 4
 * 7. Strict No-Overlap Rule: Reads existing questions and forbids >60% concept overlap
 */

function buildPrompt({
    subjectName = '',
    topicName = '',
    subtopicName = '',
    difficulty = 'ADVANCED', // 'FOUNDATION' or 'ADVANCED'
    format = 'CLASSICAL',    // 'CLASSICAL', 'STATEMENT', 'ASSERTION_REASON', 'MATCH', or 'ALL'
    language = 'HI',        // 'HI' or 'EN'
    count = 20,
    existingQuestions = []
}) {
    const isHindi = (language || 'HI').toUpperCase() === 'HI';
    const isFoundation = (difficulty || 'ADVANCED').toUpperCase() === 'FOUNDATION';
    const numPerOption = Math.max(1, Math.floor(count / 4));

    // Detect if subject relates to Rajasthan Geography
    const lowerSub = (subjectName + ' ' + topicName + ' ' + subtopicName).toLowerCase();
    const isRajasthanGeo = lowerSub.includes('rajasthan') && (lowerSub.includes('geography') || lowerSub.includes('भूगोल') || lowerSub.includes('district') || lowerSub.includes('physical'));

    // Detect if subject relates to Economy, Budget, Schemes, or Policy
    const isEconomyOrSchemes = lowerSub.includes('economy') || lowerSub.includes('अर्थव्यवस्था') || 
                               lowerSub.includes('budget') || lowerSub.includes('बजट') || 
                               lowerSub.includes('survey') || lowerSub.includes('सर्वेक्षण') || 
                               lowerSub.includes('scheme') || lowerSub.includes('योजना') || 
                               lowerSub.includes('development') || lowerSub.includes('विकास') ||
                               lowerSub.includes('current affairs') || lowerSub.includes('समसामयिकी');

    let prompt = '';

    // Core Style and Zero Fluff Rules
    const styleInstructions = `
CORE PRINCIPLES (MANDATORY & NON-NEGOTIABLE):
1. अत्यधिक शब्द-सघनता और गैर-प्रश्नवाचक कोर शैली (Maximum Word Density & Core Non-Interrogative Style):
   - Eliminate traditional interrogative sentences and long introductory language:
     ❌ FORBIDDEN: "निम्नलिखित में से कौन सा कथन सही है?", "क्या कारण था?", "किस जिले/ग्रंथ में...", "Which of the following..."
   - Use Core Keywords Only: End the question directly, in the shortest factual way with a colon (:).
     ❌ WRONG: "उदयपुर स्थित 'जयसमंद झील' का भौगोलिक उपनाम क्या है?"
     ✅ CORRECT CORE: 'जयसमंद झील' का अन्य भौगोलिक नाम:
     ❌ WRONG: "राजस्थान के जलवायु वर्गीकरण के संबंध में कोपेन के अनुसार निम्नलिखित में से कौन सा..."
     ✅ CORRECT CORE: कोपेन वर्गीकरण के अनुसार शुष्क जलवायु प्रदेश (BWhw) का प्रतिनिधि नगर:
   - The language of questions must be clear, standard, and easy for students to read.

2. अप्रासंगिक संदर्भों और अनावश्यक शब्दों का पूर्ण निष्कासन (Zero Fluff & 100% Micro-facts):
   - Completely remove historical/geographical filler, non-essential background, or generic adjectives (e.g. invaluable, unique heritage, profound sacrifice, architectural masterpiece).
   - Retain 100% of micro-facts: exact dates/years, precise coordinates, official committee names, acts, sections, rulers, battles, and percentage statistics.
   - Anti-Reference Ban: Zero bracketed citations like (p. 12), [1], or phrases like "As per the text" / "According to the document". State facts as authoritative, standalone truths.
`;

    // Special Injections
    let specialInjections = '';
    if (isRajasthanGeo) {
        specialInjections += `
CRITICAL RAJASTHAN GEOGRAPHY CONSTRAINTS:
- There are strictly 41 districts in Rajasthan right now.
- All geographic, administrative, boundary, division, and demographic questions MUST reflect the current 41-district administrative division of Rajasthan.
`;
    }

    if (isEconomyOrSchemes || true) {
        specialInjections += `
ECONOMIC SURVEY & BUDGET UPDATES:
- Where applicable to economic indicators, government schemes, infrastructure, agriculture, and public finance, incorporate figures and policy targets up to Economic Survey 2025-26 and Union Budget 2026-27 (and Rajasthan State Budget 2025-26).
`;
    }

    // Existing Questions No-Overlap Ingestion
    let existingQuestionsSection = '';
    if (existingQuestions && existingQuestions.length > 0) {
        const sampleExisting = existingQuestions
            .slice(0, 25)
            .map((q, idx) => {
                const text = typeof q === 'string' ? q : (q.question_text || '');
                return `${idx + 1}. ${text.slice(0, 180)}`;
            })
            .filter(t => t.length > 3)
            .join('\n');

        if (sampleExisting) {
            existingQuestionsSection = `
CRITICAL NO-OVERLAP MANDATE (MAXIMUM 60% SIMILARITY CEILING):
The following questions ALREADY exist in the question bank for this subtopic:
---
${sampleExisting}
---
STRICT DIVERSITY CONSTRAINTS:
1. Under NO circumstances should any newly generated question repeat, paraphrase, or closely duplicate the above questions.
2. The newly generated questions MUST NOT have more than 60% conceptual, thematic, or factual overlap with any existing question listed above.
3. Actively test previously untouched sub-aspects, alternative historical events/rulers/treaties, unexamined statutory sections, distinct geographical features, or fresh administrative facts.
4. Diversify question formats (Classical, Multi-Statement with Roman numerals I, II, III, Assertion-Reason, and Match the Column tables) to ensure rich, non-repetitive coverage of the subtopic.
`;
        }
    }

    // Format & Layout Guidelines
    let formatGuidelines = '';
    const formatUpper = (format || 'CLASSICAL').toUpperCase();

    if (formatUpper === 'CLASSICAL') {
        formatGuidelines = `
FORMAT: CLASSICAL MULTIPLE CHOICE QUESTIONS
- Generate exactly ${count} Classical MCQs.
- Every question must start strictly with "Q. " followed by a space and the question text.
- Absolute Numbering Ban: Never use Q1., Q1)., Q.1, or Question 1.
- Options must be formatted strictly as:
1) [Option 1 text]
2) [Option 2 text]
3) [Option 3 text]
4) [Option 4 text]
Correct: [1/2/3/4]
Explanation:
- [Concise point 1]
- [Concise point 2]
- [Concise point 3]
`;
    } else if (formatUpper === 'STATEMENT') {
        formatGuidelines = `
FORMAT: STATEMENT-BASED MCQs
- Generate exactly ${count} Statement-Based MCQs.
- Every question must start strictly with "Q. "
- Statements MUST strictly use Roman numerals (I, II, III).
- Options MUST strictly use Arabic numerals (1, 2, 3, 4).
LAYOUT TEMPLATE:
Q. [Sub-concept core keywords]:
I. [Precise statement I]
II. [Precise statement II]
III. [Precise statement III]
1) Only I
2) Only I and II
3) Only II and III
4) All I, II and III
Correct: [1/2/3/4]
Explanation:
- Statement I is [correct/incorrect]: [concise factual reason]
- Statement II is [correct/incorrect]: [concise factual reason]
- Statement III is [correct/incorrect]: [concise factual reason]

Rotate statement combinations across:
- Only I / Only II / Only III
- Only I and II / Only II and III / Only I and III
- All I, II and III / None of the above
`;
    } else if (formatUpper === 'ASSERTION_REASON') {
        formatGuidelines = `
FORMAT: ASSERTION (A) & REASON (R) MCQs
- Generate exactly ${count} Assertion (A) & Reason (R) MCQs.
- Every question must start strictly with "Q. "
LAYOUT TEMPLATE:
Q. [Core topic keywords]:
Assertion (A): [Specific factual or analytical claim]
Reason (R): [Explanatory or causal claim]
1) Both (A) and (R) are true and (R) is the correct explanation of (A).
2) Both (A) and (R) are true, but (R) is NOT the correct explanation of (A).
3) (A) is true, but (R) is false.
4) (A) is false, but (R) is true.
Correct: [1/2/3/4]
Explanation:
- Assertion (A): [Factual verification]
- Reason (R): [Factual verification]
- Analytical Link: [Why R explains or fails to explain A]

Diversify across all 4 logical outcomes.
`;
    } else if (formatUpper === 'MATCH') {
        formatGuidelines = `
FORMAT: MATCH THE COLUMN MCQs (IN CLEAN MARKDOWN TABLE)
- Generate exactly ${count} Match the Column MCQs.
- Every question must start strictly with "Q. "
- Columns MUST be presented in a clean Markdown table with exactly 4 rows (no ASCII borders):

Q. [Core association keywords]:

| List-I ([Category A]) | List-II ([Category B]) |
|---|---|
| A. [Item 1] | I. [Match item] |
| B. [Item 2] | II. [Match item] |
| C. [Item 3] | III. [Match item] |
| D. [Item 4] | IV. [Match item] |

1) A-[i], B-[ii], C-[iii], D-[iv]
2) A-[i], B-[ii], C-[iii], D-[iv]
3) A-[i], B-[ii], C-[iii], D-[iv]
4) A-[i], B-[ii], C-[iii], D-[iv]
Correct: [1/2/3/4]
Explanation:
- A matches [Item]: [Concise reason]
- B matches [Item]: [Concise reason]
- C matches [Item]: [Concise reason]
- D matches [Item]: [Concise reason]

SCRAMBLING & DISTRACTOR RULES:
- Under NO circumstances should the correct answer be a straight sequential match (A-I, B-II, C-III, D-IV is forbidden).
- Every question must have a scrambled match sequence (e.g., A-III, B-I, C-IV, D-II).
- Plausible Distractors: Incorrect options must share at least 1 or 2 correct pairs with the right answer.
`;
    } else {
        // Mixed / Balanced format
        formatGuidelines = `
FORMAT: DIVERSE RPSC RAS MCQs
- Generate exactly ${count} questions distributed across:
  1. Classical MCQs
  2. Statement-Based MCQs (Statements I, II, III; Options 1, 2, 3, 4)
  3. Assertion (A) & Reason (R) MCQs
  4. Match the Column MCQs (4-row clean Markdown table)
- Every question must start strictly with "Q. "
- Options must be strictly 1), 2), 3), 4).
- Key format: Correct: [1/2/3/4]
- Explanation format:
Explanation:
- [Bullet point 1]
- [Bullet point 2]
`;
    }

    // Pedagogical Level / Difficulty
    let difficultyGuidelines = '';
    if (isFoundation) {
        difficultyGuidelines = `
DIFFICULTY: FOUNDATION LEVEL
- Test core fundamental concepts, landmark facts, key dates, basic definitions, primary statutory provisions, and direct associations.
- Clear, unambiguous questions that build conceptual clarity.
- Explanations should be instructive and grounded in authentic textbooks.
`;
    } else {
        difficultyGuidelines = `
DIFFICULTY: ADVANCED (IAS / TOP RAS LEVEL)
- Questions must be tough, highly analytical, and conceptual, requiring high factual precision and depth.
- Include subtle factual distinctions, multi-layered causal relationships, and precise data.
`;
    }

    // Answer Key Balance
    const answerKeyGuidelines = `
ANSWER KEY DISTRIBUTION (STRICT):
Across the ${count} questions, the correct answers MUST be evenly distributed:
- Exactly ${numPerOption} questions with Correct: 1
- Exactly ${numPerOption} questions with Correct: 2
- Exactly ${numPerOption} questions with Correct: 3
- Exactly ${numPerOption} questions with Correct: 4
(Shuffle them randomly — never place identical answers consecutively).
`;

    // Language Instructions
    let languageInstructions = '';
    if (isHindi) {
        languageInstructions = `
LANGUAGE SPECIFICATION:
- Generate all questions, statements, options, and explanations in formal administrative Hindi (शासकीय हिंदी) for the RPSC RAS examination.
- Use standard academic/administrative terminology (e.g., प्रावधान, अधिनियम, सुमेलित, अभिकथन, कारण).
- Retain the exact structural tokens: "Q. ", "1)", "2)", "3)", "4)", "Correct: [1/2/3/4]", "Explanation:".
`;
    } else {
        languageInstructions = `
LANGUAGE SPECIFICATION:
- Generate all questions, statements, options, and explanations in standard English for the RPSC RAS examination.
- Retain the exact structural tokens: "Q. ", "1)", "2)", "3)", "4)", "Correct: [1/2/3/4]", "Explanation:".
`;
    }

    // Combine Full Prompt
    prompt = `Act as a senior RPSC RAS paper-setter. Generate exactly ${count} ${difficulty} level questions for the following syllabus target:
Subject: ${subjectName || 'General Studies'}
Topic: ${topicName || 'Core Syllabus'}
${subtopicName ? 'Subtopic: ' + subtopicName : ''}

${styleInstructions}
${specialInjections}
${existingQuestionsSection}
${difficultyGuidelines}
${formatGuidelines}
${answerKeyGuidelines}
${languageInstructions}

OUTPUT REQUIREMENTS:
Output only the ${count} raw questions adhering strictly to the above template.
No introductory text, no conversational remarks, no headings, no markdown code block fences (do not wrap in \`\`\`). Output raw questions directly.`;

    return prompt.trim();
}

module.exports = {
    buildPrompt
};
