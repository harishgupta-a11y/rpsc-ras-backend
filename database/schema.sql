-- RPSC RAS Exam Prep Application - PostgreSQL Database Schema

-- 1. Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    subscription_status BOOLEAN DEFAULT FALSE NOT NULL,
    expiry_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Subscriptions History Table (Audit Log)
CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE NOT NULL,
    plan_name VARCHAR(50) NOT NULL, -- e.g., '1 Day Access', '7 Days Access', '30 Days Access'
    amount DECIMAL(10, 2) NOT NULL, -- e.g., 1.00, 7.00, 30.00 INR
    payment_status VARCHAR(20) DEFAULT 'SUCCESS' NOT NULL, -- 'PENDING', 'SUCCESS', 'FAILED'
    payment_id VARCHAR(100) UNIQUE NOT NULL, -- Gateway reference id (Razorpay / Stripe)
    expiry_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Syllabus Subjects Table
CREATE TYPE exam_tier_enum AS ENUM ('PRE', 'MAINS');

CREATE TABLE subjects (
    subject_id SERIAL PRIMARY KEY,
    exam_tier exam_tier_enum NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    description TEXT
);

-- 4. Syllabus Topics Table
CREATE TABLE topics (
    topic_id SERIAL PRIMARY KEY,
    subject_id INT REFERENCES subjects(subject_id) ON DELETE CASCADE NOT NULL,
    topic_name VARCHAR(200) NOT NULL,
    description TEXT
);

-- 5. Theory Content Data
CREATE TABLE theory_content (
    theory_id SERIAL PRIMARY KEY,
    topic_id INT REFERENCES topics(topic_id) ON DELETE CASCADE NOT NULL,
    content_body TEXT NOT NULL, -- Markdown formatted study material
    is_ai_generated BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Question Bank Engine (Pre MCQs)
CREATE TABLE questions (
    question_id SERIAL PRIMARY KEY,
    topic_id INT REFERENCES topics(topic_id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option CHAR(1) CHECK (correct_option IN ('A', 'B', 'C', 'D')) NOT NULL,
    detailed_explanation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Mains Descriptive Questions Table (Additional Mains Support)
CREATE TABLE mains_questions (
    mains_question_id SERIAL PRIMARY KEY,
    topic_id INT REFERENCES topics(topic_id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    suggested_answer TEXT NOT NULL,
    key_eval_points TEXT[] NOT NULL, -- Critical points examiners look for
    word_limit INT DEFAULT 50 NOT NULL, -- 15 words, 50 words, or 100 words RPSC pattern
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indices for performance optimizations
CREATE INDEX idx_users_mobile ON users(mobile_number);
CREATE INDEX idx_subjects_tier ON subjects(exam_tier);
CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_theory_topic ON theory_content(topic_id);
CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_mains_questions_topic ON mains_questions(topic_id);
