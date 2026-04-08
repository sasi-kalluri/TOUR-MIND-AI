const Notification = require('../models/Notification.js');
const User = require('../models/User.js');
const { transporter } = require('../utils/email.js');


// @desc    Create a notification (Admin) & Send Email
// @route   POST /api/notifications
// @access  Private/Admin
const createNotification = async (req, res) => {
    try {
        const { userId, message, type } = req.body;

        // 1. Create In-App Notification
        const notification = await Notification.create({ userId, message, type });

        // 2. Send Email
        const user = await User.findById(userId);
        if (user && user.email) {
            try {
                await transporter.sendMail({
                    from: process.env.FROM_EMAIL,
                    to: user.email,
                    subject: 'Message from Admin - AI Tourism Platform',
                    text: message,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 8px;">
                            <h2 style="color: #0d9488;">Admin Notification</h2>
                            <p style="font-size: 16px;">Hello <strong>${user.name}</strong>,</p>
                            <p style="font-size: 16px; line-height: 1.5;">${message}</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 12px; color: #888;">AI Tourism Platform</p>
                        </div>
                    `
                });
            } catch (emailError) {
                console.error("Failed to send email:", emailError);
                // Continue execution, don't fail the request just because email failed
            }
        }

        res.status(201).json(notification);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to send notification' });
    }
};

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (notification) {
            notification.isRead = true;
            await notification.save();
            res.json({ message: 'Marked as read' });
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification' });
    }
};

module.exports = { createNotification, getUserNotifications, markAsRead };

