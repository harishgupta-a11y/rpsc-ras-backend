// RPSC RAS Prelims Syllabus & Question Bank Database
// Loaded directly into the uvPrep simulator for offline execution

const SYLLABUS_DATA = {
  PRE: [
    {
      subject_id: 1,
      subject_name: "History, Art, Culture & Heritage of Rajasthan",
      topics: [
        { topic_id: 101, topic_name: "Pre-historic sites & ancient historical centers (Kalibangan, Ahar, Bairat)" },
        { topic_id: 102, topic_name: "Major Dynasties & administration (Guhil, Chauhan, Rathore, Kachchawa)" },
        { topic_id: 103, topic_name: "1857 Revolt in Rajasthan & peasant/tribal movements" },
        { topic_id: 104, topic_name: "Folk arts, crafts, architecture (forts, palaces), folk deities & fairs" }
      ]
    },
    {
      subject_id: 2,
      subject_name: "Indian History",
      topics: [
        { topic_id: 201, topic_name: "Indus & Vedic Civilizations, Buddhism, Jainism, and Dynasties" },
        { topic_id: 202, topic_name: "Mughal & Sultanate periods, Bhakti & Sufi movements" },
        { topic_id: 203, topic_name: "Socio-religious reform movements & National Freedom Struggle" }
      ]
    },
    {
      subject_id: 3,
      subject_name: "Geography (World, India & Rajasthan)",
      topics: [
        { topic_id: 301, topic_name: "Major World and Indian physical features & Climate systems" },
        { topic_id: 302, topic_name: "Rajasthan Physiographic divisions, drainage (rivers/lakes), soils & climate" },
        { topic_id: 303, topic_name: "Natural resources, minerals, environmental biodiversity & demographic distribution" }
      ]
    },
    {
      subject_id: 4,
      subject_name: "Indian Political System, Governance, & Rajasthan Polity",
      topics: [
        { topic_id: 401, topic_name: "Salient features of Constitution, Preamble, Fundamental Rights & Duties" },
        { topic_id: 402, topic_name: "Parliamentary system, Supreme Court, Constitutional Bodies (Election Commission, CAG)" },
        { topic_id: 403, topic_name: "Rajasthan Administration (Governor, CM, Council, Assembly, High Court, Panchayati Raj)" }
      ]
    }
  ],
  MAINS: [
    {
      subject_id: 9,
      subject_name: "General Studies I (History, Economics, Sociology, Management)",
      topics: [
        { topic_id: 901, topic_name: "Part A: History & Culture of Rajasthan and India" },
        { topic_id: 902, topic_name: "Part B: Global, Indian & Rajasthan Economy" },
        { topic_id: 903, topic_name: "Part C: Sociology, Management, Business Administration & Auditing" }
      ]
    }
  ]
};

