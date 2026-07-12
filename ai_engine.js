// RPSC RAS Exam Prep - Google Gemini AI Pipeline Integration
const { GoogleGenAI } = require('@google/generative-ai');

// Initialize Gemini API Client
// Note: In production, ensure GEMINI_API_KEY is configured in your environment variables.
const apiKey = process.env.GEMINI_API_KEY || 'MOCK_KEY_FOR_TESTING';

let genAI;
if (apiKey && apiKey !== 'MOCK_KEY_FOR_TESTING') {
    // Standard initialization using @google/generative-ai SDK
    // For the newer SDK, you can use: const genAI = new GoogleGenAI({ apiKey });
    // In typical projects: const { GoogleGenAI } = require('@google/generative-ai');
    try {
        genAI = new GoogleGenAI({ apiKey });
    } catch (e) {
        console.warn("Error initializing Gemini API Client:", e.message);
    }
}

/**
 * Helper to get a mock theory content response for RPSC RAS topics when API Key is missing.
 */
function getMockTheory(subject, topic) {
    return `# RPSC RAS Comprehensive Guide: ${topic}
## Subject: ${subject}

### 1. Introduction & Historical Context
The study of **${topic}** is of paramount importance for the Rajasthan Administrative Services (RAS) examination. This subject covers essential concepts, historical records, and policy frameworks critical for administrative operations within Rajasthan.

### 2. Core Themes & Concepts
* **Key Administrative Frameworks**: Structured administration, division of authority, and public policy formulation.
* **Geographical & Historical Influence**: The unique physical and socio-cultural terrain of Rajasthan shapes the development of this topic.
* **Modern Implications**: Ongoing reforms, legal checks, and welfare integrations.

### 3. Comprehensive Analysis
Here is a breakdown of the key dimensions relevant to the RPSC syllabus:

| Dimension | Primary Focus | Administrative Utility |
|-----------|---------------|------------------------|
| **Historical Origin** | Deep-rooted historical milestones and evolution | Contextual understanding of policies |
| **Institutional Framework** | Constitutional bodies, statutory committees, and district officers | Governance and execution mechanics |
| **Socio-Economic Impact** | Direct interface with citizens, backward class empowerment | Welfare distribution assessment |

### 4. Practice and Revision Guidelines
Candidates should focus on:
1. Connecting historical policies to modern Rajasthani schemes (e.g., Chiranjeevi, Bhamashah).
2. Memorizing key constitutional articles (e.g., Article 243 for Panchayati Raj).
3. Citing official state surveys and budget statistics in descriptive Mains answers.

> [!TIP]
> Always structure Mains answers using a brief introduction, followed by tabular comparisons, and end with a forward-looking conclusion advocating good governance (Suraaj).
`;
}

/**
 * Helper to get mock MCQs when API Key is missing.
 */
function getMockMCQs(subject, topic, count = 5) {
    const list = [
        {
            question: `In which of the following years was the Rajasthan Public Service Commission (RPSC) established?`,
            options: {
                A: "1947 AD",
                B: "1948 AD",
                C: "1949 AD",
                D: "1950 AD"
            },
            correct: "C",
            explanation: "RPSC was established on 22nd December 1949 under an ordinance promulgated by the Rajpramukh of Rajasthan. The initial headquarters was in Jaipur and was later shifted to Ajmer on the recommendation of the Satyanarayan Rao Committee."
        },
        {
            question: `Which Governor of Rajasthan has had the longest tenure in office?`,
            options: {
                A: "Gurmukh Nihal Singh",
                B: "Dr. Sampurnanand",
                C: "Madan Lal Khurana",
                D: "Margaret Alva"
            },
            correct: "A",
            explanation: "Sardar Gurmukh Nihal Singh was the first Governor of Rajasthan and held office from 1st November 1956 to 16th April 1962, marking the longest tenure in the state's history."
        },
        {
            question: `The Kalibangan archaeological site is situated along the banks of which river in Rajasthan?`,
            options: {
                A: "Luni River",
                B: "Chambal River",
                C: "Ghaggar River",
                D: "Banas River"
            },
            correct: "C",
            explanation: "Kalibangan, located in Hanumangarh district, is a major Harappan civilization site situated on the left bank of the seasonal Ghaggar River (identified by some as the ancient Sarasvati)."
        },
        {
            question: `Under RPSC administrative patterns, who appoints the Chairman of the Rajasthan Public Service Commission?`,
            options: {
                A: "The President of India",
                B: "The Governor of Rajasthan",
                C: "The Chief Justice of Rajasthan High Court",
                D: "The Chief Minister of Rajasthan"
            },
            correct: "B",
            explanation: "As per Article 316 of the Constitution of India, the Chairman and other members of a State Public Service Commission are appointed by the Governor of the State. However, they can only be removed by the President of India."
        },
        {
            question: `Which of the following mountain peaks is the highest point of the Aravalli Range in Rajasthan?`,
            options: {
                A: "Ser",
                B: "Dilwara",
                C: "Guru Shikhar",
                D: "Achalgarh"
            },
            correct: "C",
            explanation: "Guru Shikhar, situated in the Sirohi district (Mount Abu), is the highest peak of the Aravalli Range with an elevation of 1,722 meters (5,650 ft)."
        }
    ];

    // Return the requested count or slice
    let output = [];
    for (let i = 0; i < count; i++) {
        output.push(list[i % list.length]);
    }
    return output;
}

