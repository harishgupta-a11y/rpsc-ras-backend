const fs = require('fs');
const path = require('path');

// Load environment variables
if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    env.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}

console.log("Database URL configured:", process.env.TURSO_DATABASE_URL);

// Trigger initDatabase inside db.js
try {
    console.log("Loading db.js and triggering initDatabase()...");
    const db = require('./db');
    console.log("Database initialization finished loading.");
} catch(e) {
    console.error("Database initialization failed with error:", e);
}
