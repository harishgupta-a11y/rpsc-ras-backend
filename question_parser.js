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

    // Split text into individual question blocks based on "Q." or "Q1." or "**Q.**"
    const rawBlocks = cleanText.split(/(?:^|\n)(?=(?:\*\*)?Q(?:\.|\s|\d+\.|\s*\d+\))(?:\*\*)?)/gi).filter(b => b.trim().length > 0);

    const questions = [];

    for (let block of rawBlocks) {
        block = block.trim();
        if (!/^(?:\*\*)?Q/i.test(block)) continue;

        try {
            const parsed = parseSingleBlock(block);
            if (parsed && parsed.question_text && parsed.option_a && parsed.option_b && parsed.option_c && parsed.option_d) {
                questions.push(parsed);
            }
        } catch (e) {
            console.warn('[Question Parser] Failed to parse block:', e.message);
        }
    }

    return questions;
}

function parseSingleBlock(block) {
    if (!block || typeof block !== 'string') return null;

    // Normalize line endings and strip trailing whitespace
    const lines = block.split(/\r?\n/).map(l => l.trimEnd());

    // 1. Locate "Correct:" line and "Explanation:" line
    let correctIdx = -1;
    let explanationIdx = -1;
    let correctOption = '1';

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        // Check for Correct line: Correct:, Key:, उत्तर:, Correct Option:, etc.
        const correctMatch = trimmed.match(/^(?:\*\*)?(?:Correct(?:\s*(?:Answer|Option))?|Key|उत्तर|उत्तर\s*कुंजी)(?:\*\*)?\s*:\s*([1-4A-D])/i);
        if (correctMatch && correctIdx === -1) {
            correctIdx = i;
            let val = correctMatch[1].toUpperCase();
            if (val === 'A') val = '1';
            else if (val === 'B') val = '2';
            else if (val === 'C') val = '3';
            else if (val === 'D') val = '4';
            correctOption = val;
        }

        // Check for Explanation header: Explanation:, व्याख्या:, etc.
        const explMatch = trimmed.match(/^(?:\*\*)?(?:Explanation|व्याख्या)(?:\*\*)?\s*:/i);
        if (explMatch && explanationIdx === -1) {
            explanationIdx = i;
        }
    }

    // 2. Extract explanation lines
    let explanationLines = [];
    if (explanationIdx !== -1) {
        const firstExplLine = lines[explanationIdx].trim().replace(/^(?:\*\*)?(?:Explanation|व्याख्या)(?:\*\*)?\s*:\s*/i, '').trim();
        if (firstExplLine) explanationLines.push(firstExplLine);
        for (let i = explanationIdx + 1; i < lines.length; i++) {
            explanationLines.push(lines[i]);
        }
    }

    // 3. Scan the portion before Correct / Explanation for options and question text
    const endBoundary = (correctIdx !== -1) ? correctIdx : ((explanationIdx !== -1) ? explanationIdx : lines.length);
    const preLines = lines.slice(0, endBoundary);

    // Helpers to detect option line prefixes:
    // Matches: 1), 1., (1), [1], 1:, 1 -, **1)**, **1.**, **(1)**, A), A., (A), [A], **A)**, etc.
    function getOptionNumber(line) {
        const clean = line.trim().replace(/^\*+\s*|\*+$/g, '').trim();
        // Option 1
        if (/^(?:\*\*)?(?:1\)|1\.|[1]\)|\(1\)|\(1\)\.|\[1\]|1:|1\s*[-–—]|A\)|A\.|[A]\)|\(A\)|\(A\)\.|\[A\]|A:|A\s*[-–—])(?:\*\*)?\s+/i.test(clean)) {
            return 1;
        }
        // Option 2
        if (/^(?:\*\*)?(?:2\)|2\.|[2]\)|\(2\)|\(2\)\.|\[2\]|2:|2\s*[-–—]|B\)|B\.|[B]\)|\(B\)|\(B\)\.|\[B\]|B:|B\s*[-–—])(?:\*\*)?\s+/i.test(clean)) {
            return 2;
        }
        // Option 3
        if (/^(?:\*\*)?(?:3\)|3\.|[3]\)|\(3\)|\(3\)\.|\[3\]|3:|3\s*[-–—]|C\)|C\.|[C]\)|\(C\)|\(C\)\.|\[C\]|C:|C\s*[-–—])(?:\*\*)?\s+/i.test(clean)) {
            return 3;
        }
        // Option 4
        if (/^(?:\*\*)?(?:4\)|4\.|[4]\)|\(4\)|\(4\)\.|\[4\]|4:|4\s*[-–—]|D\)|D\.|[D]\)|\(D\)|\(D\)\.|\[D\]|D:|D\s*[-–—])(?:\*\*)?\s+/i.test(clean)) {
            return 4;
        }
        // Option 5
        if (/^(?:\*\*)?(?:5\)|5\.|\(5\)|\(5\)\.|\[5\]|5:|5\s*[-–—]|E\)|E\.|[E]\)|\(E\)|\(E\)\.|\[E\]|E:|E\s*[-–—])(?:\*\*)?\s+/i.test(clean) ||
            /^(?:\*\*)?(?:5\)|5\.|\(5\)|\[5\]|E\)|E\.)\s*(?:Unattempted|अनुत्तरित)/i.test(clean)) {
            return 5;
        }
        return 0;
    }

    function extractOptionText(line) {
        const clean = line.trim().replace(/^\*+\s*|\*+$/g, '').trim();
        return clean.replace(/^(?:\*\*)?(?:[1-5A-E]\)|[1-5A-E]\.|\[[1-5A-E]\]|\([1-5A-E]\)|\([1-5A-E]\)\.|\[[1-5A-E]\]|[1-5A-E]:|[1-5A-E]\s*[-–—])(?:\*\*)?\s*/i, '').trim();
    }

    // Work backwards from endBoundary to find the 4 question options (and discard option 5)
    let opt1 = '', opt2 = '', opt3 = '', opt4 = '';
    let optionLineIndices = new Set();

    for (let i = preLines.length - 1; i >= 0; i--) {
        const line = preLines[i];
        if (!line.trim()) continue;
        const optNum = getOptionNumber(line);

        if (optNum === 5) {
            optionLineIndices.add(i); // Discard Option 5
            continue;
        }
        if (optNum === 4 && !opt4) {
            opt4 = extractOptionText(line);
            optionLineIndices.add(i);
            continue;
        }
        if (optNum === 3 && !opt3) {
            opt3 = extractOptionText(line);
            optionLineIndices.add(i);
            continue;
        }
        if (optNum === 2 && !opt2) {
            opt2 = extractOptionText(line);
            optionLineIndices.add(i);
            continue;
        }
        if (optNum === 1 && !opt1) {
            opt1 = extractOptionText(line);
            optionLineIndices.add(i);
            // Once all 4 options are found, earlier numbered lines (e.g. in List-II) are preserved as question text
            if (opt1 && opt2 && opt3 && opt4) {
                break;
            }
        }
    }

    // All lines NOT in optionLineIndices make up the questionText
    const questionLines = [];
    for (let i = 0; i < preLines.length; i++) {
        if (!optionLineIndices.has(i)) {
            questionLines.push(preLines[i]);
        }
    }

    let questionText = questionLines.join('\n').trim();
    // Clean leading Q. prefix (e.g. "Q. ", "Q. 1. ", "Q ", "**Q.** ")
    questionText = questionText.replace(/^(?:\*\*)?Q(?:uestion)?(?:\.|\s|\d+\.|\s*\d+\))(?:\*\*)?\s*/i, '').trim();
    questionText = questionText.replace(/^[\d]+\.\s*/, '').trim();
    // Strip dangling "Options:" or "कूट:" from question text if present at the end
    questionText = questionText.replace(/(?:\r?\n|^)\s*(?:Options|कूट|विकल्प)\s*:\s*$/i, '').trim();

    let detailedExplanation = explanationLines.join('\n').trim();
    if (!detailedExplanation) {
        detailedExplanation = '- Official solution adhering to standard syllabus documentation.';
    }

    // Strict Validation:
    // 1. All 4 options must be non-empty strings
    if (!opt1 || !opt2 || !opt3 || !opt4) {
        console.warn(`[Question Parser] Block rejected: missing options (1: ${!!opt1}, 2: ${!!opt2}, 3: ${!!opt3}, 4: ${!!opt4})`);
        return null;
    }

    // 2. Reject placeholder options like "Option 1"
    const isDummy = (s) => /^Option\s*[1-4A-D]$/i.test(s.trim());
    if (isDummy(opt1) || isDummy(opt2) || isDummy(opt3) || isDummy(opt4)) {
        console.warn(`[Question Parser] Block rejected: dummy placeholder option detected`);
        return null;
    }

    // 3. Question text must have meaningful length
    if (questionText.length < 8) {
        console.warn(`[Question Parser] Block rejected: question text too short (${questionText.length} chars)`);
        return null;
    }

    // Validate correct_option is strictly '1'|'2'|'3'|'4'
    if (!['1', '2', '3', '4'].includes(correctOption)) {
        correctOption = '1';
    }

    return {
        question_text: questionText,
        option_a: opt1,
        option_b: opt2,
        option_c: opt3,
        option_d: opt4,
        correct_option: correctOption,
        detailed_explanation: detailedExplanation
    };
}

module.exports = {
    parseGeneratedQuestions,
    parseSingleBlock
};
