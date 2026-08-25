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
        console.log("Fetching live stats...");
        const res = await callGet('/api/admin/stats');
        if (res.status === 200) {
            console.log("Total Questions:", res.body.questionsCount);
            console.log("Total Mains Questions:", res.body.mainsQuestionsCount);
            console.log("Topics stats (filtered):");
            const targetTopicIds = [1, 2, 3, 5, 6, 7, 8, 10, 101];
            res.body.topicsStats.forEach(ts => {
                if (targetTopicIds.includes(ts.topic_id)) {
                    console.log(`Topic ID: ${ts.topic_id} | Name: "${ts.topic_name}" | Qs: ${ts.q_count} | Mains Qs: ${ts.mq_count}`);
                }
            });
        } else {
            console.log("Error status:", res.status, res.body);
        }
    } catch(err) {
        console.error("Error fetching stats:", err);
    }
}

main();