// High-fidelity RPSC Theory Database (Pre-populated from Springboard Academy Notes)
const THEORY_DATABASE = {
  104: `# Springboard Academy: Rajasthan Art & Culture Guide
*Reference Notes for IAS & RAS Prelims*

## Chapter 1: The Vikram Samvat Calendar & Festivals
Hindu fairs and festivals in Rajasthan are celebrated according to the **Vikrami Calendar**, which is a lunar-based calendar. To align it with the solar calendar, one additional month (known as **Adhik Mas**) is added every third year.

### The Lunar Months:
1. **Chaitra** (March-April) - *New year begins on Chaitra Shukla Ekam*
2. **Vaishakh** (April-May)
3. **Jyestha** (May-June)
4. **Ashadh** (June-July)
5. **Shrawan** (July-August) - *First festival is Choti Teej (Shrawan Shukla Tritiya)*
6. **Bhadrapad** (August-September) - *Maximum festivals occur in this month*
7. **Ashwin** (September-October)
8. **Kartik** (October-November)
9. **Margashirsh** (November-December) - *No major festivals*
10. **Paush** (December-January) - *No major festivals*
11. **Magh** (January-February)
12. **Falgun** (February-March) - *Last festival is Gangaur (Chaitra Shukla Tritiya)*

> [!NOTE]
> **Teej Tyohara Bavdi, Le Dubi Gangaur:** This Rajasthani proverb means that the cycle of festivals starts with Teej (Shrawan) and ends with Gangaur (Chaitra).

---

## Monthwise Major Festivals

### 1. Shrawan Month (July-August)
#### A. Krishna Paksha (Dark Fortnight)
* **Nag Panchami (5th Day):** Mongoose is worshipped on this day (Nidari Navmi) to protect from snakes.
* **Hariyali Amavasya (15th Day):** Fairs are organized at Fateh Sagar Lake (Udaipur), Kalpavriksha fair (Mangliyawas, Beawar), and Buddha Jauhad (Ganganagar).

#### B. Shukla Paksha (Bright Fortnight)
* **Choti Teej (3rd Day):** Procession of Teej in Jaipur is world-famous. Symbolizes the love of husband and wife. Women wear Leheriya and receive Sinjara (gifts).
* **Raksha Bandhan (15th Day / Purnima):** Also known as Nariyal Purnima. Shravan Kumar is worshipped on this day.

---

### 2. Bhadrapada Month (August-September)
#### A. Krishna Paksha (Dark Fortnight)
* **Badi Teej / Kajali Teej (3rd Day):** Also known as Satudi Teej. The Badi Teej fair of Bundi is famous.
* **Uba-Chhath (6th Day):** Girls stand the entire day and fast for well-qualified husbands.
* **Krishna Janmashtami (8th Day):** Birth anniversary of Lord Krishna.
* **Goganavmi (9th Day):** Worship of Gogaji. Farmers tie 9 knots (Goga Rakhri) on their ploughs.
* **Bachh-Baras (12th Day):** Cow and calf are worshipped. Use of knives is forbidden on this day.
* **Sati Amavasya (15th Day):** Rani Sati fair organized in Jhunjhunu (Her real name was Narayani Devi).

#### B. Shukla Paksha (Bright Fortnight)
* **Baba Ri Beej (2nd Day):** Birth anniversary of Ramdevji. A massive fair is held at Runicha (Jaisalmer) from 2nd to 11th day (Ekadashi).
* **Ganesh Chaturthi (4th Day):** Fairs organized at Ranthambore (Sawai Madhopur) and Chungi Teerth (Jaisalmer).
* **Rishi Panchami (5th Day):** Sapta-Rishi is worshipped. Maheshwari community changes their sacred thread on this day.
* **Radha-Janmashtami (8th Day):** Fair organized at Salemabad (Ajmer), the main center of Nimbark Sect.
* **Teja Dashmi (10th Day):** Commemorates Tejaji. A major cattle fair is organized at Parbatsar (Nagaur).
* **Jal-Jhulni Gyaras (11th Day):** Procession of deities is taken out to water bodies for a holy bath.

---

## Chapter 2: The Panch Peer (Five Folk Deities) of Rajasthan
There are five folk deities (Peers) who are worshipped by both Hindus and Muslims in Rajasthan:
1. **Pabuji Rathore**
2. **Ramdevji Tanwar**
3. **Gogaji Chauhan**
4. **Hadbuji Shankla**
5. **Mehaji Mangalia**

> [!IMPORTANT]
> **Tejaji** is a highly popular folk deity in Rajasthan, but **his name is NOT included** among the Five Peers (Panch Peer).

### 1. Pabuji Rathore (The Camel Protector)
* **Birthplace:** Kolumand (Phalodi district).
* **Family:** Father Dhandal ji, Mother Kamala de.
* **Mare:** Kesar Kalmi (horse of a Charan woman named Deval).
* **Attributes:** Considered the incarnation of Lakshman. Called the 'plague protector' and 'camel deity'. The Raika/Rabari camel-raising caste considers Pabuji as their chief deity.
* **Heroic Death:** Died protecting the cows of Deval against his brother-in-law Jindrao Khinchi at Dechu (Phalodi).
* **Phad Scroll:** Pabuji's Phad is the most popular Phad in Rajasthan. The Bhopa priests of the Bhil caste play the **Ravanahatha** instrument while singing it.

### 2. Ramdevji Tanwar (The Peer of Peers)
* **Birthplace:** Undu Kashmir (Barmer).
* **Family:** Father Ajmal ji, Mother Mainade, Wife Natal De.
* **Guru:** Balinath ji (temple on Masuria Hill, Jodhpur).
* **Attributes:** Incarnation of Lord Krishna. Founded the **Kamadia Sect**. The famous **Terhatali Dance** is performed by women of the Kamadia community during his fair.
* **Literary Work:** He wrote the book **"Chaubis Baaniyan"** (he was a poet-saint).
* **Samadhi:** Took live Samadhi at Ramdevra/Runicha (Jaisalmer) on Bhadrapad Shukla Ekadashi. His foster sister Dalibai took samadhi one day prior.

### 3. Gogaji Chauhan (Jaheer Peer)
* **Birthplace:** Dadreva (Churu).
* **Jaheer Peer:** Title given to him by Mahmud Ghaznavi during their battle.
* **Attributes:** Worshipped as the 'snake protector deity'. His temples (Medi) are built under the **Khejdi** tree.
* **Temples:** The temple of Dadreva is called "Sheersh Medi" (where his head fell), and Gogamedi temple in Hanumangarh is built in "Tomb style" with "Bismillah" inscribed on it.
`,
  201: `# Ancient Indian History Study Guide
*Indus Valley, Vedic Period, Buddhism & Jainism*

### 1. The Indus Valley Civilization (c. 2500 - 1900 BC)
The Harappan Civilization represents the bronze-age urban culture in India. Key features include grid-pattern town planning, advanced underground drainage networks, standard weight systems, and intensive maritime trade relations with Mesopotamia.

### 2. The Vedic Age & Social Assemblies
* **Rigvedic Period (c. 1500 - 1000 BC):** Tribal polity governed by Rajan. Assemblies like **Sabha** (council of elites) and **Samiti** (general assembly of people) exercised democratic checks on the king.
* **Later Vedic Period (c. 1000 - 600 BC):** Rise of territorial Janapadas, decline of assemblies, and emergence of the Varna system mentioned in the Purusha Sukta (10th Mandala of Rigveda).

### 3. Buddhism & Jainism Reform Movements
Emerging in the 6th century BC as a reaction to ritualistic orthodoxies:
* **Buddhism:** Founded by Gautama Buddha teaching the Four Noble Truths and Eightfold Path. Patronized by Mauryan and Kushan empires.
* **Jainism:** Propagated by Vardhamana Mahavira (24th Tirthankara) emphasizing extreme non-violence (Ahimsa) and Anekantavada (multiplicity of viewpoints).
`
};

