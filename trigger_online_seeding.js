process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
    console.log("==========================================================");
    console.log("Triggering DIRECT SEEDING of Pregenerated Questions...");
    console.log("==========================================================");

    try {
        const res = await fetch('https://rpsc-ras-backend.onrender.com/api/admin/inject-pregenerated-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topicId: 6,
                minuteTopicId: null // If you have a specific subtopic ID, specify here
            })
        });

        const data = await res.json();
        if (res.ok) {
            console.log("Seeding Success Output:", data.message);
        } else {
            console.error("Seeding Error Output:", data.error || data);
        }
    } catch(e) {
        console.error("Seeding request failed:", e.message);
    }
    console.log("\nSeeding run finished.");
}

run();
