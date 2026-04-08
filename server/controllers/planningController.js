const { GoogleGenerativeAI } = require("@google/generative-ai");
const Itinerary = require('../models/Itinerary');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "MOCK_KEY");

// @desc    Generate Trip Itinerary
// @route   POST /api/planning/generate
// @access  Private
const generateItinerary = async (req, res) => {
    const { destination, budget, days, preferences, user_id } = req.body;

    // Check Mock Mode
    if (!process.env.GEMINI_API_KEY) {
        console.log("Using Mock Itinerary Generator (No API Key)");
        const mockItinerary = {
            title: `Trip to ${destination}`,
            destination,
            stats: {
                duration: `${days} Days`,
                cost: `₹${budget}`,
                style: preferences.join(', ')
            },
            schedule: Array.from({ length: parseInt(days) }).map((_, i) => ({
                day: i + 1,
                activities: [
                    { time: '09:00 AM', title: `Breakfast in ${destination}`, icon: '☕' },
                    { time: '11:00 AM', title: 'Sightseeing', icon: '📸' },
                    { time: '01:00 PM', title: 'Local Cuisine Lunch', icon: '🍽️' },
                    { time: '07:00 PM', title: 'Dinner & Relax', icon: '🌙' }
                ]
            }))
        };

        // Save Mock to DB
        const saved = await Itinerary.create({
            user: user_id || req.user._id,
            title: mockItinerary.title,
            destination,
            duration: days,
            budget: parseInt(budget) || 0,
            preferences,
            plan: mockItinerary
        });

        return res.json(saved.plan);
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `Act as an expert travel agent. Create a ${days}-day itinerary for ${destination}. 
        Budget: ${budget} INR. Mode: Optimized for ${preferences.join(', ')}. 
        Structure the JSON response exactly as follows:
        {
            "title": "Trip Title",
            "stats": { "duration": "${days} Days", "cost": "₹${budget}", "style": "..." },
            "schedule": [
                {
                    "day": 1,
                    "activities": [
                        { "time": "09:00 AM", "title": "Activity Name", "lat": 0.0, "lng": 0.0, "icon": "emoji" }
                    ]
                }
            ]
        }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean Markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let itineraryData;
        try {
            itineraryData = JSON.parse(text);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            console.error("Raw AI Response:", text);
            return res.status(500).json({ message: 'AI Response Invalid JSON' });
        }

        // Cache in DB
        const saved = await Itinerary.create({
            user: req.user._id,
            title: itineraryData.title,
            destination,
            duration: parseInt(days),
            budget: parseInt(budget),
            preferences,
            plan: itineraryData
        });

        res.json(saved.plan);

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ message: 'Failed to generate itinerary', error: error.message });
    }
};

const { solveTSP } = require('../utils/tspSolver');

// @desc    Optimize Route (TSP)
// @route   POST /api/planning/optimize
// @access  Private
const optimizeRoute = async (req, res) => {
    const { places } = req.body;
    // Places input: [{ name, lat, lng }, ...]

    if (!places || places.length < 2) {
        return res.status(400).json({ message: 'Need at least 2 places to optimize' });
    }

    try {
        const result = solveTSP(places, { w1: 1, w2: 0 });
        res.json(result);
    } catch (error) {
        console.error("Optimizer Error:", error);
        res.status(500).json({ message: 'Optimization failed' });
    }
}

// @desc    Get all user bookings/itineraries for Admin
// @route   GET /api/planning/bookings
// @access  Private/Admin
const getAllBookings = async (req, res) => {
    try {
        const bookings = await Itinerary.find({ type: 'enquiry' })
            .populate('user', 'name email mobile') // Include mobile/email
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error("Fetch Bookings Error:", error);
        res.status(500).json({ message: 'Failed to fetch bookings' });
    }
};

// @desc    Delete Itinerary
// @route   DELETE /api/planning/:id
// @access  Private/Admin
const deleteItinerary = async (req, res) => {
    try {
        const itinerary = await Itinerary.findById(req.params.id);
        if (itinerary) {
            await itinerary.deleteOne();
            res.json({ message: 'Itinerary deleted' });
        } else {
            res.status(404).json({ message: 'Itinerary not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Delete failed' });
    }
};

// @desc    Get logged-in user's itineraries
// @route   GET /api/planning/my-itineraries
// @access  Private
const getUserItineraries = async (req, res) => {
    try {
        const bookings = await Itinerary.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch itineraries' });
    }
};

// @desc    Create Booking/Enquiry
// @route   POST /api/planning/enquiry
// @access  Private
const createEnquiry = async (req, res) => {
    try {
        const { destination, budget, travelStyle, name, email, phone, whatsapp, aadhaarLink, aadhaarFile, itineraryId } = req.body;

        // IF ITINERARY ID EXISTS: CONVERT GENERATED PLAN TO ENQUIRY
        if (itineraryId) {
            const existing = await Itinerary.findById(itineraryId);
            if (existing) {
                existing.contactDetails = { name, email, phone, whatsapp, aadhaarLink, aadhaarFile };
                existing.budget = parseInt(budget) || existing.budget;
                existing.preferences = Array.isArray(travelStyle) ? travelStyle : existing.preferences;
                existing.type = 'enquiry'; // Convert to enquiry so it shows in Admin
                existing.plan.status = 'Pending';
                existing.markModified('plan');
                await existing.save();
                return res.status(200).json(existing);
            }
        }

        // Check for existing pending enquiry for this destination
        const existingEnquiry = await Itinerary.findOne({
            user: req.user._id,
            destination: destination,
            type: 'enquiry',
            'plan.status': 'Pending'
        });

        if (existingEnquiry) {
            return res.status(200).json(existingEnquiry); // Return existing one, don't create new
        }

        const enquiry = await Itinerary.create({
            user: req.user._id,
            title: `Enquiry for ${destination}`,
            destination,
            duration: 7, // Default duration for trending
            budget: parseInt(budget) || 0,
            preferences: Array.isArray(travelStyle) ? travelStyle : [travelStyle].filter(Boolean),
            contactDetails: { name, email, phone, whatsapp, aadhaarLink, aadhaarFile },
            type: 'enquiry',
            plan: {
                note: "This is a booking enquiry. Our team will contact you.",
                status: 'Pending'
            }
        });

        res.status(201).json(enquiry);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Enquiry failed' });
    }
};

// @desc    Update Booking Status
// @route   PUT /api/planning/:id/status
// @access  Private/Admin
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const itinerary = await Itinerary.findById(req.params.id);

        if (itinerary) {
            itinerary.plan.status = status;
            itinerary.markModified('plan'); // REQUIRED for Mixed/Object type updates
            await itinerary.save();
            res.json(itinerary);
        } else {
            res.status(404).json({ message: 'Itinerary not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Update failed' });
    }
};

module.exports = {
    generateItinerary,
    optimizeRoute,
    getAllBookings,
    deleteItinerary,
    getUserItineraries,
    createEnquiry,
    updateBookingStatus
};