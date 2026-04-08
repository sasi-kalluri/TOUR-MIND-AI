const express = require('express');
const router = express.Router();
const { chatSession } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', chatSession);

module.exports = router;
