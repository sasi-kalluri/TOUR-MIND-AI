const User = require('../models/User.js');
const generateToken = require('../utils/generateToken.js');
const jwt = require('jsonwebtoken');
const { validateAadhaar } = require('../utils/aadhaar.js');
const { transporter } = require('../utils/email.js');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');


const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: process.env.FROM_EMAIL,
            to: email,
            subject: 'Your Login OTP',
            text: `Your OTP is ${otp}. It expires in 10 minutes.`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4f46e5;">AI Tourism Secure Login</h2>
                    <p>Your One-Time Password (OTP) is:</p>
                    <h1 style="font-size: 32px; letter-spacing: 5px; color: #333;">${otp}</h1>
                    <p>This code expires in 10 minutes.</p>
                   </div>`
        };
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error; // Re-throw to be caught by controller
    }
};

// @desc    Register a new user (Step 1: Send OTP, Don't save to DB yet)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, mobile } = req.body;

    console.log("Register Request Body:", req.body);

    // Enhanced Duplicate Check including Cross-Phone verification
    const checkQuery = [
        { email: email },
        { mobile: mobile },
        { alternativePhone: mobile }, // Mobile cannot be someone else's Alt Phone
    ];

    if (req.body.alternativePhone) {
        checkQuery.push({ alternativePhone: req.body.alternativePhone });
        checkQuery.push({ mobile: req.body.alternativePhone }); // Alt Phone cannot be someone else's Mobile
    }

    if (req.body.aadhaarNumber) {
        checkQuery.push({ aadhaarNumber: req.body.aadhaarNumber });
    }

    const userExists = await User.findOne({
        $or: checkQuery
    });

    if (userExists) {
        console.log("Duplicate User Found:", userExists.email);
        let conflictField = 'Unknown';

        if (userExists.email === email) conflictField = 'Email';
        else if (userExists.aadhaarNumber === req.body.aadhaarNumber) conflictField = 'Aadhaar Number';

        // precise Phone checks
        else if (userExists.mobile === mobile) conflictField = 'Mobile Number';
        else if (userExists.alternativePhone === mobile) conflictField = 'Mobile Number (linked as Alt Phone by another user)';

        else if (req.body.alternativePhone && userExists.alternativePhone === req.body.alternativePhone) conflictField = 'Alternative Phone';
        else if (req.body.alternativePhone && userExists.mobile === req.body.alternativePhone) conflictField = 'Alternative Phone (linked as Mobile by another user)';

        return res.status(400).json({ message: `User with this ${conflictField} already exists` });
    }

    // First registered user becomes Admin (Check DB count)
    const isFirstUser = (await User.countDocuments({})) === 0;
    const role = isFirstUser ? 'admin' : 'tourist';

    // Generate OTP
    const otp = generateOTP();

    // Create a temporary token containing all user data + OTP
    // This allows us to "store" the state on the client side (encrypted/signed) 
    // instead of the database until verification is complete.
    // Sanitize optional fields
    const sanitizedAadhaar = req.body.aadhaarNumber || undefined;
    const sanitizedAltPhone = req.body.alternativePhone || undefined;

    const registrationToken = jwt.sign(
        { name, email, password, mobile, alternativePhone: sanitizedAltPhone, role, aadhaarNumber: sanitizedAadhaar, otp },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );

    // Send OTP
    try {
        await sendEmail(email, otp);
        res.status(200).json({
            message: 'OTP sent to email. Verify to complete registration.',
            registrationToken // Send this back in next step
        });
    } catch (error) {
        res.status(500).json({ message: 'Error sending email' });
    }
};

// @desc    Login Step 1: Validate Password & Send OTP (or Send OTP for Admin Passwordless)
// @route   POST /api/auth/login
// @access  Public
// @desc    Login Step 1: Validate Password & Send OTP (or Send OTP for Admin Passwordless)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password, isAdminLogin } = req.body;

    // Allow login by Email OR Mobile
    // We assume the 'email' field from frontend might contain a mobile number
    const user = await User.findOne({
        $or: [
            { email: email },
            { mobile: email } // Frontend sends input in 'email' field
        ]
    });

    // Scenario A: Admin Passwordless Login (OTP Only)
    if (isAdminLogin) {
        if (user && user.role === 'admin') {
            const otp = generateOTP();
            user.otp = otp;
            user.otpExpires = Date.now() + 10 * 60 * 1000;
            await user.save();

            // Notify via Email (Simulating Mobile SMS for now as we don't have SMS gateway)
            try {
                await sendEmail(user.email, otp);
                return res.json({
                    _id: user._id,
                    message: `OTP sent to ${user.email}`,
                    role: user.role,
                    requireTwoFactor: true // Triggers Step 2 (OTP)
                });
            } catch (error) {
                return res.status(500).json({ message: 'Error sending OTP' });
            }
        } else {
            return res.status(401).json({ message: 'Admin account not found' });
        }
    }

    // Scenario B: Standard Login (Email + Password)
    if (user && (await user.matchPassword(password))) {
        if (user.isBlocked) {
            return res.status(403).json({ message: 'Access Denied: Your account has been blocked by an administrator.' });
        }

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        try {
            await sendEmail(user.email, otp);
            res.json({
                _id: user._id,
                message: 'OTP sent to registered email',
                role: user.role,
                requireTwoFactor: true
            });
        } catch (error) {
            res.status(500).json({ message: 'Error sending OTP' });
        }
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    // Find user again by Email or Mobile
    const user = await User.findOne({
        $or: [
            { email: email },
            { mobile: email }
        ]
    });

    if (user && user.otp === otp && user.otpExpires > Date.now()) {
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        if (user.role === 'admin') {
            // Step 3: Require Admin Code
            res.json({
                message: 'OTP Verified. Please enter Secure Admin Code.',
                requireAdminCode: true,
                role: 'admin'
            });
        } else {
            // Tourist
            if (user.isTwoFactorEnabled) {
                const tempToken = jwt.sign({ id: user._id, role: user.role, scope: '2fa_login' }, process.env.JWT_SECRET, { expiresIn: '5m' });
                return res.json({
                    require2FA: true,
                    tempToken,
                    message: '2FA Verification Required'
                });
            }

            // Authenticate immediately
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
                isAadhaarVerified: user.isAadhaarVerified,
                message: 'Authentication Successful'
            });
        }

    } else {
        res.status(400).json({ message: 'Invalid or expired OTP' });
    }
};

// @desc    Verify Admin Code (Step 2 for Admin)
// @route   POST /api/auth/verify-admin-code
// @access  Public
const verifyAdminCode = async (req, res) => {
    const { email, adminCode } = req.body;

    console.log(`[VerifyAdmin] Received: '${adminCode}', Expected: '${process.env.ADMIN_SECRET_CODE}'`); // Debugging

    // Relaxed comparison (Trim whitespace)
    if (adminCode && process.env.ADMIN_SECRET_CODE && adminCode.trim() === process.env.ADMIN_SECRET_CODE.trim()) {
        const user = await User.findOne({
            $or: [
                { email: email },
                { mobile: email }
            ]
        });

        if (user && user.role === 'admin') {
            if (user.isTwoFactorEnabled) {
                const tempToken = jwt.sign({ id: user._id, role: user.role, scope: '2fa_login' }, process.env.JWT_SECRET, { expiresIn: '5m' });
                return res.json({
                    require2FA: true,
                    tempToken,
                    message: '2FA Verification Required'
                });
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Not authorized' });
        }
    } else {
        res.status(401).json({ message: 'Invalid Admin Code' });
    }
};

// @desc    Verify Login 2FA (Step 4)
// @route   POST /api/auth/verify-login-2fa
// @access  Public
const verifyLogin2FA = async (req, res) => {
    const { tempToken, token } = req.body;

    if (!tempToken || !token) {
        return res.status(400).json({ message: 'Missing token or code' });
    }

    try {
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        if (decoded.scope !== '2fa_login') {
            return res.status(401).json({ message: 'Invalid login session' });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify TOTP
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret.base32,
            encoding: 'base32',
            token: token,
            window: 1 // Allow little slack
        });

        if (verified) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
                isAadhaarVerified: user.isAadhaarVerified,
                message: 'Login Successful'
            });
        } else {
            res.status(400).json({ message: 'Invalid 2FA Code' });
        }
    } catch (error) {
        console.error("2FA Error:", error);
        res.status(401).json({ message: 'Session expired or invalid. Please try login again.' });
    }
};

// @desc    Submit Identity Verification (Aadhaar + Doc Link/File)
// @route   POST /api/auth/submit-verification
// @access  Private
const submitVerification = async (req, res) => {
    const { aadhaarNumber, documentUrl } = req.body;
    // Multer puts the file in req.file
    const documentFile = req.file ? `/${req.file.path.replace(/\\/g, '/')}` : (req.body.documentFile || '');

    const userId = req.user._id;

    if (!aadhaarNumber || (!documentUrl && !documentFile)) {
        return res.status(400).json({ message: 'Please provide Aadhaar Number and at least one proof Document' });
    }

    try {
        const user = await User.findById(userId);
        if (user) {
            user.aadhaarNumber = aadhaarNumber;
            // Only update fields that are provided, or clear them if not? 
            // Better to overwrite if new submission
            user.aadhaarDocumentUrl = documentUrl || '';
            user.aadhaarDocumentFile = documentFile || '';

            user.verificationStatus = 'pending';
            user.isAadhaarVerified = false; // Reset if re-submitting
            await user.save();
            res.json({ message: 'Verification Submitted Successfully. Pending Admin Approval.', verificationStatus: 'pending' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Admin: Update Verification Status (Approve/Reject)
// @route   PUT /api/auth/users/:id/verification
// @access  Private/Admin
const updateVerificationStatus = async (req, res) => {
    const { status } = req.body; // 'verified' or 'rejected'
    const user = await User.findById(req.params.id);

    if (user) {
        if (status === 'verified') {
            user.isAadhaarVerified = true;
            user.verificationStatus = 'verified';
        } else if (status === 'rejected') {
            user.isAadhaarVerified = false;
            user.verificationStatus = 'rejected';
        } else {
            return res.status(400).json({ message: 'Invalid status' });
        }
        await user.save();
        res.json({ message: `Verification status updated to ${status}`, verificationStatus: user.verificationStatus });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Sanitize/Verify Aadhaar (Legacy/Direct)
// @route   POST /api/auth/verify-aadhaar (Kept for compatibility or if we want auto-verify later)
// @access  Private
const verifyAadhaar = async (req, res) => {
    const { aadhaarNumber } = req.body;
    const userId = req.user._id;

    if (validateAadhaar(aadhaarNumber)) {
        const user = await User.findById(userId);
        if (user) {
            user.aadhaarNumber = aadhaarNumber;
            // If we use this direct verification, we might Auto-Approve? 
            // The prompt asks for "Applying form", so likely manual or just submission.
            // Let's keep this as "Instant Check" if needed, but the new flow is submitVerification
            user.isAadhaarVerified = true;
            user.verificationStatus = 'verified';
            await user.save();
            res.json({ message: 'Aadhaar Verified Successfully', isAadhaarVerified: true });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } else {
        res.status(400).json({ message: 'Invalid Aadhaar Number (Verhoeff Check Failed)' });
    }
};



// @desc    Complete Registration (Verify OTP & Save User)
// @route   POST /api/auth/complete-registration
// @access  Public
const completeRegistration = async (req, res) => {
    const { otp, registrationToken } = req.body;

    if (!registrationToken) {
        return res.status(400).json({ message: 'Missing registration token' });
    }

    try {
        // Decode the token to get temporary user data
        const decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);

        // Check OTP
        if (decoded.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Check if user already exists (Double check against race conditions)
        const checkQuery = [
            { email: decoded.email },
            { mobile: decoded.mobile }
        ];
        if (decoded.aadhaarNumber) {
            checkQuery.push({ aadhaarNumber: decoded.aadhaarNumber });
        }
        if (decoded.alternativePhone) {
            checkQuery.push({ alternativePhone: decoded.alternativePhone });
        }

        const userExists = await User.findOne({
            $or: checkQuery
        });
        if (userExists) {
            return res.status(400).json({ message: 'User with this Email, Mobile, Aadhaar, or Alternative Phone already exists' });
        }

        // Create User - PASSWORD HASHING happens in 'pre-save' hook automatically
        // Note: decoded.password is the raw password from step 1
        // Generate Tourist ID
        const touristId = `TRST-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;

        const user = await User.create({
            name: decoded.name,
            touristId: touristId,
            email: decoded.email,
            password: decoded.password,
            mobile: decoded.mobile,
            alternativePhone: decoded.alternativePhone,
            role: decoded.role,
            aadhaarNumber: decoded.aadhaarNumber || undefined, // Ensure sparse index works
            isVerified: true
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                touristId: user.touristId,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id), // Auto-login
                message: `Registration Successful! Your Tourist ID is ${user.touristId}`
            });
        }
    } catch (error) {
        console.error("Registration Completion Error:", error);
        res.status(400).json({ message: 'Invalid or expired registration session' });
    }
};

