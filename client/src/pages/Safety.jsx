
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Safety = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50">
             <nav className="glass-nav flex justify-between items-center px-6 md:px-8 py-4 relative z-50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">AI</div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">Tourism<span className="text-indigo-600">.</span></span>
                </div>
                <button onClick={() => navigate('/')} className="text-slate-600 font-medium hover:text-indigo-600">Back Home</button>
            </nav>

            <div className="max-w-4xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Shield size={32} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Travel Safety First</h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto">Real-time alerts and AI-driven safety scores to keep you secure wherever you go.</p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8">
                     <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Live Danger Zones</h3>
                        </div>
                        <p className="text-slate-500 leading-relaxed">
                            Our AI monitors global news, local reports, and weather patterns to alert you about potential risks in real-time. Avoid areas with civil unrest, natural disasters, or high crime rates.
                        </p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
                    >
                         <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                                <CheckCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Verified Safe Spots</h3>
                        </div>
                        <p className="text-slate-500 leading-relaxed">
                            Discover zones marked as "Green" by our community and official sources. These areas have high safety scores, police presence, and tourist-friendly infrastructure.
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Safety;
