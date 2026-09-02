/**
 * ============================================================================
 * RPSC RAS Desktop Web Portal — Enterprise 3-Pane Client Engine (app.js)
 * 100% Mobile Parity: Live Syllabus, Formats Progress, OMR 5th, Friend Challenge
 * ============================================================================
 */

const API_BASE_URL = (window.location.origin && window.location.origin.includes('localhost:5000'))
  ? 'http://localhost:5000/api'
  : 'https://rpsc-ras-backend.onrender.com/api';

console.log('[RPSC RAS Engine] Connected to API Base:', API_BASE_URL);

// Global State
const state = {
  language: 'HI',
  userMobile: localStorage.getItem('rpsc_user_mobile') || '9876543210',
  userName: localStorage.getItem('rpsc_user_name') || 'अभ्यर्थी',
  
  // Syllabus & Navigation
  syllabus: [],
  activeSubject: null,
  activeTopic: null,
  activeSubtopic: null,
  subtopicsList: [],
  
  // Filters & Volume
  difficulty: 'ALL', // 'FOUNDATION', 'ADVANCED', 'ALL'
  selectedFormat: 'ALL', // 'ALL', 'DIRECT', 'MATCH', 'STATEMENT', 'ASSERTION_REASON', 'CHRONOLOGY', 'NOT_MATCHED'
  formatStats: null,
  questionVolume: 10,
  
  // Active Quiz Engine
  activeQuiz: {
    mode: 'PRACTICE', // 'PRACTICE' or 'EXAM'
    isChallenge: false,
    challengeRoomCode: null,
    questions: [],
    currentIndex: 0,
    userChoices: {},
    reviewedQuestions: new Set(),
    startTime: null,
    timeTakenSeconds: 0,
    timerSeconds: 45 * 60,
    timerInterval: null
  },

  // Speech Narration
  speechSynth: window.speechSynthesis || null,
  isSpeaking: false,
  pendingChallengeCode: null
};

// ============================================================================
// 1. INITIALIZATION & LIFECYCLE
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  initLanguage();
  setupKeyboardShortcuts();
  setupSearchInput();
  await loadSyllabusFromApi();
});

function initLanguage() {
  const saved = localStorage.getItem('rpsc_lang_pref');
  if (saved && (saved === 'HI' || saved === 'EN')) {
    state.language = saved;
  }
  updateLanguageElements();
}

function toggleLanguage() {
  state.language = state.language === 'HI' ? 'EN' : 'HI';
  localStorage.setItem('rpsc_lang_pref', state.language);
  updateLanguageElements();
  loadSyllabusFromApi();
}

function updateLanguageElements() {
  const isHi = state.language === 'HI';
  const flagEl = document.getElementById('sidebar-lang-flag');
  const textEl = document.getElementById('sidebar-lang-text');
  const badgeEl = document.getElementById('sidebar-badge-text');

  if (flagEl) flagEl.textContent = isHi ? '🇮🇳' : '🇺🇸';
  if (textEl) textEl.textContent = isHi ? 'हिन्दी (Hindi)' : 'English (US)';
  if (badgeEl) badgeEl.textContent = isHi ? '✓ 100% प्रामाणिक' : '✓ 100% Verified';

  document.querySelectorAll('[data-en][data-hi]').forEach(el => {
    el.textContent = isHi ? el.getAttribute('data-hi') : el.getAttribute('data-en');
  });
}

// ============================================================================
// 2. DYNAMIC SYLLABUS & TOPIC NAVIGATION
// ============================================================================

async function loadSyllabusFromApi() {
  const listContainer = document.getElementById('sidebar-subjects-list');
  if (listContainer) {
    listContainer.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:8px 12px;">पाठ्यक्रम लोड हो रहा है...</div>';
  }

  try {
    const res = await fetch(`${API_BASE_URL}/syllabus?language=${state.language}`, {
      headers: { 'x-user-mobile': state.userMobile }
    });
    if (!res.ok) throw new Error('Failed to load syllabus: ' + res.statusText);

    const data = await res.json();
    state.syllabus = data.syllabus || [];
    renderSidebarSubjects();

    // Default select Rajasthan Geography or first subject
    if (state.syllabus.length > 0) {
      const defaultSub = state.syllabus.find(s => s.subject_name.includes('भूगोल') || s.subject_name.includes('Geography')) || state.syllabus[0];
      selectSubject(defaultSub.subject_id);
    }
  } catch (err) {
    console.error('Error loading syllabus:', err);
    if (listContainer) {
      listContainer.innerHTML = '<div style="font-size:12px; color:var(--rose); padding:8px 12px;">पाठ्यक्रम लोड नहीं हो सका।</div>';
    }
  }
}

function getSubjectIcon(name) {
  if (/भूगोल|Geography/i.test(name)) return '🌍';
  if (/इतिहास|कला|History|Culture/i.test(name)) return '🏰';
  if (/संविधान|राजनीति|Polity|Governance/i.test(name)) return '🏛️';
  if (/अर्थव्यवस्था|Economy/i.test(name)) return '📈';
  if (/विज्ञान|प्रौद्योगिकी|Science/i.test(name)) return '🔬';
  if (/तार्किक|मानसिक|Reasoning|Mental/i.test(name)) return '🧠';
  if (/समसामयिक|Current/i.test(name)) return '📰';
  return '📚';
}

