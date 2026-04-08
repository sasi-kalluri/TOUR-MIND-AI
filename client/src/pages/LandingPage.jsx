
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    MapPin, Shield, Bot, Send, MessageCircle,
    Globe, AlertTriangle, Users,
    Lock, Brain, Radio, Headphones, ShieldAlert, CheckCircle,
    Key, Star, ChevronRight, ArrowRight, Menu, X, Fingerprint
} from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { scrollY } = useScroll();

    // Parallax effects
    const y1 = useTransform(scrollY, [0, 500], [0, 100]);
    const y2 = useTransform(scrollY, [0, 500], [0, -100]);
    const opacityHero = useTransform(scrollY, [0, 300], [1, 0]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const [locationInput, setLocationInput] = useState('');

    // Chatbot State
    // Chatbot State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([
        { text: "Namaste! 🙏 I'm your AI guide. Need help with Aadhaar verification or finding safe zones?", sender: 'bot' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, isTyping, isChatOpen]);

    const handleChatSubmit = async () => {
        if (!chatInput.trim()) return;

        // Add User Message
        const userMsg = chatInput.trim();
        const newMsg = { text: userMsg, sender: 'user' };
        setChatMessages(prev => [...prev, newMsg]);
        setChatInput('');
        setIsTyping(true);

        try {
            // Using relative path assuming proxy is set up in vite.config
            // Or use the imported 'api' instance if available, but here we use fetch for simplicity as per existing code, 
            // just fixing the URL to match likely setup or keeping it consistent.
            // Let's use the full consistent URL or reliance on proxy. 
            // The previous code had http://localhost:5000/api/chat. 
            // We should use the relative path '/api/chat' if proxy exists, aka same origin.
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    userInfo: {
                        name: "Guest Visitor",
                        email: "Not Logged In",
                        location: "Landing Page (Unknown)",
                        appliedTours: "None"
                    }
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Failed to fetch response');

            setChatMessages(prev => [...prev, { text: data.response, sender: 'bot' }]);
        } catch (error) {
            console.error("Chat Error", error);
            const errorMsg = error.message || "I'm having trouble connecting to the server. Please check your connection.";
            setChatMessages(prev => [...prev, { text: errorMsg, sender: 'bot' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handlePlanTrip = () => {
        navigate(locationInput.trim() ? '/register' : '/register');
    }

    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <div className="font-sans antialiased bg-slate-50 selection:bg-indigo-500/20 selection:text-indigo-900 overflow-x-hidden w-full">

            {/* Background Gradients */ }
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[300px] sm:w-[500px] md:w-[800px] h-[300px] sm:h-[500px] md:h-[800px] bg-blue-100/40 rounded-full blur-[60px] md:blur-[120px] mix-blend-multiply opacity-70 animate-blob"></div>
                <div className="absolute top-[20%] left-[-10%] w-[250px] sm:w-[400px] md:w-[600px] h-[250px] sm:h-[400px] md:h-[600px] bg-indigo-100/40 rounded-full blur-[50px] md:blur-[100px] mix-blend-multiply opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[300px] sm:w-[500px] md:w-[600px] h-[300px] sm:h-[500px] md:h-[600px] bg-emerald-100/40 rounded-full blur-[60px] md:blur-[100px] mix-blend-multiply opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            {/* Floating Chatbot */ }
            <div className="fixed bottom-6 right-6 z-[100]">
                <AnimatePresence>
                    { isChatOpen && (
                        <motion.div
                            initial={ { opacity: 0, scale: 0.9, y: 20 } }
                            animate={ { opacity: 1, scale: 1, y: 0 } }
                            exit={ { opacity: 0, scale: 0.9, y: 20 } }
                            className="absolute bottom-16 right-0 w-[280px] sm:w-80 bg-white/90 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/50 flex flex-col"
                        >
                            {/* Chat Header */ }
                            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                    <Bot size={ 20 } />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-800">Travel Assistant</p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Online Now</p>
                                    </div>
                                </div>
                                <button
                                    onClick={ () => setIsChatOpen(false) }
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={ 18 } />
                                </button>
                            </div>

                            {/* Chat Messages Area */ }
                            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto no-scrollbar pr-1 flex flex-col">
                                { chatMessages.map((msg, index) => (
                                    <motion.div
                                        key={ index }
                                        initial={ { opacity: 0, x: msg.sender === 'bot' ? -10 : 10 } }
                                        animate={ { opacity: 1, x: 0 } }
                                        className={ `p-3 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] ${msg.sender === 'bot'
                                            ? 'bg-slate-100 text-slate-700 rounded-tl-none self-start'
                                            : 'bg-blue-600 text-white rounded-tr-none self-end shadow-md shadow-blue-500/20'
                                            }` }
                                    >
                                        { msg.text }
                                    </motion.div>

                                )) }
                                { isTyping && (
                                    <motion.div
                                        initial={ { opacity: 0, x: -10 } }
                                        animate={ { opacity: 1, x: 0 } }
                                        className="p-3 rounded-2xl bg-slate-100/50 text-slate-500 rounded-tl-none self-start flex gap-1 items-center h-8"
                                    >
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                    </motion.div>
                                ) }
                                {/* Dummy div for auto-scroll if we add generic scrolling later, though flex-col takes care of most */ }
                                <div ref={ chatEndRef } />
                            </div>

                            {/* Input Area */ }
                            <form onSubmit={ (e) => { e.preventDefault(); handleChatSubmit(); } } className="relative mt-auto">
                                <input
                                    type="text"
                                    value={ chatInput }
                                    onChange={ (e) => setChatInput(e.target.value) }
                                    placeholder="Type your query..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-10 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                                    disabled={ !chatInput.trim() }
                                >
                                    <Send size={ 14 } />
                                </button>
                            </form>
                        </motion.div>
                    )
                    }
                </AnimatePresence>

                <button
                    onClick={ () => setIsChatOpen(!isChatOpen) }
                    className={ `w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer text-white relative overflow-hidden z-[110] ${isChatOpen ? 'bg-red-500 hover:bg-red-600 rotate-90 shadow-red-500/40' : 'bg-slate-900 hover:bg-blue-600 shadow-blue-500/40'}` }
                >
                    { isChatOpen ? <X size={ 24 } /> : <MessageCircle size={ 24 } /> }
                </button>
            </div>

            {/* Navigation */ }
            <nav className={ `fixed top-0 w-full z-50 transition-all duration-500 px-4 md:px-6 lg:px-8 ${scrolled ? 'py-2 sm:py-3' : 'py-4 sm:py-6'}` }>
                <div className={ `max-w-7xl mx-auto flex items-center justify-between rounded-2xl px-4 sm:px-6 py-3 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-slate-200/20 border border-white/40' : 'bg-transparent'}` }>

                    {/* Logo */ }
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:rotate-6 transition-transform duration-300">
                            <Globe size={ 18 } className="sm:w-5 sm:h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-none">AI<span className="text-blue-600">Tourism</span></span>
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 tracking-widest uppercase">Secure Travel</span>
                        </div>
                    </Link>

                    {/* Desktop Menu */ }
                    <div className="hidden md:flex items-center gap-6 lg:gap-8">
                        { ['Workflow', 'Safety Hub', 'Admin Portal', 'Feedback'].map((item, i) => (
                            <a
                                key={ i }
                                href={ `#${item.toLowerCase().split(' ')[0]}` }
                                className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors relative group"
                            >
                                { item }
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                            </a>
                        )) }
                    </div>

                    {/* Actions & Mobile Toggle */ }
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link to="/login" className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
                            Sign In
                        </Link>
                        <Link
                            to="/register"
                            className="bg-slate-900 hover:bg-blue-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-lg hover:shadow-blue-500/25 flex items-center gap-2 group whitespace-nowrap"
                        >
                            Get Started
                            <ArrowRight size={ 14 } className="group-hover:translate-x-0.5 transition-transform sm:w-4 sm:h-4" />
                        </Link>

                        {/* Mobile Menu Button */ }
                        <button
                            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            onClick={ () => setIsMobileMenuOpen(!isMobileMenuOpen) }
                        >
                            { isMobileMenuOpen ? <X size={ 24 } /> : <Menu size={ 24 } /> }
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */ }
                <AnimatePresence>
                    { isMobileMenuOpen && (
                        <motion.div
                            initial={ { opacity: 0, y: -20, height: 0 } }
                            animate={ { opacity: 1, y: 0, height: 'auto' } }
                            exit={ { opacity: 0, y: -20, height: 0 } }
                            className="md:hidden absolute top-full left-4 right-4 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden"
                        >
                            <div className="flex flex-col p-4 text-center space-y-4">
                                { ['Workflow', 'Safety Hub', 'Admin Portal', 'Feedback'].map((item, i) => (
                                    <a
                                        key={ i }
                                        href={ `#${item.toLowerCase().split(' ')[0]}` }
                                        onClick={ () => setIsMobileMenuOpen(false) }
                                        className="text-base font-medium text-slate-600 hover:text-blue-600 py-2 border-b border-slate-50 last:border-0"
                                    >
                                        { item }
                                    </a>
                                )) }
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <Link
                                        to="/login"
                                        onClick={ () => setIsMobileMenuOpen(false) }
                                        className="py-3 rounded-xl bg-slate-50 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        to="/register"
                                        onClick={ () => setIsMobileMenuOpen(false) }
                                        className="py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                    >
                                        Get Started
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ) }
                </AnimatePresence>
            </nav>

            {/* Hero Section */ }
            <header className="relative min-h-[100dvh] flex items-center pt-28 pb-16 sm:pt-32 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-10 lg:gap-20 items-center relative z-10 text-center lg:text-left">

                    {/* Hero Content */ }
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={ staggerContainer }
                        style={ { y: y1, opacity: opacityHero } }
                        className="order-2 lg:order-1"
                    >
                        <motion.div variants={ fadeInUp } className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase mb-6 sm:mb-8 shadow-sm">
                            <Shield size={ 12 } className="text-blue-500" /> Aadhaar-Verified Protocol
                        </motion.div>

                        <motion.h1 variants={ fadeInUp } className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-[1.1] tracking-tight text-slate-900">
                            Explore World <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 animate-gradient-x">Without Fear.</span>
                        </motion.h1>

                        <motion.p variants={ fadeInUp } className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed px-2 sm:px-0">
                            The world's first AI-driven tourism infrastructure that combines <span className="font-semibold text-slate-800">identity verification</span> with <span className="font-semibold text-slate-800">real-time predictive safety</span>.
                        </motion.p>

                        <motion.div variants={ fadeInUp } className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md mx-auto lg:mx-0 mb-8 sm:mb-12 w-full px-2 sm:px-0">
                            <div className="flex-1 relative group w-full">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={ 20 } />
                                <input
                                    type="text"
                                    value={ locationInput }
                                    onChange={ (e) => setLocationInput(e.target.value) }
                                    placeholder="Where to next?"
                                    className="w-full h-12 sm:h-14 bg-white border border-slate-200 rounded-xl sm:rounded-2xl pl-11 sm:pl-12 pr-4 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm group-hover:shadow-md text-sm sm:text-base"
                                />
                            </div>
                            <button
                                onClick={ handlePlanTrip }
                                className="h-12 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 rounded-xl sm:rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 text-sm whitespace-nowrap active:scale-95 w-full sm:w-auto"
                            >
                                Plan Trip <ChevronRight size={ 18 } />
                            </button>
                        </motion.div>

                        <motion.div variants={ fadeInUp } className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-8 border-t border-slate-200/60 pt-6 sm:pt-8 w-full">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-3 sm:-space-x-4">
                                    { [1, 2, 3].map(i => (
                                        <div key={ i } className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-[3px] border-white bg-slate-200 shadow-sm overflow-hidden">
                                            <img src={ `https://i.pravatar.cc/100?u=${i + 10}` } alt="User" className="w-full h-full object-cover" />
                                        </div>
                                    )) }
                                </div>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-[3px] border-white bg-slate-100 flex items-center justify-center text-[10px] sm:text-xs font-bold text-slate-500 shadow-sm">+5k</div>
                            </div>
                            <div className="hidden sm:block h-8 w-px bg-slate-200"></div>
                            <div className="text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-1 text-amber-500 mb-0.5">
                                    { [1, 2, 3, 4, 5].map(s => <Star key={ s } size={ 12 } fill="currentColor" />) }
                                </div>
                                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest">TrustScore 4.9/5</p>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Hero Visual Mockup - Hidden on small mobile to save space */ }
                    <motion.div
                        initial={ { opacity: 0, x: 50 } }
                        animate={ { opacity: 1, x: 0 } }
                        transition={ { duration: 0.8, delay: 0.2 } }
                        style={ { y: y2 } }
                        className="relative hidden md:block order-1 lg:order-2 perspective-1000 mx-auto"
                    >
                        {/* Device Frame */ }
                        <div className="relative mx-auto w-[300px] sm:w-[340px] h-[600px] sm:h-[700px] bg-slate-900 border-[8px] sm:border-[10px] border-slate-900 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden transform rotate-[-6deg] hover:rotate-0 transition-transform duration-700 ease-out-expo ring-1 ring-white/10">
                            {/* Dynamic Island / Notch */ }
                            <div className="absolute top-0 w-full h-6 z-20 flex justify-center">
                                <div className="w-24 sm:w-32 h-5 sm:h-6 bg-black rounded-b-2xl"></div>
                            </div>

                            {/* Screen Content */ }
                            <div className="h-full bg-slate-50 overflow-y-auto no-scrollbar pt-12 sm:pt-14 pb-8 px-4 sm:px-5">
                                {/* Status Header */ }
                                <div className="flex justify-between items-center mb-6 sm:mb-8">
                                    <div>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identity</p>
                                        <div className="flex items-center gap-1.5 text-emerald-600">
                                            <Fingerprint size={ 12 } className="sm:w-[14px] sm:h-[14px]" />
                                            <span className="text-[10px] sm:text-xs font-bold">Verified</span>
                                        </div>
                                    </div>
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                                        <img src="https://i.pravatar.cc/100?u=a" alt="Me" className="w-full h-full object-cover" />
                                    </div>
                                </div>

                                {/* Active Trip Card */ }
                                <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] mb-6 border border-slate-100/50">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Active Trip</div>
                                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">₹45k Budget</span>
                                    </div>
                                    <h3 className="text-slate-900 font-bold mb-1 text-sm sm:text-base">Varanasi Heritage</h3>
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 mb-4 flex items-center gap-1"><MapPin size={ 9 } className="sm:w-[10px]" /> 2.5km to Dashashwamedh Ghat</p>

                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1 h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="w-[70%] h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div>
                                        </div>
                                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-600">70%</span>
                                    </div>
                                </div>

                                {/* Danger Alert */ }
                                <div className="bg-red-50 p-3 sm:p-4 rounded-2xl border border-red-100 mb-4 animate-pulse">
                                    <div className="flex gap-3">
                                        <div className="bg-white p-2 rounded-xl text-red-500 shadow-sm">
                                            <ShieldAlert size={ 16 } className="sm:w-[18px]" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] sm:text-[11px] font-bold text-red-700 uppercase tracking-wide">Danger Zone</p>
                                            <p className="text-[9px] sm:text-[10px] text-red-600/80 mt-0.5 leading-snug">Restricted area detected. Rerouting...</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Nearby Travelers */ }
                                <div className="bg-white/60 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Nearby</p>
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex -space-x-2">
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-100 border-[2px] border-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-purple-600">JD</div>
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 border-[2px] border-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-amber-600">AS</div>
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-pink-100 border-[2px] border-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-pink-600">+3</div>
                                        </div>
                                        <button className="text-[9px] sm:text-[10px] font-bold text-blue-600 bg-blue-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-blue-100 transition-colors">Connect</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Decor elements behind phone */ }
                        <div className="absolute top-10 -right-10 w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl -z-10 rotate-12 opacity-20 blur-xl animate-float"></div>
                        <div className="absolute bottom-20 -left-10 w-32 h-32 bg-gradient-to-tr from-blue-400 to-emerald-400 rounded-full -z-10 blur-2xl opacity-20 animate-float animation-delay-2000"></div>
                    </motion.div>
                </div>
            </header>

            {/* Workflow Section */ }
            <section id="workflow" className="py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={ { once: true, margin: "-100px" } }
                        variants={ fadeInUp }
                        className="text-center mb-12 sm:mb-20"
                    >
                        <span className="text-blue-600 font-bold tracking-widest text-xs uppercase bg-blue-50 px-3 py-1 rounded-full">The Architecture</span>
                        <h2 className="text-3xl lg:text-5xl font-bold mt-4 mb-4 text-slate-900">13-Step Security Protocol</h2>
                        <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto px-4">Synchronized AI-governance for every stage of your trip, ensuring seamless security.</p>
                    </motion.div>

                    <motion.div
                        variants={ staggerContainer }
                        initial="hidden"
                        whileInView="visible"
                        viewport={ { once: true, margin: "-100px" } }
                        className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
                    >
                        { [
                            {
                                icon: <Lock className="w-6 h-6 text-blue-600" />,
                                color: "bg-blue-50",
                                title: "Secure Entry",
                                border: "group-hover:border-blue-200",
                                steps: [
                                    { id: "01", text: "Identity Verification" },
                                    { id: "02", text: "Admin Authorization" }
                                ]
                            },
                            {
                                icon: <Brain className="w-6 h-6 text-emerald-600" />,
                                color: "bg-emerald-50",
                                title: "AI Planning",
                                border: "group-hover:border-emerald-200",
                                steps: [
                                    { id: "06", text: "Budget Optimization" },
                                    { id: "11", text: "Smart Validations" }
                                ]
                            },
                            {
                                icon: <Radio className="w-6 h-6 text-amber-600" />,
                                color: "bg-amber-50",
                                title: "Real-Time",
                                border: "group-hover:border-amber-200",
                                steps: [
                                    { id: "08", text: "Danger Zone Radar" },
                                    { id: "13", text: "Community Alert" }
                                ]
                            },
                            {
                                icon: <Headphones className="w-6 h-6 text-purple-600" />,
                                color: "bg-purple-50",
                                title: "24/7 Support",
                                border: "group-hover:border-purple-200",
                                steps: [
                                    { id: "09", text: "NLP Emergency Bot" },
                                    { id: "10", text: "Live Feedback Loop" }
                                ]
                            }
                        ].map((card, i) => (
                            <motion.div
                                key={ i }
                                variants={ fadeInUp }
                                className={ `group p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${card.border}` }
                            >
                                <div className={ `w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${card.color} flex items-center justify-center mb-6 sm:mb-8 transition-transform group-hover:scale-110 duration-500` }>
                                    { card.icon }
                                </div>
                                <h3 className="text-xl font-bold mb-4 sm:mb-6 text-slate-900">{ card.title }</h3>
                                <ul className="space-y-3 sm:space-y-4">
                                    { card.steps.map((step, j) => (
                                        <li key={ j } className="flex items-start gap-3">
                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5">{ step.id }</span>
                                            <span className="text-sm font-medium text-slate-500 leading-snug group-hover:text-slate-700 transition-colors">{ step.text }</span>
                                        </li>
                                    )) }
                                </ul>
                            </motion.div>
                        )) }
                    </motion.div>
                </div>
            </section>

            {/* Safety Detail Section */ }
            <section id="safety" className="py-20 sm:py-24 bg-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.4]"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={ { once: true } }
                        variants={ fadeInUp }
                        className="order-2 lg:order-1"
                    >
                        <div className="inline-flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-widest bg-red-50 px-4 py-1.5 rounded-full mb-6">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> Priority Protocol
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 sm:mb-8 leading-tight">
                            Safety embedded in <br /><span className="text-blue-600">every coordinate.</span>
                        </h2>

                        <div className="space-y-6">
                            <div className="flex gap-4 sm:gap-5 p-5 sm:p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-red-100 hover:bg-red-50/30 transition-colors group">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white shadow-sm flex-shrink-0 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                    <AlertTriangle size={ 20 } className="sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-2">Restricted Zone Monitoring</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">Passive GPS analysis creates invisible geofences around dangerous areas. If crossed, immediate 2-way admin triggers are activated.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 sm:gap-5 p-5 sm:p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-colors group">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white shadow-sm flex-shrink-0 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                    <Users size={ 20 } className="sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-2">Privacy-Aware Swarm</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">See densities of verified tourists without exposing individual PII. Safety in numbers, digitized.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={ { opacity: 0, scale: 0.9 } }
                        whileInView={ { opacity: 1, scale: 1 } }
                        transition={ { duration: 0.8 } }
                        viewport={ { once: true } }
                        className="order-1 lg:order-2"
                    >
                        {/* Map Visual - Responsive resizing */ }
                        <div className="relative rounded-[2rem] sm:rounded-[3rem] bg-slate-900 p-3 sm:p-4 shadow-2xl overflow-hidden group">
                            {/* Scanning Animation */ }
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/50 shadow-[0_0_20px_2px_rgba(59,130,246,0.5)] z-20 animate-scan pointer-events-none"></div>

                            <div className="bg-slate-800 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 h-[300px] sm:h-[400px] relative overflow-hidden border border-slate-700/50">
                                {/* Map Grid Background */ }
                                <div className="absolute inset-0 opacity-20" style={ { backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' } }></div>

                                <div className="relative z-10 flex justify-between items-center mb-4 sm:mb-8">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                        <span className="text-[10px] sm:text-xs font-mono text-blue-400 uppercase tracking-widest">Live Monitoring</span>
                                    </div>
                                    <code className="hidden sm:block text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded">LAT: 28.6139 | LNG: 77.2090</code>
                                </div>

                                {/* Danger Zones on Map */ }
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <div className="w-36 h-36 sm:w-48 sm:h-48 border border-red-500/30 bg-red-500/10 rounded-full flex items-center justify-center animate-pulse">
                                        <div className="w-24 h-24 sm:w-32 sm:h-32 border border-red-500/50 bg-red-500/10 rounded-full flex items-center justify-center">
                                            <ShieldAlert size={ 24 } className="sm:w-8 sm:h-8 text-red-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* UI Overlays */ }
                                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex gap-3 sm:gap-4">
                                    <div className="flex-1 bg-slate-900/90 backdrop-blur border border-slate-700 p-2 sm:p-3 rounded-xl text-center sm:text-left">
                                        <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-mono mb-1">Status</p>
                                        <p className="text-emerald-400 font-bold text-xs sm:text-sm">System Active</p>
                                    </div>
                                    <div className="flex-1 bg-slate-900/90 backdrop-blur border border-slate-700 p-2 sm:p-3 rounded-xl text-center sm:text-left">
                                        <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-mono mb-1">Threat Level</p>
                                        <p className="text-blue-400 font-bold text-xs sm:text-sm">Low-Moderate</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Admin Section */ }
            <section id="admin" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 lg:p-20 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-gradient-to-b from-blue-600/20 to-purple-600/20 blur-[60px] sm:blur-[100px] rounded-full"></div>

                    <div className="relative z-10 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                        <div className="text-white text-center lg:text-left">
                            <span className="text-blue-400 font-mono text-xs uppercase tracking-widest border border-blue-400/30 px-3 py-1 rounded mb-6 inline-block">Admin Level Access</span>
                            <h2 className="text-3xl sm:text-4xl font-bold mb-6">Secure Command Center</h2>
                            <p className="text-slate-400 mb-8 leading-relaxed text-sm sm:text-base">
                                Requires stringent 3-factor authentication including One-Time Passwords and rotating Dynamic Codes.
                            </p>
                            <ul className="space-y-4 inline-block text-left">
                                { ['Biometric Passkey', 'Google Authenticator Sync', 'Session-Based Encryption'].map((item, i) => (
                                    <li key={ i } className="flex items-center gap-3 text-sm font-medium text-slate-300">
                                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                                            <CheckCircle size={ 12 } className="sm:w-[14px] sm:h-[14px]" />
                                        </div>
                                        { item }
                                    </li>
                                )) }
                            </ul>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-10 rounded-2xl sm:rounded-3xl">
                            <div className="flex flex-col items-center justify-center mb-6 sm:mb-8">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 text-white">
                                    <Key size={ 28 } className="sm:w-8 sm:h-8" />
                                </div>
                                <h3 className="text-white font-bold text-lg">Verification</h3>
                            </div>
                            <div className="flex gap-2 sm:gap-4 mb-6 sm:mb-8 justify-center">
                                { [7, 4, '•', '•'].map((val, i) => (
                                    <div key={ i } className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-center text-white text-lg sm:text-xl font-mono font-bold">
                                        { val }
                                    </div>
                                )) }
                            </div>
                            <button onClick={ () => navigate('/login') } className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 sm:py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 text-sm sm:text-base">
                                Admin Login
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */ }
            <section id="feedback" className="py-20 sm:py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-3xl font-bold text-slate-900">Trusted by Modern Explorers</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
                        { [
                            { name: "Ritesh Kumar", role: "Verified User", text: "The Aadhaar login made me feel the platform is legit. Step 6 optimized my budget perfectly." },
                            { name: "Sneha Gupta", role: "Premium Explorer", text: "Nearby awareness is incredible. Knowing other verified travelers are around is a huge relief." },
                            { name: "Michael D.", role: "Global Tourist", text: "The 24/7 NLP chatbot helped me find an urgent SOS center immediately. Lifesaver!" }
                        ].map((item, i) => (
                            <motion.div
                                key={ i }
                                initial={ { opacity: 0, y: 20 } }
                                whileInView={ { opacity: 1, y: 0 } }
                                transition={ { delay: i * 0.1 } }
                                viewport={ { once: true } }
                                className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center gap-1 text-amber-500 mb-4 sm:mb-6">
                                    { [1, 2, 3, 4, 5].map(s => <Star key={ s } size={ 14 } className="sm:w-4 sm:h-4" fill="currentColor" />) }
                                </div>
                                <p className="text-slate-600 mb-6 sm:mb-8 leading-relaxed font-medium text-sm sm:text-base">"{ item.text }"</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{ item.name.substring(0, 2) }</div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{ item.name }</p>
                                        <p className="text-[10px] font-bold text-blue-600 uppercase">{ item.role }</p>
                                    </div>
                                </div>
                            </motion.div>
                        )) }
                    </div>
                </div>
            </section>

            {/* Footer */ }
            <footer className="py-16 sm:py-20 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12 text-center md:text-left">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                                <Globe size={ 16 } />
                            </div>
                            <span className="text-xl font-bold text-slate-900">AI<span className="text-blue-600">Tourism</span></span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-sm font-medium text-slate-500">
                            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
                            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
                            <a href="#" className="hover:text-blue-600 transition-colors">Security</a>
                            <Link to="/about" className="hover:text-blue-600 transition-colors">About</Link>
                        </div>
                        <p className="text-slate-400 text-sm">© 2025 AI-Tourism Inc.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
