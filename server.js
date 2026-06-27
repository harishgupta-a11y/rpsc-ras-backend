// RPSC RAS Exam Prep Backend Service
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const db = require('./database/db');
const fs = require('fs');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Root test endpoints
app.get('/', (req, res) => {
    res.status(200).json({ status: "online", message: "RPSC RAS Backend API is running." });
});
app.get('/api', (req, res) => {
    res.status(200).json({ status: "online", message: "RPSC RAS Backend API Gateway is running." });
});

// Set up Multer for Admin file uploads (in-memory buffer storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Middleware: Subscription Check Gatekeeper ---
async function checkSubscription(req, res, next) {
    const mobileHeader = req.headers['x-user-mobile'];
    
    if (mobileHeader === '9876543210') {
        try {
            let adminUser = await db.getUserByMobile('9876543210');
            if (!adminUser) {
                await db.createUser('9876543210');
                const farFuture = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 Year subscription
                await db.updateUserSubscription('9876543210', farFuture);
                adminUser = await db.getUserByMobile('9876543210');
            }
            req.user = adminUser;
            return next();
        } catch (adminErr) {
            console.error("Admin user initialization failed:", adminErr.message);
        }
    }

    if (!mobileHeader) {
        return res.status(401).json({ error: "Authentication required. X-User-Mobile header missing." });
    }

    try {
        const user = await db.getUserByMobile(mobileHeader);
        if (!user) {
            return res.status(404).json({ error: "User not found. Please log in first." });
        }

        // Verify active subscription plan and expiry timestamp
        const now = Date.now();
        if (!user.expiry_timestamp || user.expiry_timestamp < now) {
            // Reset expired status implicitly
            if (user.expiry_timestamp) {
                await db.updateUserSubscription(mobileHeader, null);
            }
            return res.status(402).json({
                error: "Subscription Expired or Invalid",
                code: "SUBSCRIPTION_REQUIRED",
                message: "Active subscription plan required to access this resource."
            });
        }

        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ error: "Gatekeeper check failed: " + err.message });
    }
}

// --- Auth Routes (Passwordless OTP) ---
app.post('/api/auth/otp-request', (req, res) => {
    const { mobileNumber } = req.body;
    if (!mobileNumber || mobileNumber.length < 10) {
        return res.status(400).json({ error: "Valid 10-digit mobile number is required." });
    }

    // Generate simulated OTP
    const generatedOTP = "1234";
    console.log(`[Auth] OTP for ${mobileNumber} sent: ${generatedOTP}`);

    return res.status(200).json({
        message: "OTP sent successfully to your mobile number.",
        simulatedOTP: generatedOTP
    });
});

app.post('/api/auth/otp-verify', async (req, res) => {
    const { mobileNumber, otp } = req.body;
    if (!mobileNumber || !otp) {
        return res.status(400).json({ error: "Mobile number and OTP are required." });
    }

    if (otp !== "1234") {
        return res.status(401).json({ error: "Invalid OTP. Please enter '1234' to verify." });
    }

    try {
        let user = await db.getUserByMobile(mobileNumber);
        if (!user) {
            await db.createUser(mobileNumber);
            user = await db.getUserByMobile(mobileNumber);
            console.log(`[Auth] Created new user: ${mobileNumber}`);
        }

        const now = Date.now();
        const isSubscribed = user.expiry_timestamp && user.expiry_timestamp > now;

        return res.status(200).json({
            message: "OTP Verified successfully.",
            user: {
                user_id: user.user_id,
                mobile_number: user.mobile_number,
                subscription_status: !!isSubscribed,
                expiry_timestamp: user.expiry_timestamp,
                has_used_trial: user.has_used_trial === 1
            }
        });
    } catch (err) {
        res.status(500).json({ error: "OTP Verification failed: " + err.message });
    }
});

// --- Subscription Gateway Routes ---
app.post('/api/subscription/purchase', async (req, res) => {
    const { mobileNumber, planId } = req.body; // PlanId: 1 (1 Day), 7 (7 Days), 30 (30 Days), 90 (90 Days)
    if (!mobileNumber || !planId) {
        return res.status(400).json({ error: "Mobile number and Plan ID are required." });
    }

    try {
        const user = await db.getUserByMobile(mobileNumber);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        let durationDays = 1;
        let cost = 1.00;
        
        if (planId === 1) {
            if (user.has_used_trial === 1) {
                return res.status(400).json({ error: "Trial plan is only available once per user." });
            }
            durationDays = 1;
            cost = 1.00;
            await db.setUserTrialUsed(mobileNumber);
        } else if (planId === 7) {
            durationDays = 7;
            cost = 7.00;
        } else if (planId === 30) {
            durationDays = 30;
            cost = 30.00;
        } else if (planId === 90) {
            durationDays = 90;
            cost = 80.00;
        } else {
            return res.status(400).json({ error: "Invalid Plan ID specified." });
        }

        const expiryTime = Date.now() + durationDays * 24 * 60 * 60 * 1000;
        await db.updateUserSubscription(mobileNumber, expiryTime);

        console.log(`[Billing] Plan purchased: ${durationDays} Days (₹${cost} INR) for user: ${mobileNumber}`);

        return res.status(200).json({
            message: `Plan activated successfully for ${durationDays} days.`,
            expiry_timestamp: expiryTime,
            cost: cost,
            has_used_trial: planId === 1 ? true : (user.has_used_trial === 1)
        });
    } catch (err) {
        res.status(500).json({ error: "Purchase transaction failed: " + err.message });
    }
});

