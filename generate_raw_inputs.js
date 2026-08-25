const fs = require('fs');
const path = require('path');
const aiEngine = require('./ai_engine');

// Ensure database/generated exists
const genDir = path.join(__dirname, 'database', 'generated');
if (!fs.existsSync(genDir)) {
    fs.mkdirSync(genDir, { recursive: true });
}

const bankPath = path.join(__dirname, 'database', 'subtopics_notes_bank.json');
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));

const targets = [2117];

async function generateForTopic(id) {
    const item = Object.values(bank).find(x => x.minuteTopicId === id);
    if (!item) {
        console.error(`Topic ${id} not found in notes bank`);
        return;
    }
    
    console.log(`\n======================================================`);
    console.log(`Processing Topic ${id}: ${item.topicName}`);
    console.log(`======================================================`);
    
    const concepts = await aiEngine.splitNotesIntoConcepts(item.content, item.topicName);
    console.log(`Concepts identified: ${concepts.length}`);
    concepts.forEach((c, idx) => console.log(`  [${idx + 1}] ${c.title} (${c.weight}%)`));
    
    // ------------------ PRELIMS MCQS ------------------
    console.log(`\nGenerating 50 Prelims MCQs for Topic ${id} in 2 batches...`);
    const mcqs = [];
    
    // Batch 1 (First half of concepts)
    const midPoint = Math.ceil(concepts.length / 2);
    const concepts1 = concepts.slice(0, midPoint);
    const concepts2 = concepts.slice(midPoint);
    
    // Allocate count (25 questions per batch)
    // Batch 1:
    let sumWeight1 = concepts1.reduce((sum, c) => sum + c.weight, 0);
    for (let i = 0; i < concepts1.length; i++) {
        const sub = concepts1[i];
        let conceptCount = Math.round(25 * (sub.weight / sumWeight1));
        if (conceptCount === 0) conceptCount = 1;
        if (i === concepts1.length - 1) {
            const currentTotal = mcqs.length;
            conceptCount = Math.max(1, 25 - currentTotal);
        }
        console.log(`  [Batch 1] Generating ${conceptCount} MCQs for concept: "${sub.title}"`);
        const batch = await aiEngine.generateMCQsFromNotes(item.content, item.topicName, sub, conceptCount);
        mcqs.push(...batch);
    }
    
    // Batch 2:
    let sumWeight2 = concepts2.reduce((sum, c) => sum + c.weight, 0);
    const startLength = mcqs.length;
    for (let i = 0; i < concepts2.length; i++) {
        const sub = concepts2[i];
        let conceptCount = Math.round(25 * (sub.weight / sumWeight2));
        if (conceptCount === 0) conceptCount = 1;
        if (i === concepts2.length - 1) {
            const currentTotal = mcqs.length - startLength;
            conceptCount = Math.max(1, 25 - currentTotal);
        }
        console.log(`  [Batch 2] Generating ${conceptCount} MCQs for concept: "${sub.title}"`);
        const batch = await aiEngine.generateMCQsFromNotes(item.content, item.topicName, sub, conceptCount);
        mcqs.push(...batch);
    }
    
    fs.writeFileSync(
        path.join(genDir, `raw_pre_${id}.json`),
        JSON.stringify({ mcqs }, null, 2),
        'utf8'
    );
    console.log(`Saved 50 MCQs to raw_pre_${id}.json`);
    
    // ------------------ MAINS Q&AS ------------------
    console.log(`\nGenerating 30 Mains QAs for Topic ${id} in 2 batches...`);
    const mains = [];
    
    // Batch 1 (Concepts1): generate 15 Mains QAs
    for (let i = 0; i < concepts1.length; i++) {
        const sub = concepts1[i];
        let conceptCount = Math.round(15 * (sub.weight / sumWeight1));
        if (conceptCount === 0) conceptCount = 1;
        if (i === concepts1.length - 1) {
            const currentTotal = mains.length;
            conceptCount = Math.max(1, 15 - currentTotal);
        }
        console.log(`  [Batch 1] Generating ${conceptCount} Mains QAs for concept: "${sub.title}"`);
        const batch = await aiEngine.generateMainsFromNotes(item.content, item.topicName, sub, conceptCount);
        mains.push(...batch);
    }
    
    // Batch 2 (Concepts2): generate 15 Mains QAs
    const startMainsLength = mains.length;
    for (let i = 0; i < concepts2.length; i++) {
        const sub = concepts2[i];
        let conceptCount = Math.round(15 * (sub.weight / sumWeight2));
        if (conceptCount === 0) conceptCount = 1;
        if (i === concepts2.length - 1) {
            const currentTotal = mains.length - startMainsLength;
            conceptCount = Math.max(1, 15 - currentTotal);
        }
        console.log(`  [Batch 2] Generating ${conceptCount} Mains QAs for concept: "${sub.title}"`);
        const batch = await aiEngine.generateMainsFromNotes(item.content, item.topicName, sub, conceptCount);
        mains.push(...batch);
    }
    
    fs.writeFileSync(
        path.join(genDir, `raw_mains_${id}.json`),
        JSON.stringify({ mains }, null, 2),
        'utf8'
    );
    console.log(`Saved 30 Mains QAs to raw_mains_${id}.json`);
}

async function main() {
    for (const id of targets) {
        await generateForTopic(id);
    }
    console.log("\nRaw questions generation complete!");
}

main().catch(console.error);