/**
 * Helper to get mock Mains questions when API Key is missing.
 */
function getMockMains(subject, topic) {
    return [
        {
            question: `Explain the administrative challenges faced during the integration of Rajasthan between 1948 and 1956. (Word limit: 50 words)`,
            suggested_answer: `The integration of 19 princely states and 3 chiefships created massive administrative discrepancies, including diverse revenue systems, non-standardized civil service cadres, and varying judicial laws. Resolving these required establishing unified cadres, standardizing tax structures, and relocating department headquarters strategically across cities (e.g., High Court to Jodhpur, Education to Bikaner) to appease regional interests.`,
            key_eval_points: [
                "Mention of 19 states and 3 chiefships",
                "Administrative challenges: revenue unification, civil service standards",
                "Mentions Rao Committee recommendations / headquarters relocation"
            ],
            word_limit: 50
        },
        {
            question: `Describe the role of the Governor of Rajasthan under Article 356 of the Indian Constitution. (Word limit: 100 words)`,
            suggested_answer: `Under Article 356, if the Governor of Rajasthan is satisfied that a situation has arisen where the state government cannot be carried out in accordance with the Constitution, they submit a report to the President. Upon proclamation of President's Rule, the Governor assumes executive authority on behalf of the President, administering the state through the Chief Secretary and advisors. This role shifts the Governor from a constitutional figurehead to the active chief executive of the state, ensuring constitutional machinery is restored.`,
            key_eval_points: [
                "Constitutional break-down condition",
                "Governor's report to President of India",
                "Assumption of direct executive power via Chief Secretary",
                "Reference to Article 356 context in Rajasthan's past applications"
            ],
            word_limit: 100
        }
    ];
}

/**
 * Generate Factual Study Material/Notes in Markdown format for a given topic.
 */
async function generateTheoryContent(subject, topic) {
    if (!genAI) {
        console.log(`[AI Pipeline] API Key not set. Returning mock theory content for "${topic}"`);
        return getMockTheory(subject, topic);
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are a civil-services academic author. Generate highly reliable, factual, civil-services-grade documentation formatted exclusively in GitHub Markdown for RPSC RAS preparation.
Subject: ${subject}
Topic: ${topic}
Ensure the content contains:
1. Executive summary of the topic.
2. Comprehensive historical/geographical/economic/constitutional context.
3. Structured tabular comparisons if applicable.
4. Review bullet points and key takeaways.
5. High quality warnings or tips using standard alerts like '> [!TIP]'.
Do not include any greeting or explanation outside the markdown.`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("[AI Pipeline] Gemini Generation Error, falling back to mock:", error);
        return getMockTheory(subject, topic);
    }
}

/**
 * Generate MCQs for RPSC Pre.
 */
async function generateMCQBatch(subject, topic, count = 10) {
    if (!genAI) {
        console.log(`[AI Pipeline] API Key not set. Returning ${count} mock MCQs for "${topic}"`);
        return getMockMCQs(subject, topic, count);
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `You are an RPSC examination controller. Output a structured JSON array containing exactly ${count} multiple choice questions (MCQs) for RAS Pre Exam on the following topic.
Subject: ${subject}
Topic: ${topic}
Each question must follow the RPSC pattern: 4 options (A, B, C, D), strict +1.33 marks for correct and -0.44 marks (1/3 negative marking) context. Provide a detailed, highly factual explanation of the correct answer.

Output format must strictly conform to this JSON Schema:
[
  {
    "question": "The full question text",
    "options": {
      "A": "Option text A",
      "B": "Option text B",
      "C": "Option text C",
      "D": "Option text D"
    },
    "correct": "A", // must be 'A', 'B', 'C', or 'D'
    "explanation": "Detailed explanation citing facts, historical records, or constitutional articles."
  }
]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text);
    } catch (error) {
        console.error("[AI Pipeline] Gemini MCQ Generation Error, falling back to mock:", error);
        return getMockMCQs(subject, topic, count);
    }
}

