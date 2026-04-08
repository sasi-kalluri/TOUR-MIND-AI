const { GoogleGenerativeAI } = require("@google/generative-ai");
const DangerZone = require('../models/DangerZone');
const Destination = require('../models/Destination');

// @desc    Chat with AI Assistant
// @route   POST /api/chat
// @access  Private
const chatSession = async (req, res) => {
    const { message, userInfo } = req.body;

    // Use provided key or fallback to env
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.json({ response: "Service Unavailable: API Key missing." });
    }

    try {
        // 1. Fetch Real-time Data for Context (Online Path)
        const dangerZones = await DangerZone.find({}).lean();
        const destinations = await Destination.find({}).limit(10).select('name description category averageRating priceLevel location').lean();

        // Construct Context String
        const contextInfo = `
        REAL-TIME DATABASE CONTEXT:
        
        [DANGER ZONES - WARN USERS IF THEY ASK OR PLAN TO GO HERE]:
        ${dangerZones.map(z => `- ${z.name}: ${z.severity.toUpperCase()} SEVERITY. ${z.description}`).join('\n')}

        [POPULAR DESTINATIONS]:
        ${destinations.map(d => `- ${d.name} (${d.category}): Rating ${d.averageRating}. ${d.description.substring(0, 100)}...`).join('\n')}

        [CURRENT USER CONTEXT]:
        - Name: ${userInfo?.name || 'Guest'}
        - Email: ${userInfo?.email || 'N/A'}
        - Current Location (GPS): ${userInfo?.location || 'Unknown'}
        - Booked/Applied Tours: ${userInfo?.appliedTours || 'None'}
        `;

        const genAI = new GoogleGenerativeAI(API_KEY);

        // Use systemInstruction for better context handling
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `You are an AI Travel Assistant named 'TouristAI'. 
            Your goal is to help tourists with itinerary planning, safety tips, local food recommendations, and travel logistics.
            
            ${contextInfo}
            
            INSTRUCTIONS:
            1. Use the DANGER ZONES data to warn users immediately if they mention these areas.
            2. Use the DESTINATIONS data to recommend places.
            3. USE THE USER CONTEXT to personalize messages (e.g., "Hello [Name]", "I see you are in [Location]").
            4. Be polite, concise, and helpful. 
            5. Always prioritize safety. If asked about emergency, suggest dialing 112.
            6. If asked about database details, summarize the danger zones and destinations you have access to.
            7. **MAP SEARCH TOOL**: If the user explicitly asks to "search in the map", "show me [place] on map", or "find [place] in map", you MUST include this exact tag at the end of your response: [SEARCH_MAP: Place Name]. 
               - Example User: "Can you search for Putlur in the map?"
               - Example Response: "Sure, navigating to Putlur now. [SEARCH_MAP: Putlur, Anantapur, Andhra Pradesh]"
               - Only use this tag if a clear map search request is made.`
        });

        const chat = model.startChat({
            history: [],
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7,
            },
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return res.json({ response: response.text() });

    } catch (error) {
        console.error("Online Chat Error:", error);

        // User requested NO OFFLINE MODE. 
        // Returning raw error to help debug API Key issues (404, 403, etc.)
        const errorMessage = error.message || "Unknown API Error";
        let userHelp = "";

        if (errorMessage.includes("404")) {
            userHelp = " (Error 404: The 'Gemini API' is likely NOT ENABLED in your Google Cloud Project. Please enable it.)";
        } else if (errorMessage.includes("403")) {
            userHelp = " (Error 403: Invalid API Key or Location Restricted.)";
        }

        return res.json({
            response: `❌ ** AI Connection Failed **\n\nError Details: ${errorMessage}${userHelp} \n\n * Offline mode is disabled.* `
        });
    }
};

module.exports = { chatSession };
