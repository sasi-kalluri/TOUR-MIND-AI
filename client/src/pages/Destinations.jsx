
import { motion } from 'framer-motion';
import { MapPin, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Destinations = () => {
    const navigate = useNavigate();

    // Placeholder data
    const destinations = [
        { id: 1, name: "Kyoto, Japan", rating: 4.9, image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800" },
        { id: 2, name: "Santorini, Greece", rating: 4.8, image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80&w=800" },
        { id: 3, name: "Machu Picchu, Peru", rating: 4.9, image: "https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&q=80&w=800" },
        { id: 4, name: "Maui, Hawaii", rating: 4.7, image: "https://images.unsplash.com/photo-1542259698-3f5f5c3a37d2?auto=format&fit=crop&q=80&w=800" },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="glass-nav flex justify-between items-center px-6 md:px-8 py-4 relative z-50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={ () => navigate('/') }>
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">AI</div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">Tourism<span className="text-indigo-600">.</span></span>
                </div>
                <button onClick={ () => navigate('/') } className="text-slate-600 font-medium hover:text-indigo-600">Back Home</button>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-12">
                <motion.h1
                    initial={ { opacity: 0, y: 20 } }
                    animate={ { opacity: 1, y: 0 } }
                    className="text-4xl font-bold text-slate-900 mb-2"
                >
                    Top Destinations
                </motion.h1>
                <p className="text-slate-500 mb-10 text-lg">Curated spots just for you.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    { destinations.map((dest, i) => (
                        <motion.div
                            key={ dest.id }
                            initial={ { opacity: 0, y: 20 } }
                            animate={ { opacity: 1, y: 0 } }
                            transition={ { delay: i * 0.1 } }
                            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 group cursor-pointer"
                        >
                            <div className="h-48 overflow-hidden">
                                <img src={ dest.image } alt={ dest.name } className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-900 text-lg">{ dest.name }</h3>
                                    <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                                        <Star size={ 14 } fill="currentColor" /> { dest.rating }
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-slate-400 text-sm">
                                    <MapPin size={ 14 } /> <span>Popular Spot</span>
                                </div>
                            </div>
                        </motion.div>
                    )) }
                </div>
            </div>
        </div>
    );
};

export default Destinations;
