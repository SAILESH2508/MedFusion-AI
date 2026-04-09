import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, ChevronRight, Loader2, Database, Layout, Pill, Clipboard as ClipboardIcon, MapPin, Printer, Droplets, Zap, AlertCircle } from 'lucide-react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const PrescriptionReader = () => {
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
            const response = await api.post('/prescriptions/upload/', formData);
            setResult(response.data.extracted_data || response.data);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            alert("Prescription processing failed.");
        }
    };

    return (
        <div className="min-h-screen bg-[#060b26] flex flex-col bg-gradient-medical text-blue-50">
            <Navbar />

            {/* Workspace Area */}
            <main className="flex-1 p-12 lg:p-20 overflow-y-auto relative pt-32">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 blur-[100px] rounded-full -z-10" />

                <header className="mb-16">
                    <div className="inline-flex items-center space-x-3 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6 font-black text-[9px] text-orange-400 uppercase tracking-[0.4em] shadow-lg shadow-orange-500/5">
                        Document Analysis / OCR Vision
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-4 uppercase">PRESCRIPTION <span className="text-orange-600">READER</span><span className="text-red-600">.</span></h1>
                    <p className="text-sky-300 font-bold uppercase tracking-widest text-[11px] max-w-2xl">Hyper-speed extraction of structured medical semantics from patient prescriptions.</p>
                </header>

                <div className="max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Left: Upload */}
                    <div className="space-y-8">
                        <div className="bg-indigo-950/40 p-10 rounded-[40px] border border-white/5 shadow-2xl backdrop-blur-3xl">
                            <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.6em] mb-10">Rx Ingestion</h3>
                            <label className="block h-80 border-2 border-dashed border-white/10 rounded-[32px] hover:border-orange-500/30 hover:bg-orange-600/5 transition-all cursor-pointer overflow-hidden relative group">
                                <input type="file" className="hidden" onChange={handleFileChange} />
                                {file ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                                        <div className="w-24 h-24 bg-orange-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/50">
                                            <FileText className="w-10 h-10" />
                                        </div>
                                        <div className="text-center px-4">
                                            <p className="font-black text-white truncate max-w-xs text-sm uppercase tracking-widest">{file.name}</p>
                                            <p className="text-[9px] text-orange-400 mt-2 font-bold uppercase tracking-[0.2em]">Analyzing Document...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                                        <div className="w-20 h-20 bg-indigo-900 text-blue-600 rounded-3xl flex items-center justify-center border border-white/5 transition-transform group-hover:scale-110">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <div className="text-center px-6">
                                            <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Drop Prescription Image</p>
                                            <p className="text-[9px] text-blue-800 mt-3 font-black uppercase tracking-widest leading-relaxed">JPG • PNG • PDF Artifacts</p>
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
                                        <span>Executing OCR...</span>
                                    </div>
                                ) : (
                                    <>
                                        <span>Start Discovery</span>
                                        <ChevronRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right: Results */}
                    <AnimatePresence>
                        {!result && !loading && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center p-12 bg-indigo-950/20 rounded-[40px] border border-dashed border-white/5 text-center min-h-[400px]"
                            >
                                <Zap className="w-12 h-12 text-blue-400/20 mb-6" />
                                <h3 className="text-sm font-black text-blue-400/40 uppercase tracking-[0.4em]">Engine Standby</h3>
                                <p className="text-[9px] text-blue-800 mt-3 font-black uppercase tracking-[0.2em]">Ready for pharmaceutical ingestion</p>
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
                                <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">Content Rejection</h3>
                                <p className="text-[10px] text-red-200/60 font-black uppercase tracking-widest max-w-sm leading-relaxed mb-10">
                                    {result.error}
                                </p>
                                <button
                                    onClick={() => setResult(null)}
                                    className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                                >
                                    Re-authenticate Data
                                </button>
                            </motion.div>
                        )}

                        {result && !result.error && (
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-10"
                            >
                                <div className="bg-indigo-900/40 p-12 rounded-[56px] text-white shadow-2xl border border-white/5 relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-12 relative z-10">
                                        <div>
                                            <p className="text-[9px] font-black text-blue-400/30 uppercase tracking-[0.4em] mb-3">Physician Portfolio</p>
                                            <h2 className="text-3xl font-black tracking-tight uppercase tracking-[0.1em]">{result.physician}</h2>
                                        </div>
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => window.print()}
                                                className="bg-white/10 p-4 rounded-2xl backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all shadow-xl shadow-black/20 hover:text-orange-500"
                                            >
                                                <Printer className="w-6 h-6 text-white" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (navigator.share) {
                                                        navigator.share({ title: 'MedFusion Prescription', text: `Orders from ${result.physician}`, url: window.location.href });
                                                    } else {
                                                        navigator.clipboard.writeText(window.location.href);
                                                        alert("Link copied to secure clipboard.");
                                                    }
                                                }}
                                                className="bg-indigo-900 p-4 rounded-2xl border border-white/10 hover:bg-indigo-700 transition-all shadow-xl shadow-black/20 hover:text-blue-400"
                                            >
                                                <Share2 className="w-6 h-6 text-white" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6 relative z-10">
                                        {result.medicines?.map((med, idx) => (
                                            <div key={idx} className="bg-blue-400/[0.03] border border-white/5 p-8 rounded-[32px] flex flex-col space-y-6 backdrop-blur-3xl hover:bg-blue-400/[0.08] transition-all group">
                                                <div className="flex items-start space-x-6">
                                                    <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-orange-500/40 group-hover:scale-110 transition-transform">
                                                        <Pill className="w-7 h-7 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <div>
                                                                <h4 className="font-black text-xl tracking-tight uppercase tracking-widest leading-none text-white">{med.name}</h4>
                                                                <p className="text-[10px] text-orange-500/80 font-bold uppercase tracking-[0.2em] mt-2">{med.company}</p>
                                                            </div>
                                                            <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-md uppercase tracking-widest border border-emerald-500/20">Verified Path</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-3 text-[9px] font-black uppercase tracking-widest">
                                                            <span className="bg-orange-600 text-white px-3 py-1 rounded-lg shadow-lg shadow-orange-600/20">{med.type}</span>
                                                            <span className="bg-white/10 text-white px-3 py-1 rounded-lg border border-white/10">{med.form}</span>
                                                            <span className="bg-indigo-950/60 text-blue-100 px-3 py-1 rounded-lg border border-white/5">{med.dosage}</span>
                                                            <span className="bg-indigo-950/60 text-blue-100 px-3 py-1 rounded-lg border border-white/5">{med.frequency}</span>
                                                            <span className="bg-emerald-600 text-white px-3 py-1 rounded-lg shadow-lg shadow-emerald-600/20">{med.timing}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="p-5 bg-indigo-900/40 rounded-2xl border border-white/5">
                                                        <p className="text-[8px] font-black text-orange-500 uppercase tracking-[0.4em] mb-3">Mechanism of Action</p>
                                                        <p className="text-[10px] text-blue-100/70 leading-relaxed font-bold uppercase tracking-wider">{med.mechanism}</p>
                                                    </div>
                                                    <div className="p-5 bg-indigo-900/40 rounded-2xl border border-white/5">
                                                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.4em] mb-3">Clinical Description</p>
                                                        <p className="text-[10px] text-blue-100/70 leading-relaxed font-bold uppercase tracking-wider">{med.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-12 pt-12 border-t border-white/10">
                                        <p className="text-[9px] font-black text-blue-400/30 uppercase tracking-[0.4em] mb-6">Patient Protocol</p>
                                        <div className="bg-indigo-950/40 p-8 rounded-3xl border border-white/5 backdrop-blur-sm shadow-inner overflow-hidden relative">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 blur-3xl" />
                                            <p className="text-lg text-blue-50 leading-relaxed italic font-bold relative z-10 underline decoration-orange-600/20 uppercase tracking-wide">"{result.instructions}"</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* --- Hidden Prescription Report Template (Print Only) --- */}
            <div className="print-only report-container">
                <div className="report-banner" />
                <div className="report-header">
                    <div className="report-logo">
                        <div className="logo-box" />
                        <div className="logo-text">MedFusion<span style={{ color: '#F97316' }}>AI</span></div>
                    </div>
                    <div className="report-meta">
                        <p><strong>CLINICAL PHARMACEUTICAL TRANSCRIPT</strong></p>
                        <p>STAMP: {new Date().toLocaleDateString()} // {new Date().toLocaleTimeString()}</p>
                        <p>NEURAL NODE: PHARMA-EXTRACT V4.2</p>
                    </div>
                </div>

                <div className="report-section">
                    <div className="section-title">
                        <span>Physician of Record</span>
                        <span style={{ color: '#F97316' }}>ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                    </div>
                    <div className="metrics-grid">
                        <div className="metric-item">
                            <div className="metric-label">Provider Name</div>
                            <div className="metric-value">{result?.physician}</div>
                        </div>
                        <div className="metric-item">
                            <div className="metric-label">Verification Date</div>
                            <div className="metric-value">{result?.date}</div>
                        </div>
                    </div>
                </div>

                <div className="report-section">
                    <div className="section-title">Medication Identification Matrix</div>
                    <table className="medical-table">
                        <thead>
                            <tr>
                                <th>Medication</th>
                                <th>Manufacturer</th>
                                <th>Form</th>
                                <th>Protocol</th>
                                <th>Timing</th>
                                <th>Clinical Purpose</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result?.medicines?.map((med, i) => (
                                <tr key={i}>
                                    <td style={{ verticalAlign: 'top' }}>
                                        <div style={{ fontWeight: 800, fontSize: '11pt' }}>{med.name}</div>
                                        <div style={{ fontSize: '8pt', color: '#718096', fontWeight: 600 }}>{med.type?.toUpperCase()}</div>
                                    </td>
                                    <td style={{ verticalAlign: 'top', fontWeight: 600, color: '#4A5568', fontSize: '10pt' }}>
                                        {med.company}
                                    </td>
                                    <td style={{ verticalAlign: 'top', fontWeight: 700, color: '#4A5568' }}>
                                        {med.form?.toUpperCase()}
                                    </td>
                                    <td style={{ verticalAlign: 'top' }}>
                                        <div style={{ fontWeight: 700 }}>{med.dosage}</div>
                                        <div style={{ fontSize: '9pt', color: '#4A5568' }}>{med.frequency}</div>
                                    </td>
                                    <td style={{ verticalAlign: 'top', fontWeight: 800, color: '#F97316' }}>
                                        {med.timing?.toUpperCase()}
                                    </td>
                                    <td style={{ fontSize: '9.5pt', lineHeight: '1.4', color: '#2D3748' }}>
                                        <strong>{med.mechanism}</strong>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="report-section">
                    <div className="section-title">Clinical Protocol / Instructions</div>
                    <div className="findings-box">
                        <div className="finding-label">Automated Instructions Synthesis</div>
                        <div className="finding-text">"{result?.instructions}"</div>
                    </div>
                </div>

                <div className="footer-stamp">
                    <div className="stamp-text">
                        <p><strong>NEURAL ARCHIVE VERIFIED</strong></p>
                        <p>MedFusion AI Data Intake Pipeline // PHARMA-TX-NODE</p>
                        <p>CONFIDENTIAL: Authorized Medical Personnel Only.</p>
                    </div>
                    <div className="digital-signature">
                        <div className="sig-line" />
                        <div className="sig-text">SYSTEM VALIDATION STAMP</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrescriptionReader;
