process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');

const url = 'https://rpsc-ras-backend.onrender.com/api/admin/clean-placeholders';

console.log("Waiting a moment, then calling remote cleanup endpoint...");

const req = https.request(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
}, (res) => {
    let data = '';
    console.log('Response Status:', res.statusCode);
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            console.log('Result:', JSON.parse(data));
        } catch(e) {
            console.log('Raw Result:', data);
        }
    });
});

req.on('error', (err) => {
    console.error('Trigger request failed:', err.message);
});

req.end();
