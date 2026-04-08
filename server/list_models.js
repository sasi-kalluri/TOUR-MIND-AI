require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Using Key:", key ? "Found" : "Missing");
    const genAI = new GoogleGenerativeAI(key);

    try {
        // This is how to list models
        // Note: SDK doesn't have a direct 'listModels' on the main class in some versions, 
        // but we can try getting a model and asking or just inferring.
        // Actually, the best way to debug "Not Found" is to assume the key works and we just need the right string.

        console.log("Attempting to list models (if supported) or test standard ones...");

        const modelsToTest = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro', 'gemini-2.0-flash-exp'];

        for (const m of modelsToTest) {
            try {
                process.stdout.write(`Testing ${m}... `);
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent('Hi');
                console.log(`✅ SUCCESS`);
            } catch (e) {
                console.log(`❌ FAILED (${e.status || e.message})`);
            }
        }

    } catch (e) {
        console.error("Fatal Error:", e);
    }
}

const modelsToTest = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-2.0-flash-exp'];

listModels();
