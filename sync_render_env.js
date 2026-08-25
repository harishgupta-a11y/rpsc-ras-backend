const apiKey = 'rnd_WxiQJO9a3ghmD97NzrSUQvQygRBY';
const serviceId = 'srv-d8toeh5ckfvc73err730';

const tursoUrl = 'libsql://rpsc-ras-harishgupta-a11y.aws-ap-south-1.turso.io';
const tursoToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NTc4MTMsImlkIjoiMDE5ZWY4NzktNjYwMS03ODI0LWE2NGUtMjc0MmFiMDM1OWQyIiwia2lkIjoieVpBaTQ1RDE1UndkMUpiaVctZXlNdE5tWXNWb3RBUGEyaXhPREtJYy1ITSIsInJpZCI6IjJhNDNmM2NmLTBhMzMtNGI4YS1iODQ5LTExNWQ1OWY4NWI5ZSJ9.MjzwTOW9h-tOFNEZp6HYwpLh4SzWdA9o4euA0gvflUoxaJDCfq43Vc6RP4nS2Xn7EuN9oh26-jH-Dvu1KMx8Bg';

async function main() {
    try {
        console.log("1. Fetching current environment variables from Render...");
        const getRes = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!getRes.ok) {
            const errData = await getRes.json();
            throw new Error(`Failed to fetch env vars: ${JSON.stringify(errData)}`);
        }

        const currentVars = await getRes.json();
        console.log(`Found ${currentVars.length} existing environment variables.`);

        // Reformat array for PUT request
        // Render expects: [ { "key": "KEY", "value": "VAL" }, ... ]
        const newVars = currentVars.map(item => ({
            key: item.envVar.key,
            value: item.envVar.value
        }));

        // Upsert TURSO_DATABASE_URL
        const urlIndex = newVars.findIndex(v => v.key === 'TURSO_DATABASE_URL');
        if (urlIndex >= 0) {
            newVars[urlIndex].value = tursoUrl;
        } else {
            newVars.push({ key: 'TURSO_DATABASE_URL', value: tursoUrl });
        }

        // Upsert TURSO_AUTH_TOKEN
        const tokenIndex = newVars.findIndex(v => v.key === 'TURSO_AUTH_TOKEN');
        if (tokenIndex >= 0) {
            newVars[tokenIndex].value = tursoToken;
        } else {
            newVars.push({ key: 'TURSO_AUTH_TOKEN', value: tursoToken });
        }

        console.log("2. Sending updated environment variables to Render...");
        const putRes = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(newVars)
        });

        const putData = await putRes.json();
        if (!putRes.ok) {
            throw new Error(`Failed to update env vars: ${JSON.stringify(putData)}`);
        }
        console.log("Successfully updated Render environment variables!");

        console.log("3. Triggering a fresh redeploy on Render to apply variables...");
        const deployRes = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({})
        });

        const deployData = await deployRes.json();
        if (deployRes.ok) {
            console.log("Render Deploy successfully triggered! Deploy details:", deployData);
        } else {
            console.error("Render Deploy trigger failed:", deployData);
        }

    } catch (err) {
        console.error("Error in environment sync:", err.message);
    }
}

main();
