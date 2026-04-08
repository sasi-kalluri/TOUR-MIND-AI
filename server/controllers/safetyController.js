const DangerZone = require('../models/DangerZone');
const { transporter } = require('../utils/email.js');


// @desc    Check if tourist is in danger zone
// @route   POST /api/safety/check
// @access  Private
const checkSafety = async (req, res) => {
    const { latitude, longitude } = req.body;

    try {
        // Find zones where the point is within the radius
        // MongoDB $near is good, but doesn't strictly filter by radius in the document unless we calculate.
        // Better: Find all zones, and filter in code (safest for complex radius) OR use $geoWithin $center if dynamic?
        // Since radius is per-document, MongoDB doesn't support "within document's radius" query natively in one go easily without aggregation.
        // Implementation: Find nearby zones (e.g. within 5km) then check precise distance < zone.radius

        const nearbyZones = await DangerZone.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [longitude, latitude] },
                    $maxDistance: 5000 // optimize: look only within 5km
                }
            }
        });

        let activeDanger = null;

        for (const zone of nearbyZones) {
            const distance = getDistanceFromLatLonInKm(latitude, longitude, zone.location.coordinates[1], zone.location.coordinates[0]) * 1000; // meters
            if (distance <= zone.radius) {
                activeDanger = zone;
                break; // Found one
            }
        }

        if (activeDanger) {
            res.json({
                status: 'danger',
                zone: activeDanger,
                message: `WARNING: You are inside ${activeDanger.name}`
            });
        } else {
            res.json({ status: 'safe' });
        }

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Trigger Alert (Email + Socket)
// @route   POST /api/safety/alert
// @access  Private
const sendAlert = async (req, res) => {
    const { userId, location, zoneName, contacts } = req.body;

    // 1. Send Socket Alert to Admins
    const io = req.app.get('io');
    if (io) {
        io.emit('adminAlert', {
            message: `CRITICAL: User ${userId} entered ${zoneName}`,
            location,
            timestamp: new Date(),
            type: 'danger'
        });
    }

    // 2. Send Emails
    if (contacts && contacts.length > 0) {
        contacts.forEach(async (contact) => {
            try {
                await transporter.sendMail({
                    from: process.env.FROM_EMAIL,
                    to: contact.email, // Assuming contact has email, if phone only we need SMS gateway
                    subject: 'URGENT: Travel Safety Alert',
                    text: `Emergency Alert! Your contact has entered a danger zone: ${zoneName}. Location: https://maps.google.com/?q=${location.lat},${location.lng}`
                });
            } catch (e) {
                console.error('Failed to send email alert', e);
            }
        });
    }

    res.json({ message: 'Alerts triggered successfully' });
};

// Helper: Haversine Formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

module.exports = { checkSafety, sendAlert };