function renderSidebarSubjects() {
  const container = document.getElementById('sidebar-subjects-list');
  if (!container) return;

  container.innerHTML = '';
  state.syllabus.forEach(subject => {
    const item = document.createElement('div');
    item.className = 'sidebar-nav-item';
    item.id = `sidebar-subject-${subject.subject_id}`;
    
    const icon = getSubjectIcon(subject.subject_name);
    let totalTopics = 0;
    if (subject.units) {
      subject.units.forEach(u => {
        if (u.topics) totalTopics += u.topics.length;
      });
    }

    item.innerHTML = `
      <div class="nav-left-box">
        <span class="nav-icon">${icon}</span>
        <span class="nav-text" title="${subject.subject_name}">${subject.subject_name}</span>
      </div>
      <span class="nav-badge">${totalTopics}</span>
    `;

    item.onclick = () => selectSubject(subject.subject_id);
    container.appendChild(item);
  });
}

function selectSubject(subjectId) {
  const subject = state.syllabus.find(s => s.subject_id === subjectId);
  if (!subject) return;

  state.activeSubject = subject;

  // Update active sidebar state
  document.querySelectorAll('#sidebar-subjects-list .sidebar-nav-item').forEach(el => el.classList.remove('active'));
  const activeSidebarItem = document.getElementById(`sidebar-subject-${subjectId}`);
  if (activeSidebarItem) activeSidebarItem.classList.add('active');

  const dashItem = document.getElementById('nav-item-dashboard');
  if (dashItem) dashItem.classList.remove('active');

  // Update Breadcrumb & Hero Banner
  const bcTitle = document.getElementById('header-breadcrumb-title');
  if (bcTitle) bcTitle.textContent = subject.subject_name;

  const heroTitle = document.getElementById('subject-main-title');
  if (heroTitle) heroTitle.textContent = subject.subject_name;

  // Collect all topics under units
  let allTopics = [];
  if (subject.units) {
    subject.units.forEach(u => {
      if (u.topics) allTopics = allTopics.concat(u.topics);
    });
  }

  // If topics exist, select first topic
  if (allTopics.length > 0) {
    selectTopic(allTopics[0]);
  } else {
    document.getElementById('chapter-list-container').innerHTML = '<div style="padding:16px; color:var(--text-muted);">इस विषय में कोई टॉपिक उपलब्ध नहीं है।</div>';
  }

  showView('hub');
}

async function selectTopic(topic) {
  state.activeTopic = topic;
  const listContainer = document.getElementById('chapter-list-container');
  listContainer.innerHTML = '<div style="padding:16px; color:var(--text-muted);">माइक्रो-टॉपिक लोड हो रहे हैं...</div>';

  try {
    const res = await fetch(`${API_BASE_URL}/topics/${topic.topic_id}/minute-topics?language=${state.language}`, {
      headers: { 'x-user-mobile': state.userMobile }
    });
    if (!res.ok) throw new Error('Failed to load subtopics');
    const data = await res.json();
    state.subtopicsList = data.minuteTopics || [];

    if (state.subtopicsList.length > 0) {
      renderSubtopicsList();
      selectSubtopic(state.subtopicsList[0].minute_topic_id);
    } else {
      listContainer.innerHTML = '<div style="padding:16px; color:var(--text-muted);">इस टॉपिक में कोई सब-टॉपिक उपलब्ध नहीं है।</div>';
    }
  } catch (e) {
    console.error('Error fetching minute topics:', e);
    listContainer.innerHTML = '<div style="padding:16px; color:var(--rose);">सब-टॉपिक लोड करने में त्रुटि हुई।</div>';
  }
}

function renderSubtopicsList() {
  const container = document.getElementById('chapter-list-container');
  if (!container) return;

  container.innerHTML = '';
  state.subtopicsList.forEach((sub, idx) => {
    const item = document.createElement('div');
    item.className = 'chapter-item' + (state.activeSubtopic?.minute_topic_id === sub.minute_topic_id ? ' selected' : '');
    item.id = `chapter-item-${sub.minute_topic_id}`;
    item.onclick = () => selectSubtopic(sub.minute_topic_id);

    const attempted = sub.attempted_count || 0;
    const total = sub.q_count || 0;
    const pct = total > 0 ? Math.min(100, Math.round((attempted / total) * 100)) : 0;
    const isCompleted = total > 0 && attempted >= total;

    item.innerHTML = `
      <div class="chapter-left">
        <span class="chapter-num">${idx + 1}</span>
        <div style="flex: 1;">
          <div class="chapter-title-text">${sub.minute_topic_name}</div>
          <div class="chapter-meta-text">
            ${isCompleted ? '✅ 100% पूर्ण (Mastered)' : `${attempted} / ${total} प्रश्न हल किए (${pct}% Done)`}
          </div>
          <div class="chapter-progress-wrap">
            <div class="chapter-progress-fill" style="width: ${pct}%; background: ${isCompleted ? '#10B981' : '#0284C7'};"></div>
          </div>
        </div>
      </div>
      <span class="chapter-badge">${total} Qs</span>
    `;

    container.appendChild(item);
  });
}

