const apiKey = 'rnd_WxiQJO9a3ghmD97NzrSUQvQygRBY';
const serviceId = 'srv-d8toeh5ckfvc73err730';
const deployId = 'dep-d9ap8sojs32c73a4p4b0';

async function checkDeploy() {
    try {
        const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys?limit=5`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const data = await res.json();
        if (res.ok && data.length > 0) {
            const latest = data[0].deploy;
            console.log(`Latest Deploy ID: ${latest.id}`);
            console.log(`Commit ID: ${latest.commit?.id}`);
            console.log(`Commit Msg: "${latest.commit?.message}"`);
            console.log(`Deploy Status: ${latest.status}`);
            console.log(`Created At: ${latest.createdAt}`);
            console.log(`Finished At: ${latest.finishedAt || 'Still running...'}`);
        } else {
            console.error("Failed to check deploy status:", data);
        }
    } catch (err) {
        console.error("Error checking deploy status:", err.message);
    }
}

checkDeploy();