const STATIC_QUESTION_BANK = {
  // Topic 201: Indus Valley, Vedic Age, Buddhism & Jainism (RPSC Standard Questions)
  201: [
    {
      question: "Which of the following Harappan archaeological sites in India has yielded the earliest evidence of a ploughed field?",
      options: {
        A: "Banawali",
        B: "Kalibangan",
        C: "Rakhigarhi",
        D: "Dholavira"
      },
      correct: "B",
      explanation: "Evidence of a pre-Harappan ploughed field was discovered during excavations at Kalibangan in Hanumangarh district, Rajasthan. It represents the earliest grid-pattern agricultural furrowing found in the ancient world."
    },
    {
      question: "The famous 'Great Bath' of the Indus Valley Civilization was discovered at which of the following Harappan sites?",
      options: {
        A: "Mohenjo-daro",
        B: "Harappa",
        C: "Lothal",
        D: "Chanhudaro"
      },
      correct: "A",
      explanation: "The Great Bath, one of the most famous public structures of the Harappan civilization, was excavated at Mohenjo-daro (now in Sindh, Pakistan). It is made of fine bricks, gypsum mortar, and coated with a thick layer of natural bitumen to prevent water leakage."
    },
    {
      question: "Which Mandala of the Rigveda contains the 'Purusha Sukta' hymn, which mentions the four-fold classification of society (Varnas) for the first time?",
      options: {
        A: "Third Mandala",
        B: "Seventh Mandala",
        C: "Ninth Mandala",
        D: " Tenth Mandala"
      },
      correct: "D",
      explanation: "The Purusha Sukta is the 90th hymn of the 10th Mandala (Book) of the Rigveda. It describes the cosmic creation and states that the four classes (Brahmins, Rajanyas/Kshatriyas, Vaishyas, and Shudras) emerged from the mouth, arms, thighs, and feet of the primeval Purusha."
    },
    {
      question: "In the Early Vedic polity, which democratic assembly was primarily composed of tribal elders, scholars, and nobles?",
      options: {
        A: "Sabha",
        B: "Samiti",
        C: "Vidatha",
        D: "Gana"
      },
      correct: "A",
      explanation: "The Rigveda mentions democratic institutions. While the 'Samiti' was the general assembly representing all people, the 'Sabha' was a smaller council of tribal elders, elites, and judges."
    },
    {
      question: "Where was the First Buddhist Council convened immediately after the Mahaparinirvana of Gautama Buddha?",
      options: {
        A: "Vaishali",
        B: "Pataliputra",
        C: "Rajgriha",
        D: "Kashmir"
      },
      correct: "C",
      explanation: "The First Buddhist Council was held in 483 BC in the Saptaparni Cave at Rajgriha (modern Rajgir, Bihar) shortly after Buddha's death. It was patronized by King Ajatashatru of Haryanka Dynasty and presided over by Mahakassapa."
    },
    {
      question: "The Fourth Buddhist Council, which resulted in the formal division of Buddhism into Hinayana and Mahayana sects, was held during the reign of which king?",
      options: {
        A: "Ashoka Maurya",
        B: "Kanishka",
        C: "Ajatashatru",
        D: "Kalashoka"
      },
      correct: "B",
      explanation: "The Fourth Buddhist Council was convened at Kundalavana in Kashmir under the patronage of King Kanishka of the Kushan Dynasty (around 72 AD), presided over by Vasumitra with Ashvaghosha as vice-president."
    },
    {
      question: "With which of the following animals is the 23rd Jain Tirthankara, Lord Parshvanatha, symbolically associated?",
      options: {
        A: "Bull",
        B: "Lion",
        C: "Serpent",
        D: "Elephant"
      },
      correct: "C",
      explanation: "Lord Parshvanatha is symbolized by the Serpent (Shesha/Snake). The first Tirthankara Rishabhanatha is associated with the Bull, and Vardhamana Mahavira (24th) is symbolized by the Lion."
    },
    {
      question: "Who among the following Maurya emperors abdicated his throne and retired to Shravanabelagola with the Jain saint Bhadrabahu, performing Sallekhana (fasting to death)?",
      options: {
        A: "Chandragupta Maurya",
        B: "Bindusara",
        C: "Ashoka",
        D: "Dasharatha"
      },
      correct: "A",
      explanation: "According to Jain tradition, the founder of the Maurya Empire, Chandragupta Maurya, embraced Jainism under the influence of Acharya Bhadrabahu. He migrated to Chandragiri Hill in Shravanabelagola (Karnataka) and performed the ritualistic fast unto death."
    },
    {
      question: "The famous Allahabad Pillar Inscription (Prayag Prasasti) describing the military conquests and achievements of Samudragupta was composed by which court poet?",
      options: {
        A: "Kalidasa",
        B: "Harishena",
        C: "Ravikirti",
        D: "Banabhatta"
      },
      correct: "B",
      explanation: "The Prayag Prasasti was composed in classical Sanskrit (Champu style) by Harishena, who was the court poet and minister (Sandhivigrahika) of Emperor Samudragupta. It is engraved on an Ashokan sandstone pillar in Allahabad."
    },
    {
      question: "Which of the following dynasties constructed the famous rock-cut monolith temple Kailasanatha Temple at Ellora?",
      options: {
        A: "Rashtrakuta Dynasty",
        B: "Chola Dynasty",
        C: "Pallava Dynasty",
        D: "Chalukya Dynasty"
      },
      correct: "A",
      explanation: "The Kailasanatha Temple (Cave 16) at Ellora was carved out of a single volcanic basalt rock during the 8th century AD, commissioned by King Krishna I of the Rashtrakuta Dynasty."
    }
  ]
};

