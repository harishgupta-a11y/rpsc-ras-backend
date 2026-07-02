// RPSC RAS Exam Prep Simulator - Core Logic & State Machine
const getApiBase = () => {
  const saved = localStorage.getItem('sim_api_base_url');
  if (saved) return saved;

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  if (protocol === 'file:') {
    return "http://localhost:5000/api";
  }
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const isLocalIP = hostname.startsWith('10.') || 
                    hostname.startsWith('192.168.') || 
                    (hostname.startsWith('172.') && (parseInt(hostname.split('.')[1], 10) >= 16 && parseInt(hostname.split('.')[1], 10) <= 31));
  const isLocalDomain = hostname.endsWith('.local');

  if (isLocalHost || isLocalIP || isLocalDomain) {
    return `http://${hostname}:5000/api`;
  }
  return "https://rpsc-ras-backend.onrender.com/api";
};
const API_BASE = getApiBase();

// Global Application State
let appState = {
  userId: null,
  userMobile: null,
  isSubscribed: false,
  subscriptionExpiry: null,
  selectedTier: 'PRE', // PRE or MAINS
  currentView: 'view-paywall', // Active view id
  language: 'EN', // EN or HI
  
  // Custom Test Builder checklist / paths states
  testingPath: 'COMPLETE', // COMPLETE, SUBJECT, TOPIC
  syllabusData: [], // Mapped Subjects -> Units -> Topics from API
  selectedSubjectIds: [], // Subject-wise multi-select
  selectedTopicIds: [], // Topic-wise multi-select
  
  // Active Test Engine States
  activeQuizQuestions: [],
  currentQuestionIndex: 0,
  userAnswers: {}, // index -> chosen option ('A', 'B', 'C', 'D')
  quizTimerSeconds: 0,
  quizTimerInterval: null,
  activeQuizSubject: ""
};

// Console Log Logger Helper
function logSystem(message) {
  const consoleBox = document.getElementById('console-logs');
  if (consoleBox) {
    const timestamp = new Date().toLocaleTimeString();
    consoleBox.innerHTML += `\n[${timestamp}] ${message}`;
    consoleBox.scrollTop = consoleBox.scrollHeight;
  }
}

// Logger for Admin Portal Ingestion Logs
function logAdmin(message) {
  const adminBox = document.getElementById('admin-logs');
  if (adminBox) {
    const timestamp = new Date().toLocaleTimeString();
    adminBox.innerHTML += `\n[${timestamp}] ${message}`;
    adminBox.scrollTop = adminBox.scrollHeight;
  }
}

// 1. Navigation Flow Controller
function navigateToScreen(viewId) {
  logSystem(`Transitioning state to screen: ${viewId}`);

  // Enforce Subscription Gatekeeper on state transitions (except paywall login)
  if (viewId !== 'view-paywall' && viewId !== 'view-admin-portal') {
    if (!appState.userMobile || !appState.isSubscribed) {
      logSystem(`Gatekeeper: Navigation blocked due to inactive subscription.`);
      alert("🔒 Access Denied! Please complete subscription payment to enter this portal.");
      navigateToScreen('view-paywall');
      return;
    }
  }

  // Update views in DOM
  const views = document.querySelectorAll('.app-screen-view');
  views.forEach(v => v.classList.remove('active'));

  const activeView = document.getElementById(viewId);
  if (activeView) {
    activeView.classList.add('active');
    appState.currentView = viewId;
  }

  // Extra view initialization
  if (viewId === 'view-tier-select') {
    document.getElementById('logged-mobile-display').innerText = `Registered: +91 ${appState.userMobile}`;
    document.getElementById('logout-trigger').style.display = 'block';
    document.getElementById('admin-mode-btn').style.display = 'block';
  } else if (viewId === 'view-test-config') {
    loadTestConfigurator();
  } else if (viewId === 'view-admin-portal') {
    loadAdminPortal();
  }
}

// 2. Authentication & Subscription Simulator Functions
document.getElementById('btn-request-otp').addEventListener('click', async () => {
  const mobileInput = document.getElementById('user-mobile').value.trim();
  if (mobileInput.length < 10 || !/^\d+$/.test(mobileInput)) {
    alert("Please enter a valid 10-digit mobile number.");
    return;
  }
  
  try {
    logSystem(`Requesting OTP for mobile: ${mobileInput}...`);
    const res = await fetch(`${API_BASE}/auth/otp-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: mobileInput })
    });
    
    if (res.ok) {
      const data = await res.json();
      appState.userMobile = mobileInput;
      logSystem(`[SMS API Pipeline] OTP verification code sent: '${data.simulatedOTP}'`);
      
      document.getElementById('login-box').classList.add('hidden');
      document.getElementById('otp-box').classList.remove('hidden');
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (err) {
    logSystem(`[Error] OTP request failed: ${err.message}`);
    alert("Could not connect to the backend server. Please verify it is running on port 5000.");
  }
});

document.getElementById('change-mobile-link').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-box').classList.remove('hidden');
  document.getElementById('otp-box').classList.add('hidden');
});

document.getElementById('btn-verify-otp').addEventListener('click', async () => {
  const otpInput = document.getElementById('user-otp').value.trim();
  if (!otpInput) {
    alert("Please enter the verification code.");
    return;
  }
  
  try {
    logSystem(`Verifying OTP for ${appState.userMobile}...`);
    const res = await fetch(`${API_BASE}/auth/otp-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: appState.userMobile, otp: otpInput })
    });
    
    if (res.ok) {
      const data = await res.json();
      appState.userId = data.user.user_id;
      appState.isSubscribed = data.user.subscription_status;
      appState.subscriptionExpiry = data.user.expiry_timestamp;
      appState.hasUsedTrial = data.user.has_used_trial;
      
      logSystem(`OTP Verification Success! User ID: ${appState.userId}`);
      updateSubscriptionUI();
      alert("Verification successful!");
      populateIngestTopics();
      
      if (appState.isSubscribed) {
        navigateToScreen('view-tier-select');
      } else {
        logSystem(`System: User has no active subscription. Prompting paywall package options.`);
        document.querySelector('.plans-block').scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (err) {
    logSystem(`[Error] Verification failed: ${err.message}`);
  }
});

// Plan Selection
async function selectPlan(cost, days) {
  if (!appState.userMobile) {
    alert("Please log in first using your mobile number.");
    document.getElementById('login-box').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (days === 1 && appState.hasUsedTrial) {
    alert("Trial plan is only available once per user.");
    return;
  }

  logSystem(`Processing plan purchase: ${days} Day(s) (₹${cost} INR) for user: ${appState.userMobile}...`);
  
  try {
    const res = await fetch(`${API_BASE}/subscription/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: appState.userMobile, planId: days })
    });
    
    if (res.ok) {
      const data = await res.json();
      appState.isSubscribed = true;
      appState.subscriptionExpiry = data.expiry_timestamp;
      appState.hasUsedTrial = data.has_used_trial;
      
      updateSubscriptionUI();
      logSystem(`Payment Success! Active subscription activated for ${days} days.`);
      alert(`Payment Success! Premium features unlocked for ${days} day(s).`);
      
      navigateToScreen('view-tier-select');
    } else {
      const err = await res.json();
      alert("Purchase failed: " + err.error);
    }
  } catch (err) {
    logSystem(`[Error] Purchase request failed: ${err.message}`);
  }
}

function updateSubscriptionUI() {
  const badge = document.getElementById('sub-badge');
  const expiryText = document.getElementById('expiry-status-text');
  
  if (appState.isSubscribed && appState.subscriptionExpiry > Date.now()) {
    badge.innerText = "⭐ Premium Active";
    badge.className = "status-indicator status-active";
    
    const expiryDate = new Date(appState.subscriptionExpiry);
    expiryText.innerHTML = `<span style="color:#10B981">Valid until ${expiryDate.toLocaleDateString()} ${expiryDate.toLocaleTimeString()}</span>`;
  } else {
    badge.innerText = "🔒 Locked";
    badge.className = "status-indicator";
    expiryText.innerHTML = `<span style="color:#EF4444">No active subscription plan</span>`;
    appState.isSubscribed = false;
  }

  // Update trial card state
  const trialCard = document.getElementById('plan-card-trial');
  if (trialCard) {
    if (appState.hasUsedTrial) {
      trialCard.style.opacity = '0.4';
      trialCard.style.pointerEvents = 'none';
      const detailText = trialCard.querySelector('.plan-detail');
      if (detailText) detailText.innerText = "Trial plan already used. (One-time use only)";
    } else {
      trialCard.style.opacity = '1';
      trialCard.style.pointerEvents = 'auto';
      const detailText = trialCard.querySelector('.plan-detail');
      if (detailText) detailText.innerText = "Quick syllabus lookup and mock tests compilation.";
    }
  }
}

// Logout
document.getElementById('logout-trigger').addEventListener('click', () => {
  appState.userId = null;
  appState.userMobile = null;
  appState.isSubscribed = false;
  appState.subscriptionExpiry = null;
  appState.hasUsedTrial = false;
  updateSubscriptionUI();
  document.getElementById('login-box').classList.remove('hidden');
  document.getElementById('otp-box').classList.add('hidden');
  document.getElementById('logout-trigger').style.display = 'none';
  document.getElementById('admin-mode-btn').style.display = 'none';
  navigateToScreen('view-paywall');
});

// Control deck quick mocks
async function simulateActiveSub(active) {
  if (!appState.userMobile) {
    appState.userMobile = "9876543210";
  }
  
  // Set in backend
  try {
    const days = active ? 30 : 0;
    const res = await fetch(`${API_BASE}/subscription/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: appState.userMobile, planId: days })
    });
    
    if (res.ok) {
      if (active) {
        const data = await res.json();
        appState.isSubscribed = true;
        appState.subscriptionExpiry = data.expiry_timestamp;
        appState.userId = 1; // Default to seeded test user ID
        logSystem("Control Deck: Activated 30-Day simulated subscription and logged in test user.");
      } else {
        appState.isSubscribed = false;
        appState.subscriptionExpiry = null;
        appState.userId = null;
        logSystem("Control Deck: Subscription expired manually.");
      }
      updateSubscriptionUI();
    }
  } catch (err) {
    logSystem(`[Error] Simulation failed: ${err.message}`);
  }
}

// Toggle Admin Mode
function toggleAdminMode(enable) {
  if (enable) {
    navigateToScreen('view-admin-portal');
  } else {
    navigateToScreen('view-tier-select');
  }
}

// 3. Page 1: Tier Selection Trigger
document.getElementById('tier-pre-btn').addEventListener('click', () => {
  appState.selectedTier = 'PRE';
  navigateToScreen('view-test-config');
});

document.getElementById('tier-mains-btn').addEventListener('click', () => {
  appState.selectedTier = 'MAINS';
  navigateToScreen('view-test-config');
});

