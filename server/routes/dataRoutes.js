const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/dataController.js');
const { protect, admin } = require('../middleware/authMiddleware.js');

// Routes
router.route('/destinations')
    .get(getDestinations)
    .post(protect, admin, createDestination);

router.route('/destinations/:id')
    .put(protect, admin, updateDestination)
    .delete(protect, admin, deleteDestination);

router.route('/danger-zones')
    .get(getDangerZones)
    .post(protect, admin, createDangerZone);

router.route('/danger-zones/:id')
    .put(protect, admin, updateDangerZone)
    .delete(protect, admin, deleteDangerZone);

router.route('/feedback')
    .get(getFeedback)
    .post(protect, createFeedback);

module.exports = router;
