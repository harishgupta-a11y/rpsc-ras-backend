/**
 * ============================================================================
 * RPSC RAS Web Portal — Sleek Sidebar & Minimalist Client Engine (app.js)
 * ============================================================================
 */

const API_BASE_URL = (window.location.origin && window.location.origin.includes('localhost:5000'))
  ? 'http://localhost:5000/api'
  : 'https://rpsc-ras-backend.onrender.com/api';

console.log('[RPSC RAS Portal] Connected to API:', API_BASE_URL);

// State
const state = {
  language: 'HI', // 'HI' or 'EN'
  currentTab: 'geography', // 'overview', 'geography', 'history', 'polity', 'mock', 'pyq', 'analytics', 'cms'
  selectedSubtopicId: 2254, // 2254 for HI, 2253 for EN
  selectedFormat: 'ALL',
  sessionType: 'PRACTICE', // 'PRACTICE' or 'EXAM'
  
  questions: [],
  currentIndex: 0,
  userResponses: {},
  
  timerSeconds: 45 * 60,
  timerInterval: null,
  isSpeaking: false
};

document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  setupGlobalSearch();
});

// ============================================================================
// LANGUAGE MANAGEMENT
// ============================================================================

function initLanguage() {
  const saved = localStorage.getItem('rpsc_lang_pref');
  if (saved && (saved === 'HI' || saved === 'EN')) {
    state.language = saved;
  }
  updateLanguageUI();
}

function toggleLanguage() {
  state.language = state.language === 'HI' ? 'EN' : 'HI';
  localStorage.setItem('rpsc_lang_pref', state.language);
  
  if (state.currentTab === 'geography') {
    state.selectedSubtopicId = state.language === 'HI' ? 2254 : 2253;
  }
  
  updateLanguageUI();
}

function updateLanguageUI() {
  const isHi = state.language === 'HI';

  // Sidebar indicators
  document.getElementById('sidebar-lang-flag').textContent = isHi ? '🇮🇳' : '🇺🇸';
  document.getElementById('sidebar-lang-text').textContent = isHi ? 'हिन्दी (Hindi)' : 'English (US)';
  document.getElementById('sidebar-badge-text').textContent = isHi ? '✓ 100% प्रामाणिक' : '✓ 100% Verified';

  // Translate all elements with data-en and data-hi
  document.querySelectorAll('[data-en][data-hi]').forEach(el => {
    el.textContent = isHi ? el.getAttribute('data-hi') : el.getAttribute('data-en');
  });

  // Breadcrumb
  document.getElementById('header-breadcrumb-title').textContent = isHi ? 'राजस्थान का भूगोल' : 'Rajasthan Geography';

  // Re-render current question if active
  if (state.questions && state.questions.length > 0) {
    renderCurrentQ();
  }
}

// ============================================================================
// SIDEBAR TABS & NAVIGATION
// ============================================================================

