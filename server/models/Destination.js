const mongoose = require('mongoose');

const destinationSchema = mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [Longitude, Latitude]
    },
    category: { type: String }, // e.g., Beach, Mountain, Historical
    tags: [{ type: String }],
    averageRating: { type: Number, default: 0 },
    images: [{ type: String }],
    occupancy: { type: Number, default: 0 },
    priceLevel: { type: String, enum: ['budget', 'mid-range', 'luxury'] }
}, { timestamps: true });

const Destination = mongoose.model('Destination', destinationSchema);
module.exports = Destination;
