// RPSC RAS Exam Prep Backend Service
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mammoth = require('mammoth-plus');
const { MathMLToLaTeX } = require('mathml-to-latex');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const db = require('./database/db');
const fs = require('fs');
const path = require('path');
const axios = require('axios');


const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing with 50mb payload limits
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve simulator static dashboard
app.use('/simulator', express.static(path.join(__dirname, 'simulator')));

// Root test endpoints
app.get('/', (req, res) => {
    res.status(200).json({ status: "online", message: "RPSC RAS Backend API is running." });
});
app.get('/api', (req, res) => {
    res.status(200).json({ status: "online", message: "RPSC RAS Backend API Gateway is running." });
});

// Set up Multer for Admin file uploads (in-memory buffer storage with 50MB limit)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// --- Middleware: Subscription Check Gatekeeper ---
async function checkSubscription(req, res, next) {
    const mobileHeader = req.headers['x-user-mobile'];
    
    if (mobileHeader === '9876543210') {
        try {
            let adminUser = await db.getUserByMobile('9876543210');
            const farFuture = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 Year subscription
            if (!adminUser || adminUser.active_plan === '24-Hour Free Trial') {
                if (!adminUser) {
                    await db.createUser('9876543210');
                }
                await db.updateUserSubscription('9876543210', farFuture, 'Admin Premium Plan');
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
            // Grant free 24-hour trial subscription automatically on registration
            const trialExpiry = Date.now() + 24 * 60 * 60 * 1000;
            await db.updateUserSubscription(mobileNumber, trialExpiry, '24-Hour Free Trial');
            user = await db.getUserByMobile(mobileNumber);
            console.log(`[Auth] Created new user with 24h free trial: ${mobileNumber}`);
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
                active_plan: user.active_plan || '24-Hour Free Trial',
                has_used_trial: user.has_used_trial === 1
            }
        });
    } catch (err) {
        res.status(500).json({ error: "OTP Verification failed: " + err.message });
    }
});