function switchSidebarTab(tabName) {
  state.currentTab = tabName;

  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.classList.remove('active');
  });
  const activeItem = document.getElementById(`nav-item-${tabName}`);
  if (activeItem) activeItem.classList.add('active');

  const isHi = state.language === 'HI';

  if (tabName === 'geography') {
    state.selectedSubtopicId = isHi ? 2254 : 2253;
    document.getElementById('subject-main-title').textContent = isHi ? 'राजस्थान का भूगोल (Rajasthan Geography)' : 'Geography of Rajasthan';
    document.getElementById('header-breadcrumb-title').textContent = isHi ? 'राजस्थान का भूगोल' : 'Rajasthan Geography';
    showView('hub');
  } else if (tabName === 'history') {
    document.getElementById('subject-main-title').textContent = isHi ? 'राजस्थान का इतिहास एवं कला-संस्कृति' : 'History & Culture of Rajasthan';
    document.getElementById('header-breadcrumb-title').textContent = isHi ? 'इतिहास एवं संस्कृति' : 'History & Culture';
    showView('hub');
  } else if (tabName === 'polity') {
    document.getElementById('subject-main-title').textContent = isHi ? 'राजस्थान की प्रशासनिक व्यवस्था' : 'Polity & Administration';
    document.getElementById('header-breadcrumb-title').textContent = isHi ? 'प्रशासनिक व्यवस्था' : 'Polity';
    showView('hub');
  } else if (tabName === 'mock') {
    document.getElementById('subject-main-title').textContent = isHi ? 'संपूर्ण पाठ्यक्रम मॉक टेस्ट (150 प्रश्न)' : 'Complete Syllabus Mock Drill (150 Q)';
    document.getElementById('header-breadcrumb-title').textContent = isHi ? 'मॉक टेस्ट' : 'Full Mock Test';
    showView('hub');
  } else if (tabName === 'pyq') {
    document.getElementById('subject-main-title').textContent = isHi ? 'विगत वर्ष प्रश्न-पत्र (PYQs 2013-2023)' : 'Previous Year Papers (PYQ 2013-2023)';
    document.getElementById('header-breadcrumb-title').textContent = 'PYQ Papers';
    showView('hub');
  } else if (tabName === 'analytics') {
    document.getElementById('header-breadcrumb-title').textContent = 'Analytics';
    showView('scorecard');
  } else if (tabName === 'cms') {
    document.getElementById('header-breadcrumb-title').textContent = 'Question CMS';
    showView('cms');
    fetchCmsData();
  } else {
    showView('hub');
  }
}

