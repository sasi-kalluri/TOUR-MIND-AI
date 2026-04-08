const { GoogleGenAI } = require("@google/genai");

async function test() {
    console.log("Starting test with @google/genai...");

    try {
        const ai = new GoogleGenAI({ apiKey: "AIzaSyAEuJNles9iTuStzXUUCPsnAJ5o-TgmTyY" });
        console.log("Client initialized.");

        // Try gemini-1.5-flash
        console.log("Testing gemini-1.5-pro...");
        const response = await ai.models.generateContent({
            model: "gemini-1.5-pro",
            contents: [{ parts: [{ text: "Hello" }] }] // Correct format for new SDK? Or just string?
            // User example: contents: "Explain..." (String is allowed in new SDK)
            // contents: "Hello"
        });

        console.log("Success:", response.text());

    } catch (e) {
        console.error("Error:", e);
    }
}

test();
