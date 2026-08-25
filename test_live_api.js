const https = require('https');

const BASE_URL = 'https://rpsc-ras-backend.onrender.com';

function callGet(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'rpsc-ras-backend.onrender.com',
            path: path,
            method: 'GET',
            headers: {
                'x-user-mobile': '9876543210',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch(e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', err => reject(err));
        req.end();
    });
}

async function main() {
    try {
        const cb = Date.now();
        console.log(`Fetching live EN subtopics for Topic 1 (CB: ${cb})...`);
        const enRes = await callGet(`/api/minute-topics?topic_id=1&language=EN&cb=${cb}`);
        console.log("EN Status:", enRes.status);
        console.log("EN Subtopics:", enRes.body.minuteTopics ? enRes.body.minuteTopics.map(m => ({ id: m.minute_topic_id, name: m.minute_topic_name, q: m.q_count, mq: m.mq_count })) : enRes.body);

        console.log(`\nFetching live HI subtopics for Topic 1 (CB: ${cb})...`);
        const hiRes = await callGet(`/api/minute-topics?topic_id=1&language=HI&cb=${cb}`);
        console.log("HI Status:", hiRes.status);
        console.log("HI Subtopics:", hiRes.body.minuteTopics ? hiRes.body.minuteTopics.map(m => ({ id: m.minute_topic_id, name: m.minute_topic_name, q: m.q_count, mq: m.mq_count })) : hiRes.body);
    } catch(err) {
        console.error("Error calling live API:", err);
    }
}

main();
