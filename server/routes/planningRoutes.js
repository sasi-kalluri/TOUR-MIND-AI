const express = require('express');
const router = express.Router();
const { generateItinerary, optimizeRoute, getAllBookings, deleteItinerary, getUserItineraries, createEnquiry } = require('../controllers/planningController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/generate', protect, generateItinerary);
router.post('/enquiry', protect, createEnquiry);
router.post('/optimize', protect, optimizeRoute);
router.post('/optimize', protect, optimizeRoute);
router.get('/my-itineraries', protect, getUserItineraries);
router.get('/bookings', protect, admin, getAllBookings);

router.route('/:id').delete(protect, admin, deleteItinerary);
router.put('/:id/status', protect, admin, require('../controllers/planningController').updateBookingStatus);

module.exports = router;
