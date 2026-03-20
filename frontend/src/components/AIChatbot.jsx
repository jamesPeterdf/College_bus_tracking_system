import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import api from '../services/api';

const AIChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Greeting student! I am COBUS AI. How can I help you track your bus today?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const res = await api.post('/ai/chat', { message: input });
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.data.reply
            }]);
        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Ayyayo! Server connection cut aagiruchu pa. Try again in a few mins."
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-neonCyan to-electricPurple rounded-full shadow-[0_0_30px_rgba(0,245,255,0.4)] flex items-center justify-center hover:scale-110 transition-all z-50 border border-slate-300 group"
            >
                <MessageSquare size={32} className="text-foreground group-hover:rotate-12 transition-transform" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                </span>
            </button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 100 }}
                        className="fixed bottom-28 right-8 w-[380px] h-[550px] glass z-50 flex flex-col overflow-hidden border-blue-500/30 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 bg-blue-500/10 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Bot size={20} className="text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold font-outfit">COBUS AI CORE</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-animate-pulse"></div>
                                        <span className="text-[10px] text-emerald-500 font-outfit">SYNCED TO LIVE DATA</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-foreground transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 font-inter custom-scrollbar"
                        >
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                        ? 'bg-deepBlue/40 border border-deepBlue/30 rounded-tr-none'
                                        : 'bg-slate-100 border border-slate-200 rounded-tl-none'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 border border-slate-200 p-3 rounded-2xl rounded-tl-none flex gap-1">
                                        <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></span>
                                        <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-slate-100">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about your bus..."
                                    className="w-full bg-background/50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm outline-none focus:border-blue-500/50 transition-all font-inter"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 top-2 p-1.5 bg-blue-500 text-background rounded-lg hover:scale-105 transition-all"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {['Where is my bus?', 'Route 7B status', 'ETA for Stop 4'].map((hint, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setInput(hint)}
                                        className="whitespace-nowrap px-3 py-1 bg-slate-100 border border-slate-100 rounded-full text-[10px] text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all"
                                    >
                                        {hint}
                                    </button>
                                ))}
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AIChatbot;
