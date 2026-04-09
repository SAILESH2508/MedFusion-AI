import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Database, Zap, ChevronRight, Layout, Shield, Cpu, Globe, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const MedicalHub = () => {
    const navigate = useNavigate();

    const modules = [
        {
            id: 'ingestion',
            title: 'UPLOAD',
            subtitle: 'Upload Center',
            description: 'Process and analyze medical results instantly.',
            icon: Activity,
            path: '/ingestion',
            color: 'from-orange-500 to-red-600',
            bgLight: 'bg-orange-500/10',
            textColor: 'text-orange-400'
        },
        {
            id: 'archive',
            title: 'RECORDS',
            subtitle: 'Clinical Vault',
            description: 'Secure, encrypted storage for comprehensive telemetry.',
            icon: Database,
            path: '/archive',
            color: 'from-blue-600 to-sky-500',
            bgLight: 'bg-blue-500/10',
            textColor: 'text-blue-400'
        },
        {
            id: 'synthesis',
            title: 'SYNTHESIS',
            subtitle: 'Clinical Correlation',
            description: 'AI-powered cross-referencing of labs and Rx.',
            icon: Zap,
            path: '/telemetry',
            color: 'from-orange-500 to-emerald-500',
            bgLight: 'bg-emerald-500/10',
            textColor: 'text-emerald-400'
        },
        {
            id: 'profile',
            title: 'PROFILE',
            subtitle: 'Clinical Identity',
            description: 'Define biometrics and medical safety barriers.',
            icon: User,
            path: '/profile',
            color: 'from-red-600 to-orange-500',
            bgLight: 'bg-red-500/10',
            textColor: 'text-red-500'
        }
    ];

    return (
        <div className="min-h-screen bg-[#060b26] text-blue-50 flex flex-col relative overflow-hidden bg-gradient-medical">
            <Navbar />

            {/* Background Effects */}
            <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-orange-600/5 blur-[120px] rounded-full -z-10" />
            <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-red-600/5 blur-[120px] rounded-full -z-10" />

            <main className="flex-1 pt-28 px-8 lg:px-16 relative z-10 pb-16">
                {/* Hero section */}
                <div className="max-w-5xl mx-auto mb-16 text-center lg:text-left">
                    <motion.h1
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight"
                    >
                        MedFusion<span className="text-orange-600 italic">AI</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-base text-sky-200 max-w-xl font-medium leading-relaxed mb-10 tracking-wide"
                    >
                        <span className="text-orange-500">Smart diagnostics</span> meet <span className="text-blue-400 font-bold">clinical precision</span>.
                        Access your health insights in seconds.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap items-center gap-6 justify-center lg:justify-start"
                    >
                        <div 
                            onClick={() => navigate('/profile')}
                            className="flex items-center space-x-3 text-red-500 font-black text-[10px] tracking-[0.3em] uppercase cursor-pointer hover:bg-red-600/10 px-3 py-1 rounded-lg transition-all"
                        >
                            <Shield className="w-4 h-4" />
                            <span>CLINICAL PROFILE ACTIVE</span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-white/20" />
                        <div className="flex items-center space-x-3 text-blue-400 font-black text-[10px] tracking-[0.3em] uppercase">
                            <Cpu className="w-4 h-4" />
                            <span>V5.0 PROD-GATEWAY</span>
                        </div>
                    </motion.div>
                </div>

                {/* Grid */}
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {modules.map((module, i) => (
                        <motion.div
                            key={module.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + (i * 0.1) }}
                            whileHover={{ y: -8 }}
                            onClick={() => navigate(module.path)}
                            className="group p-8 rounded-3xl bg-indigo-950/40 backdrop-blur-3xl border border-white/5 cursor-pointer transition-all relative overflow-hidden shadow-xl hover:border-orange-500/30"
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 blur-3xl transition-opacity duration-700`} />

                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110`}>
                                <module.icon className="w-6 h-6 text-white" />
                            </div>

                            <div className="mb-8">
                                <span className={`text-[9px] font-bold tracking-[0.2em] ${module.textColor} mb-2 block uppercase`}>{module.title}</span>
                                <h3 className="text-xl font-bold mb-3 tracking-tight text-white group-hover:text-orange-500 transition-colors">{module.subtitle}</h3>
                                <p className="text-sky-200/90 text-[11px] font-medium leading-relaxed">
                                    {module.description}
                                </p>
                            </div>

                            <div className="flex items-center space-x-2 text-[9px] font-bold text-blue-400 group-hover:text-orange-500 transition-colors tracking-widest">
                                <span>ACCESS CENTER</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Clinical Assistant Section */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="max-w-5xl mx-auto mt-20 p-1 bg-gradient-to-r from-orange-600/20 via-blue-600/20 to-emerald-600/20 rounded-[40px]"
                >
                    <div className="bg-[#060b26]/80 backdrop-blur-3xl rounded-[39px] p-12 flex flex-col lg:flex-row items-center justify-between gap-12 border border-white/5">
                        <div className="flex-1 text-center lg:text-left">
                            <div className="inline-flex items-center space-x-3 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 font-black text-[9px] text-blue-400 uppercase tracking-[0.4em]">
                                Feature Node / Live Chat
                            </div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Clinical <span className="text-blue-500">Assistant</span><span className="text-orange-600">.</span></h2>
                            <p className="text-sky-300/60 font-bold uppercase tracking-widest text-[10px] max-w-md leading-relaxed">
                                Neural-linguistic interface for instant medical queries, titration logic, and diagnostic verification.
                            </p>
                        </div>
                        <div className="w-full lg:w-[400px]">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-600 blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity" />
                                <div className="relative bg-indigo-950/40 border border-white/5 p-8 rounded-[32px] shadow-2xl">
                                    <div className="flex items-center space-x-4 mb-6">
                                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                                            <Zap className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest">System Online</p>
                                            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Active Listening...</p>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Ask about medications or scans..."
                                        className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-[11px] font-bold text-white placeholder:text-blue-400/40 uppercase tracking-widest focus:outline-none focus:border-blue-500/50 transition-all mb-4"
                                    />
                                    <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-orange-600 transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                                        Query Neural Hub
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main >
        </div >
    );
};

export default MedicalHub;
