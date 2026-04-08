require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    console.log("Testing API Key from env...");
    const key = process.env.GEMINI_API_KEY;
    console.log("Key present:", !!key);

    if (!key) return;

    const genAI = new GoogleGenerativeAI(key);

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Are you online?');
        console.log('Response:', result.response.text());
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
