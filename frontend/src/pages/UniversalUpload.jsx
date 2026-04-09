import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, ChevronRight, Loader2, Activity, Pill, Droplets, Microscope, ShieldCheck, Zap, TrendingUp, AlertCircle, CheckCircle2, Download, Share2 } from 'lucide-react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const UniversalUpload = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [ingestionType, setIngestionType] = useState('prescription');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 10 * 1024 * 1024) {
                setError("FILE MAGNITUDE EXCEEDS SAFETY PROTOCOL (Max 10MB). Please compress document.");
                setFile(null);
            } else {
                setFile(selectedFile);
                setError(null);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setResult(null);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);

        let endpoint = '';
        let params = {};

        if (ingestionType === 'prescription') endpoint = '/prescriptions/upload/';
        else if (ingestionType === 'pathology') endpoint = '/pathology/analyze/';

        try {
            const response = await api.post(endpoint, formData, { params });

            // Safety Check: If backend returned success but with an error field (for non-raised errors)
            if (response.data && response.data.error) {
                setLoading(false);
                setError(response.data.error);
                setResult(null);
                return;
            }

            setResult(response.data);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            setResult(null);
            const errorMessage = err.response?.data?.detail || err.message || "Unknown Conflict";
            console.error("Upload error", err);
            setError(errorMessage);
        }
    };

    return (
        <div className="min-h-screen bg-[#060b26] text-blue-50 flex flex-col relative overflow-hidden bg-gradient-medical">
            <Navbar />

            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[150px] rounded-full -z-10" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-red-600/5 blur-[130px] rounded-full delay-1000 -z-10" />

            <main className="flex-1 pt-24 px-8 lg:px-16 relative z-10 pb-12">
                <header className="max-w-6xl mx-auto mb-12">
                    <h2 className="text-2xl font-bold tracking-tight mb-2 uppercase">
                        Clinical <span className="text-orange-600">Data Intake</span>
                    </h2>
                    <p className="text-sm text-sky-200/90 font-medium">
                        Securely process medical documents for automated diagnostic insight.
                    </p>
                </header>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="space-y-8">
                        {/* Selector */}
                        <div className="p-1 rounded-2xl bg-indigo-950/40 backdrop-blur-3xl border border-white/5 flex gap-1">
                            {[
                                { id: 'prescription', label: 'Pharmacological Orders', term: 'Prescriptions', icon: Pill, color: 'bg-orange-600', detail: 'Upload medical charts or prescriptions given by your doctor.' },
                                { id: 'pathology', label: 'Diagnostic Pathology', term: 'Lab Reports', icon: Droplets, color: 'bg-yellow-500', detail: 'Upload your lab test results or health report values.' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => { setIngestionType(type.id); setResult(null); setError(null); }}
                                    className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition-all ${ingestionType === type.id ? `${type.color} text-white shadow-lg` : 'text-blue-200 hover:text-orange-500'}`}
                                >
                                    <type.icon className="w-3.5 h-3.5" />
                                    <span className="font-bold text-[10px] uppercase tracking-widest">{type.id === 'prescription' ? 'Pharmacology' : 'Pathology'}</span>
                                </button>
                            ))}
                        </div>

                        <div className="px-6 py-4 bg-indigo-900/20 border border-white/5 rounded-2xl">
                            <p className="text-[11px] text-blue-100 font-medium leading-relaxed">
                                {[
                                    { id: 'prescription', detail: 'Upload medical charts or prescriptions given by your doctor.' },
                                    { id: 'pathology', detail: 'Upload your lab test results or health report values.' }
                                ].find(t => t.id === ingestionType).detail}
                            </p>
                        </div>




                        {/* Dropzone */}
                        <div className="bg-indigo-950/40 backdrop-blur-3xl p-8 rounded-[32px] border border-white/5 shadow-xl relative group transition-all">
                            <label className="block h-56 border border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-orange-600/30 hover:bg-orange-600/5 transition-all flex flex-col items-center justify-center">
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept={
                                    ingestionType === 'prescription' ? '.pdf,.jpg,.jpeg,.png,.tiff' : '.pdf,.json,.csv'
                                    }
                                />
                                {file ? (
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-lg mb-3">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <p className="font-bold text-white truncate max-w-[200px] text-[10px] uppercase tracking-widest">{file.name}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Upload className="w-6 h-6 text-blue-300 mb-3" />
                                        <p className="font-bold text-blue-200 uppercase tracking-widest text-[9px]">Select Document</p>
                                    </div>
                                )}
                            </label>

                            <button
                                disabled={!file || loading}
                                onClick={handleUpload}
                                className="w-full mt-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-orange-600/20 active:scale-95 transition-all"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center space-x-3">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Processing...</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center space-x-3">
                                        <span>Start Analysis</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </span>
                                )}
                            </button>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start space-x-4 shadow-[0_0_30px_rgba(239,68,68,0.1)] mt-6"
                                >
                                    <div className="p-2 bg-red-500 text-white rounded-lg">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-1">
                                            {error.includes('Modality') || error.includes('Conflict') ? 'Neural Protocol Blocked' : 'Diagnostic Conflict Detected'}
                                        </h4>
                                        <p className="text-[11px] text-white/80 leading-relaxed font-bold uppercase tracking-tight">
                                            {error.includes('Modality') || error.includes('Conflict')
                                                ? `SYSTEM STATUS: AWAITING CORRECT INGESTION — ${error}`
                                                : error}
                                        </p>
                                        <button
                                            onClick={() => { setError(null); setFile(null); }}
                                            className="mt-3 text-[8px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest flex items-center group"
                                        >
                                            <Zap className="w-3 h-3 mr-2 animate-pulse" />
                                            Reset Portal for New Ingestion
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Results Container */}
                    <AnimatePresence mode="wait">
                        {!result ? (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="h-full border border-white/5 rounded-[32px] flex flex-col items-center justify-center p-12 text-center bg-indigo-950/20 backdrop-blur-xl"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-indigo-900/60 border border-white/5 mb-6 flex items-center justify-center shadow-xl">
                                    <Activity className="w-5 h-5 text-blue-400/40" />
                                </div>
                                <h3 className="text-lg font-bold uppercase tracking-widest text-white/90">Awaiting Ingestion</h3>
                                <p className="text-[9px] text-blue-300 mt-3 font-bold uppercase tracking-[0.2em]">Ready for transmission</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                className="space-y-6 h-full"
                            >
                                {result.error ? (
                                    <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl h-full flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-red-600/20">
                                            <AlertCircle className="w-8 h-8 text-white" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-4 leading-tight">Domain Analysis Failed</h2>
                                        <p className="text-[10px] text-red-200 font-bold uppercase tracking-wider max-w-xs leading-relaxed opacity-80 mb-8">
                                            {result.error}
                                        </p>
                                        <button
                                            onClick={() => { setResult(null); setError(null); }}
                                            className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-95"
                                        >
                                            Reset Portal
                                        </button>
                                    </div>
                                ) : ingestionType === 'prescription' && result.extracted_data ? (
                                    <div className="bg-indigo-950/40 backdrop-blur-3xl p-8 rounded-3xl border border-white/5 shadow-xl h-full flex flex-col">
                                        {/* ... prescription UI already there ... */}
                                        <div className="flex justify-between items-start mb-10">
                                            <div>
                                                <div className="inline-flex px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[8px] font-bold uppercase tracking-widest mb-3 border border-emerald-500/20">Analysis Complete</div>
                                                <h2 className="text-2xl font-bold tracking-tight mb-1 text-white uppercase">{result.extracted_data.physician}</h2>
                                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{result.extracted_data.date} • Verified</p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button onClick={() => window.print()} className="p-3 bg-indigo-900 border border-white/5 rounded-xl shadow-lg hover:text-orange-500 transition-all"><Download className="w-5 h-5" /></button>
                                                <div className="p-3 bg-orange-600 rounded-xl shadow-lg">
                                                    <ShieldCheck className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-10 flex-1">
                                            {result.extracted_data.medicines?.map((med, i) => (
                                                <div key={i} className="bg-blue-400/[0.02] border border-white/5 rounded-[32px] p-8 flex flex-col space-y-6 hover:border-orange-500/30 transition-all group">
                                                    <div className="flex items-start space-x-6">
                                                        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-xl shadow-blue-600/20">RX</div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-center mb-3">
                                                                <h4 className="font-black text-xl text-white uppercase tracking-widest">{med.name}</h4>
                                                                <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-md border border-emerald-500/20 uppercase">Core Verified</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-3 text-[9px] font-black uppercase tracking-widest">
                                                                <span className="bg-orange-600 text-white px-3 py-1 rounded-lg">{med.type}</span>
                                                                <span className="bg-white/10 text-white px-3 py-1 rounded-lg border border-white/10">{med.dosage}</span>
                                                                <span className="bg-emerald-600 text-white px-3 py-1 rounded-lg">{med.timing}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-indigo-950/40 backdrop-blur-3xl p-8 rounded-3xl border border-white/5 shadow-xl h-full flex flex-col">
                                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                                            <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Resulting Biomarkers</h3>
                                            <div className="flex items-center space-x-2">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Complete</span>
                                            </div>
                                        </div>
                                        <div className="mb-10 text-center">
                                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mb-4">Final Clinical Analysis</p>
                                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">
                                                {result.normalcy_level} <span className="text-blue-500">STATE</span>
                                            </h2>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8 mb-10">
                                            <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 flex flex-col items-center justify-center">
                                                <div className="text-[60px] font-black text-white leading-none mb-4">
                                                    {result.normalcy_index}<span className="text-2xl text-blue-500">%</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Normalcy Index</p>
                                            </div>
                                            <div className="bg-indigo-900/40 border border-white/5 rounded-[40px] p-10 flex flex-col justify-center">
                                                <p className="text-lg text-white font-bold leading-relaxed italic border-l-4 border-orange-500 pl-6">
                                                    "{result.summary}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* --- Redesigned Shared Clinical Report Template (Print Only) --- */}
            <div className="print-only report-container">
                <div className="report-banner" />

                <div className="report-header">
                    <div className="report-logo">
                        <div className="logo-box" />
                        <span className="logo-text">MEDFUSION<span style={{ color: '#F97316' }}>AI</span></span>
                    </div>
                    <div className="report-meta">
                        <p><strong>REPORT TYPE:</strong> CLINICAL SUMMARY</p>
                        <p><strong>DATE:</strong> {new Date().toLocaleDateString()}</p>
                        <p>NEURAL ARCHIVE V2.1.0</p>
                    </div>
                </div>

                {result && ingestionType === 'prescription' && result.extracted_data && (
                    <>
                        <div className="report-section">
                            <div className="section-title">Ingestion Source & Verification</div>
                            <div className="metrics-grid">
                                <div className="metric-item">
                                    <div className="metric-label">Issuing Physician</div>
                                    <div className="metric-value">{result.extracted_data.physician}</div>
                                </div>
                                <div className="metric-item">
                                    <div className="metric-label">Document Date</div>
                                    <div className="metric-value">{result.extracted_data.date}</div>
                                </div>
                                <div className="metric-item">
                                    <div className="metric-label">Integrity Status</div>
                                    <div className="metric-value" style={{ color: '#10B981' }}>OCR VERIFIED</div>
                                </div>
                                <div className="metric-item">
                                    <div className="metric-label">Specialty Class</div>
                                    <div className="metric-value">General Pharmacology</div>
                                </div>
                            </div>
                        </div>

                        <div className="report-section">
                            <div className="section-title">Pharmacological Orders</div>
                            <table className="medical-table">
                                <thead>
                                    <tr>
                                        <th>Medication</th>
                                        <th>Manufacturer</th>
                                        <th>Form</th>
                                        <th>Protocol</th>
                                        <th>Timing (Food)</th>
                                        <th>Mechanism / Purpose</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.extracted_data?.medicines?.map((med, i) => (
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
                                                <div style={{ fontSize: '8.5pt', marginTop: '3pt', opacity: 0.8 }}>{med.description}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="report-section">
                            <div className="section-title">Prescribing Physician Notes</div>
                            <div className="findings-box">
                                <div className="finding-label">Primary Recommendations</div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {result.extracted_data.recommendations?.map((rec, i) => (
                                        <li key={i} style={{ fontSize: '11pt', fontWeight: 600, color: '#2d3748', marginBottom: '8pt', paddingLeft: '15pt', position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 0, color: '#F97316' }}>•</span>
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </>
                )}

                {result && ingestionType === 'pathology' && result.biomarkers && (
                    <>
                        <div className="report-section">
                            <div className="section-title">Biometric Telemetry Matrix</div>
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
                                    {result.biomarkers?.map((bio, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 700 }}>{bio.name}</td>
                                            <td style={{ fontSize: '12pt', fontWeight: 800 }}>{bio.value}</td>
                                            <td style={{ color: '#718096' }}>{bio.range}</td>
                                            <td style={{ fontWeight: 700, color: bio.status === 'High' ? '#F43F5E' : '#10B981' }}>{bio.status}</td>
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
                                    <div className="metric-value" style={{ color: result.normalcy_index > 75 ? '#10B981' : '#F97316' }}>
                                        {result.normalcy_index}% ({result.normalcy_level})
                                    </div>
                                </div>
                                <div className="metric-item">
                                    <div className="metric-label">Clinical Conclusion</div>
                                    <div className="metric-value">{result.summary}</div>
                                </div>
                            </div>
                        </div>

                        <div className="report-section">
                            <div className="section-title">Mandatory Action Protocol</div>
                            <div className="recommendation-alert">
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {result.suggestions?.map((sug, i) => (
                                        <li key={i} style={{ marginBottom: '5pt', fontSize: '9pt' }}>• {sug}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </>
                )}

                <div className="footer-stamp">
                    <div className="stamp-text">
                        <p><strong>NEURAL ARCHIVE VERIFIED</strong></p>
                        <p>MedFusion AI Data Intake Pipeline // ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                        <p>CONFIDENTIAL: Authorized Medical Personnel Only.</p>
                    </div>
                    <div className="digital-signature">
                        <div className="sig-line" />
                        <div className="sig-text">SYSTEM VALIDATION STAMP</div>
                        <div style={{ fontSize: '6pt', color: '#a0aec0', marginTop: '4pt' }}>MD-ENC: 0x{Math.random().toString(16).substring(2, 10).toUpperCase()}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UniversalUpload;
