// Quick API test script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');

function buildMultipart(fields, file) {
    const boundary = 'RASBoundary' + Date.now().toString(36);
    const CRLF = '\r\n';
    let parts = [];
    for (const [name, value] of Object.entries(fields)) {
        parts.push(Buffer.from(
            '--' + boundary + CRLF +
            'Content-Disposition: form-data; name="' + name + '"' + CRLF + CRLF +
            value + CRLF
        ));
    }
    parts.push(Buffer.from(
        '--' + boundary + CRLF +
        'Content-Disposition: form-data; name="pdfFiles"; filename="test.txt"' + CRLF +
        'Content-Type: text/plain' + CRLF + CRLF
    ));
    parts.push(file.content);
    parts.push(Buffer.from(CRLF + '--' + boundary + '--' + CRLF));
    return { body: Buffer.concat(parts), boundary };
}

const fields = { tier: 'PRE', topicId: '1', minuteTopicId: '2117', count: '3' };
const noteText = 'Bagore is India largest Mesolithic site on Kothari river Bhilwara excavated by V.N. Mishra. Known as Mhasatiya locally. Evidence: microliths, needles, first animal domestication (dog, sheep, goat), Leshni stone circles.';
const file = { content: Buffer.from(noteText, 'utf8') };
const { body, boundary } = buildMultipart(fields, file);

const options = {
    hostname: 'rpsc-ras-backend.onrender.com',
    path: '/api/admin/generate-questions-from-pdf',
    method: 'POST',
    headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
    },
    timeout: 120000
};

console.log('Sending test request to production API...');
const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data.substring(0, 600));
    });
});
req.on('timeout', () => { req.destroy(); console.log('TIMEOUT'); });
req.on('error', err => console.error('Error:', err.message));
req.write(body);
req.end();
