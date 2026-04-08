import ChatWidget from '../components/ChatWidget';
import { Bot } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import { MapPin, Navigation, AlertTriangle, MessageSquare, User, LogOut, Sun, Moon, Compass, Send, Shield, Info, Star, X, Users, ArrowRight, Bell, Check, Trash2, Calendar, Search, Link, CheckCircle, Upload, Globe, Map } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import 'leaflet/dist/leaflet.css';
import LoadingSpinner from '../components/LoadingSpinner';


// Fix Leaflet Icons
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
// Custom Icons
const UserIcon = L.divIcon({
    className: 'bg-transparent',
    html: `<div style="
        background-color: #4f46e5; 
        width: 24px; 
        height: 24px; 
        border-radius: 50%; 
        border: 4px solid white; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const DangerIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/10308/10308979.png', iconSize: [35, 35] });

// Map Recenter Component
const RecenterMap = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) map.flyTo([lat, lng], 15);
    }, [lat, lng]);
    return null;
};

const Dashboard = () => {
    const { user, logout, submitVerification } = useAuth();

    // URL based Tabs
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'plan';

    const setActiveTab = (tab) => {
        setSearchParams({ tab });
    };

    // Planner State
    const [planData, setPlanData] = useState({ destination: '', days: 3, budget: 10000, preferences: [] });
    const [isCustomDestination, setIsCustomDestination] = useState(false);
    const [itinerary, setItinerary] = useState(null);
    const [generating, setGenerating] = useState(false);

    // Map & Safety State
    const [gpsEnabled, setGpsEnabled] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [dangerZones, setDangerZones] = useState([]);
    const [activeAlert, setActiveAlert] = useState(null);
    const [nearbyTourists, setNearbyTourists] = useState([]);
    const [allDestinations, setAllDestinations] = useState([]);
    const [filteredDestinations, setFilteredDestinations] = useState([]);

    // Map Search State
    const [mapSearchQuery, setMapSearchQuery] = useState("");
    const [mapSearchedLocation, setMapSearchedLocation] = useState(null);
    const [isSearchingMap, setIsSearchingMap] = useState(false);
    const [mapSearchResults, setMapSearchResults] = useState([]);
    const [showMapDropdown, setShowMapDropdown] = useState(false);
    const searchRef = useRef(null);

    // Auto-Close: Handle Click Outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowMapDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Advanced Search Algorithm: Debounce & Regex
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (mapSearchQuery.length > 2) {
                performAdvancedSearch();
            } else {
                setMapSearchResults([]);
            }
        }, 500); // 500ms Debounce

        return () => clearTimeout(delayDebounceFn);
    }, [mapSearchQuery]);

    const performAdvancedSearch = async (queryOverride = null) => {
        const query = typeof queryOverride === 'string' ? queryOverride : mapSearchQuery;

        setIsSearchingMap(true);
        try {
            // Algorithm 1: Coordinate Detection (Regex)
            // Detects formats like: "17.4, 78.5" or "17.4 78.5"
            const coordRegex = /^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/;
            const coordMatch = query.trim().match(coordRegex);

            if (coordMatch) {
                const lat = parseFloat(coordMatch[1]);
                const lng = parseFloat(coordMatch[3]);
                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    setMapSearchResults([{
                        lat: lat,
                        lon: lng,
                        display_name: `Coordinate Location: ${lat}, ${lng}`,
                        type: 'coordinate',
                        class: 'latlng'
                    }]);
                    setIsSearchingMap(false);
                    return;
                }
            }

            // Algorithm 2: Pincode Heuristic
            // If 6 digits, prioritize partial match or structured query
            let queryUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;

            // Fetch Data
            const response = await fetch(queryUrl);
            const data = await response.json();
            setMapSearchResults(data);
            if (data.length > 0) setShowMapDropdown(true);

        } catch (error) {
            console.error("Advanced search error:", error);
        } finally {
            setIsSearchingMap(false);
        }
    };

    const handleManualSearchSubmit = (e) => {
        e.preventDefault();
        // Force immediate search if user hits Enter
        if (mapSearchQuery.length > 0) performAdvancedSearch();
    };

    const selectLocation = (result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setMapSearchedLocation({ lat, lng, name: result.display_name });
        setMapSearchQuery(result.display_name); // Update input text
        setShowMapDropdown(false); // Close dropdown nicely
        toast.success("Location locked!", { icon: '🎯' });
    };

    const [isSatellite, setIsSatellite] = useState(false);

    // Chat State
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([{ role: "model", text: "Hello! I'm your AI Travel Guide. How can I help you today?" }]);
    const [chatInput, setChatInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    // Feedback State
    const [showFeedback, setShowFeedback] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotifs, setShowNotifs] = useState(false);
    const [rating, setRating] = useState(5);
    const [myTrips, setMyTrips] = useState([]);

    // Identity Verification State
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [aadhaarInput, setAadhaarInput] = useState('');
    const [docLink, setDocLink] = useState('');
    const [docFile, setDocFile] = useState(''); // New: Stores Base64 string
    const [verifying, setVerifying] = useState(false);

    const fetchMyTrips = async () => {
        try {
            const { data } = await api.get('/planning/my-itineraries');
            setMyTrips(data);
        } catch (e) { }
    };


    // Booking Logic
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [bookForm, setBookForm] = useState({ name: '', email: '', phone: '', whatsapp: '', budget: '', travelStyle: [], aadhaarLink: '', aadhaarFile: '' });
    const [styleSearch, setStyleSearch] = useState('');
    const [submittingBook, setSubmittingBook] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);


    useEffect(() => {
        if (user) setBookForm(prev => ({ ...prev, name: user.name || '', email: user.email || '', phone: user.mobile || '' }));
    }, [user]);

    useEffect(() => {
        if (activeTab === 'trips') fetchMyTrips();
    }, [activeTab]);

    const [bookingItineraryId, setBookingItineraryId] = useState(null);

    const handleBookClick = (dest, itineraryId = null) => {
        // Allow proceeding if Verified OR Pending (just submitted)
        if (!user?.isAadhaarVerified && user?.verificationStatus !== 'pending') {
            toast.error("Please verify your Aadhaar Identity to proceed with booking.");
            setShowVerificationModal(true);
            return;
        }
        setSelectedPackage(dest);
        setBookingItineraryId(itineraryId); // Check source
        setBookForm(prev => ({ ...prev, budget: dest.priceLevel === 'expensive' ? 50000 : 20000 }));
        setBookingModalOpen(true);
    };

    const handleBookSubmit = async (e) => {
        e.preventDefault();
        setSubmittingBook(true);
        try {
            await api.post('/planning/enquiry', {
                destination: selectedPackage.name,
                itineraryId: bookingItineraryId, // Pass for update
                ...bookForm
            });
            toast.success("Enquiry Sent! We will contact you soon.");
            setBookingModalOpen(false);
            setBookingItineraryId(null);
            fetchMyTrips(); // Refresh list
            setActiveTab('trips'); // Redirect to see it
        } catch (e) { toast.error("Submission failed"); }
        finally { setSubmittingBook(false); }
    };


    const [comment, setComment] = useState('');

    const socketRef = useRef();

    // Init Socket & Data
    useEffect(() => {
        // Fetch Danger Zones & Destinations
        const fetchData = async () => {
            try {
                const [zonesRes, destsRes] = await Promise.all([
                    api.get('/data/danger-zones'),
                    api.get('/data/destinations')
                ]);
                setDangerZones(zonesRes.data);
                setAllDestinations(destsRes.data);
                setFilteredDestinations(destsRes.data);
            } catch (err) {
                console.error("Failed to fetch initial data", err);
            }
        };
        fetchData();

        // Connect Socket
        import('socket.io-client').then(({ io }) => {
            socketRef.current = io();

            socketRef.current.on('dangerAlert', (alert) => {
                setActiveAlert(alert);
                toast((t) => (
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-red-500 animate-pulse" />
                        <span className="font-bold text-red-600">DANGER ZONE ENTERED!</span>
                    </div>
                ), { duration: 5000, icon: '🚨' });
                // Play Sound
                new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(e => { });
            });

            socketRef.current.on('nearbyTourists', (users) => {
                setNearbyTourists(users);
                if (users.length > 0) toast.success(`${users.length} other tourists nearby!`);
            });
        });

        return () => socketRef.current?.disconnect();
    }, []);

    // GPS Tracker
    useEffect(() => {
        let watchId;
        if (gpsEnabled) {
            toast.loading("Acquiring GPS Signal...", { id: 'gps-loading' });

            if ("geolocation" in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        toast.dismiss('gps-loading');
                        const { latitude, longitude } = position.coords;
                        setUserLocation({ lat: latitude, lng: longitude });

                        // Send to Server
                        if (socketRef.current) {
                            socketRef.current.emit('updateLocation', {
                                latitude,
                                longitude,
                                userId: user?._id || 'anon',
                                name: user?.name || 'Anonymous'
                            });
                        }
                    },
                    (error) => {
                        toast.dismiss('gps-loading');
                        console.warn("GPS Warning:", error);
                        // Don't disable immediately on timeout, it might recover
                        if (error.code === 1) {
                            toast.error("GPS Permission Denied. Please enable location access.");
                            setGpsEnabled(false);
                        } else if (error.code === 2) {
                            toast.error("GPS Signal Unavailable.");
                        } else if (error.code === 3) {
                            toast.error("GPS Signal Weak. Moving outdoors may help.", { duration: 4000 });
                            // Optional: Try again with lower accuracy?
                        } else {
                            toast.error("GPS Error: " + error.message);
                        }
                    },
                    { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
                );
            } else {
                toast.dismiss('gps-loading');
                toast.error("Geolocation is not supported by this browser.");
                setGpsEnabled(false);
            }
        } else {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            setUserLocation(null);
        }
        return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
    }, [gpsEnabled, user]);

    // Handlers
    // Notifications Logic
    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data);
        } catch (error) { }
    };

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (e) { }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleGenerateItinerary = async (e) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const { data } = await api.post('/planning/generate', planData);
            setItinerary(data);
            setActiveTab('itinerary');
            toast.success("Itinerary generated successfully!");
        } catch (error) {
            toast.error("Failed to generate plan. Please try again.");
        }
        setGenerating(false);
    };

    const handleChatSubmit = async (textOrEvent) => {
        let text = chatInput;
        if (typeof textOrEvent === 'string') {
            text = textOrEvent;
        } else {
            textOrEvent?.preventDefault?.();
        }

        if (!text && !text.trim()) return;

        const userMsg = { role: "user", text: text };
        setMessages(prev => [...prev, userMsg]);
        setChatInput("");
        setIsTyping(true);

        try {
            const { data } = await api.post('/chat', {
                message: text,
                userInfo: {
                    name: user?.name || "Guest",
                    email: user?.email || "Not logged in",
                    location: userLocation ? `${userLocation.lat}, ${userLocation.lng}` : "Unknown Location",
                    appliedTours: myTrips.length > 0 ? myTrips.map(t => `${t.destination} (${t.duration} days)`).join(', ') : "No active tours"
                }
            });

            // Detect Map Search Intent
            const mapSearchMatch = data.response.match(/\[SEARCH_MAP:\s*(.*?)\]/);
            let responseText = data.response;

            if (mapSearchMatch && mapSearchMatch[1]) {
                const searchLocation = mapSearchMatch[1].trim();
                console.log("Auto-Triggering Map Search:", searchLocation);

                // Remove the tag from display message for cleaner UI
                responseText = responseText.replace(mapSearchMatch[0], '').trim();

                // Trigger Actions
                setActiveTab('map');
                setMapSearchQuery(searchLocation);

                // Allow state to settle slightly or call directly
                setTimeout(() => {
                    performAdvancedSearch(searchLocation);
                }, 500);
            }

            setMessages(prev => [...prev, { role: "model", text: responseText }]);
        } catch (error) {
            console.error("Chat API Error:", error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || "Sorry, I'm having trouble connecting right now.";
            setMessages(prev => [...prev, { role: "model", text: errorMsg }]);
        }
        setIsTyping(false);
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        setSubmittingFeedback(true);
        try {
            await api.post('/data/feedback', {
                destinationName: planData.destination || 'General',
                rating,
                comment
            });
            toast.success("Feedback submitted! Thank you.");
            setShowFeedback(false);
        } catch (error) {
            toast.error("Failed to submit feedback");
        }
        finally { setSubmittingFeedback(false); }
    };


    const handleSOS = () => {
        toast.error((t) => (
            <div className="flex flex-col gap-1">
                <span className="font-bold text-lg">SOS ALERT ACTIVATED</span>
                <span className="text-sm">Emergency contacts and nearby authorities have been notified of your location.</span>
                <button onClick={ () => toast.dismiss(t.id) } className="bg-white text-red-600 px-2 py-1 rounded text-xs font-bold w-fit mt-2 border border-red-200">CANCEL ALERT</button>
            </div>
        ), { duration: 10000, icon: '🚨', style: { border: '2px solid #ef4444', color: '#b91c1c', background: '#fef2f2' } });

        // Emit Socket Event
        if (socketRef.current && userLocation) {
            socketRef.current.emit('sosSignal', { location: userLocation, user: user });
        }
    };

    const handleVerificationSubmit = async (e) => {
        e.preventDefault();
        setVerifying(true);
        try {
            if (!docLink && !docFile) {
                toast.error("Please provide a Document Link or Upload a File");
                setVerifying(false);
                return;
            }

            await submitVerification(aadhaarInput, docLink, docFile);
            toast.success("Verification Submitted! Admin will review shortly.");
            setShowVerificationModal(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Submission failed");
        } finally {
            setVerifying(false);
        }
    };

    const handleMapSearch = async (e) => {
        e.preventDefault();
        if (!mapSearchQuery.trim()) return;

        setIsSearchingMap(true);
        setMapSearchResults([]); // Clear previous results
        try {
            // Using OpenStreetMap Nominatim API for geocoding with granular address details
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&addressdetails=1&limit=5`);
            const data = await response.json();

            if (data && data.length > 0) {
                setMapSearchResults(data);
                // Auto-select first result for convenience, but keep list available
                const { lat, lon, display_name } = data[0];
                setMapSearchedLocation({ lat: parseFloat(lat), lng: parseFloat(lon), name: display_name });
                toast.success("Location found!", { icon: '📍' });
            } else {
                toast.error("Location not found");
            }
        } catch (error) {
            console.error("Map search error:", error);
            toast.error("Search failed. Please try again.");
        } finally {
            setIsSearchingMap(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 relative font-sans">
            {/* DANGER ZONE TOP ALERT POPUP */ }
            <AnimatePresence>
                { activeAlert && (
                    <motion.div
                        initial={ { y: -100, opacity: 0 } }
                        animate={ { y: 0, opacity: 1 } }
                        exit={ { y: -100, opacity: 0 } }
                        transition={ { type: 'spring', stiffness: 120, damping: 20 } }
                        className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-2xl shadow-red-500/50"
                    >
                        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-full animate-pulse">
                                    <AlertTriangle size={ 28 } strokeWidth={ 3 } />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg uppercase tracking-wider leading-none">Warning: Danger Zone</h3>
                                    <p className="font-medium text-red-50 text-sm mt-0.5">{ activeAlert.message || "You have entered a restricted high-risk area." }</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={ handleSOS }
                                    className="bg-white text-red-600 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-red-50 transition shadow-sm"
                                >
                                    SOS Signal
                                </button>
                                <button
                                    onClick={ () => setActiveAlert(null) }
                                    className="p-2 hover:bg-white/20 rounded-full transition"
                                >
                                    <X size={ 20 } />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) }
            </AnimatePresence>
            {/* Premium Floating Header */ }
            {/* Premium Floating Header */ }
            <header className="sticky top-0 z-50 w-full pointer-events-none bg-white/90 backdrop-blur-xl border-b border-white/40 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="w-[90%] md:w-[85%] max-w-[1600px] mx-auto px-6 py-3 flex justify-between items-center pointer-events-auto">

                    {/* Brand */ }
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0 transform transition hover:scale-105 hover:rotate-3">
                            <Compass size={ 22 } strokeWidth={ 2.5 } />
                        </div>
                        <h1 className="font-extrabold text-xl tracking-tight text-slate-800">
                            Tourist<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">AI</span>
                        </h1>
                    </div>

                    {/* Center Navigation - Pill Design */ }
                    <nav className="hidden lg:flex bg-slate-100/50 p-1.5 rounded-full border border-slate-100 backdrop-blur-sm absolute left-1/2 -translate-x-1/2 shadow-inner">
                        { ['plan', 'explore', 'trips', 'map'].map((tab) => (
                            <button
                                key={ tab }
                                onClick={ () => setActiveTab(tab) }
                                className={ `px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-300 ${activeTab === tab ? 'bg-white shadow-lg shadow-slate-200 text-indigo-600 scale-105' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'}` }
                            >
                                { tab === 'plan' ? 'Plan Trip' : tab === 'trips' ? 'My Trips' : tab === 'map' ? 'Live Map' : tab }
                            </button>
                        )) }
                        { itinerary && (
                            <button
                                onClick={ () => setActiveTab('itinerary') }
                                className={ `px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-300 ${activeTab === 'itinerary' ? 'bg-white shadow-lg shadow-slate-200 text-indigo-600 scale-105' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'}` }
                            >
                                Itinerary
                            </button>
                        ) }
                    </nav>

                    {/* Right Actions */ }
                    <div className="flex items-center gap-3 md:gap-5 shrink-0">
                        <button onClick={ handleSOS } className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-4 py-2 rounded-full text-xs font-black tracking-widest shadow-lg shadow-red-200 hover:shadow-red-300 transition-all active:scale-95 animate-pulse flex items-center gap-2">
                            <AlertTriangle size={ 14 } className="fill-white" /> SOS
                        </button>

                        { user && !user.isAadhaarVerified && user.verificationStatus !== 'pending' && (
                            <button onClick={ () => setShowVerificationModal(true) } className="hidden md:flex bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-full text-xs font-bold tracking-wide shadow-lg hover:-translate-y-0.5 transition-all items-center gap-2">
                                <Shield size={ 14 } /> Verify ID
                            </button>
                        ) }

                        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                        <button onClick={ () => setShowFeedback(true) } className="text-slate-400 hover:text-yellow-500 transition-colors transform hover:scale-110 active:scale-95 duration-200">
                            <Star size={ 20 } strokeWidth={ 2.5 } />
                        </button>

                        {/* Notifications */ }
                        <div className="relative">
                            <button
                                onClick={ () => setShowNotifs(!showNotifs) }
                                className={ `relative p-2 rounded-full transition-all duration-200 active:scale-95 ${showNotifs ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}` }
                            >
                                <Bell size={ 22 } strokeWidth={ 2.5 } className={ unreadCount > 0 ? "animate-wiggle" : "" } />
                                { unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                                    </span>
                                ) }
                            </button>

                            { showNotifs && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={ () => setShowNotifs(false) }></div>
                                    <div className="absolute right-0 top-14 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 ring-1 ring-black/5 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-20">
                                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                                            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Notifications</h4>
                                            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">{ unreadCount } New</span>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto scrollbar-hide">
                                            { notifications.length === 0 ? (
                                                <div className="p-10 text-center flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300"><Bell size={ 20 } /></div>
                                                    <p className="text-slate-400 text-xs font-medium">No new notifications</p>
                                                </div>
                                            ) : (
                                                notifications.map((n) => (
                                                    <div key={ n._id } className={ `p-4 border-b border-slate-50 hover:bg-slate-50 transition flex gap-3 ${!n.isRead ? 'bg-indigo-50/40' : ''}` }>
                                                        <div className={ `mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-indigo-500 shadow-sm shadow-indigo-200' : 'bg-slate-300'}` }></div>
                                                        <div className="flex-1">
                                                            <p className={ `text-sm leading-snug ${!n.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}` }>{ n.message }</p>
                                                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{ new Date(n.createdAt).toLocaleString() }</p>
                                                            { !n.isRead && (
                                                                <button onClick={ () => markAsRead(n._id) } className="mt-3 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1 w-fit">
                                                                    <Check size={ 10 } strokeWidth={ 3 } /> Mark as Read
                                                                </button>
                                                            ) }
                                                        </div>
                                                    </div>
                                                ))
                                            ) }
                                        </div>
                                    </div>
                                </>
                            ) }
                        </div>

                        <div className="relative">
                            <button
                                onClick={ () => setShowProfileMenu(!showProfileMenu) }
                                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                            >
                                <div className="hidden text-right md:block">
                                    <p className="text-xs font-bold text-slate-700 leading-none group-hover:text-indigo-600 transition-colors">{ user?.name?.split(' ')[0] || 'Guest' }</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5 group-hover:text-indigo-400 transition-colors">Tourist</p>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 p-0.5 shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 group-hover:scale-105 transition-all">
                                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                        <span className="font-black text-transparent bg-clip-text bg-gradient-to-tr from-indigo-600 to-violet-600 text-sm">
                                            { user?.name?.charAt(0).toUpperCase() || 'U' }
                                        </span>
                                    </div>
                                </div>
                            </button>

                            <AnimatePresence>
                                { showProfileMenu && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={ () => setShowProfileMenu(false) }></div>
                                        <motion.div
                                            initial={ { opacity: 0, scale: 0.95, y: 10 } }
                                            animate={ { opacity: 1, scale: 1, y: 0 } }
                                            exit={ { opacity: 0, scale: 0.95, y: 10 } }
                                            transition={ { duration: 0.2 } }
                                            className="absolute right-0 top-14 w-72 bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden origin-top-right z-50 ring-1 ring-black/5"
                                        >
                                            <div className="relative p-6 bg-gradient-to-br from-indigo-50/50 via-white/50 to-purple-50/50 border-b border-white/60 flex flex-col items-center text-center">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-white p-1 shadow-inner mb-3">
                                                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-indigo-200">
                                                        { user?.name?.charAt(0).toUpperCase() }
                                                    </div>
                                                </div>

                                                <h4 className="font-black text-slate-800 text-lg leading-tight mb-1">{ user?.name }</h4>
                                                <p className="text-xs font-bold text-slate-500 mb-0.5">{ user?.email }</p>
                                                { user?.mobile && <p className="text-[10px] font-bold text-slate-400 tracking-wide">{ user.mobile }</p> }

                                                <div className="mt-3 flex flex-wrap justify-center gap-2">
                                                    { user?.touristId && (
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 uppercase tracking-wider flex items-center gap-1">
                                                            ID: { user.touristId }
                                                        </span>
                                                    ) }

                                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-wider flex items-center gap-1">
                                                        <Shield size={ 10 } /> { user?.role || 'Tourist' }
                                                    </span>
                                                    { user?.isAadhaarVerified ? (
                                                        <span className="text-[10px] font-bold text-green-700 bg-green-100/50 px-2.5 py-1 rounded-full border border-green-100 uppercase tracking-wider flex items-center gap-1">
                                                            <CheckCircle size={ 10 } /> Verified
                                                        </span>
                                                    ) : user?.verificationStatus === 'pending' ? (
                                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/50 px-2.5 py-1 rounded-full border border-amber-100 uppercase tracking-wider flex items-center gap-1">
                                                            <Shield size={ 10 } /> Processing
                                                        </span>
                                                    ) : user?.verificationStatus === 'rejected' ? (
                                                        <button
                                                            onClick={ () => { setShowProfileMenu(false); setShowVerificationModal(true); } }
                                                            className="text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-2.5 py-1 rounded-full border border-rose-600 uppercase tracking-wider flex items-center gap-1 transition-colors shadow-sm"
                                                        >
                                                            <X size={ 10 } strokeWidth={ 4 } /> Rejected - Retry
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={ () => { setShowProfileMenu(false); setShowVerificationModal(true); } }
                                                            className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-full border border-red-500 uppercase tracking-wider flex items-center gap-1 transition-colors shadow-sm animate-pulse"
                                                        >
                                                            Verify Now!
                                                        </button>
                                                    ) }
                                                </div>
                                            </div>

                                            <div className="p-2 bg-white/50 space-y-2">
                                                <motion.button
                                                    whileHover={ { scale: 1.02 } }
                                                    whileTap={ { scale: 0.98 } }
                                                    onClick={ logout }
                                                    className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-red-600 font-bold bg-red-50/50 hover:bg-red-50 hover:shadow-sm transition-all border border-transparent hover:border-red-100"
                                                >
                                                    <LogOut size={ 18 } strokeWidth={ 2.5 } />
                                                    <span>Sign Out Account</span>
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    </>
                                ) }
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header>

            {/* Identity Verification Modal */ }
            < AnimatePresence >
                { showVerificationModal && (
                    <>
                        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm" onClick={ () => setShowVerificationModal(false) } />
                        <motion.div
                            initial={ { opacity: 0, scale: 0.95 } }
                            animate={ { opacity: 1, scale: 1 } }
                            exit={ { opacity: 0, scale: 0.95 } }
                            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl pointer-events-auto overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                                        <Shield className="text-indigo-600" /> Identity Verification
                                    </h3>
                                    <button onClick={ () => setShowVerificationModal(false) } className="p-2 hover:bg-slate-100 rounded-full transition"><X size={ 20 } className="text-slate-400" /></button>
                                </div>
                                <form onSubmit={ handleVerificationSubmit } className="p-6 space-y-6">
                                    { user?.verificationStatus === 'rejected' && (
                                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex gap-3 text-rose-800 text-sm animate-pulse">
                                            <AlertTriangle className="shrink-0 mt-0.5" size={ 18 } />
                                            <p className="font-bold">Your previous verification was rejected. Please upload a clear and valid government ID.</p>
                                        </div>
                                    ) }
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-3 text-indigo-800 text-sm">
                                        <Info className="shrink-0 mt-0.5" size={ 18 } />
                                        <p>To ensure safety for all tourists, we require government ID verification. Please provide your Aadhaar number and a link to the document.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1 ml-1">Aadhaar Number</label>
                                        <input
                                            type="text"
                                            value={ aadhaarInput }
                                            onChange={ (e) => setAadhaarInput(e.target.value.replace(/\D/g, '').slice(0, 12)) }
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                                            placeholder="XXXX XXXX XXXX"
                                            required
                                            minLength={ 12 }
                                        />
                                    </div>

                                    {/* Document Submission Options */ }
                                    <div className="space-y-4">
                                        <label className="block text-xs font-bold uppercase text-slate-500 ml-1">Identity Proof</label>

                                        {/* Option 1: URL */ }
                                        <div className="relative">
                                            <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={ 18 } />
                                            <input
                                                type="url"
                                                value={ docLink }
                                                onChange={ (e) => setDocLink(e.target.value) }
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 font-bold text-slate-800 outline-none transition focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                placeholder="Link to Google Drive / Cloud"
                                            />
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="h-px bg-slate-200 flex-1"></div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">OR</span>
                                            <div className="h-px bg-slate-200 flex-1"></div>
                                        </div>

                                        {/* Option 2: File Upload */ }
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                id="aadhaarUpload"
                                                accept=".pdf,image/*"
                                                className="hidden"
                                                onChange={ (e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        // Max 5MB
                                                        if (file.size > 5 * 1024 * 1024) {
                                                            toast.error("File size must be less than 5MB");
                                                            return;
                                                        }
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setDocFile(reader.result);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                } }
                                            />
                                            <label
                                                htmlFor="aadhaarUpload"
                                                className={ `flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${docFile ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50 text-slate-500'}` }
                                            >
                                                { docFile ? (
                                                    <>
                                                        <CheckCircle size={ 32 } className="mb-2 text-teal-500" />
                                                        <span className="text-sm font-bold">File Attached</span>
                                                        <button
                                                            type="button"
                                                            onClick={ (e) => { e.preventDefault(); setDocFile(''); } }
                                                            className="mt-2 text-[10px] font-bold bg-white px-2 py-1 rounded shadow-sm hover:text-red-500"
                                                        >
                                                            Remove File
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={ 24 } className="mb-2 group-hover:scale-110 transition-transform" />
                                                        <span className="text-xs font-bold">Upload PDF or Image</span>
                                                        <span className="text-[10px] opacity-70 mt-1">Max 5MB</span>
                                                    </>
                                                ) }
                                            </label>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={ verifying }
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            { verifying ? <LoadingSpinner size={ 20 } color="border-white" /> : <CheckCircle size={ 20 } /> }
                                            { verifying ? 'Submitting...' : 'Submit for Verification' }
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                ) }
            </AnimatePresence >

            {/* Mobile Nav */ }
            < div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around z-40" >
                <button onClick={ () => setActiveTab('plan') } className={ `p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'plan' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}` }><Compass size={ 20 } /><span className="text-[10px] font-bold">Plan</span></button>
                <button onClick={ () => setActiveTab('explore') } className={ `p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'explore' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}` }><Sun size={ 20 } /><span className="text-[10px] font-bold">Explore</span></button>
                <button onClick={ () => setActiveTab('trips') } className={ `p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'trips' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}` }><Calendar size={ 20 } /><span className="text-[10px] font-bold">Trips</span></button>
                <button onClick={ () => setActiveTab('map') } className={ `p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}` }><MapPin size={ 20 } /><span className="text-[10px] font-bold">Map</span></button>
                <button onClick={ () => setChatOpen(true) } className="p-2 rounded-xl flex flex-col items-center gap-1 text-slate-400"><MessageSquare size={ 20 } /><span className="text-[10px] font-bold">Chat</span></button>
            </div >

            {/* Main Content width 80vw ish */ }
            < main className={ ` ${activeTab === 'map' ? 'relative w-full h-[calc(100vh-70px)] overflow-hidden bg-slate-900' : 'w-[90%] md:w-[85%] max-w-[1600px] mx-auto py-8 mb-20 md:mb-0 transition-all duration-500'}` }>

                {/* PLANNER TAB */ }




                {
                    activeTab === 'plan' && (
                        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[80vh]">
                            <motion.div
                                initial={ { opacity: 0, x: -50 } }
                                animate={ { opacity: 1, x: 0 } }
                                transition={ { duration: 0.8, ease: "easeOut" } }
                                className="space-y-8"
                            >
                                <div>
                                    <motion.div
                                        initial={ { opacity: 0, y: 10 } }
                                        animate={ { opacity: 1, y: 0 } }
                                        transition={ { delay: 0.2 } }
                                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50/80 backdrop-blur-sm border border-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-6 shadow-sm ring-4 ring-indigo-50/30"
                                    >
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                        </span>
                                        AI-Powered Travel Agent
                                    </motion.div>
                                    <h2 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
                                        Curate your <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 filter drop-shadow-sm">Dream Journey</span>
                                    </h2>
                                    <p className="text-xl text-slate-500 max-w-lg leading-relaxed font-medium">
                                        Tell us where you want to go. Our advanced AI constantly monitors safety, weather, and traffic to build the perfect itinerary.
                                    </p>
                                </div>

                                <motion.form
                                    onSubmit={ handleGenerateItinerary }
                                    className="group relative bg-white/60 p-10 rounded-[2.5rem] shadow-2xl border border-white/60 backdrop-blur-2xl transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(79,70,229,0.15)] overflow-hidden isolate"
                                    initial={ { opacity: 0, scale: 0.95 } }
                                    animate={ { opacity: 1, scale: 1 } }
                                    transition={ { delay: 0.4, duration: 0.5 } }
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-white/40 to-white/40 -z-10"></div>
                                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl"></div>

                                    <div className="space-y-8 relative z-10">
                                        <div className="relative group/input">
                                            <label className="absolute -top-3 left-4 bg-white/80 backdrop-blur-md px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-600 border border-indigo-50 shadow-sm transition-all group-focus-within/input:text-indigo-700 group-focus-within/input:scale-105">Destination</label>
                                            <select
                                                className="w-full bg-slate-50/50 hover:bg-white/80 border border-slate-200 rounded-2xl p-4 font-bold text-slate-800 transition-all focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none cursor-pointer text-lg"
                                                value={ isCustomDestination ? 'custom' : planData.destination }
                                                onChange={ e => {
                                                    const val = e.target.value;
                                                    if (val === 'custom') {
                                                        setIsCustomDestination(true);
                                                        setPlanData({ ...planData, destination: '' });
                                                    } else {
                                                        setIsCustomDestination(false);
                                                        setPlanData({ ...planData, destination: val });
                                                    }
                                                } }
                                                required
                                            >
                                                <option value="" disabled>Select a Destination...</option>
                                                { allDestinations.length > 0 ? (
                                                    allDestinations.map(dest => (
                                                        <option key={ dest._id } value={ dest.name }>{ dest.name }</option>
                                                    ))
                                                ) : (
                                                    <option disabled>Loading destinations...</option>
                                                ) }
                                                <option value="custom">Other (Type Manually)</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/input:text-indigo-500 transition-colors">
                                                <Compass size={ 20 } strokeWidth={ 2 } />
                                            </div>
                                        </div>



                                        { isCustomDestination && (
                                            <motion.div
                                                initial={ { opacity: 0, height: 0 } }
                                                animate={ { opacity: 1, height: 'auto' } }
                                                className="overflow-hidden"
                                            >
                                                <input
                                                    autoFocus
                                                    placeholder="Enter destination name..."
                                                    className="w-full bg-white border-2 border-indigo-100 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-100/50 transition-all"
                                                    onChange={ e => setPlanData({ ...planData, destination: e.target.value }) }
                                                />
                                            </motion.div>
                                        ) }

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="relative group/num">
                                                <label className="absolute -top-3 left-4 bg-white/80 backdrop-blur-md px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-600 border border-indigo-50 shadow-sm z-10 transition-all group-focus-within/num:scale-105">Duration</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-slate-50/50 hover:bg-white/80 border border-slate-200 rounded-2xl p-4 font-bold text-slate-800 transition-all focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-lg"
                                                        value={ planData.days }
                                                        onChange={ e => setPlanData({ ...planData, days: e.target.value }) }
                                                        min="1" max="15" required
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none uppercase tracking-wider">Days</span>
                                                </div>
                                            </div>
                                            <div className="relative group/bud">
                                                <label className="absolute -top-3 left-4 bg-white/80 backdrop-blur-md px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-600 border border-indigo-50 shadow-sm z-10 transition-all group-focus-within/bud:scale-105">Budget</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">₹</span>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-slate-50/50 hover:bg-white/80 border border-slate-200 rounded-2xl p-4 pl-8 font-bold text-slate-800 transition-all focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-lg"
                                                        value={ planData.budget }
                                                        onChange={ e => setPlanData({ ...planData, budget: e.target.value }) }
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-400 mb-3 ml-1 tracking-wider">Travel Style</label>
                                            <div className="flex flex-wrap gap-2">
                                                { ['Adventure', 'Relaxing', 'Cultural', 'Foodie', 'Nature', 'Historical', 'Wildlife', 'Romantic', 'Beach', 'Mountain', 'Road Trip', 'Shopping'].map((style, i) => (
                                                    <motion.button
                                                        key={ style }
                                                        type="button"
                                                        whileHover={ { scale: 1.05 } }
                                                        whileTap={ { scale: 0.95 } }
                                                        initial={ { opacity: 0, scale: 0.5 } }
                                                        animate={ { opacity: 1, scale: 1 } }
                                                        transition={ { delay: 0.5 + (i * 0.05) } }
                                                        onClick={ () => {
                                                            const prev = planData.preferences;
                                                            if (prev.includes(style)) setPlanData({ ...planData, preferences: prev.filter(p => p !== style) });
                                                            else setPlanData({ ...planData, preferences: [...prev, style] });
                                                        } }
                                                        className={ `px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-300 ${planData.preferences.includes(style) ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-transparent text-white shadow-lg shadow-indigo-200 ring-2 ring-indigo-200 ring-offset-2' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm'}` }
                                                    >
                                                        { style }
                                                    </motion.button>
                                                )) }
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100/50">
                                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-2xl border border-blue-100 backdrop-blur-sm shadow-inner mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl filter drop-shadow hover:scale-110 transition-transform">
                                                        { ['☀️', '⛅', '🌧️', '⚡'][Math.floor(Math.random() * 4)] }
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-black text-blue-500 tracking-widest mb-0.5">Live Weather</p>
                                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                            { planData.destination || 'Select Destination' }
                                                            { planData.destination && <span className="px-2 py-0.5 bg-white rounded-md text-[10px] shadow-sm text-slate-500">24°C</span> }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                disabled={ generating }
                                                className="w-full bg-slate-900 group-hover:bg-black text-white font-bold py-5 rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-center gap-3 relative overflow-hidden active:scale-[0.98] transition-all disabled:opacity-90 disabled:cursor-not-allowed"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_auto] animate-gradient"></div>

                                                { generating ? (
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <div className="relative w-6 h-6">
                                                            <motion.span
                                                                className="absolute inset-0 border-2 border-white/20 border-t-white rounded-full"
                                                                animate={ { rotate: 360 } }
                                                                transition={ { duration: 1, repeat: Infinity, ease: "linear" } }
                                                            />
                                                            <motion.span
                                                                className="absolute inset-1 border-2 border-white/20 border-b-white rounded-full"
                                                                animate={ { rotate: -360 } }
                                                                transition={ { duration: 1.5, repeat: Infinity, ease: "linear" } }
                                                            />
                                                        </div>
                                                        <span className="text-lg tracking-wide">Crafting Journey...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="relative z-10 text-lg tracking-wide">Generate Experience</span>
                                                        <Sun size={ 22 } className="relative z-10 group-hover:rotate-180 transition-transform duration-700" />
                                                    </>
                                                ) }
                                            </button>
                                        </div>
                                    </div>
                                </motion.form>
                            </motion.div>

                            {/* Hero Image / 3D Element Placeholder */ }
                            <div className="hidden md:block relative h-[650px] w-full perspective-1000">
                                <div className="absolute inset-4 bg-gradient-to-tr from-indigo-600 via-fuchsia-600 to-orange-500 rounded-[3rem] blur-2xl opacity-20"></div>
                                <img
                                    src="https://images.unsplash.com/photo-1590664216212-62e763768cae?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                    alt="Travel"
                                    className="absolute inset-0 w-full h-full object-cover rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] rotate-[-2deg] hover:rotate-0 border-8 border-white"
                                />
                                {/* Floating Badge */ }
                                <div className="absolute bottom-12 -left-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                            <Shield size={ 20 } className="fill-current" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Safety First</p>
                                            <p className="text-[10px] text-slate-500">Real-time danger zone alerts</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TRENDING SECTION */ }
                            <div className="mt-8 md:mt-12 lg:col-span-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 w-full">
                                <h3 className="text-2xl font-black text-slate-800 mb-6 md:mb-8 flex items-center gap-2 px-2">
                                    <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><Star size={ 20 } fill="currentColor" /></span> Trending This Season
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                                    { allDestinations.length > 0 ? (
                                        allDestinations.slice(0, 4).map((dest, i) => (
                                            <div key={ dest._id || i } onClick={ () => handleBookClick(dest) } className="group cursor-pointer relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2">
                                                <img
                                                    src={ (dest.images && dest.images[0]) ? dest.images[0] : 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1' }
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    alt={ dest.name }
                                                    loading="lazy"
                                                    onError={ (e) => e.target.src = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1' }
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="absolute bottom-6 left-6 right-6 text-white transform group-hover:translate-x-2 transition-transform duration-300">
                                                    <h4 className="font-bold text-xl leading-tight mb-1 text-white drop-shadow-sm">{ dest.name }</h4>
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-xs font-bold text-white bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1">
                                                            <Star size={ 10 } className="fill-current text-yellow-400" /> { dest.averageRating || 4.8 }
                                                        </p>
                                                        <div className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300">
                                                            <ArrowRight size={ 14 } strokeWidth={ 3 } />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full text-center text-slate-400 py-12">Loading trending destinations...</div>
                                    ) }
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* EXPLORE TAB */ }
                {
                    activeTab === 'explore' && (
                        <div className="min-h-screen animate-in fade-in zoom-in-95 duration-500">
                            <div className="text-center mb-16 space-y-4">
                                <span className="inline-block py-1 px-3 rounded-full bg-indigo-50 text-indigo-600 font-bold uppercase tracking-wider text-xs border border-indigo-100">Discover Hidden Gems</span>
                                <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight">Explore The World</h2>
                                <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">Browse through our curated list of safe and exciting destinations verified by our travel safety agents. Find your next adventure.</p>
                            </div>

                            { allDestinations.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Compass size={ 32 } className="text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-bold">Loading amazing places...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                    { allDestinations.map((dest, i) => (
                                        <div
                                            key={ dest._id || i }
                                            onClick={ () => handleBookClick(dest) }
                                            className="bg-white rounded-[2.5rem] p-4 shadow-xl shadow-slate-200/50 border border-slate-100 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group cursor-pointer hover:-translate-y-1"
                                        >
                                            <div className="relative h-72 rounded-[2rem] overflow-hidden mb-5">
                                                <div className="absolute inset-0 bg-slate-200 animate-pulse -z-10"></div>
                                                <img
                                                    src={ (dest.images && dest.images.length > 0 && dest.images[0]) ? dest.images[0] : `https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800&auto=format&fit=crop` }
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    alt={ dest.name }
                                                    loading="lazy"
                                                    onError={ (e) => { e.target.src = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800&auto=format&fit=crop'; } }
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-60"></div>

                                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-black text-slate-900 shadow-lg flex items-center gap-1">
                                                    <Star size={ 12 } className="text-yellow-400 fill-current" /> { dest.averageRating || dest.rating || '4.8' }
                                                </div>
                                                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider border border-white/20">
                                                    { dest.category || 'Popular' }
                                                </div>
                                            </div>

                                            <div className="px-4 pb-4">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="text-2xl font-black text-slate-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">{ dest.name }</h3>
                                                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wide">
                                                            <MapPin size={ 12 } className="text-indigo-500" /> <span>{ dest.location?.city || 'International' }, { dest.location?.country || 'Earth' }</span>
                                                        </div>
                                                    </div>
                                                    <button className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-indigo-200 group-hover:rotate-[-45deg]">
                                                        <ArrowRight size={ 20 } strokeWidth={ 2.5 } />
                                                    </button>
                                                </div>
                                                <p className="text-slate-500 text-sm font-medium line-clamp-2 leading-relaxed mb-4">
                                                    { dest.description || 'Experience the beauty of this amazing destination with our curated safety guide.' }
                                                </p>
                                            </div>
                                        </div>
                                    )) }
                                </div>
                            ) }
                        </div>
                    )
                }

                {/* ITINERARY VIEW */ }
                {
                    activeTab === 'itinerary' && itinerary && (
                        <div className="pb-24">
                            <div className="bg-white rounded-[2.5rem] p-8 mb-8 shadow-sm border border-slate-100">
                                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                                    <div>
                                        <h2 className="text-4xl font-black text-slate-800 mb-2">{ itinerary.title || "Your Custom Journey" }</h2>
                                        <div className="flex items-center gap-3 text-slate-500 font-medium">
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">{ itinerary.stats?.duration || planData.days + ' Days' }</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span className="text-sm">{ planData.preferences.join(', ') }</span>
                                        </div>
                                    </div>
                                    <div className="text-right bg-emerald-50 px-6 py-4 rounded-2xl border border-emerald-100 text-emerald-900">
                                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Estimated Budget</p>
                                        <p className="text-3xl font-black tracking-tight">{ itinerary.stats?.cost || '₹' + planData.budget }</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                { itinerary.schedule?.map((day, idx) => (
                                    <div key={ idx } className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-shadow hover:shadow-xl group">
                                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
                                                    { day.day }
                                                </div>
                                                <h3 className="font-bold text-lg text-slate-800">Day { day.day }</h3>
                                            </div>
                                            <button
                                                onClick={ async () => {
                                                    const toastId = toast.loading('Optimizing Route via Simulated Annealing...');
                                                    try {
                                                        const places = day.activities.map(a => ({ name: a.title, lat: a.lat || 0, lng: a.lng || 0, ...a }));
                                                        const { data } = await api.post('/planning/optimize', { places });
                                                        const userItinerary = { ...itinerary };
                                                        userItinerary.schedule[idx].activities = data.optimizedOrder;
                                                        setItinerary(userItinerary);
                                                        toast.success(`Optimized! Saved ${data.totalDistance.toFixed(1)} km`, { id: toastId });
                                                    } catch (e) {
                                                        toast.error('Optimization failed', { id: toastId });
                                                    }
                                                } }
                                                className="px-3 py-1.5 text-[10px] bg-slate-100 text-slate-600 rounded-full font-bold hover:bg-black hover:text-white transition-colors flex items-center gap-1"
                                            >
                                                <Compass size={ 12 } /> Optimize
                                            </button>
                                        </div>
                                        <div className="space-y-4 relative">
                                            <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-100 -z-10"></div>
                                            { day.activities.map((act, i) => (
                                                <div key={ i } className="flex gap-4 relative">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-white border-2 border-slate-50 rounded-full flex items-center justify-center text-lg z-10 shadow-sm group-hover:border-indigo-100 transition-colors">
                                                        { act.icon || '📍' }
                                                    </div>
                                                    <div className="pb-4">
                                                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">{ act.time }</p>
                                                        <p className="font-bold text-slate-800 leading-tight">{ act.title }</p>
                                                        { act.lat && <p className="text-[10px] text-slate-400 mt-1 font-mono">{ act.lat.toFixed(4) }, { act.lng?.toFixed(4) }</p> }
                                                    </div>
                                                </div>
                                            )) }
                                        </div>
                                    </div>
                                )) }
                            </div>

                            <div className="mt-12 flex justify-center pb-8 p-4">
                                <button
                                    onClick={ () => {
                                        handleBookClick(
                                            { name: itinerary.destination || planData.destination, isCustom: true, priceLevel: 'custom' }, // selectedPackage
                                            itinerary._id // itineraryId
                                        );
                                        // Update form specific to this trip
                                        setBookForm(prev => ({
                                            ...prev,
                                            budget: itinerary.stats?.cost?.toString().replace(/[^0-9]/g, '') || planData.budget,
                                            travelStyle: planData.preferences || []
                                        }));
                                    } }
                                    className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-400 hover:-translate-y-1 transition-all active:scale-95 overflow-hidden w-full md:w-auto"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-3 text-lg">
                                        Interested For Tour <ArrowRight size={ 24 } strokeWidth={ 3 } />
                                    </span>
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* MY TRIPS TAB */ }
                {
                    activeTab === 'trips' && (
                        <div className="min-h-screen pb-24">
                            <motion.div
                                initial={ { opacity: 0, y: -20 } }
                                animate={ { opacity: 1, y: 0 } }
                                transition={ { duration: 0.6, ease: "easeOut" } }
                                className="text-center mb-12"
                            >
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">My Journeys</h2>
                                <p className="text-slate-500 font-medium">Track your bookings and upcoming adventures.</p>
                            </motion.div>

                            { myTrips.length === 0 ? (
                                <motion.div
                                    initial={ { opacity: 0, scale: 0.9 } }
                                    animate={ { opacity: 1, scale: 1 } }
                                    transition={ { type: "spring", duration: 0.8 } }
                                    className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200"
                                >
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <MapPin size={ 32 } className="text-slate-300" />
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800">No trips found</h3>
                                    <p className="text-slate-400 text-sm mt-1">Start planning your next adventure today!</p>
                                    <button onClick={ () => setActiveTab('plan') } className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition">Plan Now</button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    className="grid md:grid-cols-2 gap-6"
                                    variants={ {
                                        hidden: { opacity: 0 },
                                        show: {
                                            opacity: 1,
                                            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
                                        }
                                    } }
                                    initial="hidden"
                                    animate="show"
                                >
                                    { myTrips.filter(trip => trip.plan?.status).map((trip) => (
                                        <motion.div
                                            key={ trip._id }
                                            variants={ {
                                                hidden: { opacity: 0, scale: 0.9, y: 30 },
                                                show: {
                                                    opacity: 1,
                                                    scale: 1,
                                                    y: 0,
                                                    transition: { type: "spring", stiffness: 40, damping: 15 }
                                                }
                                            } }
                                            whileHover={ {
                                                y: -10,
                                                scale: 1.02,
                                                boxShadow: "0 25px 50px -12px rgba(79, 70, 229, 0.25)"
                                            } }
                                            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group relative overflow-hidden transition-all duration-300"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-800 leading-tight mb-1">{ trip.destination }</h3>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{ new Date(trip.createdAt).toLocaleDateString() }</p>
                                                </div>
                                                <div className={ `px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${(trip.plan?.status || 'Pending') === 'Confirmed' ? 'bg-emerald-100 text-emerald-600' :
                                                    (trip.plan?.status || 'Pending') === 'Rejected' ? 'bg-rose-100 text-rose-600' :
                                                        'bg-amber-100 text-amber-600'
                                                    }` }>
                                                    { trip.plan?.status || 'Pending' }
                                                </div>
                                            </div>

                                            <div className="space-y-3 mb-6">
                                                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><Calendar size={ 14 } /></div>
                                                    <span>{ trip.stats?.duration || trip.duration + ' Days' }</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><Users size={ 14 } /></div>
                                                    <span>₹{ trip.stats?.cost || trip.budget } Budget</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><Star size={ 14 } /></div>
                                                    <span className="truncate">{ trip.preferences?.join(', ') || 'Custom Plan' }</span>
                                                </div>
                                            </div>

                                            { (trip.plan?.status === 'Confirmed') ? (
                                                (trip.plan?.schedule) ? (
                                                    <button
                                                        onClick={ () => {
                                                            setItinerary(trip);
                                                            setActiveTab('itinerary');
                                                        } }
                                                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors flex items-center justify-center gap-2 group-hover:translate-y-0 opacity-90 group-hover:opacity-100"
                                                    >
                                                        View Full Itinerary <ArrowRight size={ 16 } />
                                                    </button>
                                                ) : (
                                                    <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-emerald-100">
                                                        <CheckCircle size={ 16 } /> Enquiry Confirmed! Tour Details Send to You Very Soon...
                                                    </div>
                                                )
                                            ) : (trip.plan?.status === 'Rejected') ? (
                                                <div className="w-full py-4 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-rose-100">
                                                    <AlertTriangle size={ 14 } /> Booking Rejected
                                                </div>
                                            ) : (
                                                <div className="w-full py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-100 border-dashed">
                                                    Processing your request...
                                                </div>
                                            ) }
                                        </motion.div>
                                    )) }
                                </motion.div>
                            ) }
                        </div>
                    )
                }

                {/* MAP TAB */ }
                {
                    activeTab === 'map' && (
                        <>
                            <MapContainer center={ [20.5937, 78.9629] } zoom={ 5 } style={ { height: '100%', width: '100%' } } className="z-0 outline-none">
                                <TileLayer
                                    url={ isSatellite
                                        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    }
                                    attribution={ isSatellite ? 'Esri' : '&copy; OpenStreetMap' }
                                />
                                { isSatellite && (
                                    <TileLayer
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                                    />
                                ) }

                                {/* User Marker */ }
                                { userLocation && (
                                    <>
                                        <RecenterMap lat={ userLocation.lat } lng={ userLocation.lng } />
                                        <Marker position={ [userLocation.lat, userLocation.lng] } icon={ UserIcon }>
                                            <Popup className="custom-popup">
                                                <div className="text-center p-2">
                                                    <p className="font-black text-indigo-600 text-sm">You are here</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live & Monitored</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                        <Circle center={ [userLocation.lat, userLocation.lng] } radius={ 150 } pathOptions={ { color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.15, dashArray: '10, 10' } } />
                                    </>
                                ) }

                                {/* Danger Zones */ }
                                { dangerZones.map(zone => (
                                    <Circle
                                        key={ zone._id }
                                        center={ [zone.location.coordinates[1], zone.location.coordinates[0]] }
                                        radius={ zone.radius }
                                        pathOptions={ { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2, weight: 2 } }
                                    >
                                        <Popup>
                                            <div className="text-center">
                                                <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full mx-auto mb-2"><AlertTriangle size={ 16 } /></div>
                                                <p className="font-black text-red-600 uppercase text-xs">Danger Zone</p>
                                                <p className="font-bold text-sm text-slate-800">{ zone.name }</p>
                                                <p className="text-xs text-slate-500 mb-1">{ zone.description }</p>
                                                <div className="inline-block px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold border border-red-100">{ zone.severity } Severity</div>
                                            </div>
                                        </Popup>
                                    </Circle>
                                )) }

                                {/* Searched Location Marker */ }
                                { mapSearchedLocation && (
                                    <>
                                        <RecenterMap lat={ mapSearchedLocation.lat } lng={ mapSearchedLocation.lng } />
                                        <Marker position={ [mapSearchedLocation.lat, mapSearchedLocation.lng] }>
                                            <Popup>
                                                <div className="text-center p-2 max-w-[200px]">
                                                    <p className="font-bold text-slate-800 text-sm">{ mapSearchedLocation.name }</p>
                                                    <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Searched Location</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    </>
                                ) }
                            </MapContainer>

                            {/* Map Search Bar - Premium Floating Design */ }
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] w-[90%] max-w-md">
                                <div className="relative group" ref={ searchRef }>
                                    <form onSubmit={ handleManualSearchSubmit } className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Search size={ 18 } className="text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full pl-11 pr-12 py-3.5 bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus:shadow-[0_8px_30px_rgb(79,70,229,0.2)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 font-bold placeholder:text-slate-400 text-sm transition-all"
                                            placeholder="Search Village, Mandal, Pincode, City..."
                                            value={ mapSearchQuery }
                                            onFocus={ () => { if (mapSearchResults.length > 0) setShowMapDropdown(true); } }
                                            onChange={ (e) => setMapSearchQuery(e.target.value) }
                                        />
                                        <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1">
                                            { mapSearchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={ () => { setMapSearchQuery(''); setMapSearchResults([]); setMapSearchedLocation(null); } }
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    <X size={ 14 } />
                                                </button>
                                            ) }
                                            <button
                                                type="submit"
                                                disabled={ isSearchingMap }
                                                className="aspect-square h-full bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                            >
                                                { isSearchingMap ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <ArrowRight size={ 18 } /> }
                                            </button>
                                        </div>
                                    </form>

                                    {/* Advanced Search Results Dropdown */ }
                                    { showMapDropdown && mapSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-64 overflow-y-auto z-[401]">
                                            <div className="p-2 border-b border-slate-50 bg-slate-50/50 text-[10px] font-bold uppercase text-slate-400 tracking-wider flex justify-between">
                                                <span>Found { mapSearchResults.length } results</span>
                                                <span className="text-indigo-400">Auto-Detected</span>
                                            </div>
                                            { mapSearchResults.map((result, idx) => (
                                                <button
                                                    key={ idx }
                                                    onClick={ () => selectLocation(result) }
                                                    className="w-full text-left p-3 hover:bg-indigo-50 border-b border-slate-100 last:border-0 text-xs font-medium text-slate-700 transition-colors flex items-start gap-3 group/item"
                                                >
                                                    <div className="mt-0.5 shrink-0 w-6 h-6 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center group-hover/item:bg-indigo-500 group-hover/item:text-white transition-colors">
                                                        <MapPin size={ 12 } />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="line-clamp-2 leading-relaxed">{ result.display_name }</p>
                                                        <div className="flex gap-2 mt-0.5">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{ result.type }</span>
                                                            { result.address?.postcode && <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-1 rounded">{ result.address.postcode }</span> }
                                                        </div>
                                                    </div>
                                                </button>
                                            )) }
                                        </div>
                                    ) }
                                </div>
                            </div>

                            {/* Floating UI Elements */ }
                            <div className="absolute top-24 left-4 z-[400] max-w-xs transition-all duration-300">
                                <div className="bg-white/60 backdrop-blur-md p-4 rounded-3xl shadow-lg border border-white/40 hover:bg-white/80 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-300">
                                            <Shield size={ 20 } strokeWidth={ 2.5 } />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 leading-tight text-sm">Safety Monitoring</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={ `relative flex h-2 w-2` }>
                                                    <span className={ `absolute inline-flex h-full w-full rounded-full opacity-75 ${gpsEnabled ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}` }></span>
                                                    <span className={ `relative inline-flex rounded-full h-2 w-2 ${gpsEnabled ? 'bg-emerald-500' : 'bg-slate-500'}` }></span>
                                                </span>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{ gpsEnabled ? 'Active' : 'GPS Offline' }</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute top-24 right-4 z-[1000] flex flex-col gap-3">
                                <button
                                    onClick={ () => setGpsEnabled(!gpsEnabled) }
                                    className={ `group relative p-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center shadow-2xl ${gpsEnabled ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}` }
                                    title="Toggle GPS Tracking"
                                >
                                    <span className={ `absolute inset-0 rounded-2xl opacity-20 ${gpsEnabled ? 'bg-indigo-600' : 'hidden'}` }></span>
                                    <Navigation size={ 24 } className="relative z-10 transition-transform group-hover:scale-110" fill={ gpsEnabled ? "currentColor" : "none" } />
                                </button>

                                <button
                                    onClick={ () => setIsSatellite(!isSatellite) }
                                    className={ `group relative p-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center shadow-2xl ${isSatellite ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}` }
                                    title={ isSatellite ? "Switch to Map View" : "Switch to Satellite View" }
                                >
                                    { isSatellite ? <Map size={ 24 } className="group-hover:scale-110 transition-transform" /> : <Globe size={ 24 } className="group-hover:scale-110 transition-transform" /> }
                                </button>
                            </div>

                            {/* Nearby Users */ }
                            { nearbyTourists.length > 0 && (
                                <div className="absolute top-6 right-6 z-[400] bg-white/80 backdrop-blur-xl p-4 rounded-3xl shadow-xl border border-white/50 max-w-[200px]">
                                    <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-3 ml-1 tracking-wider">Nearby Travelers</h4>
                                    <div className="flex flex-col gap-2">
                                        { nearbyTourists.map((u, i) => (
                                            <div key={ i } className="flex items-center gap-3 bg-white/50 p-2 rounded-xl border border-white/60">
                                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">{ u.name[0] }</div>
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-bold text-slate-800 truncate">{ u.name }</p>
                                                    <p className="text-[10px] text-emerald-600 font-medium truncate">Nearby</p>
                                                </div>
                                            </div>
                                        )) }
                                    </div>
                                </div>
                            ) }

                            {/* Danger Alert Overlay */ }
                            { activeAlert && (
                                <div className="absolute inset-0 z-[1000] bg-rose-500/10 backdrop-blur-md flex items-center justify-center p-4">
                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border-4 border-rose-100">
                                        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                            <div className="absolute inset-0 bg-rose-100 rounded-full opacity-20"></div>
                                            <AlertTriangle size={ 48 } className="text-rose-500" />
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 mb-2">DANGER ZONE!</h2>
                                        <p className="text-lg font-medium text-slate-600 mb-8 leading-relaxed">
                                            { activeAlert.message }
                                        </p>
                                        <div className="flex flex-col gap-3">
                                            <button onClick={ () => setActiveAlert(null) } className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-rose-200 transition-all active:scale-95">
                                                I Understand, Dismiss
                                            </button>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Emergency Contacts Notified</p>
                                        </div>
                                    </div>
                                </div>
                            ) }
                        </>
                    )
                }
            </main >

            {/* MODERN CHAT WIDGET */ }


            {/* Feedback Modal */ }
            < AnimatePresence >
                { showFeedback && (
                    <motion.div
                        initial={ { opacity: 0 } }
                        animate={ { opacity: 1 } }
                        exit={ { opacity: 0 } }
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={ { scale: 0.9, opacity: 0, y: 20 } }
                            animate={ { scale: 1, opacity: 1, y: 0 } }
                            exit={ { scale: 0.9, opacity: 0, y: 20 } }
                            className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl text-indigo-600 mb-4 shadow-sm transform hover:scale-110 transition-transform duration-300">
                                    <Star size={ 32 } fill="currentColor" className="text-indigo-600" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-2">Rate Your Experience</h3>
                                <p className="text-slate-500 font-medium text-sm px-4">Your feedback helps us create safer and better travel experiences for everyone.</p>
                            </div>

                            <div className="flex justify-center gap-3 mb-8">
                                { [1, 2, 3, 4, 5].map(s => (
                                    <motion.button
                                        key={ s }
                                        whileHover={ { scale: 1.2 } }
                                        whileTap={ { scale: 0.9 } }
                                        onClick={ () => setRating(s) }
                                        className="focus:outline-none transition-colors duration-200"
                                    >
                                        <Star
                                            size={ 36 }
                                            className={ `${rating >= s ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'fill-slate-100 text-slate-300'}` }
                                            strokeWidth={ rating >= s ? 0 : 2 }
                                        />
                                    </motion.button>
                                )) }
                            </div>

                            <div className="space-y-4">
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none placeholder:text-slate-400"
                                    rows="4"
                                    placeholder="Tell us what you liked or how we can improve..."
                                    value={ comment }
                                    onChange={ e => setComment(e.target.value) }
                                ></textarea>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={ () => setShowFeedback(false) }
                                        className="flex-1 py-3.5 font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={ handleFeedbackSubmit }
                                        disabled={ submittingFeedback }
                                        className="flex-1 py-3.5 font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        { submittingFeedback ? <LoadingSpinner size={ 18 } color="border-white" /> : null }
                                        { submittingFeedback ? 'Submitting...' : 'Submit Feedback' }
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                ) }
            </AnimatePresence >

            {/* BOOKING MODAL */ }
            {
                bookingModalOpen && selectedPackage && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 relative">
                            <button onClick={ () => setBookingModalOpen(false) } className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition z-10"><X size={ 20 } /></button>

                            <div className="h-32 bg-indigo-600 relative">
                                <img src={ selectedPackage.img || (selectedPackage.images && selectedPackage.images[0]) || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80' } className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <h3 className="text-2xl font-black text-white drop-shadow-md text-center px-4">Book { selectedPackage.name }</h3>
                                </div>
                            </div>

                            <form onSubmit={ handleBookSubmit } className="p-8 space-y-4">
                                <p className="text-sm text-center text-slate-500 font-medium">✨ Enter your details and we will craft the perfect trip for you.</p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
                                        <input value={ bookForm.name } onChange={ e => setBookForm({ ...bookForm, name: e.target.value }) } className="w-full border rounded-xl p-3 bg-slate-50 font-bold text-sm outline-indigo-500" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number</label>
                                        <input value={ bookForm.phone } readOnly disabled className="w-full border rounded-xl p-3 bg-slate-100 font-bold text-sm text-slate-500 cursor-not-allowed outline-none" placeholder="+91..." required />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                                        <input type="email" value={ bookForm.email } readOnly disabled className="w-full border rounded-xl p-3 bg-slate-100 font-bold text-sm text-slate-500 cursor-not-allowed outline-none" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">WhatsApp Number</label>
                                        <input value={ bookForm.whatsapp } onChange={ e => setBookForm({ ...bookForm, whatsapp: e.target.value }) } className="w-full border rounded-xl p-3 bg-slate-50 font-bold text-sm outline-indigo-500" placeholder="+91..." />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Budget (INR)</label>
                                        <input type="number" value={ bookForm.budget } onChange={ e => setBookForm({ ...bookForm, budget: e.target.value }) } className="w-full border rounded-xl p-3 bg-slate-50 font-bold text-sm outline-indigo-500" placeholder="50000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Travel Style (Select Multiple)</label>

                                        {/* Selected Tags Display */ }
                                        <div className="flex flex-wrap gap-2 mb-2 min-h-[30px]">
                                            { bookForm.travelStyle && bookForm.travelStyle.length > 0 ? (
                                                bookForm.travelStyle.map(style => (
                                                    <span key={ style } className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                        { style }
                                                        <button type="button" onClick={ () => setBookForm({ ...bookForm, travelStyle: bookForm.travelStyle.filter(s => s !== style) }) } className="hover:text-indigo-900">
                                                            <X size={ 10 } />
                                                        </button>
                                                    </span>
                                                ))
                                            ) : <span className="text-[10px] text-slate-400 italic">No styles selected</span> }
                                        </div>

                                        {/* Search & Dropdown */ }
                                        <div className="relative group">
                                            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-2 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all">
                                                <Search size={ 14 } className="text-slate-400 mr-2" />
                                                <input
                                                    type="text"
                                                    placeholder="Search & Select Styles..."
                                                    className="bg-transparent outline-none text-xs w-full font-bold text-slate-700 placeholder-slate-400"
                                                    value={ styleSearch }
                                                    onChange={ (e) => setStyleSearch(e.target.value) }
                                                />
                                            </div>

                                            {/* Dropdown Options */ }
                                            <div className="absolute w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 hidden group-focus-within:block font-medium">
                                                { ['Relaxed', 'Adventure', 'Family', 'Luxury', 'Cultural', 'Wildlife', 'Romantic', 'Beach', 'Mountain', 'Road Trip', 'Shopping', 'Historical', 'Foodie', 'Nature', 'Spiritual', 'Nightlife', 'Solo', 'Business', 'Honeymoon']
                                                    .filter(s => s.toLowerCase().includes(styleSearch.toLowerCase()))
                                                    .map(style => (
                                                        <button
                                                            key={ style }
                                                            type="button"
                                                            onClick={ () => {
                                                                const prev = bookForm.travelStyle || [];
                                                                if (prev.includes(style)) setBookForm({ ...bookForm, travelStyle: prev.filter(s => s !== style) });
                                                                else setBookForm({ ...bookForm, travelStyle: [...prev, style] });
                                                            } }
                                                            className={ `w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-indigo-50 flex justify-between items-center transition-colors border-b border-slate-50 last:border-0 ${bookForm.travelStyle?.includes(style) ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}` }
                                                        >
                                                            { style }
                                                            { bookForm.travelStyle?.includes(style) && <Check size={ 12 } className="text-indigo-600" /> }
                                                        </button>
                                                    )) }
                                                { ['Relaxed', 'Adventure', 'Family', 'Luxury', 'Cultural', 'Wildlife', 'Romantic', 'Beach', 'Mountain', 'Road Trip', 'Shopping', 'Historical', 'Foodie', 'Nature', 'Spiritual', 'Nightlife', 'Solo', 'Business', 'Honeymoon']
                                                    .filter(s => s.toLowerCase().includes(styleSearch.toLowerCase())).length === 0 && (
                                                        <div className="px-4 py-3 text-xs text-slate-400 text-center font-bold">No matches found</div>
                                                    ) }
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Identity Verification Section - Updated to match design */ }
                                <div>
                                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                                        <Shield size={ 16 } className="text-indigo-600" /> Aadhaar Identity Verification
                                    </h4>
                                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Option 1: Google Drive / Cloud Link</label>
                                            <input
                                                type="url"
                                                placeholder="https://drive.google.com/..."
                                                className="w-full border border-slate-300 rounded-lg p-3 text-xs font-bold bg-white text-slate-700 outline-none focus:border-indigo-500 transition-colors shadow-sm placeholder:text-slate-300"
                                                value={ bookForm.aadhaarLink }
                                                onChange={ e => setBookForm({ ...bookForm, aadhaarLink: e.target.value }) }
                                            />
                                        </div>

                                        <div className="relative py-2">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-slate-200"></div>
                                            </div>
                                            <div className="relative flex justify-center text-[10px] font-bold text-slate-400">
                                                <span className="px-2 bg-slate-50">OR</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Option 2: Upload File (PDF Only)</label>
                                            <div className="flex gap-2 items-center">
                                                <label className="flex-1 cursor-pointer group">
                                                    <input
                                                        type="file"
                                                        accept="application/pdf"
                                                        className="hidden"
                                                        onChange={ (e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => {
                                                                    setBookForm(prev => ({ ...prev, aadhaarFile: reader.result }));
                                                                    toast.success("File attached successfully!");
                                                                };
                                                                if (file.size > 2 * 1024 * 1024) {
                                                                    toast.error("File size too large. Please use Drive Link.");
                                                                } else {
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }
                                                        } }
                                                    />
                                                    <div className={ `h-12 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-all ${bookForm.aadhaarFile
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                        : 'border-slate-300 hover:border-indigo-400 hover:bg-white text-slate-500'
                                                        }` }>
                                                        { bookForm.aadhaarFile ? <CheckCircle size={ 18 } /> : <Upload size={ 18 } /> }
                                                        <span className="text-xs font-bold">{ bookForm.aadhaarFile ? "File Attached" : "Choose File" }</span>
                                                    </div>
                                                </label>

                                                { bookForm.aadhaarFile && (
                                                    <button
                                                        type="button"
                                                        onClick={ () => setBookForm(prev => ({ ...prev, aadhaarFile: '' })) }
                                                        className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                                                    >
                                                        <Trash2 size={ 18 } />
                                                    </button>
                                                ) }
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-amber-50 text-amber-900 px-4 py-3 rounded-xl text-xs font-bold text-center border border-amber-100 flex items-center justify-center gap-2">
                                    <Info size={ 16 } /> After filling this form, we will make a call and Contact soon!
                                </div>

                                <button disabled={ submittingBook } type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition active:scale-95 flex items-center justify-center gap-2">
                                    { submittingBook ? <LoadingSpinner size={ 20 } color="border-white" /> : null }
                                    { submittingBook ? 'Submitting...' : 'Submit Enquiry' }
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
            <ChatWidget
                isOpen={ chatOpen }
                onClose={ () => setChatOpen(false) }
                messages={ messages }
                onSendMessage={ handleChatSubmit }
                isTyping={ isTyping }
            />

            <motion.button
                whileHover={ { scale: 1.1 } }
                whileTap={ { scale: 0.9 } }
                onClick={ () => setChatOpen(!chatOpen) }
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full shadow-xl shadow-indigo-500/40 text-white flex items-center justify-center border-2 border-white/20"
            >
                <Bot size={ 28 } />
                { !chatOpen && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white"></span>
                    </span>
                ) }
            </motion.button>
        </div >
    );
};

export default Dashboard;
