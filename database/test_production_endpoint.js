async function test() {
    const url = 'https://rpsc-ras-backend.onrender.com/api/flashcards?minute_topic_id=2125&language=EN';
    console.log("Querying production flashcards endpoint:", url);
    try {
        const res = await fetch(url, {
            headers: {
                'x-user-mobile': '9876543210'
            }
        });
        console.log("Status Code:", res.status);
        const data = await res.json();
        console.log("Response Body:", JSON.stringify(data, null, 2));
    } catch(e) {
        console.error("Fetch failed:", e.message);
    }
}
test();
