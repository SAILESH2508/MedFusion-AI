import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Shield, TrendingUp, Link as LinkIcon, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';

const ClinicalTelemetry = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [rxRes, pathRes, synthRes, trendRes] = await Promise.all([
                    api.get('/prescriptions/'),
                    api.get('/pathology/'),
                    api.get('/telemetry/synthesis'),
                    api.get('/telemetry/trends/LDL (Bad) Cholesterol')
                ]);
                
                setStats({
                    totalRx: rxRes.data.length,
                    totalLabs: pathRes.data.length,
                    correlations: synthRes.data.correlations,
                    healthScore: synthRes.data.health_score,
                    history: trendRes.data.length > 0 ? trendRes.data.map(p => ({
                        label: p.date,
                        ldl: p.value,
                        status: p.status
                    })) : [
                        { label: 'Baseline', ldl: 100, status: 'Normal' }
                    ]
                });
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="min-h-screen bg-[#060b26] flex items-center justify-center text-blue-400">Synchronizing Telemetry...</div>;

    return (
        <div className="min-h-screen bg-[#060b26] text-blue-50 font-sans selection:bg-orange-500 selection:text-white pb-20">
            <Navbar />
            <div className="pt-32 px-12 lg:px-24">
                <header className="mb-16">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="inline-flex items-center space-x-3 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
                    >
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Integrated Clinical Telemetry Node</span>
                    </motion.div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase mb-2">Health <span className="text-orange-600">Synthesis</span></h1>
                    <p className="text-blue-200/60 uppercase font-bold tracking-widest text-xs">Autonomous Correlation between Pharmacological Orders and Lab Telemetry.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Health Score Gauge */}
                    <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="p-10 bg-indigo-950/40 backdrop-blur-3xl rounded-[40px] border border-white/5 shadow-2xl flex flex-col items-center text-center"
                    >
                        <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-10">Neural Health Score</h3>
                        <div className="relative w-48 h-48 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                    className="text-orange-600"
                                    strokeDasharray={552.92}
                                    strokeDashoffset={552.92 - (552.92 * stats.healthScore) / 100}
                                />
                            </svg>
                            <span className="absolute text-5xl font-black italic">{stats.healthScore}%</span>
                        </div>
                        <p className="mt-8 text-[10px] font-black text-emerald-400 uppercase tracking-widest">Optimal Condition Maintained</p>
                    </motion.div>

                    {/* Quick Stats */}
                    <div className="lg:col-span-2 grid grid-cols-2 gap-8">
                        {[
                            { label: 'Diagnostic Records', val: stats.totalLabs, icon: Database, color: 'text-orange-400' },
                            { label: 'Pharmacological Intakes', val: stats.totalRx, icon: Activity, color: 'text-blue-400' }
                        ].map((stat, i) => (
                            <motion.div 
                                key={i}
                                whileHover={{ y: -5 }}
                                className="p-8 bg-indigo-950/40 backdrop-blur-3xl rounded-[32px] border border-white/5"
                            >
                                <stat.icon className={`w-8 h-8 ${stat.color} mb-6`} />
                                <p className="text-[11px] font-black text-blue-200/40 uppercase tracking-widest mb-2">{stat.label}</p>
                                <p className="text-4xl font-black">{stat.val}</p>
                            </motion.div>
                        ))}
                        
                        {/* Correlation Alert - Unique Feature! */}
                        <div className="col-span-2 p-8 bg-gradient-to-br from-indigo-900/60 to-blue-900/60 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-xl overflow-hidden relative">
                             <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                <LinkIcon className="w-32 h-32 text-white" />
                             </div>
                             <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.5em] mb-6 flex items-center">
                                <LinkIcon className="w-4 h-4 mr-3" />
                                AI Insight / Cross-Correlation
                             </h4>
                             {stats.correlations.length > 0 ? (
                                 stats.correlations.map(c => (
                                     <div key={c.id} className="space-y-4">
                                         <p className="text-xl font-bold italic leading-tight">{c.title}</p>
                                         <p className="text-xs text-blue-100/60 font-medium leading-relaxed max-w-xl">{c.message}</p>
                                     </div>
                                 ))
                             ) : (
                                 <p className="text-xs text-blue-400 italic">No cross-correlation anomalies detected in current timeline.</p>
                             )}
                        </div>
                    </div>

                    {/* Longitudinal Trends */}
                    <div className="lg:col-span-3 p-10 bg-indigo-950/40 backdrop-blur-3xl rounded-[40px] border border-white/5">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em]">Metabolic Trajectory (LDL-C Trends)</h3>
                            <div className="flex space-x-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-orange-600" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-200/60">Biochemical Intake</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="h-64 flex items-end justify-between space-x-4 px-4">
                            {stats.history.map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center">
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(h.ldl / 160) * 100}%` }}
                                        className="w-full max-w-[60px] bg-gradient-to-t from-orange-600/20 to-orange-500 rounded-t-xl relative group"
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-600 text-[10px] px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                            {h.ldl}
                                        </div>
                                    </motion.div>
                                    <p className="mt-6 text-[10px] font-black text-blue-400/40 uppercase tracking-widest">{h.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClinicalTelemetry;