// Fallback pool of generic questions (shuffled to prevent repetitions)
const GENERIC_QUESTIONS = [
  {
    question: "Under the RPSC negative marking system, what is the penalty logic applied to a single incorrect response?",
    options: {
      A: "Deduction of 1/2 of the question marks",
      B: "Deduction of 1/4 of the question marks",
      C: "Deduction of 1/3 (0.33) of the question marks",
      D: "No negative marking is applied"
    },
    correct: "C",
    explanation: "Standard RPSC guidelines enforce a strict 1/3 negative marking. In RAS Prelims, each question is worth 1.33 marks, and an incorrect response incurs a penalty of 0.44 marks."
  },
  {
    question: "Which of the following bodies is responsible for organizing civil services exams for administrative recruitments in Rajasthan?",
    options: {
      A: "UPSC",
      B: "RPSC",
      C: "Rajasthan Staff Selection Board (RSSB)",
      D: "High Court of Rajasthan"
    },
    correct: "B",
    explanation: "The Rajasthan Public Service Commission (RPSC) is the premier constitutional body authorized to conduct exams for civil services and administrative posts (RAS/RPS/RTS) in Rajasthan."
  },
  {
    question: "Which state government flagship scheme provides cashless medical health insurance cover to families in Rajasthan?",
    options: {
      A: "Bhamashah Yojana",
      B: "Ayushman Bharat",
      C: "Mukhyamantri Chiranjeevi Swasthya Bima Yojana",
      D: "Jan Aadhar Scheme"
    },
    correct: "C",
    explanation: "The Chiranjeevi Swasthya Bima Yojana, launched by the Rajasthan Government, offers comprehensive cashless health insurance cover to all families in the state."
  }
];

