const apiKey = 'rnd_WxiQJO9a3ghmD97NzrSUQvQygRBY';
const serviceId = 'srv-d8toeh5ckfvc73err730';

async function main() {
    try {
        console.log("Fetching environment variables from Render...");
        const res = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(`Failed to fetch env vars: ${JSON.stringify(err)}`);
        }

        const vars = await res.json();
        const geminiVar = vars.find(item => item.envVar.key === 'GEMINI_API_KEY');
        if (geminiVar) {
            console.log("GEMINI_API_KEY found!");
            console.log(`Value: ${geminiVar.envVar.value}`);
        } else {
            console.log("GEMINI_API_KEY NOT found in Render environment variables.");
            console.log("All keys found:", vars.map(item => item.envVar.key));
        }
    } catch (err) {
        console.error("Error fetching keys:", err.message);
    }
}

main();