// --- GET user subscription status ---
app.get('/api/user/status', async (req, res) => {
    const mobile = req.query.mobileNumber;
    if (!mobile) {
        return res.status(400).json({ error: "Mobile number is required." });
    }
    try {
        const user = await db.getUserByMobile(mobile);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }
        const now = Date.now();
        const isSubscribed = user.expiry_timestamp && user.expiry_timestamp > now;
        res.status(200).json({
            isSubscribed: !!isSubscribed,
            expiry_timestamp: user.expiry_timestamp,
            active_plan: user.active_plan,
            has_used_trial: user.has_used_trial === 1
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch user status: " + err.message });
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
        let planName = '24-Hour Free Trial';
        if (planId === 7) planName = '7-Day Weekly Premium';
        else if (planId === 30) planName = '30-Day Monthly Premium';
        else if (planId === 90) planName = '90-Day Quarterly Premium';

        await db.updateUserSubscription(mobileNumber, expiryTime, planName);

        console.log(`[Billing] Plan purchased: ${durationDays} Days (₹${cost} INR) for user: ${mobileNumber}`);

        return res.status(200).json({
            message: `Plan activated successfully for ${durationDays} days.`,
            expiry_timestamp: expiryTime,
            active_plan: planName,
            cost: cost,
            has_used_trial: planId === 1 ? true : (user.has_used_trial === 1)
        });
    } catch (err) {
        res.status(500).json({ error: "Purchase transaction failed: " + err.message });
    }
});

// --- Syllabus Info (Gated) ---
app.get('/api/syllabus', async (req, res) => {
    const examTier = req.query.tier || 'PRE'; // PRE or MAINS
    const language = req.query.language || req.headers['x-user-language'] || 'EN';
    try {
        const syllabus = await db.getFullSyllabus(examTier, language);
        res.status(200).json({ syllabus, subjects: syllabus });
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
        let questionIds = [];
        let answersMap = {};
        if (Array.isArray(answers)) {
            questionIds = answers.map(a => Number(a.questionId));
            answers.forEach(a => {
                answersMap[a.questionId] = a.choice;
            });
        } else {
            questionIds = Object.keys(answers).map(Number);
            answersMap = answers;
        }

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

        // Map database questions by ID for fast lookup in original order
        const dbQuestionsMap = {};
        for (const q of dbQuestions) {
            dbQuestionsMap[q.question_id] = q;
        }

        let correct = 0;
        let incorrect = 0;
        let skipped = 0;
        const details = [];
        const timestamp = Date.now();

        for (const qId of questionIds) {
            const q = dbQuestionsMap[qId];
            if (!q) continue;

            const userChoice = answersMap[qId];
            
            // Log attempt to history table
            await db.saveQuizAttempt(userId, qId, timestamp);

            if (!userChoice) {
                skipped++;
                details.push({
                    question_id: qId,
                    question_text: q.question_text,
                    option_a: q.option_a,
                    option_b: q.option_b,
                    option_c: q.option_c,
                    option_d: q.option_d,
                    user_answer: null,
                    correct_answer: q.correct_option,
                    is_correct: false,
                    is_skipped: true,
                    explanation: q.detailed_explanation
                });
            } else if (userChoice.toUpperCase() === q.correct_option.toUpperCase()) {
                correct++;
                details.push({
                    question_id: qId,
                    question_text: q.question_text,
                    option_a: q.option_a,
                    option_b: q.option_b,
                    option_c: q.option_c,
                    option_d: q.option_d,
                    user_answer: userChoice,
                    correct_answer: q.correct_option,
                    is_correct: true,
                    is_skipped: false,
                    explanation: q.detailed_explanation
                });
            } else {
                incorrect++;
                details.push({
                    question_id: qId,
                    question_text: q.question_text,
                    option_a: q.option_a,
                    option_b: q.option_b,
                    option_c: q.option_c,
                    option_d: q.option_d,
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

        // Auto-generate descriptive title from first question topic if not provided
        let attemptTitle = req.body.title || "Practice Quiz";
        if (!req.body.title && dbQuestions.length > 0) {
            const firstQ = dbQuestions[0];
            const topicRow = await db.get("SELECT topic_name FROM topics WHERE topic_id = ?", [firstQ.topic_id]);
            if (topicRow) {
                attemptTitle = `Practice: ${topicRow.topic_name}`;
            }
        }
        const timeTakenSeconds = req.body.timeTakenSeconds || 0;

        // Log attempt to global history table
        await db.saveAttemptRecord(
            userId,
            'PRACTICE',
            attemptTitle,
            roundedScore,
            correct,
            incorrect,
            dbQuestions.length,
            timeTakenSeconds
        );

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
    const subjectId = req.query.subject_id || '999';
    const topicId = req.query.topic_id || '999';
    const language = req.query.language || 'EN';

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
    const subjectId = req.query.subject_id || '999';
    const topicId = req.query.topic_id || '999';
    const language = req.query.language || 'EN';

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
app.post('/api/admin/upload-mains-questions', async (req, res) => {
    return res.status(400).json({ error: "File upload is deprecated. Please use the Google Doc link ingestion pipeline." });
});


// --- Admin Route: Generate and Seed Questions from PDF via Gemini AI ---
app.post('/api/admin/generate-questions-from-pdf', upload.array('pdfFiles'), async (req, res) => {
    const tier = req.body.tier || 'PRE'; // 'PRE' or 'MAINS'
    let topicId = req.body.topicId ? parseInt(req.body.topicId) : null;
    const minuteTopicId = req.body.minuteTopicId ? parseInt(req.body.minuteTopicId) : null;
    const count = req.body.count ? parseInt(req.body.count) : (tier === 'PRE' ? 20 : 10);

    if (!topicId && minuteTopicId) {
        const mt = await db.get("SELECT topic_id FROM minute_topics WHERE minute_topic_id = ?", [minuteTopicId]);
        if (mt) topicId = mt.topic_id;
    }

    if (!topicId) {
        return res.status(400).json({ error: "Topic ID is required." });
    }

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "Please upload at least one reference PDF notes file." });
    }

    try {
        if (global.DOMMatrix === undefined) {
            global.DOMMatrix = class DOMMatrix {};
        }
        const pdfParse = require('pdf-parse');
        const aiEngine = require('./ai_engine');

        // Parse all reference files (supports both .pdf and .txt) and combine their text content
        let pdfText = "";
        for (const file of req.files) {
            try {
                const isTxt = file.originalname.toLowerCase().endsWith('.txt');
                if (isTxt) {
                    const text = file.buffer.toString('utf8');
                    pdfText += `\n\n--- CONTENT FROM FILE: ${file.originalname} ---\n` + text;
                } else {
                    const uint8Array = new Uint8Array(file.buffer);
                    const parser = new pdfParse.PDFParse(uint8Array);
                    const data = await parser.getText();
                    pdfText += `\n\n--- CONTENT FROM FILE: ${file.originalname} ---\n` + data.text;
                }
            } catch (pdfErr) {
                console.error(`Failed parsing reference file ${file.originalname}:`, pdfErr.message);
                throw new Error(`Failed parsing reference file ${file.originalname}: ${pdfErr.message}`);
            }
        }

        if (!pdfText.trim()) {
            return res.status(400).json({ error: "The uploaded PDF notes files contain no readable text." });
        }

        // Get topic name for dynamic prompt injection
        const topicRow = await db.get("SELECT topic_name FROM topics WHERE topic_id = ?", [topicId]);
        const topicName = topicRow ? topicRow.topic_name : "Target Topic";

        // Programmatic sanitization helper function
        const sanitizeFieldText = (val) => {
            if (typeof val !== 'string') return '';
            
            // 1. Remove leading question prefixes (e.g. Q. 1, Q1, Q. 1), Q1:, Q1., 1., Q., प्र. 1, प्रश्न 1:)
            let cleaned = val.replace(/^\s*(?:Q\s*\.?\s*\d*\s*[\)\.:\-]?|Question\s*\d*\s*[\)\.:\-]?|प्र\s*\.?\s*\d*\s*[\)\.:\-]?|प्रश्न\s*\d*\s*[\)\.:\-]?|\d+\s*[\)\.:\-]+)\s*/i, '');
            
            // 2. Remove option letter prefixes (e.g. A) content, B. content -> content)
            cleaned = cleaned.replace(/^\s*[A-D]\s*[\)\.:\-]+\s*/i, '');
            
            // 3. Remove citation brackets and page references (e.g. (p. 12), (pp. 4-5), [1], [Ref: Page 4], (Ref: 12))
            cleaned = cleaned.replace(/[\(\[]\s*(?:pp?\.?\s*\d+(?:\s*-\s*\d+)?|Ref\s*:\s*[^\)\]]*|Page\s*\d+|[0-9]+)\s*[\)\]]/gi, '');
            
            // 4. Collapse spaces and preserve newlines (do not strip bold/italic asterisks)
            cleaned = cleaned
                .replace(/[ \t]+/g, ' ')
                .replace(/[ \t]+([\.\?,;])/g, '$1')
                .replace(/[ \t]+$/gm, '')
                .replace(/\r\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            return cleaned;
        };

        let insertCount = 0;

        if (tier === 'PRE') {
            // First, split the notes into concepts
            console.log(`[AI Gen] Splitting notes into concepts for topic: ${topicName}`);
            const concepts = await aiEngine.splitNotesIntoConcepts(pdfText, topicName);
            console.log(`[AI Gen] Segments identified: ${concepts.length}. Allocating questions...`);
            
            const mcqs = [];
            for (let i = 0; i < concepts.length; i++) {
                const sub = concepts[i];
                let conceptCount = Math.round(count * (sub.weight / 100));
                if (conceptCount === 0) conceptCount = 1;
                
                // Adjust for the last concept to match exact requested count
                if (i === concepts.length - 1) {
                    const currentTotal = mcqs.length;
                    if (currentTotal + conceptCount !== count) {
                        conceptCount = Math.max(1, count - currentTotal);
                    }
                }
                
                console.log(`[AI Gen] Generating ${conceptCount} MCQs for sub-concept: "${sub.title}"`);
                try {
                    const batch = await aiEngine.generateMCQsFromNotes(pdfText, topicName, sub, conceptCount);
                    mcqs.push(...batch);
                } catch (batchErr) {
                    console.error(`[AI Gen] Batch generation failed for sub-concept "${sub.title}":`, batchErr.message);
                }
            }

            if (mcqs.length === 0) {
                throw new Error("Failed to generate any MCQs across all sub-concepts.");
            }

            for (const item of mcqs) {
                // Insert English MCQ version
                await db.run(`
                    INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    topicId,
                    sanitizeFieldText(item.question_en),
                    sanitizeFieldText(item.options_en.A),
                    sanitizeFieldText(item.options_en.B),
                    sanitizeFieldText(item.options_en.C),
                    sanitizeFieldText(item.options_en.D),
                    item.correct_option.trim().toUpperCase(),
                    sanitizeFieldText(item.explanation_en),
                    minuteTopicId || null,
                    'EN'
                ]);

                // Insert Hindi MCQ version
                await db.run(`
                    INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    topicId,
                    sanitizeFieldText(item.question_hi),
                    sanitizeFieldText(item.options_hi.A),
                    sanitizeFieldText(item.options_hi.B),
                    sanitizeFieldText(item.options_hi.C),
                    sanitizeFieldText(item.options_hi.D),
                    item.correct_option.trim().toUpperCase(),
                    sanitizeFieldText(item.explanation_hi),
                    minuteTopicId || null,
                    'HI'
                ]);

                insertCount += 2;
            }

            console.log(`[AI Gen] Successfully generated and seeded ${insertCount} Prelims MCQs for Topic ID ${topicId}`);
            return res.status(200).json({
                message: `AI generation successful! Generated and seeded ${insertCount / 2} bilingual MCQs (${insertCount} total database rows).`
            });

        } else if (tier === 'MAINS') {
            // First, split notes into concepts
            console.log(`[AI Gen] Splitting notes into concepts for topic: ${topicName}`);
            const concepts = await aiEngine.splitNotesIntoConcepts(pdfText, topicName);
            console.log(`[AI Gen] Segments identified: ${concepts.length}. Allocating questions...`);

            const mainsQAs = [];
            for (let i = 0; i < concepts.length; i++) {
                const sub = concepts[i];
                let conceptCount = Math.round(count * (sub.weight / 100));
                if (conceptCount === 0) conceptCount = 1;
                
                // Adjust for the last concept to match exact requested count
                if (i === concepts.length - 1) {
                    const currentTotal = mainsQAs.length;
                    if (currentTotal + conceptCount !== count) {
                        conceptCount = Math.max(1, count - currentTotal);
                    }
                }
                
                console.log(`[AI Gen] Generating ${conceptCount} Mains QAs for sub-concept: "${sub.title}"`);
                try {
                    const batch = await aiEngine.generateMainsFromNotes(pdfText, topicName, sub, conceptCount);
                    mainsQAs.push(...batch);
                } catch (batchErr) {
                    console.error(`[AI Gen] Batch generation failed for sub-concept "${sub.title}":`, batchErr.message);
                }
            }

            if (mainsQAs.length === 0) {
                throw new Error("Failed to generate any Mains questions across all sub-concepts.");
            }

            // Get current sequence_order for mains
            const seqResult = await db.get("SELECT MAX(sequence_order) as maxSeq FROM mains_questions WHERE topic_id = ?", [topicId]);
            let currentSeq = seqResult && seqResult.maxSeq ? seqResult.maxSeq : 0;

            for (const item of mainsQAs) {
                currentSeq++;

                let qTextEn = sanitizeFieldText(item.question_en);
                if (!qTextEn.includes("Marks") || !qTextEn.includes("Words")) {
                    qTextEn = `${qTextEn.trim()} (${item.marks || 5} Marks, ${item.word_limit || 50} Words)`;
                }

                let qTextHi = sanitizeFieldText(item.question_hi);
                if (!qTextHi.includes("अंक") || !qTextHi.includes("शब्द")) {
                    qTextHi = `${qTextHi.trim()} (${item.marks || 5} अंक, ${item.word_limit || 50} शब्द)`;
                }

                // Insert English Mains version
                await db.run(`
                    INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id, word_limit)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    topicId,
                    qTextEn,
                    sanitizeFieldText(item.answer_en),
                    'EN',
                    currentSeq,
                    minuteTopicId || null,
                    item.word_limit
                ]);

                // Insert Hindi Mains version
                await db.run(`
                    INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id, word_limit)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    topicId,
                    qTextHi,
                    sanitizeFieldText(item.answer_hi),
                    'HI',
                    currentSeq,
                    minuteTopicId || null,
                    item.word_limit
                ]);

                insertCount += 2;
            }

            console.log(`[AI Gen] Successfully generated and seeded ${insertCount} Mains descriptive questions for Topic ID ${topicId}`);
            return res.status(200).json({
                message: `AI generation successful! Generated and seeded ${insertCount / 2} bilingual Mains questions (${insertCount} total database rows).`
            });
        }

    } catch (err) {
        console.error("[AI Gen Error] Failed:", err);
        return res.status(500).json({ error: "Failed to generate questions: " + err.message });
    }
});

