const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    verifyOTP,
    verifyAdminCode,
    verifyAadhaar,
    completeRegistration,
    logoutUser,
    getAllUsers,
    toggleBlockUser,
    getMe,
    forgotPassword,
    resetPassword,
    generate2FA,
    verify2FA,
    disable2FA,
    verifyLogin2FA,
    submitVerification,
    updateVerificationStatus,
    deleteUser,
    updateUser // Added import
} = require('../controllers/authController.js');
const { protect, admin } = require('../middleware/authMiddleware.js');

const upload = require('../middleware/uploadMiddleware.js');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOTP);
router.post('/verify-admin-code', verifyAdminCode);
router.post('/verify-login-2fa', verifyLogin2FA);
router.post('/complete-registration', completeRegistration);
router.post('/verify-aadhaar', protect, verifyAadhaar);
router.post('/submit-verification', protect, upload.single('documentFile'), submitVerification);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.post('/2fa/generate', protect, generate2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/disable', protect, disable2FA);

// Admin User Management
router.get('/users', protect, admin, getAllUsers);
router.put('/users/:id/block', protect, admin, toggleBlockUser);
router.put('/users/:id/verification', protect, admin, updateVerificationStatus);
router.put('/users/:id', protect, admin, updateUser); // Added Route
router.delete('/users/:id', protect, admin, deleteUser);

module.exports = router;
