// RPSC RAS Exam Prep Backend Service
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const db = require('./database/db');

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
                expiry_timestamp: user.expiry_timestamp
            }
        });
    } catch (err) {
        res.status(500).json({ error: "OTP Verification failed: " + err.message });
    }
});

// --- Subscription Gateway Routes ---
app.post('/api/subscription/purchase', async (req, res) => {
    const { mobileNumber, planId } = req.body; // PlanId: 1 (1 Day), 7 (7 Days), 30 (30 Days)
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
        if (planId === 7) {
            durationDays = 7;
            cost = 7.00;
        } else if (planId === 30) {
            durationDays = 30;
            cost = 30.00;
        }

        const expiryTime = Date.now() + durationDays * 24 * 60 * 60 * 1000;
        await db.updateUserSubscription(mobileNumber, expiryTime);

        console.log(`[Billing] Plan purchased: ${durationDays} Days (₹${cost} INR) for user: ${mobileNumber}`);

        return res.status(200).json({
            message: `Plan activated successfully for ${durationDays} days.`,
            expiry_timestamp: expiryTime,
            cost: cost
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
    const { userId, topicIds, count } = req.body;
    if (!userId || !topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
        return res.status(400).json({ error: "User ID and at least one Topic ID are required." });
    }

    const questionCount = parseInt(count) || 10;

    try {
        console.log(`[Quiz Engine] Compiling ${questionCount} questions for topics:`, topicIds);
        const questions = await db.generateQuiz(userId, topicIds, questionCount);

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

    if (!subjectId || !topicId) {
        return res.status(400).send("Subject ID and Topic ID are required.");
    }

    try {
        // Build DOCX Template using docx library
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: "RPSC RAS Question Ingestion Template", bold: true, size: 28 }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `Subject ID: ${subjectId}`, italics: true }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `Topic ID: ${topicId}`, italics: true }),
                        ],
                    }),
                    new Paragraph({ text: "" }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Instructions: Copy-paste the blocks below to add multiple questions. Do not modify the triggers (Q., A), B), C), D), Correct:, Explanation:). Ensure each question block ends with a double line break.", color: "FF0000", size: 20 }),
                        ],
                    }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "Q. Write the question text here?" }),
                    new Paragraph({ text: "A) Option A text" }),
                    new Paragraph({ text: "B) Option B text" }),
                    new Paragraph({ text: "C) Option C text" }),
                    new Paragraph({ text: "D) Option D text" }),
                    new Paragraph({ text: "Correct: A" }),
                    new Paragraph({ text: "Explanation: Write the detailed answer explanation here." }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "---" }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "Q. Next question text here?" }),
                    new Paragraph({ text: "A) First Option" }),
                    new Paragraph({ text: "B) Second Option" }),
                    new Paragraph({ text: "C) Third Option" }),
                    new Paragraph({ text: "D) Fourth Option" }),
                    new Paragraph({ text: "Correct: C" }),
                    new Paragraph({ text: "Explanation: Detailed explanation for this question." }),
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
    const topicId = req.body.topicId;
    if (!topicId) {
        return res.status(400).json({ error: "Topic ID is required." });
    }

    if (!req.file) {
        return res.status(400).json({ error: "Please upload a .docx or .txt file." });
    }

    try {
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

        // Parse questions using strict regex triggers
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

        // Bulk insert parsed questions into SQLite database
        let successCount = 0;
        for (const q of parsedQuestions) {
            await db.run(`
                INSERT INTO questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, detailed_explanation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [topicId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.detailed_explanation]);
            successCount++;
        }

        console.log(`[Admin Ingest] Ingested ${successCount} questions for Topic ID ${topicId}`);

        return res.status(200).json({
            message: `Ingestion successful! Loaded ${successCount} questions into topic database.`,
            inserted_count: successCount
        });

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
