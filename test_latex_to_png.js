const axios = require('axios');
const fs = require('fs');

async function testLatexToPng() {
    // A sample LaTeX equation from your screenshots
    const latexFormula = "\\sum_{i=1}^{9} i = \\frac{9 \\times 10}{2} = 45";
    
    // We encode the LaTeX formula for URL safety
    const encoded = encodeURIComponent(latexFormula);
    
    // We use a high-DPI white background configuration on CodeCogs
    const url = `https://latex.codecogs.com/png.image?\\dpi{150}\\bg{white}${encoded}`;
    
    console.log("Requesting LaTeX conversion from CodeCogs:");
    console.log(url);
    
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        if (response.status === 200) {
            const base64Str = Buffer.from(response.data).toString('base64');
            const dataUri = `data:image/png;base64,${base64Str}`;
            
            console.log("=== SUCCESS ===");
            console.log(`Base64 URI length: ${dataUri.length} chars.`);
            console.log(`Sample output: ${dataUri.substring(0, 100)}...`);
        } else {
            console.error("Failed to render LaTeX. Status:", response.status);
        }
    } catch (e) {
        console.error("LaTeX rendering request failed:", e.message);
    }
}

testLatexToPng();