async function selectSubtopic(subtopicId) {
  const sub = state.subtopicsList.find(s => s.minute_topic_id === subtopicId);
  if (!sub) return;

  state.activeSubtopic = sub;

  document.querySelectorAll('.chapter-item').forEach(el => el.classList.remove('selected'));
  const activeEl = document.getElementById(`chapter-item-${subtopicId}`);
  if (activeEl) activeEl.classList.add('selected');

  await fetchFormatStatsAndProgress(subtopicId);
}

// ============================================================================
// 3. FORMAT STATS, ATTEMPT PROGRESS & VOLUME CLAMPING
// ============================================================================

async function fetchFormatStatsAndProgress(subtopicId) {
  try {
    const res = await fetch(`${API_BASE_URL}/minute-topics/format-stats?minute_topic_id=${subtopicId}&difficulty=${state.difficulty}`, {
      headers: { 'x-user-mobile': state.userMobile }
    });
    if (!res.ok) throw new Error('Failed to load format stats');

    const data = await res.json();
    state.formatStats = data.stats || {};
    renderFormatCards();
    updateVolumePills();
  } catch (err) {
    console.error('Error fetching format stats:', err);
  }
}

const FORMAT_CONFIGS = [
  { key: 'ALL', full: true, icon: '🔀', titleHi: 'मिश्रित प्रारूप (सभी)', titleEn: 'Mixed Formats (All)', descHi: 'सभी प्रारूप • वास्तविक परीक्षा अनुरूप', descEn: 'Real Exam Blend' },
  { key: 'DIRECT', icon: '⚡', titleHi: 'सीधे प्रश्न', titleEn: 'Direct MCQs', descHi: 'त्वरित तथ्य पुनरावृत्ति', descEn: 'Fast Recall' },
  { key: 'CHRONOLOGY', icon: '⏱️', titleHi: 'सही कालक्रम', titleEn: 'Chronology', descHi: 'घटनाओं का कालक्रमानुसार क्रम', descEn: 'Chronological Sequence' },
  { key: 'NOT_MATCHED', icon: '❌', titleHi: 'सुमेलित नहीं', titleEn: 'Not Matched', descHi: 'असंगत युग्म / असत्य कथन की पहचान', descEn: 'Find False / Mismatch' },
  { key: 'MATCH', icon: '🧩', titleHi: 'सुमेलित कीजिए', titleEn: 'Match Columns', descHi: 'सूची-I व सूची-II मिलान (4-कॉलम)', descEn: 'List I & II Grid' },
  { key: 'ASSERTION_REASON', icon: '⚖️', titleHi: 'कथन-कारण', titleEn: 'Assertion-Reason', descHi: 'अभिकथन (A) व कारण (R) तर्क', descEn: 'Logic & Reasoning' },
  { key: 'STATEMENT', icon: '📋', titleHi: 'बहु-कथन विश्लेषण', titleEn: 'Multi-Statement', descHi: 'A, B, C कथन एवं कूट विश्लेषण', descEn: 'A, B, C Statements' }
];

function renderFormatCards() {
  const container = document.getElementById('format-grid-container');
  if (!container) return;

  container.innerHTML = '';
  const isHi = state.language === 'HI';

  FORMAT_CONFIGS.forEach(fmt => {
    const count = state.formatStats?.[fmt.key] || 0;
    const prog = state.formatStats?.progress?.[fmt.key];
    const attempted = prog?.attempted || 0;
    const total = prog?.total || count;
    const pct = total > 0 ? Math.min(100, Math.round((attempted / total) * 100)) : 0;
    const isCompleted = total > 0 && attempted >= total;

    const card = document.createElement('div');
    card.className = 'format-card' + (fmt.full ? ' format-card-full' : '') + (state.selectedFormat === fmt.key ? ' selected' : '');
    card.onclick = () => selectFormat(fmt.key);

    card.innerHTML = `
      <div class="format-card-header">
        <div class="format-title-box">
          <span class="format-icon">${fmt.icon}</span>
          <span class="format-title">${isHi ? fmt.titleHi : fmt.titleEn}</span>
        </div>
        <span class="format-count-pill">${count} Qs</span>
      </div>
      <div class="format-desc">${isHi ? fmt.descHi : fmt.descEn}</div>
      <div style="display:flex; justify-content:space-between; font-size:10.5px; color:var(--text-muted); margin-top:4px;">
        <span>${isCompleted ? '✅ 100% पूर्ण' : `${attempted}/${total} हल किए`}</span>
        <span>${pct}%</span>
      </div>
      <div class="format-progress-bar">
        <div class="format-progress-fill" style="width: ${pct}%; background: ${isCompleted ? '#10B981' : '#0284C7'};"></div>
      </div>
    `;

    container.appendChild(card);
  });
}

function selectFormat(formatKey) {
  state.selectedFormat = formatKey;
  renderFormatCards();
  updateVolumePills();
}

function setDifficultyFilter(diff) {
  state.difficulty = diff;
  document.querySelectorAll('.diff-tier-btn').forEach(btn => btn.classList.remove('selected'));
  const btn = document.getElementById(`diff-btn-${diff.toLowerCase()}`);
  if (btn) btn.classList.add('selected');

  if (state.activeSubtopic) {
    fetchFormatStatsAndProgress(state.activeSubtopic.minute_topic_id);
  }
}

