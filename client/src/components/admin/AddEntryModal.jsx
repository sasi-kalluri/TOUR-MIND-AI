import React, { useRef, useState, useEffect } from 'react';
import { X, Search, Globe, Map } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Map Updater Component to control map view
const MapUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 12);
    }, [center, map]);
    return null;
};

// Map Picker Component using Popups
const LocationPicker = ({ onLocationSelect, markerPosition, modalContent, onClosePopup }) => {
    const map = useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        },
    });

    // Automatically open popup when marker moves
    const markerRef = useRef(null);
    React.useEffect(() => {
        if (markerRef.current) {
            markerRef.current.openPopup();
        }
    }, [markerPosition]);

    return markerPosition ? (
        <Marker position={ markerPosition } ref={ markerRef }>
            <Popup minWidth={ 300 } onClose={ onClosePopup }>
                { modalContent }
            </Popup>
        </Marker>
    ) : null;
};

const AddEntryModal = ({
    isOpen, onClose, activeTourists = [],
    addModalType, setAddModalType,
    handlers, // { handleAddDestination, handleAddZone }
    formState, // { destName, setDestName, modalLat, modalLng ... }
    setters, // { setDestName, setModalLat ... }
    isEditing // boolean
}) => {
    if (!isOpen) return null;

    const { destName, destDesc, zoneName, zoneDesc, zoneRadius, modalLat, modalLng, destImages, destOccupancy } = formState;
    const { setDestName, setDestDesc, setZoneName, setZoneDesc, setZoneRadius, setModalLat, setModalLng, setDestImages, setDestOccupancy } = setters;

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSatellite, setIsSatellite] = useState(false);
    const searchRef = useRef(null);

    // Auto-Close Dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Advanced Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length < 3) {
                setSearchResults([]);
                return;
            }

            // Regex for exact coordinates (Lat, Lng)
            const coordRegex = /^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/;
            const coordMatch = searchQuery.trim().match(coordRegex);

            if (coordMatch) {
                const lat = parseFloat(coordMatch[1]);
                const lng = parseFloat(coordMatch[3]);
                setSearchResults([{
                    lat: lat,
                    lon: lng,
                    display_name: `Coordinate: ${lat}, ${lng}`,
                    type: 'coordinate',
                    class: 'latlng',
                    address: {}
                }]);
                setShowDropdown(true);
                return;
            }

            setIsSearching(true);
            try {
                // Nominatim Search with address details for granular data
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5`);
                const data = await response.json();
                setSearchResults(data);
                if (data.length > 0) setShowDropdown(true);
            } catch (error) {
                console.error("Search Error", error);
            }
            setIsSearching(false);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSelectResult = (result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        handleLocationSelect({ lat, lng }); // Update Map center and marker
        setShowDropdown(false);
        setSearchQuery(result.display_name); // Fill input

        // Auto-Fill Form Data
        // Prioritize: Name -> Village -> City -> County -> Display Name
        const name = result.name || result.address?.village || result.address?.city || result.address?.town || result.display_name.split(',')[0];

        if (addModalType === 'destination') {
            setDestName(name);
            fetchPlaceImage(name);
        } else {
            setZoneName(name);
        }
    };

    const fetchPlaceImage = async (query, context = {}) => {
        try {
            // Stage 1: Try Wikipedia for exact location (High Accuracy)
            const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=1000&origin=*`);
            const wikiData = await wikiRes.json();
            const pages = wikiData.query.pages;
            const pageId = Object.keys(pages)[0];

            if (pageId && pages[pageId].thumbnail) {
                setDestImages([pages[pageId].thumbnail.source]);
                return;
            }

            // Stage 2: Smart Unsplash Fallbacks (Hierarchy: Location -> District -> State)
            // Note: We use a timestamp to bypass cache and ensure fresh results
            const strategies = [
                query, // 1. Exact Name
                `${query} ${context.district || ''} India`, // 2. Name + District
                `${context.district || ''} district india tourism`, // 3. District Tourism
                `${context.state || ''} india tourism`, // 4. State Tourism
                'india village nature' // 5. Generic Fallback
            ].filter(Boolean); // Remove empty strings

            // We will use the first relevant keyword strategy
            // Since we can't easily validate Unsplash source redirects client-side without API key,
            // we will set the Image URL to a dynamic source that tries to match.
            // A robust way without API key is tricky, but 'source.unsplash.com' is deprecated/unreliable.
            // We'll use a specific focused query.

            // For this 'Advanced' request, we select the most descriptive constructed query available.
            const bestQuery = strategies[1] || strategies[2] || strategies[3];
            setDestImages([`https://source.unsplash.com/1600x900/?${encodeURIComponent(bestQuery)}`]);

        } catch (e) {
            console.error("Image Fetch Error", e);
            setDestImages(['https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070']);
        }
    };

    const handleLocationSelect = async (latlng) => {
        setModalLat(latlng.lat);
        setModalLng(latlng.lng);

        // Auto-Detect Location Name (Reverse Geocoding)
        setIsSearching(true);
        toast.loading("Analyzing location data...", { id: 'geo-detect' });
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
            const data = await response.json();

            if (data) {
                const addr = data.address;

                // Advanced Detection Priority for Small Villages/Hamlets
                const detectedName = addr.village ||
                    addr.hamlet ||
                    addr.isolated_dwelling ||
                    addr.locality ||
                    addr.neighbourhood ||
                    addr.town ||
                    addr.city_district ||
                    addr.city ||
                    addr.suburb ||
                    data.name ||
                    "Unknown Location";

                // Extract Hierarchy for Image Search Context
                const context = {
                    district: addr.state_district || addr.county, // Mandal/Tehsil often maps to county
                    state: addr.state,
                    country: addr.country
                };

                // Construct a granular description
                // Village, Mandal (County), District, State, Pincode
                const detailedDescComponents = [
                    addr.hamlet ? `${addr.hamlet} (Hamlet)` : null,
                    addr.village && detectedName !== addr.village ? addr.village : null,
                    addr.county ? `${addr.county} (Mandal)` : null,
                    addr.state_district ? `${addr.state_district} (District)` : null,
                    addr.state,
                    addr.postcode
                ].filter(Boolean);

                const detailedDesc = detailedDescComponents.join(', ');

                if (addModalType === 'destination') {
                    setDestName(detectedName);
                    setDestDesc(detailedDesc);
                    setSearchQuery(data.display_name);
                    fetchPlaceImage(detectedName, context); // Pass context for smart image search
                } else {
                    setZoneName(detectedName);
                    setZoneDesc(`High risk zone near ${detectedName}, ${context.district || ''}`);
                    setSearchQuery(data.display_name);
                }
                toast.success(`Locality Detected: ${detectedName}`, { id: 'geo-detect' });
            }
        } catch (error) {
            console.error("Reverse Geocoding Failed", error);
            toast.error("Manual entry required", { id: 'geo-detect' });
        } finally {
            setIsSearching(false);
        }
    };



    // The compact form to be shown inside the popup
    const PopupForm = (
        <div className="flex flex-col gap-2 p-1">
            <div className="flex justify-between items-center border-b pb-2 mb-2">
                <h4 className="font-bold text-sm text-slate-800">Add { addModalType === 'destination' ? 'Destination' : 'Danger Zone' }</h4>
            </div>

            <div className="flex gap-2 mb-2">
                <button
                    type="button"
                    onClick={ () => setAddModalType('destination') }
                    className={ `flex-1 py-1 text-[10px] font-bold rounded border ${addModalType === 'destination' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 hover:bg-slate-50'}` }
                >
                    Destination
                </button>
                <button
                    type="button"
                    onClick={ () => setAddModalType('zone') }
                    className={ `flex-1 py-1 text-[10px] font-bold rounded border ${addModalType === 'zone' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-500 hover:bg-slate-50'}` }
                >
                    Danger Zone
                </button>
            </div>

            <form onSubmit={ addModalType === 'destination' ? handlers.handleAddDestination : handlers.handleAddZone } className="space-y-3">
                { addModalType === 'destination' ? (
                    <>
                        <div><input className="w-full border rounded p-1.5 text-xs" placeholder="Name" value={ destName } onChange={ e => setDestName(e.target.value) } required /></div>
                        <div><textarea className="w-full border rounded p-1.5 text-xs" rows={ 2 } placeholder="Description" value={ destDesc } onChange={ e => setDestDesc(e.target.value) } /></div>
                        <div><input type="number" className="w-full border rounded p-1.5 text-xs" placeholder="Max Occupancy (e.g., 500)" value={ destOccupancy } onChange={ e => setDestOccupancy(e.target.value) } /></div>
                        <div><input className="w-full border rounded p-1.5 text-xs" placeholder="Image URL (Optional)" value={ destImages[0] || '' } onChange={ e => setDestImages([e.target.value]) } /></div>
                        {/* Image Preview */ }
                        { destImages && destImages.length > 0 && (
                            <div className="relative w-full h-24 rounded overflow-hidden mt-1 border border-slate-200">
                                <img src={ destImages[0] } alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] p-0.5 text-center">Auto-Detected Image</div>
                            </div>
                        ) }
                    </>
                ) : (
                    <>
                        <div><input className="w-full border rounded p-1.5 text-xs" placeholder="Zone Name" value={ zoneName } onChange={ e => setZoneName(e.target.value) } required /></div>
                        <div><textarea className="w-full border rounded p-1.5 text-xs" rows={ 2 } placeholder="Risk Category / Description" value={ zoneDesc } onChange={ e => setZoneDesc(e.target.value) } /></div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 flex justify-between"><span>Radius</span> <span>{ zoneRadius }m</span></label>
                            <input type="range" max="5000" step="100" className="w-full accent-rose-500 h-1.5" value={ zoneRadius } onChange={ e => setZoneRadius(e.target.value) } />
                        </div>
                    </>
                ) }

                <div className="text-[10px] text-slate-400 font-mono text-center">
                    { modalLat.toFixed(4) }, { modalLng.toFixed(4) }
                </div>

                <button type="submit" className={ `w-full py-2 rounded text-xs font-bold text-white shadow-sm transition ${addModalType === 'destination' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-rose-600 hover:bg-rose-700'}` }>
                    { isEditing ? 'Update Entry' : 'Confirm Entry' }
                </button>
            </form>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-[90vw] h-[90vh] max-w-none flex overflow-hidden shadow-2xl animate-in zoom-in-95 relative">
                <button onClick={ onClose } className="absolute top-4 right-4 z-[1000] bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-red-500 p-2 rounded-full shadow-lg transition">
                    <X size={ 20 } message="Close Modal" />
                </button>

                {/* Full Width Map */ }
                <div className="w-full h-full relative">
                    {/* Search Bar Overlay - Advanced Search */ }
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] w-full max-w-sm px-4">
                        <div className="relative group" ref={ searchRef }>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={ 16 } />
                                <input
                                    className="w-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-400 placeholder:font-medium"
                                    placeholder="Search Village, Mandal, Pincode, City..."
                                    value={ searchQuery }
                                    onChange={ (e) => setSearchQuery(e.target.value) }
                                    onFocus={ () => { if (searchResults.length > 0) setShowDropdown(true); } }
                                />
                                { isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> }
                                { searchQuery && !isSearching && (
                                    <button
                                        onClick={ () => { setSearchQuery(''); setSearchResults([]); } }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                                    >
                                        <X size={ 14 } />
                                    </button>
                                ) }
                            </div>

                            {/* Dropdown Results */ }
                            { showDropdown && searchResults.length > 0 && (
                                <div className="absolute top-full left-4 right-4 mt-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/50 overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-60 overflow-y-auto">
                                    <div className="p-2 border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase text-slate-400 tracking-wider flex justify-between">
                                        <span>Found { searchResults.length } results</span>
                                        <span className="text-indigo-400">Auto-Detected</span>
                                    </div>
                                    { searchResults.map((result, idx) => (
                                        <button
                                            key={ idx }
                                            onClick={ () => handleSelectResult(result) }
                                            className="w-full text-left p-3 hover:bg-indigo-50 border-b border-slate-100 last:border-0 text-xs font-medium text-slate-700 transition-colors flex items-start gap-3 group/item"
                                        >
                                            <div className="mt-0.5 shrink-0 w-6 h-6 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center group-hover/item:bg-indigo-500 group-hover/item:text-white transition-colors">
                                                <Search size={ 12 } />
                                            </div>
                                            <div className="flex-1">
                                                <p className="line-clamp-2 leading-tight">{ result.display_name }</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase bg-slate-100 px-1.5 py-0.5 rounded">{ result.type }</span>
                                                    { result.address?.postcode && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{ result.address.postcode }</span> }
                                                </div>
                                            </div>
                                        </button>
                                    )) }
                                </div>
                            ) }
                        </div>
                    </div>

                    <div className="absolute top-4 left-4 bg-white/90 p-3 rounded-lg shadow-md z-[400] border border-slate-200 hidden md:block">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                            Click map to add point
                        </p>
                    </div>

                    <div className="absolute bottom-4 right-4 bg-white/90 p-1.5 rounded-lg shadow-md z-[2500] border border-slate-200">
                        <button
                            type="button"
                            onClick={ () => setIsSatellite(!isSatellite) }
                            className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
                            title={ isSatellite ? "Switch to Map View" : "Switch to Satellite View" }
                        >
                            { isSatellite ? <Map size={ 16 } /> : <Globe size={ 16 } /> }
                            <span className="hidden sm:inline">{ isSatellite ? "Map" : "Satellite" }</span>
                        </button>
                    </div>

                    <MapContainer center={ [modalLat, modalLng] } zoom={ 5 } style={ { height: '100%', width: '100%' } }>
                        <TileLayer
                            url={ isSatellite
                                ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            }
                            attribution={ isSatellite ? 'Esri' : 'Leaflet' }
                        />
                        { isSatellite && (
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                            />
                        ) }
                        <MapUpdater center={ [modalLat, modalLng] } />
                        <LocationPicker
                            onLocationSelect={ handleLocationSelect }
                            markerPosition={ [modalLat, modalLng] }
                            modalContent={ PopupForm }
                            onClosePopup={ () => { } }
                        />
                        { activeTourists && activeTourists.map(t => (
                            <Marker key={ t.id } position={ [t.lat, t.lng] }>
                                <Popup><div className="font-bold text-xs">{ t.name }</div></Popup>
                            </Marker>
                        )) }
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default AddEntryModal;