// Dynamic Terminology Polish Helper
function updateSimulatorTerminology(tier) {
  const isMains = tier === 'MAINS';
  const isHi = appState.language === 'HI';
  
  // Update tabs
  if (isHi) {
    document.getElementById('path-complete-btn').innerText = isMains ? 'संपूर्ण अभ्यास' : 'संपूर्ण टेस्ट';
    document.getElementById('path-subject-btn').innerText = isMains ? 'विषय अभ्यास' : 'विषय टेस्ट';
    document.getElementById('path-topic-btn').innerText = isMains ? 'टॉपिक अभ्यास' : 'टॉपिक टेस्ट';
    document.getElementById('path-subtopic-btn').innerText = isMains ? 'सब-टॉपिक अभ्यास' : 'सब-टॉपिक क्विज़';
    document.getElementById('path-pyq-btn').innerText = isMains ? 'PYQ अभ्यास' : 'PYQ';
  } else {
    document.getElementById('path-complete-btn').innerText = isMains ? 'Complete Practice' : 'Complete Test';
    document.getElementById('path-subject-btn').innerText = isMains ? 'Subject Practice' : 'Subject Test';
    document.getElementById('path-topic-btn').innerText = isMains ? 'Topic Practice' : 'Topic Test';
    document.getElementById('path-subtopic-btn').innerText = isMains ? 'Sub-topic Practice' : 'Sub-topic Quiz';
    document.getElementById('path-pyq-btn').innerText = isMains ? 'PYQ Practice' : 'PYQ';
  }
  
  // Update path views
  const completeTitle = document.querySelector('#path-view-complete h3');
  const completeDesc = document.querySelector('#path-view-complete p');
  if (completeTitle && completeDesc) {
    if (isHi) {
      completeTitle.innerText = isMains ? 'पूर्ण मॉडल उत्तर अभ्यास' : 'संपूर्ण मॉक टेस्ट';
      completeDesc.innerText = isMains 
        ? 'मुख्य परीक्षा के सभी विषयों के यादृच्छिक प्रश्नों को मिलाकर अभ्यास करें।' 
        : 'सक्रिय श्रेणी में सभी विषयों और टॉपिक्स से यादृच्छिक प्रश्नों को खींचकर मॉक टेस्ट तैयार करता है।';
    } else {
      completeTitle.innerText = isMains ? 'Full Model Answers Practice' : 'Full Mock Test';
      completeDesc.innerText = isMains 
        ? 'Compiles a comprehensive practice track pulling randomized descriptive questions from all subjects in the Mains tier.' 
        : 'Compiles a comprehensive mock test pulling randomized questions from all subjects and topics in the active tier.';
    }
  }
  
  const subjectTitle = document.querySelector('#path-view-subject h3');
  const subjectDesc = document.querySelector('#path-view-subject p');
  if (subjectTitle && subjectDesc) {
    if (isHi) {
      subjectTitle.innerText = isMains ? 'अभ्यास के लिए विषय चुनें' : 'विषय चुनें';
      subjectDesc.innerText = isMains 
        ? 'दीर्घ उत्तरीय मॉडल उत्तरों का अध्ययन करने के लिए एक या अधिक विषय चुनें।' 
        : 'अभ्यास टेस्ट संकलित करने के लिए एक या अधिक विषय चुनें।';
    } else {
      subjectTitle.innerText = isMains ? 'Select Subjects to Practice' : 'Select Subjects';
      subjectDesc.innerText = isMains 
        ? 'Choose one or more subjects to study descriptive model answers.' 
        : 'Choose one or more subjects to compile a practice test.';
    }
  }
  
  const topicTitle = document.querySelector('#path-view-topic h3');
  const topicDesc = document.querySelector('#path-view-topic p');
  if (topicTitle && topicDesc) {
    if (isHi) {
      topicTitle.innerText = isMains ? 'अभ्यास के लिए टॉपिक चुनें' : 'टॉपिक चुनें';
      topicDesc.innerText = isMains 
        ? 'लक्षित वर्णनात्मक अभ्यास के लिए इकाइयों में विशिष्ट टॉपिक चुनें।' 
        : 'लक्षित अभ्यास के लिए इकाइयों में विशिष्ट टॉपिक चुनें।';
    } else {
      topicTitle.innerText = isMains ? 'Select Topics to Practice' : 'Select Topics';
      topicDesc.innerText = isMains 
        ? 'Select specific topics across units for targeted descriptive practice.' 
        : 'Select specific topics across units for targeted practice.';
    }
  }

  const subtopicTitle = document.querySelector('#path-view-subtopic h3');
  const subtopicDesc = document.querySelector('#path-view-subtopic p');
  if (subtopicTitle && subtopicDesc) {
    if (isHi) {
      subtopicTitle.innerText = isMains ? 'अभ्यास के लिए सब-टॉपिक चुनें' : 'सब-टॉपिक चुनें';
      subtopicDesc.innerText = isMains 
        ? 'एक मूल विषय चुनें, फिर अभ्यास के लिए सब-टॉपिक चुनें।' 
        : 'एक मूल विषय चुनें, फिर अभ्यास के लिए सब-टॉपिक चुनें।';
    } else {
      subtopicTitle.innerText = isMains ? 'Select Sub-topic to Practice' : 'Select Sub-topic';
      subtopicDesc.innerText = isMains 
        ? 'Choose a parent topic, then select the sub-topic for descriptive revision.' 
        : 'Choose a parent topic, then select the sub-topic for mock revision.';
    }
  }

  // Update start button
  const startBtn = document.getElementById('btn-start-test');
  if (startBtn) {
    if (isHi) {
      startBtn.innerText = isMains ? 'अभ्यास सत्र शुरू करें' : 'अभ्यास टेस्ट शुरू करें';
    } else {
      startBtn.innerText = isMains ? 'Start Practice Session' : 'Start Practice Test';
    }
  }
}

// 4. Page 2: Test Configurator & Branching Logic
async function loadTestConfigurator() {
  const title = document.getElementById('config-tier-title');
  title.innerText = appState.selectedTier === 'PRE' ? 'RAS Pre Test Config' : 'RAS Mains Practice Config';

  // Apply dynamic terminology polish immediately
  updateSimulatorTerminology(appState.selectedTier);

  logSystem(`Loading syllabus hierarchy for tier ${appState.selectedTier}...`);
  
  try {
    const response = await fetch(`${API_BASE}/syllabus?tier=${appState.selectedTier}`, {
      headers: { 'x-user-mobile': appState.userMobile || '9876543210' }
    });
    
    if (response.ok) {
      const data = await response.json();
      appState.syllabusData = data.subjects;
      
      // Reset selections
      appState.selectedSubjectIds = [];
      appState.selectedTopicIds = [];
      
      // Render pathways
      renderSubjectChecklist();
      renderTopicTree();
      
      // Always show Sub-topic tab for both PRE and MAINS
      const subtopicTab = document.getElementById('path-subtopic-btn');
      if (subtopicTab) {
        subtopicTab.style.display = 'block';
      }
      
      const configParentSelect = document.getElementById('config-subtopic-parent-select');
      if (configParentSelect) {
        configParentSelect.innerHTML = "";
        appState.syllabusData.forEach(sub => {
          sub.units.forEach(unit => {
            unit.topics.forEach(t => {
              const opt = document.createElement('option');
              opt.value = t.topic_id;
              opt.innerText = `[${appState.selectedTier}] ${sub.subject_name.substring(0, 15)}... -> ${t.topic_name}`;
              configParentSelect.appendChild(opt);
            });
          });
        });
        onConfigParentTopicChange();
      }

      // Fetch PYQ papers for student dropdown
      try {
        const pyqRes = await fetch(`${API_BASE}/pyqs?tier=${appState.selectedTier}`, {
          headers: { 'x-user-mobile': appState.userMobile || '9876543210' }
        });
        if (pyqRes.ok) {
          const pyqData = await pyqRes.json();
          const configPyqSelect = document.getElementById('config-pyq-select');
          if (configPyqSelect) {
            configPyqSelect.innerHTML = '<option value="">-- Select Past Exam --</option>';
            pyqData.exams.forEach(exam => {
              const opt = document.createElement('option');
              opt.value = exam.exam_id;
              opt.innerText = `${exam.exam_name} (${exam.exam_year})`;
              configPyqSelect.appendChild(opt);
            });
          }
        }
      } catch (err) {
        console.error("Failed to load PYQs for configurator:", err);
      }

      switchTestingPath(appState.testingPath);
      populateIngestTopics();
    } else {
      const err = await response.json();
      alert("Failed to load syllabus: " + err.error);
    }
  } catch (err) {
    logSystem(`[Error] Syllabus load failed: ${err.message}`);
  }
}

function switchTestingPath(path) {
  appState.testingPath = path;
  
  // Highlight Tab
  document.querySelectorAll('.path-tab-btn').forEach(btn => btn.classList.remove('active'));
  if (path === 'COMPLETE') document.getElementById('path-complete-btn').classList.add('active');
  if (path === 'SUBJECT') document.getElementById('path-subject-btn').classList.add('active');
  if (path === 'TOPIC') document.getElementById('path-topic-btn').classList.add('active');
  if (path === 'SUBTOPIC') document.getElementById('path-subtopic-btn').classList.add('active');
  if (path === 'PYQ') document.getElementById('path-pyq-btn').classList.add('active');

  // Display View
  document.querySelectorAll('.path-view').forEach(view => view.classList.add('hidden'));
  if (path === 'COMPLETE') document.getElementById('path-view-complete').classList.remove('hidden');
  if (path === 'SUBJECT') document.getElementById('path-view-subject').classList.remove('hidden');
  if (path === 'TOPIC') document.getElementById('path-view-topic').classList.remove('hidden');
  if (path === 'SUBTOPIC') document.getElementById('path-view-subtopic').classList.remove('hidden');
  if (path === 'PYQ') document.getElementById('path-view-pyq').classList.remove('hidden');

  // Hide question volume selector for PYQ path
  const countCard = document.querySelector('.question-count-card');
  if (countCard) {
    if (path === 'PYQ') {
      countCard.classList.add('hidden');
    } else {
      countCard.classList.remove('hidden');
    }
  }
  
  logSystem(`Switched testing track to: ${path}`);
}

