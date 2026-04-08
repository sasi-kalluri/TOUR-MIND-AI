import React, { useState, useEffect } from 'react';
import { Play, StopCircle, AlertTriangle, Maximize2, Minimize2, Zap, Clock, Wifi, Activity, Database, CloudRain, Locate, Layers, Globe, Plus, Minus, Search } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet Icons
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Dark Mode Map Tiles
const DARK_MAP_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const SATELLITE_MAP_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const SafetyCommandCenter = ({ activeTourists, usersList = [], destinations = [], zones = [], alerts = [], isSimulating, setIsSimulating, showControls = true }) => {
    const [viewMode, setViewMode] = useState('vector'); // vector, satellite
    const [activeTab, setActiveTab] = useState('all'); // all, system, uplink, alerts
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [map, setMap] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Map Controller to capture instance
    const MapController = () => {
        const m = useMap();
        useEffect(() => {
            setMap(m);
        }, [m]);
        return null; // This component handles side effects only
    };

    const handleMapSearch = async (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            let found = false;

            // 1. Search Zones (Sectors)
            const matchedZone = zones.find(z => z.name.toLowerCase().includes(query));
            if (matchedZone && map) {
                const [lng, lat] = matchedZone.location.coordinates;
                map.flyTo([lat, lng], 14);
                setLogs(prev => [{
                    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                    source: 'SYSTEM',
                    message: `Sector Identified: ${matchedZone.name}`,
                    type: 'system',
                    status: 'TARGET_LOCKED',
                    location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                }, ...prev]);
                found = true;
                return;
            }

            // 2. Search Destinations
            const matchedDest = destinations.find(d => d.name.toLowerCase().includes(query));
            if (matchedDest && map) {
                let lat, lng;
                if (matchedDest.location?.coordinates) {
                    [lng, lat] = matchedDest.location.coordinates;
                } else if (matchedDest.lat && matchedDest.lng) {
                    lat = matchedDest.lat;
                    lng = matchedDest.lng;
                }

                if (lat && lng) {
                    map.flyTo([lat, lng], 14);
                    setLogs(prev => [{
                        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                        source: 'SYSTEM',
                        message: `Destination Found: ${matchedDest.name}`,
                        type: 'system',
                        status: 'TARGET_LOCKED',
                        location: `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
                    }, ...prev]);
                    found = true;
                    return;
                }
            }

            // 3. Search Active Tourists
            const matchedTourist = activeTourists.find(t => t.name.toLowerCase().includes(query));
            if (matchedTourist && map) {
                map.flyTo([matchedTourist.lat, matchedTourist.lng], 16);
                setLogs(prev => [{
                    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                    source: 'TRACKING_SYS',
                    message: `User Located: ${matchedTourist.name}`,
                    type: 'uplink',
                    status: 'SIGNAL_LOCKED',
                    location: `${matchedTourist.lat.toFixed(4)}, ${matchedTourist.lng.toFixed(4)}`
                }, ...prev]);
                found = true;
                return;
            }

            // 4. External API Fallback
            if (!found) {
                try {
                    // Using OpenStreetMap Nominatim for free geocoding
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
                    const data = await response.json();

                    if (data && data.length > 0) {
                        const { lat, lon, display_name } = data[0];
                        if (map) {
                            map.flyTo([lat, lon], 12);
                            // Add a log entry for the search
                            setLogs(prev => [{
                                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                                source: 'OPERATOR',
                                message: `Target Lock: ${display_name.split(',')[0]}`,
                                type: 'system',
                                status: 'TARGET_LOCKED',
                                location: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`
                            }, ...prev]);
                        }
                    } else {
                        setLogs(prev => [{
                            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                            source: 'SYSTEM',
                            message: `Target Not Found: ${searchQuery}`,
                            type: 'system',
                            status: 'ERROR'
                        }, ...prev]);
                    }
                } catch (error) {
                    console.error("Search failed:", error);
                }
            }
        }
    };

    // Simulate logs stream
    useEffect(() => {
        const initialLogs = [
            { time: '14:20:01', source: 'Core Kernel', message: 'Ready', type: 'system', status: 'OK' },
            { time: '14:20:05', source: 'Node_01', message: 'Handshake Complete', type: 'uplink', status: 'UPLINK_OK' },
            { time: '14:20:09', source: 'Node_02', message: 'Signal Variance 0.02%', type: 'system', status: 'STABLE' },
            { time: '14:20:12', source: 'Encryption Layer', message: 'AES-256 Active', type: 'system', status: 'SECURE' },
        ];
        setLogs(initialLogs);

        const interval = setInterval(() => {
            const types = ['system', 'uplink', 'uplink'];
            const statuses = ['SYNCING', 'BUSY', 'STABLE'];
            const msgs = ['Buffering stream data', 'High traffic detected', 'Ping 24ms'];
            const newLog = {
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                source: `Node_0${Math.floor(Math.random() * 5) + 1}`,
                message: msgs[Math.floor(Math.random() * msgs.length)],
                type: types[Math.floor(Math.random() * types.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)],
                location: `${(Math.random() * 10 + 10).toFixed(4)}, ${(Math.random() * 10 + 75).toFixed(4)}`
            };
            if (Math.random() > 0.7) {
                setLogs(prev => [newLog, ...prev.slice(0, 50)]);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Add real alerts to logs
    useEffect(() => {
        if (alerts.length > 0) {
            const newAlert = alerts[0];
            const logEntry = {
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                source: 'PERIMETER_BREACH',
                message: `Sector_${newAlert.id?.toString().slice(-2) || 'XX'} Detected`,
                type: 'alerts',
                status: 'CRITICAL',
                location: '[12.44, 101.52]' // Mock
            };
            setLogs(prev => [logEntry, ...prev]);
        }
    }, [alerts]);

    const filteredLogs = activeTab === 'all' ? logs : logs.filter(l => l.type === activeTab);

    return (
        <div className={ `bg-slate-950 rounded-3xl p-8 border border-slate-800 shadow-2xl flex flex-col gap-6 ${isFullScreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[90vh]'}` }>

            {/* Header Area */ }
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    { showControls && <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-sans mb-2">Safety Command Center</h1> }
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-emerald-500 text-[10px] font-bold tracking-widest uppercase">Live Satellite Feed</span>
                        </div>
                        <span className="text-slate-600 text-xs">|</span>
                        <span className="text-slate-400 text-xs font-mono tracking-wide">Perimeter: 4.2k sq/km Coastal Grid</span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Search Input */ }
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={ 14 } />
                        <input
                            type="text"
                            placeholder="SEARCH SECTOR / PLACE..."
                            value={ searchQuery }
                            onChange={ (e) => setSearchQuery(e.target.value) }
                            onKeyDown={ handleMapSearch }
                            className="bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 w-56 transition-all"
                        />
                    </div>

                    <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
                        <button
                            onClick={ () => setViewMode('vector') }
                            className={ `px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${viewMode === 'vector' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}` }
                        >
                            <Layers size={ 14 } /> Vector
                        </button>
                        <button
                            onClick={ () => setViewMode('satellite') }
                            className={ `px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${viewMode === 'satellite' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}` }
                        >
                            <Globe size={ 14 } /> Satellite
                        </button>
                    </div>

                    <button className="px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider text-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center gap-2 border border-emerald-500/30">
                        <CloudRain size={ 14 } /> Weather
                    </button>
                    <button className="px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider text-white bg-indigo-600 shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 animate-pulse">
                        <Wifi size={ 14 } /> Live Feed
                    </button>

                    <div className="w-px h-8 bg-slate-800 mx-1"></div>

                    <button
                        onClick={ () => setIsSimulating(!isSimulating) }
                        className={ `px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg border flex items-center gap-2 transition-all ${isSimulating ? 'bg-rose-900/20 text-rose-500 border-rose-900/50' : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-white hover:border-slate-600'}` }
                    >
                        { isSimulating ? <StopCircle size={ 14 } /> : <Play size={ 14 } /> }
                        { isSimulating ? 'Stop SIM' : 'Run SIM' }
                    </button>
                </div >
            </div >

            {/* Live Stats Row */ }
            { showControls && < div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" >
                {
                    [
                        { label: 'Active Users', value: usersList.length, icon: <Activity size={ 18 } className="text-emerald-400" />, color: 'emerald' },
                        { label: 'Total Destinations', value: destinations.length, icon: <Globe size={ 18 } className="text-indigo-400" />, color: 'indigo' },
                        { label: 'Active Danger Zones', value: zones.length, icon: <AlertTriangle size={ 18 } className="text-amber-400" />, color: 'amber' },
                        { label: 'Today Alerts', value: alerts.length, icon: <Zap size={ 18 } className="text-rose-400" />, color: 'rose' }
                    ].map((stat, i) => (
                        <div key={ i } className={ `bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center justify-between backdrop-blur-sm group hover:border-slate-700 transition-all shadow-sm` }>
                            <div>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">{ stat.label }</p>
                                <p className="text-3xl font-black text-white font-mono tracking-tight">{ stat.value }</p>
                            </div>
                            <div className={ `w-12 h-12 rounded-2xl bg-${stat.color}-500/5 border border-${stat.color}-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(0,0,0,0.2)]` }>
                                { stat.icon }
                            </div>
                        </div>
                    ))
                }
            </div > }

            <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0 items-stretch">

                {/* Main Map Area */ }
                <div className={ `${showControls ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden group shadow-inner` }>

                    {/* Environment Detail Overlay */ }
                    <div className="absolute top-6 left-6 z-[1000] bg-slate-950/30 backdrop-blur-md border border-slate-800/50 rounded-3xl p-5 w-72 shadow-2xl pointer-events-none">
                        <div className="flex justify-between items-center mb-5 pointer-events-auto">
                            <h3 className="text-indigo-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                                Environment
                            </h3>
                            <Zap size={ 14 } className="text-emerald-500 animate-pulse" />
                        </div>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 pointer-events-auto">
                            <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Latitude</p>
                                <p className="text-white font-mono text-sm font-bold">12.4218 N</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Longitude</p>
                                <p className="text-white font-mono text-sm font-bold">101.5212 E</p>
                            </div>
                            <div className="col-span-2 h-px bg-slate-800/50"></div>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🌡</span>
                                <div>
                                    <p className="text-amber-400 font-mono text-lg font-bold">28.4 °C</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🌊</span>
                                <div>
                                    <p className="text-sky-400 font-mono text-lg font-bold">1.2m SWL</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map Controls */ }
                    <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
                        <div className="bg-slate-950/30 backdrop-blur-md border border-slate-800/50 rounded-xl p-1 shadow-2xl flex flex-col gap-1">
                            <button onClick={ () => map && map.zoomIn() } className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg font-bold transition"><Plus size={ 16 } /></button>
                            <button onClick={ () => map && map.zoomOut() } className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg font-bold transition"><Minus size={ 16 } /></button>
                        </div>
                    </div>

                    <div className="absolute bottom-6 right-6 z-[400] pointer-events-auto">
                        <button onClick={ () => setIsFullScreen(!isFullScreen) } className="w-10 h-10 bg-slate-950 text-white border border-slate-800 rounded-xl flex items-center justify-center hover:bg-slate-800 transition shadow-lg">
                            { isFullScreen ? <Minimize2 size={ 20 } /> : <Maximize2 size={ 20 } /> }
                        </button>
                    </div>

                    <MapContainer center={ [20.5937, 78.9629] } zoom={ 5 } style={ { height: '100%', width: '100%', background: '#020617' } } className="map-tiles-dark" zoomControl={ false }>
                        <MapController />
                        <TileLayer
                            url={ viewMode === 'vector' ? DARK_MAP_URL : SATELLITE_MAP_URL }
                            attribution='&copy; OpenStreetMap, &copy; CartoDB'
                        />
                        { viewMode === 'satellite' && (
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                            />
                        ) }

                        {/* Map Objects - Tourists */ }
                        { activeTourists.map(t => (
                            <Marker key={ t.id } position={ [t.lat, t.lng] }>
                                <Popup>
                                    <div className="bg-slate-900 text-white border-none min-w-[150px]">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <div className="font-bold text-[10px] text-emerald-500 uppercase tracking-wide">Signal Acquired</div>
                                        </div>
                                        <div className="font-mono text-sm font-bold">{ t.name }</div>
                                        <div className="text-[10px] text-slate-400 mt-1 font-mono">24.1283, 82.1293</div>
                                    </div>
                                </Popup>
                            </Marker>
                        )) }

                        {/* Danger Zones - Red Pulsing Waves */ }
                        { zones.map(z => (
                            <React.Fragment key={ z._id }>
                                <Marker
                                    position={ [z.location.coordinates[1], z.location.coordinates[0]] }
                                    icon={ L.divIcon({
                                        className: 'custom-icon',
                                        html: showControls
                                            ? '<div class="marker-pulse-red"></div>'
                                            : `<div class="relative w-5 h-5 flex items-center justify-center">
                                                 <div class="absolute w-full h-full bg-red-500 rounded-full opacity-75 animate-ping"></div>
                                                 <div class="relative w-full h-full bg-gradient-to-r from-red-600 via-red-400 to-red-600 rounded-full bg-[length:200%_100%] animate-[shimmer_2s_infinite] border-2 border-white shadow-sm"></div>
                                               </div>`,
                                        iconSize: [20, 20]
                                    }) }
                                >
                                    <Popup className="dark-popup">
                                        <div className="bg-slate-900 p-3 text-center rounded-xl border border-rose-500/30 min-w-[200px]">
                                            <div className="flex justify-center mb-2"><AlertTriangle className="text-rose-500" size={ 24 } /></div>
                                            <div className="text-rose-500 font-black tracking-widest uppercase text-[10px] mb-1">Critical Sector</div>
                                            <div className="text-white font-bold text-lg">{ z.name }</div>
                                        </div>
                                    </Popup>
                                </Marker>
                                <Circle
                                    center={ [z.location.coordinates[1], z.location.coordinates[0]] }
                                    radius={ z.radius || 1000 }
                                    pathOptions={ { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1, dashArray: '5, 10' } }
                                />
                            </React.Fragment>
                        )) }

                        {/* Safe/Destinations - Green Pulsing Waves */ }
                        { destinations.map(d => (
                            <Marker
                                key={ d._id }
                                position={ [d.location.coordinates[1], d.location.coordinates[0]] }
                                icon={ L.divIcon({
                                    className: 'custom-icon',
                                    html: showControls
                                        ? '<div class="marker-pulse-green"></div>'
                                        : `<div class="relative w-5 h-5 flex items-center justify-center">
                                             <div class="absolute w-full h-full bg-emerald-500 rounded-full opacity-75 animate-ping"></div>
                                             <div class="relative w-full h-full bg-gradient-to-r from-emerald-500 via-emerald-300 to-emerald-500 rounded-full bg-[length:200%_100%] animate-[shimmer_2s_infinite] border-2 border-white shadow-sm"></div>
                                           </div>`,
                                    iconSize: [20, 20]
                                }) }
                            >
                                <Popup>
                                    <div className="bg-slate-900 text-white border-none min-w-[150px]">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <div className="font-bold text-[10px] text-emerald-500 uppercase tracking-wide">Safe Zone</div>
                                        </div>
                                        <div className="font-mono text-sm font-bold">{ d.name }</div>
                                    </div>
                                </Popup>
                            </Marker>
                        )) }

                    </MapContainer>
                </div>

                {/* Right Panel - Signal Stream */ }
                { showControls && <div className="bg-slate-900 rounded-3xl border border-slate-800 flex flex-col overflow-hidden relative shadow-inner">
                    {/* Signal Header */ }
                    <div className="p-6 bg-slate-900 border-b border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                                    <Activity size={ 24 } />
                                </div>
                                <div>
                                    <h2 className="text-white font-black uppercase text-xl tracking-tighter">Signal Stream</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">Live Processing</span>
                                    </div>
                                </div>
                            </div>
                            <div className="px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-2 shadow-sm">
                                <Wifi size={ 14 } className="text-indigo-500" />
                                <span className="text-white font-mono text-xs font-bold">1.2 Gbps</span>
                            </div>
                        </div>

                        {/* Tabs */ }
                        <div className="flex gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                            { ['all', 'system', 'uplink', 'alerts'].map(tab => (
                                <button
                                    key={ tab }
                                    onClick={ () => setActiveTab(tab) }
                                    className={ `flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tab ? 'bg-white text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}` }
                                >
                                    { tab }
                                </button>
                            )) }
                        </div>
                    </div>

                    {/* Console Output */ }
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs relative custom-scrollbar bg-slate-950/30">
                        { filteredLogs.map((log, idx) => (
                            log.status === 'CRITICAL' ? (
                                <div key={ idx } className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-xl relative group animate-in fade-in slide-in-from-right-4 mb-2">
                                    <div className="flex justify-between items-center text-[10px] text-rose-500 font-bold mb-2 uppercase tracking-wider">
                                        <span className="opacity-70">[{ log.time }]</span>
                                        <span className="animate-pulse bg-rose-500 text-white px-1.5 py-0.5 rounded-[4px]">CRITICAL</span>
                                    </div>
                                    <div className="text-rose-400 font-bold mb-1 tracking-tight">{ log.source.toUpperCase() }: { log.message }</div>
                                    { log.location && (
                                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded">
                                            <Locate size={ 10 } /> { log.location }
                                        </div>
                                    ) }
                                </div>
                            ) : (
                                <div key={ idx } className="bg-slate-900/50 border border-slate-800/50 p-3 rounded-xl hover:border-slate-700/50 transition animate-in fade-in">
                                    <div className="flex justify-between text-[10px] text-slate-600 font-bold mb-1 uppercase tracking-wider font-mono">
                                        <span>[{ log.time }]</span>
                                        <span className={ log.status.includes('OK') || log.status === 'SECURE' ? 'text-emerald-500' : log.status === 'STABLE' ? 'text-indigo-400' : 'text-amber-500' }>{ log.status }</span>
                                    </div>
                                    <div className="text-slate-400 font-medium">
                                        <span className="text-indigo-400 font-bold">{ log.source }:</span> <span className="text-slate-300">{ log.message }</span>
                                    </div>
                                    { log.location && (
                                        <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                                            <Locate size={ 10 } /> { log.location }
                                        </div>
                                    ) }
                                </div>
                            )
                        )) }
                    </div>

                    {/* Footer / Buffer */ }
                    <div className="p-5 bg-slate-900 border-t border-slate-800">
                        <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">
                            <span className="flex items-center gap-2"><Database size={ 12 } /> Buffer Capacity</span>
                            <span className="text-indigo-400">84.2% Full</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-5">
                            <div className="h-full bg-indigo-500 w-[84%] relative shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-r from-transparent to-white/20"></div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold text-[10px] hover:bg-slate-800 hover:text-white transition uppercase tracking-widest flex items-center justify-center gap-2">
                                <Activity size={ 14 } /> Logs
                            </button>
                            <button onClick={ () => setLogs([]) } className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-[10px] hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20 uppercase tracking-widest flex items-center justify-center gap-2">
                                <Wifi size={ 14 } /> Re-Sync
                            </button>
                        </div>
                    </div>
                </div> }
            </div>
        </div >
    );
};

export default SafetyCommandCenter;