// --- Syllabus Info (Gated) ---
app.get('/api/syllabus', checkSubscription, async (req, res) => {
    const examTier = req.query.tier || 'PRE'; // PRE or MAINS
    try {
        const syllabus = await db.getFullSyllabus(examTier);
        res.status(200).json({ subjects: syllabus });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch syllabus: " + err.message });
    }
});

// --- Custom MCQ Quiz Generator Route (Gated, Strict No-Repeat Guard) ---
app.post('/api/quiz/generate', checkSubscription, async (req, res) => {
    const { userId, topicIds, minuteTopicId, count, language } = req.body;
    const lang = language || req.headers['x-user-language'] || 'EN';

    if (!userId || ((!topicIds || !Array.isArray(topicIds) || topicIds.length === 0) && !minuteTopicId)) {
        return res.status(400).json({ error: "User ID and at least one Topic ID or Minute Topic ID are required." });
    }

    const questionCount = parseInt(count) || 10;

    try {
        console.log(`[Quiz Engine] Compiling ${questionCount} questions. Topics:`, topicIds, `MinuteTopicId: ${minuteTopicId}`, `Language: ${lang}`);
        const questions = await db.generateQuiz(userId, topicIds || [], questionCount, lang, minuteTopicId);

        res.status(200).json({
            user_id: userId,
            question_count: questions.length,
            questions: questions
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate quiz: " + err.message });
    }
});

// --- Quiz Grading Route (Gated, logs history) ---
app.post('/api/quiz/submit', checkSubscription, async (req, res) => {
    const { userId, answers } = req.body; // answers: { questionId: chosenOption }
    if (!userId || !answers) {
        return res.status(400).json({ error: "User ID and answers are required." });
    }

    try {
        const questionIds = Object.keys(answers).map(Number);
        if (questionIds.length === 0) {
            return res.status(200).json({
                total: 0,
                correct: 0,
                incorrect: 0,
                skipped: 0,
                score: 0.00,
                details: []
            });
        }

        // Fetch questions from DB to grade
        const placeholders = questionIds.map(() => '?').join(',');
        const dbQuestions = await db.all(`SELECT * FROM questions WHERE question_id IN (${placeholders})`, questionIds);

        let correct = 0;
        let incorrect = 0;
        let skipped = 0;
        const details = [];
        const timestamp = Date.now();

        for (const q of dbQuestions) {
            const userChoice = answers[q.question_id];
            
            // Log attempt to history table
            await db.saveQuizAttempt(userId, q.question_id, timestamp);

            if (!userChoice) {
                skipped++;
                details.push({
                    question_id: q.question_id,
                    question_text: q.question_text,
                    user_answer: null,
                    correct_answer: q.correct_option,
                    is_correct: false,
                    is_skipped: true,
                    explanation: q.detailed_explanation
                });
            } else if (userChoice.toUpperCase() === q.correct_option.toUpperCase()) {
                correct++;
                details.push({
                    question_id: q.question_id,
                    question_text: q.question_text,
                    user_answer: userChoice,
                    correct_answer: q.correct_option,
                    is_correct: true,
                    is_skipped: false,
                    explanation: q.detailed_explanation
                });
            } else {
                incorrect++;
                details.push({
                    question_id: q.question_id,
                    question_text: q.question_text,
                    user_answer: userChoice,
                    correct_answer: q.correct_option,
                    is_correct: false,
                    is_skipped: false,
                    explanation: q.detailed_explanation
                });
            }
        }

        // RPSC Marking: +1.33 for correct, -0.44 for wrong, 0 for skipped
        const totalMarks = (correct * 1.33) - (incorrect * 0.44);
        const roundedScore = Math.round(totalMarks * 100) / 100;

        return res.status(200).json({
            total: dbQuestions.length,
            correct: correct,
            incorrect: incorrect,
            skipped: skipped,
            score: roundedScore,
            details: details
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to grade quiz: " + err.message });
    }
});

// --- Admin Route: Download empty docx templates ---
app.get('/api/admin/download-template', async (req, res) => {
    const subjectId = req.query.subject_id;
    const topicId = req.query.topic_id;
    const language = req.query.language || 'EN';

    if (!subjectId || !topicId) {
        return res.status(400).send("Subject ID and Topic ID are required.");
    }

    try {
        const isHi = language === 'HI';
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: isHi ? "आरपीएससी आरएएस प्रश्न आयात टेम्पलेट (बहुविकल्पीय)" : "RPSC RAS Question Ingestion Template", bold: true, size: 28 }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: isHi ? `सब्जेक्ट आईडी: ${subjectId}` : `Subject ID: ${subjectId}`, italics: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: isHi ? `टॉपIC आईडी: ${topicId}` : `Topic ID: ${topicId}`, italics: true }),
                        ],
                    }),
                    new Paragraph({ text: "" }),
                    new Paragraph({
                        children: [
                            new TextRun({ 
                                text: isHi 
                                    ? "निर्देश: एकाधिक प्रश्न जोड़ने के लिए नीचे दिए गए ब्लॉक को कॉपी-पेस्ट करें। ट्रिगर्स (Q., A), B), C), D), Correct:, Explanation:) को न बदलें। सुनिश्चित करें कि प्रत्येक प्रश्न ब्लॉक एक खाली लाइन के साथ समाप्त हो।"
                                    : "Instructions: Copy-paste the blocks below to add multiple questions. Do not modify the triggers (Q., A), B), C), D), Correct:, Explanation:). Ensure each question block ends with a double line break.", 
                                color: "FF0000", 
                                size: 20 
                            }),
                        ],
                    }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: isHi ? "Q. यहाँ पहला वस्तुनिष्ठ प्रश्न का पाठ लिखें?" : "Q. Write the question text here?" }),
                    new Paragraph({ text: isHi ? "A) विकल्प A का पाठ" : "A) Option A text" }),
                    new Paragraph({ text: isHi ? "B) विकल्प B का पाठ" : "B) Option B text" }),
                    new Paragraph({ text: isHi ? "C) विकल्प C का पाठ" : "C) Option C text" }),
                    new Paragraph({ text: isHi ? "D) विकल्प D का पाठ" : "D) Option D text" }),
                    new Paragraph({ text: "Correct: A" }),
                    new Paragraph({ text: isHi ? "Explanation: यहाँ विस्तृत उत्तर व्याख्या लिखें।" : "Explanation: Write the detailed answer explanation here." }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "---" }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: isHi ? "Q. अगला प्रश्न पाठ यहाँ?" : "Q. Next question text here?" }),
                    new Paragraph({ text: isHi ? "A) पहला विकल्प" : "A) First Option" }),
                    new Paragraph({ text: isHi ? "B) दूसरा विकल्प" : "B) Second Option" }),
                    new Paragraph({ text: isHi ? "C) तीसरा विकल्प" : "C) Third Option" }),
                    new Paragraph({ text: isHi ? "D) चौथा विकल्प" : "D) Fourth Option" }),
                    new Paragraph({ text: "Correct: C" }),
                    new Paragraph({ text: isHi ? "Explanation: इस प्रश्न की विस्तृत व्याख्या।" : "Explanation: Detailed explanation for this question." }),
                ]
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=template_subject_${subjectId}_topic_${topicId}.docx`);
        return res.send(buffer);
    } catch (err) {
        return res.status(500).send("Template generation failed: " + err.message);
    }
});

// --- Admin Route: Download empty Mains docx templates ---
app.get('/api/admin/download-mains-template', async (req, res) => {
    const subjectId = req.query.subject_id;
    const topicId = req.query.topic_id;
    const language = req.query.language || 'EN';

    if (!subjectId || !topicId) {
        return res.status(400).send("Subject ID and Topic ID are required.");
    }

    try {
        const isHi = language === 'HI';
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: isHi ? "आरपीएससी आरएएस मुख्य परीक्षा वर्णनात्मक प्रश्नोत्तर टेम्पलेट" : "RPSC RAS Mains Descriptive Q&A Ingestion Template", bold: true, size: 28 }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: isHi ? `सब्जेक्ट आईडी: ${subjectId}` : `Subject ID: ${subjectId}`, italics: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: isHi ? `टॉपिक आईडी: ${topicId}` : `Topic ID: ${topicId}`, italics: true }),
                        ],
                    }),
                    new Paragraph({ text: "" }),
                    new Paragraph({
                        children: [
                            new TextRun({ 
                                text: isHi 
                                    ? "निर्देश: एकाधिक वर्णनात्मक प्रश्न जोड़ने के लिए नीचे दिए गए ब्लॉक को कॉपी-पेस्ट करें। ट्रिगर्स (Q., Answer:) को न बदलें। सुनिश्चित करें कि प्रत्येक प्रश्न ब्लॉक एक खाली लाइन के साथ समाप्त हो।"
                                    : "Instructions: Copy-paste the blocks below to add multiple Mains descriptive Q&As. Do not modify the triggers (Q., Answer:). Ensure each question block ends with a double line break.", 
                                color: "FF0000", 
                                size: 20 
                            }),
                        ],
                    }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: isHi ? "Q. यहाँ मुख्य परीक्षा का वर्णनात्मक प्रश्न लिखें? (जैसे: मेवाड़ के इतिहास में बप्पा रावल की राजनीतिक उपलब्धियों की चर्चा कीजिए।)" : "Q. Write the Mains descriptive question text here? (e.g. Discuss the political achievements of Bappa Rawal.)" }),
                    new Paragraph({ text: isHi ? "Answer: यहाँ आदर्श मॉडल उत्तर लिखें। आप बिंदु, पैराग्राफ और आलोचनात्मक मूल्यांकन शामिल कर सकते हैं।" : "Answer: Write the expert model answer here. You can include points, paragraphs, and critical evaluations." }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "---" }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: isHi ? "Q. अगला वर्णनात्मक प्रश्न यहाँ?" : "Q. Next descriptive question here?" }),
                    new Paragraph({ text: isHi ? "Answer: अगला आदर्श मॉडल उत्तर यहाँ।" : "Answer: Next model answer goes here." }),
                ]
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=mains_template_subject_${subjectId}_topic_${topicId}.docx`);
        return res.send(buffer);
    } catch (err) {
        return res.status(500).send("Mains template generation failed: " + err.message);
    }
});

