/**
 * RPSC RAS Dynamic Question Prompt Builder
 * 
 * Contains EXACT, VERBATIM PROMPTS provided for RPSC RAS paper-setting:
 * 1. Classical MCQs (Direct MCQs) - Advanced & Foundation
 * 2. Statement-Based MCQs - Advanced & Foundation
 * 3. Assertion & Reason MCQs - Advanced & Foundation
 * 4. Match the Column MCQs - Advanced & Foundation
 * 5. Chronology Sequence MCQs - Advanced & Foundation
 * 6. Not Matched (Find False) MCQs - Advanced & Foundation
 * 7. Hindi Administrative Translation Pipeline - Advanced & Foundation
 * 
 * Integrates:
 * - 41 Districts in Rajasthan Geography constraint
 * - Economic Survey 2025-26 & Union Budget 2026-27 integration
 * - Strict No-Overlap mandate (<60% similarity ceiling against existing database)
 * - Exact Answer Key Distribution: 5 of each (1, 2, 3, 4)
 */

function buildPrompt({
    subjectName = '',
    topicName = '',
    subtopicName = '',
    difficulty = 'ADVANCED',
    format = 'CLASSICAL',
    language = 'EN',
    count = 20,
    existingQuestions = []
}) {
    const isFoundation = (difficulty || 'ADVANCED').toUpperCase() === 'FOUNDATION';
    const isHindi = (language || 'EN').toUpperCase() === 'HI';
    const formatUpper = (format || 'CLASSICAL').toUpperCase();

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

    // Language Enforcement Directive
    const langDirective = isHindi
        ? `LANGUAGE MANDATE (STRICT):
All question text, options, statements, labels, and explanations MUST be written entirely in standard HINDI (हिंदी). Do NOT use English.`
        : `LANGUAGE MANDATE (STRICT):
All question text, options, statements, labels, and explanations MUST be written entirely in standard ENGLISH. Do NOT use Hindi or Devanagari script.`;

    // Core Style and Zero Fluff Rules (User verbatim)
    const coreStyleRules = `
${langDirective}

CORE PRINCIPLES (MANDATORY & NON-NEGOTIABLE):
1. अत्यधिक शब्द-सघनता और गैर-प्रश्नवाचक कोर शैली (Maximum Word Density & Core Non-Interrogative Style):
   - Eliminate traditional interrogative sentences and long introductory language:
     ❌ FORBIDDEN: "निम्नलिखित में से कौन सा कथन सही है?", "क्या कारण था?", "किस जिले/ग्रंथ में...", "Which of the following..."
   - Use Core Keywords Only: End the question directly, in the shortest factual way with a colon (:).
     ❌ WRONG: "What is the alternative geographical name of 'Jaysamand Lake' located in Udaipur?" / "उदयपुर स्थित 'जयसमंद झील' का भौगोलिक उपनाम क्या है?"
     ✅ CORRECT CORE: 'जयसमंद झील' का अन्य भौगोलिक नाम: / Alternative geographical name of 'Jaysamand Lake':
     ❌ WRONG: "राजस्थान के जलवायु वर्गीकरण के संबंध में कोपेन के अनुसार निम्नलिखित में से कौन सा..."
     ✅ CORRECT CORE: कोपेन वर्गीकरण के अनुसार शुष्क जलवायु प्रदेश (BWhw) का प्रतिनिधि नगर:
   - The language of questions must be easy for students.

2. अप्रासंगिक संदर्भों और अनावश्यक शब्दों का पूर्ण निष्कासन (Zero Fluff & 100% Micro-facts):
   - Completely remove historical/geographical filler, non-essential background, or heavy adjectives (e.g. invaluable, unique heritage, profound sacrifice, architectural masterpiece).
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
- Where applicable, incorporate figures and policy targets up to Economic Survey 2025-26 and Union Budget 2026-27 (and Rajasthan State Budget 2025-26).
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
The following questions ALREADY exist in the database for this subtopic:
---
${sampleExisting}
---
STRICT DIVERSITY CONSTRAINTS:
1. Under NO circumstances should any newly generated question repeat, paraphrase, or closely duplicate the above questions.
2. The newly generated questions MUST NOT have more than 60% conceptual, thematic, or factual overlap with any existing question listed above.
3. Actively test previously untouched sub-aspects, alternative historical events/rulers/treaties, unexamined statutory sections, distinct geographical features, or fresh administrative facts.
`;
        }
    }

    // Target Syllabus Context
    const syllabusContext = `
TARGET SYLLABUS:
- Subject: ${subjectName || 'General Studies'}
- Topic: ${topicName || 'Rajasthan & Indian Studies'}
${subtopicName ? `- Subtopic: ${subtopicName}` : ''}
`;

    // Select the exact user-specified prompt for the requested format and tier
    let formatPrompt = '';

    if (formatUpper === 'CLASSICAL' || formatUpper === 'DIRECT') {
        if (!isFoundation) {
            // ADVANCED CLASSICAL (Exact User Prompt)
            formatPrompt = `
Act as an expert RPSC RAS paper-setter. Generate exactly ${count} advanced, human-made Classical MCQs for the given topic. 
Difficulty: questions must be highly tough (analytical/conceptual) of ias level. I am preparing questions for ras but i want highly tough questions of level of IAS.

FORMAT CONSTRAINTS (STRICT APP COMPLIANCE):
- Every question must start strictly with "Q. " followed by a space and the question text.
- Absolute Numbering Ban: Never use Q1., Q1)., Q.1, or Question 1.
- Options must be formatted strictly as:
1) [Option 1 text]
2) [Option 2 text]
3) [Option 3 text]
4) [Option 4]
Correct: [1/2/3/4]
Explanation:
- [Concise point 1]
- [Concise point 2]
- [Concise point 3]

DIFFICULTY & TONE:
- Advanced / Tough IAS level. Analytical and conceptual, requiring high precision.
- Human-Made Style: Keep question text crisp, punchy, and direct. Remove all unnecessary AI verbosity and wordy introductions.
- Zero Summarization: Do not omit micro-facts, exact constitutional clauses, numerical data, dates, committee names, or act sections.
- Anti-Reference Ban: Zero bracketed citations like (p. 12), [1], or phrases like "As per the text" / "According to the document". State facts as authoritative, standalone truths.
- Latest Data: Incorporate developments and macroeconomic figures up to Union Budget 2026-27, Economic Survey 2025-26, and latest RBI MPC updates where applicable.

ANSWER KEY DISTRIBUTION (MANDATORY):
Across the ${count} questions, the correct answers MUST be balanced:
- Exactly ${Math.floor(count / 4)} questions with Correct: 1
- Exactly ${Math.floor(count / 4)} questions with Correct: 2
- Exactly ${Math.floor(count / 4)} questions with Correct: 3
- Exactly ${Math.floor(count / 4)} questions with Correct: 4
(Shuffle them randomly — never place identical answers consecutively).

Output only the ${count} raw questions. No introductory text, no headings, no markdown code blocks.
`;
        } else {
            // FOUNDATION CLASSICAL (Exact User Prompt)
            formatPrompt = `
Act as an expert RPSC RAS paper-setter. Generate exactly ${count} FOUNDATION LEVEL Classical MCQs for the given topic.

PEDAGOGICAL INTENT (FOUNDATION LEVEL):
- Test core fundamental concepts, essential definitions, landmark facts, key dates, basic geographic coordinates, and primary statutory provisions.
- Clear, direct, and unambiguous wording. Avoid overly convoluted traps, but maintain standard competitive exam quality.
- Explanations should be instructive and build conceptual clarity from the ground up.

FORMAT CONSTRAINTS (STRICT APP COMPLIANCE):
- Every question must start strictly with "Q. " followed by a space.
- Absolute Numbering Ban: Never write Q1., Q1)., Q. 1), or Question 1.
- Options must be formatted strictly as:
1) [Option 1 text]
2) [Option 2 text]
3) [Option 3 text]
4) [Option 4 text]
Correct: [1/2/3/4]
Explanation:
- [Core concept/definition point]
- [Factual background point]
- [Takeaway point]

RULES:
- Zero Citations: No bracketed citations like (p. 12), [1], or "According to the text". State facts as authoritative standalone truths.
- Latest Verified Facts: Align with current standard government reports and authentic state boards.

ANSWER KEY DISTRIBUTION (MANDATORY):
Across the ${count} questions:
- Exactly ${Math.floor(count / 4)} questions with Correct: 1
- Exactly ${Math.floor(count / 4)} questions with Correct: 2
- Exactly ${Math.floor(count / 4)} questions with Correct: 3
- Exactly ${Math.floor(count / 4)} questions with Correct: 4
(Randomly distributed — never cluster identical answers).

Output only the ${count} raw questions. No introductory text, no headings, no markdown code blocks.
`;
        }
    } else if (formatUpper === 'STATEMENT') {
        if (!isFoundation) {
            // ADVANCED STATEMENT (Exact User Prompt)
            formatPrompt = `
Act as an expert RPSC RAS paper-setter. Generate exactly ${count} advanced Statement-Based MCQs for the given topic.

FORMAT CONSTRAINTS (STRICT APP & RPSC COMPLIANCE):
- Every question must start strictly with "Q. "
- Statements MUST strictly use Roman numerals (I, II, III).
- Options MUST strictly use Arabic numerals (1, 2, 3, 4).
LAYOUT TEMPLATE:
Q. Consider the following statements regarding [Sub-concept]:
I. [Precise statement I]
II. [Precise statement II]
III. [Precise statement III]
Which of the statements given above is/are correct?
1) Only I
2) Only I and II
3) Only II and III
4) All I, II and III
Correct: [1/2/3/4]
Explanation:
- Statement I is [correct/incorrect]: [concise academic reason]
- Statement II is [correct/incorrect]: [concise academic reason]
- Statement III is [correct/incorrect]: [concise academic reason]

STATEMENT COMBINATION ROTATION:
Rotate the right answers naturally across:
- "Only I" / "Only II" / "Only III"
- "Only I and II" / "Only II and III" / "Only I and III"
- "All I, II and III" / "None of the above"

DIFFICULTY & TONE:
- Advanced / Tough RPSC level: Statements must contain subtle factual distinctions, exact statutory terms, or numerical precision.
- Human-Made Style: Direct and concise, without conversational filler.
- Anti-Reference Ban: Zero inline citations, page numbers, or "According to..." labels.
- Latest Data: Integrate running government schemes, Union Budget 2026-27, and Economic Survey 2025-26 figures where relevant.

ANSWER KEY DISTRIBUTION (MANDATORY):
Across the ${count} questions:
- Exactly ${Math.floor(count / 4)} questions with Correct: 1
- Exactly ${Math.floor(count / 4)} questions with Correct: 2
- Exactly ${Math.floor(count / 4)} questions with Correct: 3
- Exactly ${Math.floor(count / 4)} questions with Correct: 4
(Randomly distributed).

Output only the ${count} raw questions. No introductory text, no headings, no markdown code blocks.
`;
        } else {
            // FOUNDATION STATEMENT (Exact User Prompt)
            formatPrompt = `
Act as an expert RPSC RAS paper-setter. Generate exactly ${count} FOUNDATION LEVEL Statement-Based MCQs for the given topic.

PEDAGOGICAL INTENT (FOUNDATION LEVEL):
- Statements should test clear, well-established factual parameters (e.g., standard features of a physical division, core eligibility of a scheme, basic constitutional articles, or primary historical events).
- Statements should be concise (1-2 lines each) and test clarity of fundamentals rather than obscure trivia.

FORMAT CONSTRAINTS (STRICT APP & RPSC COMPLIANCE):
- Every question must start strictly with "Q. "
- Statements MUST strictly use Roman numerals (I, II, III).
- Options MUST strictly use Arabic numerals (1, 2, 3, 4).

LAYOUT TEMPLATE:
Q. Consider the following statements regarding [Sub-concept]:
I. [Precise statement I]
II. [Precise statement II]
III. [Precise statement III]
Which of the statements given above is/are correct?
1) Only I
2) Only I and II
3) Only II and III
4) All I, II and III
Correct: [1/2/3/4]
Explanation:
- Statement I is [correct/incorrect]: [concise academic reason]
- Statement II is [correct/incorrect]: [concise academic reason]
- Statement III is [correct/incorrect]: [concise academic reason]

STATEMENT COMBINATION ROTATION:
Rotate the right answers naturally across:
- "Only I" / "Only II" / "Only III"
- "Only I and II" / "Only II and III" / "Only I and III"
- "All I, II and III" / "None of the above"

RULES:
- Zero Citations: No bracketed markers like [1], (p. 10), or "According to the text".
- Advanced analytical depth: Statements should test authentic micro-facts, definitions, and official data up to 2026.

ANSWER KEY DISTRIBUTION (MANDATORY):
Across the ${count} questions:
- Exactly ${Math.floor(count / 4)} questions with Correct: 1
- Exactly ${Math.floor(count / 4)} questions with Correct: 2
- Exactly ${Math.floor(count / 4)} questions with Correct: 3
- Exactly ${Math.floor(count / 4)} questions with Correct: 4
(Randomly distributed).

Output only the ${count} raw questions. No introductory text, no headings, no markdown code blocks.
`;
        }
    } else if (formatUpper === 'ASSERTION_REASON') {
        if (!isFoundation) {
            // ADVANCED ASSERTION & REASON (Exact User Prompt)
            formatPrompt = `
Act as an expert RPSC RAS paper-setter. Generate exactly ${count} advanced Assertion (A) & Reason (R) MCQs for the given topic.

FORMAT CONSTRAINTS:
- Every question must start strictly with "Q. "
- Follow this layout:
Q. Given below are two statements, one is labelled as Assertion (A) and the other is labelled as Reason (R):
Assertion (A): [Specific factual or analytical claim]
Reason (R): [Explanatory or causal claim]
1) Both (A) and (R) are true and (R) is the correct explanation of (A).
2) Both (A) and (R) are true, but (R) is NOT the correct explanation of (A).
3) (A) is true, but (R) is false.
4) (A) is false, but (R) is true.
Correct: [1/2/3/4]
Explanation:
- Assertion (A): [Why it is true or false with verified facts]
- Reason (R): [Why it is true or false with verified facts]
- Analytical Link: [Why R correctly explains or fails to explain A]

LOGICAL OUTCOME VARIATION:
Ensure a diverse balance across all 4 logical possibilities:
- Both true with correct explanation
- Both true but unrelated/incorrect explanation
- Assertion true, Reason false
- Assertion false, Reason true

DIFFICULTY & TONE:
- High analytical depth: Both Assertion and Reason should sound plausible so students must evaluate the causal relationship.
- Human-made, crisp wording with no robotic padding.
- Zero source citations or page references.

ANSWER KEY DISTRIBUTION (MANDATORY):
Across the ${count} questions:
- Exactly ${Math.floor(count / 4)} questions with Correct: 1
- Exactly ${Math.floor(count / 4)} questions with Correct: 2
- Exactly ${Math.floor(count / 4)} questions with Correct: 3
- Exactly ${Math.floor(count / 4)} questions with Correct: 4
(Randomly mixed).

Output only the ${count} raw questions. No introductory text, no headings, no markdown code blocks.
`;
        } else {
            // FOUNDATION ASSERTION & REASON (Exact User Prompt)
            formatPrompt = `
Act as an expert RPSC RAS paper-setter. Generate exactly ${count} FOUNDATION LEVEL Assertion (A) & Reason (R) MCQs for the given topic.

PEDAGOGICAL INTENT (FOUNDATION LEVEL):
- Focus on fundamental cause-and-effect relationships and basic scientific/historical justifications (e.g., why western Rajasthan has an arid climate; why a specific article was enacted; why a treaty took place).
- Statements should be straightforward so a student with basic textbook reading can evaluate the relationship.

FORMAT CONSTRAINTS:
- Every question must start strictly with "Q. "
- Follow this layout:
Q. Given below are two statements, one is labelled as Assertion (A) and the other is labelled as Reason (R):
Assertion (A): [Direct, foundational claim]
Reason (R): [Basic explanatory statement]
1) Both (A) and (R) are true and (R) is the correct explanation of (A).
2) Both (A) and (R) are true, but (R) is NOT the correct explanation of (A).
3) (A) is true, but (R) is false.
4) (A) is false, but (R) is true.
Correct: [1/2/3/4]
Explanation:
- Assertion (A): [Direct explanation of validity]
- Reason (R): [Direct explanation of validity]
- Conceptual Link: [Clear explanation of why R explains or does not explain A]

LOGICAL OUTCOME VARIATION:
Distribute all 4 standard outcomes across the ${count} questions:
- Both true with explanation
- Both true but different/unrelated explanation
- (A) true, (R) false
- (A) false, (R) true

ANSWER KEY DISTRIBUTION (MANDATORY):
Across the ${count} questions:
- Exactly ${Math.floor(count / 4)} questions with Correct: 1
- Exactly ${Math.floor(count / 4)} questions with Correct: 2
- Exactly ${Math.floor(count / 4)} questions with Correct: 3
- Exactly ${Math.floor(count / 4)} questions with Correct: 4
(Randomly distributed).

Output only the ${count} raw questions. No introductory text, no headings, no markdown code blocks.
`;
        }
    } else if (formatUpper === 'MATCH') {
        if (!isFoundation) {
            // ADVANCED MATCH THE COLUMN (Exact User Prompt)
            formatPrompt = `
Act as an expert RPSC RAS paper-setter. Generate exactly ${count} advanced Match the Column MCQs in tabular format for the given topic.

FORMAT CONSTRAINTS:
- Every question must start strictly with "Q. "
- The columns MUST be presented in a clean Markdown table with exactly 4 rows (no ASCII art or border symbols):

Q. Match List-I with List-II:

| List-I ([Category A]) | List-II ([Category B]) |
|---|---|
| X. [Item 1] | I. [Match item] |
| Y. [Item 2] | II. [Match item] |
| Z. [Item 3] | III. [Match item] |
| W. [Item 4] | IV. [Match item] |

Select the correct code from the options given below:
1) X-[i], Y-[ii], Z-[iii], W-[iv]
2) X-[i], Y-[ii], Z-[iii], W-[iv]
3) X-[i], Y-[ii], Z-[iii], W-[iv]
4) X-[i], Y-[ii], Z-[iii], W-[iv]
Correct: [1/2/3/4]
Explanation:
- X matches [Item]: [Concise reason]
- Y matches [Item]: [Concise reason]
- Z matches [Item]: [Concise reason]
- W matches [Item]: [Concise reason]

SCRAMBLING & DISTRACTOR RULES:
- Under NO circumstances should the correct answer be a straight sequential match (e.g., X-I, Y-II, Z-III, W-IV is strictly forbidden).
- Every question must have a completely unique match sequence (e.g., X-III, Y-I, Z-IV, W-II).
- Plausible Distractors: Incorrect options must share at least 1 or 2 correct pairs with the right answer so elimination is non-trivial.

ANSWER KEY DISTRIBUTION (MANDATORY):
Across the ${count} questions:
- Exactly ${Math.floor(count / 4)} questions with Correct: 1
- Exactly ${Math.floor(count / 4)} questions with Correct: 2
- Exactly ${Math.floor(count / 4)} questions with Correct: 3
- Exactly ${Math.floor(count / 4)} questions with Correct: 4
(Randomly distributed).

Output only the ${count} raw questions. No introductory text, no headings, no markdown code blocks.
`;
        } else {
            // FOUNDATION MATCH THE COLUMN (Exact User Prompt)
            formatPrompt = `
Act as an expert RPSC RAS paper-setter. Generate exactly ${count} FOUNDATION LEVEL Match the Column MCQs for the given topic.

PEDAGOGICAL INTENT (FOUNDATION LEVEL):
- Match core foundational associations:
  - Districts with their headquarters / shapes / boundaries
  - Major hills/peaks with their elevation / district
  - Rulers with their dynasties / major battles
  - Schemes with their nodal departments / launch years
  - Minerals with their primary producing regions

FORMAT CONSTRAINTS:
- Every question must start strictly with "Q. "
- Must use a clean 4-row Markdown table (no ASCII borders):

Q. Match List-I with List-II:

| List-I ([Category A]) | List-II ([Category B]) |
|---|---|
| A. [Item 1] | I. [Match item] |
| B. [Item 2] | II. [Match item] |
| C. [Item 3] | III. [Match item] |
| D. [Item 4] | IV. [Match item] |

Select the correct code from the options given below:
1) A-[i], B-[ii], C-[iii], D-[iv]
2) A-[i], B-[ii], C-[iii], D-[iv]
3) A-[i], B-[ii], C-[iii], D-[iv]
4) A-[i], B-[ii], C-[iii], D-[iv]
Correct: [1/2/3/4]
Explanation:
- A matches [Item]: [Clear factual reason]
- B matches [Item]: [Clear factual reason]
- C matches [Item]: [Clear factual reason]
- D matches [Item]: [Clear factual reason]

SCRAMBLING RULES:
- Never make the correct option sequential (A-I, B-II, C-III, D-IV is forbidden).
- Options must be 1), 2), 3), 4).

ANSWER KEY DISTRIBUTION (MANDATORY):
Across the ${count} questions:
- Exactly ${Math.floor(count / 4)} questions with Correct: 1
- Exactly ${Math.floor(count / 4)} questions with Correct: 2
- Exactly ${Math.floor(count / 4)} questions with Correct: 3
- Exactly ${Math.floor(count / 4)} questions with Correct: 4
(Randomly distributed).

Output only the ${count} raw questions. No introductory text, no headings, no markdown code blocks.
`;
        }
    } else if (formatUpper === 'CHRONOLOGY') {
        // CHRONOLOGY / SEQUENCE MCQs
        formatPrompt = `
Act as an expert RPSC RAS paper-setter. Generate exactly ${count} ${isFoundation ? 'FOUNDATION' : 'ADVANCED'} Chronology (Sequence) MCQs for the given topic.

FORMAT CONSTRAINTS:
- Every question must start strictly with "Q. "
- Statements MUST strictly use Roman numerals (I, II, III, IV) representing chronological events, rulers, battles, or treaties.
LAYOUT TEMPLATE:
Q. Arrange the following in correct chronological order from earliest to latest:
I. [Historical event / ruler / development I]
II. [Historical event / ruler / development II]
III. [Historical event / ruler / development III]
IV. [Historical event / ruler / development IV]
Select the correct sequence from the options below:
1) I, II, III, IV
2) II, I, IV, III
3) III, I, II, IV
4) IV, II, I, III
Correct: [1/2/3/4]
Explanation:
- I. [Event]: [Exact year/date]
- II. [Event]: [Exact year/date]
- III. [Event]: [Exact year/date]
- IV. [Event]: [Exact year/date]

ANSWER KEY DISTRIBUTION (MANDATORY):
Across the ${count} questions:
- Exactly ${Math.floor(count / 4)} questions with Correct: 1
- Exactly ${Math.floor(count / 4)} questions with Correct: 2
- Exactly ${Math.floor(count / 4)} questions with Correct: 3
- Exactly ${Math.floor(count / 4)} questions with Correct: 4
(Randomly distributed).

Output only the ${count} raw questions. No introductory text, no headings, no markdown code blocks.
`;
    } else if (formatUpper === 'NOT_MATCHED') {
        // NOT MATCHED (Find False Pair) MCQs
        formatPrompt = `
Act as an expert RPSC RAS paper-setter. Generate exactly ${count} ${isFoundation ? 'FOUNDATION' : 'ADVANCED'} 'Not Matched' (Find Incorrect Pair) MCQs for the given topic.

FORMAT CONSTRAINTS:
- Every question must start strictly with "Q. "
- Question phrasing: Core keywords ending with colon (:), identifying the incorrectly matched pair.
LAYOUT TEMPLATE:
Q. Identify the pair that is NOT correctly matched:
1) [Entity A] : [Attribute/District/Date A]
2) [Entity B] : [Attribute/District/Date B]
3) [Entity C] : [Attribute/District/Date C]
4) [Entity D] : [Attribute/District/Date D]
Correct: [1/2/3/4]
Explanation:
- [Entity of incorrect option]: [Verified correct fact and reason why it is mismatched]
- [Entity of other option]: [Brief confirmation of correct match]

ANSWER KEY DISTRIBUTION (MANDATORY):
Across the ${count} questions:
- Exactly ${Math.floor(count / 4)} questions with Correct: 1
- Exactly ${Math.floor(count / 4)} questions with Correct: 2
- Exactly ${Math.floor(count / 4)} questions with Correct: 3
- Exactly ${Math.floor(count / 4)} questions with Correct: 4
(Randomly distributed).

Output only the ${count} raw questions. No introductory text, no headings, no markdown code blocks.
`;
    } else {
        // ALL / MIXED
        formatPrompt = `
Act as an expert RPSC RAS paper-setter. Generate exactly ${count} ${isFoundation ? 'FOUNDATION' : 'ADVANCED'} questions distributed across:
1. Classical MCQs (Direct)
2. Statement-Based MCQs (Statements I, II, III)
3. Assertion (A) & Reason (R) MCQs
4. Match the Column MCQs (4-row Markdown table)

- Every question must start strictly with "Q. "
- Options must be strictly 1), 2), 3), 4).
- Key format: Correct: [1/2/3/4]
- Explanation format:
Explanation:
- [Fact 1]
- [Fact 2]

ANSWER KEY DISTRIBUTION:
Across the ${count} questions:
- Exactly ${Math.floor(count / 4)} with Correct: 1
- Exactly ${Math.floor(count / 4)} with Correct: 2
- Exactly ${Math.floor(count / 4)} with Correct: 3
- Exactly ${Math.floor(count / 4)} with Correct: 4

Output only the ${count} raw questions. No introductory text, no headings, no markdown code blocks.
`;
    }

    return `${formatPrompt}\n\n${syllabusContext}\n\n${coreStyleRules}\n\n${specialInjections}\n\n${existingQuestionsSection}`;
}

