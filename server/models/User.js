const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name: { type: String, required: true },
    touristId: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    alternativePhone: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['admin', 'tourist'], default: 'tourist' },
    aadhaarNumber: { type: String, unique: true, sparse: true },
    aadhaarDocumentUrl: { type: String }, // Link to PDF/Image
    aadhaarDocumentFile: { type: String }, // Base64 Content if uploaded directly
    verificationStatus: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },
    isAadhaarVerified: { type: Boolean, default: false },
    h3Index: { type: String }, // For Step 13: Nearby Tourist Awareness
    preferences: [{ type: String }], // For ML recommendations
    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    emergencyContacts: [{
        name: String,
        phone: String,
        relation: String
    }],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    twoFactorSecret: { type: Object }, // Store the temporary secret here or confirmed one
    isTwoFactorEnabled: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate Reset Token
const crypto = require('crypto');
userSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and set to resetPasswordToken
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expire (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);
module.exports = User;
