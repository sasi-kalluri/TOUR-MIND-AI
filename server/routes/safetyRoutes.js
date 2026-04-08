const express = require('express');
const router = express.Router();
const { checkSafety, sendAlert } = require('../controllers/safetyController');
const { protect } = require('../middleware/authMiddleware');

router.post('/check', protect, checkSafety);
router.post('/alert', protect, sendAlert);

module.exports = router;