// --- Admin Route: Upload and Ingest Mains Questions ---
app.post('/api/admin/upload-mains-questions', upload.single('questionsFile'), async (req, res) => {
    let topicId = req.body.topicId ? parseInt(req.body.topicId) : null;
    const minuteTopicId = req.body.minuteTopicId ? parseInt(req.body.minuteTopicId) : null;
    const language = req.body.language || 'EN';

    if (!topicId && minuteTopicId) {
        const mt = await db.get("SELECT topic_id FROM minute_topics WHERE minute_topic_id = ?", [minuteTopicId]);
        if (mt) topicId = mt.topic_id;
    }

    if (!topicId) {
        return res.status(400).json({ error: "Topic ID is required." });
    }

    if (!req.file) {
        return res.status(400).json({ error: "Please upload a .docx or .txt file." });
    }

    try {
        // Save copy of uploaded file to disk
        const uploadDir = path.join(__dirname, 'uploaded_files');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const savedFilename = `${Date.now()}_${safeName}`;
        const savedFilePath = path.join(uploadDir, savedFilename);
        fs.writeFileSync(savedFilePath, req.file.buffer);

        let rawText = "";
        const originalName = req.file.originalname || "";
        
        if (originalName.toLowerCase().endsWith('.docx')) {
            const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
            rawText = convertHtmlToTextWithListNumbering(result.value);
        } else {
            rawText = req.file.buffer.toString('utf8');
        }

        if (!rawText.trim()) {
            return res.status(400).json({ error: "The uploaded document contains no text." });
        }

        // Parse Mains Q&As
        const blocks = rawText.split(/(?=Q\.)/);
        const parsedQuestions = [];

        for (const block of blocks) {
            if (!block.trim() || (!block.includes("Answer:") && !block.includes("Answer") && !block.includes("उत्तर:") && !block.includes("मॉडल उत्तर:"))) continue;

            const qMatch = block.match(/Q\.([\s\S]*?)(?=(?:Answer|Answer:|उत्तर:|मॉडल उत्तर:))/i);
            const ansMatch = block.match(/(?:Answer|Answer:|उत्तर:|मॉडल उत्तर:)[\s:]*([\s\S]*?)$/i);

            if (qMatch && ansMatch) {
                let answerText = ansMatch[1].trim();
                if (answerText.endsWith("---")) {
                    answerText = answerText.substring(0, answerText.length - 3).trim();
                }
                parsedQuestions.push({
                    question_text: qMatch[1].trim(),
                    model_answer: answerText
                });
            }
        }

        if (parsedQuestions.length === 0) {
            return res.status(400).json({ error: "Could not parse any Mains questions. Please ensure you followed the triggers format (Q., Answer:)." });
        }

        // Bulk insert into mains_questions
        let successCount = 0;
        const seqResult = await db.get("SELECT MAX(sequence_order) as maxSeq FROM mains_questions WHERE topic_id = ? AND language = ?", [topicId, language]);
        let currentSeq = seqResult && seqResult.maxSeq ? seqResult.maxSeq : 0;

        for (const q of parsedQuestions) {
            currentSeq++;
            await db.run(`
                INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [topicId, q.question_text, q.model_answer, language, currentSeq, minuteTopicId || null]);
            successCount++;
        }

        console.log(`[Admin Ingest] Ingested ${successCount} Mains questions for Topic ID ${topicId} (Subtopic: ${minuteTopicId || 'None'})`);
        return res.status(200).json({
            message: `Ingestion successful! Loaded ${successCount} descriptive Mains questions.`,
            inserted_count: successCount,
            saved_file_path: savedFilePath
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to parse and ingest Mains document: " + err.message });
    }
});

// --- GET unified syllabus hierarchy (Gated) ---
app.get('/api/syllabus', checkSubscription, async (req, res) => {
    const tier = req.query.tier || 'PRE';
    try {
        const syllabus = await db.getFullSyllabus(tier);
        res.status(200).json({ syllabus });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch syllabus: " + err.message });
    }
});

// --- GET Mains Questions sequential portal (Gated) ---
app.get('/api/mains/questions', checkSubscription, async (req, res) => {
    const topicIdsStr = req.query.topic_ids;
    const minuteTopicId = req.query.minute_topic_id ? parseInt(req.query.minute_topic_id) : null;
    const language = req.query.language || 'EN';

    if (!topicIdsStr) {
        return res.status(400).json({ error: "Topic IDs are required." });
    }

    const topicIds = topicIdsStr.split(',').map(Number);

    try {
        let questions;
        if (minuteTopicId) {
            questions = await db.all(`
                SELECT mq.*, t.topic_name 
                FROM mains_questions mq
                JOIN topics t ON mq.topic_id = t.topic_id
                WHERE mq.minute_topic_id = ? AND mq.language = ?
                ORDER BY mq.sequence_order ASC
            `, [minuteTopicId, language]);
        } else {
            questions = await db.getMainsQuestions(topicIds, language);
        }
        res.status(200).json({ questions });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch Mains questions: " + err.message });
    }
});

// --- Admin Route: Clear Mains Questions for a Topic ---
app.post('/api/admin/clear-mains-questions', async (req, res) => {
    const { topicId } = req.body;
    if (!topicId) {
        return res.status(400).json({ error: "Topic ID is required." });
    }

    try {
        await db.clearMainsQuestions(topicId);
        console.log(`[Admin] Cleared all Mains questions for Topic ID ${topicId}`);
        return res.status(200).json({ message: "Successfully cleared all Mains questions for this topic." });
    } catch (err) {
        return res.status(500).json({ error: "Failed to clear Mains questions: " + err.message });
    }
});

// Helper to convert HTML to text with list numbering preserved
function convertHtmlToTextWithListNumbering(html) {
    let processedHtml = html;
    
    // Find all <ol> groups and number the <li> items
    processedHtml = processedHtml.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (match, olContent) => {
        let index = 1;
        return olContent.replace(/<li>([\s\S]*?)<\/li>/gi, (liMatch, liContent) => {
            return `<p>${index++}. ${liContent}</p>`;
        });
    });
    
    // Replace all <ul> groups' <li> with "- "
    processedHtml = processedHtml.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (match, ulContent) => {
        return ulContent.replace(/<li>([\s\S]*?)<\/li>/gi, (liMatch, liContent) => {
            return `<p>- ${liContent}</p>`;
        });
    });

    // Strip other HTML tags and format paragraphs
    let text = processedHtml
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '') // remove all other tags
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
    
    return text;
}

// --- Admin Route: Upload and Ingest docx ---
app.post('/api/admin/upload-questions', upload.single('questionsFile'), async (req, res) => {
    const topicId = req.body.topicId ? parseInt(req.body.topicId) : null;
    const minuteTopicId = req.body.minuteTopicId ? parseInt(req.body.minuteTopicId) : null;
    const examId = req.body.examId ? parseInt(req.body.examId) : null;
    const language = req.body.language || 'EN';

    if (!topicId && !minuteTopicId && !examId) {
        return res.status(400).json({ error: "Topic ID, Minute Topic ID, or Exam ID is required." });
    }

    if (!req.file) {
        return res.status(400).json({ error: "Please upload a .docx or .txt file." });
    }

    try {
        // Save copy of uploaded file to disk
        const uploadDir = path.join(__dirname, 'uploaded_files');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const savedFilename = `${Date.now()}_${safeName}`;
        const savedFilePath = path.join(uploadDir, savedFilename);
        fs.writeFileSync(savedFilePath, req.file.buffer);

        let rawText = "";
        const originalName = req.file.originalname || "";
        
        if (originalName.toLowerCase().endsWith('.docx')) {
            // Extract HTML from uploaded word file buffer to preserve list numbering
            const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
            rawText = convertHtmlToTextWithListNumbering(result.value);
        } else {
            // Read as raw txt
            rawText = req.file.buffer.toString('utf8');
        }

        if (!rawText.trim()) {
            return res.status(400).json({ error: "The uploaded document contains no text." });
        }

        let isMainsExam = false;
        if (examId) {
            const exam = await db.get("SELECT tier_type FROM pyq_exams WHERE exam_id = ?", [examId]);
            if (!exam) {
                return res.status(404).json({ error: "Exam not found." });
            }
            isMainsExam = exam.tier_type === 'MAINS';
        }

        if (isMainsExam) {
            // Parse Mains Q&As
            const blocks = rawText.split(/(?=Q\.)/);
            const parsedQuestions = [];

            for (const block of blocks) {
                if (!block.trim() || (!block.includes("Answer:") && !block.includes("Answer") && !block.includes("उत्तर:") && !block.includes("मॉडल उत्तर:"))) continue;

                const qMatch = block.match(/Q\.([\s\S]*?)(?=(?:Answer|Answer:|उत्तर:|मॉडल उत्तर:))/i);
                const ansMatch = block.match(/(?:Answer|Answer:|उत्तर:|मॉडल उत्तर:)[\s:]*([\s\S]*?)$/i);

                if (qMatch && ansMatch) {
                    let answerText = ansMatch[1].trim();
                    if (answerText.endsWith("---")) {
                        answerText = answerText.substring(0, answerText.length - 3).trim();
                    }
                    parsedQuestions.push({
                        question_text: qMatch[1].trim(),
                        model_answer: answerText
                    });
                }
            }

            if (parsedQuestions.length === 0) {
                return res.status(400).json({ error: "Could not parse any Mains questions. Please ensure you followed the triggers format (Q., Answer:)." });
            }

            // Bulk insert into mains_questions
            let successCount = 0;
            const seqResult = await db.get("SELECT MAX(sequence_order) as maxSeq FROM mains_questions WHERE exam_id = ? AND language = ?", [examId, language]);
            let currentSeq = seqResult && seqResult.maxSeq ? seqResult.maxSeq : 0;

            for (const q of parsedQuestions) {
                currentSeq++;
                await db.run(`
                    INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, exam_id)
                    VALUES (101, ?, ?, ?, ?, ?)
                `, [q.question_text, q.model_answer, language, currentSeq, examId]);
                successCount++;
            }

            console.log(`[Admin Ingest] Ingested ${successCount} Mains PYQ questions for Exam ID ${examId}`);
            return res.status(200).json({
                message: `Ingestion successful! Loaded ${successCount} descriptive Mains PYQ questions.`,
                inserted_count: successCount,
                saved_file_path: savedFilePath
            });
        }

        // Parse questions using strict regex triggers (Pre MCQ)
        // Split by "Q. " or "Q." at the start of a block
        const blocks = rawText.split(/(?=Q\.)/);
        const parsedQuestions = [];

        for (const block of blocks) {
            if (!block.trim() || !block.includes("A)")) continue;

            const qMatch = block.match(/Q\.([\s\S]*?)(?=(?<=^|\s)(?<!\()A\))/i);
            const aMatch = block.match(/(?<=^|\s)(?<!\()A\)([\s\S]*?)(?=(?<=^|\s)(?<!\()B\))/i);
            const bMatch = block.match(/(?<=^|\s)(?<!\()B\)([\s\S]*?)(?=(?<=^|\s)(?<!\()C\))/i);
            const cMatch = block.match(/(?<=^|\s)(?<!\()C\)([\s\S]*?)(?=(?<=^|\s)(?<!\()D\))/i);
            const dMatch = block.match(/(?<=^|\s)(?<!\()D\)([\s\S]*?)(?=(?<=^|[\r\n]|\s)(?:Correct|Answer):?)/i);
            const correctMatch = block.match(/(?<=^|[\r\n]|\s)(?:Correct|Answer)[\s:]+([A-D])(?!\w)/i);
            const expMatch = block.match(/(?<=^|[\r\n])(?:Explanation|Exp)[\s:]+([\s\S]*?)$/i);

            if (qMatch && aMatch && bMatch && correctMatch) {
                parsedQuestions.push({
                    question_text: qMatch[1].trim(),
                    option_a: aMatch[1].trim(),
                    option_b: bMatch[1].trim(),
                    option_c: cMatch ? cMatch[1].trim() : "None of the above",
                    option_d: dMatch ? dMatch[1].trim() : "All of the above",
                    correct_option: correctMatch[1].trim().toUpperCase(),
                    detailed_explanation: expMatch ? expMatch[1].trim() : "Ingested from uploaded docx."
                });
            }
        }

        if (parsedQuestions.length === 0) {
            return res.status(400).json({ error: "Could not parse any questions. Please ensure you followed the triggers format (Q., A), B), C), D), Correct:, Explanation:)." });
        }

        if (examId) {
            // Bulk insert into pyq_questions
            let successCount = 0;
            // Get current max sequence_order for this exam and language
            const seqResult = await db.get("SELECT MAX(sequence_order) as maxSeq FROM pyq_questions WHERE exam_id = ? AND language = ?", [examId, language]);
            let currentSeq = seqResult && seqResult.maxSeq ? seqResult.maxSeq : 0;

            for (const q of parsedQuestions) {
                currentSeq++;
                await db.run(`
                    INSERT INTO pyq_questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, language, sequence_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [examId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.detailed_explanation, language, currentSeq]);
                successCount++;
            }
            console.log(`[Admin Ingest] Ingested ${successCount} PYQ questions for Exam ID ${examId}`);
            return res.status(200).json({
                message: `Ingestion successful! Loaded ${successCount} PYQs into exam database.`,
                inserted_count: successCount,
                saved_file_path: savedFilePath
            });
        } else {
            // Bulk insert into standard questions
            let successCount = 0;
            let resolvedTopicId = topicId;
            if (minuteTopicId && !resolvedTopicId) {
                const mt = await db.get("SELECT topic_id FROM minute_topics WHERE minute_topic_id = ?", [minuteTopicId]);
                if (mt) resolvedTopicId = mt.topic_id;
            }

            if (!resolvedTopicId) {
                return res.status(400).json({ error: "Could not resolve Topic ID for the minute topic." });
            }

            for (const q of parsedQuestions) {
                await db.run(`
                    INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [resolvedTopicId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.detailed_explanation, minuteTopicId, language]);
                successCount++;
            }
            console.log(`[Admin Ingest] Ingested ${successCount} questions for Topic ${resolvedTopicId} (Subtopic: ${minuteTopicId || 'None'})`);
            return res.status(200).json({
                message: `Ingestion successful! Loaded ${successCount} questions into topic database.`,
                inserted_count: successCount,
                saved_file_path: savedFilePath
            });
        }

    } catch (err) {
        res.status(500).json({ error: "Failed to parse and ingest document: " + err.message });
    }
});

// --- Admin Route: Dashboard Statistics ---
app.get('/api/admin/stats', async (req, res) => {
    try {
        const stats = await db.getAdminStats();
        res.status(200).json(stats);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stats: " + err.message });
    }
});

// --- Admin Route: Clear Questions for a Topic ---
app.post('/api/admin/clear-topic-questions', async (req, res) => {
    const { topicId } = req.body;
    if (!topicId) {
        return res.status(400).json({ error: "Topic ID is required." });
    }

    try {
        await db.run("DELETE FROM questions WHERE topic_id = ?", [topicId]);
        console.log(`[Admin] Cleared all questions for Topic ID ${topicId}`);
        return res.status(200).json({ message: "Successfully cleared all questions for this topic." });
    } catch (err) {
        return res.status(500).json({ error: "Failed to clear questions: " + err.message });
    }
});

// --- PYQs (Previous Years Questions) Routes ---
app.get('/api/pyqs', checkSubscription, async (req, res) => {
    const tier = req.query.tier;
    try {
        let exams;
        if (tier) {
            exams = await db.all("SELECT * FROM pyq_exams WHERE tier_type = ? ORDER BY exam_year DESC", [tier]);
        } else {
            exams = await db.all("SELECT * FROM pyq_exams ORDER BY exam_year DESC, tier_type DESC");
        }
        res.status(200).json({ exams });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch PYQ list: " + err.message });
    }
});

app.get('/api/pyq/questions', checkSubscription, async (req, res) => {
    const examId = parseInt(req.query.exam_id);
    const lang = req.query.language || 'EN';
    if (!examId) {
        return res.status(400).json({ error: "Exam ID is required." });
    }
    try {
        const exam = await db.get("SELECT tier_type FROM pyq_exams WHERE exam_id = ?", [examId]);
        if (!exam) {
            return res.status(404).json({ error: "Exam not found." });
        }
        let questions;
        if (exam.tier_type === 'MAINS') {
            questions = await db.all("SELECT * FROM mains_questions WHERE exam_id = ? AND language = ? ORDER BY sequence_order ASC", [examId, lang]);
        } else {
            questions = await db.getPyqQuestions(examId, lang);
        }
        res.status(200).json({ questions });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch PYQ questions: " + err.message });
    }
});

app.post('/api/admin/create-pyq-exam', async (req, res) => {
    const { name, year, tier } = req.body;
    if (!name || !year || !tier) {
        return res.status(400).json({ error: "Exam Name, Year, and Tier are required." });
    }
    try {
        await db.createPyqExam(name, parseInt(year), tier);
        res.status(200).json({ message: "PYQ Exam created successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to create PYQ exam: " + err.message });
    }
});

app.post('/api/admin/clear-pyq-questions', async (req, res) => {
    const { examId } = req.body;
    if (!examId) {
        return res.status(400).json({ error: "Exam ID is required." });
    }
    try {
        const exam = await db.get("SELECT tier_type FROM pyq_exams WHERE exam_id = ?", [examId]);
        if (exam && exam.tier_type === 'MAINS') {
            await db.run("DELETE FROM mains_questions WHERE exam_id = ?", [examId]);
        } else {
            await db.run("DELETE FROM pyq_questions WHERE exam_id = ?", [examId]);
        }
        res.status(200).json({ message: "Successfully cleared all questions for this exam." });
    } catch (err) {
        res.status(500).json({ error: "Failed to clear exam questions: " + err.message });
    }
});

// --- Support / Help Desk Routes ---
app.post('/api/support/query', checkSubscription, async (req, res) => {
    const { userId, queryText } = req.body;
    if (!userId || !queryText) {
        return res.status(400).json({ error: "User ID and Query text are required." });
    }
    try {
        const timestamp = Date.now();
        await db.saveSupportQuery(userId, queryText, timestamp);
        res.status(200).json({ message: "Your query has been submitted to experts successfully. We will resolve it soon!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to submit query: " + err.message });
    }
});

app.get('/api/admin/queries', async (req, res) => {
    try {
        const queries = await db.getSupportQueries();
        res.status(200).json({ queries });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch user queries: " + err.message });
    }
});

app.post('/api/admin/clear-query', async (req, res) => {
    const { queryId } = req.body;
    if (!queryId) {
        return res.status(400).json({ error: "Query ID is required." });
    }
    try {
        await db.clearSupportQuery(queryId);
        res.status(200).json({ message: "Support query cleared/resolved." });
    } catch (err) {
        res.status(500).json({ error: "Failed to clear support query: " + err.message });
    }
});

// --- Admin Uploaded Files History Endpoints ---
app.get('/api/admin/uploaded-files', async (req, res) => {
    try {
        const uploadDir = path.join(__dirname, 'uploaded_files');
        if (!fs.existsSync(uploadDir)) {
            return res.status(200).json({ files: [] });
        }
        const files = fs.readdirSync(uploadDir)
            .filter(f => f.includes('_'))
            .map(f => {
                const parts = f.split('_');
                const timestamp = parseInt(parts[0]);
                const originalName = parts.slice(1).join('_');
                return {
                    filename: f,
                    originalName: originalName,
                    uploadedAt: new Date(timestamp).toLocaleString()
                };
            })
            .sort((a, b) => b.filename.localeCompare(a.filename)); // newest first
        res.status(200).json({ files });
    } catch (err) {
        res.status(500).json({ error: "Failed to list files: " + err.message });
    }
});

app.get('/api/admin/uploaded-files/:filename', (req, res) => {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, 'uploaded_files', safeFilename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send("File not found.");
    }
});

// --- Minute Topics (Subtopics) Routes ---
app.get('/api/minute-topics', checkSubscription, async (req, res) => {
    const topicId = parseInt(req.query.topic_id);
    if (!topicId) {
        return res.status(400).json({ error: "Topic ID is required." });
    }
    try {
        const minuteTopics = await db.getMinuteTopicsByTopic(topicId);
        res.status(200).json({ minuteTopics });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch minute topics: " + err.message });
    }
});

app.post('/api/admin/create-minute-topic', async (req, res) => {
    const { topicId, name } = req.body;
    if (!topicId || !name) {
        return res.status(400).json({ error: "Topic ID and Subtopic name are required." });
    }
    try {
        await db.createMinuteTopic(topicId, name);
        res.status(200).json({ message: "Subtopic created successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to create subtopic: " + err.message });
    }
});

app.post('/api/admin/clear-minute-questions', async (req, res) => {
    const { minuteTopicId } = req.body;
    if (!minuteTopicId) {
        return res.status(400).json({ error: "Subtopic ID is required." });
    }
    try {
        await db.clearMinuteTopicQuestions(minuteTopicId);
        res.status(200).json({ message: "Successfully cleared all questions for this subtopic." });
    } catch (err) {
        res.status(500).json({ error: "Failed to clear subtopic questions: " + err.message });
    }
});

// --- Delete Minute Topic Endpoint ---
app.post('/api/admin/delete-minute-topic', async (req, res) => {
    const { minuteTopicId } = req.body;
    if (!minuteTopicId) {
        return res.status(400).json({ error: "Subtopic ID is required." });
    }
    try {
        await db.run("DELETE FROM questions WHERE minute_topic_id = ?", [minuteTopicId]);
        await db.run("DELETE FROM mains_questions WHERE minute_topic_id = ?", [minuteTopicId]);
        await db.run("DELETE FROM minute_topics WHERE minute_topic_id = ?", [minuteTopicId]);
        console.log(`[Admin] Deleted Subtopic ID ${minuteTopicId}`);
        res.status(200).json({ message: "Subtopic and all its questions deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete subtopic: " + err.message });
    }
});

// --- Admin Questions Manager Endpoints ---
app.get('/api/admin/questions', async (req, res) => {
    const { source, targetId, language } = req.query;
    if (!source || !targetId || !language) {
        return res.status(400).json({ error: "Source, Target ID, and Language are required." });
    }
    const tid = parseInt(targetId);

    try {
        let questions = [];
        if (source === 'PRE_TOPICS') {
            questions = await db.all("SELECT * FROM questions WHERE topic_id = ? AND language = ? ORDER BY question_id DESC", [tid, language]);
        } else if (source === 'MAINS_TOPICS') {
            questions = await db.all("SELECT * FROM mains_questions WHERE topic_id = ? AND language = ? AND exam_id IS NULL ORDER BY mains_question_id DESC", [tid, language]);
        } else if (source === 'EXAMS') {
            const exam = await db.get("SELECT tier_type FROM pyq_exams WHERE exam_id = ?", [tid]);
            if (!exam) {
                return res.status(404).json({ error: "Exam not found." });
            }
            if (exam.tier_type === 'MAINS') {
                questions = await db.all("SELECT * FROM mains_questions WHERE exam_id = ? AND language = ? ORDER BY sequence_order ASC", [tid, language]);
            } else {
                questions = await db.all("SELECT * FROM pyq_questions WHERE exam_id = ? AND language = ? ORDER BY sequence_order ASC", [tid, language]);
            }
        }
        res.status(200).json({ questions });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch manager questions: " + err.message });
    }
});

app.post('/api/admin/update-question', async (req, res) => {
    const { source, questionId, questionText, optionA, optionB, optionC, optionD, correctOption, detailedExplanation, modelAnswer } = req.body;
    if (!source || !questionId) {
        return res.status(400).json({ error: "Source and Question ID are required." });
    }
    const qid = parseInt(questionId);

    try {
        if (source === 'PRE_TOPICS') {
            await db.run(`
                UPDATE questions 
                SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?, detailed_explanation = ?
                WHERE question_id = ?
            `, [questionText, optionA, optionB, optionC, optionD, correctOption, detailedExplanation, qid]);
        } else if (source === 'MAINS_TOPICS') {
            await db.run(`
                UPDATE mains_questions 
                SET question_text = ?, model_answer = ?
                WHERE mains_question_id = ?
            `, [questionText, modelAnswer, qid]);
        } else if (source === 'EXAMS') {
            const isMainsQ = await db.get("SELECT 1 FROM mains_questions WHERE mains_question_id = ?", [qid]);
            if (isMainsQ) {
                await db.run(`
                    UPDATE mains_questions 
                    SET question_text = ?, model_answer = ?
                    WHERE mains_question_id = ?
                `, [questionText, modelAnswer, qid]);
            } else {
                await db.run(`
                    UPDATE pyq_questions 
                    SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?, detailed_explanation = ?
                    WHERE pyq_question_id = ?
                `, [questionText, optionA, optionB, optionC, optionD, correctOption, detailedExplanation, qid]);
            }
        }
        res.status(200).json({ message: "Question updated successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to update question: " + err.message });
    }
});

app.post('/api/admin/delete-question', async (req, res) => {
    const { source, questionId } = req.body;
    if (!source || !questionId) {
        return res.status(400).json({ error: "Source and Question ID are required." });
    }
    const qid = parseInt(questionId);

    try {
        if (source === 'PRE_TOPICS') {
            await db.run("DELETE FROM questions WHERE question_id = ?", [qid]);
        } else if (source === 'MAINS_TOPICS') {
            await db.run("DELETE FROM mains_questions WHERE mains_question_id = ?", [qid]);
        } else if (source === 'EXAMS') {
            await db.run("DELETE FROM mains_questions WHERE mains_question_id = ?", [qid]);
            await db.run("DELETE FROM pyq_questions WHERE pyq_question_id = ?", [qid]);
        }
        res.status(200).json({ message: "Question deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete question: " + err.message });
    }
});

// Get local network IPs
const os = require('os');
function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({ name, address: iface.address });
            }
        }
    }
    return addresses;
}

// Start Server binding explicitly to 0.0.0.0 (all interfaces)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` RPSC RAS Exam Prep Backend listening on port ${PORT} `);
    console.log(` Binding to 0.0.0.0 (all network interfaces) `);
    console.log(`====================================================`);
    console.log(`\nLocal Network IP Addresses for your mobile app:`);
    const ips = getLocalIpAddresses();
    if (ips.length === 0) {
        console.log(` [No active local network interfaces found]`);
    } else {
        ips.forEach(ip => {
            console.log(` - ${ip.name}: http://${ip.address}:${PORT}/api`);
        });
    }
    console.log(`====================================================`);
});