/**
 * Exact User Translation Prompt for Administrative Hindi
 */
function buildHindiTranslationPrompt(englishQuestionsText, isFoundation = false) {
    if (isFoundation) {
        return `Translate the following 20 foundation questions into formal administrative Hindi (शासकीय हिंदी) for the RPSC RAS examination.

RULES:
1. Retain all layout: "Q. " prefix, 1) 2) 3) 4) options, "Correct: [1/2/3/4]", and "Explanation:".
2. Keep the correct answer numbers identical.
3. Keep markdown tables, assertion/reason labels (अभिकथन (A) तथा कारण (R)), and bullet points (- ) unchanged.
4. Use standard, clear academic Hindi terminology suitable for foundation level understanding.

Here are the 20 questions to translate:
${englishQuestionsText}
`;
    }

    return `Translate the following 20 questions into formal administrative Hindi (शासकीय हिंदी) for the RPSC RAS examination.

STRICT TRANSLATION RULES:
1. Preserve All Structure: Keep the "Q. " prefix, the 1), 2), 3), 4) option format, the "Correct: [1/2/3/4]" label, and the "Explanation:" label exactly as they are.
2. Identical Match: Translate word-for-word maintaining exact factual parity with the English version. Do NOT change the correct option number under any circumstances.
3. Tables & Formats: Keep markdown tables, assertion/reason labels (अभिकथन (A) तथा कारण (R)), and bullet-point explanations in the exact same layout.
4. Human-Made Tone: Use standard Hindi academic/administrative vocabulary (e.g., उपयोग, प्रावधान, अधिनियम, सुमेलित).

Here are the 20 English questions to translate:
${englishQuestionsText}
`;
}

module.exports = {
    buildPrompt,
    buildHindiTranslationPrompt
};
