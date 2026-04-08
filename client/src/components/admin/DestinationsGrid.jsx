import React, { useState } from 'react';
import { Plus, ArrowRight, Search, MapPin, DollarSign, Tag, X, Info, Trash2, Edit } from 'lucide-react';

const DestinationsGrid = ({ destinations, onAddSpot, onDeleteSpot, onEditSpot }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDest, setSelectedDest] = useState(null);

    const filteredDestinations = destinations.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            {/* Header & Controls */ }
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="w-full md:w-auto">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Destinations</h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">Manage { destinations.length } verified hotspots</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={ 18 } />
                        <input
                            type="text"
                            placeholder="Search locations..."
                            value={ searchTerm }
                            onChange={ (e) => setSearchTerm(e.target.value) }
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <button
                        onClick={ onAddSpot }
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95 shrink-0"
                    >
                        <Plus size={ 18 } strokeWidth={ 3 } /> <span className="hidden sm:inline">Add New</span>
                    </button>
                </div>
            </div>

            {/* Content Grid */ }
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                { filteredDestinations.length === 0 ? (
                    <div className="col-span-full py-24 text-center">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <MapPin size={ 48 } />
                        </div>
                        <p className="text-slate-400 font-bold text-lg">No destinations found matching your search.</p>
                        <button onClick={ () => setSearchTerm('') } className="mt-4 text-indigo-600 font-bold hover:underline">Clear Search</button>
                    </div>
                ) : (
                    filteredDestinations.map((dest, idx) => {
                        const occupancy = dest.occupancy || Math.floor(Math.random() * 40) + 60;
                        const barColor = occupancy > 90 ? 'bg-rose-500' : occupancy > 70 ? 'bg-amber-500' : 'bg-emerald-500';

                        return (
                            <div key={ dest._id || idx } className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                                {/* Image Area */ }
                                <div className="h-64 relative overflow-hidden bg-slate-100">
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90 z-10"></div>
                                    <img
                                        src={ dest.images && dest.images[0] ? dest.images[0] : `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60` }
                                        alt={ dest.name }
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        onError={ (e) => e.target.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop' }
                                    />

                                    <div className="absolute top-4 left-4 z-20">
                                        <span className="bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                                            <Tag size={ 10 } className="text-indigo-600" /> { dest.category || 'General' }
                                        </span>

                                    </div>

                                    {/* Delete Options Feature as requested by User */ }
                                    { onDeleteSpot && (
                                        <button
                                            onClick={ (e) => { e.stopPropagation(); onDeleteSpot(dest._id); } }
                                            className="absolute top-4 right-4 z-30 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
                                            title="Delete Destination"
                                        >
                                            <Trash2 size={ 14 } strokeWidth={ 2.5 } />
                                        </button>
                                    ) }
                                    {/* Edit Option */ }
                                    { onEditSpot && (
                                        <button
                                            onClick={ (e) => { e.stopPropagation(); onEditSpot(dest); } }
                                            className="absolute top-4 right-14 z-30 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                                            title="Edit Destination"
                                        >
                                            <Edit size={ 14 } strokeWidth={ 2.5 } />
                                        </button>
                                    ) }

                                    <div className="absolute bottom-6 left-6 z-20 right-6">
                                        <h3 className="text-white font-black text-2xl tracking-tight leading-tight mb-2 drop-shadow-lg">{ dest.name }</h3>
                                        <div className="flex items-center gap-4 text-white/80 text-xs font-bold">
                                            <span className="flex items-center gap-1"><MapPin size={ 12 } /> { dest.location?.coordinates ? `${dest.location.coordinates[1].toFixed(2)}°N` : 'Unknown' }</span>
                                            <span className="flex items-center gap-1"><DollarSign size={ 12 } /> { dest.priceLevel || 'Free' }</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Area */ }
                                <div className="p-6 flex-1 flex flex-col">
                                    <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6 line-clamp-2">
                                        { dest.description || 'No description available for this destination. Add details to attract more tourists.' }
                                    </p>

                                    <div className="mt-auto space-y-4">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                    Live Crowd
                                                </span>
                                                <span className={ `text-xs font-black ${occupancy > 90 ? 'text-rose-600' : 'text-slate-900'}` }>{ occupancy }%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div className={ `h-full ${barColor} rounded-full` } style={ { width: `${occupancy}%` } }></div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={ () => setSelectedDest(dest) }
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200"
                                        >
                                            View Full Details <ArrowRight size={ 14 } />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) }
            </div>

            {/* Details Modal */ }
            {
                selectedDest && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={ () => setSelectedDest(null) }></div>
                        <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 border border-white/50">

                            <div className="relative h-80">
                                <img
                                    src={ selectedDest.images?.[0] || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' }
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                                <button
                                    onClick={ () => setSelectedDest(null) }
                                    className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-slate-900 rounded-full flex items-center justify-center transition-all"
                                >
                                    <X size={ 20 } strokeWidth={ 2.5 } />
                                </button>

                                <div className="absolute bottom-8 left-8">
                                    <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3 inline-block shadow-lg">
                                        { selectedDest.category || 'Destination' }
                                    </span>
                                    <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter">{ selectedDest.name }</h2>
                                </div>
                            </div>

                            <div className="p-8 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div className="md:col-span-2 space-y-8">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">About this place</h4>
                                        <p className="text-slate-600 font-medium leading-relaxed text-lg">
                                            { selectedDest.description || 'No detailed description available.' }
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="text-3xl font-black text-slate-900 mb-1">{ selectedDest.occupancy || 85 }%</div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Occupancy</div>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="text-3xl font-black text-slate-900 mb-1">{ selectedDest.priceLevel === 'high' ? '$$$' : '$$' }</div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Price Level</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
                                        <h5 className="font-bold flex items-center gap-2 mb-4">
                                            <MapPin size={ 18 } className="text-indigo-400" /> Location Data
                                        </h5>
                                        <div className="space-y-3 font-mono text-xs opacity-80">
                                            <div className="flex justify-between border-b border-white/10 pb-2">
                                                <span>Latitude</span>
                                                <span>{ selectedDest.location?.coordinates?.[1] || selectedDest.latitude || '0.00' }</span>
                                            </div>
                                            <div className="flex justify-between border-b border-white/10 pb-2">
                                                <span>Longitude</span>
                                                <span>{ selectedDest.location?.coordinates?.[0] || selectedDest.longitude || '0.00' }</span>
                                            </div>
                                        </div>
                                        <div className="mt-6 aspect-video bg-slate-800 rounded-xl overflow-hidden relative">
                                            {/* Mock Map View */ }
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-bold text-xs uppercase tracking-wider">
                                                Satellite Map Feed
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={ () => alert('Feature coming soon!') } className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95">
                                        Edit Destination
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DestinationsGrid;
