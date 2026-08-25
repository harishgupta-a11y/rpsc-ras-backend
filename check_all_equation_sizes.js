const fs = require('fs');
const { createClient } = require('@libsql/client');

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

// Sync PNG header parsing helper
function getPngDimensions(base64Str) {
    try {
        let clean = base64Str;
        if (base64Str.startsWith('data:image/')) {
            const commaIdx = base64Str.indexOf(',');
            if (commaIdx !== -1) {
                clean = base64Str.substring(commaIdx + 1);
            }
        }
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const lookup = new Uint8Array(256);
        for (let i = 0; i < chars.length; i++) {
            lookup[chars.charCodeAt(i)] = i;
        }
        const bytesNeeded = 24;
        const charsNeeded = Math.ceil(bytesNeeded * 4 / 3);
        const subset = clean.substring(0, charsNeeded);
        const bytes = new Uint8Array(bytesNeeded);
        let byteIdx = 0;
        for (let i = 0; i < subset.length; i += 4) {
            const c1 = lookup[subset.charCodeAt(i)] || 0;
            const c2 = lookup[subset.charCodeAt(i+1)] || 0;
            const c3 = lookup[subset.charCodeAt(i+2)] || 0;
            const c4 = lookup[subset.charCodeAt(i+3)] || 0;
            bytes[byteIdx++] = (c1 << 2) | (c2 >> 4);
            if (byteIdx < bytesNeeded) bytes[byteIdx++] = ((c2 & 15) << 4) | (c3 >> 2);
            if (byteIdx < bytesNeeded) bytes[byteIdx++] = ((c3 & 3) << 6) | c4;
        }
        const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
        const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
        return { width, height };
    } catch (e) {
        return null;
    }
}

async function main() {
    try {
        const res = await client.execute("SELECT detailed_explanation FROM pyq_questions WHERE detailed_explanation LIKE '%[IMAGE:math:%' LIMIT 15");
        console.log(`Analyzing equations in ${res.rows.length} explanations:`);
        
        res.rows.forEach((row, idx) => {
            const text = row.detailed_explanation;
            const matches = text.match(/\[IMAGE:math:([^\]]+)\]/g);
            if (matches) {
                console.log(`\nRow ${idx+1} Math Images:`);
                matches.forEach(m => {
                    // Extract exact image content
                    const base64 = m.substring(12, m.length - 1);
                    if (base64.startsWith('data:image/png;base64,')) {
                        const dims = getPngDimensions(base64);
                        if (dims) {
                            console.log(`  - PNG Dims: ${dims.width}x${dims.height} (Aspect: ${(dims.width/dims.height).toFixed(2)})`);
                        } else {
                            console.log(`  - Failed to parse base64 dimensions`);
                        }
                    } else {
                        console.log(`  - Non-base64: ${base64.substring(0, 40)}`);
                    }
                });
            }
        });
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.close();
    }
}

main();
