const mongoose = require('mongoose');

const dangerZoneSchema = mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    severity: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    radius: { type: Number, required: true, default: 1000 } // Meters
}, { timestamps: true });

dangerZoneSchema.index({ location: '2dsphere' });

const DangerZone = mongoose.model('DangerZone', dangerZoneSchema);
module.exports = DangerZone;
