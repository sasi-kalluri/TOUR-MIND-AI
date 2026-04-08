const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    console.log("Starting test...");
    const genAI = new GoogleGenerativeAI('AIzaSyAEuJNles9iTuStzXUUCPsnAJ5o-TgmTyY');

    try {
        console.log("Testing gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Hello');
        console.log('Flash Success:', result.response.text());
    } catch (e) {
        console.error('Flash Error Details:', e.message);
    }

    try {
        console.log("Testing gemini-pro...");
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Hello');
        console.log('Pro Success:', result.response.text());
    } catch (e) {
        console.error('Pro Error Details:', e.message);
    }
}

test();
