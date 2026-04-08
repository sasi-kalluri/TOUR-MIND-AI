const Destination = require('../models/Destination');
const DangerZone = require('../models/DangerZone');

// @desc    Get all destinations
// @route   GET /api/destinations
// @access  Public
const getDestinations = async (req, res) => {
    try {
        const destinations = await Destination.find({});
        const feedbacks = await Feedback.find({});

        const destinationsWithRating = destinations.map(dest => {
            const destFeedbacks = feedbacks.filter(f => f.destinationName && f.destinationName.trim().toLowerCase() === dest.name.trim().toLowerCase());
            const count = destFeedbacks.length;
            const avg = count > 0
                ? (destFeedbacks.reduce((acc, curr) => acc + curr.rating, 0) / count).toFixed(1)
                : (dest.rating || "4.5"); // Fallback to schema rating or 4.5

            return {
                ...dest.toObject(),
                averageRating: avg,
                ratingCount: count
            };
        });

        res.json(destinationsWithRating);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a destination
// @route   POST /api/destinations
// @access  Private/Admin
const createDestination = async (req, res) => {
    const { name, description, latitude, longitude, category, priceLevel, images, occupancy } = req.body;

    try {
        const destination = new Destination({
            name,
            description,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude] // GeoJSON is Longitude first
            },
            category,
            priceLevel,
            images,
            occupancy: occupancy || 0
        });

        const createdDestination = await destination.save();
        res.status(201).json(createdDestination);
    } catch (error) {
        res.status(400).json({ message: 'Invalid data' });
    }
};

// @desc    Get all danger zones
// @route   GET /api/danger-zones
// @access  Public
const getDangerZones = async (req, res) => {
    try {
        const zones = await DangerZone.find({});
        res.json(zones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const Feedback = require('../models/Feedback');

// @desc    Submit Feedback
// @route   POST /api/data/feedback
// @access  Private
const createFeedback = async (req, res) => {
    const { destinationName, rating, comment } = req.body;
    try {
        const feedback = await Feedback.create({
            user: req.user._id,
            destinationName,
            rating,
            comment
        });
        res.status(201).json(feedback);
    } catch (error) {
        res.status(400).json({ message: 'Invalid feedback data' });
    }
};

// @desc    Get Feedback (All for now, can filter by Dest later)
// @route   GET /api/data/feedback
// @access  Public
const getFeedback = async (req, res) => {
    try {
        const feedbacks = await Feedback.find({}).populate('user', 'name').sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a danger zone
// @route   POST /api/danger-zones
// @access  Private/Admin
const createDangerZone = async (req, res) => {
    const { name, description, severity, latitude, longitude, radius } = req.body;

    try {
        const dangerZone = new DangerZone({
            name,
            description,
            severity,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude]
            },
            radius: radius || 1000
        });

        const createdZone = await dangerZone.save();
        res.status(201).json(createdZone);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid Map Data' });
    }
};

// @desc    Update a destination
// @route   PUT /api/data/destinations/:id
// @access  Private/Admin
const updateDestination = async (req, res) => {
    try {
        const { name, description, latitude, longitude, category, priceLevel, images, occupancy } = req.body;
        const dest = await Destination.findById(req.params.id);
        if (dest) {
            dest.name = name || dest.name;
            dest.description = description || dest.description;
            if (latitude && longitude) {
                dest.location.coordinates = [longitude, latitude];
            }
            dest.category = category || dest.category;
            dest.priceLevel = priceLevel || dest.priceLevel;
            dest.images = images || dest.images;
            dest.occupancy = occupancy || dest.occupancy;

            const updated = await dest.save();
            res.json(updated);
        } else {
            res.status(404).json({ message: 'Destination not found' });
        }
    } catch (err) {
        res.status(400).json({ message: 'Update failed' });
    }
};

// @desc    Delete a destination
// @route   DELETE /api/data/destinations/:id
// @access  Private/Admin
const deleteDestination = async (req, res) => {
    try {
        const dest = await Destination.findById(req.params.id);
        if (dest) {
            await dest.deleteOne();
            res.json({ message: 'Destination removed' });
        } else {
            res.status(404).json({ message: 'Destination not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Delete failed' });
    }
};

// @desc    Update a danger zone
// @route   PUT /api/data/danger-zones/:id
// @access  Private/Admin
const updateDangerZone = async (req, res) => {
    try {
        const { name, description, severity, latitude, longitude, radius } = req.body;
        const zone = await DangerZone.findById(req.params.id);

        if (zone) {
            zone.name = name || zone.name;
            zone.description = description || zone.description;
            zone.severity = severity || zone.severity;
            if (latitude !== undefined && longitude !== undefined) {
                zone.location.coordinates = [longitude, latitude];
            }
            zone.radius = radius || zone.radius;

            const updatedZone = await zone.save();
            res.json(updatedZone);
        } else {
            res.status(404).json({ message: 'Zone not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Update failed' });
    }
};

// @desc    Delete a danger zone
// @route   DELETE /api/data/danger-zones/:id
// @access  Private/Admin
const deleteDangerZone = async (req, res) => {
    try {
        const zone = await DangerZone.findById(req.params.id);
        if (zone) {
            await zone.deleteOne();
            res.json({ message: 'Zone removed' });
        } else {
            res.status(404).json({ message: 'Zone not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Delete failed' });
    }
};

module.exports = {
    getDestinations,
    createDestination,
    getDangerZones,
    createDangerZone,
    createFeedback,
    getFeedback,
    updateDestination,
    deleteDestination,
    updateDangerZone,
    deleteDangerZone
};
