import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Router hooks
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, CloudRain, Bell, X, Sun, Cloud, AlertTriangle, Mail, Smartphone, CheckCircle, Copy, Lock
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

// Imported Components
import Sidebar from '../components/admin/Sidebar';
import StatCards from '../components/admin/StatCards';
import LiveMap from '../components/admin/LiveMap';
import ManagementTables from '../components/admin/ManagementTables';
import AddEntryModal from '../components/admin/AddEntryModal';
import DestinationsGrid from '../components/admin/DestinationsGrid';
import UserModal from '../components/admin/UserModal';
import LoadingSpinner from '../components/LoadingSpinner';



const AdminDashboard = () => {
    const { user, logout } = useAuth();

    // Sync 2FA state from user profile
    useEffect(() => {
        if (user) {
            setIs2FAEnabled(user.isTwoFactorEnabled);
        }
    }, [user]);

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Initialize from URL or default
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');

    // Sync state with URL if URL changes (e.g. back button)
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // Handler to update URL when tab is selected
    const handleSetTab = (tab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    // Stats & Data
    const [stats, setStats] = useState({ users: 0, destinations: 0, zones: 0, alerts: 0 });
    const [weather, setWeather] = useState({ temp: '--', condition: 'Loading...', code: 0 });

    // UI States
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addModalType, setAddModalType] = useState('destination');
    const [isSimulating, setIsSimulating] = useState(false);

    // Form States
    const [destName, setDestName] = useState('');
    const [destDesc, setDestDesc] = useState('');
    const [modalLat, setModalLat] = useState(20.5937); // Default Center
    const [modalLng, setModalLng] = useState(78.9629);

    const [zoneName, setZoneName] = useState('');
    const [zoneDesc, setZoneDesc] = useState('');
    const [zoneRadius, setZoneRadius] = useState(1000);

    const [editingId, setEditingId] = useState(null);

    // User Management States
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Dynamic Image State
    const [destImages, setDestImages] = useState([]);
    const [destOccupancy, setDestOccupancy] = useState('');

    // Live Data Lists
    const [activeTourists, setActiveTourists] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [destinationsList, setDestinationsList] = useState([]);
    const [zonesList, setZonesList] = useState([]);
    const [bookingsList, setBookingsList] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [msgModalOpen, setMsgModalOpen] = useState(false);
    const [msgData, setMsgData] = useState({ userId: '', name: '', message: '' });
    const [socket, setSocket] = useState(null);
    const [sendingMsg, setSendingMsg] = useState(false);

    // Settings & 2FA State
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [twoFASecret, setTwoFASecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [is2FAEnabled, setIs2FAEnabled] = useState(user?.isTwoFactorEnabled || false);

    // Filtered Lists
    const filteredUsers = usersList.filter(u => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (u.name && u.name.toLowerCase().includes(term)) ||
            (u.email && u.email.toLowerCase().includes(term)) ||
            (u.mobile && u.mobile.includes(term)) ||
            (u.touristId && u.touristId.toLowerCase().includes(term))
        );
    });

    // Init Data & Weather
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch All Data
                const [u, d, z, b] = await Promise.all([
                    api.get('/auth/users'),
                    api.get('/data/destinations'),
                    api.get('/data/danger-zones'),
                    api.get('/planning/bookings')
                ]);

                setUsersList(u.data);
                setDestinationsList(d.data);
                setZonesList(z.data);
                setBookingsList(b.data || []);

                setStats({
                    users: u.data.length,
                    destinations: d.data.length,
                    zones: z.data.length,
                    alerts: alerts.length
                });

                // Fetch Weather (Open-Meteo)
                const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=28.61&longitude=77.20&current=temperature_2m,weather_code&timezone=auto');
                const weatherData = await weatherRes.json();
                const code = weatherData.current.weather_code;
                let condition = 'Clear';
                if (code > 3) condition = 'Cloudy';
                if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) condition = 'Rainy';

                setWeather({
                    temp: weatherData.current.temperature_2m,
                    condition,
                    code
                });

            } catch (error) {
                console.error("Init Error:", error);
            }
        };
        fetchData();
    }, [alerts.length]); // Re-run stats update when alerts change

    // Socket Init
    useEffect(() => {
        const newSocket = io();
        setSocket(newSocket);
        newSocket.emit('joinAdmin');

        newSocket.on('touristLocationUpdate', (data) => {
            setActiveTourists(prev => {
                const index = prev.findIndex(t => t.id === data.id);
                if (index >= 0) {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], ...data };
                    return updated;
                } else return [...prev, { ...data, status: 'safe' }];
            });
        });

        newSocket.on('touristStatusUpdate', ({ id, status }) => {
            setActiveTourists(prev => prev.map(t => t.id === id ? { ...t, status } : t));
        });

        newSocket.on('adminAlert', (alert) => {
            setAlerts(prev => [{ id: Date.now(), ...alert }, ...prev]);
            // Don't modify stats here directly, let useEffect handle it or separate state
            toast.custom((t) => (
                <div className="bg-white border-l-4 border-rose-500 p-4 rounded shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2">
                    <AlertTriangle className="text-rose-500" />
                    <div>
                        <p className="font-bold text-slate-800">New Alert!</p>
                        <p className="text-sm">{ alert.message }</p>
                    </div>
                </div>
            ));
            new Audio('/alert.mp3').play().catch(e => { });
        });

        return () => newSocket.disconnect();
    }, []);

    // Simulation Logic
    useEffect(() => {
        if (!isSimulating) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const mockTourists = [
                { id: 'sim1', name: 'Sim User 1', lat: 20.5937 + Math.sin(now / 1000) * 0.1, lng: 78.9629 + Math.cos(now / 1000) * 0.1, status: 'safe' },
                { id: 'sim2', name: 'Sim User 2', lat: 21.0000 + Math.cos(now / 2000) * 0.1, lng: 79.5000 + Math.sin(now / 2000) * 0.1, status: 'warning' },
                { id: 'sim3', name: 'Sim User 3', lat: 19.5000 + Math.sin(now / 1500) * 0.1, lng: 77.5000 + Math.cos(now / 1500) * 0.1, status: 'safe' },
            ];

            mockTourists.forEach(t => {
                setActiveTourists(prev => {
                    const index = prev.findIndex(prevT => prevT.id === t.id);
                    if (index >= 0) {
                        const updated = [...prev];
                        updated[index] = { ...t };
                        return updated;
                    }
                    return [...prev, t];
                });
            });

            if (Math.random() < 0.1) {
                const newAlert = { id: now, message: `Simulated Alert: User entered buffer zone`, type: 'danger' };
                setAlerts(prev => [newAlert, ...prev]);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isSimulating]);

    const handleAddDestination = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: destName,
                description: destDesc,
                location: { coordinates: [parseFloat(modalLng), parseFloat(modalLat)] },
                latitude: parseFloat(modalLat),
                longitude: parseFloat(modalLng),
                category: 'General',
                priceLevel: 'mid-range',
                occupancy: parseInt(destOccupancy) || 0,
                images: destImages.length > 0 ? destImages : ['https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop']
            };

            if (editingId) {
                await api.put(`/data/destinations/${editingId}`, payload);
                toast.success('Destination Updated!');
            } else {
                await api.post('/data/destinations', payload);
                toast.success('Destination Added!');
            }
            setShowAddModal(false);
            setDestName(''); setDestDesc(''); setDestImages([]); setDestOccupancy('');
            // Refresh
            const res = await api.get('/data/destinations');
            setDestinationsList(res.data);
            setStats(prev => ({ ...prev, destinations: res.data.length }));
        } catch (error) {
            toast.error('Submission failed');
        }
    };

    const handleEditUser = async (formData, id) => {
        try {
            await api.put(`/auth/users/${id}`, formData);
            toast.success('User updated successfully');
            setShowUserModal(false);
            setEditingUser(null);
            const res = await api.get('/auth/users');
            setUsersList(res.data);
            setStats(prev => ({ ...prev, users: res.data.length }));
        } catch (error) {
            console.error(error);
            toast.error('Failed to update user');
        }
    };

    const handleInitiateRegister = async (formData) => {
        try {
            const res = await api.post('/auth/register', formData);
            toast.success(res.data.message || 'OTP Sent to email');
            return res.data.registrationToken;
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to initiate registration');
            return null;
        }
    };

    const handleCompleteRegister = async (otp, token) => {
        try {
            const res = await api.post('/auth/complete-registration', { otp, registrationToken: token });
            toast.success('User registered successfully');
            setShowUserModal(false);
            setEditingUser(null);
            // Refresh users
            const usersRes = await api.get('/auth/users');
            setUsersList(usersRes.data);
            setStats(prev => ({ ...prev, users: usersRes.data.length }));
            return res.data; // Return user data (specifically _id)
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Verification failed');
            return null;
        }
    };

    const handleAddZone = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: zoneName,
                description: zoneDesc,
                location: { coordinates: [parseFloat(modalLng), parseFloat(modalLat)] },
                latitude: parseFloat(modalLat),
                longitude: parseFloat(modalLng),
                radius: parseInt(zoneRadius),
                severity: 'high'
            };

            if (editingId) {
                await api.put(`/data/danger-zones/${editingId}`, payload);
                toast.success('Zone Updated!');
            } else {
                await api.post('/data/danger-zones', payload);
                toast.success('Danger Zone Active!');
            }

            setShowAddModal(false);
            setZoneName(''); setZoneDesc(''); setEditingId(null);
            // Refresh
            const res = await api.get('/data/danger-zones');
            setZonesList(res.data);
            setStats(prev => ({ ...prev, zones: res.data.length }));
        } catch (error) {
            toast.error('Submission failed');
        }
    };

    const handleEditZone = (item, type) => {
        if (type === 'block') {
            handleToggleBlock(item._id);
            return;
        }

        // Check if it is a zone or user edit (though users are handled via onUserClick usually, but prompt asked for Edit button)
        // If the item has radius, it's a zone.
        if (item.radius || type === 'zone') {
            const zone = item;
            setEditingId(zone._id);
            setZoneName(zone.name);
            setZoneDesc(zone.description || '');
            setZoneRadius(zone.radius || 1000);
            // Handle location safe access
            const lng = zone.location?.coordinates?.[0] || zone.longitude;
            const lat = zone.location?.coordinates?.[1] || zone.latitude;
            setModalLat(lat);
            setModalLng(lng);
            setAddModalType('zone');
            setShowAddModal(true);
        } else {
            // Might be a user edit, handled by user modal
        }
    };

    const handleEditDestination = (dest) => {
        setEditingId(dest._id);
        setDestName(dest.name);
        setDestDesc(dest.description);
        setModalLat(dest.location?.coordinates?.[1] || 0);
        setModalLng(dest.location?.coordinates?.[0] || 0);
        setDestImages(dest.images && dest.images.length > 0 ? dest.images : []);
        setDestOccupancy(dest.occupancy || '');
        setAddModalType('destination');
        setShowAddModal(true);
    };

    const handleDeleteDestination = async (id) => {
        if (!window.confirm("Are you sure you want to delete this destination?")) return;
        try {
            await api.delete(`/data/destinations/${id}`);
            toast.success('Destination Deleted');
            const res = await api.get('/data/destinations');
            setDestinationsList(res.data);
            setStats(prev => ({ ...prev, destinations: res.data.length }));
        } catch (error) {
            toast.error('Failed to delete destination');
        }
    };

    const handleDeleteZone = async (id, type) => {
        if (type === 'user') {
            if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
            try {
                await api.delete(`/auth/users/${id}`);
                toast.success('User deleted');
                const res = await api.get('/auth/users');
                setUsersList(res.data);
                setStats(prev => ({ ...prev, users: res.data.length }));
            } catch (error) {
                toast.error('Failed to delete user');
            }
            return;
        }

        if (!window.confirm("Are you sure you want to satisfy the deletion of this restricted perimeter?")) return;
        try {
            await api.delete(`/data/danger-zones/${id}`);
            toast.success('Zone Removed');
            const res = await api.get('/data/danger-zones');
            setZonesList(res.data);
            setStats(prev => ({ ...prev, zones: res.data.length }));
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const handleToggleBlock = async (id) => {
        if (!window.confirm("Change user access?")) return;
        try {
            await api.put(`/auth/users/${id}/block`);
            toast.success('Updated');
            const res = await api.get('/auth/users');
            setUsersList(res.data);
        } catch (e) { toast.error('Error'); }
    };



    const handleDeleteBooking = async (id) => {
        if (!window.confirm("Delete this itinerary?")) return;
        try {
            await api.delete(`/planning/${id}`);
            toast.success("Booking deleted");
            const res = await api.get('/planning/bookings');
            setBookingsList(res.data);
        } catch (e) { toast.error("Error deleting"); }
    };

    const handleSendMessage = async () => {
        if (!msgData.message) return toast.error("Enter a message");
        setSendingMsg(true);
        try {
            await api.post('/notifications', {
                userId: msgData.userId,
                message: msgData.message,
                type: 'info'
            });
            toast.success('Message sent to User & Email');
            setMsgModalOpen(false);
            setMsgData({ userId: '', name: '', message: '' });
        } catch (e) { toast.error('Failed to send'); }
        finally { setSendingMsg(false); }
    };


    const handleClearAlerts = () => {
        setAlerts([]);
        // Stats update will happen via useEffect dependent on alerts.length or manually here
        setStats(prev => ({ ...prev, alerts: 0 }));
    };

    const handleUpdateStatus = async (id, status, type) => {
        try {
            if (type === 'user') {
                await api.put(`/auth/users/${id}/verification`, { status });
                toast.success(`User verification ${status}`);
                const res = await api.get('/auth/users');
                setUsersList(res.data);
            } else {
                await api.put(`/planning/${id}/status`, { status });
                toast.success(`Booking ${status}`);
                const res = await api.get('/planning/bookings');
                setBookingsList(res.data);
            }
        } catch (e) {
            toast.error('Status update failed');
        }
    };

    // 2FA Handlers
    const handleEnable2FA = async () => {
        try {
            const res = await api.post('/auth/2fa/generate');
            setQrCodeUrl(res.data.qrCodeUrl);
            setTwoFASecret(res.data.secret);
            setShow2FAModal(true);
        } catch (error) {
            toast.error('Failed to generate 2FA');
        }
    };

    const handleVerify2FA = async () => {
        try {
            await api.post('/auth/2fa/verify', { token: verificationCode });
            toast.success('2FA Enabled Successfully');
            setIs2FAEnabled(true);
            setShow2FAModal(false);
            setVerificationCode('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid Code');
        }
    };

    const handleDisable2FA = async () => {
        if (!window.confirm("Are you sure you want to disable 2FA? This will reduce account security.")) return;
        try {
            await api.post('/auth/2fa/disable');
            toast.success('2FA Disabled');
            setIs2FAEnabled(false);
        } catch (error) {
            toast.error('Failed to disable 2FA');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* SIDEBAR */ }
            <Sidebar activeTab={ activeTab } setActiveTab={ handleSetTab } user={ user } logout={ logout } />

            {/* MAIN CONTENT */ }
            <main className="flex-1 ml-64 min-h-screen flex flex-col relative">
                {/* HEADER */ }
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
                    <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2 w-96 group focus-within:ring-2 focus-within:ring-teal-100 transition-all">
                        <Search size={ 16 } className="text-slate-400 mr-2" />
                        <input
                            placeholder="Search by name, email, phone or ID..."
                            value={ searchTerm }
                            onChange={ (e) => setSearchTerm(e.target.value) }
                            className="bg-transparent text-sm w-full outline-none text-slate-700 font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Weather Widget */ }
                        <div className={ `hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-colors ${weather.condition === 'Rainy' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-teal-50 text-teal-700 border-teal-200'}` }>
                            { weather.condition === 'Rainy' ? <CloudRain size={ 14 } /> : weather.condition === 'Cloudy' ? <Cloud size={ 14 } /> : <Sun size={ 14 } /> }
                            <span>{ weather.condition }: { weather.temp }°C</span>
                        </div>

                        {/* Notifications */ }
                        <div className="relative">
                            <button onClick={ () => setShowNotifications(!showNotifications) } className="relative w-9 h-9 rounded-full hover:bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-500 transition">
                                <Bell size={ 18 } />
                                { (alerts.length > 0) && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-bounce shadow-sm"></span> }
                            </button>
                            { showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 z-50">
                                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between"><h4 className="font-bold text-xs uppercase text-slate-500">Notifications</h4><button onClick={ handleClearAlerts } className="text-[10px] text-teal-600 font-bold hover:underline">Clear All</button></div>
                                    <div className="max-h-64 overflow-y-auto">
                                        { alerts.length === 0 ? <div className="p-8 text-center text-slate-400 text-xs">No alerts</div> : alerts.map((a, i) => (
                                            <div key={ i } className="p-3 border-b border-slate-50 hover:bg-slate-50 flex gap-3">
                                                <div className={ `mt-1 w-2 h-2 rounded-full flex-shrink-0 ${a.type === 'danger' ? 'bg-rose-500' : 'bg-teal-500'}` }></div>
                                                <div><p className="text-sm font-bold text-slate-800">{ a.message }</p><p className="text-[10px] text-slate-400">{ new Date(a.id).toLocaleTimeString() }</p></div>
                                            </div>
                                        )) }
                                    </div>
                                </div>
                            ) }
                        </div>

                        {/* Add Button */ }
                        <button onClick={ () => setShowAddModal(true) } className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-200 active:scale-95 transition">
                            <Plus size={ 16 } strokeWidth={ 3 } /> Add Entry
                        </button>
                    </div>
                </header>

                <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                    {/* STATS */ }
                    { activeTab === 'dashboard' && (
                        <div className="space-y-6">
                            <StatCards stats={ stats } />
                            <LiveMap
                                activeTourists={ activeTourists }
                                usersList={ usersList }
                                destinations={ destinationsList }
                                zones={ zonesList }
                                alerts={ alerts }
                                isSimulating={ isSimulating }
                                setIsSimulating={ setIsSimulating }
                                showControls={ false }
                            />
                        </div>
                    ) }

                    {/* DASHBOARD COMPONENT */ }
                    { activeTab === 'safety' && (
                        <LiveMap
                            activeTourists={ activeTourists }
                            usersList={ usersList }
                            destinations={ destinationsList }
                            zones={ zonesList }
                            alerts={ alerts }
                            isSimulating={ isSimulating }
                            setIsSimulating={ setIsSimulating }
                            showControls={ true }
                        />
                    ) }

                    {/* SETTINGS COMPONENT */ }
                    { activeTab === 'settings' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                    <Lock className="text-teal-600" /> Security Settings
                                </h2>

                                <div className="flex items-start justify-between p-6 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex gap-4">
                                        <div className={ `w-12 h-12 rounded-full flex items-center justify-center ${is2FAEnabled ? 'bg-teal-100 text-teal-600' : 'bg-slate-200 text-slate-500'}` }>
                                            <Smartphone size={ 24 } />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800">Two-Factor Authentication (2FA)</h3>
                                            <p className="text-slate-500 text-sm mt-1 max-w-md">
                                                Protect your admin account by requiring a verification code from a mobile app (Google Authenticator, Microsoft Authenticator) each time you log in.
                                            </p>
                                            <div className="mt-3 flex items-center gap-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status:</span>
                                                { is2FAEnabled ? (
                                                    <span className="flex items-center gap-1 text-teal-600 font-bold text-sm bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                                                        <CheckCircle size={ 14 } /> Enabled
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 font-bold text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                        Disabled
                                                    </span>
                                                ) }
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        { is2FAEnabled ? (
                                            <button
                                                onClick={ handleDisable2FA }
                                                className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-red-600 hover:border-red-200 transition-all"
                                            >
                                                Disable 2FA
                                            </button>
                                        ) : (
                                            <button
                                                onClick={ handleEnable2FA }
                                                className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                            >
                                                Enable 2FA Authentication
                                            </button>
                                        ) }
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) }

                    {/* DESTINATIONS GRID */ }
                    { activeTab === 'destinations' && (
                        <DestinationsGrid
                            destinations={ destinationsList }
                            onDeleteSpot={ handleDeleteDestination }
                            onEditSpot={ handleEditDestination }
                            onAddSpot={ () => {
                                setAddModalType('destination');
                                setEditingId(null); // Clear editing state
                                setDestName(''); setDestDesc(''); setDestImages([]);
                                setShowAddModal(true);
                            } }
                        />
                    ) }

                    {/* MANAGEMENT TABLES (Users, Danger Zones, Bookings) */ }
                    { ['users', 'danger-zones', 'bookings'].includes(activeTab) && (
                        <ManagementTables
                            activeTab={ activeTab }
                            usersList={ filteredUsers }
                            destinationsList={ destinationsList }
                            zonesList={ zonesList }
                            bookingsList={ bookingsList }
                            alerts={ alerts }
                            onUserClick={ (u) => { setEditingUser(u); setShowUserModal(true); } }
                            onEditZone={ handleEditZone }
                            onDeleteZone={ handleDeleteZone }
                            onDeleteBooking={ handleDeleteBooking }
                            onUpdateStatus={ handleUpdateStatus }
                            onContactUser={ (b) => {
                                if (!b.user) return toast.error("No user attached");
                                setMsgData({ userId: b.user._id, name: b.user.name, message: '' });
                                setMsgModalOpen(true);
                            } }
                            onAddSpot={ () => {
                                if (activeTab === 'users') {
                                    setEditingUser(null);
                                    setShowUserModal(true);
                                } else {
                                    setAddModalType('zone');
                                    setShowAddModal(true);
                                }
                            } }
                        />
                    ) }
                </div>
            </main>

            {/* ADD ENTRY MODAL */ }
            <AddEntryModal
                isOpen={ showAddModal }
                onClose={ () => { setShowAddModal(false); setEditingId(null); setZoneName(''); setZoneDesc(''); setDestName(''); } }
                activeTourists={ activeTourists }
                addModalType={ addModalType }
                setAddModalType={ setAddModalType }
                handlers={ { handleAddDestination, handleAddZone } }
                formState={ { destName, destDesc, zoneName, zoneDesc, zoneRadius, modalLat, modalLng, destImages, destOccupancy } }
                setters={ { setDestName, setDestDesc, setZoneName, setZoneDesc, setZoneRadius, setModalLat, setModalLng, setDestImages, setDestOccupancy } }
                isEditing={ !!editingId }
            />

            {/* USER DETAIL MODAL (Replaced by UserModal mostly, but keeping for reference or if View Only needed by some other part) */ }
            {/* We use UserModal for Add/Edit now. setSelectedUser is less used unless we want a readonly view. 
                 But onUserClick now opens UserModal.
                 We can keep this if selectedUser is set elsewhere, but we updated onUserClick to setEditingUser.
                 Lets keep selectedUser logic for safety if needed, or remove it.
                 I'll leave it but it might not be triggered if I changed onUserClick.
             */}
            <UserModal
                isOpen={ showUserModal }
                onClose={ () => { setShowUserModal(false); setEditingUser(null); } }
                onEdit={ handleEditUser }
                onRegister={ handleInitiateRegister }
                onVerify={ handleCompleteRegister }
                user={ editingUser }
            />

            {/* SEND MESSAGE MODAL */ }
            { msgModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        {/* Header Gradient */ }
                        <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
                            <button
                                onClick={ () => setMsgModalOpen(false) }
                                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition backdrop-blur-md"
                            >
                                <X size={ 20 } />
                            </button>
                            <div className="absolute -bottom-8 left-8">
                                <div className="w-16 h-16 bg-white rounded-2xl p-1 shadow-lg">
                                    <div className="w-full h-full bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-2xl border border-indigo-100 uppercase">
                                        { msgData.name?.charAt(0) || 'U' }
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-12 px-8 pb-8">
                            <div className="mb-6">
                                <h3 className="text-2xl font-black text-slate-800 leading-tight">Contact User</h3>
                                <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
                                    Sending message to <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-sm border border-indigo-100">{ msgData.name }</span>
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="relative group">
                                    <textarea
                                        value={ msgData.message }
                                        onChange={ (e) => setMsgData({ ...msgData, message: e.target.value }) }
                                        placeholder="Type your message here..."
                                        className="w-full h-40 p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 resize-none font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                                    ></textarea>
                                    <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400 pointer-events-none group-focus-within:text-indigo-500">
                                        { msgData.message.length } chars
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={ () => setMsgModalOpen(false) }
                                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={ handleSendMessage }
                                        disabled={ sendingMsg }
                                        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        { sendingMsg ? <LoadingSpinner size={ 18 } color="border-white" /> : <Mail size={ 18 } strokeWidth={ 2.5 } /> }
                                        { sendingMsg ? 'Sending...' : 'Send Message' }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) }

            { selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between mb-4"><h3 className="font-bold">{ selectedUser.name }</h3><button onClick={ () => setSelectedUser(null) }><X size={ 16 } /></button></div>
                        <div className="space-y-2 mb-4">
                            <p className="text-sm"><strong>Email:</strong> { selectedUser.email }</p>
                            <p className="text-sm"><strong>Verified:</strong> { selectedUser.isAadhaarVerified ? 'Yes' : 'No' }</p>
                        </div>
                        <button onClick={ () => handleToggleBlock(selectedUser._id) } className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold">Toggle Block Status</button>
                    </div>
                </div>
            )
            }

            {/* 2FA SETUP MODAL */ }
            <AnimatePresence>
                { show2FAModal && (
                    <motion.div
                        initial={ { opacity: 0 } } animate={ { opacity: 1 } } exit={ { opacity: 0 } }
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={ { scale: 0.95, opacity: 0 } } animate={ { scale: 1, opacity: 1 } } exit={ { scale: 0.95, opacity: 0 } }
                            className="bg-slate-900 text-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden border border-slate-700"
                        >
                            <div className="p-8 flex flex-col items-center text-center">
                                <h3 className="text-2xl font-bold mb-2">Scan QR Code</h3>
                                <p className="text-slate-400 text-sm mb-6">
                                    Open your authenticator app (Google Authenticator, Microsoft Authenticator) and scan this QR code.
                                </p>

                                <div className="bg-white p-4 rounded-2xl mb-6 shadow-lg shadow-black/20">
                                    { qrCodeUrl ? (
                                        <img src={ qrCodeUrl } alt="2FA QR Code" className="w-48 h-48 object-contain" />
                                    ) : (
                                        <div className="w-48 h-48 flex items-center justify-center text-slate-400">Loading...</div>
                                    ) }
                                </div>

                                <div className="w-full mb-6">
                                    <p className="text-slate-500 text-xs mb-2">Can't scan? Enter this code manually:</p>
                                    <div className="flex items-center justify-center gap-2 bg-slate-800 rounded-lg p-2 border border-slate-700 font-mono text-amber-500 font-bold tracking-wider relative group cursor-pointer"
                                        onClick={ () => { navigator.clipboard.writeText(twoFASecret); toast.success('Secret copied!'); } }>
                                        { twoFASecret }
                                        <Copy size={ 14 } className="text-slate-500 group-hover:text-white transition-colors" />
                                    </div>
                                </div>

                                <div className="w-full space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Enter Verification Code</label>
                                        <input
                                            type="text"
                                            value={ verificationCode }
                                            onChange={ (e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6)) }
                                            placeholder="000000"
                                            className="w-full text-center text-2xl tracking-[0.5em] font-bold bg-slate-800 border-2 border-slate-700 rounded-xl py-3 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-white placeholder:text-slate-600"
                                        />
                                    </div>

                                    <button
                                        onClick={ handleVerify2FA }
                                        disabled={ verificationCode.length !== 6 }
                                        className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                    >
                                        Verify
                                    </button>

                                    <button
                                        onClick={ () => setShow2FAModal(false) }
                                        className="text-slate-400 hover:text-white text-sm font-bold transition-colors"
                                    >
                                        Cancel Setup
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                ) }
            </AnimatePresence>

        </div>
    );
};

export default AdminDashboard;
