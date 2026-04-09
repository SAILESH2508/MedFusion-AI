import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2, Zap, Cpu, Activity, FileText } from 'lucide-react';
import api from '../api';

const ClinicalAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, role: 'assistant', content: "Hello! I'm MedFusion AI. How can I help you?", timestamp: new Date() }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        const msg = input;
        setInput('');
        await sendMessage(msg);
    };

    const handleQuickAction = async (text) => {
        await sendMessage(text);
    };

    const sendMessage = async (text) => {
        const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        try {
            const response = await api.post('/chat/', { message: text });
            const botMsg = { id: Date.now() + 1, role: 'assistant', content: response.data.reply, timestamp: new Date() };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            console.error("Chat error:", err);
            const errorMsg = { id: Date.now() + 1, role: 'assistant', content: "I'm having trouble connecting. Please try again.", timestamp: new Date() };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-10 right-10 z-[100]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        className="w-[360px] h-[540px] rounded-3xl bg-indigo-950/90 backdrop-blur-3xl border border-white/5 flex flex-col overflow-hidden mb-6 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-orange-600 to-red-600 p-6 flex justify-between items-center text-white relative">
                            <div className="flex items-center space-x-4 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-[10px] tracking-widest uppercase mb-1">
                                        AI Assistant
                                    </h3>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                        <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">Online</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-blue-400/[0.01]">
                            {messages.map((msg) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex max-w-[85%] space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg border ${msg.role === 'user' ? 'bg-orange-600 text-white border-orange-500 shadow-orange-600/20' : 'bg-indigo-900 text-blue-400 border-white/5 shadow-black/20'}`}>
                                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className={`p-4 rounded-2xl text-[12px] font-medium leading-relaxed shadow-lg relative ${msg.role === 'user' ? 'bg-white text-indigo-950 rounded-tr-none' : 'bg-indigo-900/80 backdrop-blur-xl text-blue-50 rounded-tl-none border border-white/5'}`}>
                                                {msg.content}
                                            </div>
                                            <span className={`text-[8px] text-blue-400/60 mt-2 block font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="flex space-x-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-900 border border-white/5 flex items-center justify-center shadow-lg">
                                            <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                                        </div>
                                        <div className="bg-indigo-900/80 border border-white/5 p-4 rounded-2xl rounded-tl-none flex items-center space-x-1 shadow-md">
                                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" />
                                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce delay-75" />
                                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce delay-150" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions - Unique Feature */}
                        <div className="px-6 pb-4 flex space-x-2 overflow-x-auto scrollbar-hide">
                            {[
                                { label: 'Check Interactions', icon: Zap },
                                { label: 'Analyze Labs', icon: Activity },
                                { label: 'Summary Report', icon: FileText }
                            ].map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleQuickAction(action.label)}
                                    className="flex-shrink-0 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-blue-400 uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all whitespace-nowrap"
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-6 bg-black/20 border-t border-white/5 flex items-center space-x-3">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    className="w-full bg-indigo-900/50 border border-white/5 rounded-xl pl-6 pr-12 py-4 text-xs font-bold text-white focus:border-orange-500/40 transition-all outline-none placeholder:text-blue-500/40 tracking-tight shadow-inner"
                                />
                                <Cpu className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-600 opacity-40" />
                            </div>
                            <button type="submit" disabled={!input.trim() || isTyping} className="bg-gradient-to-br from-orange-600 to-red-600 text-white p-4 rounded-xl disabled:opacity-30 hover:scale-105 active:scale-95 transition-all shadow-lg">
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05, rotate: isOpen ? 0 : 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-18 h-18 rounded-[28px] shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all relative z-50 group border ${isOpen ? 'bg-indigo-950 text-orange-500 border-white/10' : 'bg-gradient-to-br from-orange-600 to-red-600 text-white border-orange-500 shadow-orange-600/30'}`}
                style={{ width: '72px', height: '72px' }}
            >
                {isOpen ? <X className="w-8 h-8 relative z-10" /> : <MessageSquare className="w-8 h-8 relative z-10" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-yellow-500 border-2 border-[#060b26]"></span>
                    </span>
                )}
            </motion.button>

        </div>
    );
};

export default ClinicalAssistant;

