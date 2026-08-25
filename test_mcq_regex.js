const testQuestions = [
    // 1. Standard MCQ on newlines
    `Q. What is the capital of Rajasthan?
A) Jaipur
B) Jodhpur
C) Udaipur
D) Ajmer
Correct: A
Explanation: Jaipur is the capital of Rajasthan.`,

    // 2. Options on the same line
    `Q. Which city is known as the Sun City of Rajasthan? A) Jaipur B) Jodhpur C) Udaipur D) Ajmer Correct Answer: B Explanation: Jodhpur is known as the Sun City.`,

    // 3. Assertion-Reason in English
    `Q. Assertion (A): Rajasthan has a high potential for solar energy.
Reason (R): It has a large number of sunny days and vast arid land.
Select the correct answer:
A) Both A and R are true and R is the correct explanation of A
B) Both A and R are true but R is not the correct explanation of A
C) A is true but R is false
D) A is false but R is true
Correct: A
Explanation: Rajasthan has maximum solar exposure.`,

    // 4. Assertion-Reason in Hindi
    `प्र. कथन (A): राजस्थान में मरुस्थलीकरण की दर तीव्र है।
कारण (R): अरावली पर्वतमाला की दिशा दक्षिण-पश्चिम से उत्तर-पूर्व है।
सही उत्तर चुनिए:
A) A और R दोनों सही हैं और R, A की सही व्याख्या है
B) A और R दोनों सही हैं लेकिन R, A की सही व्याख्या नहीं है
C) A सही है लेकिन R गलत है
D) A गलत है लेकिन R सही है
सही उत्तर: A
व्याख्या: अरावली मानसूनी हवाओं के समानांतर होने के कारण वर्षा कम होती है।`
];

function testRegex(regexQ, regexA, regexB, regexC, regexD, regexCorrect, regexExp) {
    console.log("Testing regex suite...");
    testQuestions.forEach((qBlock, idx) => {
        console.log(`--- Question ${idx + 1} ---`);
        const qMatch = qBlock.match(regexQ);
        const aMatch = qBlock.match(regexA);
        const bMatch = qBlock.match(regexB);
        const cMatch = qBlock.match(regexC);
        const dMatch = qBlock.match(regexD);
        const correctMatch = qBlock.match(regexCorrect);
        const expMatch = qBlock.match(regexExp);

        console.log("Q Match:", qMatch ? qMatch[1].trim() : "FAILED");
        console.log("A Match:", aMatch ? aMatch[1].trim() : "FAILED");
        console.log("B Match:", bMatch ? bMatch[1].trim() : "FAILED");
        console.log("C Match:", cMatch ? cMatch[1].trim() : "FAILED");
        console.log("D Match:", dMatch ? dMatch[1].trim() : "FAILED");
        console.log("Correct Match:", correctMatch ? correctMatch[1].trim() : "FAILED");
        console.log("Exp Match:", expMatch ? expMatch[1].trim() : "FAILED");
    });
}

// Highly precise regexes
const regexQ = /(?:Q\.|प्र\.|प्रश्न\s*\d*[:\.]?)([\s\S]*?)(?=(?<=^|\s)(?<!\()[Aa]\))/;
const regexA = /(?<=^|\s)(?<!\()[Aa]\)([\s\S]*?)(?=(?<=^|\s)(?<!\()[Bb]\))/;
const regexB = /(?<=^|\s)(?<!\()[Bb]\)([\s\S]*?)(?=(?<=^|\s)(?<!\()[Cc]\))/;
const regexC = /(?<=^|\s)(?<!\()[Cc]\)([\s\S]*?)(?=(?<=^|\s)(?<!\()[Dd]\))/;

// D matches up to the correct trigger
const regexD = /(?<=^|\s)(?<!\()[Dd]\)([\s\S]*?)(?=(?:\r?\n[ \t]*(?:\*?\*?(?:[Cc]orrect|[Aa]nswer|Correct Answer|उत्तर|सही उत्तर|Correct:|Answer:)\*?\*?)\s*(?::|\s)|(?<=^|\s)(?:\*?\*?(?:[Cc]orrect|[Aa]nswer|Correct Answer|उत्तर|सही उत्तर|Correct:|Answer:)\*?\*?)\s*:))/i;

// Correct Match requires either newline OR space-with-colon, and followed by [A-D] not followed by ) or .
const regexCorrect = /(?:\r?\n[ \t]*(?:\*?\*?(?:[Cc]orrect|[Aa]nswer|Correct Answer|उत्तर|सही उत्तर|Correct:|Answer:)\*?\*?)\s*(?::|\s)|(?<=^|\s)(?:\*?\*?(?:[Cc]orrect|[Aa]nswer|Correct Answer|उत्तर|सही उत्तर|Correct:|Answer:)\*?\*?)\s*:)\s*([A-D])(?!\w|[\)\.])/i;

// Exp Match requires either newline OR space-with-colon, and followed by explanation text
const regexExp = /(?:\r?\n[ \t]*(?:\*?\*?(?:[Ee]xplanation|[Ee]xp|व्याख्या|स्पष्टीकरण)\*?\*?)\s*(?::|\s)|(?<=^|\s)(?:\*?\*?(?:[Ee]xplanation|[Ee]xp|व्याख्या|स्पष्टीकरण)\*?\*?)\s*:)\s*([\s\S]*?)$/i;

testRegex(regexQ, regexA, regexB, regexC, regexD, regexCorrect, regexExp);
