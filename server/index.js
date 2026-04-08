const express = require('express'); // to create express.js
const dotenv = require('dotenv'); // to load .env files
dotenv.config(); // Must be before other imports that use env vars
const path = require('path');

const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db.js');
const authRoutes = require('./routes/authRoutes.js');
const dataRoutes = require('./routes/dataRoutes.js');
const chatRoutes = require('./routes/chatRoutes.js');
const planningRoutes = require('./routes/planningRoutes.js');
const safetyRoutes = require('./routes/safetyRoutes.js');
const DangerZone = require('./models/DangerZone.js');
const notificationRoutes = require('./routes/notificationRoutes.js');

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, { // setup
    cors: {
        origin: "*", // Allow all for dev simplicity, restrict in prod
        methods: ["GET", "POST"]
    }
});

// Make io accessible to Routes/Controllers
app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/notifications', notificationRoutes);

// Helper for Distance (Haversine)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

// Socket.io Logic for Real-time Geofencing & Admin Feeds
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Join room based on role or ID for targeted messaging?
    // For now, simpler broadcast.

    socket.on('joinAdmin', () => {
        socket.join('admins');
        console.log('Admin joined notification channel');
    });

    socket.on('updateLocation', async (data) => {
        // data: { latitude, longitude, userId }
        try {
            const { latitude, longitude, userId } = data;

            // Emit location update to Admins for liveMap Tracking
            io.to('admins').emit('touristLocationUpdate', {
                id: userId || socket.id,
                name: data.name || 'Unknown Tourist',
                lat: latitude,
                lng: longitude,
                updatedAt: new Date()
            });

            // 2. Nearby Tourist Logic (Step 13)
            // ... (rest of logic)

            // BETTER: Server logic.
            // Let's assume we have an in-memory map for active users
            if (!global.activeUsers) global.activeUsers = new Map();
            global.activeUsers.set(socket.id, { userId, name: data.name, lat: latitude, lng: longitude });

            const nearbyUsers = [];
            global.activeUsers.forEach((user, id) => {
                if (id !== socket.id) { // Don't include self
                    const dist = getDistanceFromLatLonInKm(latitude, longitude, user.lat, user.lng);
                    if (dist < 2) { // 2km radius
                        nearbyUsers.push({ name: user.name }); // Only share Name, NOT Location
                    }
                }
            });

            if (nearbyUsers.length > 0) {
                socket.emit('nearbyTourists', nearbyUsers);
            }


            // 3. Check for Danger Zones
            // Optimization: Find zones within 5km, then strict check
            const nearbyZones = await DangerZone.find({
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [longitude, latitude] },
                        $maxDistance: 5000
                    }
                }
            });

            let inDanger = false;
            for (const zone of nearbyZones) {
                const distance = getDistanceFromLatLonInKm(latitude, longitude, zone.location.coordinates[1], zone.location.coordinates[0]) * 1000;
                if (distance <= zone.radius) {

                    // Emit Warning to Tourist
                    socket.emit('dangerAlert', {
                        message: `WARNING: You have entered ${zone.name}`,
                        severity: zone.severity,
                        description: zone.description
                    });

                    // Emit Alert to Admins
                    io.to('admins').emit('adminAlert', {
                        message: `Tourist ${data.name || userId} entered ${zone.name}`,
                        location: { lat: latitude, lng: longitude },
                        timestamp: new Date(),
                        type: 'danger'
                    });

                    inDanger = true;
                    // We might not break here if we want to valid multiple zones, 
                    // but usually one alert is enough effectively.
                    break;
                }
            }

            // Update status on map
            io.to('admins').emit('touristStatusUpdate', {
                id: userId || socket.id,
                status: inDanger ? 'warning' : 'safe'
            });

        } catch (error) {
            console.error('Socket Geo Error:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
        if (global.activeUsers) global.activeUsers.delete(socket.id);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} 🚀`);
});
// Server restart trigger
