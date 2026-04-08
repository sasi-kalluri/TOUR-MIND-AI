const mongoose = require('mongoose');

const itinerarySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    duration: {
        type: Number, // Number of days
        required: true
    },
    budget: {
        type: Number,
        required: true
    },
    preferences: [String],
    contactDetails: {
        name: String,
        email: String,
        phone: String,
        whatsapp: String,
        aadhaarLink: String,
        aadhaarFile: String // Base64 Data URI
    },
    type: { type: String, default: 'generated' }, // generated, enquiry
    plan: {
        type: Object, // Stores the detailed JSON structure from AI
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '30d' // Cache expires in 30 days
    }
});

const Itinerary = mongoose.model('Itinerary', itinerarySchema);

module.exports = Itinerary;