// @desc    Logout User
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
    // Client-side handles token removal, but if we used cookies we'd clear them here.
    // For stateless JWT, we can't truly invalidate without a blacklist, but we acknowledge the request.
    res.json({ message: 'Logged out successfully' });
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        if (!req.user) return res.status(404).json({ message: 'User not found' });
        res.json(req.user);
    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get All Users (Admin)
// @route   GET /api/auth/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    // Filter to exclude admins if desired, or show all. Usually Admin wants to see tourists.
    const users = await User.find({ role: 'tourist' }).select('-password');
    res.json(users);
};

// @desc    Block/Unblock User (Admin)
// @route   PUT /api/auth/users/:id/block
// @access  Private/Admin
const toggleBlockUser = async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.json({ message: `User ${user.isBlocked ? 'Blocked' : 'Unblocked'}`, isBlocked: user.isBlocked });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Forgot Password - Send Reset Email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Generate Reset Token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    const message = `
      You are receiving this email because you (or someone else) has requested the reset of a password.
      Please click on the link below to reset your password:
      \n\n ${resetUrl} \n\n
      This link is valid for 10 minutes.
    `;

    try {
        await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: user.email,
            subject: 'Password Reset Token',
            text: message
        });

        res.status(200).json({ success: true, message: 'Email sent' });
    } catch (error) {
        console.error(error);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        res.status(500).json({ message: 'Email could not be sent' });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
const resetPassword = async (req, res) => {
    // Get hashed token
    const crypto = require('crypto');
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
};

// @desc    Generate 2FA Secret
// @route   POST /api/auth/2fa/generate
// @access  Private
const generate2FA = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const secret = speakeasy.generateSecret({
        length: 20,
        name: `AI Tourism (${user.email})`
    });

    // Save secret to user but don't enable it yet
    user.twoFactorSecret = secret;
    await user.save();

    // Generate QR Code
    QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) {
            return res.status(500).json({ message: 'Error generating QR Code' });
        }
        res.json({
            secret: secret.base32,
            qrCodeUrl: data_url
        });
    });
};

