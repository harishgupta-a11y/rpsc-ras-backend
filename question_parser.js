/**
 * RPSC RAS Output Parser
 * 
 * Parses raw text containing questions adhering to:
 * Q. [question text]
 * 1) [option 1]
 * 2) [option 2]
 * 3) [option 3]
 * 4) [option 4]
 * Correct: [1/2/3/4]
 * Explanation:
 * - [bullet 1]
 * - [bullet 2]
 */

function parseGeneratedQuestions(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return [];
    }

    // Strip markdown code block wrappers if any were returned
    let cleanText = rawText.replace(/```[a-zA-Z]*\n?/g, '').trim();

    // Split text into individual question blocks based on "Q. " or start of question
    // Regex splits by lookahead on "\nQ. " or "^Q. "
    const rawBlocks = cleanText.split(/(?:^|\n)(?=Q\.\s*)/g).filter(b => b.trim().length > 0);

    const questions = [];

    for (let block of rawBlocks) {
        block = block.trim();
        if (!block.startsWith('Q.') && !block.startsWith('Q ')) continue;

        try {
            const parsed = parseSingleBlock(block);
            if (parsed && parsed.question_text && parsed.option_a && parsed.option_b && parsed.correct_option) {
                questions.push(parsed);
            }
        } catch (e) {
            console.warn('[Question Parser] Failed to parse block:', e.message);
        }
    }

    return questions;
}

function parseSingleBlock(block) {
    // Normalize line endings
    const lines = block.split(/\r?\n/).map(l => l.trimEnd());

    let questionLines = [];
    let option1 = '';
    let option2 = '';
    let option3 = '';
    let option4 = '';
    let correctOption = '1';
    let explanationLines = [];

    let currentSection = 'QUESTION'; // 'QUESTION', 'EXPLANATION'

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check for Correct line
        const correctMatch = trimmed.match(/^(?:Correct(?:\s*Answer)?|Key|उत्तर)\s*:\s*([1-4A-D])/i);
        if (correctMatch) {
            let val = correctMatch[1].toUpperCase();
            if (val === 'A') val = '1';
            else if (val === 'B') val = '2';
            else if (val === 'C') val = '3';
            else if (val === 'D') val = '4';
            correctOption = val;
            currentSection = 'PRE_EXPLANATION';
            continue;
        }

        // Check for Explanation header
        if (/^(?:Explanation|व्याख्या)\s*:/i.test(trimmed)) {
            currentSection = 'EXPLANATION';
            const afterColon = trimmed.replace(/^(?:Explanation|व्याख्या)\s*:\s*/i, '').trim();
            if (afterColon) {
                explanationLines.push(afterColon);
            }
            continue;
        }

        // Check for Options 1), 2), 3), 4) or 1., 2., 3., 4.
        const opt1Match = trimmed.match(/^(?:1\)|1\.|[1]\)|\(1\)|A\)|A\.|[A]\))\s*(.*)/);
        const opt2Match = trimmed.match(/^(?:2\)|2\.|[2]\)|\(2\)|B\)|B\.|[B]\))\s*(.*)/);
        const opt3Match = trimmed.match(/^(?:3\)|3\.|[3]\)|\(3\)|C\)|C\.|[C]\))\s*(.*)/);
        const opt4Match = trimmed.match(/^(?:4\)|4\.|[4]\)|\(4\)|D\)|D\.|[D]\))\s*(.*)/);

        if (opt1Match && !option1) {
            option1 = opt1Match[1].trim();
            continue;
        }
        if (opt2Match && !option2) {
            option2 = opt2Match[1].trim();
            continue;
        }
        if (opt3Match && !option3) {
            option3 = opt3Match[1].trim();
            continue;
        }
        if (opt4Match && !option4) {
            option4 = opt4Match[1].trim();
            continue;
        }

        if (currentSection === 'EXPLANATION') {
            explanationLines.push(line);
        } else if (currentSection === 'QUESTION') {
            questionLines.push(line);
        }
    }

    // Clean question text: strip leading "Q. " or "Q."
    let questionText = questionLines.join('\n').trim();
    questionText = questionText.replace(/^Q\.\s*/i, '').trim();

    // Clean explanation
    let detailedExplanation = explanationLines.join('\n').trim();
    if (!detailedExplanation) {
        detailedExplanation = '- Official solution adhering to standard syllabus documentation.';
    }

    // Ensure options are populated with fallbacks if missing
    if (!option1) option1 = 'Option 1';
    if (!option2) option2 = 'Option 2';
    if (!option3) option3 = 'Option 3';
    if (!option4) option4 = 'Option 4';

    // Validate correct_option is strictly '1'|'2'|'3'|'4'
    if (!['1', '2', '3', '4'].includes(correctOption)) {
        correctOption = '1';
    }

    return {
        question_text: questionText,
        option_a: option1,
        option_b: option2,
        option_c: option3,
        option_d: option4,
        correct_option: correctOption,
        detailed_explanation: detailedExplanation
    };
}

module.exports = {
    parseGeneratedQuestions,
    parseSingleBlock
};