app.post('/api/admin/inject-pregenerated-questions', async (req, res) => {
    try {
        console.log(`[Inject] Starting direct injection of pre-generated questions for Integration of Rajasthan...`);
        
        const data = require('./integration_questions_data');
        let insertCount = 0;

        // 1. Ensure subtopics exist under Topic 6 (Prelims)
        let preSubEn = await db.get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 6 AND language = 'EN' AND minute_topic_name = 'Integration of Rajasthan'");
        if (!preSubEn) {
            await db.run("INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (6, 'Integration of Rajasthan', 'EN')");
            preSubEn = await db.get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 6 AND language = 'EN' AND minute_topic_name = 'Integration of Rajasthan'");
        }
        
        let preSubHi = await db.get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 6 AND language = 'HI' AND minute_topic_name = 'राजस्थान का एकीकरण'");
        if (!preSubHi) {
            await db.run("INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (6, 'राजस्थान का एकीकरण', 'HI')");
            preSubHi = await db.get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 6 AND language = 'HI' AND minute_topic_name = 'राजस्थान का एकीकरण'");
        }

        const preSubtopicIdEn = preSubEn.minute_topic_id;
        const preSubtopicIdHi = preSubHi.minute_topic_id;

        // 2. Ensure subtopics exist under Topic 101 (Mains)
        let mainsSubEn = await db.get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 101 AND language = 'EN' AND minute_topic_name = 'Integration of Rajasthan'");
        if (!mainsSubEn) {
            await db.run("INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (101, 'Integration of Rajasthan', 'EN')");
            mainsSubEn = await db.get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 101 AND language = 'EN' AND minute_topic_name = 'Integration of Rajasthan'");
        }

        let mainsSubHi = await db.get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 101 AND language = 'HI' AND minute_topic_name = 'राजस्थान का एकीकरण'");
        if (!mainsSubHi) {
            await db.run("INSERT INTO minute_topics (topic_id, minute_topic_name, language) VALUES (101, 'राजस्थान का एकीकरण', 'HI')");
            mainsSubHi = await db.get("SELECT minute_topic_id FROM minute_topics WHERE topic_id = 101 AND language = 'HI' AND minute_topic_name = 'राजस्थान का एकीकरण'");
        }

        const mainsSubtopicIdEn = mainsSubEn.minute_topic_id;
        const mainsSubtopicIdHi = mainsSubHi.minute_topic_id;

        // 3. Clean up existing questions for these subtopics
        await db.run("DELETE FROM questions WHERE minute_topic_id IN (?, ?)", [preSubtopicIdEn, preSubtopicIdHi]);
        await db.run("DELETE FROM mains_questions WHERE minute_topic_id IN (?, ?)", [mainsSubtopicIdEn, mainsSubtopicIdHi]);

        // 4. Ingest Prelims MCQs under Topic 6 (using the respective subtopic IDs)
        for (const item of data.preQuestions) {
            // Insert English MCQ version
            await db.run(`
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language)
                VALUES (6, ?, ?, ?, ?, ?, ?, ?, ?, 'EN')
            `, [
                item.question_en.trim(),
                item.options_en.A.trim(),
                item.options_en.B.trim(),
                item.options_en.C.trim(),
                item.options_en.D.trim(),
                item.correct_option.trim().toUpperCase(),
                item.explanation_en.trim(),
                preSubtopicIdEn
            ]);

            // Insert Hindi MCQ version
            await db.run(`
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language)
                VALUES (6, ?, ?, ?, ?, ?, ?, ?, ?, 'HI')
            `, [
                item.question_hi.trim(),
                item.options_hi.A.trim(),
                item.options_hi.B.trim(),
                item.options_hi.C.trim(),
                item.options_hi.D.trim(),
                item.correct_option.trim().toUpperCase(),
                item.explanation_hi.trim(),
                preSubtopicIdHi
            ]);

            insertCount += 2;
        }

        // 5. Ingest Mains Q&As under Topic 101 (using the respective subtopic IDs)
        const seqResult = await db.get("SELECT MAX(sequence_order) as maxSeq FROM mains_questions WHERE topic_id = 101", []);
        let currentSeq = seqResult && seqResult.maxSeq ? seqResult.maxSeq : 0;

        for (const item of data.mainsQuestions) {
            currentSeq++;

            // Insert English Mains version
            await db.run(`
                INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id, word_limit)
                VALUES (101, ?, ?, 'EN', ?, ?, ?)
            `, [
                item.question_en.trim() + ` (Marks: ${item.marks}, Word Limit: ${item.word_limit})`,
                item.answer_en.trim(),
                currentSeq,
                mainsSubtopicIdEn,
                item.word_limit
            ]);

            // Insert Hindi Mains version
            await db.run(`
                INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id, word_limit)
                VALUES (101, ?, ?, 'HI', ?, ?, ?)
            `, [
                item.question_hi.trim() + ` (अंक: ${item.marks}, शब्द सीमा: ${item.word_limit})`,
                item.answer_hi.trim(),
                currentSeq,
                mainsSubtopicIdHi,
                item.word_limit
            ]);

            insertCount += 2;
        }

        console.log(`[Inject] Successfully injected ${insertCount} database rows for Integration of Rajasthan.`);
        return res.status(200).json({
            message: `Pregenerated injection successful! Subtopics created. Injected 20 MCQs and 10 Mains Q&As (total ${insertCount} database rows).`
        });

    } catch (err) {
        console.error("[Inject Error] Failed:", err);
        return res.status(500).json({ error: "Failed to inject questions: " + err.message });
    }
});



// --- GET Mains Questions sequential portal (Gated) ---
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getQuestionMarks(text) {
    const textLower = text.toLowerCase();
    if (
        textLower.includes('10-marks') || 
        textLower.includes('10 marks') || 
        textLower.includes('10-अंक') || 
        textLower.includes('10 अंक') || 
        textLower.includes('150 शब्द') || 
        textLower.includes('150 words') || 
        textLower.includes('100 शब्द') || 
        textLower.includes('100 words')
    ) {
        return 10;
    }
    if (textLower.includes('5-marks') || textLower.includes('5 marks') || textLower.includes('5-अंक') || textLower.includes('5 अंक') || textLower.includes('50 शब्द') || textLower.includes('50 words')) {
        return 5;
    }
    if (textLower.includes('2-marks') || textLower.includes('2 marks') || textLower.includes('2-अंक') || textLower.includes('2 अंक') || textLower.includes('15 शब्द') || textLower.includes('15 words')) {
        return 2;
    }
    return 5; // Default fallback
}

function distributeMainsQuestions(allQs, limitVal) {
    if (!limitVal || allQs.length <= limitVal) {
        return shuffle([...allQs]);
    }
    
    // Shuffle the entire pool first to ensure randomness within marks categories
    const shuffledPool = shuffle([...allQs]);
    
    const group10 = [];
    const group5 = [];
    const group2 = [];
    const others = [];
    
    for (const q of shuffledPool) {
        const marks = getQuestionMarks(q.question_text);
        if (marks === 10) group10.push(q);
        else if (marks === 5) group5.push(q);
        else if (marks === 2) group2.push(q);
        else others.push(q);
    }
    
    const selected = [];
    const pools = [group5, group10, group2, others].filter(p => p.length > 0);
    
    if (pools.length > 0) {
        let poolIdx = 0;
        while (selected.length < limitVal) {
            let addedAny = false;
            for (let i = 0; i < pools.length; i++) {
                const currentPool = pools[(poolIdx + i) % pools.length];
                if (currentPool.length > 0) {
                    selected.push(currentPool.shift());
                    addedAny = true;
                    if (selected.length >= limitVal) break;
                }
            }
            if (!addedAny) break;
            poolIdx++;
        }
    }
    
    return selected;
}