async function onConfigParentTopicChange() {
  const parentId = document.getElementById('config-subtopic-parent-select').value;
  const subtopicSelect = document.getElementById('config-subtopic-select');
  if (!parentId || !subtopicSelect) return;

  try {
    const res = await fetch(`${API_BASE}/minute-topics?topic_id=${parentId}`, {
      headers: { 'x-user-mobile': appState.userMobile || '9876543210' }
    });
    if (res.ok) {
      const data = await res.json();
      subtopicSelect.innerHTML = '<option value="">-- Select Sub-topic --</option>';
      data.minuteTopics.forEach(mt => {
        const opt = document.createElement('option');
        opt.value = mt.minute_topic_id;
        opt.innerText = mt.minute_topic_name;
        subtopicSelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.error("Failed to fetch subtopics in configurator:", e);
  }
}

function renderSubjectChecklist() {
  const container = document.getElementById('subject-checkbox-list');
  container.innerHTML = "";
  
  appState.syllabusData.forEach(sub => {
    const label = document.createElement('label');
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";
    label.style.fontSize = "14px";
    label.style.color = "white";
    label.style.cursor = "pointer";

    const cb = document.createElement('input');
    cb.type = "checkbox";
    cb.value = sub.subject_id;
    cb.addEventListener('change', (e) => {
      const id = parseInt(e.target.value);
      if (e.target.checked) {
        appState.selectedSubjectIds.push(id);
      } else {
        appState.selectedSubjectIds = appState.selectedSubjectIds.filter(s => s !== id);
      }
    });

    const span = document.createElement('span');
    span.innerText = sub.subject_name;

    label.appendChild(cb);
    label.appendChild(span);
    container.appendChild(label);
  });
}

function renderTopicTree() {
  const container = document.getElementById('topic-tree-list');
  container.innerHTML = "";

  appState.syllabusData.forEach(sub => {
    // Subject Wrapper
    const subBlock = document.createElement('div');
    subBlock.style.marginBottom = "10px";

    const subTitle = document.createElement('h4');
    subTitle.innerText = sub.subject_name;
    subTitle.style.fontSize = "15px";
    subTitle.style.fontWeight = "bold";
    subTitle.style.color = "var(--color-primary)";
    subTitle.style.margin = "0 0 6px 0";
    subBlock.appendChild(subTitle);

    sub.units.forEach(unit => {
      const unitBlock = document.createElement('div');
      unitBlock.style.marginLeft = "8px";
      unitBlock.style.marginBottom = "10px";

      const unitTitle = document.createElement('h5');
      unitTitle.innerText = unit.unit_name;
      unitTitle.style.fontSize = "13px";
      unitTitle.style.color = "var(--color-text-muted)";
      unitTitle.style.margin = "0 0 4px 0";
      unitBlock.appendChild(unitTitle);

      unit.topics.forEach(topic => {
        const label = document.createElement('label');
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "8px";
        label.style.fontSize = "14px";
        label.style.color = "white";
        label.style.marginLeft = "12px";
        label.style.marginBottom = "6px";
        label.style.cursor = "pointer";

        const cb = document.createElement('input');
        cb.type = "checkbox";
        cb.value = topic.topic_id;
        cb.addEventListener('change', (e) => {
          const id = parseInt(e.target.value);
          if (e.target.checked) {
            appState.selectedTopicIds.push(id);
          } else {
            appState.selectedTopicIds = appState.selectedTopicIds.filter(t => t !== id);
          }
        });

        const span = document.createElement('span');
        span.innerText = topic.topic_name;

        label.appendChild(cb);
        label.appendChild(span);
        unitBlock.appendChild(label);
      });
      subBlock.appendChild(unitBlock);
    });
    container.appendChild(subBlock);
  });
}

function syncSliderVal(val) {
  let v = parseInt(val);
  if (isNaN(v)) v = 10;
  v = Math.max(5, Math.min(200, Math.round(v / 5) * 5));
  document.getElementById('question-slider').value = v;
  document.getElementById('question-volume-box').value = v;
}

function syncVolumeBox(val) {
  document.getElementById('question-volume-box').value = val;
}

// Start Quiz Practice Test
async function startPracticeTest() {
  let finalTopicIds = [];
  let minuteTopicId = null;
  let isPyq = appState.testingPath === 'PYQ';
  let examId = null;

  if (appState.testingPath === 'COMPLETE') {
    // Collect all topics in syllabus
    appState.syllabusData.forEach(sub => {
      sub.units.forEach(unit => {
        unit.topics.forEach(t => finalTopicIds.push(t.topic_id));
      });
    });
    appState.activeQuizSubject = "Complete Syllabus Mock";
  } else if (appState.testingPath === 'SUBJECT') {
    if (appState.selectedSubjectIds.length === 0) {
      alert("Please check at least one subject checklist option.");
      return;
    }
    appState.syllabusData.forEach(sub => {
      if (appState.selectedSubjectIds.includes(sub.subject_id)) {
        sub.units.forEach(unit => {
          unit.topics.forEach(t => finalTopicIds.push(t.topic_id));
        });
      }
    });
    appState.activeQuizSubject = "Subject-wise Compilation";
  } else if (appState.testingPath === 'TOPIC') {
    if (appState.selectedTopicIds.length === 0) {
      alert("Please check at least one topic checkbox.");
      return;
    }
    finalTopicIds = [...appState.selectedTopicIds];
    appState.activeQuizSubject = "Topic-wise Practice";
  } else if (appState.testingPath === 'SUBTOPIC') {
    const subtopicId = parseInt(document.getElementById('config-subtopic-select').value);
    if (!subtopicId) {
      alert("Please select a sub-topic to start.");
      return;
    }
    minuteTopicId = subtopicId;
    const subtopicText = document.getElementById('config-subtopic-select').options[document.getElementById('config-subtopic-select').selectedIndex].text;
    appState.activeQuizSubject = `Sub-topic: ${subtopicText}`;
  } else if (isPyq) {
    const configPyqSelect = document.getElementById('config-pyq-select');
    examId = parseInt(configPyqSelect.value);
    if (!examId) {
      alert("Please select a past year exam first.");
      return;
    }
    const examText = configPyqSelect.options[configPyqSelect.selectedIndex].text;
    appState.activeQuizSubject = `PYQ: ${examText}`;
  }

  const count = parseInt(document.getElementById('question-slider').value);
  const isMains = appState.selectedTier === 'MAINS';
  logSystem(`Triggering compilation of questions for tier ${appState.selectedTier}...`);

  let url = `${API_BASE}/quiz/generate`;
  let payload = {
    userId: appState.userId,
    count: count,
    language: appState.language || 'EN'
  };

  if (isPyq) {
    url = `${API_BASE}/pyq/questions?exam_id=${examId}&language=${appState.language || 'EN'}`;
  } else if (isMains) {
    if (minuteTopicId) {
      url = `${API_BASE}/mains/questions?minute_topic_id=${minuteTopicId}&language=${appState.language || 'EN'}&limit=${count}`;
    } else {
      url = `${API_BASE}/mains/questions?topic_ids=${finalTopicIds.join(',')}&language=${appState.language || 'EN'}&limit=${count}`;
    }
  } else {
    if (minuteTopicId) {
      payload.minuteTopicId = minuteTopicId;
    } else {
      payload.topicIds = finalTopicIds;
    }
  }

  try {
    let res;
    if (isPyq || isMains) {
      res = await fetch(url, {
        headers: { 'x-user-mobile': appState.userMobile || '9876543210' }
      });
    } else {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-mobile': appState.userMobile || '9876543210'
        },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      const data = await res.json();
      if (!data.questions || data.questions.length === 0) {
        alert("Empty pool: There are no questions loaded in the database matching the selected filters. Please populate them in the Admin Portal!");
        return;
      }
      appState.activeQuizQuestions = data.questions;
      appState.currentQuestionIndex = 0;
      appState.userAnswers = {};
      
      logSystem(`Successfully loaded ${data.questions.length} questions. Starting session...`);
      launchActiveQuizTimer(count * 60); // 1 minute per question
      navigateToScreen('view-quiz');
      showQuestion(0);
    } else {
      const err = await res.json();
      alert("Failed to compile: " + err.error);
    }
  } catch (err) {
    logSystem(`[Error] Generation failed: ${err.message}`);
  }
}

// 5. Page 3: Randomized Quiz Play Engine
function launchActiveQuizTimer(durationSeconds) {
  if (appState.quizTimerInterval) clearInterval(appState.quizTimerInterval);
  if (appState.selectedTier === 'MAINS' || appState.testingPath === 'PYQ') return;
  
  appState.quizTimerSeconds = durationSeconds;
  updateTimerUI();
  
  appState.quizTimerInterval = setInterval(() => {
    appState.quizTimerSeconds--;
    updateTimerUI();
    
    if (appState.quizTimerSeconds <= 0) {
      clearInterval(appState.quizTimerInterval);
      logSystem(`Timer alert: Time's up! Auto-submitting quiz.`);
      submitQuizResults();
    }
  }, 1000);
}

function updateTimerUI() {
  const clock = document.getElementById('quiz-timer-clock');
  if (clock) {
    const mins = Math.floor(appState.quizTimerSeconds / 60);
    const secs = appState.quizTimerSeconds % 60;
    clock.innerText = `⏱ ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

function showQuestion(index) {
  appState.currentQuestionIndex = index;
  const qText = document.getElementById('quiz-q-text');
  const optionsBox = document.getElementById('quiz-options-box');
  const progress = document.getElementById('quiz-progress-text');
  
  const total = appState.activeQuizQuestions.length;
  const isMains = appState.selectedTier === 'MAINS';
  progress.innerText = isMains ? `Mains Question ${index + 1} of ${total}` : `Question ${index + 1} of ${total}`;

  const q = appState.activeQuizQuestions[index];
  qText.innerText = q.question_text;
  
  const skipBtn = document.getElementById('quiz-btn-skip');
  const clock = document.getElementById('quiz-timer-clock');

  if (isMains) {
    // Descriptive layout
    optionsBox.innerHTML = `
      <div style="margin-top:16px; background:rgba(168, 85, 247, 0.08); border:1px solid rgba(168, 85, 247, 0.2); padding:14px; border-radius:var(--radius-sm); max-height:220px; overflow-y:auto;">
        <span style="font-size:10px; font-weight:bold; color:#C084FC; display:block; margin-bottom:6px; letter-spacing:1px;">EXPERT MODEL ANSWER</span>
        <p style="font-size:12px; line-height:1.6; color:var(--color-text-muted); margin:0; white-space:pre-wrap;">${q.model_answer}</p>
      </div>
    `;
    
    if (skipBtn) skipBtn.classList.add('hidden');
    if (clock) {
      clock.innerText = "✍️ Practice Session";
      clock.className = "";
    }
  } else {
    // MCQ layout
    const isPrePyq = appState.testingPath === 'PYQ';
    if (isPrePyq) {
      if (skipBtn) skipBtn.classList.add('hidden');
      if (clock) {
        clock.innerText = "⏱ Learn Mode";
        clock.className = "";
      }
    } else {
      if (skipBtn) skipBtn.classList.remove('hidden');
    }
    
    optionsBox.innerHTML = "";
    ['A', 'B', 'C', 'D'].forEach(letter => {
      const optText = q[`option_${letter.toLowerCase()}`];
      
      const btn = document.createElement('button');
      btn.className = "option-btn";
      
      const isSelected = appState.userAnswers[index] === letter;
      const isAnswered = appState.userAnswers[index] !== undefined && appState.userAnswers[index] !== null;
      
      if (isPrePyq && isAnswered) {
        const correctOpt = q.correct_option;
        if (letter === correctOpt) {
          // Highlight correct option in green
          btn.style.backgroundColor = "hsla(142, 71%, 45%, 0.1)";
          btn.style.borderColor = "hsl(142, 71%, 45%)";
          btn.innerHTML = `<span class="option-circle" style="background-color:hsl(142, 71%, 45%); border-color:hsl(142, 71%, 45%); color:white;">${letter}</span><span class="option-title">${optText}</span>`;
        } else if (isSelected && letter !== correctOpt) {
          // Highlight incorrect selected option in red
          btn.style.backgroundColor = "hsla(0, 84%, 60%, 0.1)";
          btn.style.borderColor = "hsl(0, 84%, 60%)";
          btn.innerHTML = `<span class="option-circle" style="background-color:hsl(0, 84%, 60%); border-color:hsl(0, 84%, 60%); color:white;">${letter}</span><span class="option-title">${optText}</span>`;
        } else {
          btn.innerHTML = `<span class="option-circle">${letter}</span><span class="option-title">${optText}</span>`;
        }
      } else {
        if (isSelected) {
          btn.classList.add('selected');
        }
        btn.innerHTML = `<span class="option-circle">${letter}</span><span class="option-title">${optText}</span>`;
      }
      
      btn.onclick = () => {
        if (isPrePyq && isAnswered) {
          // Lock once choice is selected
          return;
        }
        appState.userAnswers[index] = letter;
        logSystem(`Selected option ${letter} for question index ${index}`);
        showQuestion(index); // re-render selected state
      };
      optionsBox.appendChild(btn);
    });

    // Immediate explanation display in PYQ Learn Mode
    if (isPrePyq && appState.userAnswers[index] !== undefined && appState.userAnswers[index] !== null) {
      const expDiv = document.createElement('div');
      expDiv.style.marginTop = "16px";
      expDiv.style.background = "rgba(16, 185, 129, 0.08)";
      expDiv.style.border = "1px solid rgba(16, 185, 129, 0.2)";
      expDiv.style.padding = "14px";
      expDiv.style.borderRadius = "var(--radius-sm)";
      expDiv.style.maxHeight = "180px";
      expDiv.style.overflowY = "auto";
      expDiv.innerHTML = `
        <span style="font-size:10px; font-weight:bold; color:#10B981; display:block; margin-bottom:6px; letter-spacing:1px;">CORRECT OPTION: ${q.correct_option}</span>
        <p style="font-size:12px; line-height:1.6; color:var(--color-text-muted); margin:0;">${q.detailed_explanation}</p>
      `;
      optionsBox.appendChild(expDiv);
    }
  }

  // Toggle Buttons
  document.getElementById('quiz-btn-prev').disabled = index === 0;
  
  const nextBtn = document.getElementById('quiz-btn-next');
  const submitBtn = document.getElementById('quiz-btn-submit');
  
  if (index === total - 1) {
    nextBtn.classList.add('hidden');
    submitBtn.classList.remove('hidden');
    submitBtn.innerText = (isMains || (appState.testingPath === 'PYQ' && appState.selectedTier === 'PRE')) ? "Finish Practice" : "Submit";
  } else {
    nextBtn.classList.remove('hidden');
    submitBtn.classList.add('hidden');
  }
}

// Bind Quiz Controls
document.getElementById('quiz-btn-prev').addEventListener('click', () => {
  if (appState.currentQuestionIndex > 0) {
    showQuestion(appState.currentQuestionIndex - 1);
  }
});

document.getElementById('quiz-btn-next').addEventListener('click', () => {
  if (appState.currentQuestionIndex < appState.activeQuizQuestions.length - 1) {
    showQuestion(appState.currentQuestionIndex + 1);
  }
});

document.getElementById('quiz-btn-skip').addEventListener('click', () => {
  appState.userAnswers[appState.currentQuestionIndex] = null; // explicitly skip
  logSystem(`Skipped question index ${appState.currentQuestionIndex}`);
  if (appState.currentQuestionIndex < appState.activeQuizQuestions.length - 1) {
    showQuestion(appState.currentQuestionIndex + 1);
  } else {
    submitQuizResults();
  }
});

document.getElementById('quiz-btn-submit').addEventListener('click', () => {
  submitQuizResults();
});

document.getElementById('quiz-btn-quit').addEventListener('click', () => {
  if (confirm("Are you sure you want to exit early? Your progress will not be saved.")) {
    if (appState.quizTimerInterval) clearInterval(appState.quizTimerInterval);
    logSystem("Exited practice/test early.");
    navigateToScreen('view-test-config');
  }
});

// Submit answers to API
async function submitQuizResults() {
  if (appState.quizTimerInterval) clearInterval(appState.quizTimerInterval);

  if (appState.selectedTier === 'MAINS' || (appState.testingPath === 'PYQ' && appState.selectedTier === 'PRE')) {
    logSystem("Finished descriptive/PYQ practice session.");
    navigateToScreen('view-test-config');
    return;
  }

  logSystem("Submitting quiz answers for grading...");
  
  // Format body: map question index to its database ID and chosen option
  const formattedAnswers = {};
  appState.activeQuizQuestions.forEach((q, index) => {
    formattedAnswers[q.question_id] = appState.userAnswers[index] || null;
  });

  try {
    const res = await fetch(`${API_BASE}/quiz/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-mobile': appState.userMobile || '9876543210'
      },
      body: JSON.stringify({
        userId: appState.userId,
        answers: formattedAnswers
      })
    });

    if (res.ok) {
      const scorecard = await res.json();
      logSystem(`Grading Complete! Marks: ${scorecard.score}`);
      renderScorecard(scorecard);
      navigateToScreen('view-results');
    } else {
      const err = await res.json();
      alert("Failed to submit quiz: " + err.error);
    }
  } catch (err) {
    logSystem(`[Error] Submission grading failed: ${err.message}`);
  }
}

