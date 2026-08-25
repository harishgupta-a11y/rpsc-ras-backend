const fs = require('fs');
const sqlite3 = require('C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/node_modules/sqlite3').verbose();
const { createClient } = require('@libsql/client');

const localDbPath = 'C:/Users/aNKIT/./.gemini/antigravity/scratch/rpsc-ras-app/backend/database/rpsc_ras.db';
const localDb = new sqlite3.Database(localDbPath);

// Load environment variables manually
const dotenvContent = fs.readFileSync('C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/.env', 'utf8');
dotenvContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

const updates = [
    // Pre-historical Sites
    { id: 2117, name: "Pre-historical Sites in Rajasthan (Palaeolithic, Mesolithic, and Neolithic sites)" },
    { id: 2118, name: "प्रागैतिहासिक स्थल: राजस्थान में (पुरापाषाण, मध्यपाषाण और नवपाषाण स्थल)" },
    // Guhil Mewar Dynasty
    { id: 2125, name: "Guhil and Sisodia Dynasty of Mewar (Rulers, Battles & Cultural Contribution)" },
    { id: 2126, name: "मेवाड़ का गुहिल और सिसौदिया राजवंश (शासक, युद्ध और सांस्कृतिक योगदान)" },
    // Rathore Dynasty
    { id: 2127, name: "Rathore Dynasty of Marwar and Bikaner (Prominent Rulers & Achievements)" },
    { id: 2128, name: "मारवाड़ और बीकानेर का राठौड़ राजवंश (प्रमुख शासक और उपलब्धियां)" },
    // Kachwaha Dynasty
    { id: 2129, name: "Kachwaha Dynasty of Amer/Jaipur (Rulers, Mughal Alliance & Architecture)" },
    { id: 2130, name: "आमेर/जयपुर का कछवाहा राजवंश (शासक, मुगल गठबंधन और वास्तुकला)" },
    // Chauhan Dynasty
    { id: 2131, name: "Chauhan Dynasty of Ajmer, Ranthambore, and Jalore (Cooperation and Resistance)" },
    { id: 2132, name: "अजमेर, रणथंभौर और जालौर का चौहान राजवंश (सहयोग और प्रतिरोध)" },

    // ECI
    { id: 2295, name: "Election Commission of India - ECI Article 324 (Structure, Electoral Reforms & Model Code of Conduct)" },
    { id: 2296, name: "भारत का निर्वाचन आयोग - ECI अनुच्छेद 324 (संरचना, शक्तियां, चुनाव सुधार एवं आचार संहिता)" },
    // UPSC
    { id: 2297, name: "Union Public Service Commission - UPSC Articles 315-323 (Functions, Recruitment & Guarantees)" },
    { id: 2298, name: "संघ लोक सेवा आयोग - UPSC अनुच्छेद 315-323 (कार्य, भर्ती एवं संवैधानिक संरक्षण)" },
    // NHRC
    { id: 2299, name: "National Human Rights Commission - NHRC (Structure, Statutory Powers & Protection of Human Rights Act)" },
    { id: 2300, name: "राष्ट्रीय मानव अधिकार आयोग - NHRC (संरचना, शक्तियां एवं मानव अधिकार संरक्षण अधिनियम)" },
    // NCW / NCPCR
    { id: 2301, name: "National Commissions for Women (NCW) & Protection of Child Rights (NCPCR)" },
    { id: 2302, name: "राष्ट्रीय महिला आयोग (NCW) एवं राष्ट्रीय बाल अधिकार संरक्षण आयोग (NCPCR)" },
    // NITI Aayog
    { id: 2303, name: "NITI Aayog (Structure, Governing Council, Cooperative Federalism & SDG Index)" },
    { id: 2304, name: "नीति आयोग - NITI Aayog (संरचना, गवर्निंग काउंसिल, सहकारी संघवाद एवं सतत विकास लक्ष्य)" },
    // Lokpal
    { id: 2313, name: "Lokpal & Lokayuktas (Lokpal and Lokayuktas Act 2013, Structure & Powers)" },
    { id: 2314, name: "लोकपाल एवं लोकायुक्त (लोकपाल एवं लोकायुक्त अधिनियम 2013, संरचना व शक्तियां)" },
    // CVC
    { id: 2315, name: "Central Vigilance Commission - CVC (Vigilance Governance & Santhanam Committee)" },
    { id: 2316, name: "केंद्रीय सतर्कता आयोग - CVC (सतर्कता प्रशासन एवं संथानम समिति)" },
    // CIC
    { id: 2317, name: "Central Information Commission - CIC & RTI Act 2005 (Right to Information & Exemptions)" },
    { id: 2318, name: "केंद्रीय सूचना आयोग - CIC एवं आरटीआई अधिनियम 2005 (सूचना का अधिकार एवं छूट)" },
    // Emergency Provisions
    { id: 3551, name: "Emergency Provisions - Articles 352, 356, 360 (National Emergency, President's Rule & Financial Emergency)" },
    { id: 3552, name: "आपातकालीन प्रावधान - अनुच्छेद 352, 356, 360 (राष्ट्रीय आपातकाल, राष्ट्रपति शासन एवं वित्तीय आपातकाल)" }
];

function runSqlLocal(sql, params = []) {
    return new Promise((resolve, reject) => {
        localDb.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function main() {
    try {
        console.log(`Starting subtopic updates for ${updates.length} rows...`);

        // 1. Update local database in transaction
        console.log("Updating local SQLite database...");
        await runSqlLocal("BEGIN TRANSACTION");
        for (const u of updates) {
            await runSqlLocal("UPDATE minute_topics SET minute_topic_name = ? WHERE minute_topic_id = ?", [u.name, u.id]);
        }
        await runSqlLocal("COMMIT");
        console.log("Local SQLite database updated successfully.");

        // 2. Update remote Turso database
        console.log("Updating remote Turso database...");
        const statements = updates.map(u => ({
            sql: "UPDATE minute_topics SET minute_topic_name = ? WHERE minute_topic_id = ?",
            args: [u.name, u.id]
        }));
        await client.batch(statements);
        console.log("Remote Turso database updated successfully.");
        console.log("✅ All subtopic names cleaned and in sync!");

    } catch (e) {
        await runSqlLocal("ROLLBACK").catch(() => {});
        console.error("Update failed:", e.message);
    } finally {
        localDb.close();
        await client.close();
    }
}

main();