// @desc    Verify 2FA Token and Enable
// @route   POST /api/auth/2fa/verify
// @access  Private
const verify2FA = async (req, res) => {
    const { token } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorSecret || !user.twoFactorSecret.base32) {
        return res.status(400).json({ message: '2FA secret not generated' });
    }

    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret.base32,
        encoding: 'base32',
        token: token
    });

    if (verified) {
        user.isTwoFactorEnabled = true;
        await user.save();
        res.json({ message: '2FA Enabled Successfully' });
    } else {
        res.status(400).json({ message: 'Invalid Verification Code' });
    }
};

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
const disable2FA = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();
    res.json({ message: '2FA Disabled' });
};

// @desc    Update User (Admin)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.mobile = req.body.mobile || user.mobile;
            user.role = req.body.role || user.role;
            user.alternativePhone = req.body.alternativePhone || user.alternativePhone;

            // Allow Admin to manually set Aadhaar and Verification Status
            if (req.body.aadhaarNumber) user.aadhaarNumber = req.body.aadhaarNumber;
            if (req.body.verificationStatus) {
                user.verificationStatus = req.body.verificationStatus;
                user.isAadhaarVerified = req.body.verificationStatus === 'verified';
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                verificationStatus: updatedUser.verificationStatus
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete User (Admin)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            await User.deleteOne({ _id: user._id });
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    verifyOTP,
    verifyAdminCode,
    verifyAadhaar,
    completeRegistration,
    logoutUser,
    getAllUsers,
    toggleBlockUser,
    deleteUser,
    updateUser, // Added export
    getMe,
    forgotPassword,
    resetPassword,
    generate2FA,
    verify2FA,
    disable2FA,
    verifyLogin2FA,
    submitVerification,
    updateVerificationStatus
};
