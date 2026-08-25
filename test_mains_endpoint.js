const https = require('https');

function callGet(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'rpsc-ras-backend.onrender.com',
            path: path,
            method: 'GET',
            headers: {
                'x-user-mobile': '9876543210'
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
        console.log("Fetching live Mains questions for minuteTopicId 2117 (EN)...");
        const resEN = await callGet('/api/mains/questions?minute_topic_id=2117&language=EN&limit=5');
        console.log("EN Status:", resEN.status);
        console.log("EN Body:", JSON.stringify(resEN.body).substring(0, 1000));

        console.log("\nFetching live Mains questions for minuteTopicId 2118 (HI)...");
        const resHI = await callGet('/api/mains/questions?minute_topic_id=2118&language=HI&limit=5');
        console.log("HI Status:", resHI.status);
        console.log("HI Body:", JSON.stringify(resHI.body).substring(0, 1000));
    } catch(err) {
        console.error("Error fetching Mains questions:", err);
    }
}

main();