app.get('/api/mains/questions', checkSubscription, async (req, res) => {
    const topicIdsStr = req.query.topic_ids;
    const minuteTopicId = req.query.minute_topic_id ? parseInt(req.query.minute_topic_id) : null;
    const language = req.query.language || 'EN';
    const limitVal = req.query.limit ? parseInt(req.query.limit) : (req.query.count ? parseInt(req.query.count) : null);

    if (!topicIdsStr && !minuteTopicId) {
        return res.status(400).json({ error: "Topic IDs or Minute Topic ID is required." });
    }

    const topicIds = topicIdsStr ? topicIdsStr.split(',').map(Number) : [];

    try {
        let questions;
        if (minuteTopicId) {
            const sql = `
                SELECT mq.*, t.topic_name 
                FROM mains_questions mq
                JOIN topics t ON mq.topic_id = t.topic_id
                WHERE mq.minute_topic_id = ? AND mq.language = ?
            `;
            const params = [minuteTopicId, language];
            const allQs = await db.all(sql, params);
            questions = distributeMainsQuestions(allQs, limitVal);
        } else {
            const allQs = await db.getMainsQuestions(topicIds, language);
            questions = distributeMainsQuestions(allQs, limitVal);
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

function convertMathMLToLaTeX(html) {
    if (!html) return "";
    return html.replace(/<math\b[^>]*>([\s\S]*?)<\/math>/gi, (match) => {
        try {
            let cleanMath = match
                .replace(/<(\/?)[a-z]+:math/gi, '<$1math')
                .replace(/<(\/?)[a-z]+:mrow/gi, '<$1mrow')
                .replace(/<(\/?)[a-z]+:mfrac/gi, '<$1mfrac')
                .replace(/<(\/?)[a-z]+:mi/gi, '<$1mi')
                .replace(/<(\/?)[a-z]+:mo/gi, '<$1mo')
                .replace(/<(\/?)[a-z]+:mn/gi, '<$1mn')
                .replace(/<(\/?)[a-z]+:msup/gi, '<$1msup')
                .replace(/<(\/?)[a-z]+:msub/gi, '<$1msub')
                .replace(/<(\/?)[a-z]+:msqrt/gi, '<$1msqrt')
                .replace(/<(\/?)[a-z]+:mroot/gi, '<$1mroot')
                .replace(/<(\/?)[a-z]+:mtext/gi, '<$1mtext');
            
            const latex = MathMLToLaTeX.convert(cleanMath);
            return `$ ${latex} $`;
        } catch (err) {
            console.error("MathML conversion failed for match:", match, err.message);
            return match;
        }
    });
}

// Helper to convert HTML to text with list numbering preserved
function convertHtmlToTextWithListNumbering(html) {
    let processedHtml = convertMathMLToLaTeX(html);
    
    // Convert all images to safe placeholder strings [IMAGE:src] without newlines
    processedHtml = processedHtml.replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
        const cleanSrc = src.replace(/[\r\n\s]+/g, ''); // strip all whitespaces/newlines from base64/URL string
        return `\n[IMAGE:${cleanSrc}]\n`;
    });

    // Strip paragraphs inside table cells to prevent cells from splitting onto newlines
    processedHtml = processedHtml.replace(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi, (match, tag, cellContent) => {
        let cleanCell = cellContent
            .replace(/<p\b[^>]*>/gi, '')
            .replace(/<\/p>/gi, ' ')
            .replace(/<br\s*\/?>/gi, ' ');
        return `<${tag}>${cleanCell}</${tag}>`;
    });

    // Format tables to clean text markdown style (pipes and dashes) for mobile grid rendering
    processedHtml = processedHtml.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (match, tableContent) => {
        let tableText = "\n";
        const rows = tableContent.split(/<\/tr>/gi);
        let headerParsed = false;
        for (const row of rows) {
            if (!row.trim()) continue;
            const cells = row.match(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi);
            if (cells) {
                const cellTexts = cells.map(cell => {
                    return cell.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
                });
                if (cellTexts.length > 0) {
                    tableText += `| ${cellTexts.join(' | ')} |\n`;
                    if (!headerParsed) {
                        const dividers = cellTexts.map(() => '---');
                        tableText += `| ${dividers.join(' | ')} |\n`;
                        headerParsed = true;
                    }
                }
            }
        }
        return tableText + "\n";
    });

    // Convert strong/bold tags to markdown **bold**
    processedHtml = processedHtml
        .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');

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

function cleanFieldText(text) {
    if (!text) return "";
    let clean = text.trim();
    
    // 1. Remove trailing double asterisks if they were captured from the next bold trigger
    if (clean.endsWith('**')) {
        clean = clean.slice(0, -2).trim();
    }
    // Also remove leading double asterisks if they are unbalanced
    if (clean.startsWith('**') && !clean.endsWith('**') && (clean.match(/\*\*/g) || []).length === 1) {
        clean = clean.slice(2).trim();
    }

    // 2. Remove leading question number prefixes (e.g. Q. 1, Q1, Q. 1), Question 1:, 1., प्र. 1, प्रश्न 1:)
    // Handles various delimiters like dot, closing bracket, colon, dash.
    // Order matters: प्रश्न must come before प्र to prevent matching only the first character.
    clean = clean.replace(/^\s*(?:Q\s*\.?\s*\d*\s*[\)\.:\-]?|Question\s*\d*\s*[\)\.:\-]?|प्रश्न\s*\d*\s*[\)\.:\-]?|प्र\s*\.?\s*\d*\s*[\)\.:\-]?|\d+\s*[\)\.:\-]+)\s*/i, '');

    // 3. Remove option letter prefixes (e.g. A) content, B. content -> content)
    clean = clean.replace(/^\s*[A-D]\s*[\)\.:\-]+\s*/i, '');

    // 4. Remove citation brackets and page references (e.g. (p. 12), (pp. 4-5), [Ref: Page 4], (Ref: 12)) but preserve pure numbers in brackets/parentheses like [1] or (2) to avoid breaking math/formula indices and lists.
    clean = clean.replace(/[\(\[]\s*(?:pp?\.?\s*\d+(?:\s*-\s*\d+)?|Ref\s*:\s*[^\)\]]*|Page\s*\d+)\s*[\)\]]/gi, '');

    // 5. Remove common conversational boilerplate/wrapper lines
    clean = clean.replace(/^\s*(?:English\s+Version|Hindi\s+Version|English\s+Translation|Hindi\s+Translation|Explanation\s*:?|व्याख्या\s*:?)\s*$/gim, '');

    // Remove common trailing AI conversational wraps from the end of the text
    clean = clean.replace(/\s*(?:Let\s+me\s+know\s+if\s+you\s+would\s+like|Hope\s+this\s+helps|Hope\s+these\s+questions|Here\s+is\s+the\s+first|designed\s+according\s+to\s+your|designed\s+to\s+challenge|following\s+the\s+same\s+strict|highly\s+utility|if\s+you\s+need\s+more)[\s\S]*$/i, '');

    // Format Assertion-Reason questions: put Reason on a new line with a 1-line gap
    clean = clean.replace(/\s*(Reason|कारण)\s*[\(\[]\s*R\s*[\)\]]\s*[:\-]/gi, '\n\nReason (R):');
    clean = clean.replace(/\s*(Assertion|कथन)\s*[\(\[]\s*A\s*[\)\]]\s*[:\-]/gi, '\n\nAssertion (A):');

    // Format statement-wise questions: put statements on separate lines with a 1-line gap
    clean = clean.replace(/\s*(Statement|कथन)\s*(\d+)\s*[:\.]?\s*/gi, '\n\n$1 $2: ');
    clean = clean.replace(/(?<=\s|^)(\d+)\.\s+(?=[A-Z\u0900-\u097F])/g, '\n\n$1. ');
    clean = clean.replace(/\s*(Which of the statements?\s+given\s+above|Which of the\s+(?:above\s+)?statements?|Select the correct answer|उपरोक्त\s+(?:कथनों\s+)?(?:में\s+से\s+)?कौन|नीचे\s+दिए\s+गए\s+कूट)/gi, '\n\n$1');

    // 6. Collapse spaces and preserve newlines (do not strip bold/italic asterisks)
    clean = clean
        .replace(/[ \t]+/g, ' ')
        .replace(/[ \t]+([\.\?,;])/g, '$1')
        .replace(/[ \t]+$/gm, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return clean;
}

// --- Admin Route: Upload and Ingest docx ---
app.post('/api/admin/upload-questions', async (req, res) => {
    return res.status(400).json({ error: "File upload is deprecated. Please use the Google Doc link ingestion pipeline." });
});

