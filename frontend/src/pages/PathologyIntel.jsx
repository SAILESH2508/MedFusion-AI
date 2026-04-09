import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, ChevronRight, Loader2, Download, Share2, Activity, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const PathologyIntel = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/pathology/analyze/', formData);
            setResult(response.data);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            alert("Pathology processing failed.");
        }
    };

    return (
        <div className="min-h-screen bg-[#060b26] flex flex-col bg-gradient-medical text-blue-50">
            <Navbar />

            <main className="flex-1 p-12 lg:p-20 overflow-y-auto relative pt-32">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/10 blur-[100px] rounded-full -z-10" />

                <header className="mb-16">
                    <div className="inline-flex items-center space-x-3 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6 font-black text-[9px] text-orange-400 uppercase tracking-[0.4em] shadow-lg shadow-orange-500/5">
                        Data Analysis Node / Biometrics
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-4 uppercase">PATHOLOGY <span className="text-orange-600">INTEL</span><span className="text-red-600">.</span></h1>
                    <p className="text-sky-300 font-bold uppercase tracking-widest text-[11px] max-w-2xl">Advanced biomarker synthesis and metabolic trajectory analysis powered by MedFusion AI.</p>
                </header>

                <div className="max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="space-y-8">
                        <div className="bg-indigo-950/40 p-10 rounded-[40px] border border-white/5 shadow-2xl backdrop-blur-3xl">
                            <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.6em] mb-10">Report Ingestion</h3>
                            <label className="block h-80 border-2 border-dashed border-white/10 rounded-[32px] hover:border-orange-500/30 hover:bg-orange-600/5 transition-all cursor-pointer overflow-hidden relative group">
                                <input type="file" className="hidden" onChange={handleFileChange} />
                                {file ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                                        <div className="w-24 h-24 bg-orange-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/50">
                                            <FileText className="w-10 h-10" />
                                        </div>
                                        <div className="text-center px-4">
                                            <p className="font-black text-white truncate max-w-xs text-sm uppercase tracking-widest">{file.name}</p>
                                            <p className="text-[9px] text-orange-400 mt-2 font-bold uppercase tracking-[0.2em]">Processing Labs...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                                        <div className="w-20 h-20 bg-indigo-900 text-blue-600 rounded-3xl flex items-center justify-center border border-white/5 transition-transform group-hover:scale-110">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <div className="text-center px-6">
                                            <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Drop Pathology Report</p>
                                            <p className="text-[9px] text-blue-800 mt-3 font-black uppercase tracking-widest leading-relaxed">PDF • JPG • DICOM • XML</p>
                                        </div>
                                    </div>
                                )}
                            </label>

                            <button
                                disabled={!file || loading}
                                onClick={handleUpload}
                                className="w-full mt-10 py-6 bg-gradient-to-br from-orange-600 to-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(249,115,22,0.4)] hover:shadow-[0_25px_50px_rgba(249,115,22,0.5)] transition-all flex items-center justify-center space-x-4 disabled:opacity-30 active:scale-95"
                            >
                                {loading ? (
                                    <div className="flex items-center space-x-3">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Decoding Sequence...</span>
                                    </div>
                                ) : (
                                    <>
                                        <span>Initialize Synthesis</span>
                                        <ChevronRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {!result && !loading && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center p-12 bg-indigo-950/20 rounded-[40px] border border-dashed border-white/5 text-center min-h-[400px]"
                            >
                                <TrendingUp className="w-12 h-12 text-blue-400/20 mb-6" />
                                <h3 className="text-sm font-black text-blue-400/40 uppercase tracking-[0.4em]">Biomarker Scanner Standby</h3>
                                <p className="text-[9px] text-blue-800 mt-3 font-black uppercase tracking-[0.2em]">Awaiting diagnostic pathology data</p>
                            </motion.div>
                        )}

                        {result && result.error && (
                            <motion.div
                                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                                className="h-full flex flex-col items-center justify-center p-12 bg-red-600/5 rounded-[40px] border border-red-500/10 text-center min-h-[400px]"
                            >
                                <div className="w-20 h-20 bg-red-600 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl shadow-red-600/30">
                                    <AlertCircle className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">Diagnostic Conflict</h3>
                                <p className="text-[10px] text-red-200/60 font-black uppercase tracking-widest max-w-sm leading-relaxed mb-10">
                                    {result.error}
                                </p>
                                <button
                                    onClick={() => setResult(null)}
                                    className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                                >
                                    Recalibrate Intake
                                </button>
                            </motion.div>
                        )}

                        {result && !result.error && (
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-10"
                            >
                                <div className="bg-indigo-950/40 p-10 rounded-[40px] border border-white/5 shadow-2xl backdrop-blur-3xl">
                                    <div className="flex justify-between items-center mb-10">
                                        <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.6em]">Biomarker Telemetry</h3>
                                        <span className="text-[8px] font-black bg-yellow-400 text-orange-950 px-4 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-yellow-400/20">Core Verified</span>
                                    </div>

                                    <div className="space-y-4">
                                        {result.biomarkers.map((bio, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-6 bg-blue-400/[0.02] rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all group shadow-lg shadow-black/10">
                                                <div>
                                                    <p className="text-[9px] font-black text-blue-400/60 uppercase tracking-[0.3em] mb-2 group-hover:text-orange-400 transition-colors">{bio.name}</p>
                                                    <p className="text-2xl font-black text-white uppercase tracking-tighter">{bio.value}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest shadow-sm ${bio.status === 'Normal' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                                                        bio.status === 'High' ? 'bg-orange-600/20 text-orange-400 border border-orange-600/20' : 'bg-red-600/20 text-red-400 border border-red-600/20'
                                                        }`}>
                                                        {bio.status}
                                                    </span>
                                                    <p className="text-[9px] text-blue-800 mt-3 font-black uppercase tracking-widest opacity-60">REF: {bio.range}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Final Conclusion Section */}
                                <div className="text-center mb-16">
                                    <p className="text-[11px] font-black text-orange-500 uppercase tracking-[0.5em] mb-4">Diagnostic Synthesis Finalized</p>
                                    <h2 className="text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
                                        {result.normalcy_level} <span className="text-blue-500">STATE</span><span className="text-orange-600">.</span>
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                    {/* Normalcy Index Gauge */}
                                    <div className="bg-white/5 border border-white/10 rounded-[56px] p-12 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
                                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-600 to-emerald-500 shadow-[0_0_20px_rgba(234,88,12,0.5)]" />
                                        <div className="text-[80px] font-black text-white leading-none mb-4 group-hover:scale-110 transition-transform duration-500">
                                            {result.normalcy_index}<span className="text-3xl text-blue-500">%</span>
                                        </div>
                                        <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em]">Normalcy Index</p>
                                        <div className="w-full h-2 bg-white/5 rounded-full mt-10 overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${result.normalcy_index}%` }}
                                                className={`h-full bg-gradient-to-r ${result.normalcy_index > 75 ? 'from-emerald-600 to-emerald-400' : 'from-orange-600 to-red-600'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Protocol Section */}
                                    <div className="bg-indigo-900/40 border border-white/5 rounded-[56px] p-12 flex flex-col shadow-2xl justify-center">
                                        <div className="flex items-center space-x-4 mb-8">
                                            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/30">
                                                <ShieldCheck className="w-6 h-6 text-white" />
                                            </div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none transition-all">Action Protocol</h3>
                                        </div>
                                        <ul className="space-y-6">
                                            {result.suggestions?.slice(0, 3).map((sug, i) => (
                                                <li key={i} className="flex items-start space-x-4 group">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-orange-600 mt-1.5 flex-shrink-0 group-hover:scale-150 transition-transform" />
                                                    <p className="text-[11px] font-black text-blue-100 uppercase tracking-widest leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity italic">{sug}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="bg-white/[0.02] border border-white/5 p-12 rounded-[56px] shadow-2xl relative overflow-hidden mb-12">
                                    <div className="flex items-center space-x-4 mb-10 border-b border-white/5 pb-6">
                                        <Activity className="w-6 h-6 text-blue-400" />
                                        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Clinical Synthesis Summary</h3>
                                    </div>
                                    <p className="text-3xl text-white font-black leading-tight italic border-l-8 border-orange-600 pl-10 py-2">
                                        "{result.summary || result.trajectory}"
                                    </p>
                                </div>

                                <div className="bg-indigo-950/40 p-10 rounded-[40px] border border-white/5 backdrop-blur-3xl flex flex-col h-full">
                                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-6 flex items-center">
                                        <CheckCircle2 className="w-4 h-4 mr-3" />
                                        Report Actions
                                    </h4>
                                    <div className="space-y-4 flex-1">
                                        <button
                                            onClick={() => window.print()}
                                            className="w-full flex items-center justify-between p-6 bg-orange-600/10 border border-orange-500/20 rounded-2xl group hover:bg-orange-600 transition-all shadow-xl shadow-orange-600/5"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <Download className="w-5 h-5 text-orange-400 group-hover:text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Export Clinical PDF</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-orange-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (navigator.share) {
                                                    navigator.share({ title: 'MedFusion Pathology Report', text: result.trajectory, url: window.location.href });
                                                } else {
                                                    navigator.clipboard.writeText(window.location.href);
                                                    alert("Transmission Link Copied to Secure Clipboard");
                                                }
                                            }}
                                            className="w-full flex items-center justify-between p-6 bg-indigo-900/40 border border-white/5 rounded-2xl group hover:bg-blue-600 transition-all shadow-xl shadow-black/20"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <Share2 className="w-5 h-5 text-blue-400 group-hover:text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Secure Cloud Share</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* --- Hidden Pathology Report Template (Print Only) --- */}
            < div className="print-only report-container" >
                <div className="report-banner" />
                <div className="report-header">
                    <div className="report-logo">
                        <div className="logo-box" />
                        <div className="logo-text">MedFusion<span style={{ color: '#F97316' }}>AI</span></div>
                    </div>
                    <div className="report-meta">
                        <p><strong>BIOMETRIC PATHOLOGY SYNOPSIS</strong></p>
                        <p>STAMP: {new Date().toLocaleDateString()} // {new Date().toLocaleTimeString()}</p>
                        <p>NEURAL NODE: PATHOLOGY-INTEL V4.2</p>
                    </div>
                </div>

                <div className="report-section">
                    <div className="section-title">Diagnostic Telemetry Summary</div>
                    <table className="medical-table">
                        <thead>
                            <tr>
                                <th>Specific Biomarker</th>
                                <th>Computed Value</th>
                                <th>Clinical Reference</th>
                                <th>Deviation Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result?.biomarkers?.map((bio, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: 700 }}>{bio.name}</td>
                                    <td style={{ fontSize: '14pt', fontWeight: 800 }}>{bio.value}</td>
                                    <td>{bio.range}</td>
                                    <td style={{ fontWeight: 700, color: bio.status === 'High' ? '#F97316' : '#10B981' }}>{bio.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="report-section">
                    <div className="section-title">Final Clinical Synthesis</div>
                    <div className="metrics-grid">
                        <div className="metric-item">
                            <div className="metric-label">Normalcy Index</div>
                            <div className="metric-value" style={{ color: result?.normalcy_index > 75 ? '#10B981' : '#F97316' }}>
                                {result?.normalcy_index}% ({result?.normalcy_level})
                            </div>
                        </div>
                        <div className="metric-item">
                            <div className="metric-label">Diagnostic Summary</div>
                            <div className="metric-value">{result?.summary}</div>
                        </div>
                    </div>
                </div>

                <div className="report-section">
                    <div className="section-title">Mandatory Action Protocol</div>
                    <div className="recommendation-alert">
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {result?.suggestions?.map((sug, i) => (
                                <li key={i} style={{ marginBottom: '5pt', fontSize: '9pt' }}>• {sug}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="footer-stamp">
                    <div className="stamp-text">
                        <p><strong>NEURAL ARCHIVE VERIFIED</strong></p>
                        <p>MedFusion AI Data Intake Pipeline // PATHOLOGY-NODE</p>
                        <p>CONFIDENTIAL: Authorized Medical Personnel Only.</p>
                    </div>
                    <div className="digital-signature">
                        <div className="sig-line" />
                        <div className="sig-text">SYSTEM VALIDATION STAMP</div>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default PathologyIntel;