function updateVolumePills() {
  const container = document.getElementById('volume-pills-container');
  if (!container) return;

  container.innerHTML = '';
  const count = state.formatStats?.[state.selectedFormat] || state.formatStats?.ALL || 10;
  
  let options = [];
  if (count <= 0) options = [10];
  else if (count <= 5) options = [count];
  else if (count <= 10) options = count === 5 ? [5] : [5, count];
  else if (count <= 20) options = [5, 10, count];
  else options = [10, 20, count];

  if (state.questionVolume > count || !options.includes(state.questionVolume)) {
    state.questionVolume = options[options.length - 1];
  }

  options.forEach(val => {
    const isSelected = state.questionVolume === val;
    const isAll = val === count;
    const pill = document.createElement('div');
    pill.className = 'volume-pill' + (isSelected ? ' selected' : '');
    pill.textContent = isAll 
      ? (state.language === 'HI' ? `सभी (${val} प्रश्न)` : `All (${val} Qs)`)
      : (state.language === 'HI' ? `${val} प्रश्न` : `${val} Qs`);

    pill.onclick = () => {
      state.questionVolume = val;
      updateVolumePills();
    };
    container.appendChild(pill);
  });
}

// ============================================================================
// 4. ACTIVE QUIZ ENGINE (PRACTICE & CBT EXAM MODES)
// ============================================================================

async function launchActiveQuiz(mode) {
  if (!state.activeSubtopic) {
    alert('कृपया पहले एक सब-टॉपिक चुनें।');
    return;
  }

  // Check if topic is already 100% completed
  const prog = state.formatStats?.progress?.[state.selectedFormat] || state.formatStats?.progress?.ALL;
  if (prog && prog.total > 0 && prog.attempted >= prog.total && mode === 'EXAM') {
    openModal('modal-topic-completed');
    return;
  }

  try {
    const subtopicId = state.activeSubtopic.minute_topic_id;
    const limit = state.questionVolume || 10;
    const lang = state.language || 'HI';
    const diff = state.difficulty || 'ALL';
    const fmt = state.selectedFormat || 'ALL';

    const url = `${API_BASE_URL}/quiz/generate?limit=${limit}&language=${lang}&minute_topic_id=${subtopicId}&difficulty=${diff}&questionFormat=${fmt}`;
    const res = await fetch(url, { headers: { 'x-user-mobile': state.userMobile } });
    if (!res.ok) throw new Error('Failed to fetch questions');

    const data = await res.json();
    const questions = data.questions || [];
    if (questions.length === 0) {
      alert('इस चयन में कोई प्रश्न नहीं मिला।');
      return;
    }

    startQuizSession(questions, mode);
  } catch (err) {
    console.error('Quiz start error:', err);
    alert('परीक्षा शुरू करने में त्रुटि: ' + err.message);
  }
}

function startQuizSession(questions, mode, isChallenge = false, roomCode = null) {
  state.activeQuiz = {
    mode: mode,
    isChallenge: isChallenge,
    challengeRoomCode: roomCode,
    questions: questions,
    currentIndex: 0,
    userChoices: {},
    reviewedQuestions: new Set(),
    startTime: Date.now(),
    timeTakenSeconds: 0,
    timerSeconds: questions.length * 60,
    timerInterval: null
  };

  // Switch to exam view
  showView('exam');

  // Toggle Context Rail widgets
  document.getElementById('rail-challenge-widget').style.display = 'none';
  document.getElementById('rail-exam-widget').style.display = 'block';

  // Start countdown timer
  startCountdownTimer();

  // Render question 1
  renderCurrentQuestion();
  renderCbtPalette();
}

function startCountdownTimer() {
  if (state.activeQuiz.timerInterval) clearInterval(state.activeQuiz.timerInterval);

  const displayEl = document.getElementById('exam-clock-display');
  state.activeQuiz.timerInterval = setInterval(() => {
    state.activeQuiz.timerSeconds--;
    state.activeQuiz.timeTakenSeconds++;

    if (state.activeQuiz.timerSeconds <= 0) {
      clearInterval(state.activeQuiz.timerInterval);
      alert('समय समाप्त! आपकी परीक्षा स्वतः जमा हो रही है।');
      submitExamResults();
      return;
    }

    const mins = Math.floor(state.activeQuiz.timerSeconds / 60);
    const secs = state.activeQuiz.timerSeconds % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (displayEl) {
      displayEl.textContent = formatted;
      if (state.activeQuiz.timerSeconds <= 300) {
        displayEl.classList.add('warning');
      } else {
        displayEl.classList.remove('warning');
      }
    }
  }, 1000);
}

