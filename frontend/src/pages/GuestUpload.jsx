import React, { useState, useEffect, useContext } from 'react';
import { 
  Upload as UploadIcon, 
  CheckCircle, 
  Cpu, 
  FileText, 
  ArrowRight,
  Database,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Download,
  FileCheck,
  X,
  Pill,
  Activity,
  User,
  ShieldCheck,
  Check,
  Zap,
  Lightbulb,
  Layers,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import { SidebarContext } from '../context/SidebarContext';
import { getHasShownGuestPopup, setHasShownGuestPopup } from '../services/utils';
import MedicalReadingBar from '../components/MedicalReadingBar';

function GuestUpload({ openAuth }) {
  const { setSidebarContent } = useContext(SidebarContext);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [docType, setDocType] = useState('Prescription (Rx)');
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLog, setScanLog] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Generate and cleanup object URLs for image previews
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (!dropped) return;
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(dropped.type)) { setError('Unsupported file type. Please upload a JPG, PNG, or PDF.'); return; }
    if (dropped.size > 16 * 1024 * 1024) { setError('File too large. Maximum size is 16MB.'); return; }
    setError(''); setFile(dropped); setResult(null);
  };

  useEffect(() => {
    if (openAuth && !getHasShownGuestPopup()) {
      openAuth('patient', 'You are currently in guest mode. Login or create an account to unlock your digital medical vault, consult with specialists, track medication adherence, and view patient EHR registries.');
      setHasShownGuestPopup(true);
    }
  }, [openAuth]);

  const downloadJsonExport = () => {
    if (!result || !result.data) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `medfusion_guest_ocr_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const rxLogs = [
    "Preparing optical character recognition...",
    "Scanning document layout & handwriting...",
    "Isolating pharmaceutical compounds...",
    "Normalizing dosages and intake frequencies...",
    "Cross-referencing contraindications & safety rules...",
    "Structuring electronic prescription data...",
    "Finalizing clinical Rx ingestion..."
  ];

  const labLogs = [
    "Preparing pathology analysis engine...",
    "Detecting clinical biomarker tables...",
    "Extracting quantitative biomarker numbers...",
    "Normalizing units against standard EHR reference ranges...",
    "Evaluating metabolic & organ panels...",
    "Generating clinical interpretation summary...",
    "Finalizing pathology ingestion..."
  ];

  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    setResult(null);
    setError('');
    setScanProgress(8);
    
    const selectedLogs = docType.includes('Rx') ? rxLogs : labLogs;
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < selectedLogs.length) {
        setScanLog(selectedLogs[currentStep]);
        setScanProgress((prev) => Math.min(prev + 14, 92));
        currentStep++;
      }
    }, 420);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const endpoint = docType.includes('Rx') ? '/prescriptions/upload/' : '/pathology/analyze/';
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(interval);
      setScanProgress(100);
      setScanLog("Medical record ingested and parsed successfully!");
      
      let normalizedData = res.data;
      if (docType.includes('Rx')) {
        const ext = res.data.extracted_data || {};
        normalizedData = {
          ...res.data,
          medicines: ext.medicines || [],
          recommendations: ext.recommendations || [],
          next_steps: ext.next_steps || []
        };
      } else {
        const rawBiomarkersList = res.data.report_data || [];
        const biomarkersObj = {};
        rawBiomarkersList.forEach(bio => {
          let refRange = "Normal Range";
          let status = "NORMAL";
          const nameLower = bio.name.toLowerCase();
          const val = Number(bio.value);
          
          if (nameLower.includes('glucose') || nameLower.includes('fbs')) {
            refRange = "70 - 100 mg/dL";
            if (val > 100) status = "HIGH";
            else if (val < 70) status = "LOW";
          } else if (nameLower.includes('hba1c')) {
            refRange = "< 5.7 %";
            if (val >= 6.5) status = "HIGH";
            else if (val >= 5.7) status = "HIGH";
            else if (val < 4.0) status = "LOW";
          } else if (nameLower.includes('cholesterol')) {
            refRange = "< 200 mg/dL";
            if (val >= 200) status = "HIGH";
          } else if (nameLower.includes('hemoglobin') || nameLower.includes('hb')) {
            refRange = "12.0 - 16.0 g/dL";
            if (val > 16.0) status = "HIGH";
            else if (val < 12.0) status = "LOW";
          } else if (nameLower.includes('wbc') || nameLower.includes('white blood cell')) {
            refRange = "4,500 - 11,000 cells/mcL";
            if (val > 11000) status = "HIGH";
            else if (val < 4500) status = "LOW";
          } else if (nameLower.includes('rbc') || nameLower.includes('red blood cell')) {
            refRange = "4.2 - 5.9 million/mcL";
            if (val > 5.9) status = "HIGH";
            else if (val < 4.2) status = "LOW";
          } else if (nameLower.includes('platelet')) {
            refRange = "150,000 - 450,000 cells/mcL";
            if (val > 450000) status = "HIGH";
            else if (val < 150000) status = "LOW";
          }
          
          biomarkersObj[bio.name] = {
            value: bio.value,
            unit: bio.unit || '',
            status: status,
            reference_range: refRange
          };
        });

        normalizedData = {
          ...res.data,
          biomarkers: biomarkersObj,
          clinical_interpretation: res.data.analysis?.summary || res.data.analysis?.error || "Biomarkers parsed and evaluated against standard clinical ranges."
        };
      }
      
      setTimeout(() => {
        setResult({
          type: docType,
          timestamp: new Date().toLocaleString([], { hour12: false }),
          data: normalizedData
        });
        setLoading(false);
      }, 400);
      
    } catch (err) {
      clearInterval(interval);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || "Clinical OCR ingestion failed. Please try a cleaner PNG, JPG, or PDF file.";
      setError(msg);
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError('');
    setScanProgress(0);
    setScanLog('');
    const fileInput = document.getElementById('guestScannerFileInput');
    if (fileInput) fileInput.value = '';
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(selected.type)) {
      setError('Unsupported file type. Please upload a JPG, PNG, or PDF.');
      return;
    }
    if (selected.size > 16 * 1024 * 1024) {
      setError('File too large. Maximum size is 16MB.');
      return;
    }
    setError('');
    setFile(selected);
    setResult(null);
  };

  // Sidebar Controls
  useEffect(() => {
    setSidebarContent(
      <div className="d-flex flex-column gap-4 pt-2">

        {/* Sleek Medical Header Console inside Sidebar — exactly like Health Check */}
        <div className="glass-card p-4 mb-2 reveal border-theme-accent border-opacity-15 bg-white-5" style={{ borderRadius: '12px' }}>
          <h2 className="fw-bolder fs-6 m-0" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem', color: '#FFFFFF' }}>
            AI Medical <span style={{ color: 'var(--brand-orange)' }}>Scanner</span>
          </h2>
          <p className="m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4', color: 'rgba(255, 255, 255, 0.88)' }}>
            {docType.includes('Rx')
              ? 'Upload a prescription photo to extract drug names, dosages and schedules instantly.'
              : 'Upload a lab report to extract biomarker values and get a clinical interpretation.'}
          </p>
        </div>

        {/* Scan Type selector using disease-select-tile pattern */}
        <div className="mt-2">
          <h4 className="fw-bold mb-3" style={{ fontSize: '1.05rem', color: '#FFFFFF' }}>
            <span className="font-monospace text-uppercase" style={{ letterSpacing: '0.06em', color: '#FFFFFF' }}>Scan Type</span>
          </h4>
          <div className="d-flex flex-column gap-3 mt-3">
            {[
              { id: 'Rx',        label: 'Prescription (Rx)',      icon: <Pill size={16} />,     theme: 'prescription' },
              { id: 'Pathology', label: 'Lab Report (Pathology)', icon: <Database size={16} />, theme: 'lab' },
            ].map(({ id, label, icon, theme }) => (
              <div
                key={id}
                onClick={() => { if (!loading) { setDocType(id === 'Rx' ? 'Prescription (Rx)' : 'Lab Report (Pathology)'); setResult(null); } }}
                className={`disease-select-tile cursor-pointer ${docType.includes(id) ? `active ${theme}` : 'inactive'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ padding: '16px 20px' }}
              >
                <div className="d-flex align-items-center justify-content-start gap-3 font-monospace fw-bold text-uppercase" style={{ fontSize: '0.9rem' }}>
                  {icon}
                  <span>{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document preview — shown once file is queued */}
        {file && (
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)' }}>
            <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <div className="d-flex align-items-center gap-2 overflow-hidden">
                <FileCheck size={13} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
                <span className="fw-bold font-monospace text-truncate" style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.95)' }}>{file.name}</span>
              </div>
              <span className="font-monospace flex-shrink-0" style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.55)', marginLeft: '6px' }}>{(file.size / 1024).toFixed(0)} KB</span>
            </div>
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '170px', maxHeight: '250px', background: 'rgba(0,0,0,0.28)', position: 'relative', overflow: 'hidden' }}>
              {loading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent 0%, var(--brand-orange) 50%, transparent 100%)', animation: 'scanLine 1.5s ease-in-out infinite' }} />
              )}
              {previewUrl ? (
                <img src={previewUrl} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '246px', objectFit: 'contain', display: 'block', padding: '8px' }} />
              ) : (
                <div className="text-center py-4">
                  <FileText size={38} style={{ color: 'var(--brand-blue)', opacity: 0.7, display: 'block', margin: '0 auto 8px' }} />
                  <span className="d-block font-monospace fw-bold" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.88)' }}>PDF Queued</span>
                  <span className="font-monospace" style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.5)' }}>Ready for extraction</span>
                </div>
              )}
            </div>
            <div className="d-flex align-items-center gap-2 px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {loading ? (
                <>
                  <Cpu size={11} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} className="spin" />
                  <span className="font-monospace text-truncate" style={{ fontSize: '0.66rem', color: 'var(--brand-orange)' }}>{scanLog || 'Processing…'}</span>
                </>
              ) : (
                <>
                  <CheckCircle size={11} style={{ color: '#34D399', flexShrink: 0 }} />
                  <span className="font-monospace" style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.7)' }}>Ready to ingest &amp; scan</span>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    );
    return () => setSidebarContent(null);
  }, [file, previewUrl, loading, scanLog, docType, setSidebarContent]);

  return (
    <div className="reveal px-1 w-100 theme-general">
      {/* ── Main Expanded Workspace ──────────────────────────────────── */}
      <div className="row g-4 align-items-stretch">
        
        {/* Workspace: Full Width when Empty, or Side-by-Side when Result/Preview active */}
        <div className={result ? "col-lg-5" : "col-12"}>
          <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between" style={{ borderRadius: '16px' }}>
            
            {/* Top Workspace Header */}
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-white-10">
                <h4 className="fw-bold m-0 d-flex align-items-center gap-2" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  <UploadIcon size={18} className="text-theme-accent" />
                  <span>Document Workspace</span>
                </h4>
                {file && (
                  <button 
                    onClick={resetScanner} 
                    className="btn-icon p-1 text-secondary" 
                    title="Clear file"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Upload Dropzone — shown when no file is selected */}
              {!file ? (
                <>
                  <div 
                    className={`border border-2 border-dashed rounded-4 p-5 text-center transition-all cursor-pointer position-relative ${docType.includes('Rx') ? 'panel-upload-rx' : 'panel-upload-lab'}`}
                    onClick={() => document.getElementById('guestScannerFileInput').click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('guestScannerFileInput').click(); } }}
                    style={{
                      minHeight: result ? '240px' : '280px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: isDragging ? 'var(--brand-orange)' : 'var(--border)',
                      background: isDragging ? 'var(--bg-card-tinted)' : 'var(--bg-surface)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div className="rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: '68px', height: '68px', background: 'var(--bg-card-tinted)', border: '1px solid var(--border)' }}>
                      <UploadIcon size={30} style={{ color: 'var(--brand-orange)' }} />
                    </div>
                    <h3 className="fw-bold mb-2" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                      Drop {docType.includes('Rx') ? 'Prescription Sheet' : 'Lab Test Report'} Here
                    </h3>
                    <p className="mb-4" style={{ fontSize: '0.9rem', maxWidth: '420px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                      Drag &amp; drop a high-resolution photo or scanned document, or click to browse from device.
                    </p>
                    
                    <div className="d-flex align-items-center gap-2 flex-wrap justify-content-center">
                      {['PNG / JPG', 'PDF up to 16MB', 'OCR Extraction'].map((label, i) => (
                        <span key={label} className="badge rounded-pill px-3 py-1" style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border)', fontSize: '0.72rem', color: i === 2 ? 'var(--brand-orange)' : 'var(--text-primary)', fontWeight: i === 2 ? 700 : 600 }}>{label}</span>
                      ))}
                    </div>

                    <input 
                      id="guestScannerFileInput"
                      type="file" 
                      className="d-none" 
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      onChange={handleFileChange}
                    />
                  </div>

                  {/* Capabilities grid — helpful clinical context when empty */}
                  <div className="row g-3 mt-2">
                    {[
                      { icon: <Pill size={18} />, color: 'var(--brand-orange)', title: 'Rx Parsing', desc: 'Drug names, dosages, frequency and timing extracted from any handwritten prescription.' },
                      { icon: <Activity size={18} />, color: 'var(--brand-blue)', title: 'Biomarker Extraction', desc: 'Quantitative lab values (HbA1c, CBC, lipid panel) normalised against clinical reference ranges.' },
                      { icon: <ShieldCheck size={18} />, color: '#34D399', title: 'Safety Checks', desc: 'Auto-flags abnormal values and contraindications using your stored allergy & medication profile.' },
                      { icon: <Layers size={18} />, color: 'var(--accent-violet)', title: 'EHR Sync', desc: 'All extracted data is stored directly in your MedFusion health vault for future AI analysis.' },
                      { icon: <Zap size={18} />, color: '#FBBF24', title: 'Instant Results', desc: 'Neural extraction completes in under 10 seconds — even for multi-page handwritten documents.' },
                      { icon: <Eye size={18} />, color: 'var(--accent-cyan)', title: 'Visual Preview', desc: 'Your uploaded document previews live in the sidebar while the AI engine processes it.' },
                    ].map(({ icon, color, title, desc }) => (
                      <div key={title} className="col-md-6 col-lg-4">
                        <div className="h-100 p-3 rounded-3" style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border)' }}>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span style={{ color }}>{icon}</span>
                            <span className="fw-bold font-monospace" style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{title}</span>
                          </div>
                          <p className="m-0" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* File is queued — clean action card (preview is situated in sidebar) */
                <div className="rounded-4 border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '52px', height: '52px', background: docType.includes('Rx') ? 'rgba(244,149,74,0.15)' : 'rgba(91,159,224,0.15)', border: `1px solid ${docType.includes('Rx') ? 'var(--brand-orange)' : 'var(--brand-blue)'}` }}>
                      {docType.includes('Rx') ? <Pill size={22} style={{ color: 'var(--brand-orange)' }} /> : <Activity size={22} style={{ color: 'var(--brand-blue)' }} />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="fw-bold m-0 text-truncate" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{file.name}</p>
                      <span className="font-monospace" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {(file.size / 1024).toFixed(1)} KB &nbsp;·&nbsp; {docType} &nbsp;·&nbsp; Preview in sidebar →
                      </span>
                    </div>
                  </div>

                  {/* What the AI will extract */}
                  <div className="mb-4 p-3 rounded-3" style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border)' }}>
                    <p className="fw-bold font-monospace text-uppercase m-0 mb-2" style={{ fontSize: '0.66rem', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>AI will extract</p>
                    <div className="d-flex flex-wrap gap-2">
                      {(docType.includes('Rx')
                        ? ['Drug Names', 'Dosage & Units', 'Frequency', 'Meal Timing', 'Duration', 'Doctor Notes', 'Next Steps']
                        : ['Biomarker Values', 'Units & Range', 'Status (High/Low)', 'Organ Panel', 'Clinical Summary', 'Lab Date', 'Doctor Remarks']
                      ).map(tag => (
                        <span key={tag} className="badge rounded-pill px-2 py-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-primary)', fontWeight: 500 }}>{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <button 
                      type="button" 
                      onClick={() => document.getElementById('guestScannerFileInput').click()} 
                      disabled={loading}
                      className="btn-clinical secondary py-2 px-3"
                      style={{ fontSize: '0.78rem', width: 'auto' }}
                    >
                      Change File
                    </button>
                    <input 
                      id="guestScannerFileInput"
                      type="file" 
                      className="d-none" 
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      onChange={handleFileChange}
                    />

                    {!result && (
                      <button 
                        type="button" 
                        onClick={handleUpload} 
                        disabled={loading}
                        className="btn-clinical primary py-2 px-4 d-inline-flex align-items-center gap-2"
                        style={{ fontSize: '0.88rem', width: 'auto', flexGrow: 1 }}
                      >
                        {loading ? <Cpu size={16} className="spin" /> : <Sparkles size={16} />}
                        <span>{loading ? 'PROCESSING...' : `INGEST & SCAN ${docType.includes('Rx') ? 'PRESCRIPTION' : 'LAB REPORT'}`}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Scanning Progress & Telemetry Log Bar */}
            {loading && (
              <div className="mt-4 p-3.5 rounded-3 border" style={{ background: 'var(--bg-card-tinted)', borderColor: 'var(--border)' }}>
                <div className="d-flex align-items-center justify-content-between mb-2 font-monospace">
                  <span className="d-flex align-items-center gap-2 small fw-bold" style={{ color: 'var(--brand-blue)' }}>
                    <Cpu size={14} />
                    <span>{scanLog}</span>
                  </span>
                  <span className="small fw-bold" style={{ color: 'var(--text-primary)' }}>{scanProgress}%</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar" style={{ width: `${scanProgress}%` }} />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3.5 rounded-3 border border-danger d-flex align-items-center justify-content-between gap-3" style={{ background: 'var(--status-danger-bg)' }}>
                <div className="d-flex align-items-center gap-2 text-danger font-monospace small">
                  <AlertTriangle size={18} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button 
                  onClick={resetScanner} 
                  className="btn-clinical secondary py-1.5 px-3"
                  style={{ fontSize: '0.72rem', width: 'auto' }}
                >
                  Dismiss
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Structured Results Stage — When scanned, shows detailed clinical telemetry */}
        {result && (
          <div className="col-lg-7">
            <div className="glass-card p-4 h-100 d-flex flex-column" style={{ borderRadius: '16px' }}>
              
              {/* Results Stage Header */}
              <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom border-white-10 flex-wrap gap-2">
                <div>
                  <h3 className="fw-bold m-0 d-flex align-items-center gap-2" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                    <CheckCircle style={{ color: 'var(--rgb-green)' }} size={22} />
                    <span>Clinical Ingestion Complete</span>
                  </h3>
                  <span className="text-secondary small font-monospace">
                    Processed: {result.timestamp} · {result.type}
                  </span>
                </div>

                <div className="d-flex gap-2">
                  <button 
                    onClick={downloadJsonExport}
                    className="btn-clinical secondary py-1.5 px-3 d-inline-flex align-items-center gap-1.5"
                    style={{ fontSize: '0.78rem', width: 'auto' }}
                  >
                    <Download size={14} /> Export JSON
                  </button>
                  <button 
                    onClick={resetScanner}
                    className="btn-clinical primary py-1.5 px-3 d-inline-flex align-items-center gap-1.5"
                    style={{ fontSize: '0.78rem', width: 'auto' }}
                  >
                    <RotateCcw size={14} /> Scan Another
                  </button>
                </div>
              </div>

              {/* Result Content */}
              <div className="flex-grow-1 overflow-auto" style={{ maxHeight: '700px' }}>
                {result.type.includes('Rx') ? (
                  /* Prescription Extracted Medicines */
                  <div className="d-flex flex-column gap-3">
                    <h5 className="fw-bold font-monospace d-flex align-items-center gap-2 m-0" style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                      <Pill size={16} style={{ color: 'var(--brand-orange)' }} />
                      <span>PHARMACOLOGICAL AGENTS ({result.data.medicines?.length || 0})</span>
                    </h5>

                    {result.data.medicines?.map((m, i) => {
                      const timesOfDay = Array.isArray(m.times_of_day) ? m.times_of_day : [];
                      return (
                        <div 
                          key={i} 
                          className="p-3.5 rounded-3 border" 
                          style={{ 
                            background: 'var(--bg-card-tinted)', 
                            borderColor: 'var(--border)', 
                            borderLeft: '4px solid var(--accent-teal)' 
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="fw-bold fs-6" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                            <span className="badge rounded-pill px-2.5 py-1 font-monospace" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--brand-blue)', fontSize: '0.72rem' }}>
                              {m.frequency || m.frequency_number ? `${m.frequency_number || ''}x / day` : 'Scheduled'}
                            </span>
                          </div>

                          <div className="d-flex flex-wrap gap-2 mb-2">
                            <span className="badge px-2.5 py-1 font-monospace" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                              Dosage: {m.dosage || 'As prescribed'}
                            </span>
                            {m.timing && (
                              <span className="badge px-2.5 py-1 font-monospace fw-bold" style={{
                                fontSize: '0.72rem',
                                background: m.timing.toLowerCase().includes('before') ? 'rgba(232,184,75,0.15)' : 'rgba(45,184,176,0.15)',
                                border: m.timing.toLowerCase().includes('before') ? '1px solid var(--accent-amber)' : '1px solid var(--accent-teal)',
                                color: m.timing.toLowerCase().includes('before') ? 'var(--accent-amber)' : 'var(--accent-teal)',
                              }}>
                                {m.timing}
                              </span>
                            )}
                          </div>

                          {timesOfDay.length > 0 && (
                            <div className="d-flex flex-wrap gap-1.5 mt-2">
                              {timesOfDay.map((t, ti) => (
                                <span key={ti} className="badge rounded-pill px-2 py-0.5 text-capitalize" style={{
                                  fontSize: '0.68rem',
                                  background: 'var(--bg-card)',
                                  border: '1px solid var(--border-subtle)',
                                  color: 'var(--text-primary)'
                                }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {m.description && (
                            <p className="text-secondary mt-2 mb-0" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                              {m.description}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {result.data.recommendations?.length > 0 && (
                      <div className="p-3.5 rounded-3 border mt-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <h6 className="fw-bold font-monospace mb-2" style={{ fontSize: '0.85rem', color: 'var(--brand-orange)' }}>
                          CLINICAL RECOMMENDATIONS & INSTRUCTIONS
                        </h6>
                        <ul className="text-secondary small ps-3 mb-0" style={{ lineHeight: '1.6' }}>
                          {result.data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Pathology Biomarkers Panel with Advanced Medical Reading Bars */
                  <div className="d-flex flex-column gap-3">
                    <h5 className="fw-bold font-monospace d-flex align-items-center gap-2 m-0" style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                      <Activity size={16} style={{ color: 'var(--brand-blue)' }} />
                      <span>QUANTITATIVE BIOMARKERS</span>
                    </h5>

                    <div className="row g-3">
                      {result.data.biomarkers && Object.keys(result.data.biomarkers).map((k, i) => {
                        const bio = result.data.biomarkers[k];
                        const isAbnormal = bio.status?.toUpperCase() !== 'NORMAL';
                        return (
                          <div className="col-12 col-md-6" key={i}>
                            <div 
                              className="p-3 rounded-3 border h-100 d-flex flex-column justify-content-between" 
                              style={{ 
                                background: 'var(--bg-card-tinted)', 
                                borderColor: isAbnormal ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)' 
                              }}
                            >
                              <div>
                                <div className="d-flex justify-content-between align-items-start mb-1">
                                  <span className="fw-bold text-capitalize" style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                    {k.replace(/_/g, ' ')}
                                  </span>
                                  <span 
                                    className="badge rounded-pill px-2 py-0.5 font-monospace"
                                    style={{
                                      fontSize: '0.65rem',
                                      background: isAbnormal ? 'var(--status-danger-bg)' : 'var(--status-normal-bg)',
                                      color: isAbnormal ? 'var(--status-danger)' : 'var(--status-normal)',
                                      border: `1px solid ${isAbnormal ? 'var(--status-danger-border)' : 'var(--status-normal-border)'}`,
                                    }}
                                  >
                                    {bio.status || 'NORMAL'}
                                  </span>
                                </div>
                              </div>

                              <MedicalReadingBar
                                name={k}
                                value={bio.value}
                                unit={bio.unit}
                                referenceRange={bio.reference_range}
                                status={bio.status}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {result.data.clinical_interpretation && (
                      <div className="p-3.5 rounded-3 border mt-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <h6 className="fw-bold font-monospace mb-2" style={{ fontSize: '0.85rem', color: 'var(--brand-blue)' }}>
                          PATHOLOGICAL INTERPRETATION DIGEST
                        </h6>
                        <p className="text-secondary small m-0" style={{ lineHeight: '1.65' }}>
                          {result.data.clinical_interpretation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default GuestUpload;
