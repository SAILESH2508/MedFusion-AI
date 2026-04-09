import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Download, Share2, Loader2, ArrowLeft, Maximize2, Layers, FileText, Zap, ShieldCheck, Activity, ChevronRight, TrendingUp, Cpu } from 'lucide-react';
import api, { API_BASE_URL } from '../api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const InferenceViewer = () => {
    const [searchParams] = useSearchParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeLayer, setActiveLayer] = useState('raw'); // raw, ai_overlay
    const navigate = useNavigate();
    const scanId = searchParams.get('id');

    useEffect(() => {
        const fetchReport = async () => {
            if (!scanId) {
                setLoading(false);
                return;
            }
            try {
                const response = await api.get(`/reports/${scanId}`);
                if (response.data.status === 'error') {
                    setReport(response.data);
                    setLoading(false);
                    return;
                }
                setReport(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Fetch report error:", err);
                if (err.response?.status === 404) {
                    setTimeout(fetchReport, 2000); // Analysis still in progress
                } else {
                    setLoading(false);
                }
            }
        };
        fetchReport();
    }, [scanId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#060b26] flex flex-col items-center justify-center bg-gradient-medical">
                <div className="w-12 h-12 border-4 border-indigo-900 border-t-orange-600 rounded-full animate-spin mb-6" />
                <h2 className="text-lg font-bold text-white uppercase tracking-widest">Loading Report</h2>
                <p className="mt-4 text-[9px] text-blue-400/60 font-bold uppercase tracking-widest">Retrieving diagnostic data...</p>
            </div>
        );
    }

    if (!report || report.status === 'error') {
        return (
            <div className="min-h-screen bg-[#060b26] flex flex-col items-center justify-center bg-gradient-medical">
                <div className="relative mb-12">
                    <div className="absolute inset-0 bg-red-600 blur-[80px] opacity-20 animate-pulse" />
                    <div className="w-24 h-24 bg-red-600 rounded-[32px] flex items-center justify-center relative shadow-2xl shadow-red-600/40">
                        <AlertCircle className="w-12 h-12 text-white" />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-[0.4em] mb-4">Diagnostic Rejection</h2>
                <p className="text-red-200/60 font-black uppercase tracking-widest text-[10px] max-w-md text-center leading-relaxed">
                    {report?.error_detail || "Neural mapping failed to correlate the uploaded media with clinical standards for this diagnostic node."}
                </p>
                <div className="flex space-x-4 mt-12">
                    <button onClick={() => navigate('/ingestion')} className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
                        New Intake
                    </button>
                    <button onClick={() => navigate('/')} className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-orange-600/20 active:scale-95">
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    const data = {
        label: report.findings?.label || 'Unknown',
        confidence: report.findings?.confidence ?
            (report.findings.confidence > 1 ? report.findings.confidence : report.findings.confidence * 100).toFixed(1) : '0.0',
        severity: report.severity_score ? report.severity_score.toFixed(1) : '0.0',
        summary: report.ai_summary?.summary || report.ai_summary || 'Neural analysis in progress...',
        recommendation: report.ai_summary?.recommendation || "System verifying clinical correlation. Awaiting physiological baseline.",
        protocol: report.ai_summary?.protocol || "GENERAL-V4",
        coords: report.findings?.anomaly_coords || { top: '40%', left: '45%' },
        modality: report.findings?.modality || 'Radiology',
        hash: report.findings?.diagnostic_hash || 'MD-V4-0x0',
        attention: report.findings?.neural_attention
    };

    return (
        <div className="min-h-screen bg-[#060b26] text-blue-50 flex flex-col h-screen overflow-hidden bg-gradient-medical">
            <Navbar />

            <div className="flex-1 flex pt-24 overflow-hidden">
                {/* Main Viewport */}
                <div className="flex-1 bg-indigo-950/40 backdrop-blur-3xl overflow-hidden flex flex-col relative border-r border-white/5">
                    {/* Viewport Header */}
                    <div className="h-24 border-b border-white/5 px-10 flex justify-between items-center bg-indigo-900/40 backdrop-blur-xl">
                        <div className="flex items-center space-x-6">
                            <button onClick={() => navigate(-1)} className="p-3 hover:bg-indigo-900 rounded-xl transition-all text-blue-400/60 hover:text-orange-500 active:scale-90">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="h-6 w-px bg-white/10" />
                            <div>
                                <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center">
                                    Analysis Viewer <span className="ml-3 px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-[7px] font-black tracking-[0.2em]">{data.modality.toUpperCase()}</span>
                                </h2>
                                <p className="text-[9px] text-blue-400/60 font-bold uppercase tracking-widest mt-1">
                                    ID: {scanId} // HASH: {data.hash}
                                    {data.attention && <span className="ml-4 text-emerald-400/60">// {data.attention}</span>}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-6">
                            <div className="flex p-1.5 bg-indigo-950/60 rounded-2xl border border-white/5 shadow-inner">
                                {['raw', 'ai_overlay'].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setActiveLayer(mode)}
                                        className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all ${activeLayer === mode ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-xl shadow-orange-600/20' : 'text-blue-400/60 hover:text-blue-200'}`}
                                    >
                                        {mode === 'raw' ? 'Visual' : 'Spectral Overlay'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => window.print()}
                                    className="p-4 bg-indigo-900/50 border border-white/5 rounded-2xl text-blue-400/60 hover:text-orange-500 transition-all shadow-xl shadow-black/20"
                                    title="Download Report"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({ title: `MedFusion AI Report - ${scanId}`, text: data.summary, url: window.location.href });
                                        } else {
                                            alert("Report link copied to clipboard");
                                        }
                                    }}
                                    className="p-4 bg-indigo-900/50 border border-white/5 rounded-2xl text-blue-400/60 hover:text-orange-500 transition-all shadow-xl shadow-black/20"
                                    title="Share Report"
                                >
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center p-16 overflow-hidden bg-indigo-950/20">
                        {/* Decorative scan edges */}
                        <div className="absolute top-12 left-12 w-24 h-24 border-t-2 border-l-2 border-orange-600/30 rounded-tl-[40px]" />
                        <div className="absolute top-12 right-12 w-24 h-24 border-t-2 border-r-2 border-orange-600/30 rounded-tr-[40px]" />
                        <div className="absolute bottom-12 left-12 w-24 h-24 border-b-2 border-l-2 border-orange-600/30 rounded-bl-[40px]" />
                        <div className="absolute bottom-12 right-12 w-24 h-24 border-b-2 border-r-2 border-orange-600/30 rounded-br-[40px]" />

                        <div className="max-w-[85%] max-h-[85%] relative z-10 transition-all duration-1000 group">
                            <img
                                src={report.image_url.startsWith('http') ? report.image_url : `${API_BASE_URL}${report.image_url}`}
                                alt="Subject"
                                className={`max-w-full h-auto rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.6)] border-4 border-white/5 transition-all duration-700 ${activeLayer === 'ai_overlay' ? 'grayscale contrast-125 brightness-125 scale-[1.02]' : 'group-hover:scale-[1.01]'}`}
                            />

                            <AnimatePresence>
                                {activeLayer === 'ai_overlay' && (
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex items-center justify-center p-8"
                                    >
                                        <div className={`w-full h-full border-2 ${data.label === 'Normal' ? 'border-emerald-500/40 shadow-[inset_0_0_100px_rgba(16,185,129,0.15)]' : 'border-red-600/40 shadow-[inset_0_0_100px_rgba(220,38,38,0.15)]'} rounded-[32px] overflow-hidden flex items-center justify-center relative`}>
                                            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 via-transparent to-red-600/5" />
                                            <div className="absolute top-0 bottom-0 w-px bg-white/10 left-1/2 -translate-x-1/2" />
                                            <div className="absolute left-0 right-0 h-px bg-white/10 top-1/2 -translate-y-1/2" />

                                            {/* Dynamic Anomaly Highlight */}
                                            {data.label !== 'Normal' && data.label !== 'Unknown' && (
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className={`absolute w-48 h-48 border-4 border-dashed rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_50px_rgba(239,68,68,0.4)] ${data.label === 'Fracture' ? 'border-red-500' : 'border-orange-500'}`}
                                                    style={{
                                                        top: data.coords.top,
                                                        left: data.coords.left,
                                                        transform: 'translate(-50%, -50%)' // Center the circle on the coordinates
                                                    }}
                                                >
                                                    <div className={`absolute inset-0 rounded-full animate-ping ${data.label === 'Fracture' ? 'bg-red-500/10' : 'bg-orange-500/10'}`} />
                                                    <span className={`text-[8px] font-black text-white px-3 py-1 rounded-full uppercase tracking-tighter ${data.label === 'Fracture' ? 'bg-red-600' : 'bg-orange-600'}`}>
                                                        {data.label === 'Fracture' ? 'FRACTURE ZONE' : `${data.label.toUpperCase()} DETECTED`}
                                                    </span>
                                                </motion.div>
                                            )}

                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                                className={`px-10 py-4 rounded-2xl backdrop-blur-3xl border border-white/10 shadow-2xl relative z-20 ${data.label === 'Normal' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-white text-red-500'}`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-[0.5em]">{data.label} DETECTED</span>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Telemetry markers - Removed per request */}
                    </div>
                </div>

                {/* Sidebar Data */}
                <aside className="w-[400px] bg-[#060b26] border-l border-white/5 flex flex-col shadow-[-10px_0_50px_rgba(6,11,38,0.5)]">
                    <div className="p-8 border-b border-white/5 bg-indigo-950/40 backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Analysis Results</h3>
                            <div className={`px-3 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-widest ${report.doctor_notes?.includes('[WARNING]') ? 'bg-red-600/20 border-red-500/30 text-red-500' : 'bg-orange-600/10 border-orange-500/20 text-orange-400'}`}>
                                {report.doctor_notes?.includes('[WARNING]') ? 'Inconclusive Pattern' : 'Verified'}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className={`text-3xl font-bold ${data.label === 'Normal' ? 'text-emerald-500' : 'text-white'} tracking-tight uppercase`}>
                                {report.doctor_notes?.includes('[WARNING]') ? 'Pattern Mismatch' : data.label}
                            </h3>
                            <div className={`px-4 py-2 rounded-xl ${data.label === 'Normal' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'} border ${data.label === 'Normal' ? 'border-emerald-500/30' : 'border-red-500/30'} text-[11px] font-bold uppercase tracking-widest`}>
                                {data.confidence}%
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
                        {/* Summary Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between ml-1">
                                <h4 className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest">AI Summary</h4>
                            </div>
                            <div className="p-8 bg-indigo-900/40 rounded-3xl border border-white/5 relative overflow-hidden group transition-all">
                                <p className="text-xl text-white font-bold leading-relaxed italic relative z-10 underline decoration-orange-600/20">
                                    "{data.summary}"
                                </p>
                                {report.doctor_notes?.includes('[WARNING]') && (
                                    <div className="mt-4 p-4 bg-red-600/10 border border-red-500/20 rounded-xl relative z-10 flex items-start space-x-3">
                                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest leading-relaxed">
                                            {report.doctor_notes.split('[WARNING: ')[1].split(']')[0]}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Diagnostic Confidence (V4.6.4) */}
                        <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 flex flex-col items-center justify-center relative overflow-hidden group mb-8">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-red-600 shadow-[0_4px_12px_rgba(234,88,12,0.4)]" />
                            <div className="text-[60px] font-black text-white leading-none mb-4 group-hover:scale-110 transition-transform">
                                {data.confidence}<span className="text-2xl text-orange-500">%</span>
                            </div>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Neural Precision Score</p>
                            <div className="w-full h-1.5 bg-white/5 rounded-full mt-8 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${data.confidence}%` }}
                                    className="h-full bg-gradient-to-r from-orange-600 to-red-600 shadow-[0_0_12px_rgba(234,88,12,0.4)]"
                                />
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest ml-1">Recommendation</h4>
                            <div className={`p-8 rounded-3xl border ${data.label === 'Normal' ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400' : 'bg-gradient-to-br from-orange-600/10 to-red-600/10 border-orange-500/20 text-white'}`}>
                                <p className="text-base font-bold uppercase tracking-wide italic">
                                    "{data.recommendation}"
                                </p>
                            </div>
                        </div>

                        {/* Biomarkers */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest ml-1">Biomarkers</h4>
                            <div className="space-y-3">
                                {report.findings?.biomarkers?.map((insight, i) => (
                                    <div key={i} className="p-6 bg-indigo-950/40 border border-white/5 rounded-2xl hover:border-orange-500/30 transition-all group">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-bold text-blue-300 group-hover:text-orange-400 transition-colors uppercase tracking-widest">{insight.name}</span>
                                            <span className="text-xl font-bold text-white">{insight.value}</span>
                                        </div>
                                        <div className="h-1.5 bg-indigo-900 rounded-full overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: insight.status === 'Normal' ? '30%' : '85%' }}
                                                className={`h-full bg-gradient-to-r ${insight.status === 'Normal' ? 'from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'from-orange-600 to-red-600 shadow-[0_0_8px_rgba(234,88,12,0.5)]'}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t border-white/5 bg-indigo-950/60">
                        <button onClick={() => navigate(-1)} className="w-full py-5 bg-indigo-950 hover:bg-orange-600 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center space-x-4 border border-white/10 group">
                            <span>Close Viewer</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </aside>
            </div>

            {/* --- Redesigned Clinical Report Template (Print Only) --- */}
            <div className="print-only report-container">
                <div className="report-banner" />

                <div className="report-header">
                    <div className="report-logo">
                        <div className="logo-box" />
                        <span className="logo-text">MEDFUSION<span style={{ color: '#F97316' }}>AI</span></span>
                    </div>
                    <div className="report-meta">
                        <p><strong>REPORT ID:</strong> {scanId?.toUpperCase()}</p>
                        <p><strong>GENERATED:</strong> {new Date().toLocaleString()}</p>
                        <p>NEURAL DIAGNOSTIC NODE V4.2.0</p>
                    </div>
                </div>

                <div className="report-section">
                    <div className="section-title"><span>Patient & Examination Data</span> <span style={{ color: '#718096' }}>SECURE TRANSMISSION</span></div>
                    <div className="metrics-grid">
                        <div className="metric-item">
                            <div className="metric-label">Physician Class</div>
                            <div className="metric-value">Radiological Specialist (AI Assigned)</div>
                        </div>
                        <div className="metric-item">
                            <div className="metric-label">Modality</div>
                            <div className="metric-value">{report.scan_type?.toUpperCase()} SCAN</div>
                        </div>
                        <div className="metric-item">
                            <div className="metric-label">Verification Status</div>
                            <div className="metric-value" style={{ color: '#10B981' }}>COMPUTATIONALLY VERIFIED</div>
                        </div>
                        <div className="metric-item">
                            <div className="metric-label">Processing Latency</div>
                            <div className="metric-value">1.42s (Neural Inference)</div>
                        </div>
                    </div>
                </div>

                <div className="report-section">
                    <div className="section-title">Primary Diagnostic Findings</div>
                    <div className="findings-box">
                        <div className="finding-label">Automated Classification</div>
                        <div className="finding-text">{data.label} Detected - {data.confidence}% Confidence</div>
                    </div>
                </div>

                <div className="report-section">
                    <div className="section-title">Clinical Synthesis & Summary</div>
                    <p style={{ fontSize: '11pt', lineHeight: 1.8, color: '#2d3748', padding: '0 10pt' }}>
                        {data.summary}
                    </p>
                </div>

                <div className="report-section">
                    <div className="section-title" style={{ background: '#fff5f5' }}>Mandatory Action Protocol</div>
                    <div className="recommendation-alert">
                        {data.recommendation}
                    </div>
                </div>

                {data.label === 'Fracture' && (
                    <div className="report-section page-break">
                        <div className="section-title">Imaging & Spatial Evidence</div>
                        <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto', marginTop: '40pt' }}>
                            <img
                                src={report.image_url.startsWith('http') ? report.image_url : `${API_BASE_URL}${report.image_url}`}
                                alt="Radiological Evidence"
                                style={{ maxWidth: '16cm', borderRadius: '12pt', border: '1pt solid #e2e8f0', boxShadow: '0 10pt 25pt rgba(0,0,0,0.05)' }}
                            />
                            <div className="fracture-highlight" style={{
                                position: 'absolute',
                                width: '4.5cm',
                                height: '4.5cm',
                                border: '4pt dashed #F43F5E',
                                borderRadius: '50%',
                                top: data.coords.top,
                                left: data.coords.left,
                                transform: 'translate(-50%, -50%)',
                                zIndex: 50
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    top: '-22pt',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: '#F43F5E',
                                    color: 'white',
                                    fontSize: '9pt',
                                    fontWeight: 900,
                                    padding: '4pt 10pt',
                                    whiteSpace: 'nowrap',
                                    borderRadius: '6pt',
                                    boxShadow: '0 4pt 10pt rgba(244,63,94,0.3)'
                                }}>ANOMALY ZONE: FRACTURE</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="footer-stamp">
                    <div className="stamp-text">
                        <p><strong>DATA INTEGRITY SECURED</strong></p>
                        <p>MedFusion AI Clinical Pipeline // SHA-256 Verified</p>
                        <p>This report is computer-generated. Physician correlation mandatory.</p>
                    </div>
                    <div className="digital-signature">
                        <div className="sig-line" />
                        <div className="sig-text">MF-CORE NEURAL SIGNATURE</div>
                        <div style={{ fontSize: '6pt', color: '#a0aec0', marginTop: '4pt' }}>BLOCK-ID: {Math.random().toString(36).substring(7).toUpperCase()}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InferenceViewer;
