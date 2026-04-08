
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const About = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="glass-nav flex justify-between items-center px-6 md:px-8 py-4 relative z-50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={ () => navigate('/') }>
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">AI</div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">Tourism<span className="text-indigo-600">.</span></span>
                </div>
                <button onClick={ () => navigate('/') } className="text-slate-600 font-medium hover:text-indigo-600">Back Home</button>
            </nav>

            <div className="max-w-3xl mx-auto px-6 py-16">
                <motion.h1
                    initial={ { opacity: 0, y: 20 } }
                    animate={ { opacity: 1, y: 0 } }
                    className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 text-center"
                >
                    Revolutionizing Travel
                </motion.h1>

                <motion.div
                    initial={ { opacity: 0, y: 20 } }
                    animate={ { opacity: 1, y: 0 } }
                    transition={ { delay: 0.2 } }
                    className="prose prose-lg prose-slate mx-auto"
                >
                    <p className="text-xl text-slate-600 mb-6 leading-relaxed">
                        We are a team of explorers, engineers, and dreamers dedicated to making travel safer, smarter, and more personalized using the power of Artificial Intelligence.
                    </p>
                    <p className="text-slate-500 mb-6">
                        AI Tourism Platform was born from a simple idea: what if you had a knowledgeable local guide in your pocket, 24/7? One that knows your preferences, warns you of dangers before they happen, and finds hidden gems that aren't in the guidebooks.
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-10 mb-4">Our Mission</h3>
                    <p className="text-slate-500">
                        To empower every traveler with the confidence to explore the world. We believe that technology should enhance the human experience of discovery, not replace it.
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default About;
