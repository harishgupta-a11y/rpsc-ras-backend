async function run() {
    const url = 'https://rpsc-ras-backend.onrender.com/api';
    console.log("Fetching subtopics for Topic 1...");
    try {
        const res = await fetch(`${url}/minute-topics?topic_id=1&language=EN`, {
            headers: { 'x-user-mobile': '9876543210' }
        });
        if (res.ok) {
            const data = await res.json();
            console.log("Subtopics:");
            for (const mt of data.minuteTopics) {
                console.log(` - ID ${mt.minute_topic_id}: ${mt.minute_topic_name} (MCQs: ${mt.q_count})`);
            }
        } else {
            console.log("Failed to fetch subtopics:", res.status);
        }
    } catch (e) {
        console.error(e.message);
    }
}

run();
