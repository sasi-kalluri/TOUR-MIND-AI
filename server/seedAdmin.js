const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        const adminExists = await User.findOne({ email: 'admin@ai-tourism.com' });

        if (adminExists) {
            console.log('Admin user already exists');
            process.exit();
        }

        const adminUser = new User({
            name: 'Super Admin',
            email: 'admin@ai-tourism.com',
            password: 'adminpassword123', // Will be hashed by pre-save hook
            mobile: '+919876543210',
            role: 'admin',
            isAadhaarVerified: true
        });

        await adminUser.save();
        console.log('Admin User Created Successfully!');
        console.log('Email: admin@ai-tourism.com');
        console.log('Password: adminpassword123');
        process.exit();

    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