// 6. Page 4: Results Render
function renderScorecard(card) {
  document.getElementById('results-subject-name').innerText = appState.activeQuizSubject;
  
  const scoreHeading = document.getElementById('results-net-marks');
  scoreHeading.innerText = (card.score >= 0 ? "+" : "") + card.score.toFixed(2);
  if (card.score >= 0) {
    scoreHeading.style.color = "#10B981";
  } else {
    scoreHeading.style.color = "#EF4444";
  }

  document.getElementById('stats-total').innerText = card.total;
  document.getElementById('stats-correct').innerText = card.correct;
  document.getElementById('stats-incorrect').innerText = card.incorrect;
  document.getElementById('stats-skipped').innerText = card.skipped;

  // Render detailed review list
  const solutionsBox = document.getElementById('results-solutions-box');
  solutionsBox.innerHTML = "";

  card.details.forEach((item, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = "solution-item";
    if (item.is_correct) wrapper.classList.add('correct');
    else if (item.is_skipped) wrapper.classList.add('skipped');
    else wrapper.classList.add('incorrect');

    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="solution-status-badge">
          ${item.is_correct ? '✓ Correct (+1.33)' : item.is_skipped ? '○ Skipped (0.00)' : '✗ Incorrect (-0.44)'}
        </span>
        <span style="font-size:10px; color:var(--color-text-muted);">Q. ID: ${item.question_id}</span>
      </div>
      <p style="font-size:12px; font-weight:600; color:white; margin:0 0 10px 0;">${index + 1}. ${item.question_text}</p>
      
      <div style="font-size:11px; margin-bottom:8px;">
        <div>User Answer: <strong style="color:${item.is_correct ? '#10B981' : '#EF4444'}">${item.user_answer || 'Skipped'}</strong></div>
        <div>Correct Answer: <strong style="color:#10B981">${item.correct_answer}</strong></div>
      </div>
      
      <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:var(--radius-xs); border:1px solid rgba(255,255,255,0.04); font-size:11px; color:var(--color-text-muted);">
        <strong>Explanation:</strong> ${item.explanation}
      </div>
    `;
    solutionsBox.appendChild(wrapper);
  });
}

// 7. Page 5: Admin Portal functions
// 7. Page 5: Admin Portal functions
async function loadAdminPortal() {
  logAdmin("Fetching database statistics...");
  try {
    const res = await fetch(`${API_BASE}/admin/stats`);
    if (res.ok) {
      const stats = await res.json();
      document.getElementById('admin-stats-users').innerText = stats.usersCount;
      document.getElementById('admin-stats-questions').innerText = stats.questionsCount;
      appState.adminStats = stats.topicsStats;
      
      loadAdminSyllabusTree();
      loadSupportQueries();
      loadPyqExamsDropdown();
      await populateIngestTopics();
      loadUploadedFilesHistory();
      onManagerSourceChange();
    }
  } catch (err) {
    logAdmin(`[Error] Stats fetch failed: ${err.message}`);
  }
}

async function loadUploadedFilesHistory() {
  const container = document.getElementById('uploaded-files-list');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/admin/uploaded-files`);
    if (res.ok) {
      const data = await res.json();
      container.innerHTML = "";
      if (!data.files || data.files.length === 0) {
        container.innerHTML = `<div style="color:var(--color-text-muted); text-align:center; padding:10px;">No files uploaded yet.</div>`;
        return;
      }
      data.files.forEach(f => {
        const item = document.createElement('div');
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";
        item.style.borderBottom = "1px solid rgba(255,255,255,0.03)";
        item.style.paddingBottom = "4px";

        item.innerHTML = `
          <div style="flex:1; padding-right:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            <span style="color:white; font-weight:bold;">${f.originalName}</span>
            <span style="font-size:9px; color:var(--color-text-muted); display:block;">Uploaded: ${f.uploadedAt}</span>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <a href="${API_BASE}/admin/uploaded-files/${f.filename}" download style="background:var(--color-primary-glow); border:1px solid var(--color-primary); color:white; padding:2px 6px; border-radius:var(--radius-xs); text-decoration:none; font-size:9px; font-weight:bold;">Download</a>
            <button onclick="deleteUploadedFile('${f.filename}')" style="background:rgba(239,68,68,0.15); border:1px solid #EF4444; color:#EF4444; padding:2px 6px; border-radius:var(--radius-xs); cursor:pointer; font-size:9px; font-weight:bold;">Delete</button>
          </div>
        `;
        container.appendChild(item);
      });
    }
  } catch (err) {
    console.error("Failed to load uploaded files history:", err);
  }
}

async function deleteUploadedFile(filename) {
  if (!confirm("Are you sure you want to delete this file from the server disk?")) return;
  try {
    const res = await fetch(`${API_BASE}/admin/delete-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    if (res.ok) {
      alert("File deleted successfully.");
      loadUploadedFilesHistory();
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
}

async function loadAdminSyllabusTree() {
  const tierSelect = document.getElementById('admin-tier-select');
  const container = document.getElementById('admin-syllabus-tree');
  if (!tierSelect || !container) return;
  const tier = tierSelect.value;
  container.innerHTML = "Loading syllabus tree...";

  try {
    const response = await fetch(`${API_BASE}/syllabus?tier=${tier}`, {
      headers: { 'x-user-mobile': "9876543210" }
    });
    
    if (response.ok) {
      const data = await response.json();
      container.innerHTML = "";
      
      data.subjects.forEach(sub => {
        const subBlock = document.createElement('div');
        subBlock.style.marginBottom = "10px";
        subBlock.style.borderBottom = "1px solid rgba(255,255,255,0.04)";
        subBlock.style.paddingBottom = "6px";

        const title = document.createElement('div');
        title.innerText = sub.subject_name;
        title.style.fontSize = "11px";
        title.style.fontWeight = "bold";
        title.style.color = "var(--color-primary)";
        subBlock.appendChild(title);

        sub.units.forEach(unit => {
          unit.topics.forEach(topic => {
            const topicRow = document.createElement('div');
            topicRow.style.display = "flex";
            topicRow.style.justifyContent = "space-between";
            topicRow.style.alignItems = "center";
            topicRow.style.padding = "6px 4px";
            topicRow.style.marginLeft = "8px";
            topicRow.style.fontSize = "10px";

            // Find stats for this topic
            const topicStat = appState.adminStats?.find(ts => ts.topic_id === topic.topic_id);
            const count = topicStat ? (tier === 'MAINS' ? topicStat.mq_count : topicStat.q_count) : 0;

            topicRow.innerHTML = `
              <div style="flex:1; padding-right:10px;">
                <span style="color:white;">${topic.topic_name}</span>
                <span style="font-size:9px; color:var(--color-text-muted); display:block;">ID: ${topic.topic_id} | Questions: <strong style="color:var(--color-accent);">${count}</strong></span>
              </div>
              <div style="display:flex; gap:6px; align-items:center;">
                <button onclick="downloadTopicTemplate(${sub.subject_id}, ${topic.topic_id})" style="background:rgba(255,255,255,0.05); color:white; border:1px solid rgba(255,255,255,0.1); padding:4px 6px; border-radius:var(--radius-xs); cursor:pointer; font-size:9px;">Template</button>
                <label style="background:var(--color-primary-glow); border:1px solid var(--color-primary); color:white; padding:4px 6px; border-radius:var(--radius-xs); cursor:pointer; font-size:9px; display:inline-block; margin:0;">
                  Upload
                  <input type="file" accept=".docx" onchange="uploadTopicQuestions(this, ${topic.topic_id})" style="display:none;">
                </label>
                <button onclick="clearTopicQuestions(${topic.topic_id})" style="background:rgba(239,68,68,0.15); color:#EF4444; border:1px solid rgba(239,68,68,0.3); padding:4px 6px; border-radius:var(--radius-xs); cursor:pointer; font-size:9px;">Clear</button>
              </div>
            `;
            subBlock.appendChild(topicRow);
          });
        });
        container.appendChild(subBlock);
      });
    }
  } catch (err) {
    container.innerHTML = "Error loading tree.";
    logAdmin(`[Error] Syllabus tree load failed: ${err.message}`);
  }
}

// Download template handler
function downloadTopicTemplate(subjectId, topicId) {
  logAdmin(`Downloading DOCX template for Subject ID ${subjectId}, Topic ID ${topicId}...`);
  window.open(`${API_BASE}/admin/download-template?subject_id=${subjectId}&topic_id=${topicId}`);
}

// Upload file handler
async function uploadTopicQuestions(input, topicId) {
  const file = input.files[0];
  const language = document.getElementById('admin-lang-select').value;
  if (!file) return;

  logAdmin(`Uploading questions DOCX for Topic ID ${topicId} in ${language}...`);
  
  const formData = new FormData();
  formData.append('topicId', topicId);
  formData.append('language', language);
  formData.append('questionsFile', file);

  try {
    const res = await fetch(`${API_BASE}/admin/upload-questions`, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Ingestion Success] ${data.message}`);
      if (data.saved_file_path) {
        logAdmin(`[Backup Saved] Backup copy saved locally at: ${data.saved_file_path}`);
      }
      alert(data.message);
      // Reload stats and tree
      loadAdminPortal();
    } else {
      const err = await res.json();
      logAdmin(`[Ingestion Error] ${err.error}`);
      alert("Error: " + err.error);
    }
  } catch (err) {
    logAdmin(`[Ingestion Error] Network upload failed: ${err.message}`);
    alert("Upload failed: " + err.message);
  }
}

// Support Queries Inbox logic
async function loadSupportQueries() {
  try {
    const res = await fetch(`${API_BASE}/admin/queries`);
    if (res.ok) {
      const data = await res.json();
      const box = document.getElementById('support-queries-list');
      box.innerHTML = "";
      if (data.queries.length === 0) {
        box.innerHTML = `<div style="color: var(--color-text-muted); text-align: center; padding: 12px 0;">No active queries found.</div>`;
        return;
      }
      data.queries.forEach(q => {
        const item = document.createElement('div');
        item.style.padding = "6px";
        item.style.background = "rgba(255,255,255,0.02)";
        item.style.border = "1px solid rgba(255,255,255,0.04)";
        item.style.borderRadius = "var(--radius-xs)";
        item.style.marginBottom = "4px";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";
        
        item.innerHTML = `
          <div style="flex: 1; padding-right: 8px;">
            <span style="color: #38BDF8; font-weight: bold;">${q.mobile_number}</span>:
            <span style="color: white; display: block; font-size: 10px; margin-top: 2px;">${q.query_text}</span>
          </div>
          <button onclick="resolveQuery(${q.query_id})" style="background: #10B981; color: white; border: none; padding: 3px 6px; border-radius: var(--radius-xs); cursor: pointer; font-size: 9px;">Resolve</button>
        `;
        box.appendChild(item);
      });
    }
  } catch (e) {
    console.error(e);
  }
}

async function resolveQuery(queryId) {
  if (!confirm("Mark this query as resolved and clear it?")) return;
  try {
    const res = await fetch(`${API_BASE}/admin/clear-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryId })
    });
    if (res.ok) {
      loadSupportQueries();
    }
  } catch (e) {
    alert("Failed to resolve query: " + e.message);
  }
}

// PYQs Admin Management logic
async function loadPyqExamsDropdown() {
  try {
    const res = await fetch(`${API_BASE}/pyqs`, {
      headers: { 'x-user-mobile': appState.userMobile || '9876543210' }
    });
    if (res.ok) {
      const data = await res.json();
      const preSelect = document.getElementById('admin-pyq-pre-select');
      const mainsSelect = document.getElementById('admin-pyq-mains-select');
      if (preSelect) preSelect.innerHTML = "";
      if (mainsSelect) mainsSelect.innerHTML = "";

      data.exams.forEach(exam => {
        const opt = document.createElement('option');
        opt.value = exam.exam_id;
        opt.innerText = `${exam.exam_name} (${exam.exam_year})`;
        
        if (exam.tier_type === 'PRE') {
          if (preSelect) preSelect.appendChild(opt);
        } else if (exam.tier_type === 'MAINS') {
          if (mainsSelect) mainsSelect.appendChild(opt);
        }
      });
    }
  } catch (e) {
    console.error(e);
  }
}

async function createPrePyqExamEntry() {
  const name = document.getElementById('admin-new-pre-exam-name').value.trim();
  const year = document.getElementById('admin-new-pre-exam-year').value;
  const tier = 'PRE';
  if (!name || !year) {
    alert("Please fill in the exam name and year.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/admin/create-pyq-exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, year, tier })
    });
    if (res.ok) {
      alert("Prelims PYQ Exam Entry added successfully!");
      document.getElementById('admin-new-pre-exam-name').value = "";
      document.getElementById('admin-new-pre-exam-year').value = "";
      loadPyqExamsDropdown();
    }
  } catch (e) {
    alert("Failed to create Prelims exam entry: " + e.message);
  }
}

async function createMainsPyqExamEntry() {
  const name = document.getElementById('admin-new-mains-exam-name').value.trim();
  const year = document.getElementById('admin-new-mains-exam-year').value;
  const tier = 'MAINS';
  if (!name || !year) {
    alert("Please fill in the exam name and year.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/admin/create-pyq-exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, year, tier })
    });
    if (res.ok) {
      alert("Mains PYQ Exam Entry added successfully!");
      document.getElementById('admin-new-mains-exam-name').value = "";
      document.getElementById('admin-new-mains-exam-year').value = "";
      loadPyqExamsDropdown();
    }
  } catch (e) {
    alert("Failed to create Mains exam entry: " + e.message);
  }
}

async function uploadPrePyqQuestions(input) {
  const file = input.files[0];
  const examId = document.getElementById('admin-pyq-pre-select').value;
  const language = document.getElementById('admin-pyq-pre-lang-select').value;
  if (!file) return;
  if (!examId) {
    alert("Please select a target Prelims exam first.");
    return;
  }

  logAdmin(`Uploading Prelims PYQs DOCX for Exam ID ${examId} in ${language}...`);
  const formData = new FormData();
  formData.append('examId', examId);
  formData.append('language', language);
  formData.append('questionsFile', file);

  try {
    const res = await fetch(`${API_BASE}/admin/upload-questions`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Prelims PYQ Ingest Success] ${data.message}`);
      alert(data.message);
      loadAdminPortal();
    } else {
      const err = await res.json();
      logAdmin(`[Prelims PYQ Ingest Error] ${err.error}`);
      alert("Error: " + err.error);
    }
  } catch (err) {
    logAdmin(`[Prelims PYQ Ingest Error] Network upload failed: ${err.message}`);
    alert("Upload failed: " + err.message);
  }
}

async function clearPrePyqQuestions() {
  const examId = document.getElementById('admin-pyq-pre-select').value;
  if (!examId) return;
  if (!confirm("Are you sure you want to clear all questions for this Prelims exam?")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/clear-pyq-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId })
    });
    if (res.ok) {
      alert("Successfully cleared all questions for this Prelims exam.");
      loadAdminPortal();
    }
  } catch (e) {
    alert("Failed to clear questions: " + e.message);
  }
}

