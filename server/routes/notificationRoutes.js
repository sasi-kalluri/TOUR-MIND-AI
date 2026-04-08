const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware.js');
const { createNotification, getUserNotifications, markAsRead } = require('../controllers/notificationController.js');

const router = express.Router();

router.route('/')
    .post(protect, admin, createNotification)
    .get(protect, getUserNotifications);

router.route('/:id/read').put(protect, markAsRead);

module.exports = router;