function renderCurrentQuestion() {
  const q = state.activeQuiz.questions[state.activeQuiz.currentIndex];
  if (!q) return;

  const qIndex = state.activeQuiz.currentIndex;
  const totalQ = state.activeQuiz.questions.length;

  document.getElementById('exam-q-counter').textContent = `प्रश्न ${qIndex + 1} / ${totalQ}`;
  
  // Parse question text and statements
  let rawText = q.question_text || '';
  const statementMatches = rawText.match(/^[A-D]\.\s*.*$/gm);
  const stmtContainer = document.getElementById('exam-statement-container');
  
  if (statementMatches && statementMatches.length > 0) {
    stmtContainer.style.display = 'block';
    stmtContainer.innerHTML = '';
    // Strip statements from main question text
    let cleanText = rawText;
    statementMatches.forEach(stmt => {
      cleanText = cleanText.replace(stmt, '');
      const stmtCard = document.createElement('div');
      stmtCard.className = 'statement-card';
      const letter = stmt.trim().charAt(0);
      const text = stmt.trim().substring(2).trim();
      stmtCard.innerHTML = `<span class="statement-badge">${letter}</span> <span>${text}</span>`;
      stmtContainer.appendChild(stmtCard);
    });
    document.getElementById('exam-q-text').textContent = cleanText.trim();
  } else {
    stmtContainer.style.display = 'none';
    document.getElementById('exam-q-text').textContent = rawText;
  }

  // Render 5 Options
  const optionsList = document.getElementById('exam-options-list');
  optionsList.innerHTML = '';

  const opts = [
    { key: '1', label: '1', text: q.option_a },
    { key: '2', label: '2', text: q.option_b },
    { key: '3', label: '3', text: q.option_c },
    { key: '4', label: '4', text: q.option_d },
    { key: '5', label: '5', text: 'अनुत्तरित प्रश्न (Question not attempted / OMR Option 5)', isOmr: true }
  ];

  const currentChoice = state.activeQuiz.userChoices[q.question_id];

  opts.forEach(opt => {
    const card = document.createElement('div');
    card.className = 'option-card' + (currentChoice === opt.key ? ' selected' : '') + (opt.isOmr ? ' option-omr-5' : '');
    card.onclick = () => selectOptionChoice(opt.key);

    card.innerHTML = `
      <div class="option-letter">${opt.label}</div>
      <div class="option-text">${opt.text}</div>
    `;
    optionsList.appendChild(card);
  });

  // Practice Mode Explanation Drawer
  const drawer = document.getElementById('exam-explanation-drawer');
  if (state.activeQuiz.mode === 'PRACTICE' && currentChoice) {
    drawer.style.display = 'block';
    const banner = document.getElementById('explanation-status-banner');
    const body = document.getElementById('explanation-content-body');
    const isCorrect = currentChoice === q.correct_option;

    if (banner) {
      banner.className = 'explanation-status-banner ' + (isCorrect ? 'correct' : 'incorrect');
      banner.textContent = isCorrect ? '✓ सही उत्तर! (Correct Answer)' : `✗ गलत उत्तर! (सही विकल्प: ${q.correct_option})`;
    }
    if (body) {
      body.innerHTML = formatExplanationBullets(q.detailed_explanation || 'व्याख्या उपलब्ध नहीं है।');
    }
  } else {
    drawer.style.display = 'none';
  }

  // Prev / Next button states
  document.getElementById('btn-prev-q').disabled = qIndex === 0;
  document.getElementById('btn-next-q').textContent = (qIndex === totalQ - 1) ? 'समीक्षा करें (Review) →' : 'अगला (Next) →';

  renderCbtPalette();
}

function selectOptionChoice(choiceKey) {
  const q = state.activeQuiz.questions[state.activeQuiz.currentIndex];
  if (!q) return;

  state.activeQuiz.userChoices[q.question_id] = choiceKey;
  renderCurrentQuestion();
}

function clearCurrentChoice() {
  const q = state.activeQuiz.questions[state.activeQuiz.currentIndex];
  if (!q) return;

  delete state.activeQuiz.userChoices[q.question_id];
  renderCurrentQuestion();
}

function toggleMarkForReview() {
  const q = state.activeQuiz.questions[state.activeQuiz.currentIndex];
  if (!q) return;

  if (state.activeQuiz.reviewedQuestions.has(q.question_id)) {
    state.activeQuiz.reviewedQuestions.delete(q.question_id);
  } else {
    state.activeQuiz.reviewedQuestions.add(q.question_id);
  }
  renderCbtPalette();
}

function navigateQuestion(delta) {
  const newIndex = state.activeQuiz.currentIndex + delta;
  if (newIndex >= 0 && newIndex < state.activeQuiz.questions.length) {
    state.activeQuiz.currentIndex = newIndex;
    renderCurrentQuestion();
  } else if (newIndex >= state.activeQuiz.questions.length) {
    confirmSubmitExam();
  }
}

function renderCbtPalette() {
  const container = document.getElementById('cbt-palette-container');
  if (!container) return;

  container.innerHTML = '';
  state.activeQuiz.questions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.className = 'cbt-q-btn';
    btn.textContent = (idx + 1).toString();

    const choice = state.activeQuiz.userChoices[q.question_id];
    const isReview = state.activeQuiz.reviewedQuestions.has(q.question_id);
    const isCurrent = state.activeQuiz.currentIndex === idx;

    if (isCurrent) btn.classList.add('current');
    if (isReview) btn.classList.add('review');
    else if (choice === '5') btn.classList.add('skipped');
    else if (choice) btn.classList.add('answered');

    btn.onclick = () => {
      state.activeQuiz.currentIndex = idx;
      renderCurrentQuestion();
    };

    container.appendChild(btn);
  });
}