/**
 * Generate Mains descriptive writing template.
 */
async function generateMainsTemplates(subject, topic) {
    if (!genAI) {
        console.log(`[AI Pipeline] API Key not set. Returning mock Mains descriptive template for "${topic}"`);
        return getMockMains(subject, topic);
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `You are a senior evaluator for RPSC RAS Mains papers. Generate a structured JSON array containing 2 descriptive questions, answer writing guidelines, and sample responses for the following topic:
Subject: ${subject}
Topic: ${topic}

Each item must have:
1. Question text
2. A suggested high-scoring answer template conforming to RPSC word limits (50 words or 100 words)
3. key_eval_points: array of phrases or facts the evaluator must check in the response
4. word_limit: number of words (e.g. 50, 100)

Output format must strictly conform to this JSON Schema:
[
  {
    "question": "Question text...",
    "suggested_answer": "Complete suggested response template...",
    "key_eval_points": ["Point 1", "Point 2"],
    "word_limit": 50
  }
]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text);
    } catch (error) {
        console.error("[AI Pipeline] Gemini Mains Generation Error, falling back to mock:", error);
        return getMockMains(subject, topic);
    }
}

async function generateMCQsFromNotes(pdfText, topicName, count = 20) {
    if (!genAI) {
        throw new Error("Gemini API Key is not configured in the environment.");
    }
    
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `You are a senior examiner for the RPSC (Rajasthan Public Service Commission) exams.
Your task is to generate exactly ${count} highly challenging Prelims MCQs of IAS/RAS level. Use the provided reference notes as the core anchor, but expand and draw upon your own comprehensive, expert historical knowledge base (including standard web, online, and academic reference content) to craft the best, most comprehensive questions possible.

---
REFERENCE NOTES:
${pdfText}
---

TOPIC: ${topicName}

RULES FOR MCQS:
1. Make questions of IAS/RAS level. They must be a mix of highly tough, moderate, and easy difficulty in a ratio of 2:1:1. Do NOT mention the difficulty level in the question text.
2. The questions must be of all types that come in RPSC exams:
   - Classical MCQ
   - Statement-based type (diversifying correct statements: e.g. sometimes 1 & 2 correct, sometimes only 1, sometimes 2 & 3, etc.)
   - Assertion-Reason type (diversifying relationships: e.g. both A and R correct, A-correct R-incorrect, A-incorrect R-correct, etc.)
   - Match the Column type (rendered in clean Markdown tables).
   These types should be mixed in a ratio of 3:1:1:1.
3. The correct options should be evenly distributed among A, B, C, and D in a 1:1:1:1 ratio.
4. For every question, generate exactly the same question in both English and Hindi.
5. Provide a detailed, highly factual explanation in both English and Hindi.
6. Crucial Cleanliness Rules:
   - Do NOT include question number prefixes in the question texts (e.g. no "Q. 1", no "Q1.", no "प्रश्न 1:").
   - Do NOT include option letter prefixes in the option texts (e.g. option A text must just be the content, NOT "A) content").
   - Do NOT include page number references, bibliography citations, or book references (e.g. strip all "(p. 1)", "(pp. 4-5)", "[1]", "(Ref: page 12)").
   - Never mention the uploaded source material or reference notes file as the source.
   
Output format must strictly conform to this JSON Schema array:
[
  {
    "question_en": "Question text in English (without prefixes like Q. 1)",
    "question_hi": "प्रश्न का हिंदी पाठ (बिना किसी उपसर्ग जैसे प्रश्न 1 के)",
    "options_en": {
      "A": "Option text A in English",
      "B": "Option text B in English",
      "C": "Option text C in English",
      "D": "Option text D in English"
    },
    "options_hi": {
      "A": "विकल्प A का हिंदी पाठ",
      "B": "विकल्प B का हिंदी पाठ",
      "C": "विकल्प C का हिंदी पाठ",
      "D": "विकल्प D का हिंदी पाठ"
    },
    "correct_option": "A", // must be 'A', 'B', 'C', or 'D'
    "explanation_en": "Detailed factual explanation in English (no page references or citations)",
    "explanation_hi": "विस्तृत तथ्यात्मक हिंदी व्याख्या (बिना किसी पृष्ठ संख्या या संदर्भ के)"
  }
]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
}

async function generateMainsFromNotes(pdfText, topicName, count = 10) {
    if (!genAI) {
        throw new Error("Gemini API Key is not configured in the environment.");
    }

    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `You are a senior RPSC RAS Mains examiner and evaluator.
Your task is to generate exactly ${count} highly challenging descriptive questions and expert model answers. Use the provided reference notes as the core anchor, but expand and draw upon your own comprehensive, expert historical knowledge base (including standard web, online, and academic reference content) to craft the best, most comprehensive questions and answers possible.`

---
REFERENCE NOTES:
${pdfText}
---

TOPIC: ${topicName}

RULES FOR MAINS QUESTIONS:
1. Generate descriptive questions of 5 Marks and 10 Marks categories in equal numbers.
2. For every question, generate exactly the same question and model answer in both English and Hindi.
3. Every model answer must follow the universal Introduction-Body-Conclusion (IBC) formula:
   - For 5-Mark Questions (50 Words Limit, write around 60-65 words):
     - Focus on 1-2 core points.
     - 1-2 lines of introduction (go straight to the core theme, skip general background).
     - 1-2 main points in body.
     - Include exactly 1 core example or definition.
     - No diagrams or data.
     - 1 punchy conclusion sentence.
   - For 10-Mark Questions (150 Words Limit, write around 165-180 words):
     - Focus on broader dimensions requiring sub-headings and bullet points.
     - 3-4 lines of introduction (establish context, give a fact, or cite a constitutional article).
     - 4-6 body points exploring multiple angles (e.g. social, economic, political).
     - Include 2-3 real-life examples, data, or committee recommendations.
     - 2-3 sentences of conclusion (forward-looking solution, policy suggestion, or "way forward").
4. Crucial Presentation Rules:
   - Do NOT use ASCII lines or text diagrams.
   - Display all classification data in a clean Markdown table.
   - Do NOT include question number prefixes in the question text (e.g. no "Q. 1", "Q1.", "प्रश्न 1").
   - Do NOT include page number references, bibliography citations, or book references (e.g. strip all "(p. 1)", "(pp. 4-5)", "[1]").
   - Never mention the uploaded source material or reference notes file as the source.

Output format must strictly conform to this JSON Schema array:
[
  {
    "marks": 5, // must be 5 or 10
    "word_limit": 50, // must be 50 if marks is 5, or 150 if marks is 10
    "question_en": "Descriptive question in English (without prefixes like Q.1)",
    "question_hi": "मुख्य परीक्षा का वर्णनात्मक प्रश्न हिंदी में (बिना किसी उपसर्ग के)",
    "answer_en": "IBC-structured expert model answer in English (adhering to the target word limit, using bullet points, sub-headings, and Markdown tables as required)",
    "answer_hi": "IBC-संरचित आदर्श मॉडल उत्तर हिंदी में (लक्षित शब्द सीमा का पालन करते हुए, बिंदु, उप-शीर्षक और मार्कडाउन तालिकाओं का उपयोग करके)"
  }
]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
}

module.exports = {
    generateTheoryContent,
    generateMCQBatch,
    generateMainsTemplates,
    generateMCQsFromNotes,
    generateMainsFromNotes
};
