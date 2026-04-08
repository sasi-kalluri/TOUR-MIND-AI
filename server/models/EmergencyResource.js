const mongoose = require('mongoose');

const emergencyResourceSchema = mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['Police', 'Hospital', 'Fire', 'Embassy', 'SOS_Kiosk'], required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [Longitude, Latitude]
    },
    address: { type: String },
    phone: { type: String },
    is24Hours: { type: Boolean, default: true }
}, { timestamps: true });

emergencyResourceSchema.index({ location: '2dsphere' });

const EmergencyResource = mongoose.model('EmergencyResource', emergencyResourceSchema);
module.exports = EmergencyResource;