app.post('/api/admin/clear-all-questions', async (req, res) => {
    try {
        await db.clearAllQuestions();
        console.log("[Admin] Successfully cleared all questions, Mains Q&As, and user quiz history.");
        res.status(200).json({ message: "All questions and history deleted successfully from the database." });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete database questions: " + err.message });
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

// --- Admin Route: Clean Old Question Placeholders ---
app.post('/api/admin/clean-placeholders', async (req, res) => {
    try {
        const delPre = await db.run("DELETE FROM questions WHERE minute_topic_id IS NULL");
        const delMains = await db.run("DELETE FROM mains_questions WHERE minute_topic_id IS NULL");
        console.log(`[Admin] Wiped old template question placeholders. Pre: ${delPre.changes}, Mains: ${delMains.changes}`);
        return res.status(200).json({ 
            message: "Successfully erased old template question placeholders.",
            pre_deleted: delPre.changes,
            mains_deleted: delMains.changes
        });
    } catch (err) {
        return res.status(500).json({ error: "Failed to erase placeholders: " + err.message });
    }
});

// --- Settings (Screenshot Protection Control) Routes ---
async function getSettingsFromDb() {
    const defaults = {
        allowScreenshots: false,
        maxCompleteCount: 200,
        maxSubjectCount: 150,
        maxTopicCount: 100,
        maxSubtopicCount: 50,
        welcomePopupImageUrl: ''
    };
    try {
        const rows = await db.all("SELECT * FROM app_settings");
        const dbSettings = {};
        rows.forEach(row => {
            if (row.key === 'allowScreenshots') {
                dbSettings[row.key] = row.value === 'true';
            } else if (row.key === 'welcomePopupImageUrl') {
                dbSettings[row.key] = row.value || '';
            } else {
                dbSettings[row.key] = parseInt(row.value) || defaults[row.key];
            }
        });
        return { ...defaults, ...dbSettings };
    } catch (e) {
        console.error("Error reading app_settings from DB:", e.message);
        return defaults;
    }
}

async function saveSettingsToDb(settings) {
    try {
        for (const [key, val] of Object.entries(settings)) {
            await db.run("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", [key, String(val)]);
        }
    } catch (e) {
        console.error("Error saving app_settings to DB:", e.message);
    }
}

app.get('/api/settings', async (req, res) => {
    const settings = await getSettingsFromDb();
    res.status(200).json(settings);
});

app.post('/api/admin/toggle-screenshots', async (req, res) => {
    const currentSettings = await getSettingsFromDb();
    currentSettings.allowScreenshots = !currentSettings.allowScreenshots;
    await saveSettingsToDb(currentSettings);
    console.log(`[Admin] Toggled allowScreenshots to ${currentSettings.allowScreenshots}`);
    res.status(200).json(currentSettings);
});

app.post('/api/admin/update-limits', async (req, res) => {
    const { maxCompleteCount, maxSubjectCount, maxTopicCount, maxSubtopicCount } = req.body;
    const currentSettings = await getSettingsFromDb();
    
    if (maxCompleteCount !== undefined) currentSettings.maxCompleteCount = parseInt(maxCompleteCount) || 200;
    if (maxSubjectCount !== undefined) currentSettings.maxSubjectCount = parseInt(maxSubjectCount) || 150;
    if (maxTopicCount !== undefined) currentSettings.maxTopicCount = parseInt(maxTopicCount) || 100;
    if (maxSubtopicCount !== undefined) currentSettings.maxSubtopicCount = parseInt(maxSubtopicCount) || 50;
    
    await saveSettingsToDb(currentSettings);
    console.log("[Admin] Updated practice test limit settings in DB:", currentSettings);
    res.status(200).json(currentSettings);
});

app.post('/api/admin/update-popup-image', async (req, res) => {
    const { welcomePopupImageUrl } = req.body;
    const currentSettings = await getSettingsFromDb();
    currentSettings.welcomePopupImageUrl = welcomePopupImageUrl || '';
    await saveSettingsToDb(currentSettings);
    console.log("[Admin] Updated welcomePopupImageUrl in DB:", currentSettings.welcomePopupImageUrl);
    res.status(200).json(currentSettings);
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

app.post('/api/admin/delete-file', async (req, res) => {
    const { filename } = req.body;
    if (!filename) {
        return res.status(400).json({ error: "Filename is required." });
    }
    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, 'uploaded_files', safeFilename);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return res.status(200).json({ message: "File deleted successfully from disk." });
        } else {
            return res.status(404).json({ error: "File not found on disk." });
        }
    } catch (err) {
        return res.status(500).json({ error: "Failed to delete file: " + err.message });
    }
});

// --- Minute Topics (Subtopics) Routes ---
app.get('/api/minute-topics', checkSubscription, async (req, res) => {
    const topicId = parseInt(req.query.topic_id);
    const language = req.query.language || 'EN';
    if (!topicId) {
        return res.status(400).json({ error: "Topic ID is required." });
    }
    try {
        const minuteTopics = await db.getMinuteTopicsByTopic(topicId, language);
        res.status(200).json({ minuteTopics });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch minute topics: " + err.message });
    }
});

app.post('/api/admin/create-minute-topic', async (req, res) => {
    const { topicId, name, language } = req.body;
    if (!topicId || !name) {
        return res.status(400).json({ error: "Topic ID and Subtopic name are required." });
    }
    try {
        await db.createMinuteTopic(topicId, name, language || 'EN');
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

// --- Admin: Create Topic Endpoint ---
app.post('/api/admin/create-topic', async (req, res) => {
    const { subjectId, name } = req.body;
    if (!subjectId || !name) {
        return res.status(400).json({ error: "Subject ID and Topic name are required." });
    }
    try {
        const unit = await db.get("SELECT unit_id FROM units WHERE subject_id = ? LIMIT 1", [subjectId]);
        if (!unit) {
            return res.status(400).json({ error: "No syllabus unit found for this subject." });
        }
        await db.run("INSERT INTO topics (unit_id, topic_name) VALUES (?, ?)", [unit.unit_id, name]);
        res.status(200).json({ message: `Parent topic '${name}' created successfully.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to create topic: " + err.message });
    }
});

// --- Admin: Rename Topic/Subtopic Endpoint ---
app.post('/api/admin/rename-item', async (req, res) => {
    const { type, id, newName } = req.body;
    if (!type || !id || !newName) {
        return res.status(400).json({ error: "Type, ID, and new name are required." });
    }
    try {
        if (type === 'topic') {
            await db.run("UPDATE topics SET topic_name = ? WHERE topic_id = ?", [newName, id]);
            res.status(200).json({ message: "Topic renamed successfully." });
        } else if (type === 'subtopic') {
            await db.run("UPDATE minute_topics SET minute_topic_name = ? WHERE minute_topic_id = ?", [newName, id]);
            res.status(200).json({ message: "Subtopic renamed successfully." });
        } else {
            res.status(400).json({ error: "Invalid rename type. Must be 'topic' or 'subtopic'." });
        }
    } catch (err) {
        res.status(500).json({ error: "Failed to rename: " + err.message });
    }
});

// --- Admin Questions Manager Endpoints ---
app.get('/api/admin/all-minute-topics', async (req, res) => {
    const language = req.query.language || 'EN';
    try {
        const minuteTopics = await db.all(`
            SELECT mt.*, t.topic_name FROM minute_topics mt 
            JOIN topics t ON mt.topic_id = t.topic_id 
            WHERE mt.language = ?
        `, [language]);
        res.status(200).json({ minuteTopics });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch all sub-topics: " + err.message });
    }
});

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
        } else if (source === 'PRE_SUBTOPICS') {
            questions = await db.all("SELECT * FROM questions WHERE minute_topic_id = ? AND language = ? ORDER BY question_id DESC", [tid, language]);
        } else if (source === 'MAINS_TOPICS') {
            questions = await db.all("SELECT * FROM mains_questions WHERE topic_id = ? AND language = ? AND exam_id IS NULL ORDER BY mains_question_id DESC", [tid, language]);
        } else if (source === 'MAINS_SUBTOPICS') {
            questions = await db.all("SELECT * FROM mains_questions WHERE minute_topic_id = ? AND language = ? AND exam_id IS NULL ORDER BY mains_question_id DESC", [tid, language]);
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
        if (source === 'PRE_TOPICS' || source === 'PRE_SUBTOPICS') {
            await db.run(`
                UPDATE questions 
                SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?, detailed_explanation = ?
                WHERE question_id = ?
            `, [questionText, optionA, optionB, optionC, optionD, correctOption, detailedExplanation, qid]);
        } else if (source === 'MAINS_TOPICS' || source === 'MAINS_SUBTOPICS') {
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
        if (source === 'PRE_TOPICS' || source === 'PRE_SUBTOPICS') {
            await db.run("DELETE FROM questions WHERE question_id = ?", [qid]);
        } else if (source === 'MAINS_TOPICS' || source === 'MAINS_SUBTOPICS') {
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

// ======================================================
// --- Google Doc Link Ingestion Helper ---
// ======================================================

/**
 * Fetches and converts a Google Doc link to plain text.
 *
 * IMPORTANT: The Google Doc must be shared as "Anyone with the link - Viewer"
 * OR published to web (File → Share → Publish to Web).
 *
 * This function tries two strategies in order:
 *  1. Direct DOCX export via Google Drive export API (best quality, preserves formatting)
 *  2. Fallback to published HTML export (requires "Publish to Web" to be enabled)
 */
async function fetchGoogleDocText(gdocUrl) {
    let fetchUrl = gdocUrl.trim();

    // Extract the Google Doc ID from any standard Google Docs URL format
    const docIdMatch = fetchUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch) {
        throw new Error(
            'Invalid Google Doc URL. Please paste the full link from your browser address bar, e.g. https://docs.google.com/document/d/DOCID/edit'
        );
    }

    const docId = docIdMatch[1];

    // --- Strategy 1: Export as DOCX (requires doc shared as "Anyone with the link - Viewer") ---
    try {
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=docx`;
        console.log(`[GDoc Export] Attempting DOCX export: ${exportUrl}`);
        const response = await axios.get(exportUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxRedirects: 10,
            validateStatus: (status) => status < 500  // Don't throw on 4xx, handle them below
        });

        if (response.status === 401 || response.status === 403) {
            // Document is private — throw a clear, actionable error immediately
            throw new Error(
                `ACCESS DENIED (${response.status}): Your Google Doc is private. ` +
                `To fix this:\n` +
                `1. Open your Google Doc\n` +
                `2. Click "Share" (top right)\n` +
                `3. Under "General access", change to "Anyone with the link"\n` +
                `4. Set permission to "Viewer"\n` +
                `5. Click "Done" and try again.`
            );
        }

        if (response.status === 200) {
            const result = await mammoth.convertToHtml({
                arrayBuffer: Buffer.from(response.data),
                convertImage: mammoth.images.inline(async (element) => {
                    const imageBuffer = await element.read();
                    return {
                        src: `data:${element.contentType};base64,${imageBuffer.toString('base64')}`
                    };
                })
            });
            console.log(`[GDoc Export] Successfully parsed DOCX via mammoth.`);
            return convertHtmlToTextWithListNumbering(result.value);
        }

        console.warn(`[GDoc Export] Unexpected status ${response.status}, trying HTML fallback...`);
    } catch (err) {
        // Re-throw the actionable ACCESS DENIED error immediately — don't fall through
        if (err.message && err.message.startsWith('ACCESS DENIED')) {
            throw err;
        }
        console.warn(`[GDoc Export Warning] DOCX export failed (${err.message}), trying published HTML fallback...`);
    }

    // --- Strategy 2: Published HTML export (requires File → Share → Publish to Web) ---
    try {
        const pubUrl = `https://docs.google.com/document/d/${docId}/pub`;
        console.log(`[GDoc Export] Trying published HTML export: ${pubUrl}`);
        const response = await axios.get(pubUrl, {
            headers: { 'Accept': 'text/html,application/xhtml+xml' },
            timeout: 30000,
            maxRedirects: 10,
            validateStatus: (status) => status < 500
        });

        if (response.status === 401 || response.status === 403 || response.status === 404) {
            throw new Error(
                `ACCESS DENIED (${response.status}): Your Google Doc is private or not published. ` +
                `To fix this, do ONE of the following:\n\n` +
                `OPTION A (Recommended - Share with link):\n` +
                `  1. Open your Google Doc\n` +
                `  2. Click "Share" (top right corner)\n` +
                `  3. Under "General access", select "Anyone with the link"\n` +
                `  4. Set permission to "Viewer" and click "Done"\n\n` +
                `OPTION B (Publish to Web):\n` +
                `  1. Open your Google Doc\n` +
                `  2. Go to File → Share → Publish to Web\n` +
                `  3. Click "Publish"\n` +
                `  4. Copy the published link and paste it here`
            );
        }

        if (response.status === 200) {
            console.log(`[GDoc Export] Successfully fetched published HTML.`);
            return convertHtmlToTextWithListNumbering(response.data);
        }

        throw new Error(`Failed to fetch Google Doc. HTTP status: ${response.status}.`);
    } catch (err) {
        if (err.message && (err.message.startsWith('ACCESS DENIED') || err.message.startsWith('Failed'))) {
            throw err;
        }
        throw new Error(`Network error fetching Google Doc: ${err.message}. Make sure the server has internet access.`);
    }
}


// --- Admin Route: Upload MCQ questions from Google Doc link ---
app.post('/api/admin/upload-questions-from-gdoc', async (req, res) => {
    const topicId = req.body.topicId ? parseInt(req.body.topicId) : null;
    const minuteTopicId = req.body.minuteTopicId ? parseInt(req.body.minuteTopicId) : null;
    const examId = req.body.examId ? parseInt(req.body.examId) : null;
    const language = req.body.language || 'EN';
    const gdocUrl = req.body.gdocUrl;

    if (!gdocUrl) {
        return res.status(400).json({ error: "Google Doc URL is required." });
    }
    if (!topicId && !minuteTopicId && !examId) {
        return res.status(400).json({ error: "Topic ID, Minute Topic ID, or Exam ID is required." });
    }

    try {
        console.log(`[GDoc Ingest] Fetching Google Doc from: ${gdocUrl}`);
        const rawText = await fetchGoogleDocText(gdocUrl);

        if (!rawText.trim()) {
            return res.status(400).json({ error: "The Google Doc appears to be empty or could not be read. Please ensure the document is published and contains text." });
        }

        // Re-use the same parsing logic as the DOCX upload by creating a fake request body
        // and calling the core parsing logic
        const fakeReq = {
            body: { topicId, minuteTopicId, examId, language },
            file: { buffer: Buffer.from(rawText, 'utf8'), originalname: 'gdoc.txt' }
        };

        // Process via internal handler - replicate the core logic of upload-questions
        let isMains = false;
        let resolvedTopicId = topicId;

        if (minuteTopicId && !resolvedTopicId) {
            const mt = await db.get("SELECT topic_id FROM minute_topics WHERE minute_topic_id = ?", [minuteTopicId]);
            if (mt) resolvedTopicId = mt.topic_id;
        }
        if (resolvedTopicId) {
            const topicRow = await db.get(`
                SELECT s.tier_type FROM topics t
                JOIN units u ON t.unit_id = u.unit_id
                JOIN subjects s ON u.subject_id = s.subject_id
                WHERE t.topic_id = ?`, [resolvedTopicId]);
            if (topicRow && topicRow.tier_type === 'MAINS') isMains = true;
        }
        if (examId) {
            const exam = await db.get("SELECT tier_type FROM pyq_exams WHERE exam_id = ?", [examId]);
            if (!exam) return res.status(404).json({ error: "Exam not found." });
            if (exam.tier_type === 'MAINS') isMains = true;
        }

        if (isMains) {
            // Parse Mains Q&As
            const blocks = rawText.split(/(?=(?:Q\.|प्र\.|प्रश्न\s*\d*[:\.]?))/i);
            const parsedQuestions = [];
            for (const block of blocks) {
                if (!block.trim() || (!block.includes("Answer:") && !block.includes("Answer") && !block.includes("उत्तर:") && !block.includes("उत्तर") && !block.includes("मॉडल उत्तर"))) continue;
                const qMatch = block.match(/(?:Q\.|प्र\.|प्रश्न\s*\d*[:\.]?)([\s\S]*?)(?=(?:\*?\*?(?:Answer|Answer:|उत्तर:|मॉडल उत्तर:|उत्तर|मॉडल उत्तर)\*?\*?))/i);
                const ansMatch = block.match(/(?:\*?\*?(?:Answer|Answer:|उत्तर:|मॉडल उत्तर:|उत्तर|मॉडल उत्तर)\*?\*?)[\s*:]*([\s\S]*?)$/i);
                if (qMatch && ansMatch) {
                    let answerText = ansMatch[1].trim();
                    if (answerText.endsWith("---")) answerText = answerText.substring(0, answerText.length - 3).trim();
                    parsedQuestions.push({ question_text: cleanFieldText(qMatch[1]), model_answer: cleanFieldText(answerText) });
                }
            }
            if (parsedQuestions.length === 0) {
                return res.status(400).json({ error: "Could not parse any Mains questions. Please ensure format uses Q. and Answer: triggers." });
            }
            let successCount = 0;
            const seqResult = await db.get("SELECT MAX(sequence_order) as maxSeq FROM mains_questions WHERE topic_id = ? AND language = ?", [resolvedTopicId || 101, language]);
            let currentSeq = seqResult && seqResult.maxSeq ? seqResult.maxSeq : 0;
            for (const q of parsedQuestions) {
                currentSeq++;
                const tgt = resolvedTopicId || 101;
                const mins = minuteTopicId || null;
                const examTarget = examId || null;
                if (examTarget) {
                    await db.run(`INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, exam_id) VALUES (?, ?, ?, ?, ?, ?)`, [tgt, q.question_text, q.model_answer, language, currentSeq, examTarget]);
                } else {
                    await db.run(`INSERT INTO mains_questions (topic_id, question_text, model_answer, language, sequence_order, minute_topic_id) VALUES (?, ?, ?, ?, ?, ?)`, [tgt, q.question_text, q.model_answer, language, currentSeq, mins]);
                }
                successCount++;
            }
            console.log(`[GDoc Ingest] Ingested ${successCount} Mains questions.`);
            return res.status(200).json({ message: `Google Doc import successful! Loaded ${successCount} Mains questions.`, inserted_count: successCount });
        } else {
            // Parse Pre MCQs
            const qPattern = /(?:^|\n)\s*Q\.\s*\d*[:\.]?\s*/i;
            const blocks = rawText.split(qPattern).filter(b => b.trim());
            const parsedQuestions = [];
            for (const block of blocks) {
                const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
                let questionLines = [];
                let optionA = '', optionB = '', optionC = '', optionD = '', correctOpt = '', explanationLines = [];
                let parsingExplanation = false;
                for (const line of lines) {
                    if (/^A[\)\.:]/i.test(line)) { optionA = cleanFieldText(line.replace(/^A[\)\.:]/i, '').trim()); continue; }
                    if (/^B[\)\.:]/i.test(line)) { optionB = cleanFieldText(line.replace(/^B[\)\.:]/i, '').trim()); continue; }
                    if (/^C[\)\.:]/i.test(line)) { optionC = cleanFieldText(line.replace(/^C[\)\.:]/i, '').trim()); continue; }
                    if (/^D[\)\.:]/i.test(line)) { optionD = cleanFieldText(line.replace(/^D[\)\.:]/i, '').trim()); continue; }
                    if (/^(?:Answer|Ans|Correct)[:\s]*([A-D])/i.test(line)) {
                        const m = line.match(/^(?:Answer|Ans|Correct)[:\s]*([A-D])/i);
                        if (m) correctOpt = m[1].toUpperCase();
                        parsingExplanation = false;
                        continue;
                    }
                    if (/^(?:Explanation|Exp|Solution|उत्तर|व्याख्या)[:\s]/i.test(line)) {
                        parsingExplanation = true;
                        explanationLines.push(line.replace(/^(?:Explanation|Exp|Solution|उत्तर|व्याख्या)[:\s]/i, '').trim());
                        continue;
                    }
                    if (parsingExplanation) { explanationLines.push(line); continue; }
                    questionLines.push(line);
                }
                if (questionLines.length && optionA && optionB && optionC && optionD && correctOpt) {
                    parsedQuestions.push({
                        question_text: cleanFieldText(questionLines.join('\n')),
                        option_a: optionA, option_b: optionB, option_c: optionC, option_d: optionD,
                        correct_option: correctOpt,
                        detailed_explanation: cleanFieldText(explanationLines.join('\n')) || 'See the correct option.'
                    });
                }
            }
            if (parsedQuestions.length === 0) {
                return res.status(400).json({ error: "Could not parse any MCQs. Please ensure format uses Q., A), B), C), D) and Answer: triggers." });
            }
            if (examId) {
                // Ingest into pyq_questions
                let successCount = 0;
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
                console.log(`[GDoc Ingest] Ingested ${successCount} PYQ MCQs.`);
                return res.status(200).json({ message: `Google Doc import successful! Loaded ${successCount} PYQ MCQs.`, inserted_count: successCount });
            } else {
                // Ingest into standard questions
                let successCount = 0;
                for (const q of parsedQuestions) {
                    const tgt = resolvedTopicId || topicId;
                    await db.run(`INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation, minute_topic_id, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [tgt, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.detailed_explanation, minuteTopicId || null, language]);
                    successCount++;
                }
                console.log(`[GDoc Ingest] Ingested ${successCount} Pre MCQs.`);
                return res.status(200).json({ message: `Google Doc import successful! Loaded ${successCount} MCQs.`, inserted_count: successCount });
            }
        }
    } catch (err) {
        console.error('[GDoc Ingest Error]', err.message);
        if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
            return res.status(502).json({ error: "Cannot reach Google Docs. Ensure the document is published publicly and the server has internet access." });
        }
        res.status(500).json({ error: "Failed to import from Google Doc: " + err.message });
    }
});

// --- Revision Notes: GET (user-facing) ---
app.get('/api/revision-notes', checkSubscription, async (req, res) => {
    const subjectId = req.query.subject_id ? parseInt(req.query.subject_id) : null;
    const topicId = req.query.topic_id ? parseInt(req.query.topic_id) : null;
    const minuteTopicId = req.query.minute_topic_id ? parseInt(req.query.minute_topic_id) : null;
    const language = req.query.language || 'EN';
    try {
        const notes = await db.getRevisionNotes(subjectId, topicId, minuteTopicId, language);
        res.status(200).json({ notes: notes || [] });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch revision notes: " + err.message });
    }
});

// --- Revision Notes: GET topics that have notes (for hierarchical browser) ---
app.get('/api/revision-notes/topics', checkSubscription, async (req, res) => {
    const subjectId = req.query.subject_id ? parseInt(req.query.subject_id) : null;
    const language = req.query.language || 'EN';
    try {
        let query, params;
        if (subjectId) {
            query = `
                SELECT t.topic_id, 
                       CASE WHEN ? = 'HI' THEN COALESCE(t.topic_name_hi, t.topic_name) ELSE t.topic_name END as topic_name, 
                       COUNT(rn.note_id) as note_count
                FROM revision_notes rn
                JOIN topics t ON rn.topic_id = t.topic_id
                WHERE rn.subject_id = ? AND (rn.language = ? OR rn.language IS NULL)
                GROUP BY t.topic_id, t.topic_name, t.topic_name_hi
                ORDER BY t.topic_id ASC
            `;
            params = [language, subjectId, language];
        } else {
            query = `
                SELECT t.topic_id, 
                       CASE WHEN ? = 'HI' THEN COALESCE(t.topic_name_hi, t.topic_name) ELSE t.topic_name END as topic_name, 
                       COUNT(rn.note_id) as note_count
                FROM revision_notes rn
                JOIN topics t ON rn.topic_id = t.topic_id
                WHERE (rn.language = ? OR rn.language IS NULL)
                GROUP BY t.topic_id, t.topic_name, t.topic_name_hi
                ORDER BY t.topic_id ASC
            `;
            params = [language, language];
        }
        const rows = await db.all(query, params);
        res.status(200).json({ topics: rows || [] });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch note topics: " + err.message });
    }
});

// --- Revision Notes: GET subtopics under a topic that have notes ---
app.get('/api/revision-notes/subtopics', checkSubscription, async (req, res) => {
    const topicId = req.query.topic_id ? parseInt(req.query.topic_id) : null;
    const language = req.query.language || 'EN';
    if (!topicId) return res.status(400).json({ error: "topic_id is required." });
    try {
        const query = `
            SELECT mt.minute_topic_id, mt.minute_topic_name as subtopic_name, COUNT(rn.note_id) as note_count
            FROM revision_notes rn
            JOIN minute_topics mt ON rn.minute_topic_id = mt.minute_topic_id
            WHERE rn.topic_id = ? AND (rn.language = ? OR rn.language IS NULL)
            GROUP BY mt.minute_topic_id, mt.minute_topic_name
            ORDER BY mt.minute_topic_id ASC
        `;
        const rows = await db.all(query, [topicId, language]);
        res.status(200).json({ subtopics: rows || [] });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch note subtopics: " + err.message });
    }
});


// --- Revision Notes: GET all (admin-facing) ---
app.get('/api/admin/revision-notes', async (req, res) => {
    try {
        const notes = await db.getAllRevisionNotes();
        res.status(200).json({ notes: notes || [] });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch revision notes: " + err.message });
    }
});

// --- Revision Notes: Upload from Google Doc ---
app.post('/api/admin/upload-revision-note-from-gdoc', async (req, res) => {
    const { title, gdocUrl, subjectId, topicId, minuteTopicId, language } = req.body;

    if (!title || !gdocUrl) {
        return res.status(400).json({ error: "Title and Google Doc URL are required." });
    }

    try {
        console.log(`[RevNote Ingest] Fetching Google Doc from: ${gdocUrl}`);
        const rawText = await fetchGoogleDocText(gdocUrl);

        if (!rawText.trim()) {
            return res.status(400).json({ error: "The Google Doc appears to be empty or could not be read." });
        }

        // Resolve subjectId if missing
        let resolvedSubjectId = subjectId ? parseInt(subjectId) : null;
        if (!resolvedSubjectId && topicId) {
            const topicRow = await db.get(
                "SELECT u.subject_id FROM topics t JOIN units u ON t.unit_id = u.unit_id WHERE t.topic_id = ?",
                [parseInt(topicId)]
            );
            if (topicRow) {
                resolvedSubjectId = topicRow.subject_id;
            }
        }

        const result = await db.addRevisionNote(
            title.trim(),
            rawText.trim(),
            resolvedSubjectId,
            topicId ? parseInt(topicId) : null,
            minuteTopicId ? parseInt(minuteTopicId) : null,
            language || 'EN'
        );

        console.log(`[RevNote Ingest] Saved revision note: "${title}" (ID: ${result.lastID})`);
        res.status(200).json({ message: `Revision note "${title}" imported successfully!`, note_id: result.lastID });
    } catch (err) {
        console.error('[RevNote Ingest Error]', err.message);
        res.status(500).json({ error: "Failed to import revision note from Google Doc: " + err.message });
    }
});

// --- Revision Notes: Upload from DOCX file (supports images, tables, diagrams) ---
app.post('/api/admin/upload-revision-note-docx', async (req, res) => {
    return res.status(400).json({ error: "File upload is deprecated. Please use the Google Doc link ingestion pipeline." });
});

// --- Revision Notes: Delete ---
app.delete('/api/admin/revision-note/:noteId', async (req, res) => {
    const noteId = parseInt(req.params.noteId);
    if (!noteId) return res.status(400).json({ error: "Note ID is required." });
    try {
        await db.deleteRevisionNote(noteId);
        res.status(200).json({ message: "Revision note deleted." });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete revision note: " + err.message });
    }
});

// --- Test Series APIs ---

// 1. Fetch test series scheduled exams with attempt statuses
app.get('/api/test-series/list', async (req, res) => {
    const userId = parseInt(req.query.userId);
    if (!userId) return res.status(400).json({ error: "User ID is required." });
    
    try {
        const exams = await db.getTestSeriesExams();
        const attempts = await db.getAttemptsHistory(userId);
        
        const testAttemptsMap = {};
        attempts.forEach(a => {
            if (a.attempt_type === 'TEST_SERIES') {
                testAttemptsMap[a.title] = a;
            }
        });
        
        const nowSec = Math.floor(Date.now() / 1000);
        const result = exams.map(e => {
            const attempt = testAttemptsMap[e.title];
            return {
                test_exam_id: e.test_exam_id,
                title: e.title,
                description: e.description,
                test_type: e.test_type,
                duration_minutes: e.duration_minutes,
                total_questions: e.total_questions,
                unlock_timestamp: e.unlock_timestamp,
                is_unlocked: nowSec >= e.unlock_timestamp,
                is_attempted: !!attempt,
                score: attempt ? attempt.score : null,
                total_correct: attempt ? attempt.total_correct : null,
                total_incorrect: attempt ? attempt.total_incorrect : null,
                time_taken_seconds: attempt ? attempt.time_taken_seconds : null,
                attempted_timestamp: attempt ? attempt.attempted_timestamp : null
            };
        });
        
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to load test series: " + err.message });
    }
});

// 2. Fetch questions for a specific test series exam (Security: Omit answers/explanations until submit)
app.get('/api/test-series/questions', checkSubscription, async (req, res) => {
    const examId = parseInt(req.query.examId);
    const language = req.query.language || 'EN';
    if (!examId) return res.status(400).json({ error: "Exam ID is required." });
    
    try {
        const questions = await db.getOrGenerateExamQuestions(examId, language);
        
        const secureQuestions = questions.map(q => {
            const { correct_option, detailed_explanation, ...rest } = q;
            return rest;
        });
        
        res.status(200).json({
            exam_id: examId,
            question_count: secureQuestions.length,
            questions: secureQuestions
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate exam questions: " + err.message });
    }
});

// 3. Submit and grade a test series exam
app.post('/api/test-series/submit', checkSubscription, async (req, res) => {
    const { userId, examId, answers, timeTakenSeconds } = req.body;
    if (!userId || !examId || !answers) {
        return res.status(400).json({ error: "User ID, Exam ID, and answers are required." });
    }
    
    try {
        const exam = await db.getTestSeriesExamById(examId);
        if (!exam) return res.status(404).json({ error: "Exam not found." });
        
        let questionIds = [];
        let answersMap = {};
        if (Array.isArray(answers)) {
            questionIds = answers.map(a => Number(a.questionId));
            answers.forEach(a => {
                answersMap[a.questionId] = a.choice;
            });
        } else {
            questionIds = Object.keys(answers).map(Number);
            answersMap = answers;
        }
        
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
        
        const placeholders = questionIds.map(() => '?').join(',');
        const dbQuestions = await db.all(`SELECT * FROM questions WHERE question_id IN (${placeholders})`, questionIds);
        
        const dbQuestionsMap = {};
        for (const q of dbQuestions) {
            dbQuestionsMap[q.question_id] = q;
        }
        
        let correct = 0;
        let incorrect = 0;
        let skipped = 0;
        const details = [];
        const timestamp = Date.now();
        
        for (const qId of questionIds) {
            const q = dbQuestionsMap[qId];
            if (!q) continue;
            
            const userChoice = answersMap[qId];
            await db.saveQuizAttempt(userId, qId, timestamp);
            
            if (!userChoice) {
                skipped++;
                details.push({
                    question_id: qId,
                    question_text: q.question_text,
                    option_a: q.option_a,
                    option_b: q.option_b,
                    option_c: q.option_c,
                    option_d: q.option_d,
                    user_answer: null,
                    correct_answer: q.correct_option,
                    is_correct: false,
                    is_skipped: true,
                    explanation: q.detailed_explanation
                });
            } else if (userChoice.toUpperCase() === q.correct_option.toUpperCase()) {
                correct++;
                details.push({
                    question_id: qId,
                    question_text: q.question_text,
                    option_a: q.option_a,
                    option_b: q.option_b,
                    option_c: q.option_c,
                    option_d: q.option_d,
                    user_answer: userChoice,
                    correct_answer: q.correct_option,
                    is_correct: true,
                    is_skipped: false,
                    explanation: q.detailed_explanation
                });
            } else {
                incorrect++;
                details.push({
                    question_id: qId,
                    question_text: q.question_text,
                    option_a: q.option_a,
                    option_b: q.option_b,
                    option_c: q.option_c,
                    option_d: q.option_d,
                    user_answer: userChoice,
                    correct_answer: q.correct_option,
                    is_correct: false,
                    is_skipped: false,
                    explanation: q.detailed_explanation
                });
            }
        }
        
        const totalMarks = (correct * 1.33) - (incorrect * 0.44);
        const roundedScore = Math.round(totalMarks * 100) / 100;
        
        await db.saveAttemptRecord(
            userId,
            'TEST_SERIES',
            exam.title,
            roundedScore,
            correct,
            incorrect,
            questionIds.length,
            timeTakenSeconds || 0
        );
        
        res.status(200).json({
            total: questionIds.length,
            correct: correct,
            incorrect: incorrect,
            skipped: skipped,
            score: roundedScore,
            details: details
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to grade exam: " + err.message });
    }
});

// 4. Fetch unified attempts history (Practice + Test Series)
app.get('/api/user/attempts', async (req, res) => {
    const userId = parseInt(req.query.userId);
    if (!userId) return res.status(400).json({ error: "User ID is required." });
    
    try {
        const history = await db.getAttemptsHistory(userId);
        res.status(200).json(history);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch attempt history: " + err.message });
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