async function uploadMainsPyqQuestions(input) {
  const file = input.files[0];
  const examId = document.getElementById('admin-pyq-mains-select').value;
  const language = document.getElementById('admin-pyq-mains-lang-select').value;
  if (!file) return;
  if (!examId) {
    alert("Please select a target Mains exam first.");
    return;
  }

  logAdmin(`Uploading Mains PYQs DOCX for Exam ID ${examId} in ${language}...`);
  const formData = new FormData();
  formData.append('examId', examId);
  formData.append('language', language);
  formData.append('questionsFile', file);

  try {
    const res = await fetch(`${API_BASE}/admin/upload-questions`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Mains PYQ Ingest Success] ${data.message}`);
      alert(data.message);
      loadAdminPortal();
    } else {
      const err = await res.json();
      logAdmin(`[Mains PYQ Ingest Error] ${err.error}`);
      alert("Error: " + err.error);
    }
  } catch (err) {
    logAdmin(`[Mains PYQ Ingest Error] Network upload failed: ${err.message}`);
    alert("Upload failed: " + err.message);
  }
}

async function clearMainsPyqQuestions() {
  const examId = document.getElementById('admin-pyq-mains-select').value;
  if (!examId) return;
  if (!confirm("Are you sure you want to clear all questions for this Mains exam?")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/clear-pyq-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId })
    });
    if (res.ok) {
      alert("Successfully cleared all questions for this Mains exam.");
      loadAdminPortal();
    }
  } catch (e) {
    alert("Failed to clear questions: " + e.message);
  }
}

// Ingestion triggers in sidebar uploader
function triggerDocumentIngestion() {
  const topicId = document.getElementById('ingest-topic-select').value;
  const minuteTopicId = document.getElementById('ingest-subtopic-select')?.value || "";
  const rawText = document.getElementById('ingest-raw-text').value.trim();
  const language = document.getElementById('ingest-lang-select').value;

  if (!rawText) {
    alert("Please load or paste raw question text first.");
    return;
  }

  logSystem(`Admin Sidebar Trigger: Ingesting raw pasted questions...`);
  
  const blob = new Blob([rawText], { type: 'text/plain' });
  const file = new File([blob], `ingested_paste_${topicId}.txt`);
  
  const formData = new FormData();
  if (minuteTopicId) {
    formData.append('minuteTopicId', minuteTopicId);
  } else {
    formData.append('topicId', topicId);
  }
  formData.append('language', language);
  formData.append('questionsFile', file);

  fetch(`${API_BASE}/admin/upload-questions`, {
    method: 'POST',
    body: formData
  })
  .then(async res => {
    if (res.ok) {
      const data = await res.json();
      logSystem(`[Ingestion Success] ${data.message}`);
      alert(data.message);
      // Refresh stats if admin dashboard is open
      if (appState.currentView === 'view-admin-portal') {
        loadAdminPortal();
      }
    } else {
      const err = await res.json();
      logSystem(`[Ingestion Error] ${err.error}`);
      alert("Ingestion Error: " + err.error);
    }
  })
  .catch(err => {
    logSystem(`[Ingestion Error] Ingestion network failed: ${err.message}`);
    alert("Ingestion network failed: " + err.message);
  });
}

// Load Samples in sidebar uploader
function loadSampleQuestionsForIngestion() {
  document.getElementById('ingest-raw-text').value = `Q. What is the location of the highest peak in Rajasthan, Guru Shikhar?
A) Sirohi
B) Udaipur
C) Ajmer
D) Jaipur
Correct: A
Explanation: Guru Shikhar is located in the Mount Abu region of Sirohi district with an altitude of 1722 meters.

---

Q. The integration of Rajasthan was completed in how many stages?
A) 5 Stages
B) 7 Stages
C) 8 Stages
D) 9 Stages
Correct: B
Explanation: The political integration of Rajasthan was completed in 7 stages from 18 March 1948 to 1 November 1956.`;
  logSystem("Loaded sample questions into uploader.");
}

function loadSampleTextForIngestion() {
  alert("The theory feature is entirely removed. Please load Sample Questions instead.");
}

// Modal handling helpers
function startPracticeWithCount(count) {
  document.getElementById('question-slider').value = count;
  document.getElementById('question-volume-box').value = count;
  document.getElementById('quiz-count-modal').classList.add('hidden');
  startPracticeTest();
}

function closeCountModal() {
  document.getElementById('quiz-count-modal').classList.add('hidden');
}

// Dynamically populate uploader topic dropdowns
async function populateIngestTopics() {
  const preSelect = document.getElementById('admin-pre-topic-select');
  const parentSelect = document.getElementById('admin-subtopic-parent-select');
  const mainsSelect = document.getElementById('admin-mains-topic-select');
  const ingestTopicSelect = document.getElementById('ingest-topic-select');
  const mainsParentSelect = document.getElementById('admin-mains-subtopic-parent-select');
  
  if (!preSelect || !parentSelect || !mainsSelect || !ingestTopicSelect) return;

  const prevPreVal = preSelect.value;
  const prevParentVal = parentSelect.value;
  const prevIngestVal = ingestTopicSelect.value;
  const prevMainsVal = mainsSelect.value;
  const prevMainsParentVal = mainsParentSelect ? mainsParentSelect.value : null;

  const prevSubtopicSelectVal = document.getElementById('admin-subtopic-select')?.value;
  const prevMainsSubtopicSelectVal = document.getElementById('admin-mains-subtopic-select')?.value;
  
  try {
    const mobileHeader = "9876543210";
    
    // Fetch both PRE and MAINS to show in uploader dropdowns
    const resPre = await fetch(`${API_BASE}/syllabus?tier=PRE`, {
      headers: { 'x-user-mobile': mobileHeader }
    });
    const resMains = await fetch(`${API_BASE}/syllabus?tier=MAINS`, {
      headers: { 'x-user-mobile': mobileHeader }
    });
    
    let preTopics = [];
    if (resPre.ok) {
      const data = await resPre.json();
      data.subjects.forEach(sub => {
        sub.units.forEach(unit => {
          unit.topics.forEach(t => {
            preTopics.push({ id: t.topic_id, subId: sub.subject_id, name: `[PRE] ${sub.subject_name.substring(0, 25)}... -> ${t.topic_name}` });
          });
        });
      });
    }
    
    let mainsTopics = [];
    if (resMains.ok) {
      const data = await resMains.json();
      data.subjects.forEach(sub => {
        sub.units.forEach(unit => {
          unit.topics.forEach(t => {
            mainsTopics.push({ id: t.topic_id, subId: sub.subject_id, name: `[MAINS] ${sub.subject_name.substring(0, 25)}... -> ${t.topic_name}` });
          });
        });
      });
    }
    
    // Populate Pre topics select
    preSelect.innerHTML = "";
    parentSelect.innerHTML = "";
    ingestTopicSelect.innerHTML = "";
    preTopics.forEach(t => {
      const topicStat = appState.adminStats?.find(ts => ts.topic_id === t.id);
      const count = topicStat ? topicStat.q_count : 0;
      const displayName = `${t.name} (Qs: ${count})`;

      const opt1 = document.createElement('option');
      opt1.value = t.id;
      opt1.dataset.subjectId = t.subId;
      opt1.innerText = displayName;
      preSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = t.id;
      opt2.dataset.subjectId = t.subId;
      opt2.innerText = displayName;
      parentSelect.appendChild(opt2);

      const opt3 = document.createElement('option');
      opt3.value = t.id;
      opt3.dataset.subjectId = t.subId;
      opt3.innerText = displayName;
      ingestTopicSelect.appendChild(opt3);
    });

    // Populate Mains topics select
    mainsSelect.innerHTML = "";
    if (mainsParentSelect) mainsParentSelect.innerHTML = "";
    
    mainsTopics.forEach(t => {
      const topicStat = appState.adminStats?.find(ts => ts.topic_id === t.id);
      const count = topicStat ? topicStat.mq_count : 0;
      const displayName = `${t.name} (Qs: ${count})`;

      const opt = document.createElement('option');
      opt.value = t.id;
      opt.dataset.subjectId = t.subId;
      opt.innerText = displayName;
      mainsSelect.appendChild(opt);

      // Append to mainsParentSelect for Mains subtopic creation/management
      if (mainsParentSelect) {
        const opt2 = document.createElement('option');
        opt2.value = t.id;
        opt2.dataset.subjectId = t.subId;
        opt2.innerText = displayName;
        mainsParentSelect.appendChild(opt2);
      }
    });

    // Restore previous selections
    if (prevPreVal) preSelect.value = prevPreVal;
    if (prevParentVal) parentSelect.value = prevParentVal;
    if (prevIngestVal) ingestTopicSelect.value = prevIngestVal;
    if (prevMainsVal) mainsSelect.value = prevMainsVal;
    if (prevMainsParentVal && mainsParentSelect) mainsParentSelect.value = prevMainsParentVal;

    // Trigger parent topic change to populate subtopics list on load
    await onAdminParentTopicChange();
    if (prevSubtopicSelectVal) {
      const subtopicSelect = document.getElementById('admin-subtopic-select');
      if (subtopicSelect) subtopicSelect.value = prevSubtopicSelectVal;
    }

    onSidebarParentTopicChange();

    await onAdminMainsSubtopicParentChange();
    if (prevMainsSubtopicSelectVal) {
      const mainsSubtopicSelect = document.getElementById('admin-mains-subtopic-select');
      if (mainsSubtopicSelect) mainsSubtopicSelect.value = prevMainsSubtopicSelectVal;
    }

    // Populate Syllabus Manager parent dropdowns
    const mngrParentSelect = document.getElementById('mngr-parent-topic-select');
    const mngrDelParentSelect = document.getElementById('mngr-del-parent-select');
    if (mngrParentSelect) {
      const prevVal = mngrParentSelect.value;
      mngrParentSelect.innerHTML = "";
      preTopics.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.innerText = t.name;
        mngrParentSelect.appendChild(opt);
      });
      if (prevVal) mngrParentSelect.value = prevVal;
    }
    if (mngrDelParentSelect) {
      const prevVal = mngrDelParentSelect.value;
      mngrDelParentSelect.innerHTML = '<option value="">-- Select Parent Topic --</option>';
      preTopics.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.innerText = t.name;
        mngrDelParentSelect.appendChild(opt);
      });
      if (prevVal) mngrDelParentSelect.value = prevVal;
    }

    // Populate Subjects & Rename selectors
    const mngrSubjectSelect = document.getElementById('mngr-subject-select');
    const mngrRenameTopicSelect = document.getElementById('mngr-rename-topic-select');
    
    if (mngrSubjectSelect) {
      const prevVal = mngrSubjectSelect.value;
      mngrSubjectSelect.innerHTML = "";
      
      const uniqueSubjects = [];
      const seenSubjectIds = new Set();
      preTopics.forEach(t => {
        if (!seenSubjectIds.has(t.subId)) {
          seenSubjectIds.add(t.subId);
          uniqueSubjects.push({ id: t.subId, name: t.subName });
        }
      });
      
      uniqueSubjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.innerText = s.name;
        mngrSubjectSelect.appendChild(opt);
      });
      if (prevVal) mngrSubjectSelect.value = prevVal;
    }
    
    if (mngrRenameTopicSelect) {
      const prevVal = mngrRenameTopicSelect.value;
      mngrRenameTopicSelect.innerHTML = '<option value="">-- Select Parent Topic --</option>';
      preTopics.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.innerText = t.name;
        mngrRenameTopicSelect.appendChild(opt);
      });
      if (prevVal) mngrRenameTopicSelect.value = prevVal;
    }

  } catch (err) {
    console.error("Failed to populate ingest topics dropdowns:", err);
  }
}

async function onMngrDelParentChange() {
  const parentId = document.getElementById('mngr-del-parent-select').value;
  const subtopicSelect = document.getElementById('mngr-del-subtopic-select');
  if (!subtopicSelect) return;
  if (!parentId) {
    subtopicSelect.innerHTML = '<option value="">-- Select Subtopic --</option>';
    return;
  }
  
  try {
    const res = await fetch(`${getApiBase()}/minute-topics?topic_id=${parentId}&language=EN`);
    if (res.ok) {
      const data = await res.json();
      subtopicSelect.innerHTML = '<option value="">-- Select Subtopic --</option>';
      data.minuteTopics.forEach(mt => {
        const opt = document.createElement('option');
        opt.value = mt.minute_topic_id;
        opt.innerText = mt.minute_topic_name;
        subtopicSelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.error("Failed to fetch delete subtopics list:", e);
  }
}

async function createSubtopic(lang) {
  const topicId = document.getElementById('mngr-parent-topic-select').value;
  const name = document.getElementById('mngr-subtopic-name-input').value.trim();
  if (!topicId || !name) {
    alert("Please select a topic and enter a subtopic name.");
    return;
  }
  
  logAdmin(`Creating subtopic '${name}' in ${lang}...`);
  try {
    const res = await fetch(`${getApiBase()}/admin/create-minute-topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, name, language: lang })
    });
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Success] ${data.message}`);
      alert("Subtopic created successfully.");
      document.getElementById('mngr-subtopic-name-input').value = "";
      await loadAdminPortal();
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (e) {
    alert("Failed: " + e.message);
  }
}

async function deleteSubtopic() {
  const minuteTopicId = document.getElementById('mngr-del-subtopic-select').value;
  if (!minuteTopicId) {
    alert("Please select a subtopic to delete.");
    return;
  }
  
  if (!confirm("Warning: Deleting this subtopic will permanently remove all of its questions from the database. This action cannot be undone. Are you sure?")) {
    return;
  }
  
  logAdmin(`Deleting subtopic ID ${minuteTopicId}...`);
  try {
    const res = await fetch(`${getApiBase()}/admin/delete-minute-topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minuteTopicId })
    });
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Success] ${data.message}`);
      alert("Subtopic deleted successfully.");
      
      document.getElementById('mngr-del-parent-select').value = "";
      document.getElementById('mngr-del-subtopic-select').innerHTML = '<option value="">-- Select Subtopic --</option>';
      
      await loadAdminPortal();
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (e) {
    alert("Failed: " + e.message);
  }
}

async function createParentTopic() {
  const subjectId = document.getElementById('mngr-subject-select').value;
  const name = document.getElementById('mngr-topic-name-input').value.trim();
  if (!subjectId || !name) {
    alert("Please select a subject and enter a topic name.");
    return;
  }
  
  logAdmin(`Creating parent topic '${name}' under subject ID ${subjectId}...`);
  try {
    const res = await fetch(`${getApiBase()}/admin/create-topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, name })
    });
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Success] ${data.message}`);
      alert("Parent topic created successfully.");
      document.getElementById('mngr-topic-name-input').value = "";
      await loadAdminPortal();
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (e) {
    alert("Failed: " + e.message);
  }
}

function onMngrRenameTypeChange() {
  const type = document.getElementById('mngr-rename-type-select').value;
  const subtopicRow = document.getElementById('mngr-rename-subtopic-row');
  if (type === 'subtopic') {
    subtopicRow.style.display = 'block';
  } else {
    subtopicRow.style.display = 'none';
  }
}

async function onMngrRenameTopicChange() {
  const parentId = document.getElementById('mngr-rename-topic-select').value;
  const subtopicSelect = document.getElementById('mngr-rename-subtopic-select');
  if (!subtopicSelect) return;
  if (!parentId) {
    subtopicSelect.innerHTML = '<option value="">-- Select Subtopic --</option>';
    return;
  }
  
  try {
    const res = await fetch(`${getApiBase()}/minute-topics?topic_id=${parentId}&language=EN`);
    if (res.ok) {
      const data = await res.json();
      subtopicSelect.innerHTML = '<option value="">-- Select Subtopic --</option>';
      data.minuteTopics.forEach(mt => {
        const opt = document.createElement('option');
        opt.value = mt.minute_topic_id;
        opt.innerText = mt.minute_topic_name;
        subtopicSelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.error("Failed to fetch subtopics list for rename:", e);
  }
}

async function renameSyllabusItem() {
  const type = document.getElementById('mngr-rename-type-select').value;
  const topicId = document.getElementById('mngr-rename-topic-select').value;
  const subtopicId = document.getElementById('mngr-rename-subtopic-select').value;
  const newName = document.getElementById('mngr-rename-name-input').value.trim();
  
  if (!newName) {
    alert("Please enter a new name.");
    return;
  }
  
  let targetId = null;
  if (type === 'topic') {
    if (!topicId) {
      alert("Please select a topic to rename.");
      return;
    }
    targetId = topicId;
  } else {
    if (!subtopicId) {
      alert("Please select a subtopic to rename.");
      return;
    }
    targetId = subtopicId;
  }
  
  logAdmin(`Renaming ${type} ID ${targetId} to '${newName}'...`);
  try {
    const res = await fetch(`${getApiBase()}/admin/rename-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id: targetId, newName })
    });
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Success] ${data.message}`);
      alert("Syllabus item renamed successfully.");
      document.getElementById('mngr-rename-name-input').value = "";
      
      document.getElementById('mngr-rename-topic-select').value = "";
      document.getElementById('mngr-rename-subtopic-select').innerHTML = '<option value="">-- Select Subtopic --</option>';
      
      await loadAdminPortal();
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (e) {
    alert("Failed: " + e.message);
  }
}

// Sidebar target sub-topics change handler
async function onSidebarParentTopicChange() {
  const parentId = document.getElementById('ingest-topic-select').value;
  const subtopicSelect = document.getElementById('ingest-subtopic-select');
  if (!parentId || !subtopicSelect) return;

  const lang = document.getElementById('ingest-lang-select').value;
  try {
    const res = await fetch(`${API_BASE}/minute-topics?topic_id=${parentId}&language=${lang}`, {
      headers: { 'x-user-mobile': '9876543210' }
    });
    if (res.ok) {
      const data = await res.json();
      subtopicSelect.innerHTML = '<option value="">-- No Sub-topic (Standard Topic) --</option>';
      data.minuteTopics.forEach(mt => {
        const opt = document.createElement('option');
        opt.value = mt.minute_topic_id;
        const count = (mt.q_count || 0) + (mt.mq_count || 0);
        opt.innerText = `${mt.minute_topic_name} (Qs: ${count})`;
        subtopicSelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.error("Failed to fetch minute topics in sidebar:", e);
  }
}

// Subtopic Ingestion: Parent topic selection change handler
async function onAdminParentTopicChange() {
  const parentId = document.getElementById('admin-subtopic-parent-select').value;
  const subtopicSelect = document.getElementById('admin-subtopic-select');
  if (!parentId || !subtopicSelect) return;

  const lang = document.getElementById('admin-subtopic-lang-select').value;
  try {
    const res = await fetch(`${API_BASE}/minute-topics?topic_id=${parentId}&language=${lang}`, {
      headers: { 'x-user-mobile': '9876543210' }
    });
    if (res.ok) {
      const data = await res.json();
      subtopicSelect.innerHTML = '<option value="">-- Select Sub-topic --</option>';
      data.minuteTopics.forEach(mt => {
        const opt = document.createElement('option');
        opt.value = mt.minute_topic_id;
        const count = (mt.q_count || 0) + (mt.mq_count || 0);
        opt.innerText = `${mt.minute_topic_name} (Qs: ${count})`;
        subtopicSelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.error("Failed to fetch minute topics in admin panel:", e);
  }
}

// Mains Ingestion: Parent topic selection change handler for Mains subtopics
async function onAdminMainsSubtopicParentChange() {
  const parentId = document.getElementById('admin-mains-subtopic-parent-select').value;
  const subtopicSelect = document.getElementById('admin-mains-subtopic-select');
  if (!parentId || !subtopicSelect) return;

  const lang = document.getElementById('admin-mains-subtopic-lang-select').value;
  try {
    const res = await fetch(`${API_BASE}/minute-topics?topic_id=${parentId}&language=${lang}`, {
      headers: { 'x-user-mobile': '9876543210' }
    });
    if (res.ok) {
      const data = await res.json();
      subtopicSelect.innerHTML = '<option value="">-- Select Sub-topic --</option>';
      data.minuteTopics.forEach(mt => {
        const opt = document.createElement('option');
        opt.value = mt.minute_topic_id;
        opt.innerText = `${mt.minute_topic_name} (Qs: ${mt.mq_count || 0})`;
        subtopicSelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.error("Failed to fetch minute topics in admin mains subtopics panel:", e);
  }
}

// Create new sub-topic in database
async function createSubtopicEntry() {
  const parentId = document.getElementById('admin-subtopic-parent-select').value;
  const name = document.getElementById('admin-new-subtopic-name').value.trim();
  const lang = document.getElementById('admin-subtopic-lang-select').value;
  if (!parentId || !name) {
    alert("Please select a parent topic and enter a sub-topic name.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/create-minute-topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId: parentId, name: name, language: lang })
    });
    if (res.ok) {
      alert("Sub-topic entry added successfully!");
      document.getElementById('admin-new-subtopic-name').value = "";
      onAdminParentTopicChange();
    }
  } catch (e) {
    alert("Failed to create subtopic: " + e.message);
  }
}

async function createMainsSubtopicEntry() {
  const parentId = document.getElementById('admin-mains-subtopic-parent-select').value;
  const name = document.getElementById('admin-new-mains-subtopic-name').value.trim();
  const lang = document.getElementById('admin-mains-subtopic-lang-select').value;
  if (!parentId || !name) {
    alert("Please select a parent topic and enter a sub-topic name.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/create-minute-topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId: parentId, name: name, language: lang })
    });
    if (res.ok) {
      alert("Mains sub-topic entry added successfully!");
      document.getElementById('admin-new-mains-subtopic-name').value = "";
      onAdminMainsSubtopicParentChange();
      loadAdminPortal();
    }
  } catch (e) {
    alert("Failed to create Mains subtopic: " + e.message);
  }
}

// Pre Topic MCQ templates
function downloadPreTopicTemplate() {
  const select = document.getElementById('admin-pre-topic-select');
  const opt = select.options[select.selectedIndex];
  if (!opt) return;
  const topicId = opt.value;
  const subjectId = opt.dataset.subjectId;
  const language = document.getElementById('admin-pre-lang-select').value;
  logAdmin(`Downloading Pre MCQ template for Topic ID ${topicId} (${language})...`);
  window.open(`${API_BASE}/admin/download-template?subject_id=${subjectId}&topic_id=${topicId}&language=${language}`);
}

function downloadSampleTemplate(type, language) {
  logAdmin(`Downloading sample ${type} template in ${language}...`);
  if (type === 'PRE') {
    window.open(`${API_BASE}/admin/download-template?language=${language}`);
  } else {
    window.open(`${API_BASE}/admin/download-mains-template?language=${language}`);
  }
}

async function uploadPreTopicQuestions(input) {
  const file = input.files[0];
  const select = document.getElementById('admin-pre-topic-select');
  const topicId = select.value;
  const language = document.getElementById('admin-pre-lang-select').value;
  if (!file) return;

  logAdmin(`Uploading questions DOCX for Topic ID ${topicId} in ${language}...`);
  const formData = new FormData();
  formData.append('topicId', topicId);
  formData.append('language', language);
  formData.append('questionsFile', file);

  try {
    const res = await fetch(`${API_BASE}/admin/upload-questions`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Ingestion Success] ${data.message}`);
      alert(data.message);
      loadAdminPortal();
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (err) {
    alert("Upload failed: " + err.message);
  }
}