const STATIC_MAINS_TEMPLATES = {
  901: [
    {
      question: "Highlight the cultural significance of the Phad paintings of Rajasthan. (Word limit: 50 words)",
      suggested_answer: "Phad painting is a traditional scroll painting style originating in Bhilwara district. Rendered on long canvas cloths using natural colors, they depict the heroic epics of folk deities like Devnarayanji and Pabuji. They serve as portable temples carried by Bhopas (priest-singers) who sing the narratives in village communities.",
      key_eval_points: ["Origin in Bhilwara", "Depicts folk deities (Pabuji/Devnarayanji)", "Scroll painting on canvas", "Narrated by Bhopas"],
      word_limit: 50
    }
  ]
};

const GENERIC_MAINS_TEMPLATES = [
  {
    question: "Evaluate the role of civil service ethics in building transparent district administration. (Word limit: 50 words)",
    suggested_answer: "Administrative ethics provide code of conduct checks including objectivity, neutrality, and empathy. They guide RAS officers to exercise discretion fairly, counter institutional corruption, promote grievance redressal portals (Rajasthan Sampark), and secure citizen-centric public service delivery under the Right to Public Services Act.",
    key_eval_points: ["Ethical pillars (objectivity, neutrality)", "Mitigates corruption & discretion abuse", "Citizen service delivery channels"],
    word_limit: 50
  }
];
