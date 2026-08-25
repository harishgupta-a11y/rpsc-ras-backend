/**
 * RPSC RAS – Batch 2: Art, Culture, Economy Question Generator
 * Calls production API endpoint with exhaustive notes text for each subtopic.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');
const FormData = require('form-data');

const SUBTOPICS_BATCH2 = [

  // ─────────────────────────────────────────────────────────
  // TOPIC 7 – Forts & Palaces (minute_topic_id=2147)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2147,
    topicId: 7,
    tier: 'PRE',
    count: 15,
    topicName: 'Architectural Traditions of Rajasthan: Prominent Forts & Inaccessible Defenses',
    content: `
RAJASTHAN FORTS – EXHAUSTIVE NOTES

UNESCO WORLD HERITAGE FORTS (Hill Forts of Rajasthan, 2013):
1. CHITTORGARH FORT (Chittorgarh) – Bhim Laat, 3 Sakas
2. KUMBHALGARH FORT (Rajsamand) – built by Kumbha, architect Mandan; Great Wall of India
3. RANTHAMBHORE FORT (Sawai Madhopur) – Chauhan dynasty
4. AMBER FORT (Jaipur) – Kachwaha dynasty, Jai Singh
5. JAISALMER FORT (Jaisalmer) – Bhati Rajputs, Jaisal; living fort
6. GAGRON FORT (Jhalawar) – confluence of Kali Sindh & Ahu rivers; 2 Sakas

MAJOR FORTS:

MEHRANGARH (JODHPUR):
- Built by: Rao Jodha (1459 AD).
- Location: Chidiyatunk / Bhakurchidiya hill.
- Also called: Mayur Dhwaja (peacock flag).
- 7 gates: Fateh Pol, Gopal Pol, Bhairon Pol, Dedh Kamgra Pol, Loha Pol, Suraj Pol, Amrita Pol.
- Museum inside.

JAIGARH (JAIPUR):
- Built by: Sawai Jai Singh II.
- 'Victory Fort'.
- Houses Jaivana cannon (world's largest cannon on wheels).
- Connected by underground passage to Amber Fort.

NAHARGARH (JAIPUR):
- Also called: Nahar Garh / Tiger Fort.
- Built by: Sawai Jai Singh II (1734 AD).
- Has 12 identical suites (for 12 queens).
- Overlooking Jaipur city.

AMBER FORT:
- Built by: Man Singh I (begun 1592 AD).
- Shila Mata (Durga) temple inside.
- Sheesh Mahal (Mirror Palace) – inlaid with mirror work.
- Diwan-i-Aam, Diwan-i-Khas inside.

JUNAGARH FORT (BIKANER):
- Built by: Rai Singh (1589 AD).
- Never captured – only fort in India never to fall.
- Has 37 palaces inside.

TARAGARH (AJMER):
- Built by: Ajayraj Chauhan (1001 AD).
- Also called: 'Star Fort'.
- British converted to magazine dump.
- Miran Shah's tomb inside.

TARAGARH (BUNDI):
- Built by: Barel (Bundi founder's son).
- 4 gates; connected to Garh Palace.

ACHALGARH (ABU ROAD):
- Built/renovated by: Kumbha.
- Temple of Achaleshwar Shiva.
- Mandakini tank nearby.

KUMBHALGARH FORT:
- Built by: Kumbha (15th century); architect Mandan.
- Wall: 36 km long (second longest wall in world after Great Wall of China) = 'Great Wall of India'.
- Pratap was born here (1540 AD).
- Has 360+ temples.

JAISALMER FORT:
- Built by: Bhati Rajput Jaisal (1156 AD).
- Also called: Sonar Qila (Golden Fort) – made of yellow sandstone.
- Living fort (people still live inside).
- 3 layers of wall.
- Trikuta hill.

GAGRON FORT (JHALAWAR):
- Built by: Dodiya Rajputs.
- Unique: Only fort surrounded by water on 3 sides (Kali Sindh + Ahu rivers + moat).
- 2 Sakas: 1st Saka (1423 AD), 2nd Saka (1444 AD – Mahmud Khilji vs Achal Das).
- Pipa Ji (saint) was born here.

LOHAGARH (BHARATPUR):
- Also called: Iron Fort.
- Built by: Suraj Mal (Jat king, 1733 AD).
- Never captured by British (multiple attempts failed 1803-1805).
- 3 moats surrounding it.

RANTHAMBHORE:
- Built by: Chahamana (Chauhan) ruler Vagbhata.
- Hammir Chauhan's resistance here.
- Famous for Tiger Reserve (Project Tiger 1973).

KEY EXAM FACTS:
1. 6 UNESCO Hill Forts of Rajasthan (2013).
2. Great Wall of India = Kumbhalgarh (36 km wall).
3. World's largest wheeled cannon = Jaivana cannon = Jaigarh Fort.
4. Never-captured fort = Junagarh (Bikaner).
5. Living fort = Jaisalmer.
6. Sonar Qila = Jaisalmer.
7. Lohagarh = never captured by British = Bharatpur (Jat).
8. Gagron = water fort on 3 sides.
9. Mehrangarh has 7 gates.
10. Amber Fort = Man Singh I = Sheesh Mahal.
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 8 – Folk Music & Instruments (minute_topic_id=2157)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2157,
    topicId: 8,
    tier: 'PRE',
    count: 12,
    topicName: 'Rajasthani Music: Classical, Folk Traditions & Folk Instruments',
    content: `
RAJASTHANI MUSIC & INSTRUMENTS – EXHAUSTIVE NOTES

FOLK INSTRUMENTS CATEGORIES:

TATA VADYA (Stringed):
- RAWANHATHA: Oldest bow instrument; played by Bhopas (Pabuji phad singers); from Sirohi; 2 main strings.
- SARANGI: 3 main strings + 15 sympathetic strings; played by Langaas & Manganiyar.
- KAMACHA: Played by Manganiyar community (Jaisalmer).
- JANTAR: Used by Damami, similar to Veena.
- CHIKARA: Used by Kalbeliya community.
- BHAPANG: Plucked drone instrument.
- RAVANJI: Folk Veena.

AVANADDHA (Percussion):
- DHOL: Large double-headed drum.
- DHOLAK: Smaller version; used everywhere.
- NAGADA / NAKKARA: Kettle drums; used in pairs; played at temples and processions.
- DHAULAK: Similar to dholak.
- DUFF / DAPPH: Frame drum; used by women.
- CHANG: Large frame drum used in Shekhawati during Holi.
- KHARTAL: Wooden clappers (castanet-style); used by Manganiyar, Langaa.
- MANJEERA: Small cymbals.
- TABLA: Classical percussion (urban).
- MRIDANGAM: South Indian classical (some use in Rajasthan).

SUSHIRA VADYA (Wind):
- BEEN / BIN: Double-pipe played by Kalbelia community (snake charmers).
- SHEHNAI: Oboe-like; played at auspicious occasions.
- BANKIA / BANKA: Curved ceremonial horn (military use).
- MURALI/BANSURI: Flute.
- POONGI: Played by Jogi community.
- SATARA: Double flute played simultaneously.
- ALGOZA/ALGHOZA: Double flute instrument (Rajasthan & Punjab).
- NARSINGH: Curved ceremonial trumpet.
- MORCHANG: Jaw harp; used by Saperas.

GHANA VADYA (Solid/Idiophone):
- KHARTAL: Wooden clappers.
- THALI: Plate-shaped.
- MANJIRA: Cymbals.

MUSIC COMMUNITIES:
- MANGANIYAR: From Jaisalmer & Barmer; play Kamacha & Khartal; serve Rajput patrons.
- LANGAA: From Jaisalmer & Barmer; play Sarangi & Sindhi Sarangi; hereditary musicians.
- BHOPA: Story-telling musicians (Pabuji phad) play Rawanhatha.
- MIRASI/DHAADHI: Praise-singers.
- BHAND: Entertainers/jesters.
- KALBELIA: Play Been (snake-charmer community); UNESCO Intangible Heritage for Kalbelia dance (2010).

CLASSICAL MUSICAL LEGACY:
- Kumbha composed: Sangeet Raj, Sangeet Mimamsa (music treatises).
- Tansen stayed at Akbar's court (from Gwalior but influenced Rajasthan).

KEY FOLK SONGS:
- Panihari: Songs sung while carrying water pots.
- Mordhvani: Songs of peacock.
- Kurjan/Kurjaa: Songs of crane (sarus).
- Ghoomar songs.
- Hichki: Songs of hiccup (missing lover).
- Mand: A classical-folk music style of Rajasthan; associated with Jaisalmer.
  * Best known exponent: Gavri Devi (Bikaner), Allen Ke Phool.
  * Mand is the only Rajasthani classical music form.

KEY EXAM FACTS:
1. Rawanhatha = oldest string instrument = played by Bhopa.
2. Manganiyar & Langaa = Jaisalmer-Barmer = play Kamacha/Khartal/Sarangi.
3. Been = Kalbelia = Poongi = snake charmer instrument.
4. Chang = Shekhawati Holi = large frame drum.
5. Khartal = wooden clappers = Manganiyar signature.
6. Mand = only classical folk music of Rajasthan = Jaisalmer.
7. Satara = double flute = unique to Rajasthan.
8. Kumbha wrote Sangeet Raj = musical treatise.
9. Kalbelia dance = UNESCO Intangible Heritage 2010.
10. BEEN = double pipe = Kalbelia.
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 6 – Integration (minute_topic_id=2145)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2145,
    topicId: 6,
    tier: 'PRE',
    count: 12,
    topicName: 'Integration of Rajasthan: The seven stages of state formation (1948-1956)',
    content: `
INTEGRATION OF RAJASTHAN – 7 PHASES (1948-1956) – EXHAUSTIVE NOTES

BACKGROUND:
- Before independence, present-day Rajasthan had 19 princely states + 3 chiefships + 2 British territories.
- Key role: Sardar Vallabhbhai Patel (Iron Man of India) & V.P. Menon (Secy, States Ministry).

PHASE 1 – MATSYA UNION (17 March 1948):
- States merged: Alwar, Bharatpur, Dholpur, Karauli.
- Capital: ALWAR.
- Rajpramukh: Uday Bhan Singh (Dholpur).
- Named 'Matsya' (ancient Mahajanapada of region).
- Bharatpur ruler Brijendra Singh requested merger.

PHASE 2 – RAJPUTANA UNION / RAJASTHAN UNION (25 March 1948):
- States: Banswara, Bundi, Dungarpur, Jhalawar, Kota, Kishangarh, Pratapgarh, Shahpura, Tonk.
- Capital: KOTA.
- Rajpramukh: Bhim Singh of Kota.
- Chief Minister (Pradhan Mantri): Gokul Lal Asawa.

PHASE 3 – UNITED STATE OF RAJASTHAN (18 April 1948):
- Mewar merged into Rajasthan Union.
- Capital: UDAIPUR.
- Rajpramukh: Maharana Bhopal Singh of Mewar.
- Prime Minister: Manikya Lal Verma.

PHASE 4 – GREATER RAJASTHAN (30 March 1949):
- Major states joined: Jodhpur, Jaipur, Jaisalmer, Bikaner.
- Capital: JAIPUR (major shift).
- Rajpramukh: Maharaja Man Singh II of Jaipur.
- Prime Minister (CM): Heeralal Shastri.
- Note: 30 March = Rajasthan Day (celebrated as Rajasthan Diwas).

PHASE 5 – UNITED GREATER RAJASTHAN (15 May 1949):
- Matsya Union merged into Greater Rajasthan.
- Population of Alwar, Bharatpur, Dholpur, Karauli added.

PHASE 6 – RAJASTHAN (26 January 1950):
- Sirohi merged (with some villages).
- India became Republic on this day.
- New constitution applied.
- Abu Road area given to Bombay (controversy: Sirohi wanted to join Bombay).

PHASE 7 – PRESENT RAJASTHAN (1 November 1956):
- States Reorganisation Act 1956.
- Ajmer-Merwara (centrally administered British territory) merged.
- Abu Road area (Sirohi) returned from Bombay to Rajasthan.
- Sunel Tappa area from Madhya Pradesh added.
- Rajasthan attained its current boundaries.
- First CM (after 1956): Mohanlal Sukhadia (longest serving CM of Rajasthan).

IMPORTANT CAPITALS:
- Alwar (Phase 1), Kota (Phase 2), Udaipur (Phase 3), Jaipur (Phase 4 onwards).

RAJPRAMUKHS:
- Phase 1: Uday Bhan Singh.
- Phase 2: Bhim Singh (Kota).
- Phase 3: Bhopal Singh (Mewar).
- Phase 4 onward: Man Singh II (Jaipur) = Rajpramukh till 1956.
- First Governor (after 1956): Gurmukh Nihal Singh (also longest serving).

CONTROVERSIES:
- Jodhpur ruler Hanwant Singh wanted to join Pakistan (later agreed to India).
- Jaisalmer ruler also wavered; Barmer-Jaisalmer area could have gone to Pakistan.
- Sirohi: Abu Road dispute between Rajasthan & Bombay.

30 MARCH = RAJASTHAN DIWAS (Rajasthan Day) – Phase 4 (Greater Rajasthan, 1949).

KEY EXAM FACTS:
1. Total 7 phases of integration.
2. Phase 1 – Matsya Union – 17 March 1948 – Capital Alwar.
3. Phase 4 – Greater Rajasthan – 30 March 1949 – Rajasthan Day.
4. Phase 7 – 1 November 1956 – present boundaries.
5. Sardar Patel + V.P. Menon = key architects.
6. Ajmer merged in Phase 7 (was directly under British).
7. Heeralal Shastri = first PM of Greater Rajasthan.
8. Mohanlal Sukhadia = first CM after 1956 reorganisation.
9. Man Singh II of Jaipur = Rajpramukh Phase 4 onwards.
10. Hanwant Singh (Jodhpur) nearly joined Pakistan.
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 10 – Festivals & Social Life (minute_topic_id=2167)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2167,
    topicId: 10,
    tier: 'PRE',
    count: 12,
    topicName: 'Social Life: Fairs, Festivals & Attires of Rajasthan',
    content: `
FAIRS & FESTIVALS OF RAJASTHAN – EXHAUSTIVE NOTES

MAJOR ANIMAL & CATTLE FAIRS:
1. PUSHKAR FAIR (Ajmer): Kartik Shukla 11-15 – camel & cattle; also Brahma temple; international attendance.
2. TEJAJI FAIR (Parbatsar, Nagaur): Bhadra Shukla 10-15; largest cattle fair of Rajasthan; Jat deity Teja.
3. MALLINATH FAIR (Tilwara, Barmer): Chaitra; cattle fair on Luni river.
4. RAMDEVRA FAIR (Pokharan, Jaisalmer): Bhadra Shukla 2-11; Ramdev Pir.
5. GOGAMEDI FAIR (Hanumangarh): Bhadra Krishna 9; Gogaji/Jahar Pir.
6. BENESHWAR FAIR (Dungarpur): Magh Purnima; Adivasi Kumbh; confluence of Mahi-Som-Jakham rivers; called Tribal Kumbh.
7. KAILA DEVI FAIR (Karauli): Chaitra Shukla; Languriya songs.
8. CHANDRABHAGA FAIR (Jhalawar): Kartik Shukla 11; horse fair.
9. SITALAMATA FAIR (Chaksu, Jaipur): Chaitra Krishna 8.
10. MEWAR FESTIVAL (Udaipur): Gangaur festival celebrated with boat procession.

MAJOR FESTIVALS:

GANGAUR (Rajasthan's biggest festival):
- Chaitra Shukla 3 (3rd day after Holi).
- Women pray for: married women – husband's long life; unmarried – good husband.
- Symbol: Clay idols of Gauri (goddess) & Isar (Shiva as husband).
- Procession: Women carry idol pots on head.
- Major celebration: JAIPUR (state government procession), Udaipur (boat procession).
- Gawar/Gauri = Parvati; Isar = Shiva.

TEEJ:
- Two types: HARIYALI TEEJ (Sawan Shukla 3) and KAJALI TEEJ (Bhadra Krishna 3).
- Small Teej = Hariyali Teej; Big Teej = Kajali Teej.
- Women pray for husband's long life; swings put up on trees.
- Jaipur has major Teej procession.
- AKHA TEEJ = Akshaya Tritiya = Vaishakh Shukla 3 = auspicious for marriage.

MAKAR SANKRANTI (January 14):
- Kite flying in Jaipur.
- Til & Gur (sesame & jaggery) distributed.

HOLI:
- Phalen village (Bharatpur) = unique tradition of women beating men with sticks (Dol Gyaras).
- Shekhawati: Chang instrument played.
- Sanjhi = Holi predecessor ritual.

DIWALI:
- Chitragupta Puja (Kayastha community on Diwali day).
- Govardhan Puja next day.

EID & MUHARRAM: Significant in Ajmer, Nagaur, Tonk.

NAGAUR FAIR: January; Cattle/camel trading; also called Ramji ki Mela.

SANJHI FESTIVAL: Pitru Paksha (Shraddh) period; clay art making by women.

ATTIRES (COSTUMES):

MEN:
- Pagdi/Safa: Turban (most important); Jaipur/Jodhpur/Shekhawati differ in style.
- Dhoti/Pyjama: Lower garment.
- Angarkhi/Angarkha: Upper garment (traditional jacket).
- Cummerbund/Kamarbandh: Waistband.
- Juti: Traditional footwear; Jodhpuri Juti famous.

WOMEN:
- Ghaghra (skirt), Kanchali/Kurti (blouse), Odhani/Dupatta (veil).
- Bandhani/Bandhej: Tie-dye cloth (Sikar/Jaipur speciality).
- Leheriya: Wave-pattern dyeing (Jaipur/Rajasthan – worn in Teej/Gangaur).

JEWELLERY (AABHUSHAN):
WOMEN'S HEAD/NECK:
- Tikka/Borla: Forehead piece.
- Nath: Nose ring.
- Bajuband: Upper arm ornament.
- Hansla: Neck rigid ornament.
- Hamel: Long necklace.
- Kantha: Neck ornament.
- Kanthi: Short necklace.

WOMEN'S HANDS:
- Bangle: Glass/gold/silver.
- Gajra: Wrist ornament.
- Punchi: Forearm.
- Haar/Hathphool: Elaborate hand ornament (back of hand).

WOMEN'S FEET:
- Payjaeb/Payal: Anklet.
- Nupura: With bells.
- Bichua: Toe ring.

MEN'S JEWELLERY:
- Murki/Bali: Ear ornament.
- Necklaces for religious occasions.

KEY EXAM FACTS:
1. Gangaur = Rajasthan's biggest festival = Chaitra Shukla 3.
2. Pushkar Fair = Kartik Shukla 11-15 = camel fair.
3. Tejaji Fair = largest cattle fair of Rajasthan = Parbatsar.
4. Beneshwar = Tribal Kumbh = Magh Purnima = Dungarpur.
5. Teej = Sawan Shukla 3 (Hariyali) & Bhadra Krishna 3 (Kajali).
6. Nagaur Fair = January cattle fair.
7. Leheriya = wave-pattern cloth = Teej festival.
8. Bandhani = tie-dye = Sikar/Jaipur.
9. Chang = Shekhawati Holi instrument.
10. Kaila Devi = Languriya songs = Chaitra Shukla = Karauli.
`
  },

  // ─────────────────────────────────────────────────────────
  // TOPIC 3 – Administrative & Revenue System (minute_topic_id=2135)
  // ─────────────────────────────────────────────────────────
  {
    minuteTopicId: 2135,
    topicId: 3,
    tier: 'PRE',
    count: 12,
    topicName: 'Administrative and Revenue System in Medieval Rajasthan',
    content: `
ADMINISTRATIVE & REVENUE SYSTEM IN MEDIEVAL RAJASTHAN – EXHAUSTIVE NOTES

CENTRAL ADMINISTRATION:
- Ruler titled: Maharaja, Maharana, Rao, Maharawal.
- Revenue Minister: Divan / Mehta.
- Military Commander: Mir Bakshi / Senapati.
- Chief Justice: Pandit / Nyayakarta.
- Key Official: Vakeel (ambassador to Mughal court).
- Amil: Revenue collector.
- Patwari: Village-level record keeper.
- Qanungo: District revenue supervisor.

LAND REVENUE SYSTEM:

MEWAR SYSTEM:
- Land divided into: Khalisah (state land), Jagir (granted land), Bhom (tribal land).
- Revenue assessed as: Batai (crop sharing), Kankoot (crop estimation), Nasaq (fixed assessment).
- Khasra: Individual plot record.
- Khatauni: Consolidated register.

MARWAR SYSTEM:
- Jaswant Singh I compiled: 'Vigat' (Marwar's first survey by Munhta Nainsi, 1666).
- Munhta Nainsi's Khyat: Historic geographic survey of Rajasthan.
- Girdawari: Annual crop inspection.
- Tanka: Currency used in revenue payments.

JAIPUR SYSTEM:
- Sawai Jai Singh II modernized administration.
- Ariz (Military Dept), Majlis (Assembly) established.
- Kanungos (revenue supervisors) appointed district-wise.
- Khasra register maintained village-wise.

JAGIR SYSTEM:
- King granted Jagir (land-revenue rights) to:
  * Relatives (Kopal/Royal Jagir)
  * Military chiefs for service
  * Bhom (tribal chiefs for loyalty)
- Jagirdar paid troops from jagir income.
- Types: Wakil Jagir, Bhumia Jagir, Grasiya Jagir.

LOCAL ADMINISTRATION:
- Village: Patel/Mukhiya as headman.
- Patwari maintained land records.
- Chowkidar for village security.
- Panchayat (council of 5) resolved local disputes.

MILITARY SYSTEM:
- PATTA SYSTEM: Rajput warriors given land in exchange for military service.
- Hazari (commander of 1000), Panchsadi (500), Sadi (100).
- Bhumia: Hereditary local militia.
- Dhangar: Shepherd-soldiers.

REVENUE TERMS:
- Lag-Baag: Illegal/extra taxes (main grievance in peasant movements).
- Rekh/Lekh: Assessment of land.
- Malpay: Tax on sale of grain.
- Chaur: Tax on wood.
- Khasra: Plot-level land record.
- Patta: Land grant document.
- Sanad: Royal order/grant.
- Vakil: State representative.
- Diwan: Prime minister/finance minister.
- Faujdar: Military governor.
- Hakim: District revenue officer.

MINT & CURRENCY:
- Mewar: Chittor Mint (Tamankiya coins), Swroopa Shahi.
- Marwar: Merta Mint.
- Jaipur: Sawai Madhopur Mint (Jahazshahi, Zebi Shahi coins).
- British era: Sikkah coined at Calcutta for Rajput states.

POLICE & JUSTICE:
- Kotwal: Town police chief.
- Daroga: Police inspector.
- Jail: Kotwali was main jail.
- Punishments: Fines, flogging, exile, death by sword.

KEY EXAM FACTS:
1. Munhta Nainsi wrote 'Vigat' – first survey of Marwar (1666).
2. Munhta Nainsi's 'Khyat' = historical geography of Rajasthan.
3. Jagir = land grant for military service.
4. Patwari = village land record keeper.
5. Batai = revenue by crop sharing; Kankoot = by crop estimation.
6. Lag-Baag = illegal taxes (cause of peasant movements).
7. Diwan = revenue/finance minister.
8. Faujdar = military governor.
9. Patta = land grant document.
10. Khalisah = state-owned land (not jagir).
`
  },

];

// ============================================================
// API CALL HELPER
// ============================================================
function callGenerateAPI(subtopic) {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        form.append('tier', subtopic.tier);
        form.append('topicId', subtopic.topicId.toString());
        form.append('minuteTopicId', subtopic.minuteTopicId.toString());
        form.append('count', subtopic.count.toString());
        const contentBuffer = Buffer.from(subtopic.content, 'utf8');
        form.append('pdfFiles', contentBuffer, {
            filename: `notes_${subtopic.minuteTopicId}.txt`,
            contentType: 'text/plain',
            knownLength: contentBuffer.length
        });
        const options = {
            hostname: 'rpsc-ras-backend.onrender.com',
            path: '/api/admin/generate-questions-from-pdf',
            method: 'POST',
            headers: form.getHeaders()
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ subtopic, result: JSON.parse(data), status: res.statusCode }); }
                catch (e) { resolve({ subtopic, result: data, status: res.statusCode }); }
            });
        });
        req.on('error', err => reject({ subtopic, error: err.message }));
        form.pipe(req);
    });
}

async function main() {
    console.log(`\n🚀 Starting Batch 2: ${SUBTOPICS_BATCH2.length} subtopics (Art, Culture, Admin)...`);
    console.log('='.repeat(70));
    let totalInserted = 0, successCount = 0, failCount = 0;
    for (let i = 0; i < SUBTOPICS_BATCH2.length; i++) {
        const subtopic = SUBTOPICS_BATCH2[i];
        console.log(`\n[${i+1}/${SUBTOPICS_BATCH2.length}] Generating: "${subtopic.topicName}"`);
        console.log(`   Tier: ${subtopic.tier} | Count: ${subtopic.count} | MinuteTopicID: ${subtopic.minuteTopicId}`);
        try {
            const result = await callGenerateAPI(subtopic);
            if (result.status === 200 && result.result.message) {
                console.log(`   ✅ SUCCESS: ${result.result.message}`);
                totalInserted += result.result.count || 0;
                successCount++;
            } else {
                console.log(`   ⚠️  Response ${result.status}:`, JSON.stringify(result.result).substring(0, 200));
                failCount++;
            }
        } catch (err) {
            console.error(`   ❌ FAILED: ${err.error || err}`);
            failCount++;
        }
        if (i < SUBTOPICS_BATCH2.length - 1) {
            console.log('   ⏳ Waiting 8 seconds...');
            await new Promise(r => setTimeout(r, 8000));
        }
    }
    console.log('\n' + '='.repeat(70));
    console.log(`✅ BATCH 2 DONE: ${successCount} success, ${failCount} failed`);
    console.log(`📦 Total seeded: ${totalInserted}`);
}

main().catch(console.error);