async function clearPreTopicQuestions() {
  const select = document.getElementById('admin-pre-topic-select');
  const topicId = select.value;
  if (!topicId) return;
  if (!confirm("Are you sure you want to clear all questions for this topic?")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/clear-topic-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId })
    });
    if (res.ok) {
      alert("Cleared successfully.");
      loadAdminPortal();
    }
  } catch (e) {
    alert("Failed to clear questions: " + e.message);
  }
}

// Subtopic MCQ uploads
async function uploadSubtopicQuestions(input) {
  const file = input.files[0];
  const minuteTopicId = document.getElementById('admin-subtopic-select').value;
  const language = document.getElementById('admin-subtopic-lang-select').value;
  if (!file || !minuteTopicId) {
    alert("Please select a sub-topic first.");
    return;
  }

  logAdmin(`Uploading Subtopic MCQs for Subtopic ID ${minuteTopicId} in ${language}...`);
  const formData = new FormData();
  formData.append('minuteTopicId', minuteTopicId);
  formData.append('language', language);
  formData.append('questionsFile', file);

  try {
    const res = await fetch(`${API_BASE}/admin/upload-questions`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Subtopic Ingest Success] ${data.message}`);
      if (data.saved_file_path) {
        logAdmin(`[Backup Saved] Backup copy saved locally at: ${data.saved_file_path}`);
      }
      alert(data.message);
      loadAdminPortal();
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (err) {
    alert("Upload failed: " + err.message);
  }
}

async function clearSubtopicQuestions() {
  const minuteTopicId = document.getElementById('admin-subtopic-select').value;
  if (!minuteTopicId) return;
  if (!confirm("Are you sure you want to clear all questions for this sub-topic?")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/clear-minute-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minuteTopicId })
    });
    if (res.ok) {
      alert("Cleared successfully.");
      loadAdminPortal();
    }
  } catch (e) {
    alert("Failed to clear questions: " + e.message);
  }
}

// Mains Descriptive uploads
function downloadMainsTopicTemplate() {
  const select = document.getElementById('admin-mains-topic-select');
  const opt = select.options[select.selectedIndex];
  if (!opt) return;
  const topicId = opt.value;
  const subjectId = opt.dataset.subjectId;
  const language = document.getElementById('admin-mains-lang-select').value;
  logAdmin(`Downloading Mains template for Topic ID ${topicId} (${language})...`);
  window.open(`${API_BASE}/admin/download-mains-template?subject_id=${subjectId}&topic_id=${topicId}&language=${language}`);
}

async function uploadMainsTopicQuestions(input) {
  const file = input.files[0];
  const select = document.getElementById('admin-mains-topic-select');
  const topicId = select.value;
  const language = document.getElementById('admin-mains-lang-select').value;
  if (!file) return;

  logAdmin(`Uploading Mains Q&A for Topic ID ${topicId} in ${language}...`);
  const formData = new FormData();
  formData.append('topicId', topicId);
  formData.append('language', language);
  formData.append('questionsFile', file);

  try {
    const res = await fetch(`${API_BASE}/admin/upload-mains-questions`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Mains Ingest Success] ${data.message}`);
      if (data.saved_file_path) {
        logAdmin(`[Backup Saved] Backup copy saved locally at: ${data.saved_file_path}`);
      }
      alert(data.message);
      loadAdminPortal();
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (err) {
    alert("Upload failed: " + err.message);
  }
}

