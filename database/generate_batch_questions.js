/**
 * RPSC RAS – Master Question Generator & Seeder
 * 
 * Generates via the production Render API:
 *   - PRE: 50 MCQs per subtopic (EN + HI = 100 total per subtopic)
 *   - MAINS: 30 descriptive Qs per subtopic (EN + HI = 60 total per subtopic)
 * 
 * Uses Node.js built-in https + manual multipart (no form-data package needed).
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');
const crypto = require('crypto');

// ============================================================
// MULTIPART HELPER (no external deps)
// ============================================================
function buildMultipart(fields, file) {
    const boundary = '----RASFormBoundary' + crypto.randomBytes(8).toString('hex');
    const CRLF = '\r\n';
    let body = Buffer.alloc(0);

    for (const [name, value] of Object.entries(fields)) {
        const part = Buffer.from(
            `--${boundary}${CRLF}` +
            `Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}` +
            `${value}${CRLF}`
        );
        body = Buffer.concat([body, part]);
    }

    // File field
    const fileHeader = Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="pdfFiles"; filename="${file.filename}"${CRLF}` +
        `Content-Type: text/plain${CRLF}${CRLF}`
    );
    const fileTail = Buffer.from(CRLF);
    const closing = Buffer.from(`--${boundary}--${CRLF}`);
    body = Buffer.concat([body, fileHeader, file.content, fileTail, closing]);

    return { body, boundary };
}

function callAPI(path, fields, file) {
    return new Promise((resolve, reject) => {
        const { body, boundary } = buildMultipart(fields, file);
        const options = {
            hostname: 'rpsc-ras-backend.onrender.com',
            path,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=----RASFormBoundary${boundary.split('RASFormBoundary')[1].split('\r')[0]}`,
                'Content-Length': body.length
            }
        };
        // Rebuild with correct boundary
        const { body: finalBody, boundary: finalBoundary } = buildMultipart(fields, file);
        const finalOptions = {
            hostname: 'rpsc-ras-backend.onrender.com',
            path,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=----RASFormBoundary${finalBoundary.split('RASFormBoundary')[1].split('\r')[0]}`,
                'Content-Length': finalBody.length
            }
        };

        const req = https.request(finalOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ result: JSON.parse(data), status: res.statusCode }); }
                catch (e) { resolve({ result: data.substring(0, 300), status: res.statusCode }); }
            });
        });
        req.on('error', err => reject(err.message));
        req.write(finalBody);
        req.end();
    });
}

async function generateForSubtopic(subtopic, tier, count) {
    const fields = {
        tier,
        topicId: subtopic.topicId.toString(),
        minuteTopicId: subtopic.minuteTopicId.toString(),
        count: count.toString()
    };
    const file = {
        filename: `notes_${subtopic.minuteTopicId}.txt`,
        content: Buffer.from(subtopic.content, 'utf8')
    };
    return callAPI('/api/admin/generate-questions-from-pdf', fields, file);
}

// ============================================================
// SUBTOPIC CONTENT BANK
// ============================================================
const SUBTOPICS = [

  // ─────────────────────────────────────────────────────────
  // TOPIC 1 – Pre-historic Sites (topic_id=1, mt=2117)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2117,
    topicId: 1,
    topicName: 'Pre-historical Sites: Palaeolithic, Mesolithic, and Neolithic Sites in Rajasthan',
    content: `
RAJASTHAN PRE-HISTORICAL SITES – COMPREHENSIVE NOTES

STONE AGE PERIODS:
- Palaeolithic (Old Stone Age): Pebble tools, hand axes, chopper-chopping tools (no polishing). Sites: Didwana (Nagaur), Budha Pushkar (Ajmer).
- Mesolithic (Middle Stone Age): Microliths (tiny stone blades). BAGORE is India's largest Mesolithic site.
- Neolithic (New Stone Age): Polished stone tools, pottery, agriculture. Sites rare in Rajasthan – mostly transitional.

BAGORE (BHILWARA, KOTHARI RIVER):
- Excavated by V.N. Mishra.
- Known locally as 'Mhasatiya'.
- India's LARGEST Mesolithic site.
- Evidence: Microliths (tiny tools), needles, iron tools, Leshni (stone circles/rings).
- FIRST ANIMAL DOMESTICATION evidence in India (dog, sheep, goat, cattle).
- Phases: Mesolithic → Chalcolithic → Iron Age.
- Rock paintings of human figures and animals.
- Kothari river bank, Bhilwara district.

TILWARA (BARMER, LUNI RIVER):
- Excavated by V.N. Mishra.
- Near Balotra town on Luni river.
- Evidence: Fire altars, Mesolithic tools, charred bones.
- Earliest evidence of fire use in Rajasthan.

PACHPADRA (BARMER): Mesolithic site near salt lake.
BUDHA PUSHKAR (AJMER): Mesolithic site; also has Palaeolithic evidence.
JAYAL (NAGAUR): Mesolithic site.
DEEDWANA (NAGAUR): Microliths; saline lake area; evidence of early human habitation.
SOJAT (PALI): Mesolithic.
DHANERI: Mesolithic tools.
SAMBHAR LAKE (JAIPUR-NAGAUR BORDER): Ancient salt lake; human habitation since prehistoric times.
BHIM KI DUNGARI (VIRATNAGAR, JAIPUR): Rock shelters with paintings, Mesolithic habitation.

ROCK PAINTINGS IN RAJASTHAN:
- Dadikar (Alwar): Earliest known paintings.
- Alaniya (Kota): Hunting scenes.
- Garads (Bundi): Cave paintings.
- Harsura: Animal figures.

KEY DISTINGUISHING FACTS:
1. Bagore = India's largest Mesolithic site (V.N. Mishra excavated).
2. Bagore = FIRST animal domestication evidence in India.
3. Tilwara = fire altars = Luni river.
4. Deedwana = Palaeolithic + Mesolithic (Nagaur).
5. Microliths = defining characteristic of Mesolithic age.
6. Leshni (stone circles) found only at Bagore in Rajasthan.
7. Rajasthan has no major purely Neolithic site.
8. V.N. Mishra excavated both Bagore and Tilwara.
9. Rajasthan Mesolithic sites concentrated: Barmer, Bhilwara, Nagaur.
10. Needles (earliest) from Bagore.
11. Palaeolithic tools: unpolished, large, pebble-based.
12. Mesolithic revolution = miniaturisation of tools (microliths).
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 1 – Chalcolithic & Bronze Age (mt=2119)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2119,
    topicId: 1,
    topicName: 'Chalcolithic and Bronze Age Sites in Rajasthan (Kalibangan, Ahar, Ganeshwar, Balathal, Bagor)',
    content: `
CHALCOLITHIC & BRONZE AGE SITES – COMPREHENSIVE NOTES

GANESHWAR (SIKAR, KANTALI RIVER):
- Excavator: R.C. Agrawal.
- Called 'MOTHER OF COPPER AGE' in India / 'Cradle of Copper Age'.
- Oldest copper-using site in India (pre-dates Harappan).
- Supplied copper artifacts to Indus Valley Civilization.
- Evidence: Copper fishing hooks (750+), arrow-heads, spear-heads, chisels, bangles, rings, pins.
- Also: Stone bridge, black & blue pottery.
- Key point: Ganeshwar people were contemporaries of IVC but INDEPENDENT civilization.

AHAR CULTURE (BANAS CULTURE):
- Named after Ahar site; also called Banas Culture.
- Period: 3000–1500 BC (Chalcolithic).
- Region: Udaipur, Chittorgarh, Rajsamand.

AHAR (UDAIPUR, BEDACH/AYAD RIVER):
- Ancient names: Aghatpur (in inscriptions), Tambavati (copper-rich land), Dhoolkot (mound of dust/ruins).
- Excavators: A.K. Vyas, R.C. Agrawal, H.D. Sankalia, V.N. Mishra.
- Major Evidence:
  * COPPER FURNACES – major copper smelting centre (hence Tambavati).
  * Black & Red Ware pottery (signature pottery).
  * Stone weights (for trade measurement).
  * LAPIS LAZULI – imported from Afghanistan (proves long-distance trade).
  * Handle-less water pot – style from Iran (international contact).
  * Apollo coin – Greek connection.
  * Double-faced stove (unique cooking arrangement).
  * Silbata (grinding stone).
  * Crops: RICE, WHEAT, SORGHUM (Jowar).
  * Banasian Bull terracotta figurines.
  * Stone house foundations.
  * Evidence of cotton weaving.

GILUND (RAJSAMAND):
- Excavators: B.B. Lal, V.S. Shinde, Gregory Possehl.
- Located at Modiya Magri hill.
- Evidence: Baked bricks, stone ball-rings/quern stones.
- Trade link with Ahar culture.

BALATHAL (UDAIPUR):
- Excavator: V.N. Mishra.
- Linked to Indus Valley Civilization (Harappan pottery found).
- Controversial: Evidence of IRON FURNACES (one of earliest in India).
- Other Evidence: 11-room house complex, tube well (earliest in Rajasthan), hand-made cloth impressions.
- Showed continuity from Chalcolithic to Iron Age.

OJHIYANA (BHILWARA, KHARI RIVER):
- Excavators: B.R. Meena, Alok Tripathi.
- Evidence: Cow & bull terracotta figurines (earliest cattle domestication evidence in Rajasthan).

KALIBANGAN (HANUMANGARH, GHAGGAR RIVER):
- Name meaning: 'Black Bangles' (Kali = black, Bangan = bangle) – for black terracotta bangles found.
- Ghaggar River = ancient Sarasvati River (seasonal; identified by Aurel Stein).
- SURVEY HISTORY: Aurel Stein (1917), L.P. Tessitori (1919-20, found Sothi culture), Amlanand Ghosh (1952 – identified Harappan phase).
- EXCAVATION: B.B. Lal, B.K. Thapar (1960-69); also M.D. Khare, K.M. Shrivastav, S.P. Jain.
- Dashrath Sharma's theory: 'Third Capital of Indus Civilization' (after Mohenjo-daro and Harappa).
- 5 Cultural Phases found (pre-Harappan to late Harappan).
- Pre-Harappan phase linked to Kot Diji culture (Pakistan).

KALIBANGAN STRUCTURE:
- Citadel (upper mound) – administrative/religious area.
- Lower Town (residential) – divided by a brick wall.
- Both planned with cardinal directions.

KALIBANGAN UNIQUE EVIDENCE (Most Exam-Tested):
1. PLOUGHED FIELD – World's oldest ploughed farm field found here.
2. DOUBLE CROPPING – Barley + mustard (or sesame) sown simultaneously in same field.
3. FIRE ALTARS (7) – on citadel platform (unique religious practice; no fire altars at Mohenjo-daro).
4. CAMEL BONES – Only Harappan site with camel bones.
5. COUPLE BURIAL – Man and woman buried together (unique mortuary practice).
6. 6-HOLE SKULL – Evidence of brain surgery (trepanning) – unique in ancient world.
7. CYLINDRICAL SEAL – Imported from Mesopotamia (international trade).
8. WOODEN DRAINAGE – Unlike brick drains of Mohenjo-daro.
9. WATCHMAN'S ROOM – Security arrangement.
10. OVAL WELL – Unlike standard rectangular wells.
11. EARTHQUAKE EVIDENCE – Pre-Harappan levels show earthquake destruction (unique archaeological evidence).
12. RAW (SUN-DRIED) + DECORATED BRICKS – Both types used (Harappa used only baked bricks).
13. BLACK & WHITE-LINED POTTERY – Distinctive Kalibangan style.

SOTHI CULTURE (PRE-HARAPPAN):
- Sites: Sothi (Bikaner), Sawariya, Pugal (Bikaner).
- Pre-Harappan pottery identified as Sothi ware.
- L.P. Tessitori discovered Sothi ware.

OTHER SITES:
SUNARI (JHUNJHUNU): Oldest iron furnaces of Rajasthan; chariot remains; rice evidence.
RAIDH (JAIPUR): Identified as 'Tata Nagar of ancient India'; thousands of Malav, Mitra, Appolodotus coins; Mother Goddess figurine; K.N. Puri excavated.
JODHPURA (JAIPUR, SABI RIVER): Iron tools; R.C. Agrawal excavated.
NALIYASAR (NAGAUR): Kushan era coins.
BAIRATH (JAIPUR): Mauryan period; Bhabru inscription of Ashoka.

KEY EXAM FACTS:
1. Ganeshwar = Mother of Copper Age = Kantali River, Sikar.
2. Ahar = Tambavati = copper furnaces = Black & Red Ware.
3. Lapis Lazuli at Ahar = imported from Afghanistan.
4. Kalibangan = world's oldest ploughed field.
5. Kalibangan = only Harappan site with fire altars.
6. Kalibangan = only Harappan site with camel bones.
7. Kalibangan = couple burial (unique).
8. Kalibangan = earthquake evidence (unique).
9. Kalibangan = Dashrath Sharma called it 3rd Harappan capital.
10. Ghaggar = Sarasvati identification.
11. Balathal = 11-room house, tube well, iron furnaces.
12. Sunari = oldest iron furnaces of Rajasthan.
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 2 – Mewar Guhil-Sisodia (mt=2125)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2125,
    topicId: 2,
    topicName: 'Guhil and Sisodia Dynasty of Mewar: Rulers, Battles & Cultural Contribution',
    content: `
MEWAR GUHIL-SISODIA DYNASTY – COMPREHENSIVE NOTES

FOUNDER: GUHIL (566 AD) – gave dynasty its name (Guhilots).
Capital: NAGDA (Nagahrada) initially.

BAPPA RAWAL (734-753 AD):
- Real name: Kalbhoj (also known as Shiladitya in some sources).
- Guru: HARIT RISHI (ascetic from whom he received Mewar kingdom as gift).
- Victory: Defeated Man Maurya (last Maurya ruler of Chittor) in 734 AD.
- Established Nagda as capital; also fortified Chittor.
- Built EKLINGJI TEMPLE at Kailashpuri (Udaipur) dedicated to Shiva; Mewar rulers called themselves 'Dewan of Eklingji'.
- Coins: 115-grain gold coins (Suvarna Masha).
- Military Campaign: Led expedition to Ghazni (Afghanistan); some historians claim 'Rawalpindi' is named after him.
- Titles: Hindu Suraj, Rajguru, Chakkawei.
- Married many Muslim women (legendary) – symbol of communal synthesis.
- Death: Disappeared (legend says became a yogi).

ALLAT (940-953 AD):
- Composed/commissioned Saraneshwar Eulogy (Prashasti) 953 AD.
- Shifted capital from NAGDA to AHAR (Udaipur).
- Built Vaarh (Varaha) temple at Ahar.
- Married Huna princess Hariya Devi.
- Shaktikumar's Atapur inscription (977 AD) is from his period.

JAITRA SINGH (1213-53 AD):
- Greatest early medieval Mewar ruler.
- Key Victory: BATTLE OF BHUTALA (1227 AD) vs Iltutmish (Delhi Sultanate) – defeated Delhi's army.
- Commanders in battle: Balak & Madan.
- Literary evidence: 'Hammeer Mad Mardana' by Jai Singh Suri.
- Shifted capital from Ahar to CHITTOR.
- Called: Golden Age of early medieval Mewar.

TEJ SINGH (1253-73 AD):
- Shrawak Pratikraman Sutra Churni (1260 AD) composed by Kamal Chandra in his court.
- Built Shyam Parshvanath Jain temple.

RATAN SINGH (1302-03 AD):
- Birth name: Kumbhkaran (from Nepal branch of Sisodias).
- Wife: PADMINI (from Sinhal Island/Sri Lanka; daughter of Gandharvasen, mother Champavati).
- Story: Expelled musician Raghav Chetan told Alauddin Khilji about Padmini's beauty.
- Alauddin Khilji besieged Chittor (1303 AD).
- FIRST SAKA OF CHITTOR (1303 AD):
  * Heroes: GAORA & BADAL (nephew-nephew of Padmini) led external resistance.
  * Women performed JOHAR (mass self-immolation led by Padmini).
  * Warriors performed KESARIYA (saffron-clad charge to death).
  * Alauddin renamed Chittor as 'Khijrabad'.
- Literary reference: PADMAVAT by Malik Muhammad Jaisi (1540 AD, Avadhi language, Sufi allegory interpretation).
- Gambhiri bridge built; Tomb inscription found at Chittor.

HAMMEER / HAMIR (1326-64 AD):
- From Sisodia clan (hence dynasty called Sisodia dynasty henceforth).
- Title: 'SAVIOR OF MEWAR' (rescued Mewar from Tughlaq domination).
- Key Battle: BATTLE OF SINGHOLI vs Muhammad Bin Tughlaq – defeated Delhi Sultanate.
- Sheltered Muhammad Shah (rebel prince, fled from Delhi) – used as pretext for Tughlaq attack.
- Built Barwari/Annapurna temple.

LAKHA (1382-1421 AD):
- Opened JAWAR SILVER MINES (Udaipur) – gave Mewar great economic strength.
- Built PICHOLA LAKE by financing work of Chhitra Banjara (dam builder).
- Controversy: 'Kumbha Hada' – fake Bundi conflict.
- CHUNDA'S OATH = 'Bhisham Pratigya of Mewar' (Chunda, Lakha's elder son, sacrificed throne for Lakha's younger son Mokal by his younger wife; parallels Bhisham of Mahabharata).
- Gave Salumbar jagir special hereditary rights.

MOKAL (1421-33 AD):
- Mother: HANSA BAI (daughter of Ranmal Rathore of Marwar; hence Ranmal became guardian/regent).
- Murder: Killed at Jheelwara (1432 AD) by Chacha, Mera, and Mahpa (jealous relatives).
- Wife: Kamalawati.
- Built/renovated Samidheshwar temple (also called Tribhuwan Narayan) at Chittor.
- Shringi Rishi inscription (1428 AD).

KUMBHA (MAHARANA KUMBHAKARNA, 1433-68 AD):
- Greatest and most celebrated Mewar ruler; one of greatest Rajput rulers ever.
- Padrada inscription (1433 AD) confirms coronation.
- Killed Raghav Dev (a rebel noble) in 1438 AD.
- Treaty of Anwal-Banwal (1453 AD) with Gujarat.

KUMBHA'S BATTLES:
- BATTLE OF SARANGPUR (1437 AD): Most celebrated victory; defeated Mahmud Khilji I of Malwa Sultanate.
  * Built Victory Tower to commemorate this.
- Treaty of Champaner (1456): Gujarat-Malwa alliance against Mewar (Kumbha not invited but resisted).
- Battle of Badanaur (1457): Defeated combined Malwa-Gujarat force.
- Nagaur succession dispute.

KUMBHA'S MONUMENTS:
- VIJAY STAMBHA (Victory Tower / Kirti Stambha):
  * 9 floors (stories), 122 feet (37 metres) tall.
  * Built to commemorate Battle of Sarangpur 1437 victory.
  * Dedicated to Lord Vishnu (Vishnu statue at top).
  * Also called 'Kirti Tower' or 'Tower of Fame'.
  * 'ALLAH' engraved in Arabic on exterior (symbol of communal harmony).
  * Sculptors: ATRI (chief architect/designer) & MAHESH (son, executed the work).
  * Colonel Tod compared it to Trajan's Column (Rome).
  * Logo of RAJASTHAN POLICE.
- KIRTI STAMBHA (Jain Tower): 12th-century Jain tower (earlier; dedicated to Adinath); not built by Kumbha.
- FORTS BUILT: Kumbhalgarh (architect Mandan, most famous), Katargarh, Achalgarh, Basantgarh, Machan, Bhomat.
- TEMPLES: Kumbhaswami temple (Chittor), Ranakpur Jain temple (1439 AD – funded by Dharnak Shah/Dharna Shah; designed by Deepak, 1444 pillars, each unique).

KUMBHA'S LITERARY WORKS:
- SANGEET RAJ: Treatise on music (4 parts).
- SANGEET MIMAMSA: Commentary on music.
- SUDHA PRABANDHA: Literary work.
- RASIK PRIYA: Commentary on Jayadeva's 'Geet Govinda'.
- Played Veena; composed 4 dramas.
- Court scholars: Kanha Vyas, Mehaji, Mandan (architect), Natha, Govind, Heeranand Muni, Tila Bhatt.
- Murdered by his own son Udai Karan (Uda) in 1468 AD.

RAIMAL (1473-1509 AD):
- Built Adbhut Shiv temple (Chittor).
- Wife: Rama Bai (called Vagishwari; composed Ramrasa devotional poetry).
- Ghosundi inscription found (Vatsa Pali script; important epigraphic evidence).

SANGA (RANA SANGRAM SINGH, 1509-28 AD):
- Called 'HINDUPAT' (Lord of Hindus) – commanded 7 kingdoms and 108 chiefs.
- 'REMNANTS OF SOLDIERS': Lost one eye, one arm, limped (100 battle wounds).
- Advisors: Bida Jaitmalot, Karamchand Panwar.
- Political situation: Delhi (Sikandar Lodi then Ibrahim Lodi), Malwa (Nasir Shah), Gujarat (Mahmud Begda).
- Key BATTLES:
  * Battle of Khatoli (1517): Defeated Ibrahim Lodi of Delhi – captured Mahmud Lodi.
  * Battle of Bari (1518): Another Delhi defeat.
  * Battle of Gagron (1519): Defeated Mahmud Khilji II of Malwa (aided by Medini Rai and Haridas Charan).
  * Battle of Ider (1520): Victory.
  * Battle of Bayana (16 February 1527): Sanga's forces defeated Babur's advance contingent.
  * BATTLE OF KHANWA (17 March 1527): DECISIVE DEFEAT by Babur.
    - Babur declared JIHAD against Sanga; called it 'Holy War'; gave Tamaga (tax exemption certificate) to Muslim traders.
    - Sanga had received 'Pati Perawan' (betrothal/alliance) letters from: Prithviraj Rathore (Bikaner), Maldev (Jodhpur), Kalyanmal (Bikaner), Hasan Khan Mewati (Mewat), Jhalla Ajja (Zalor).
    - After defeat Sanga escaped; later poisoned by his own chiefs at Kalpi (1528).

VIKRAMADITYA (1531-36 AD):
- Mother: KARMAWATI (also spelled Karnavati).
- Ranthambhore Treaty (1533) with Humayun.
- 2ND SAKA OF CHITTOR (1535 AD): Bahadur Shah of Gujarat attacked Chittor.
  * Bagh Singh of Devaliya helped.
  * Karmawati sent RAKHI to Humayun (but Humayun arrived too late – already fallen).
  * Karmawati & 13,000 women performed Johar.
- Banveer (son of Prithviraj, illegitimate prince) murdered Vikramaditya.
- PANNA DHAI'S SACRIFICE: Saved infant Udai Singh by substituting her own son Chandan (placed Chandan in royal cradle).
- Asha Devpura = hiding place where Panna kept infant Udai Singh.

UDAI SINGH II (1537-72 AD):
- Battle of Mawali (1540): Defeated usurper Banveer and reclaimed throne.
- Founded UDAIPUR CITY (1559 AD) – named after himself.
- Built Udai Sagar Lake, Moti Magari.
- AKBAR'S ATTACK ON CHITTOR (1567-68):
  * Jaimal (from Merta branch) and PATTA (from Amet branch) led heroic resistance.
  * 3RD SAKA OF CHITTOR (1568): PHUL KANWAR led Johar.
  * KALLA RATHORE fought with 4 arms (legendary – carried weapons in arms and feet while injured).
  * Elachi coin issued by Akbar.
  * Akbar erected statues of Jaimal & Patta at Agra Fort gate (mentioned by French traveller BERNIER).
  * Sangram gun (cannon) used in siege.
- Died at Gogunda (1572 AD on the day of Holi).
- Son: Rana Pratap succeeded.

PRATAP (1572-97 AD):
- Coronation at GOGUNDA.
- Conflict: Jagmal (half-brother, supported by Akbar) sat on throne first; nobles removed him and crowned Pratap.
- 4 MUGHAL EMBASSIES to persuade Pratap (all failed):
  1. Jalal Khan Qurchi (1572)
  2. Man Singh (1573)
  3. Bhagwant Das (1573)
  4. Todarmal (1573)
- BATTLE OF HALDIGHATI (18 June 1576):
  * Pratap's key commanders: Krishan Das Chundawat, Ram Shah Tomar (King of Gwalior, with grandsons), HAKIM KHAN SUR (Afghan general – only Muslim commander), RANA PUNJA (Bhil chief, 400 Bhil archers).
  * Mughal commander: MAN SINGH, Asaf Khan.
  * JHALA BIDA: Wore Pratap's crown & royal umbrella; sacrificed himself to save Pratap.
  * MIHATAR KHAN: Sounded false retreat bugle (saved Pratap's life by confusing Mughals).
  * CHETAK: Pratap's blue horse (Neela Ghoda) – jumped over enemy elephant; severely wounded, died after crossing Balighati nullah.
  * Chetak's cenotaph at Haldighati.
  * Akbar banned Man Singh & Asaf Khan from court for failing to capture Pratap.
  * Akbar's DIRECT ATTACKS: Shahbaj Khan (1577), 2nd time (1578), 3rd time (1579) – all failed.
  * Akbar renamed Gogunda as 'Mohamdabad'.
- BATTLE OF DEWAIR (1582): Pratap vs Sultan Khan (Mughal commander) – PRATAP'S GREATEST VICTORY.
  * Called 'Marathon of Mewar' (because Pratap recaptured all of Mewar except Chittor, Ajmer, Mandalgarh).
- New capital: CHAWAND (Udaipur).
- Died: 29 January 1597; cenotaph at BANDOLI (near Udaipur).
- Court scholars: Chakrapani Mishra, Hemratna Suri, Sadulnath Trivedi.
- BHAMASHAH & TARACHAND (from Chuliya, Pali): Gave entire personal treasury (equivalent to 25,000 soldiers for 12 years) to fund Pratap's army (1578 AD) – called 'Financier of Mewar's independence'.

AMAR SINGH I (1597-1620 AD):
- MUGHAL-MEWAR TREATY (5 February 1615):
  * Mughal side: Jahangir & Prince Khurram (future Shah Jahan).
  * Mewar side: Amar Singh.
  * Terms: (1) Amar Singh accepted Mughal suzerainty; (2) Karan Singh to present himself at Mughal court; (3) Chittor NOT to be repaired; (4) Mewar to provide military aid to Mughals; (5) Mewar autonomy preserved.
  * Significance: Ended 50-year Mughal-Mewar conflict.
- Built Nau Chaki, started Rajsamand Lake (completed by Raj Singh).
- Mahasatiyan (32 cenotaphs of queens near Rajsamand).

KARAN SINGH (1620-28): Built Karna Vilas, Dilkhusha, JAG MANDIR (island palace on Pichola Lake).

JAGAT SINGH I (1628-52): Built JAGDISH TEMPLE (Panchayatan style – 5 shrines); Jagannath Rai Prasasti.

RAJ SINGH (1652-80):
- Repaired Chittor fort (violation of Mughal treaty terms).
- Opposed Aurangzeb's JAZIYA tax reimposition.
- Married CHARUMATI (princess of Rupnagar, 1669) to save her from Aurangzeb's forced conversion.
- Formed Rathore-Sisodia alliance against Aurangzeb.
- SAHAL KANWAR (HADI RANI): Wife of Salumbar chief Sardar Singh; sent her own head as token (tilak/pledge) to husband going to war (so he fights without distraction). Poem 'Sainani'.
- Installed SHRINATHJI at Nathdwara (1672) – brought from Govardhan (Mathura) to protect from Aurangzeb.
- Also established Dwarkadhish temple, Trimukhi Bawdi.
- RAJSAMAND LAKE completed (started by Amar Singh I; completed 1688).
- RAJ PRASASTI: World's largest stone inscription (25 granite slabs, Sanskrit language, 1017 shlokas).
- Court scholars: Sadashiv Bhatt, Ranchod Bhatt.

JAI SINGH (SANGRAM SINGH / BHIM SINGH era):
- JAISAMAND LAKE (DHEBAR LAKE, 1687): Asia's largest artificial freshwater lake when constructed.
- Ruthi Rani palace.

AMAR SINGH II: Amarshahi turban. DEBARI AGREEMENT (1708): Rajput unity conference.

SANGRAM SINGH II: Fought Marathas for Chauth. Built SAHELIYON KI BADI, Vaidyanath temple (1716). Battle of Bandanwada.

JAGAT SINGH II: HURDA CONFERENCE (17 July 1734) – all Rajput chiefs met to resist Marathas. Built Jagat Niwas palace.

BHIM SINGH (1778-1828):
- KRISHNA KUMARI DISPUTE: Bhim Singh's daughter promised to both Marwar and Jaipur rulers; led to battle.
- Battle of Gingoli (1807).
- British Treaty: 13 January 1818 (Subsidiary Alliance – Mewar last to sign).
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 2 – Rathore Dynasty (mt=2127)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2127,
    topicId: 2,
    topicName: 'Rathore Dynasty of Marwar and Bikaner: Prominent Rulers & Achievements',
    content: `
RATHORE DYNASTY – MARWAR & BIKANER – COMPREHENSIVE NOTES

ORIGIN OF RATHORES:
- Descendants of Kannauj Rathor Rajputs (migrated to Rajasthan after Muhammad Ghori's defeat of Jaichand of Kannauj, 1194 AD).
- Ancestor Sehjpal (Siha's father) settled in Rajasthan.

MARWAR (JODHPUR) RATHORES:

SIHA (1212 AD): Founder of Rathore lineage in Marwar; settled at KHED (Pali district).
DHUHAD: Son of Siha; expanded holdings.
VIRAM DEV: Early ruler.

RAO JODHA (1453-89 AD):
- Most celebrated founding ruler.
- Founded JODHPUR CITY (1459 AD).
- Built MEHRANGARH FORT on Chidiyatunk hill (also called Bhakurchidiya hill – 'the hill of eagles').
- Shifted capital from MANDORE to JODHPUR.
- Peace with Mewar: Made peace with Kumbha; married daughter to Kumbha.
- Named after him: Jodhpur, Jodhpuri boot, Jodhpur cuisine.
- Mehrangarh's 7 gates: Fateh Pol, Gopal Pol, Bhairon Pol, Dedh Kamgra Pol, Loha Pol, Suraj Pol, Amrita Pol.

MALDEV (1532-62 AD):
- Most powerful and territorially largest Rathore ruler.
- Controlled area from Ajmer to Gujarat and parts of Punjab.
- Battle of PAHEBA (1541): Won against Sher Shah Suri initially; Sher Shah used spies (distributed fake letters of Maldev's commanders to create distrust).
- Battle of SAMMEL (GIRI SUMEL) (January 1544): DEFEATED by Sher Shah Suri; commanders Jaita & Kumpna died fighting.
  * Sher Shah said after battle: 'I nearly lost the empire of Delhi for a handful of millet (bajra).'
  * Humayun also defeated by Maldev; Humayun took refuge in Sindh then Iran.
- Built BALSAMAND LAKE (Jodhpur).
- Married many wives; had many sons (caused succession conflict).

CHANDRASEN (1562-81 AD):
- Called 'PRATAP OF MARWAR' / 'Forgotten Hero of Marwar'.
- Never submitted to Akbar (unlike other Rajput chiefs).
- Kept fighting from forests and hills till death (1581 AD) at Siwana.
- Died undefeated but in exile; body discovered by locals.
- Akbar gave Jodhpur to Chandrasen's rivals (brothers).

UDAI SINGH (of Jodhpur): Submitted to Akbar and received Jodhpur.

GAJ SINGH (1620-38 AD): Built Gajner Lake; loyal to Mughals.

JASWANT SINGH I (1638-78 AD):
- Battle of DHARMAT (April 25, 1658): Fought for Dara Shikoh (Aurangzeb's rival) vs Aurangzeb – DEFEATED.
  * This defeat decided the Mughal succession war in Aurangzeb's favour.
- Battle of KHAJWA (1659): Again vs Aurangzeb; defeated.
- Died at JAMRUD (Afghanistan, near Khyber Pass) in December 1678 without surviving heir.
- Literary works: BHASHA BHUSHAN, APAROKSHA SIDDHANT, ANUBHAV PRAKASH (philosophical texts).
- Court poet: Munhta Nainsi (also famous historian).

AJIT SINGH (1678-1724 AD):
- Born posthumously in Lahore fort (January 1679).
- DURGADAS RATHORE: Jodhpur's greatest commander; saved infant Ajit Singh from Aurangzeb.
  * Durgadas smuggled the infant from Lahore under disguise.
  * Also once sheltered Mughal prince Muzzam (later Bahadur Shah I).
  * Called: 'SHIELD OF MARWAR' / 'Son of Rajputana' / 'Rajputana's Bismarck'.
- After Aurangzeb's death (1707), Ajit Singh expelled Mughals from Jodhpur.
- Built AJIT SAGAR lake.
- Also built Fateh Pol gate at Jodhpur.
- Murdered by his own son Abhay Singh (1724 AD).

ABHAY SINGH:
- Victory over Gujarat (defeated Mughal governor Sarbuland Khan in Battle of Ahmedabad 1730).
- Built PHOOL MAHAL (palace of flowers) in Mehrangarh.

VIJ SINGH:
- British treaty era.

MAN SINGH II (Modern era): British Treaty January 1818.

MANDORE (EARLIER CAPITAL):
- Ancient capital of Rathores before Jodhpur.
- Has Dewal (Cremation chhatri) of Rathore rulers.
- Mandsaur (now Madhya Pradesh) = was ancient Mandore?

BIKANER RATHORES:

BIKA (1465-1504 AD):
- Son of RAO JODHA of Jodhpur (5th son).
- Left Jodhpur with permission after conflict over succession.
- Founded BIKANER CITY (1488 AD).
- Built Junagarh Fort area (original walls; current Junagarh built by Rai Singh).
- Support from NERA BHATI chief.
- Married daughters of local Jat and Bhati chiefs for alliances.

LOON KARAN (1504-05 AD): Brief reign.

JAITASI (1526-42 AD):
- Battle of PAHEBA (1541): Allied with Maldev vs Sher Shah Suri; died fighting bravely.

RAI SINGH (1571-1611 AD):
- Most celebrated and powerful Bikaner ruler.
- Senior Mughal general under Akbar & Jahangir.
- Military campaigns: Defeated Mirza Hakim (Akbar's rebel brother, Kabul), Muhammad Husain Mirza (Gujarat rebel), campaigned vs Rana Pratap (Haldighati era).
- Built JUNAGARH FORT (1589 AD; completed 1594) – NEVER CAPTURED by any enemy.
- Literary works: Rai Singh Mahotsav (self-composition), Rai Singh Prashasti (eulogy by Jaita).
- Built Laxminath temple (patron deity of Bikaner state).
- Court poets: Pirhi Das, Bhushan (started here, later went to Shivaji).

ANUP SINGH (1669-98 AD):
- Great military commander under Aurangzeb in Deccan campaigns.
- Collected South Indian sculptures, manuscripts (brought to Bikaner Museum).
- ANUP SANSKRIT LIBRARY – established at Bikaner; rich collection of manuscripts.
- Works: Anup Ramayana, Anup Vivek, Anup Yoga Vilasa.
- Musical collections: Anup Sitar, Anup Sangeet Ratnakar.

SUR SINGH: Built Karan Mahal.

GANGA SINGH (1887-1943 AD):
- Most modern and progressive Bikaner ruler.
- GANG CANAL: Built irrigation canal from Sutlej river; transformed arid Bikaner into agricultural land.
  * Founded GANGANAGAR district (Ganga Singh Nagar).
- WWI & WWII: BIKANER CAMEL CORPS contributed troops.
- TREATY OF VERSAILLES (1919): Represented India (as one of princes) at Paris Peace Conference – signed on India's behalf.
- Built LALGARH PALACE (Indo-Saracenic architectural style, 1902) – named after his father Lal Singh.
- GANGA GOLDEN JUBILEE MUSEUM (Bikaner Museum).
- Inaugurated Bikaner-Jodhpur railway line.
- Imperial Conference representative.

KEY EXAM FACTS:
1. Jodhpur founded 1459 AD by Rao Jodha = Mehrangarh Fort.
2. Battle of Sammel/Giri Sumel (1544): Maldev vs Sher Shah – Rajput defeat.
3. Sher Shah quote about battle with Maldev: 'I nearly lost empire for bajra.'
4. Chandrasen = Pratap of Marwar (never surrendered to Akbar).
5. Durgadas Rathore = Shield of Marwar = saved Ajit Singh.
6. Battle of Dharmat (1658): Jaswant Singh I vs Aurangzeb.
7. Bikaner founded 1488 by Bika (son of Rao Jodha).
8. Junagarh Fort (1589) = never captured.
9. Rai Singh = Mughal general + Junagarh builder.
10. Ganga Singh at Versailles 1919 = represented India.
11. Gang Canal = Ganganagar = Sutlej river.
12. Lalgarh Palace = Indo-Saracenic = Bikaner.
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 5 – Peasant Movements (mt=2139)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2139,
    topicId: 5,
    tier: 'PRE',
    count: 50,
    topicName: 'Peasant Movements in 20th Century Rajasthan (Bijolia, Begun, Barad)',
    content: `
PEASANT MOVEMENTS IN RAJASTHAN – COMPREHENSIVE NOTES

BIJOLIA MOVEMENT (BHILWARA):
- Duration: 1897-1941 = 44 YEARS (longest peasant movement in India).
- Location: Bijolia Thikana (feudal estate), Bhilwara district.
- Cause: 84 types of illegal/oppressive taxes (Lag-Baag) levied by feudal lords.
- Main taxes: Chawri (marriage tax), Talbedi (irrigation tax), Nali (cultivation tax), Chari (fodder tax), Begar (forced labour).
- Community: Dhakad community (primary cultivators of Bijolia).
- LEADERS:
  * Sitaram Das (local saint; started movement 1897).
  * Vijay Singh Pathik (real name BHUPSINGH): Main organizer; connected movement to national level; published news in 'Pratap' newspaper (Ganesh Shankar Vidyarthi's paper, Kanpur).
  * Sadhudas, Mannilal: Other leaders.
- ORGANIZATION: PRAJAMITRA MANDAL (1919) – founded by Vijay Singh Pathik.
- Gandhi's role: Visited region; sent inquiry commission; brought national attention.
- Settlement: 1922 (partial) – 1941 (final) under Mewar government agreement.
- Final result: Major taxes abolished; begar (forced labour) reduced.

BEGUN MOVEMENT (CHITTORGARH):
- Period: 1921-1925 (active).
- Location: Begun Thikana (feudal estate), Chittorgarh.
- Leaders: RAMDAS GARG (local leader), VIJAY SINGH PATHIK, Madhavlal Badhia.
- NEEMACHANA MASSACRE (14 June 1925):
  * Mewar State police opened fire on a peaceful peasant gathering at Neemachana village.
  * ~150-200 peasants killed (estimates vary).
  * Called 'RAJASTHAN'S JALLIANWALA BAGH'.
  * Gandhiji wrote about it: 'Worse than Jallianwala Bagh.'
  * Government tried to suppress news.
- Significance: First major peasant atrocity to gain national attention in Rajasthan.

BUNDI PEASANT MOVEMENT:
- Period: 1926 onwards.
- NANGAL PEASANT MOVEMENT (1913): Earliest precursor; peasants of Nangal area (Bundi).
- Leaders: Narasinghdas Bhadani (primary leader).
- Cause: Bundi state's oppressive feudal practices.

MEWAT (ALWAR) MOVEMENT:
- Community: Meo Muslim peasants of Mewat region (Alwar-Bharatpur area).
- 1932: Against begar (forced unpaid labour) and heavy taxes.
- Connected to: Meo community's resistance throughout colonial period.
- NEEM KI DHANI MASSACRE (1925, Alwar): Police firing on Meo farmers.

SHEKHAWATI PEASANT MOVEMENTS (SIKAR, JHUNJHUNU):
- Region: Shekhawati area (feudal estates/thikanas of Sikar, Jhunjhunu, Churu).
- Leaders: SARDAR HARLAL SINGH (major Jat leader), Master Chandra Bhan, Ishwar Singh.
- Organizations: Jat Prajapati Mahasabha; Shekhawati Kisan Panchayat.
- SIKAR PEASANT MOVEMENT (1934): Sikar Thikana (under Jai Singh/Kalyan Singh).
  * Government troops used against farmers.
  * Led to reforms in Sikar's administration.
- JHUNJHUNU MOVEMENT: Against Jhunjhunu thikana.
- RAMGARH MOVEMENT: Against Ramgarh thikana.
- UDAIPURWATI MOVEMENT.
- Key demand: Abolish begar, reduce taxes, right to purchase land.

MARWAR PEASANT MOVEMENT:
- 1923: Early movement in Jodhpur state.
- Leaders: Chandmal Surana, Baldev Ram Mirdha.
- Mirdha family = leading Jat political family.

KEY DATES CHRONOLOGY:
1897: Bijolia Movement begins (Sitaram Das leads).
1906: Second phase of Bijolia (Vijay Singh Pathik joins).
1913: Nangal Peasant Movement (Bundi).
1916: Lokamanya Tilak's Lucknow session – Bijolia peasants' petition.
1919: Prajamitra Mandal formed (Vijay Singh Pathik).
1921: Begun Movement begins; Eki Movement in Mewar.
1922: Gandhi's support to Bijolia; partial settlement.
1925: Neemachana Massacre (Begun); Neem ki Dhani massacre (Alwar).
1926: Bundi Kisan Andolan.
1934: Sikar Peasant Movement.
1938: Haripura Congress session – Rajasthan issues raised.
1941: Bijolia Movement ENDS (final settlement).
1944-46: Post-WWII intensification of movements across Rajasthan.

KEY LEADERS SUMMARY:
- Vijay Singh Pathik (Bhupsingh): 'Rajasthan's Gandhi'; connected to Bijolia and Begun.
- Sitaram Das: Founder of Bijolia movement.
- Ramdas Garg: Begun movement.
- Harlal Singh: Shekhawati.
- Narasinghdas Bhadani: Bundi.
- Baldev Ram Mirdha: Marwar.
- Janardan Rai Nagar: Later movements.

EXAM FACTS:
1. Bijolia = longest peasant movement (44 years, 1897-1941).
2. Bijolia = 84 types of illegal taxes.
3. Neemachana massacre = 14 June 1925 = Rajasthan's Jallianwala.
4. Vijay Singh Pathik = real name Bhupsingh = Prajamitra Mandal.
5. Begun Movement = Chittorgarh 1921-25.
6. Shekhawati movements = Jat community = Harlal Singh.
7. Sikar Movement = 1934 = major Shekhawati movement.
8. Mewat movement = Meo Muslim peasants = Alwar.
9. Bundi movement = Nangal 1913 (earliest).
10. Gandhi called Neemachana 'worse than Jallianwala'.
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 5 – Tribal Movements (mt=2141)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2141,
    topicId: 5,
    tier: 'PRE',
    count: 50,
    topicName: 'Tribal Movements in Rajasthan (Eki Movement, Bhagat Movement, Motilal Tejawat)',
    content: `
TRIBAL MOVEMENTS IN RAJASTHAN – COMPREHENSIVE NOTES

EKI MOVEMENT (UNITY MOVEMENT, 1921):
- Region: Bhil tribal belt of Mewar (Udaipur, Rajsamand, Bhilwara, Chittorgarh, Sirohi).
- Leader: MOTILAL TEJAWAT (from Koliyari village, Udaipur; Oswal Jain; became tribal organizer).
- Titles: 'BANNA' (beloved one, by tribals), 'GANDHI OF MEWAR' (for Gandhian-style resistance).
- EKI = Unity (Ekta); movement for tribal unity.
- Start: Mass meeting at MATHASIYA village (Rajsamand, March 1921); tens of thousands of tribals gathered.
- DEMANDS:
  * Abolish BEGAR (forced/unpaid labour for feudal lords).
  * Reduce excessive taxes.
  * Right to use forest (fuel, fodder).
  * End oppression by Bhomiya (tribal landlords).
- CHAURA MASSACRE (7 May 1922):
  * Mewar State forces + British political officer fired on peaceful tribal gathering.
  * Approximately 1,200 tribals killed (varies in sources; Sirohi/Mathasiya area).
  * Tejawat escaped into forest.
- Post-massacre: Tejawat continued movement from forests; went to Gujarat briefly.
- Eventually surrendered (1929) but movement left permanent mark.
- CONNECTION TO NATIONAL MOVEMENT: Supported Gandhi's Non-cooperation Movement simultaneously.

BHAGAT MOVEMENT (1883 ONWARDS):
- Founder: GOVIND GURU (GOVIND GIRI).
  * Born: Devguru (Banswara, 1858 AD) – though some sources say Dungarpur.
  * Community: Banjar (laborer/wandering community) – some say Surwanshi Banjar, some say Banjara.
  * Preaching area: Banswara, Dungarpur, and parts of Gujarat.
- Organization: SAMPRADAY (also called Bhagat Sampraday / Samp Sabha).
- SAMP SABHA founded: 1883 (gathering of tribal communities – Bhils).
- PHILOSOPHY:
  * Stop drinking alcohol (mahua).
  * Eat pure food (no meat, no sacrifice).
  * No begar (forced labour).
  * Social upliftment of Bhils.
  * Hindu revivalist tone.
- DEMANDS: End British colonial taxation; expel British and feudal lords from tribal areas.
- Motto: 'Maharaj ki Jai' (Victory to the King = God).

MANGARH HILL MASSACRE (17 November 1913):
- Location: Mangarh Hill (border of Banswara, Rajasthan & Sabarkantha, Gujarat).
- WHAT HAPPENED: 15,000-25,000 Bhil tribals had gathered under Govind Guru for a religious fair/meeting on Mangarh hill.
- British forces + Rajputana Rifles fired indiscriminately.
- DEATH TOLL: Approximately 1,500 Bhils killed (some estimates say more).
- Called: 'ADIVASI JALLIANWALA BAGH' / 'JANJATI JALLIANWALA'.
- Significance: Pre-dates Jallianwala Bagh massacre (1919) by 6 years.
- GOVIND GURU: Arrested; sentenced to death (later commuted to life imprisonment by Viceroy).
  * Spent later years at Kamboi (Gujarat); died 1931.
- MANGARH DHAM: Declared National Memorial by PM Narendra Modi (2022).
  * Modi hosted joint event with Rajasthan, MP, Gujarat, Maharashtra CMs at Mangarh.

MEENA MOVEMENT:
- Community: Meena tribe (primarily Jaipur, Sikar, Dausa, Tonk districts).
- CRIMINAL TRIBES ACT (1924): British listed Meenas as 'Criminal Tribe' – all Meena males had to report to police weekly.
- Leadership: Maharaj Bhim Singh; also Meena Seva Sangh.
- Demand: Remove criminal tribe tag.
- Post-independence: Criminal Tribes Act repealed 1952.
- Meenas = largest tribal community in Rajasthan.

GARASIA TRIBE MOVEMENTS:
- Region: Sirohi, Udaipur, Rajsamand.
- Against: Forced labour by Garasia feudal lords.
- Valar dance unique to Garasia tribe (performed without instruments).

OTHER TRIBAL RESISTANCE:
- BHAGAT MOVEMENT (Gujarat-Rajasthan border): A separate Bhagat movement among Bhils with different leadership.
- NAYAK MOVEMENT: Banswara-Dungarpur area.
- MAVJI MOVEMENT: Religious movement among Bhils; Mavji = prophet figure of Vagad (Dungarpur-Banswara).

TRIBAL COMMUNITIES OF RAJASTHAN:
1. BHIL: Largest tribal community; Banswara, Dungarpur, Udaipur, Chittorgarh.
2. MEENA: Second largest; Jaipur, Dausa, Sikar, Tonk.
3. GARASIA: Sirohi, Udaipur; speaks Garasi language.
4. SAHARIA: Baran district; unique among Rajasthan tribes.
5. DAMOR: Dungarpur.
6. KATHODIA: South Rajasthan.
7. BHIL MINA: Mixed community.

KEY EXAM FACTS:
1. Eki Movement = Motilal Tejawat = Unity Movement.
2. Motilal Tejawat = 'Banna' = 'Gandhi of Mewar'.
3. Chaura Massacre = 7 May 1922 = Eki Movement = 1200 killed.
4. Bhagat Movement = Govind Guru (Govind Giri) = 1883.
5. Mangarh Massacre = 17 November 1913 = 1500 Bhils = Adivasi Jallianwala.
6. Mangarh Dham = National Memorial (2022).
7. Govind Guru = Banswara-Dungarpur area.
8. Meena tribe = Criminal Tribes Act 1924 = largest tribe in Rajasthan.
9. Bhil = largest tribal community in Rajasthan.
10. Saharia = only Scheduled Tribe in Baran.
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 6 – Integration (mt=2145)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2145,
    topicId: 6,
    tier: 'PRE',
    count: 50,
    topicName: 'Integration of Rajasthan: The seven stages of state formation (1948-1956)',
    content: `
INTEGRATION OF RAJASTHAN – 7 PHASES – COMPREHENSIVE NOTES

BACKGROUND (PRE-INTEGRATION):
- Present-day Rajasthan was fragmented into:
  * 19 PRINCELY STATES (fully sovereign with British treaties).
  * 3 CHIEFSHIPS (smaller semi-sovereign units).
  * 2 British directly administered territories: Ajmer-Merwara & Sunel Tappa.
- Key architects: SARDAR VALLABHBHAI PATEL (Iron Man; Home Minister) + V.P. MENON (Secretary, Ministry of States).
- Challenge: Some rulers like Hanwant Singh (Jodhpur) explored joining Pakistan before agreeing to India.

PHASE 1 – MATSYA UNION (17 March 1948):
- States merged: ALWAR + BHARATPUR + DHOLPUR + KARAULI.
- Capital: ALWAR.
- Rajpramukh (constitutional head): UDAY BHAN SINGH (Maharaja of Dholpur).
- Named 'Matsya' after ancient Mahajanapada that covered this region.
- Bharatpur ruler BRIJENDRA SINGH led the merger initiative.
- Population: 18.7 lakh.

PHASE 2 – RAJASTHAN UNION (25 March 1948):
- States merged: BANSWARA + BUNDI + DUNGARPUR + JHALAWAR + KOTA + KISHANGARH + PRATAPGARH + SHAHPURA + TONK.
- Capital: KOTA.
- Rajpramukh: BHIM SINGH (Maharaja of Kota).
- Chief Minister (Pradhan Mantri): GOKUL LAL ASAWA.
- Combined state 9 small states of southern Rajasthan.

PHASE 3 – UNITED STATE OF RAJASTHAN (18 April 1948):
- MEWAR (Udaipur state) merged into Rajasthan Union.
- Capital: UDAIPUR (Mewar's strong influence; Udaipur being largest state in area).
- Rajpramukh (Maha-Rajpramukh): MAHARANA BHOPAL SINGH of Mewar (given senior position due to Mewar's prestige).
- Prime Minister (CM): MANIKYA LAL VERMA (first elected PM).
- Mewar ruler got precedence due to historical prestige of Mewar over other states.

PHASE 4 – GREATER RAJASTHAN (30 March 1949):
- Major states merged: JODHPUR + JAIPUR + JAISALMER + BIKANER.
- Capital: JAIPUR (significant decision – replacing Udaipur).
- Rajpramukh: MAHARAJA MAN SINGH II of Jaipur (given senior position due to Jaipur's size & wealth).
- Prime Minister (CM): HEERALAL SHASTRI.
- 30 MARCH = RAJASTHAN DIWAS (Rajasthan Day) – celebrated annually.
- Key issue: Jodhpur ruler HANWANT SINGH had nearly signed instrument to join Pakistan; persuaded last minute by Sardar Patel and V.P. Menon.
- Jaisalmer ruler also wavered.

PHASE 5 – UNITED GREATER RAJASTHAN (15 May 1949):
- Matsya Union (Alwar, Bharatpur, Dholpur, Karauli) merged into Greater Rajasthan.
- Simple administrative merger.
- Capital: JAIPUR (unchanged).

PHASE 6 – RAJASTHAN (26 January 1950):
- India became Republic on this date.
- SIROHI state merged (with some complications).
- ABU ROAD area of Sirohi was transferred to BOMBAY state (controversy).
- New constitutional framework applied.
- Rajpramukh title continued till 1956.

PHASE 7 – PRESENT RAJASTHAN (1 November 1956):
- STATES REORGANISATION ACT, 1956 (reorganisation of all Indian states on linguistic basis).
- Three changes:
  1. AJMER-MERWARA (centrally administered British territory) merged into Rajasthan.
  2. ABU ROAD area (from Bombay) returned to Rajasthan.
  3. SUNEL TAPPA area (from Madhya Pradesh) added to Rajasthan.
- Rajasthan attained its PRESENT BOUNDARIES.
- Rajpramukh position ABOLISHED; replaced by GOVERNOR (Dr. S.P. Sinha became first Governor actually; Gurmukh Nihal Singh was first properly appointed Governor).
- First Chief Minister (after 1956): MOHANLAL SUKHADIA (longest-serving CM of Rajasthan – 17 years).

CAPITALS AT EACH PHASE:
- Phase 1: Alwar
- Phase 2: Kota
- Phase 3: Udaipur
- Phase 4-6: Jaipur
- Phase 7: Jaipur (permanent capital)

RAJPRAMUKHS:
- Phase 1: Uday Bhan Singh (Dholpur)
- Phase 2: Bhim Singh (Kota)
- Phase 3: Bhopal Singh (Mewar) – designated Maha-Rajpramukh
- Phase 4+: Man Singh II (Jaipur)
- First Governor (post-1956): Gurmukh Nihal Singh (longest tenure)

PRIME MINISTERS/CMs SEQUENCE:
1. Gokul Lal Asawa (Phase 2 PM).
2. Manikya Lal Verma (Phase 3 PM).
3. Heeralal Shastri (Phase 4 PM – first PM of Greater Rajasthan; resigned 1951).
4. C.S. Venkatachari (1951 – brief).
5. Jainarayan Vyas (1951-52).
6. Tika Ram Paliwal (1952-54).
7. Mohanlal Sukhadia (1954-71 – longest).

HANWANT SINGH CONTROVERSY:
- Jodhpur's Hanwant Singh = most dangerous: Had signed a preliminary document for Pakistan.
- Lord Mountbatten met him; Patel & V.P. Menon travelled to Jodhpur urgently.
- Hanwant Singh agreed to join India after getting concessions (port at Kandla, Jodhpur airport improvements, arms import rights).
- Later: Hanwant Singh died in a plane crash (1952) while flying solo.

IMPORTANCE:
1. 30 March 1949 = Rajasthan Diwas.
2. 1 November 1956 = present boundaries (also day Karnataka was formed – states reorganisation day).
3. Ajmer = last to join (Phase 7).
4. Mewar = largest/most prestigious; hence Bhopal Singh = Maha-Rajpramukh.
5. Jodhpur nearly joined Pakistan.
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 10 – Folk Deities (mt=2165)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2165,
    topicId: 10,
    tier: 'PRE',
    count: 50,
    topicName: 'Folk Deities of Rajasthan (Panchpir, Tejaji, Devnarayan, Karni Mata)',
    content: `
FOLK DEITIES OF RAJASTHAN – COMPREHENSIVE NOTES

PANCH PIR (FIVE MALE FOLK DEITIES):

1. PABUJI (PABHUJI):
- Village: Kolumand (Jodhpur) – born at Dhanashal village.
- Community: Rajput (Rathore clan).
- Patron deity of: Camel herders, Rabari community.
- Vehicle: Black horse 'KESAR KALMI' (received from Lanka's princess Kelam De).
- Symbol: Spear (Bhala); flag.
- Story: Pabuji went to Lanka to bring camels for Deval Charan (his sister-in-law). Killed by Jindrav Khichi while protecting camels. He sacrificed his wedding ceremony to keep his promise.
- EPIC: PABUJI KA PHAD (large scroll painting; performed by BHOPA community using RAWANHATHA instrument while wife holds lantern).
- First to bring CAMEL to Rajasthan.
- Temple: Kolumand, Jodhpur.
- Fair: Phalguna Purnima (Holi).

2. RAMDEVJI (RAMDEV PIRA):
- Born: UNDKASMIR village, BARMER.
- Father: Ajmal Ji Tanwar (Rajput).
- Community: Tanwar (Tomara) Rajput.
- Called by Muslims: 'RAMA PIRA' or 'RAMSHAHPIR' = 5 Pirs/saints combined in one.
- RUNICHA (RAMDEVRA), Jaisalmer = main shrine (Samadhi here).
- Symbol/vehicle: TERRACOTTA HORSE (Ram Devji ki Ghodi) – devotees offer clay horses.
- FAIR: RAMDEVRA FAIR (Bhadra Shukla 2-11, i.e., August-September) = Largest communal fair (Hindu + Muslim).
- Songs: RAMDEVJI KE BYAVALE (marriage songs); Ratan Ratan Ramdev songs.
- EPIC: Ramdev Ka Phad.
- Followers: ALL communities (major Hindu-Muslim unity symbol).
- Rivals: Bhairon (Bherawa/Bhaironji) = enemy demon.
- Dates: Born 1352 AD, achieved Samadhi 1385 AD.
- Performed 33 RAMDEOJI MIRACLES (legends of healing the sick, leprosy, etc.).
- Nedajima = Muslim woman devotee (given shelter and respect by Ramdevji).

3. GOGAJI (GOGA):
- Born: DADREWA, CHURU (to Bachar Singh Rathore Rajput and Bachhal Devi).
- Called: 'JAHAR PIR' by Muslims (Jahar = poison; snake-bite deity).
- Symbol: Serpent/Snake (Nagraj).
- Vehicle: Blue horse with black flag.
- Main Shrine: GOGAMEDI, HANUMANGARH (on banks of Ghaggar river).
- FAIR: GOGAMEDI FAIR (Bhadra Krishna 9 = Goganomi/Goga Navami).
- Unique: Both Hindus and Muslims worship Gogaji (with both temple and mosque at Gogamedi).
- SAHIB KHAN = his Muslim companion (worshipped alongside Gogaji by Muslims).
- Story: Born due to blessing of Guru GORAKHNATH; fought Arjan & Surjan (cousins) who stole his cattle; killed by a snake.
- Also worshipped as: Protector against snake bites.
- Also called: 'Jahar Veer Gogaji'.

4. HADBUJI (HARBHUJI):
- Village: BHENSWAD, NAGAUR.
- Community: SANKHLA Rajput.
- Family relation: Maternal uncle of PABUJI (or devotee according to other versions).
- Community worshippers: HINDS (particular artisan community).
- Symbol: OX (Bail).
- Vehicle: Cart drawn by ox.
- Disciple of: Ramanand (from Varanasi).
- Known for: Protection of cattle and farmers.

5. MEHAJI MANGALIYA:
- Village: BAPTA village, JODHPUR.
- Community: MANGALIYA Rajput.
- Sister: BAI.
- Known for: Heroic resistance; killed by enemy invaders.
- Worshipped mainly by Jat community of Nagaur-Jodhpur.

TEJAJI:
- Born: KHARNAL, NAGAUR (to Tahar Jat and Ramsari Devi).
- Community: Jat community.
- Called: 'Snake deity' / 'Deity of snake bites'.
- Story: Tejaji was going to rescue Pemal (a Jat woman whose cattle were stolen by Mina tribe); while saving her, he received a snake bite. He was about to get married but broke marriage to keep his promise.
- Symbol: Serpent on tongue.
- Main Fair: PARBATSAR FAIR (Nagaur) – Bhadra Shukla 10-15 = LARGEST CATTLE FAIR OF RAJASTHAN.
- Also worshipped at: BANDAI (Ajmer), Parewr, Sursura.
- Vahana: White horse.
- Fair: Bhadra Shukla Dashami (10th day of bright fortnight of Bhadra/August).
- Worshippers: Jat, Gujar, farmers who raise cattle.

DEVNARAYAN JI (DEVJI):
- Born: GOTH MANGLOD, AJMER (to Savai Bhoj Gurjar).
- Community: Gujar community.
- Also called: DEVA BAGARIYA; regarded as incarnation of VISHNU (Bhagwan Vishnu's 24th avatar according to Gurjars).
- Symbol: Blue horse (LEELAAGAR/Neela Ghoda).
- EPIC: DEVNARAYAN KA PHAD = World's longest painted scroll (approximately 30 feet / 15 metres long).
  * Performed by GUJAR BHOPA.
- Main Shrine: ASIND, BHILWARA.
- FAIR: ASIND FAIR (Bhadra Shukla 6 = Shashthi, August-September).
  * Also: DEVDHUNI fair.
- Special: India's postal department issued a POSTAGE STAMP on Devnarayan.
- UNESCO involvement: Devnarayan Phad included in UNESCO's Representative List of Intangible Cultural Heritage (2013).
- Devotees: Gujar community (spread across Rajasthan, UP, MP, Gujarat).

KARNI MATA:
- Born: SUWAP village, PHALODI (Jodhpur) – to Meha Charan.
- Community: CHARAN community (bard/poet community).
- Regarded as: Incarnation of DURGA (Mata Shakti).
- Main Temple: DESHNOK, BIKANER.
  * Famous for: 25,000 KABA (sacred rats) living in temple.
  * Eating utensils of rats = PRASAD (holy offering).
  * WHITE RAT = MOST AUSPICIOUS (seeing it = direct darshan of Karni Mata).
  * Rats are believed to be: Dead Charans reincarnated (will be reborn as Charans).
- Dates: Born 1387 AD; achieved Samadhi 1538 AD (lived 151 years – according to legend).
- Story: Prayed to Yama (death god) to revive dead son Laxman; Yama said rats would be given life instead.
- Bikaner rulers: From Bika (1488) to British era; all took blessings of Karni Mata for battles.

OTHER IMPORTANT FOLK DEITIES:
SHEETLA MATA:
- Main temple: SHEEL KI DUNGRI, CHAKSU, JAIPUR.
- Deity of: Smallpox, measles, pox diseases.
- Main fair: Chaitra Krishna 8 (8th day of dark fortnight, March-April).
- Vahana: DONKEY (Gadha) – unique vahana.
- Offerings: Cold food (Basoda festival – food cooked day before offered cold).
- Also at: Bharatpur and other places.

JEEN MATA:
- Location: REEVASA, SIKAR (Khatu area).
- Sister of: HARSH BHAIRAV (her brother worshipped at adjacent hill).
- Powers: Has 100 EYES – sees everything simultaneously.
- Fair: Chaitra & Ashwin NAVRATRI (9-day festivals).

KAILA DEVI:
- Location: KAILA DEVI SANCTUARY, KARAULI.
- Community: Yadav (Gurjar) community.
- Famous Fair: KAILA DEVI FAIR (Chaitra Shukla 1-14 = biggest fair of Karauli).
- Unique: LANGURIYA folk songs sung at this fair (devotional-erotic songs unique to Kaila Devi).
- Karauli dynasty worshipped her as kuldevi.

SACHIA MATA (SACHIYA MATA):
- Location: OSIAN, JODHPUR.
- Temple: Built by PRATIHARA rulers (8th-9th century).
- Oswal Jain community's kuldevi (clan goddess).

KEY EXAM FACTS:
1. Pabuji = camel deity = Bhopa = Rawanhatha instrument = Kolumand.
2. Ramdevji = Runicha = Bhadra Shukla 2-11 = Tanwar Rajput = Rama Pira.
3. Gogaji = Jahar Pir = snake deity = Gogamedi (Hanumangarh).
4. Tejaji = Jat deity = Parbatsar fair = largest cattle fair.
5. Devnarayan = Gujar deity = world's longest Phad (30 ft) = Asind.
6. Karni Mata = Charan community = 25,000 rats = Deshnok.
7. Sheetla Mata = smallpox = donkey vahana = Chaksu (Jaipur).
8. Kaila Devi = Languriya songs = Karauli.
9. Jeen Mata = 100 eyes = Sikar.
10. India issued postage stamp on Devnarayan.
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 10 – Saints & Sects (mt=2163)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2163,
    topicId: 10,
    tier: 'PRE',
    count: 50,
    topicName: 'Religious Life: Saints and Sects of Rajasthan (Dadupanth, Jasnathi, Bishnoi, Ramsnehi)',
    content: `
SAINTS AND SECTS OF RAJASTHAN – COMPREHENSIVE NOTES

DADU DAYAL (DADUPANTH):
- Born: AHMEDABAD (Gujarat), 1544 AD.
- Community: Muslim weaver (Naddaf/Dhuniya) family.
- Migrated to RAJASTHAN and preached across region.
- Settled at: SAMBHAR (Jaipur) initially; final abode at NARAYANA (Jaipur) = main seat of Dadupanth.
- Died: 1603 AD at Narayana.
- Philosophy: NIRGUNA BHAKTI (formless, attributeless God); Hindu-Muslim unity; no idol worship.
- Met AKBAR at Fatehpur Sikri (Dadu was brought to discuss theology).
- Disciples: 52 principal disciples; two most famous: Rajjab Ji, Sundardas.
- SUNDARDAS: Best poet of Dadupanth; 'Gyaan Samudar' famous work.
- Rajjab Ji: Composed 'Sarbangi' (collected teachings of multiple saints).
- PANCH-VANI: Collection of teachings of 5 saints (Kabir, Namdev, Raidas, Hardas, Dadu) by Rajjab.
- Sub-sects of Dadupanth:
  * NAAGA: Armed saints who provided military protection.
  * VIRAAGI: Wandering saints.
  * UTHALE: Continuously moving saints.
  * KHAKI: Wear grey/ash-smeared robes.
  * STHANADHARIS: Settled saints who manage temples.
- Gurumata: Collection of Dadu's own sayings/teachings.
- Guru of Dadu: BUDHAN (a Muslim saint, follower of Kabir's lineage).

JASNATH JI (JASNATHI SECT):
- Born: KATARIASAR, BIKANER (1482 AD).
- Father: Hameer (a Jat farmer).
- Community: JAT community.
- Philosophy: Against idol worship, non-violence (ahimsa), vegetarianism.
- Preaching style: Used language of ordinary people.
- FIRE DANCE (AGNI NRITYA):
  * Unique ritual of Jasnathis.
  * Devotees DANCE ON BURNING COALS/EMBERS while chanting.
  * Performed on religious occasions, Holi, and festivals.
  * Mostly in Bikaner, Churu district.
- 36 NIYAM (rules): Followers must observe 36 specific rules of conduct.
- Main Seat: KATARIASAR (Bikaner) and GORAKHSAR.
- Samadhi: Katariasar.

JAMBHOJI (BISHNOI SECT / VISHNOISM):
- Born: PIPASAR, NAGAUR (1451 AD).
- Family: PANWAR Rajput.
- Also called: GURU JAMBHESHWAR / JAMBHA JI.
- Samadhi: MUKAM (BICHHWAL), BIKANER = main shrine of Bishnoi community.
  * Mukam fair: Phalguna Amavashya (largest Bishnoi gathering).
- NAME: BISHNOI = BIS (20) + NOI (9) = 29 (BISHNOI = followers of 29 principles).
- 29 PRINCIPLES (Udesh) include:
  * Do not cut green/live trees.
  * Do not kill animals (especially protected species: blackbuck, peacock, tree).
  * No blue dye clothing (indigo requires cutting plants).
  * No opium, no tobacco, no alcohol.
  * Maintain purity of body and environment.
  * Compassion for all living beings.
  * Cremate dead only with dead (dry) wood.
- Deity: VISHNU (Bishnoi = Vaishnava sect).
- KHEJARLI MASSACRE (1730 AD):
  * Location: KHEJARLI village, JODHPUR (Marwar).
  * Event: Maharaja ABHAY SINGH of Jodhpur sent woodcutters to cut Khejri trees for lime-burning.
  * AMRITA DEVI (Bishnoi woman) hugged the tree; woodcutters cut off her head.
  * Her 3 daughters followed; then village by village Bishnois came forward.
  * 363 BISHNOIS SACRIFICED their lives hugging Khejri trees to save them.
  * Called: FIRST ENVIRONMENTAL MARTYRDOM in the world.
  * Inspired: CHIPKO MOVEMENT (1973, Uttarakhand) centuries later.
  * Maharaja eventually stopped the cutting and issued orders never to cut trees in Bishnoi villages.
- Annual memorial: Khejarli village, Bhadra Shukla 10 (Khejarli Mela).
- KHEJRI TREE (Prosopis cineraria) = RAJASTHAN'S STATE TREE; sacred to Bishnois.
- Bishnoi practice today: PROTECT BLACKBUCK, PEACOCK, and trees at personal cost.
  * Bishnoi villages have high wildlife density because of protection.

RAMSNEHI SAMPRADAY (RAMSNEHI SECT):
- Founder: RAMCHARANDAS (also: Sant Ram Charan Ji).
  * Born: Sodha Rajput family, 1720 AD.
  * Birth place: Village Bantol, Tonk (some sources: Shahpura).
  * Main seat: SHAHPURA, BHILWARA (where he spent years and is enshrined).
- Philosophy: Pure love of Ram (Rama); path of Bhakti; no rituals or caste distinctions.
- 4 BRANCHES (Peeths):
  1. SHAHPURA BRANCH (Bhilwara): By Ramcharandas = MAIN SEAT.
  2. REENWAS BRANCH (Sikar): By DARIYAV JI.
  3. SINGHTHALI BRANCH (Bikaner): By HARIDAS JI.
  4. KHEDA BRANCH (Nagaur): By RAM DAS JI.
- Main scripture: ANANDGHANA GRANTH (by Ramcharandas).
- Followers called: Ramsnehi.
- Similar to Kabir Panth but specifically Rajasthani.

CHARANDAS JI:
- Born: DEHRA, ALWAR (1703 AD).
- 42 NIYAM (rules for disciples).
- Philosophy: Nirguna Bhakti; anti-ritualism; equality of all.
- Main seat: DELHI (Charan Das ki Haveli, Delhi).
- Two famous female disciples:
  * SAHJO BAI (born in Sikar; composed 'Sahaj Prakash' and devotional poetry in Braj Bhasha).
  * DAYA BAI (composed 'Daya Bodh'; Hindi devotional poetry).
- Charandasi Sampraday = his followers.

HARIDAS JI (NIRANJANI SAMPRADAY):
- Born: KAPRIYAS, NAGAUR (1703 AD).
- Seat: GADWASI, NAGAUR.
- Philosophy: Nirguna, formless God (Niranjan); anti-idol worship.
- Disciples: Farmers and common people of Nagaur-Sikar.

LALDAS JI:
- Region: MEWAT (Alwar).
- Followers: MEO MUSLIM community (started following Laldas; Hindu-Muslim unity).
- Laldasi Sampraday.

RAIDAS (RAVIDAS) JI:
- Caste: Chamar (cobbler) community, Varanasi.
- Disciple of: RAMANAND (Vaishnava saint of Kashi).
- Philosophy: Cast no barrier in devotion; God sees bhakti not caste.
- Connection to Rajasthan: MEERA BAI (princess of Merta, Rajasthan; wife of Rana Sangram Singh's son Bhoj Raj) was Raidas's DISCIPLE.
  * Meera Bai composed: 'Mera Toh Giridhar Gopal Doosro Na Koye' (Krishna devotion).
  * Meera's uncle: Veer Durgadas Rathore (in Jodhpur tradition).
- Raidas included in Sikh Adi Granth.

MAVJI (MAVJEE MAHARAJ):
- Born: SAPDALWAS village, DUNGARPUR (exact birth details debated).
- Period: 18th century.
- Deity/deity-like figure of VAGAD region (Dungarpur-Banswara area).
- Written: CHAUPAIYA (prophecies about future in verse form).
- Followers: Bhil tribals primarily.
- Called: KALKI AVATAR (future incarnation of Vishnu).
- Vahana: White horse.

DHANNA BHAGAT:
- Born: TONK district, Rajasthan.
- Community: JAT community.
- Nirguna Bhakti saint.
- INCLUDED IN ADI GRANTH (Sikh scripture) – one of very few Rajasthani saints thus honored.
- Follower of: Ramanand's tradition.
- Known for: Incredible devotion in simple farming life.

PIPA JI:
- Born: GARHDHAR (RAJGARH, TONK district).
- Was RAJPUT PRINCE (ruler of Garhdhar).
- Disciple of: RAMANAND (Vaishnava saint, Kashi/Varanasi).
- Renounced his kingdom to become saint.
- Connected to: Born at Gagron Fort area (some sources).
- Known for: Spreading Vaishnava devotion in Hadoti region.

KEY EXAM FACTS:
1. Dadu Dayal = Ahmedabad born = Narayana (Jaipur) = Nirguna Bhakti.
2. Dadupanth sub-sects: Naaga, Viraagi, Uthale, Khaki, Sthanadharis.
3. Jambho Ji = Pipasar Nagaur = 29 principles = Mukam samadhi.
4. Bishnoi = BIS+NOI = 29.
5. Khejarli massacre = 1730 = 363 Bishnois = Amrita Devi = eco-martyrdom.
6. Chipko Movement inspired by Khejarli.
7. Khejri = Rajasthan's state tree.
8. Jasnath Ji = Katariasar Bikaner = Fire Dance = 36 niyam.
9. Ramsnehi = Ramcharandas = Shahpura = 4 branches.
10. Charandas = Dehra Alwar = 42 niyam = Sahjo Bai + Daya Bai.
11. Dhanna Bhagat = Tonk = in Adi Granth.
12. Meera Bai = Merta, Nagaur = Krishna devotee = Raidas's disciple.
`
  },

];

// ─────────────────────────────────────────────────────────
// Set correct count for all subtopics
// ─────────────────────────────────────────────────────────
SUBTOPICS.forEach(s => {
    if (!s.tier) s.tier = 'PRE';
    if (!s.count) s.count = 50;
});

// ============================================================
// MULTIPART FORM BUILDER (no external deps)
// ============================================================
function buildMultipart(fields, file) {
    const boundary = 'RASBoundary' + Date.now().toString(36);
    const CRLF = '\r\n';
    let parts = [];

    for (const [name, value] of Object.entries(fields)) {
        parts.push(Buffer.from(
            `--${boundary}${CRLF}` +
            `Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}` +
            `${value}${CRLF}`
        ));
    }

    parts.push(Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="pdfFiles"; filename="${file.filename}"${CRLF}` +
        `Content-Type: text/plain${CRLF}${CRLF}`
    ));
    parts.push(file.content);
    parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`));

    return { body: Buffer.concat(parts), boundary };
}

function callGenerateAPI(subtopic, tier, count) {
    return new Promise((resolve, reject) => {
        const fields = {
            tier,
            topicId: subtopic.topicId.toString(),
            minuteTopicId: subtopic.minuteTopicId.toString(),
            count: count.toString()
        };
        const file = {
            filename: `notes_${subtopic.minuteTopicId}.txt`,
            content: Buffer.from(subtopic.content, 'utf8')
        };
        const { body, boundary } = buildMultipart(fields, file);

        const options = {
            hostname: 'rpsc-ras-backend.onrender.com',
            path: '/api/admin/generate-questions-from-pdf',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            },
            timeout: 300000 // 5 minutes (Gemini may take time for 50 questions)
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ result: JSON.parse(data), status: res.statusCode }); }
                catch (e) { resolve({ result: data.substring(0, 500), status: res.statusCode }); }
            });
        });

        req.on('timeout', () => { req.destroy(); reject('Request timed out after 5 minutes'); });
        req.on('error', err => reject(err.message));
        req.write(body);
        req.end();
    });
}

// ============================================================
// MAIN EXECUTION
// ============================================================
async function main() {
    console.log('\n🚀 RPSC RAS Master Question Generator');
    console.log('   PRE: 50 MCQs per subtopic (EN + HI = 100 total)');
    console.log('   MAINS: 30 Qs per subtopic (EN + HI = 60 total)');
    console.log(`   Total subtopics: ${SUBTOPICS.length}`);
    console.log('='.repeat(70));

    let grandTotal = 0;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < SUBTOPICS.length; i++) {
        const subtopic = SUBTOPICS[i];
        console.log(`\n[${i+1}/${SUBTOPICS.length}] "${subtopic.topicName}"`);

        // ── PRE: 50 questions ──
        console.log(`   ➤ Generating 50 PRE MCQs...`);
        try {
            const r = await callGenerateAPI(subtopic, 'PRE', 50);
            if (r.status === 200 && r.result.message) {
                console.log(`      ✅ PRE: ${r.result.message}`);
                grandTotal += r.result.count || 0;
                successCount++;
            } else {
                console.log(`      ⚠️  PRE Status ${r.status}:`, JSON.stringify(r.result).substring(0, 300));
                failCount++;
            }
        } catch (err) {
            console.error(`      ❌ PRE FAILED: ${err}`);
            failCount++;
        }
        console.log('      ⏳ Waiting 10s before MAINS...');
        await new Promise(r => setTimeout(r, 10000));

        // ── MAINS: 30 questions ──
        console.log(`   ➤ Generating 30 MAINS questions...`);
        try {
            const r = await callGenerateAPI(subtopic, 'MAINS', 30);
            if (r.status === 200 && r.result.message) {
                console.log(`      ✅ MAINS: ${r.result.message}`);
                grandTotal += r.result.count || 0;
                successCount++;
            } else {
                console.log(`      ⚠️  MAINS Status ${r.status}:`, JSON.stringify(r.result).substring(0, 300));
                failCount++;
            }
        } catch (err) {
            console.error(`      ❌ MAINS FAILED: ${err}`);
            failCount++;
        }

        if (i < SUBTOPICS.length - 1) {
            console.log('      ⏳ Waiting 15s before next subtopic...');
            await new Promise(r => setTimeout(r, 15000));
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ COMPLETED: ${successCount} API calls succeeded, ${failCount} failed`);
    console.log(`📦 Total questions seeded into production DB: ${grandTotal}`);
    console.log(`Expected: ${SUBTOPICS.length * (100 + 60)} = ${SUBTOPICS.length * 160} total`);
}

main().catch(console.error);
