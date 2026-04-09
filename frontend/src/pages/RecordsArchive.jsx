import React, { useState, useEffect } from 'react';
import { Search, Database, ChevronRight, Filter, Download, User, Activity, Zap, ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const RecordsArchive = () => {
    const [scans, setScans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all");
    const navigate = useNavigate();
    const [showVaultCard, setShowVaultCard] = useState(false);
    const [vaultData, setVaultData] = useState(null);

    const generateVaultCard = async () => {
        try {
            const res = await api.get('/telemetry/emergency');
            setVaultData(res.data);
            setShowVaultCard(true);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [rxRes, pathRes] = await Promise.all([
                    api.get('/prescriptions/'),
                    api.get('/pathology/')
                ]);

                const combined = [
                    ...rxRes.data,
                    ...pathRes.data
                ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                setScans(combined);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load records archive.", err);
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    const filteredScans = scans.filter(s => {
        const basicMatch = idMatch || labelMatch;

        if (filterType === 'critical') {
            return basicMatch && s.label !== 'Normal' && s.label !== 'N/A';
        }
        return basicMatch;
    });

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredScans));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "medical_records.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#060b26] text-blue-50 overflow-hidden bg-gradient-medical">
            <Navbar />

            {/* Main Content */}
            <main className="flex-1 pt-24 px-8 lg:px-16 overflow-y-auto relative pb-12">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-600/5 blur-[100px] rounded-full -z-10" />

                <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div>
                        <h2 className="text-4xl font-bold tracking-tight mb-3">
                            Patient <span className="text-orange-600">Records</span>
                        </h2>
                        <p className="text-sky-200 font-medium text-sm max-w-xl tracking-wide">
                            View and manage your <span className="text-orange-500 font-bold">medical history</span> and <span className="text-blue-400 font-bold">test results</span>.
                        </p>
                    </div>

                    <div className="flex bg-indigo-950/50 backdrop-blur-md p-1 rounded-xl border border-white/5 shadow-xl">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white' : 'text-blue-200 hover:text-blue-100'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterType('critical')}
                            className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${filterType === 'critical' ? 'bg-blue-600 text-white' : 'text-blue-200 hover:text-orange-500'}`}
                        >
                            Alerts
                        </button>
                    </div>
                </header>

                <div className="max-w-6xl mx-auto mb-8 flex gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find records by ID or type..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-indigo-950/40 border border-white/5 rounded-2xl focus:outline-none focus:border-orange-500/50 transition-all font-medium text-white placeholder:text-blue-400/50 text-xs uppercase tracking-widest"
                        />
                    </div>
                    <button
                        onClick={() => {
                            const sorted = [...scans].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                            setScans(sorted);
                        }}
                        className="w-14 h-14 bg-indigo-950/40 border border-white/5 rounded-xl flex items-center justify-center text-blue-400 hover:text-orange-500 transition-all active:scale-95"
                    >
                        <Filter className="w-4 h-4" />
                    </button>
                    <button
                        onClick={generateVaultCard}
                        className="px-6 h-14 bg-red-600/10 border border-red-500/20 rounded-xl flex items-center justify-center text-[9px] font-black text-red-500 uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-xl"
                    >
                        <ShieldAlert className="w-4 h-4 mr-3" />
                        Emergency Vault
                    </button>
                    <button
                        onClick={handleDownload}
                        className="w-14 h-14 bg-indigo-950/40 border border-white/5 rounded-xl flex items-center justify-center text-blue-400 hover:text-orange-500 transition-all active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-6xl mx-auto bg-indigo-950/40 backdrop-blur-3xl rounded-3xl border border-white/5 shadow-xl overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-blue-400/[0.03] border-b border-white/5 text-[10px] font-black text-blue-400/60 uppercase tracking-[0.4em]">
                                    <th className="px-8 py-6 text-left">Identity Hash</th>
                                    <th className="px-8 py-6 text-left">Category</th>
                                    <th className="px-8 py-6 text-left">Outcome Summary</th>
                                    <th className="px-8 py-6 text-left">System State</th>
                                    <th className="px-8 py-6 text-left">Timestamp</th>
                                    <th className="px-8 py-6"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="w-10 h-10 border-2 border-indigo-900 border-t-orange-600 rounded-full animate-spin mb-4" />
                                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Loading Records...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredScans.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-32 text-center text-blue-300 opacity-60">
                                            <Database className="w-12 h-12 mx-auto mb-4 text-orange-600/50" />
                                            <p className="font-bold uppercase tracking-widest text-xs">No records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredScans.map((scan) => (
                                        <tr key={`${scan.type}-${scan.id}`} className="group hover:bg-white/[0.02] transition-colors border-b border-white/5">
                                             <td className="px-8 py-6">
                                                 <div className="flex items-center space-x-3">
                                                     <div className="w-8 h-8 bg-indigo-900 border border-white/5 rounded-lg flex items-center justify-center">
                                                         <Database className="w-4 h-4 text-orange-400" />
                                                     </div>
                                                     <span className="font-mono text-xs font-black text-white uppercase tracking-widest">
                                                         {scan.type.slice(0, 2).toUpperCase()}_{scan.id.toString().padStart(4, '0')}
                                                     </span>
                                                 </div>
                                             </td>
                                             <td className="px-8 py-6">
                                                 <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em]">
                                                     {scan.type}
                                                 </span>
                                             </td>

                                             <td className="px-8 py-6">
                                                 <span className={`text-[9px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest border ${scan.label === 'Normal' || scan.label === 'Lab Report' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                     scan.label === 'N/A' || scan.label === 'Pharmacological Order' ? 'bg-indigo-900/40 text-blue-400 border-white/5' :
                                                         'bg-red-600/10 text-red-500 border-red-600/20 shadow-lg shadow-red-600/5'
                                                     }`}>
                                                     {scan.label === 'N/A' ? 'Awaiting Data' : scan.label}
                                                 </span>
                                             </td>
                                             <td className="px-8 py-6">
                                                 <div className="flex items-center space-x-3">
                                                     <div className={`w-2 h-2 rounded-full animate-pulse ${scan.status === 'completed' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]'}`} />
                                                     <span className={`text-[9px] font-black uppercase tracking-widest ${scan.status === 'completed' ? 'text-emerald-400' : 'text-orange-400'}`}>
                                                         {scan.status}
                                                     </span>
                                                 </div>
                                             </td>
                                             <td className="px-8 py-6">
                                                 <span className="text-[10px] font-black text-blue-200/40 uppercase tracking-widest">{new Date(scan.created_at).toLocaleDateString()}</span>
                                             </td>
                                             <td className="px-8 py-5 text-right">
                                                 {scan.type === 'imaging' && (scan.has_report || scan.status === 'completed' || scan.status === 'error') && (
                                                     <button
                                                         onClick={() => navigate(`/viewer?id=${scan.id}`)}
                                                         className="p-3 bg-indigo-900/30 text-blue-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all active:scale-95"
                                                     >
                                                         <ChevronRight className="w-4 h-4" />
                                                     </button>
                                                 )}
                                             </td>
                                         </tr>
                                     ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
                {/* Emergency Vault Card Modal */}
                <AnimatePresence>
                    {showVaultCard && vaultData && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="w-full max-w-md bg-white rounded-[40px] overflow-hidden shadow-2xl relative"
                            >
                                <div className="bg-red-600 p-8 text-white relative">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] mb-2 opacity-60 font-mono">Emergency Clinical Vault</h3>
                                    <div className="flex items-center justify-between">
                                        <p className="text-3xl font-black italic">{vaultData.name}</p>
                                        <div className="mt-2 flex items-center space-x-4">
                                            <p className="text-xl font-black bg-white text-red-600 px-3 py-1 rounded-lg shadow-xl">{vaultData.blood_group}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-100/60">Blood Type Verified</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowVaultCard(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-10 space-y-8 bg-blue-50 text-indigo-950">
                                    <div className="flex justify-center flex-col items-center">
                                         {/* Digital Signature / QR Proxy */}
                                         <div className="w-32 h-32 bg-white border-4 border-indigo-950/10 p-3 grid grid-cols-4 gap-1 overflow-hidden shadow-inner">
                                             {Array.from({length: 16}).map((_, i) => (
                                                 <div key={i} className={`w-full h-full rounded-[2px] ${ (i * 7) % 5 === 0 ? 'bg-indigo-950' : 'bg-indigo-200/20'}`} />
                                             ))}
                                         </div>
                                         <p className="mt-4 text-[9px] font-black text-indigo-900/40 uppercase tracking-[0.3em]">Neural Verification Matrix</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-8 pt-6 border-t border-indigo-900/10">
                                        <div>
                                            <p className="text-[9px] font-black text-indigo-900/40 uppercase tracking-widest mb-3">Allergies</p>
                                            {vaultData.allergies.length > 0 ? (
                                                vaultData.allergies.map((allg, i) => (
                                                    <p key={i} className="text-[11px] font-black text-red-600 uppercase mb-1">{allg}</p>
                                                ))
                                            ) : <p className="text-[11px] font-bold text-gray-400 uppercase italic">No Allergies Recorded</p>}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-indigo-900/40 uppercase tracking-widest mb-3">Emergency Contact</p>
                                            <p className="text-[14px] font-black italic text-indigo-900 tracking-tight">{vaultData.emergency_contact}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Verified Next of Kin</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 pt-6 border-t border-indigo-900/10">
                                        <div>
                                            <p className="text-[9px] font-black text-indigo-900/40 uppercase tracking-widest mb-3">Active RX</p>
                                            {vaultData.active_rx.slice(0, 2).map((m, i) => (
                                                <p key={i} className="text-[11px] font-bold uppercase text-indigo-900">{m.name}</p>
                                            ))}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-indigo-900/40 uppercase tracking-widest mb-3">Vault ID</p>
                                            <p className="text-[11px] font-mono font-black text-indigo-950 bg-indigo-950/5 px-2 py-1 rounded">{vaultData.vault_id}</p>
                                        </div>
                                    </div>
                                    <p className="text-center text-[9px] font-black text-red-600 uppercase tracking-widest animate-pulse mt-8 flex items-center justify-center">
                                        <ShieldAlert className="w-3 h-3 mr-2" />
                                        PROVISIONED EMERGENCY ACCESS ONLY
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default RecordsArchive;