function formatExplanationBullets(text) {
  if (!text) return '';
  const lines = text.split(/\n|\r\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return '<ul>' + lines.map(l => `<li>${l.replace(/^[-*•]\s*/, '')}</li>`).join('') + '</ul>';
  }
  return `<p>${text}</p>`;
}

// ============================================================================
// 5. TEST SUBMISSION, RPSC MARKING & LEADERBOARD
// ============================================================================

function confirmSubmitExam() {
  const total = state.activeQuiz.questions.length;
  const answered = Object.keys(state.activeQuiz.userChoices).length;
  const skipped = total - answered;

  const msg = `क्या आप परीक्षा जमा करना चाहते हैं?\n\n• कुल प्रश्न: ${total}\n• हल किए गए: ${answered}\n• शेष / अनुत्तरित: ${skipped}`;
  if (confirm(msg)) {
    submitExamResults();
  }
}

async function submitExamResults() {
  if (state.activeQuiz.timerInterval) clearInterval(state.activeQuiz.timerInterval);

  const answers = Object.entries(state.activeQuiz.userChoices).map(([qId, choice]) => ({
    questionId: parseInt(qId),
    choice: choice
  }));

  // If in Challenge Mode, post to challenge endpoint
  if (state.activeQuiz.isChallenge && state.activeQuiz.challengeRoomCode) {
    try {
      const res = await fetch(`${API_BASE_URL}/quiz/challenge/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: state.activeQuiz.challengeRoomCode,
          userMobile: state.userMobile,
          userName: state.userName,
          answers: answers,
          timeTakenSeconds: state.activeQuiz.timeTakenSeconds
        })
      });
      const data = await res.json();
      renderScorecard(data.score, data.correct_count, data.incorrect_count, data.skipped_count, data.total_questions, data.leaderboard);
    } catch (e) {
      console.error('Error submitting challenge:', e);
      fallbackLocalGrading();
    }
  } else {
    // Standard grading via /quiz/grade
    try {
      const res = await fetch(`${API_BASE_URL}/quiz/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-mobile': state.userMobile
        },
        body: JSON.stringify({
          answers: answers,
          timeTakenSeconds: state.activeQuiz.timeTakenSeconds
        })
      });
      const data = await res.json();
      renderScorecard(data.score, data.correct, data.incorrect, data.skipped, data.total, null);
    } catch (e) {
      console.error('Error grading quiz:', e);
      fallbackLocalGrading();
    }
  }
}

function fallbackLocalGrading() {
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  state.activeQuiz.questions.forEach(q => {
    const choice = state.activeQuiz.userChoices[q.question_id];
    if (!choice || choice === '5') {
      skipped++;
    } else if (choice === q.correct_option) {
      correct++;
    } else {
      incorrect++;
    }
  });

  const netScore = Math.max(0, (correct * 1.3333) - (incorrect * 0.4444)).toFixed(2);
  renderScorecard(netScore, correct, incorrect, skipped, state.activeQuiz.questions.length, null);
}