async function clearMainsTopicQuestions() {
  const select = document.getElementById('admin-mains-topic-select');
  const topicId = select.value;
  if (!topicId) return;
  if (!confirm("Are you sure you want to clear all Mains questions for this topic?")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/clear-mains-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId })
    });
    if (res.ok) {
      alert("Cleared successfully.");
      loadAdminPortal();
    }
  } catch (e) {
    alert("Failed to clear Mains questions: " + e.message);
  }
}

async function deleteSubtopicEntry() {
  const minuteTopicId = document.getElementById('admin-subtopic-select').value;
  if (!minuteTopicId) {
    alert("Please select a sub-topic to delete first.");
    return;
  }
  if (!confirm("Are you sure you want to delete this sub-topic and all its questions? This cannot be undone.")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/delete-minute-topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minuteTopicId })
    });
    if (res.ok) {
      alert("Sub-topic deleted successfully.");
      onAdminParentTopicChange(); // refresh dropdown list
      loadAdminPortal(); // refresh stats
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (e) {
    alert("Failed to delete subtopic: " + e.message);
  }
}

function downloadMainsSubtopicTemplate() {
  const select = document.getElementById('admin-mains-subtopic-parent-select');
  const opt = select.options[select.selectedIndex];
  if (!opt) return;
  const topicId = opt.value;
  const subjectId = opt.dataset.subjectId;
  const language = document.getElementById('admin-mains-subtopic-lang-select').value;
  logAdmin(`Downloading Mains Subtopic template for Topic ID ${topicId} (${language})...`);
  window.open(`${API_BASE}/admin/download-mains-template?subject_id=${subjectId}&topic_id=${topicId}&language=${language}`);
}

async function uploadMainsSubtopicQuestions(input) {
  const file = input.files[0];
  const select = document.getElementById('admin-mains-subtopic-parent-select');
  const opt = select.options[select.selectedIndex];
  if (!opt) return;
  const topicId = opt.value;
  const minuteTopicId = document.getElementById('admin-mains-subtopic-select').value;
  const language = document.getElementById('admin-mains-subtopic-lang-select').value;
  if (!file || !minuteTopicId) {
    alert("Please select a parent topic and a sub-topic first.");
    return;
  }

  logAdmin(`Uploading Mains Subtopic Q&A for Topic ID ${topicId} (Subtopic: ${minuteTopicId}) in ${language}...`);
  const formData = new FormData();
  formData.append('topicId', topicId);
  formData.append('minuteTopicId', minuteTopicId);
  formData.append('language', language);
  formData.append('questionsFile', file);

  try {
    const res = await fetch(`${API_BASE}/admin/upload-mains-questions`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Mains Subtopic Ingest Success] ${data.message}`);
      if (data.saved_file_path) {
        logAdmin(`[Backup Saved] Backup copy saved locally at: ${data.saved_file_path}`);
      }
      alert(data.message);
      loadAdminPortal();
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (err) {
    alert("Upload failed: " + err.message);
  }
}

async function clearMainsSubtopicQuestions() {
  const minuteTopicId = document.getElementById('admin-mains-subtopic-select').value;
  if (!minuteTopicId) return;
  if (!confirm("Are you sure you want to clear all Mains questions for this sub-topic?")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/clear-minute-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minuteTopicId })
    });
    if (res.ok) {
      alert("Cleared successfully.");
      loadAdminPortal();
    }
  } catch (e) {
    alert("Failed to clear Mains questions: " + e.message);
  }
}

async function deleteMainsSubtopicEntry() {
  const minuteTopicId = document.getElementById('admin-mains-subtopic-select').value;
  if (!minuteTopicId) {
    alert("Please select a sub-topic to delete first.");
    return;
  }
  if (!confirm("Are you sure you want to delete this Mains sub-topic and all its questions? This cannot be undone.")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/delete-minute-topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minuteTopicId })
    });
    if (res.ok) {
      alert("Mains sub-topic deleted successfully.");
      onAdminMainsSubtopicParentChange(); // refresh dropdown list
      loadAdminPortal(); // refresh stats
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (e) {
    alert("Failed to delete subtopic: " + e.message);
  }
}

// --- Database Question Manager & Editor Logic ---
let managerQuestionsData = [];

async function onManagerSourceChange() {
  const source = document.getElementById('manager-source-select').value;
  const select = document.getElementById('manager-topic-select');
  if (!select) return;
  select.innerHTML = "Loading...";

  try {
    if (source === 'EXAMS') {
      const res = await fetch(`${API_BASE}/pyqs`, {
        headers: { 'x-user-mobile': appState.userMobile || '9876543210' }
      });
      if (res.ok) {
        const data = await res.json();
        select.innerHTML = "";
        data.exams.forEach(exam => {
          const opt = document.createElement('option');
          opt.value = exam.exam_id;
          opt.innerText = `[${exam.tier_type}] ${exam.exam_name} (${exam.exam_year})`;
          select.appendChild(opt);
        });
      }
    } else {
      const tier = source === 'PRE_TOPICS' ? 'PRE' : 'MAINS';
      const res = await fetch(`${API_BASE}/syllabus?tier=${tier}`, {
        headers: { 'x-user-mobile': "9876543210" }
      });
      if (res.ok) {
        const data = await res.json();
        select.innerHTML = "";
        data.subjects.forEach(sub => {
          sub.units.forEach(unit => {
            unit.topics.forEach(t => {
              const opt = document.createElement('option');
              opt.value = t.topic_id;
              opt.innerText = `[${tier}] ${sub.subject_name.substring(0, 15)}... -> ${t.topic_name}`;
              select.appendChild(opt);
            });
          });
        });
      }
    }
  } catch (e) {
    console.error("Failed to change manager source:", e);
    select.innerHTML = "<option>Error loading</option>";
  }
}

async function loadManagerQuestions() {
  const source = document.getElementById('manager-source-select').value;
  const targetId = document.getElementById('manager-topic-select').value;
  const language = document.getElementById('manager-lang-select').value;
  const listContainer = document.getElementById('manager-questions-list');

  if (!targetId) {
    listContainer.innerHTML = '<div style="color: #EF4444; text-align: center; padding: 12px 0;">Please select a topic/exam first.</div>';
    return;
  }

  listContainer.innerHTML = '<div style="color: var(--color-text-muted); text-align: center; padding: 12px 0;">Loading questions...</div>';

  try {
    const res = await fetch(`${API_BASE}/admin/questions?source=${source}&targetId=${targetId}&language=${language}`);
    if (res.ok) {
      const data = await res.json();
      managerQuestionsData = data.questions;
      renderManagerQuestionsList(source);
    } else {
      const err = await res.json();
      listContainer.innerHTML = `<div style="color: #EF4444; text-align: center; padding: 12px 0;">Error: ${err.error}</div>`;
    }
  } catch (e) {
    listContainer.innerHTML = `<div style="color: #EF4444; text-align: center; padding: 12px 0;">Network error: ${e.message}</div>`;
  }
}

function renderManagerQuestionsList(source) {
  const listContainer = document.getElementById('manager-questions-list');
  listContainer.innerHTML = "";

  if (managerQuestionsData.length === 0) {
    listContainer.innerHTML = '<div style="color: var(--color-text-muted); text-align: center; padding: 12px 0;">No questions found.</div>';
    return;
  }

  managerQuestionsData.forEach((q, idx) => {
    const qid = q.question_id || q.mains_question_id || q.pyq_question_id;
    const item = document.createElement('div');
    item.id = `manager-item-${qid}`;
    item.style.padding = "8px";
    item.style.background = "rgba(255,255,255,0.02)";
    item.style.border = "1px solid rgba(255,255,255,0.05)";
    item.style.borderRadius = "var(--radius-xs)";
    item.style.display = "flex";
    item.style.flexDirection = "column";
    item.style.gap = "6px";

    // Detect if this question is a Mains / descriptive question (no option_a)
    const isMains = (q.model_answer !== undefined);

    if (isMains) {
      item.innerHTML = `
        <div style="font-weight: bold; color: #C084FC;">Question #${idx + 1} (Mains ID: ${qid})</div>
        <div style="color: white; white-space: pre-wrap;">${q.question_text}</div>
        <div style="color: var(--color-text-muted); background: rgba(0,0,0,0.2); padding: 4px; border-radius: 4px;"><strong>Answer:</strong> ${q.model_answer}</div>
        <div style="display: flex; gap: 6px; margin-top: 4px;">
          <button onclick="editManagerQuestion(${qid}, true)" style="background: var(--color-primary-glow); border: 1px solid var(--color-primary); color: white; padding: 4px 8px; border-radius: var(--radius-xs); cursor: pointer; font-size: 10px;">Edit</button>
          <button onclick="deleteManagerQuestion(${qid}, '${source}')" style="background: rgba(239,68,68,0.15); color: #EF4444; border: 1px solid rgba(239,68,68,0.3); padding: 4px 8px; border-radius: var(--radius-xs); cursor: pointer; font-size: 10px;">Delete</button>
        </div>
      `;
    } else {
      item.innerHTML = `
        <div style="font-weight: bold; color: var(--color-accent);">Question #${idx + 1} (MCQ ID: ${qid})</div>
        <div style="color: white; white-space: pre-wrap;">${q.question_text}</div>
        <div style="font-size: 10px; color: var(--color-text-muted); padding-left: 8px;">
          A) ${q.option_a}<br>B) ${q.option_b}<br>C) ${q.option_c}<br>D) ${q.option_d}
        </div>
        <div style="color: #10B981; font-weight: bold;">Correct: Option ${q.correct_option}</div>
        <div style="color: var(--color-text-muted); font-size: 10px;"><strong>Exp:</strong> ${q.detailed_explanation}</div>
        <div style="display: flex; gap: 6px; margin-top: 4px;">
          <button onclick="editManagerQuestion(${qid}, false)" style="background: var(--color-primary-glow); border: 1px solid var(--color-primary); color: white; padding: 4px 8px; border-radius: var(--radius-xs); cursor: pointer; font-size: 10px;">Edit</button>
          <button onclick="deleteManagerQuestion(${qid}, '${source}')" style="background: rgba(239,68,68,0.15); color: #EF4444; border: 1px solid rgba(239,68,68,0.3); padding: 4px 8px; border-radius: var(--radius-xs); cursor: pointer; font-size: 10px;">Delete</button>
        </div>
      `;
    }

    listContainer.appendChild(item);
  });
}

function editManagerQuestion(qid, isMains) {
  const item = document.getElementById(`manager-item-${qid}`);
  if (!item) return;

  // Find question in local array
  const q = managerQuestionsData.find(x => (x.question_id === qid || x.mains_question_id === qid || x.pyq_question_id === qid));
  if (!q) return;

  if (isMains) {
    item.innerHTML = `
      <div style="font-weight: bold; color: #C084FC;">Edit Mains Question ID: ${qid}</div>
      <div class="input-group" style="margin-bottom: 6px;">
        <label style="font-size: 10px; color: var(--color-text-muted);">Question Text</label>
        <textarea id="edit-qtext-${qid}" rows="3" style="background: var(--color-surface-screen); color: white; border: 1px solid var(--color-card-border); padding: 4px; width: 100%; font-size: 11px;">${q.question_text}</textarea>
      </div>
      <div class="input-group" style="margin-bottom: 6px;">
        <label style="font-size: 10px; color: var(--color-text-muted);">Model Answer</label>
        <textarea id="edit-modelans-${qid}" rows="4" style="background: var(--color-surface-screen); color: white; border: 1px solid var(--color-card-border); padding: 4px; width: 100%; font-size: 11px;">${q.model_answer}</textarea>
      </div>
      <div style="display: flex; gap: 6px;">
        <button onclick="saveManagerQuestion(${qid}, true)" style="background: #10B981; color: white; border: none; padding: 4px 8px; border-radius: var(--radius-xs); cursor: pointer; font-size: 10px;">Save</button>
        <button onclick="loadManagerQuestions()" style="background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 4px 8px; border-radius: var(--radius-xs); cursor: pointer; font-size: 10px;">Cancel</button>
      </div>
    `;
  } else {
    item.innerHTML = `
      <div style="font-weight: bold; color: var(--color-accent);">Edit MCQ Question ID: ${qid}</div>
      <div class="input-group" style="margin-bottom: 6px;">
        <label style="font-size: 10px; color: var(--color-text-muted);">Question Text</label>
        <textarea id="edit-qtext-${qid}" rows="2" style="background: var(--color-surface-screen); color: white; border: 1px solid var(--color-card-border); padding: 4px; width: 100%; font-size: 11px;">${q.question_text}</textarea>
      </div>
      <div class="input-group" style="margin-bottom: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
        <div>
          <label style="font-size: 9px; color: var(--color-text-muted);">Option A</label>
          <input type="text" id="edit-opta-${qid}" value="${q.option_a}" style="background: var(--color-surface-screen); color: white; border: 1px solid var(--color-card-border); padding: 4px; width: 100%; font-size: 10px;">
        </div>
        <div>
          <label style="font-size: 9px; color: var(--color-text-muted);">Option B</label>
          <input type="text" id="edit-optb-${qid}" value="${q.option_b}" style="background: var(--color-surface-screen); color: white; border: 1px solid var(--color-card-border); padding: 4px; width: 100%; font-size: 10px;">
        </div>
        <div>
          <label style="font-size: 9px; color: var(--color-text-muted);">Option C</label>
          <input type="text" id="edit-optc-${qid}" value="${q.option_c}" style="background: var(--color-surface-screen); color: white; border: 1px solid var(--color-card-border); padding: 4px; width: 100%; font-size: 10px;">
        </div>
        <div>
          <label style="font-size: 9px; color: var(--color-text-muted);">Option D</label>
          <input type="text" id="edit-optd-${qid}" value="${q.option_d}" style="background: var(--color-surface-screen); color: white; border: 1px solid var(--color-card-border); padding: 4px; width: 100%; font-size: 10px;">
        </div>
      </div>
      <div class="input-group" style="margin-bottom: 6px;">
        <label style="font-size: 10px; color: var(--color-text-muted);">Correct Option</label>
        <select id="edit-correct-${qid}" style="background: var(--color-surface-screen); color: white; border: 1px solid var(--color-card-border); padding: 4px; font-size: 10px; border-radius: var(--radius-xs);">
          <option value="A" ${q.correct_option === 'A' ? 'selected' : ''}>Option A</option>
          <option value="B" ${q.correct_option === 'B' ? 'selected' : ''}>Option B</option>
          <option value="C" ${q.correct_option === 'C' ? 'selected' : ''}>Option C</option>
          <option value="D" ${q.correct_option === 'D' ? 'selected' : ''}>Option D</option>
        </select>
      </div>
      <div class="input-group" style="margin-bottom: 6px;">
        <label style="font-size: 10px; color: var(--color-text-muted);">Explanation</label>
        <textarea id="edit-explanation-${qid}" rows="2" style="background: var(--color-surface-screen); color: white; border: 1px solid var(--color-card-border); padding: 4px; width: 100%; font-size: 11px;">${q.detailed_explanation}</textarea>
      </div>
      <div style="display: flex; gap: 6px;">
        <button onclick="saveManagerQuestion(${qid}, false)" style="background: #10B981; color: white; border: none; padding: 4px 8px; border-radius: var(--radius-xs); cursor: pointer; font-size: 10px;">Save</button>
        <button onclick="loadManagerQuestions()" style="background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 4px 8px; border-radius: var(--radius-xs); cursor: pointer; font-size: 10px;">Cancel</button>
      </div>
    `;
  }
}

async function saveManagerQuestion(qid, isMains) {
  const source = document.getElementById('manager-source-select').value;
  const questionText = document.getElementById(`edit-qtext-${qid}`).value.trim();

  if (!questionText) {
    alert("Question text is required.");
    return;
  }

  const payload = {
    source,
    questionId: qid,
    questionText
  };

  if (isMains) {
    payload.modelAnswer = document.getElementById(`edit-modelans-${qid}`).value.trim();
  } else {
    payload.optionA = document.getElementById(`edit-opta-${qid}`).value.trim();
    payload.optionB = document.getElementById(`edit-optb-${qid}`).value.trim();
    payload.optionC = document.getElementById(`edit-optc-${qid}`).value.trim();
    payload.optionD = document.getElementById(`edit-optd-${qid}`).value.trim();
    payload.correctOption = document.getElementById(`edit-correct-${qid}`).value;
    payload.detailedExplanation = document.getElementById(`edit-explanation-${qid}`).value.trim();
  }

  try {
    const res = await fetch(`${API_BASE}/admin/update-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("Question updated successfully.");
      loadManagerQuestions();
      loadAdminPortal(); // refresh counts
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (e) {
    alert("Network error: " + e.message);
  }
}

