import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Sparkles, User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatWidget = ({ isOpen, onClose, messages, onSendMessage, isTyping }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <AnimatePresence>
            { isOpen && (
                <motion.div
                    initial={ { opacity: 0, y: 20, scale: 0.95 } }
                    animate={ { opacity: 1, y: 0, scale: 1 } }
                    exit={ { opacity: 0, y: 20, scale: 0.95 } }
                    className="fixed bottom-24 right-4 md:right-8 w-[90vw] md:w-96 h-[500px] max-h-[70vh] bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 flex flex-col overflow-hidden z-[60]"
                >
                    {/* Header */ }
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Bot className="text-white" size={ 24 } />
                            </div>
                            <div>
                                <h3 className="font-bold text-white leading-none">TouristAI</h3>
                                <p className="text-indigo-100 text-xs flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Online
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={ onClose }
                            className="p-2 hover:bg-white/20 rounded-full transition text-white"
                        >
                            <X size={ 20 } />
                        </button>
                    </div>

                    {/* Messages */ }
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
                        <div className="text-center text-xs text-slate-400 my-4">Today</div>

                        { messages.map((msg, idx) => (
                            <motion.div
                                key={ idx }
                                initial={ { opacity: 0, y: 10 } }
                                animate={ { opacity: 1, y: 0 } }
                                className={ `flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}` }
                            >
                                <div className={ `w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-violet-100 text-violet-600'}` }>
                                    { msg.role === 'user' ? <User size={ 16 } /> : <Sparkles size={ 16 } /> }
                                </div>
                                <div
                                    className={ `max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-200'
                                            : 'bg-white text-slate-700 rounded-tl-none shadow-sm border border-slate-100'
                                        }` }
                                >
                                    { msg.text }
                                </div>
                            </motion.div>
                        )) }

                        { isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                                    <Sparkles size={ 16 } />
                                </div>
                                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        ) }
                        <div ref={ messagesEndRef } />
                    </div>

                    {/* Input Area */ }
                    <div className="p-4 bg-white/50 border-t border-slate-100 backdrop-blur-sm">
                        <form onSubmit={ handleSubmit } className="relative flex items-center gap-2">
                            <input
                                type="text"
                                value={ input }
                                onChange={ (e) => setInput(e.target.value) }
                                placeholder="Ask about places, safety..."
                                className="w-full bg-slate-100 border-none rounded-xl py-3 pl-4 pr-12 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all shadow-inner"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={ !input.trim() || isTyping }
                                className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                            >
                                <Send size={ 16 } strokeWidth={ 2.5 } />
                            </button>
                        </form>
                    </div>
                </motion.div>
            ) }
        </AnimatePresence>
    );
};

export default ChatWidget;