function renderScorecard(score, correct, incorrect, skipped, total, leaderboard) {
  showView('scorecard');

  // Reset context rail to Hub mode
  document.getElementById('rail-exam-widget').style.display = 'none';
  document.getElementById('rail-challenge-widget').style.display = 'block';

  document.getElementById('scorecard-net-marks').textContent = `+${parseFloat(score).toFixed(2)}`;
  const accuracy = total > 0 ? Math.round((correct / (correct + incorrect || 1)) * 100) : 0;
  document.getElementById('score-accuracy').textContent = `${accuracy}%`;
  document.getElementById('score-correct').textContent = correct.toString();
  document.getElementById('score-incorrect').textContent = incorrect.toString();
  document.getElementById('score-time').textContent = `${state.activeQuiz.timeTakenSeconds}s`;

  const lbCard = document.getElementById('challenge-leaderboard-card');
  if (leaderboard && leaderboard.length > 0) {
    lbCard.style.display = 'block';
    const tbody = document.getElementById('leaderboard-tbody');
    tbody.innerHTML = '';
    leaderboard.forEach(entry => {
      const tr = document.createElement('tr');
      const medal = entry.rank === 1 ? '🥇 ' : entry.rank === 2 ? '🥈 ' : entry.rank === 3 ? '🥉 ' : `#${entry.rank} `;
      tr.innerHTML = `
        <td><strong>${medal}</strong></td>
        <td><strong>${entry.user_name}</strong></td>
        <td>${entry.user_mobile}</td>
        <td style="color:var(--brand-blue); font-weight:800;">+${parseFloat(entry.score).toFixed(2)}</td>
        <td>${entry.correct_count} / ${entry.correct_count + entry.incorrect_count + entry.skipped_count}</td>
        <td>${entry.time_taken_seconds}s</td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    lbCard.style.display = 'none';
  }
}

// ============================================================================
// 6. FRIEND ONLINE CHALLENGES (MULTIPLAYER ENGINE)
// ============================================================================

function openCreateChallengeModal() {
  openModal('modal-create-challenge');
}

function openJoinChallengeModal() {
  openModal('modal-join-challenge');
}

let challengeModalSelectedCount = 10;
function setChallengeModalCount(cnt, btn) {
  challengeModalSelectedCount = cnt;
  document.querySelectorAll('#modal-create-challenge .volume-pill').forEach(b => b.classList.remove('selected'));
  if (btn) btn.classList.add('selected');
}

async function submitCreateChallenge() {
  const name = document.getElementById('modal-creator-name').value.trim() || 'अभ्यर्थी';
  state.userName = name;
  localStorage.setItem('rpsc_user_name', name);

  if (!state.activeSubtopic) {
    alert('कृपया पहले एक सब-टॉपिक चुनें।');
    return;
  }

  try {
    const payload = {
      creatorName: name,
      creatorMobile: state.userMobile,
      minuteTopicId: state.activeSubtopic.minute_topic_id,
      count: challengeModalSelectedCount,
      difficulty: state.difficulty || 'ALL',
      language: state.language || 'HI',
      topicName: state.activeSubtopic.minute_topic_name,
      questionFormat: state.selectedFormat || 'ALL'
    };

    const res = await fetch(`${API_BASE_URL}/quiz/challenge/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-mobile': state.userMobile
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Failed to create challenge');
    const data = await res.json();
    state.pendingChallengeCode = data.challenge.room_code;

    closeModal('modal-create-challenge');
    document.getElementById('modal-share-code-text').textContent = data.challenge.room_code;
    openModal('modal-challenge-share');
  } catch (err) {
    alert('चुनौती बनाने में त्रुटि: ' + err.message);
  }
}

function shareChallengeToWhatsApp() {
  const code = state.pendingChallengeCode || 'RAS-XXXX';
  const topicName = state.activeSubtopic?.minute_topic_name || 'RPSC RAS Practice';
  const text = `⚔️ *RPSC RAS टेस्ट चुनौती!* ⚔️\n\nमैंने '${topicName}' पर ${challengeModalSelectedCount} प्रश्नों का ऑनलाइन टेस्ट बनाया है।\nक्या आप मुझे हरा सकते हैं?\n\n👉 रूम कोड: *${code}*\nवेबसाइट खोलें और कोड दर्ज करके टेस्ट दें!\nhttps://rpsc-ras-backend.onrender.com/`;

  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

async function startHostChallengeAttempt() {
  closeModal('modal-challenge-share');
  if (state.pendingChallengeCode) {
    await joinChallengeByRoomCode(state.pendingChallengeCode, state.userName);
  }
}

function joinFromRailInput() {
  const code = document.getElementById('rail-room-code-input').value.trim().toUpperCase();
  if (!code || code.length < 5) {
    alert('कृपया सही 6-अक्षरों का कोड दर्ज करें (जैसे: RAS-7634)');
    return;
  }
  joinChallengeByRoomCode(code, state.userName);
}

async function submitJoinChallenge() {
  const code = document.getElementById('modal-join-code-input').value.trim().toUpperCase();
  const name = document.getElementById('modal-join-name-input').value.trim() || 'अभ्यर्थी';
  if (!code) {
    alert('कृपया रूम कोड दर्ज करें।');
    return;
  }
  state.userName = name;
  localStorage.setItem('rpsc_user_name', name);
  closeModal('modal-join-challenge');
  await joinChallengeByRoomCode(code, name);
}

async function joinChallengeByRoomCode(roomCode, candidateName) {
  try {
    const res = await fetch(`${API_BASE_URL}/quiz/challenge/${roomCode}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Challenge not found');
    }

    const data = await res.json();
    const questions = data.questions || [];
    if (questions.length === 0) throw new Error('No questions found in this challenge');

    startQuizSession(questions, 'EXAM', true, roomCode);
  } catch (err) {
    alert('टेस्ट से जुड़ने में त्रुटि: ' + err.message);
  }
}

function shareScorecardOnWhatsApp() {
  const netMarks = document.getElementById('scorecard-net-marks').textContent;
  const text = `🏆 *RPSC RAS टेस्ट परिणाम* 🏆\n\nमैंने ऑनलाइन टेस्ट में *${netMarks} अंक* प्राप्त किए हैं!\nक्या आप मेरी रैंक को चुनौती दे सकते हैं?\n👉 रूम कोड: *${state.activeQuiz.challengeRoomCode || 'RAS'}*\nhttps://rpsc-ras-backend.onrender.com/`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

// ============================================================================
// 7. KEYBOARD SHORTCUTS & SEARCH
// ============================================================================

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // If in modal or typing in input, ignore
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // In Exam view
    const examView = document.getElementById('view-exam');
    if (examView && examView.classList.contains('active')) {
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        selectOptionChoice(e.key);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        navigateQuestion(1);
      } else if (e.key === 'ArrowLeft') {
        navigateQuestion(-1);
      } else if (e.key.toLowerCase() === 'r') {
        toggleMarkForReview();
      }
    }
  });
}

function setupSearchInput() {
  const input = document.getElementById('top-search-input');
  const dropdown = document.getElementById('top-search-dropdown');
  if (!input || !dropdown) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      dropdown.classList.remove('active');
      return;
    }

    let results = [];
    state.syllabus.forEach(sub => {
      if (sub.units) {
        sub.units.forEach(u => {
          if (u.topics) {
            u.topics.forEach(t => {
              if (t.topic_name.toLowerCase().includes(q)) {
                results.push({ subject: sub, topic: t });
              }
            });
          }
        });
      }
    });

    if (results.length > 0) {
      dropdown.innerHTML = results.slice(0, 6).map(r => `
        <div class="search-dropdown-item" onclick="jumpToSearchResult(${r.subject.subject_id}, ${r.topic.topic_id})">
          <strong>${r.topic.topic_name}</strong>
          <div style="font-size:11px; color:var(--text-muted);">${r.subject.subject_name}</div>
        </div>
      `).join('');
      dropdown.classList.add('active');
    } else {
      dropdown.innerHTML = '<div style="padding:10px; font-size:12px; color:var(--text-muted);">कोई परिणाम नहीं मिला।</div>';
      dropdown.classList.add('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

function jumpToSearchResult(subjectId, topicId) {
  document.getElementById('top-search-dropdown').classList.remove('active');
  selectSubject(subjectId);
  const subject = state.syllabus.find(s => s.subject_id === subjectId);
  if (subject && subject.units) {
    for (const u of subject.units) {
      const t = u.topics?.find(x => x.topic_id === topicId);
      if (t) {
        selectTopic(t);
        break;
      }
    }
  }
}

// ============================================================================
// 8. OTHER VIEWS (MAINS, PYQ, DASHBOARD, MODALS)
// ============================================================================

function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function loadDashboardOverview() {
  document.querySelectorAll('.sidebar-nav-item').forEach(el => el.classList.remove('active'));
  const dashItem = document.getElementById('nav-item-dashboard');
  if (dashItem) dashItem.classList.add('active');

  showView('hub');
  if (state.syllabus.length > 0) {
    selectSubject(state.syllabus[0].subject_id);
  }
}

function openFullMockDrill() {
  alert('संपूर्ण 150 प्रश्नों का 3-घंटे का फुल मॉक टेस्ट सिमुलेशन प्रारंभ हो रहा है...');
  launchActiveQuiz('EXAM');
}

function openPyqArchive() {
  showView('pyq');
}

function launchPyqExam(year) {
  alert(`RPSC RAS ${year} प्रारंभिक परीक्षा प्रश्न-पत्र लोड हो रहा है...`);
  launchActiveQuiz('EXAM');
}

function openMainsPortal() {
  showView('mains');
  const container = document.getElementById('mains-questions-container');
  container.innerHTML = `
    <div style="background:var(--bg-surface-subtle); padding:16px; border-radius:8px; margin-bottom:14px;">
      <div style="font-weight:800; margin-bottom:4px;">प्रश्न (5 अंक • 50 शब्द):</div>
      <p style="margin-bottom:12px;">'राजस्थान में जल संरक्षण की परंपरागत पद्धतियों' (टांका, बावड़ी, जोहड़) के महत्व का संक्षिप्त मूल्यांकन कीजिए।</p>
      <textarea style="width:100%; height:120px; border-radius:6px; border:1px solid var(--border-medium); padding:10px; font-family:var(--font-sans);" placeholder="यहाँ अपना उत्तर लिखें..."></textarea>
      <div style="display:flex; justify-content:space-between; margin-top:8px;">
        <span style="font-size:12px; color:var(--text-muted);">शब्द गणना: 0 / 50</span>
        <button class="btn-cta btn-cta-primary" style="padding:6px 12px; font-size:12px;" onclick="alert('मॉडल उत्तर:\n1. टांका: थार में वर्षा जल संचयन हेतु पक्का भूमिगत कुंड।\n2. बावड़ी: सीढ़ीदार कुआं जो पेयजल के साथ सामाजिक स्थल भी रहा।\n3. जोहड़: शेखावाटी में कच्चे मिट्टी के बांध जो भूजल पुनर्भरण करते हैं।\nनिष्कर्ष: ये पद्धतियां मरुस्थलीय पारिस्थितिकी में जल आत्मनिर्भरता का आधार हैं।')">मॉडल उत्तर देखें</button>
      </div>
    </div>
  `;
}

function openAnalyticsView() {
  showView('scorecard');
}

function openCmsView() {
  alert('प्रश्न समीक्षा (CMS) मॉड्यूल सक्रिय है।');
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

function toggleSpeechNarration() {
  if (!state.speechSynth) {
    alert('इस ब्राउज़र में वाक् संश्लेषण (Speech Synthesis) समर्थित नहीं है।');
    return;
  }

  if (state.isSpeaking) {
    state.speechSynth.cancel();
    state.isSpeaking = false;
    document.getElementById('speech-btn-text').textContent = 'बोलकर पढ़ें (Read)';
  } else {
    const qText = document.getElementById('exam-q-text').textContent;
    const utterance = new SpeechSynthesisUtterance(qText);
    utterance.lang = state.language === 'HI' ? 'hi-IN' : 'en-US';
    utterance.onend = () => {
      state.isSpeaking = false;
      document.getElementById('speech-btn-text').textContent = 'बोलकर पढ़ें (Read)';
    };
    state.speechSynth.speak(utterance);
    state.isSpeaking = true;
    document.getElementById('speech-btn-text').textContent = 'रोकें (Pause)';
  }
}