function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function selectChapter(subtopicId, el) {
  state.selectedSubtopicId = subtopicId;
  document.querySelectorAll('.chapter-item').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

function setFormatFilter(format, chipEl) {
  state.selectedFormat = format;
  document.querySelectorAll('.format-chip').forEach(c => c.classList.remove('selected'));
  if (chipEl) chipEl.classList.add('selected');
}

// ============================================================================
// QUESTION SESSION LAUNCHER
// ============================================================================

async function launchSession(sessionType) {
  state.sessionType = sessionType; // 'PRACTICE' or 'EXAM'

  const btn = document.querySelector(sessionType === 'PRACTICE' ? '.btn-cta-practice' : '.btn-cta-exam');
  const oldText = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '⏳ Loading...';

  try {
    const subtopicId = state.selectedSubtopicId || (state.language === 'HI' ? 2254 : 2253);

    const payload = {
      userId: 1,
      minuteTopicId: subtopicId,
      count: 35,
      language: state.language,
      questionFormat: state.selectedFormat || 'ALL'
    };

    console.log('[RPSC RAS] Fetching questions:', payload);

    const res = await fetch(`${API_BASE_URL}/quiz/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-mobile': '9876543210'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        state.questions = data.questions;
        initCbtRoom();
        return;
      }
    }

    loadGoldenFallback();
    initCbtRoom();

  } catch (e) {
    console.error('Failed to load questions, using golden fallback:', e);
    loadGoldenFallback();
    initCbtRoom();
  } finally {
    if (btn) btn.innerHTML = oldText;
  }
}

function loadGoldenFallback() {
  const isHi = state.language === 'HI';
  state.questions = [
    {
      question_id: 1,
      question_text: isHi
        ? "राजस्थान की अक्षांशीय और देशान्तरीय स्थिति के संबंध में वैश्विक, राष्ट्रीय और महाद्वीपीय आधार पर सही दिशा-क्रम क्या है?"
        : "What is the correct sequence of directions for the location of Rajasthan in the global, national, and continental contexts respectively?",
      option_a: isHi ? "उत्तर-पूर्व, उत्तर-पश्चिम, दक्षिण-पश्चिम" : "North-East, North-West, South-West",
      option_b: isHi ? "उत्तर-पूर्व, दक्षिण-पश्चिम, उत्तर-पश्चिम" : "North-East, South-West, North-West",
      option_c: isHi ? "उत्तर-पश्चिम, उत्तर-पूर्व, दक्षिण-पश्चिम" : "North-West, North-East, South-West",
      option_d: isHi ? "दक्षिण-पश्चिम, उत्तर-पश्चिम, उत्तर-पूर्व" : "South-West, North-West, North-East",
      correct_option: "1",
      detailed_explanation: isHi
        ? "• वैश्विक आधार पर राजस्थान उत्तर-पूर्वी गोलार्ध में स्थित है।\n• राष्ट्रीय आधार पर यह भारत के उत्तर-पश्चिम भाग में स्थित है।\n• महाद्वीपीय आधार पर एशिया महाद्वीप में इसकी स्थिति दक्षिण-पश्चिम है।"
        : "• Globally, Rajasthan is situated in the North-Eastern Hemisphere.\n• Nationally, it is located in the North-Western part of India.\n• Continentally, its position within Asia is South-West."
    },
    {
      question_id: 2,
      question_text: isHi
        ? "राजस्थान के उत्तर-से-दक्षिण लंबाई (826 किमी) और पूर्व-से-पश्चिम चौड़ाई (869 किमी) के बीच का कुल अंतर कितना है?"
        : "What is the net difference between the total north-to-south length (826 km) and east-to-west width (869 km) of Rajasthan?",
      option_a: isHi ? "43 किलोमीटर" : "43 Kilometers",
      option_b: isHi ? "53 किलोमीटर" : "53 Kilometers",
      option_c: isHi ? "63 किलोमीटर" : "63 Kilometers",
      option_d: isHi ? "33 किलोमीटर" : "33 Kilometers",
      correct_option: "1",
      detailed_explanation: isHi
        ? "• पूर्व-पश्चिम चौड़ाई: 869 किमी\n• उत्तर-दक्षिण लंबाई: 826 किमी\n• अंतर: 869 - 826 = 43 किमी।"
        : "• East-West width: 869 km\n• North-South length: 826 km\n• Difference: 869 - 826 = 43 km."
    },
    {
      question_id: 3,
      question_text: isHi
        ? "कर्क रेखा (23° 30' उत्तरी अक्षांश) राजस्थान के किन जिलों से होकर गुजरती है तथा राज्य में इसकी कुल अनुमानित लंबाई कितनी है?"
        : "Through which districts does the Tropic of Cancer (23° 30' N) pass, and what is its length in Rajasthan?",
      option_a: isHi ? "बांसवाड़ा एवं डूंगरपुर (लगभग 26 किमी)" : "Banswara and Dungarpur (~26 km)",
      option_b: isHi ? "उदयपुर एवं चित्तौड़गढ़ (लगभग 36 किमी)" : "Udaipur and Chittorgarh (~36 km)",
      option_c: isHi ? "प्रतापगढ़ एवं झालावाड़ (लगभग 46 किमी)" : "Pratapgarh and Jhalawar (~46 km)",
      option_d: isHi ? "बाड़मेर एवं जालोर (लगभग 16 किमी)" : "Barmer and Jalore (~16 km)",
      correct_option: "1",
      detailed_explanation: isHi
        ? "• कर्क रेखा बांसवाड़ा के कुशलगढ़ तथा डूंगरपुर के चीखली गांव से गुजरती है।\n• राजस्थान में इसकी लंबाई लगभग 26 किमी है।"
        : "• Tropic of Cancer passes through Kushalgarh (Banswara) and Chikhli (Dungarpur).\n• Length in Rajasthan is ~26 km."
    }
  ];
}

// ============================================================================
// CBT EXAM ENGINE
// ============================================================================

function initCbtRoom() {
  state.currentIndex = 0;
  state.userResponses = {};
  state.timerSeconds = state.sessionType === 'EXAM' ? 45 * 60 : 0;

  startTimer();
  showView('cbt');
  renderPalette();
  renderCurrentQ();
}

function startTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);

  const clockEl = document.getElementById('cbt-clock-val');
  if (!clockEl) return;

  if (state.sessionType === 'PRACTICE') {
    clockEl.textContent = 'Practice';
    clockEl.classList.remove('warning');
    return;
  }

  updateClock();
  state.timerInterval = setInterval(() => {
    state.timerSeconds--;
    updateClock();

    if (state.timerSeconds <= 0) {
      clearInterval(state.timerInterval);
      alert(state.language === 'HI' ? 'समय समाप्त! आपका टेस्ट जमा किया जा रहा है।' : 'Time expired! Test submitting.');
      submitExam();
    }
  }, 1000);
}

function updateClock() {
  const clockEl = document.getElementById('cbt-clock-val');
  if (!clockEl) return;

  const h = Math.floor(state.timerSeconds / 3600);
  const m = Math.floor((state.timerSeconds % 3600) / 60);
  const s = state.timerSeconds % 60;

  clockEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  if (state.timerSeconds <= 300) {
    clockEl.classList.add('warning');
  } else {
    clockEl.classList.remove('warning');
  }
}

function renderCurrentQ() {
  const q = state.questions[state.currentIndex];
  if (!q) return;

  const isHi = state.language === 'HI';

  // Title
  document.getElementById('cbt-q-title').textContent = isHi 
    ? `प्रश्न ${state.currentIndex + 1} / ${state.questions.length}` 
    : `Question ${state.currentIndex + 1} of ${state.questions.length}`;

  // Smart Badges
  const badgesBox = document.getElementById('cbt-smart-badges');
  badgesBox.innerHTML = '';
  const textLower = (q.question_text || '').toLowerCase();

  if (textLower.includes('सुमेलित नहीं') || textLower.includes('not correctly matched') || textLower.includes('असत्य') || textLower.includes('false')) {
    badgesBox.innerHTML += `
      <div class="cbt-smart-badge trap">
        <span>⚠️</span>
        <span>${isHi ? 'सावधान (TRAP ALERT): असत्य / सुमेलित नहीं कथन छांटिए!' : 'TRAP ALERT: Identify the FALSE or NOT correctly matched option!'}</span>
      </div>
    `;
  }

  if (textLower.includes('कालक्रम') || textLower.includes('chronological') || textLower.includes('प्राचीनतम से नवीनतम') || textLower.includes('oldest to newest')) {
    badgesBox.innerHTML += `
      <div class="cbt-smart-badge chronology">
        <span>⏱️</span>
        <span>${isHi ? 'कालक्रमानुसार: सही समय / निर्माण क्रम में व्यवस्थित करें!' : 'CHRONOLOGY: Arrange in correct chronological order!'}</span>
      </div>
    `;
  }

  // Question Text & Match Table
  const bodyEl = document.getElementById('cbt-q-body');
  const tableBox = document.getElementById('cbt-match-table');
  tableBox.innerHTML = '';

  if (q.question_text && q.question_text.includes('|') && (q.question_text.includes('सूची') || q.question_text.includes('List'))) {
    renderMatchTable(q.question_text, bodyEl, tableBox);
  } else {
    bodyEl.innerHTML = q.question_text.replace(/\n/g, '<br>');
  }

  // Render 5 Options
  renderOptionsStack(q);

  // Update Palette & Drawer
  updatePaletteStates();
  renderSolutionDrawer(q);
}

function renderMatchTable(raw, bodyEl, tableBox) {
  const lines = raw.split('\n');
  let pre = [];
  let tLines = [];
  let isT = false;

  lines.forEach(l => {
    if (l.trim().startsWith('|')) {
      isT = true;
      tLines.push(l);
    } else if (isT) {
      // post
    } else {
      pre.push(l);
    }
  });

  bodyEl.innerHTML = pre.join('<br>');

  if (tLines.length >= 2) {
    let html = '<div class="match-table-box"><table class="rpsc-table">';
    const ths = tLines[0].split('|').map(c => c.trim()).filter(Boolean);
    html += `<thead><tr>${ths.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;

    for (let i = 2; i < tLines.length; i++) {
      const tds = tLines[i].split('|').map(c => c.trim()).filter(Boolean);
      if (tds.length) html += `<tr>${tds.map(d => `<td>${d}</td>`).join('')}</tr>`;
    }
    html += '</tbody></table></div>';
    tableBox.innerHTML = html;
  }
}

function renderOptionsStack(q) {
  const container = document.getElementById('cbt-options-stack');
  if (!container) return;

  const resp = state.userResponses[state.currentIndex] || {};
  const selected = resp.option;
  const isPractice = state.sessionType === 'PRACTICE';
  const isHi = state.language === 'HI';

  let correctOpt = '1';
  if (q.correct_option) {
    const c = q.correct_option.toString().toUpperCase().trim();
    if (c === 'A' || c === '1') correctOpt = '1';
    else if (c === 'B' || c === '2') correctOpt = '2';
    else if (c === 'C' || c === '3') correctOpt = '3';
    else if (c === 'D' || c === '4') correctOpt = '4';
    else if (c === 'E' || c === '5') correctOpt = '5';
  }

  const items = [
    { num: '1', text: q.option_a },
    { num: '2', text: q.option_b },
    { num: '3', text: q.option_c },
    { num: '4', text: q.option_d }
  ];

  let html = items.map(opt => {
    let classes = ['option-pill'];
    const isThisSelected = selected === opt.num;

    if (isPractice && selected) {
      if (opt.num === correctOpt) classes.push('correct');
      else if (isThisSelected && selected !== correctOpt) classes.push('incorrect');
    } else if (isThisSelected) {
      classes.push('selected');
    }

    let optContent = formatOptText(opt.text);

    return `
      <div class="${classes.join(' ')}" onclick="selectOpt('${opt.num}')">
        <div class="opt-circle">${opt.num}</div>
        <div class="opt-text">${optContent}</div>
      </div>
    `;
  }).join('');

  // Option 5
  let opt5Classes = ['option-pill', 'opt-5'];
  if (selected === '5') opt5Classes.push('selected');

  const opt5Label = isHi 
    ? "अनुत्तरित प्रश्न (Question not attempted)" 
    : "Question not attempted (अनुत्तरित प्रश्न)";

  html += `
    <div class="${opt5Classes.join(' ')}" onclick="selectOpt('5')">
      <div class="opt-circle">5</div>
      <div class="opt-text" style="color: var(--amber); font-weight: 700;">
        ⚪ ${opt5Label} <span style="font-size: 11px; font-weight: 500; margin-left: 6px;">[0.00 अंक]</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function formatOptText(str) {
  if (!str) return '';

  // Check 4-column matrix: A-IV, B-II, C-I, D-III
  const regex = /([A-D])-([IVXivx\d]+)/g;
  const m = [...str.matchAll(regex)];
  if (m.length === 4) {
    return `
      <table class="opt-matrix-table">
        <thead><tr><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead>
        <tbody><tr><td>${m[0][2]}</td><td>${m[1][2]}</td><td>${m[2][2]}</td><td>${m[3][2]}</td></tr></tbody>
      </table>
    `;
  }

  return str.replace(/\n/g, '<br>');
}

function selectOpt(optNum) {
  const current = state.userResponses[state.currentIndex] || {};
  current.option = optNum;
  current.isAnswered = true;
  state.userResponses[state.currentIndex] = current;

  renderOptionsStack(state.questions[state.currentIndex]);
  updatePaletteStates();

  if (state.sessionType === 'PRACTICE') {
    const drawer = document.getElementById('cbt-solution-drawer');
    if (drawer) drawer.style.display = 'block';
  }
}

function clearOption() {
  const current = state.userResponses[state.currentIndex] || {};
  delete current.option;
  current.isAnswered = false;
  state.userResponses[state.currentIndex] = current;

  renderOptionsStack(state.questions[state.currentIndex]);
  updatePaletteStates();

  const drawer = document.getElementById('cbt-solution-drawer');
  if (drawer) drawer.style.display = 'none';
}

function toggleReview() {
  const current = state.userResponses[state.currentIndex] || {};
  current.isReview = !current.isReview;
  state.userResponses[state.currentIndex] = current;

  updatePaletteStates();
  navigateQ(1);
}

function navigateQ(delta) {
  const next = state.currentIndex + delta;
  if (next >= 0 && next < state.questions.length) {
    state.currentIndex = next;
    renderCurrentQ();
  }
}

function jumpQ(idx) {
  if (idx >= 0 && idx < state.questions.length) {
    state.currentIndex = idx;
    renderCurrentQ();
  }
}

function renderPalette() {
  const grid = document.getElementById('cbt-palette-grid-btns');
  if (!grid) return;

  grid.innerHTML = state.questions.map((q, idx) => {
    return `<button class="pal-btn" id="p-btn-${idx}" onclick="jumpQ(${idx})">${idx + 1}</button>`;
  }).join('');

  updatePaletteStates();
}

function updatePaletteStates() {
  let att = 0;
  let skip = 0;
  let rev = 0;
  let left = 0;

  state.questions.forEach((q, idx) => {
    const btn = document.getElementById(`p-btn-${idx}`);
    if (!btn) return;

    btn.className = 'pal-btn';
    if (idx === state.currentIndex) btn.classList.add('active');

    const resp = state.userResponses[idx];
    if (resp && resp.isReview) {
      btn.classList.add('review');
      rev++;
    } else if (resp && resp.option === '5') {
      btn.classList.add('skipped');
      skip++;
    } else if (resp && resp.option) {
      btn.classList.add('attempted');
      att++;
    } else {
      left++;
    }
  });

  document.getElementById('leg-att').textContent = `${att} Attempted`;
  document.getElementById('leg-skip').textContent = `${skip} Option 5`;
  document.getElementById('leg-rev').textContent = `${rev} Review`;
  document.getElementById('leg-unatt').textContent = `${left} Left`;
  document.getElementById('cbt-palette-counter').textContent = `${att + skip}/${state.questions.length}`;
}

function renderSolutionDrawer(q) {
  const drawer = document.getElementById('cbt-solution-drawer');
  const textEl = document.getElementById('cbt-solution-text');
  if (!drawer || !textEl) return;

  const resp = state.userResponses[state.currentIndex];
  if (state.sessionType === 'PRACTICE' && resp && resp.option) {
    drawer.style.display = 'block';
    const lines = (q.detailed_explanation || 'Verified fact from Rajasthan Government Board archives.').split('\n').map(l => l.trim()).filter(Boolean);
    textEl.innerHTML = `<ul>${lines.map(l => `<li>${l.replace(/^[\*\•\-]\s*/, '')}</li>`).join('')}</ul>`;
  } else {
    drawer.style.display = 'none';
  }
}

function speakQuestion() {
  if (!('speechSynthesis' in window)) return;
  if (state.isSpeaking) {
    window.speechSynthesis.cancel();
    state.isSpeaking = false;
    return;
  }

  const q = state.questions[state.currentIndex];
  if (!q) return;

  const text = `${q.question_text}. 1: ${q.option_a}. 2: ${q.option_b}. 3: ${q.option_c}. 4: ${q.option_d}.`;
  const ut = new SpeechSynthesisUtterance(text);
  ut.lang = state.language === 'HI' ? 'hi-IN' : 'en-US';
  ut.rate = 0.95;

  ut.onend = () => { state.isSpeaking = false; };
  ut.onerror = () => { state.isSpeaking = false; };

  state.isSpeaking = true;
  window.speechSynthesis.speak(ut);
}

// ============================================================================
// SUBMIT & SCORECARD (OFFICIAL RPSC FORMULA: +1.33 / -0.44 / 0.00)
// ============================================================================

function confirmSubmit() {
  let att = 0;
  let skip = 0;
  for (let i = 0; i < state.questions.length; i++) {
    const r = state.userResponses[i];
    if (r && r.option === '5') skip++;
    else if (r && r.option) att++;
  }

  const un = state.questions.length - (att + skip);
  const msg = state.language === 'HI'
    ? `क्या आप टेस्ट जमा करना चाहते हैं?\n\n• हल किए गए: ${att}\n• Option 5 (अनुत्तरित): ${skip}\n• खाली छूटे हुए: ${un}`
    : `Submit test?\n\n• Attempted: ${att}\n• Option 5: ${skip}\n• Unanswered: ${un}`;

  if (confirm(msg)) {
    submitExam();
  }
}

function submitExam() {
  if (state.timerInterval) clearInterval(state.timerInterval);

  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  let blank = 0;

  const details = state.questions.map((q, idx) => {
    const r = state.userResponses[idx] || {};
    const sel = r.option;

    let cOpt = '1';
    if (q.correct_option) {
      const c = q.correct_option.toString().toUpperCase().trim();
      if (c === 'A' || c === '1') cOpt = '1';
      else if (c === 'B' || c === '2') cOpt = '2';
      else if (c === 'C' || c === '3') cOpt = '3';
      else if (c === 'D' || c === '4') cOpt = '4';
      else if (c === 'E' || c === '5') cOpt = '5';
    }

    let status = 'BLANK';
    if (sel === '5') {
      status = 'SKIPPED';
      skipped++;
    } else if (sel === cOpt) {
      status = 'CORRECT';
      correct++;
    } else if (sel) {
      status = 'INCORRECT';
      incorrect++;
    } else {
      blank++;
    }

    return { index: idx + 1, q, sel, cOpt, status };
  });

  // Strict RPSC RAS Prelims Marking Formula (150 Q = 200 M)
  const net = (correct * 1.33) - (incorrect * 0.44) - (blank * 0.44);

  document.getElementById('score-net-val').textContent = (net >= 0 ? '+' : '') + net.toFixed(2);
  document.getElementById('sc-tot').textContent = state.questions.length;
  document.getElementById('sc-cor').textContent = correct;
  document.getElementById('sc-inc').textContent = incorrect;
  document.getElementById('sc-skp').textContent = skipped;

  const isHi = state.language === 'HI';
  const list = document.getElementById('sc-solutions-list');
  list.innerHTML = details.map(item => {
    let color = '#71717A';
    let label = 'Blank';
    if (item.status === 'CORRECT') { color = 'var(--emerald)'; label = isHi ? 'सही (+1.33)' : 'Correct (+1.33)'; }
    else if (item.status === 'INCORRECT') { color = 'var(--rose)'; label = isHi ? 'गलत (-0.44)' : 'Incorrect (-0.44)'; }
    else if (item.status === 'SKIPPED') { color = 'var(--amber)'; label = 'Option 5 (0.00)'; }

    return `
      <div style="padding: 18px; border-radius: 12px; border: 1px solid var(--border-subtle); border-left: 4px solid ${color};">
        <div style="display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 8px;">
          <span>Q${item.index}.</span>
          <span style="color: ${color};">${label}</span>
        </div>
        <p style="font-size: 14.5px; font-weight: 600; margin-bottom: 10px;">${item.q.question_text}</p>
        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">
          <div><strong>${isHi ? 'आपका उत्तर:' : 'Your Answer:'}</strong> ${item.sel ? `Option ${item.sel}` : 'None'}</div>
          <div><strong>${isHi ? 'सही उत्तर:' : 'Correct Answer:'}</strong> Option ${item.cOpt}</div>
        </div>
        <div class="solution-box" style="margin-top: 8px;">
          <div class="solution-title">💡 ${isHi ? 'प्रामाणिक व्याख्या' : 'Authentic Explanation'}</div>
          <div class="solution-text">${item.q.detailed_explanation ? item.q.detailed_explanation.replace(/\n/g, '<br>') : 'Verified fact.'}</div>
        </div>
      </div>
    `;
  }).join('');

  showView('scorecard');
}

function relaunchCurrentTest() {
  initCbtRoom();
}

function exitExamToHub() {
  if (state.sessionType === 'EXAM') {
    if (confirm(state.language === 'HI' ? 'क्या आप टेस्ट छोड़ना चाहते हैं?' : 'Exit test?')) {
      if (state.timerInterval) clearInterval(state.timerInterval);
      showView('hub');
    }
  } else {
    showView('hub');
  }
}

// ============================================================================
// CMS REVIEWER
// ============================================================================

async function fetchCmsData() {
  const container = document.getElementById('cms-items-stack');
  const statusEl = document.getElementById('cms-count-status');
  const select = document.getElementById('cms-subtopic-select');
  const subId = select ? select.value : '2254';

  statusEl.textContent = 'Fetching questions from cloud database...';
  container.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE_URL}/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-mobile': '9876543210' },
      body: JSON.stringify({
        userId: 1,
        minuteTopicId: parseInt(subId),
        count: 50,
        language: subId === '2254' ? 'HI' : 'EN',
        questionFormat: 'ALL'
      })
    });

    if (res.ok) {
      const data = await res.json();
      const list = data.questions || [];
      statusEl.textContent = `Found ${list.length} verified questions in cloud database for Subtopic ${subId}.`;

      container.innerHTML = list.map((q, idx) => `
        <div style="padding: 16px; border: 1px solid var(--border-subtle); border-radius: 10px;">
          <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 13px; margin-bottom: 6px;">
            <span>#${idx + 1} (DB ID: ${q.question_id})</span>
            <span style="color: var(--emerald);">Correct: Option ${q.correct_option}</span>
          </div>
          <p style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">${q.question_text}</p>
          <div style="font-size: 12.5px; color: var(--text-muted);">
            (1) ${q.option_a} | (2) ${q.option_b} | (3) ${q.option_c} | (4) ${q.option_d}
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    statusEl.textContent = 'Error loading CMS: ' + e.message;
  }
}

// ============================================================================
// GLOBAL SEARCH
// ============================================================================

function setupGlobalSearch() {
  const input = document.getElementById('top-search-input');
  const dropdown = document.getElementById('top-search-dropdown');
  if (!input || !dropdown) return;

  const topics = [
    { title: 'राजस्थान की स्थिति एवं विस्तार', sub: 'Subtopic 2254 (Hindi)' },
    { title: 'Location & Extent of Rajasthan', sub: 'Subtopic 2253 (English)' },
    { title: 'अरावली पर्वतमाला एवं प्रमुख चोटियां', sub: 'Physical Features' },
    { title: 'राजस्थान का अपवाह तंत्र एवं नदियां', sub: 'Rivers & Lakes' },
    { title: 'राजस्थान की जलवायु एवं कोपेन वर्गीकरण', sub: 'Climate & Monsoon' }
  ];

  input.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (!val) {
      dropdown.classList.remove('active');
      return;
    }

    const matches = topics.filter(t => t.title.toLowerCase().includes(val) || t.sub.toLowerCase().includes(val));
    if (matches.length) {
      dropdown.innerHTML = matches.map(m => `
        <div class="dropdown-item" onclick="onTopicSelect('${m.title}')">
          <div style="font-weight: 700; font-size: 13px;">${m.title}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${m.sub}</div>
        </div>
      `).join('');
      dropdown.classList.add('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

function onTopicSelect(title) {
  const dropdown = document.getElementById('top-search-dropdown');
  if (dropdown) dropdown.classList.remove('active');
  switchSidebarTab('geography');
}
