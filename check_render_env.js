const apiKey = 'rnd_WxiQJO9a3ghmD97NzrSUQvQygRBY';
const serviceId = 'srv-d8toeh5ckfvc73err730';

async function checkEnv() {
    console.log(`Fetching env variables for service: ${serviceId}...`);
    try {
        const res = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const data = await res.json();
        if (res.ok) {
            console.log("Render Env Variables:");
            data.forEach(item => {
                const valueDisplay = item.envVar.key.includes('TOKEN') || item.envVar.key.includes('KEY') 
                    ? '***' + item.envVar.value.substring(item.envVar.value.length - 8) 
                    : item.envVar.value;
                console.log(`  ${item.envVar.key}: ${valueDisplay}`);
            });
        } else {
            console.error("Failed to fetch Render env variables:", data);
        }
    } catch (err) {
        console.error("Error fetching Render env variables:", err.message);
    }
}

checkEnv();