async function deleteManagerQuestion(qid, source) {
  if (!confirm("Are you sure you want to delete this question? This cannot be undone.")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/delete-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: qid, source })
    });

    if (res.ok) {
      alert("Question deleted successfully.");
      loadManagerQuestions();
      loadAdminPortal(); // refresh counts
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (e) {
    alert("Network error: " + e.message);
  }
}

// --- Student Language & Help Modal Controllers ---
function toggleSimulatorLanguage() {
  if (!appState.language) appState.language = 'EN';
  appState.language = appState.language === 'EN' ? 'HI' : 'EN';
  
  const toggleBtn = document.getElementById('sim-lang-toggle');
  if (toggleBtn) {
    toggleBtn.innerText = appState.language === 'EN' ? 'हिन्दी' : 'English';
  }
  
  // Translate title
  const portalTitle = document.getElementById('sim-portal-title');
  if (portalTitle) {
    portalTitle.innerText = appState.language === 'EN' ? 'Select Exam Portal' : 'परीक्षा पोर्टल चुनें';
  }
  
  // Translate pre/mains titles in the cards if present
  const preBtn = document.getElementById('tier-pre-btn');
  if (preBtn) {
    const h3 = preBtn.querySelector('h3');
    const p = preBtn.querySelector('p');
    if (h3) h3.innerText = appState.language === 'EN' ? 'RAS Pre Portal' : 'आरएएस प्री पोर्टल';
    if (p) p.innerText = appState.language === 'EN' 
      ? 'Complete, Subject, Topic & Subtopic mock practice tests with detailed solutions, along with Past Years Questions (PYQ) study sets.' 
      : 'विस्तृत समाधान के साथ संपूर्ण, विषय, टॉपिक और सब-टॉपिक अभ्यास टेस्ट, एवं पिछले वर्षों के प्रश्नों (PYQ) का अध्ययन।';
  }
  const mainsBtn = document.getElementById('tier-mains-btn');
  if (mainsBtn) {
    const h3 = mainsBtn.querySelector('h3');
    const p = mainsBtn.querySelector('p');
    if (h3) h3.innerText = appState.language === 'EN' ? 'RAS Mains Portal' : 'आरएएस मुख्य पोर्टल';
    if (p) p.innerText = appState.language === 'EN' 
      ? 'General Studies I-IV descriptive syllabus coverage, expert model answers study guides, and Past Years Questions (PYQ) revision.' 
      : 'सामान्य अध्ययन I-IV वर्णनात्मक पाठ्यक्रम, विशेषज्ञ मॉडल उत्तर अध्ययन गाइड, एवं पिछले वर्षों के प्रश्नों (PYQ) का पुनरीक्षण।';
  }
  
  // Update configurator terminology
  updateSimulatorTerminology(appState.selectedTier);

  // Update Help modal text
  const helpTitle = document.getElementById('student-help-title');
  const helpDesc = document.getElementById('student-help-desc');
  const helpInput = document.getElementById('student-help-input');
  if (helpTitle) helpTitle.innerText = appState.language === 'EN' ? '❓ RPSC Help Desk' : '❓ आरपीएससी सहायता डेस्क';
  if (helpDesc) helpDesc.innerText = appState.language === 'EN' 
    ? 'Submit your syllabus doubts or technical difficulties. Our experts will resolve it shortly.' 
    : 'अपनी शंका या तकनीकी कठिनाई यहाँ लिखें। हमारे विशेषज्ञ इसका शीघ्र ही समाधान करेंगे।';
  if (helpInput) helpInput.placeholder = appState.language === 'EN' ? 'Write your doubt here...' : 'यहाँ अपनी शंका लिखें...';

  logSystem(`Simulator language toggled to: ${appState.language}`);
}

function openStudentHelpModal() {
  const modal = document.getElementById('student-help-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeStudentHelpModal() {
  const modal = document.getElementById('student-help-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.getElementById('student-help-input').value = "";
  }
}

async function submitStudentHelpQuery() {
  const queryText = document.getElementById('student-help-input').value.trim();
  const isHi = appState.language === 'HI';
  
  if (!queryText) {
    alert(isHi ? "कृपया पहले अपनी शंका लिखें।" : "Please enter your query text first.");
    return;
  }

  logSystem("Submitting student help query to backend support ticket desk...");

  try {
    const res = await fetch(`${API_BASE}/support/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-mobile': appState.userMobile || '9876543210'
      },
      body: JSON.stringify({
        userId: appState.userId || 1,
        queryText: queryText
      })
    });

    if (res.ok) {
      alert(isHi ? "आपकी शंका दर्ज कर ली गई है!" : "Your query has been submitted to experts successfully. We will resolve it soon!");
      closeStudentHelpModal();
      loadAdminPortal(); // refresh queries list in admin sidebar
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (e) {
    alert("Network error: " + e.message);
  }
}

// Dynamic Server Switcher
function initSimulatorServerConfig() {
  const select = document.getElementById('simulator-server-select');
  const customContainer = document.getElementById('simulator-custom-server-container');
  const customInput = document.getElementById('simulator-custom-server-input');
  const display = document.getElementById('connected-server-text');

  if (!select) return;

  const current = localStorage.getItem('sim_api_base_url');
  
  if (!current) {
    select.value = 'local';
    display.textContent = API_BASE;
  } else if (current === 'https://rpsc-ras-backend.onrender.com/api') {
    select.value = 'cloud';
    display.textContent = current;
  } else {
    select.value = 'custom';
    customContainer.style.display = 'block';
    customInput.value = current;
    display.textContent = current;
  }
}

function updateSimulatorServer(type) {
  const customContainer = document.getElementById('simulator-custom-server-container');
  
  if (type === 'local') {
    customContainer.style.display = 'none';
    localStorage.removeItem('sim_api_base_url');
    window.location.reload();
  } else if (type === 'cloud') {
    customContainer.style.display = 'none';
    localStorage.setItem('sim_api_base_url', 'https://rpsc-ras-backend.onrender.com/api');
    window.location.reload();
  } else {
    customContainer.style.display = 'block';
  }
}

function saveCustomSimulatorServer() {
  const url = document.getElementById('simulator-custom-server-input').value.trim();
  if (!url) return alert("Please enter a valid URL.");
  localStorage.setItem('sim_api_base_url', url);
  window.location.reload();
}

async function initScreenshotSetting() {
  try {
    const res = await fetch(getApiBase() + '/settings');
    if (res.ok) {
      const data = await res.json();
      updateScreenshotUI(data.allowScreenshots);
      
      // Update Practice Limit UI inputs
      if (document.getElementById('limit-complete-input')) {
        document.getElementById('limit-complete-input').value = data.maxCompleteCount || 200;
        document.getElementById('limit-subject-input').value = data.maxSubjectCount || 150;
        document.getElementById('limit-topic-input').value = data.maxTopicCount || 100;
        document.getElementById('limit-subtopic-input').value = data.maxSubtopicCount || 50;
      }
    }
  } catch (err) {
    console.error("Failed to load screenshot settings:", err.message);
  }
}

async function savePracticeLimits() {
  try {
    const maxCompleteCount = document.getElementById('limit-complete-input').value;
    const maxSubjectCount = document.getElementById('limit-subject-input').value;
    const maxTopicCount = document.getElementById('limit-topic-input').value;
    const maxSubtopicCount = document.getElementById('limit-subtopic-input').value;

    logAdmin("Updating practice limit settings...");
    const res = await fetch(getApiBase() + '/admin/update-limits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxCompleteCount,
        maxSubjectCount,
        maxTopicCount,
        maxSubtopicCount
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Success] Saved practice limits. Complete: ${data.maxCompleteCount}, Subject: ${data.maxSubjectCount}, Topic: ${data.maxTopicCount}, Subtopic: ${data.maxSubtopicCount}`);
      alert("Practice limits updated successfully.");
    } else {
      alert("Failed to update practice limits.");
    }
  } catch (e) {
    alert("Connection error: " + e.message);
  }
}

async function toggleScreenshots() {
  try {
    const btn = document.getElementById('toggle-screenshots-btn');
    if (btn) btn.disabled = true;
    
    const res = await fetch(getApiBase() + '/admin/toggle-screenshots', {
      method: 'POST'
    });
    if (res.ok) {
      const data = await res.json();
      updateScreenshotUI(data.allowScreenshots);
    } else {
      alert("Failed to toggle screenshot setting.");
    }
  } catch (err) {
    console.error("Error toggling screenshot setting:", err.message);
    alert("Connection error toggle setting.");
  } finally {
    const btn = document.getElementById('toggle-screenshots-btn');
    if (btn) btn.disabled = false;
  }
}

async function deleteAllQuestions() {
  if (!confirm("Are you absolutely sure you want to delete ALL questions, Mains Q&As, PYQs, and quiz history from the database? This cannot be undone!")) {
    return;
  }
  
  logAdmin("Deleting all questions from database...");
  try {
    const res = await fetch(getApiBase() + '/admin/clear-all-questions', {
      method: 'POST'
    });
    if (res.ok) {
      const data = await res.json();
      logAdmin(`[Success] ${data.message}`);
      alert(data.message);
      // Refresh stats
      loadAdminPortal();
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  } catch (e) {
    alert("Failed to clear database: " + e.message);
  }
}

function updateScreenshotUI(allowScreenshots) {
  const btn = document.getElementById('toggle-screenshots-btn');
  const statusTxt = document.getElementById('screenshot-status-text');
  if (!btn || !statusTxt) return;

  if (allowScreenshots) {
    statusTxt.textContent = 'ALLOWED (Screenshots Enabled)';
    statusTxt.style.color = '#10B981'; // Green
    btn.textContent = 'Block Screenshots (Enable Protection)';
    btn.style.backgroundColor = '#EF4444'; // Red
    btn.style.color = 'white';
  } else {
    statusTxt.textContent = 'BLOCKED (Screenshots Disabled)';
    statusTxt.style.color = '#EF4444'; // Red
    btn.textContent = 'Allow Screenshots (Disable Protection)';
    btn.style.backgroundColor = '#10B981'; // Green
    btn.style.color = 'black';
  }
}

// Call on startup
document.addEventListener('DOMContentLoaded', () => {
  initSimulatorServerConfig();
  initScreenshotSetting();
});
// Fallback in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initSimulatorServerConfig();
  initScreenshotSetting();
}
