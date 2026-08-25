async function run() {
    const url = 'https://rpsc-ras-backend.onrender.com/api';
    console.log("Fetching files list from production...");
    
    try {
        const res = await fetch(`${url}/admin/uploaded-files`, {
            headers: { 'x-user-mobile': '9876543210' }
        });
        if (res.ok) {
            const data = await res.json();
            console.log("\nFiles on server:");
            const guhilFile = data.files.find(f => f.originalName.toLowerCase().includes('guhil') || f.filename.toLowerCase().includes('guhil'));
            
            for (const f of data.files) {
                console.log(` - ${f.filename} (Original: ${f.originalName}, Uploaded: ${f.uploadedAt})`);
            }
            
            const targetFile = guhilFile || data.files[0];
            if (targetFile) {
                console.log(`\nDownloading ${targetFile.filename}...`);
                const downloadRes = await fetch(`${url}/admin/uploaded-files/${targetFile.filename}`);
                if (downloadRes.ok) {
                    const arrayBuffer = await downloadRes.arrayBuffer();
                    const fs = require('fs');
                    const path = require('path');
                    const savePath = path.join(__dirname, '..', 'uploaded_files', targetFile.originalName);
                    fs.writeFileSync(savePath, Buffer.from(arrayBuffer));
                    console.log(`Saved to ${savePath}`);
                } else {
                    console.log("Download failed:", downloadRes.status);
                }
            } else {
                console.log("No files found on server.");
            }
        } else {
            console.log("Failed to fetch list:", res.status);
        }
    } catch (e) {
        console.error(e.message);
    }
}

run();
