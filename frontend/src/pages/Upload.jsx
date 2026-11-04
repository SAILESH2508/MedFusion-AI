import React, { useState, useEffect, useContext } from 'react';
import { 
  Upload as UploadIcon, 
  CheckCircle, 
  Cpu, 
  FileText, 
  Database,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Download,
  FileCheck,
  X,
  Pill,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarContext } from '../context/SidebarContext';
import { useTheme } from '../context/useTheme';
import MedicalReadingBar from '../components/MedicalReadingBar';

// 2 scan type tiles — the AI scanner internally classifies all sub-categories
const SUPPORTED_CATEGORIES = [
  { 
    id: 'prescription', 
    label: 'Prescription (Rx)', 
    icon: <Pill size={16} />, 
    theme: 'prescription', 
    endpoint: '/prescriptions/upload/',
    // document_type sent to backend
    backendType: 'prescription',
    description: 'Upload a prescription photo to extract drug names, dosages and schedules instantly.'
  },
  { 
    id: 'lab_report', 
    label: 'Lab Report (Pathology)', 
    icon: <Database size={16} />, 
    theme: 'lab', 
    endpoint: '/pathology/analyze/',
    // Covers lab reports, pathology, scans, discharge summaries — AI classifies sub-type
    backendType: 'laboratory_report',
    description: 'Upload a lab report, pathology result, or scan to extract biomarkers and get a clinical interpretation.'
  },
];

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

function Upload({ user }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setSidebarContent } = useContext(SidebarContext);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(SUPPORTED_CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLog, setScanLog] = useState('');
  const [result, setResult] = useState(null);
  const [errorState, setErrorState] = useState(null); // { title, message, errorCode, issues, documentType }
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

  const validateClientFile = (candidateFile) => {
    if (!candidateFile) return "No file provided";
    if (candidateFile.size === 0) {
      return "The uploaded file is empty.";
    }
    if (candidateFile.size > 16 * 1024 * 1024) {
      return "File too large. Maximum size is 16MB.";
    }
    const nameLower = candidateFile.name.toLowerCase();
    const hasAllowedExt = ALLOWED_EXTS.some(ext => nameLower.endsWith(ext));
    const hasAllowedMime = ALLOWED_MIME_TYPES.includes(candidateFile.type);
    if (!hasAllowedExt && !hasAllowedMime) {
      return "Unsupported file format. Please upload a JPG, PNG, WEBP, or PDF.";
    }
    return null;
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  
  const handleDrop = (e) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    setIsDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (!dropped) return;

    const validationError = validateClientFile(dropped);
    if (validationError) {
      setErrorState({
        title: validationError.includes('empty') ? 'Empty File' : validationError.includes('large') ? 'File Too Large' : 'Unsupported Format',
        message: validationError,
        errorCode: validationError.includes('empty') ? 'EMPTY_FILE' : validationError.includes('large') ? 'FILE_TOO_LARGE' : 'UNSUPPORTED_FORMAT',
        issues: [validationError]
      });
      return;
    }

    setErrorState(null);
    setFile(dropped);
    setResult(null);
  };

  // Patient Selection States for Doctors
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    return (user && user.role === 'Patient') ? (user.patient_id || '') : '';
  });

  useEffect(() => {
    if (user && user.role === 'Doctor') {
      api.get('/patients')
        .then(res => {
          const list = res.data.patients || [];
          setPatients(list);
          if (list.length > 0) {
            setSelectedPatientId(list[0].id);
          }
        })
        .catch(err => console.error("Error fetching patients list:", err));
    }
  }, [user]);

  const downloadJsonExport = () => {
    if (!result || !result.data) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `medfusion_${selectedCategory.id}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const validationProgressStages = [
    "Checking image file integrity, format, and resolution...",
    "Evaluating image contrast, readability, and blur threshold...",
    "AI classifying document content & verifying category...",
    selectedCategory.id === 'prescription' 
      ? "Extracting pharmaceuticals, dosages & schedule..." 
      : "Extracting clinical biomarkers & reference ranges...",
    "Finalizing medical record ingestion..."
  ];

  const handleUpload = async () => {
    if (!file || loading) return;
    
    // Client-side precheck
    const preCheck = validateClientFile(file);
    if (preCheck) {
      setErrorState({
        title: "Validation Error",
        message: preCheck,
        errorCode: "PRE_VALIDATION_FAILED",
        issues: [preCheck]
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setErrorState(null);
    setScanProgress(15);
    setScanLog(validationProgressStages[0]);
    
    let currentStep = 1;
    const interval = setInterval(() => {
      if (currentStep < validationProgressStages.length) {
        setScanLog(validationProgressStages[currentStep]);
        setScanProgress(prev => Math.min(prev + 18, 90));
        currentStep++;
      }
    }, 450);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', selectedCategory.backendType);
      formData.append('category', selectedCategory.backendType);

      if (user && user.role === 'Doctor' && !selectedPatientId) {
        clearInterval(interval);
        setLoading(false);
        setErrorState({
          title: "Missing Patient",
          message: "Please select a registered patient to assign this medical record to.",
          errorCode: "PATIENT_REQUIRED"
        });
        return;
      }
      if (selectedPatientId) {
        formData.append('patient_id', selectedPatientId);
      }
      
      const res = await api.post(selectedCategory.endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(interval);
      setScanProgress(100);
      setScanLog("Document validated and medical data extracted successfully!");
      
      let normalizedData = res.data;
      if (selectedCategory.id === 'prescription') {
        const ext = res.data.extracted_data || {};
        normalizedData = {
          ...res.data,
          medicines: ext.medicines || [],
          recommendations: ext.recommendations || [],
          next_steps: ext.next_steps || [],
          physician: ext.physician || null,
          clinical_intent: ext.clinical_intent || ""
        };
      } else {
        const rawBiomarkersList = res.data.report_data || [];
        const biomarkersObj = {};
        if (Array.isArray(rawBiomarkersList)) {
          rawBiomarkersList.forEach(bio => {
            let refRange = "Normal Range";
            let status = "NORMAL";
            const nameLower = (bio.name || '').toLowerCase();
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
            
            biomarkersObj[bio.name || 'Biomarker'] = {
              value: bio.value,
              unit: bio.unit || '',
              status: status,
              reference_range: refRange
            };
          });
        }

        normalizedData = {
          ...res.data,
          biomarkers: biomarkersObj,
          clinical_interpretation: res.data.clinical_insight?.summary || res.data.analysis?.summary || "Biomarkers parsed and evaluated against standard clinical ranges."
        };
      }
      
      setTimeout(() => {
        setResult({
          type: selectedCategory.label,
          timestamp: new Date().toLocaleString([], { hour12: false }),
          data: normalizedData
        });
        setLoading(false);
      }, 400);
      
    } catch (err) {
      clearInterval(interval);
      setLoading(false);
      setScanProgress(0);
      
      const errData = err.response?.data || {};
      const status = err.response?.status;
      const errorCode = errData.error_code || (status === 415 ? 'UNSUPPORTED_FORMAT' : status === 503 ? 'AI_VALIDATION_FAILED' : status === 422 ? 'MISSING_MEDICAL_INFO' : 'VALIDATION_ERROR');
      const errorMsg = errData.message || errData.error || errData.detail || err.message || "Document validation failed.";
      const issues = Array.isArray(errData.issues) ? errData.issues : (errData.issues ? [String(errData.issues)] : []);
      const docTypeDetected = errData.document_type || errData.detected_category;

      let title = "Invalid Document";
      if (errorCode === "DOCUMENT_TYPE_MISMATCH") {
        title = "Document Type Mismatch";
      } else if (errorCode === "IMAGE_TOO_BLURRY") {
        title = "Image Too Blurry";
      } else if (errorCode === "IMAGE_CORRUPTED") {
        title = "Corrupted Image";
      } else if (errorCode === "UNSUPPORTED_FORMAT") {
        title = "Unsupported Format";
      } else if (errorCode === "EMPTY_FILE") {
        title = "Empty File";
      } else if (errorCode === "AI_VALIDATION_FAILED" || errorCode === "SERVICE_UNAVAILABLE" || status === 503) {
        title = "AI Validation Unavailable";
      } else if (errorCode === "LOW_CONFIDENCE") {
        title = "Low Confidence";
      } else if (errorCode === "MISSING_MEDICAL_INFO" || errorCode === "EXTRACTION_FAILED" || status === 422) {
        title = "Missing Medical Information";
      }

      setErrorState({
        title,
        message: errorMsg,
        errorCode,
        issues,
        documentType: docTypeDetected
      });
    }
  };

  const resetScanner = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setErrorState(null);
    setScanProgress(0);
    setScanLog('');
    const fileInput = document.getElementById('scannerFileInput');
    if (fileInput) fileInput.value = '';
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    const validationError = validateClientFile(selected);
    if (validationError) {
      setErrorState({
        title: validationError.includes('empty') ? 'Empty File' : validationError.includes('large') ? 'File Too Large' : 'Unsupported Format',
        message: validationError,
        errorCode: validationError.includes('empty') ? 'EMPTY_FILE' : validationError.includes('large') ? 'FILE_TOO_LARGE' : 'UNSUPPORTED_FORMAT',
        issues: [validationError]
      });
      return;
    }
    setErrorState(null);
    setFile(selected);
    setResult(null);
  };

  // Sidebar Controls
  useEffect(() => {
    setSidebarContent(
      <div className="d-flex flex-column gap-4 pt-2">
        {/* Header console */}
        <div className="glass-card p-3.5 mb-1 reveal" style={{ borderRadius: '12px', border: `1px solid ${selectedCategory.id === 'prescription' ? 'rgba(244, 149, 74, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`, background: selectedCategory.id === 'prescription' ? 'rgba(244, 149, 74, 0.08)' : 'rgba(16, 185, 129, 0.08)', transition: 'all 0.3s ease' }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: selectedCategory.id === 'prescription' ? 'rgba(244, 149, 74, 0.22)' : 'rgba(16, 185, 129, 0.22)', border: `1px solid ${selectedCategory.id === 'prescription' ? '#F97316' : '#10B981'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s ease' }}>
              <Sparkles size={14} style={{ color: selectedCategory.id === 'prescription' ? '#F97316' : '#10B981' }} />
            </div>
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: selectedCategory.id === 'prescription' ? '#FB923C' : '#34D399', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
              {selectedCategory.id === 'prescription' ? 'AI Ingestion Scanner' : 'Clinical Lab Scanner'}
            </span>
          </div>
          <h2 className="fw-bolder fs-6 m-0" style={{ letterSpacing: '-0.02em', fontSize: '1.2rem', color: 'var(--text-on-dark, #E2E8F0)' }}>
            AI Medical <span style={{ color: selectedCategory.id === 'prescription' ? '#F97316' : '#10B981' }}>Scanner</span>
          </h2>
          <p className="m-0 mt-2" style={{ fontSize: '0.84rem', lineHeight: '1.4', color: selectedCategory.id === 'prescription' ? '#FED7AA' : '#D1FAE5' }}>
            {selectedCategory.description}
          </p>
        </div>

        {/* Scan type selector */}
        <div className="mt-1">
          <h4 className="fw-bold mb-3" style={{ fontSize: '0.92rem', color: 'var(--text-on-dark, #E2E8F0)' }}>
            <span className="font-monospace text-uppercase" style={{ letterSpacing: '0.06em', color: 'var(--text-on-dark, #E2E8F0)' }}>Document Category</span>
          </h4>
          <div className="d-flex flex-column gap-2 mt-2">
            {SUPPORTED_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory.id === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => { 
                    if (!loading) { 
                      setSelectedCategory(cat); 
                      setResult(null); 
                      setErrorState(null);
                    } 
                  }}
                  className={`disease-select-tile cursor-pointer ${cat.theme} ${isSelected ? 'active' : 'inactive'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ padding: '10px 14px' }}
                >
                  <div className="d-flex align-items-center justify-content-start gap-2.5 font-monospace fw-bold text-uppercase" style={{ fontSize: '0.80rem' }}>
                    <div className="disease-icon-box">
                      {cat.icon}
                    </div>
                    <span>{cat.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Doctor patient selector */}
        {user && user.role === 'Doctor' && (
          <div>
            <h4 className="fw-bold mb-2" style={{ fontSize: '0.92rem', color: 'var(--text-on-dark, #E2E8F0)' }}>
              <span className="font-monospace text-uppercase" style={{ letterSpacing: '0.06em', color: 'var(--text-on-dark, #E2E8F0)' }}>Target Patient</span>
            </h4>
            <select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} className="w-100" style={{ fontSize: '0.82rem' }}>
              <option value="" disabled>-- Select Registered Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{(p.name || 'UNKNOWN').toUpperCase()} (ID: MF-P-{p.id})</option>
              ))}
            </select>
          </div>
        )}

        {/* Document preview */}
        {file && (
          <div style={{ 
            borderRadius: '12px', 
            overflow: 'hidden', 
            border: errorState ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255,255,255,0.18)', 
            background: 'rgba(255,255,255,0.06)' 
          }}>
            <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <div className="d-flex align-items-center gap-2 overflow-hidden">
                <FileCheck size={13} style={{ color: errorState ? '#EF4444' : 'var(--brand-orange)', flexShrink: 0 }} />
                <span className="fw-bold font-monospace text-truncate" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.95)' }}>{file.name}</span>
              </div>
              <span className="font-monospace flex-shrink-0" style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', marginLeft: '6px' }}>{(file.size / 1024).toFixed(0)} KB</span>
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
                  <span className="font-monospace" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Document Ready</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
    return () => setSidebarContent(null);
  }, [file, previewUrl, loading, scanLog, selectedCategory, user, patients, selectedPatientId, errorState, setSidebarContent]);

  const isPrescription = selectedCategory.id === 'prescription';

  return (
    <div className={`reveal w-100 ${isPrescription ? 'theme-prescription-active' : 'theme-lab-active'}`}>
      
      {/* ── Top Header Banner (Dynamic Category Themed) ───────────────── */}
      <div
        className="mb-4 position-relative overflow-hidden"
        style={{
          borderRadius: '20px',
          padding: '28px 32px',
          background: isDark
            ? (isPrescription
                ? 'linear-gradient(135deg, #090909 0%, #120d08 40%, #0c0f0a 75%, #090909 100%)'
                : 'linear-gradient(135deg, #090909 0%, #08120f 40%, #090f12 75%, #090909 100%)')
            : '#FFFFFF',
          border: isDark
            ? `1px solid ${isPrescription ? 'rgba(249, 115, 22, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`
            : `1px solid ${isPrescription ? 'rgba(249, 115, 22, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
          boxShadow: isDark
            ? `0 0 40px ${isPrescription ? 'rgba(249, 115, 22, 0.10)' : 'rgba(16, 185, 129, 0.10)'}, inset 0 1px 0 rgba(255,255,255,0.06)`
            : `0 4px 20px ${isPrescription ? 'rgba(249, 115, 22, 0.08)' : 'rgba(16, 185, 129, 0.08)'}, 0 1px 4px rgba(0, 0, 0, 0.04)`,
          transition: 'all 0.35s ease',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '60px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${isPrescription ? 'rgba(249, 115, 22, 0.18)' : 'rgba(16, 185, 129, 0.18)'} 0%, transparent 70%)`,
          pointerEvents: 'none',
          transition: 'all 0.35s ease'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '160px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${isPrescription ? 'rgba(245, 158, 11, 0.14)' : 'rgba(52, 211, 153, 0.14)'} 0%, transparent 70%)`,
          pointerEvents: 'none',
          transition: 'all 0.35s ease'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: isPrescription
                ? (isDark ? 'rgba(249, 115, 22, 0.22)' : 'rgba(249, 115, 22, 0.12)')
                : (isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.12)'),
              border: `1px solid ${isPrescription ? 'rgba(249, 115, 22, 0.45)' : 'rgba(16, 185, 129, 0.45)'}`,
              transition: 'all 0.3s ease'
            }}>
              {isPrescription ? (
                <Pill size={14} style={{ color: '#F97316' }} />
              ) : (
                <Database size={14} style={{ color: '#10B981' }} />
              )}
            </div>
            <span
              className="font-monospace text-uppercase"
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.14em',
                color: isPrescription ? (isDark ? '#FB923C' : '#EA580C') : (isDark ? '#34D399' : '#059669'),
                fontWeight: 700,
                transition: 'color 0.3s ease'
              }}
            >
              {isPrescription
                ? 'Strict Prescription Validation Engine — Rx Ingestion Module'
                : 'Clinical Pathology Engine — Lab & Diagnostics Module'}
            </span>
          </div>

          <h1
            className="fw-bolder m-0 mb-2"
            style={{
              fontSize: '2rem',
              letterSpacing: '-0.03em',
              color: isDark ? '#FFFFFF' : '#0F172A',
              lineHeight: 1.1,
              fontFamily: 'var(--font-main)'
            }}
          >
            {isPrescription ? (
              <>
                Prescription <span className="text-gradient-prescription">Scanner &amp; Validator</span>
              </>
            ) : (
              <>
                Laboratory <span className="text-gradient-lab">Pathology &amp; Scans</span>
              </>
            )}
          </h1>

          <p
            className="m-0"
            style={{
              fontSize: '0.9rem',
              color: isDark ? 'rgba(255,255,255,0.65)' : '#475569',
              maxWidth: '640px',
              lineHeight: 1.5,
              fontWeight: isDark ? 400 : 500
            }}
          >
            {isPrescription
              ? 'Upload handwritten or digital doctor prescriptions. AI verifies pharmaceutical authenticity, extracts drug compounds, dosage intervals, and cross-references patient allergies and interactions.'
              : 'Upload complete blood counts, metabolic panels, pathology biopsies, or diagnostic scans. AI extracts numerical biomarkers, standardizes clinical reference ranges, and flags acute anomalies.'}
          </p>
        </div>
      </div>

      {/* ── Main Expanded Workspace ──────────────────────────────────── */}
      <div className="row g-4 align-items-stretch">
        
        {/* Workspace: Full Width when Empty, or Side-by-Side when Result active */}
        <div className={result ? "col-lg-5" : "col-12"}>
          <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between" style={{ borderRadius: '16px' }}>
            
            {/* Top Workspace Header */}
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-white-10">
                <h4 className="fw-bold m-0 d-flex align-items-center gap-2" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  <UploadIcon size={18} style={{ color: isPrescription ? '#F97316' : '#10B981' }} />
                  <span>Document Workspace — {selectedCategory.label}</span>
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
                    className={`border border-2 border-dashed rounded-4 p-5 text-center transition-all cursor-pointer position-relative ${selectedCategory.id === 'prescription' ? 'panel-upload-rx' : 'panel-upload-lab'}`}
                    onClick={() => document.getElementById('scannerFileInput').click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('scannerFileInput').click(); } }}
                    style={{
                      minHeight: '280px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      borderColor: isDragging ? (isPrescription ? '#F97316' : '#10B981') : errorState ? '#EF4444' : 'var(--border)',
                      background: isDragging ? 'var(--bg-card-tinted)' : 'var(--bg-surface)',
                      boxShadow: 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div className="rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: '68px', height: '68px', background: 'var(--bg-card-tinted)', border: '1px solid var(--border)' }}>
                      <UploadIcon size={30} style={{ color: isPrescription ? '#F97316' : '#10B981' }} />
                    </div>
                    <h3 className="fw-bold mb-2" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                      Drop {selectedCategory.label} Here
                    </h3>
                    <p className="mb-4" style={{ fontSize: '0.9rem', maxWidth: '440px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                      Drag &amp; drop a clear photo or scanned document, or click to browse.
                    </p>
                    <div className="d-flex align-items-center gap-2 flex-wrap justify-content-center">
                      {[
                        { label: 'JPG / PNG / WEBP', bg: 'rgba(14, 165, 233, 0.12)', border: 'rgba(14, 165, 233, 0.35)', color: '#0284C7' },
                        { label: 'PDF up to 16MB', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)', color: '#7C3AED' },
                        { label: 'AI Validation & OCR', bg: isPrescription ? 'rgba(249, 115, 22, 0.14)' : 'rgba(16, 185, 129, 0.14)', border: isPrescription ? '#F97316' : '#10B981', color: isPrescription ? '#EA580C' : '#059669' }
                      ].map((item, i) => (
                        <span 
                          key={item.label} 
                          className="badge rounded-pill px-3 py-1 fw-bold" 
                          style={{ 
                            background: item.bg, 
                            border: `1px solid ${item.border}`, 
                            fontSize: '0.74rem', 
                            color: item.color,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                          }}
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                    <input id="scannerFileInput" type="file" className="d-none" accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf" onChange={handleFileChange} />
                  </div>

                  {/* Capabilities grid */}
                  <div className="row g-3 mt-2">
                    {[
                      { icon: <ShieldCheck size={18} />, color: '#34D399', title: 'Authenticity Validation', desc: 'Verifies uploaded documents match selected category and rejects identity cards, invoices, or resumes.' },
                      { icon: <Pill size={18} />, color: 'var(--brand-orange)', title: 'Rx Extraction', desc: 'Accurately extracts pharmaceutical compound names, dosages, and dosing intervals without fabrication.' },
                      { icon: <Activity size={18} />, color: 'var(--brand-blue)', title: 'Biomarker Extraction', desc: 'Normalizes quantitative lab values against standard clinical EHR reference intervals.' },
                    ].map(({ icon, color, title, desc }) => (
                      <div key={title} className="col-md-4">
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
                /* File is queued */
                <div 
                  className="rounded-4 border p-4" 
                  style={{ 
                    background: 'var(--bg-surface)', 
                    borderColor: errorState ? '#EF4444' : 'var(--border)',
                    boxShadow: errorState ? '0 0 15px rgba(239, 68, 68, 0.15)' : 'none'
                  }}
                >
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '52px', height: '52px', background: selectedCategory.id === 'prescription' ? 'rgba(244,149,74,0.15)' : 'rgba(91,159,224,0.15)', border: `1px solid ${selectedCategory.id === 'prescription' ? 'var(--brand-orange)' : 'var(--brand-blue)'}` }}>
                      {selectedCategory.id === 'prescription' ? <Pill size={22} style={{ color: 'var(--brand-orange)' }} /> : <Activity size={22} style={{ color: 'var(--brand-blue)' }} />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="fw-bold m-0 text-truncate" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{file.name}</p>
                      <span className="font-monospace" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {(file.size / 1024).toFixed(1)} KB &nbsp;·&nbsp; Target: {selectedCategory.label} &nbsp;·&nbsp; Preview in sidebar →
                      </span>
                    </div>
                  </div>

                  {/* Extracted metadata preview expectations */}
                  <div className="mb-4 p-3 rounded-3" style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border)' }}>
                    <p className="fw-bold font-monospace text-uppercase m-0 mb-2" style={{ fontSize: '0.66rem', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Validation &amp; Extraction Stages</p>
                    <div className="d-flex flex-wrap gap-2">
                      {[
                        '1. Integrity & Blur Check',
                        '2. AI Category Validation',
                        selectedCategory.id === 'prescription' ? '3. Medication Schedule' : '3. Biomarker Range Normalization',
                        '4. Longitudinal Record Ingestion'
                      ].map(tag => (
                        <span key={tag} className="badge rounded-pill px-2.5 py-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-primary)', fontWeight: 500 }}>{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <button 
                      type="button" 
                      onClick={() => document.getElementById('scannerFileInput').click()} 
                      disabled={loading}
                      className="btn-clinical secondary py-2 px-3 fw-bold" 
                      style={{ 
                        fontSize: '0.78rem', 
                        width: 'auto',
                        background: 'rgba(14, 165, 233, 0.14)',
                        border: '1.5px solid #0EA5E9',
                        color: '#0284C7',
                        boxShadow: '0 2px 8px rgba(14, 165, 233, 0.2)'
                      }}
                    >
                      Change File
                    </button>
                    <button 
                      type="button" 
                      onClick={resetScanner} 
                      disabled={loading}
                      className="btn-clinical secondary py-2 px-3 fw-bold" 
                      style={{ 
                        fontSize: '0.78rem', 
                        width: 'auto',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1.5px solid rgba(239, 68, 68, 0.45)',
                        color: '#EF4444',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
                      }}
                    >
                      Remove File
                    </button>
                    <input id="scannerFileInput" type="file" className="d-none" accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf" onChange={handleFileChange} />
                    {!result && (
                      <button 
                        type="button" 
                        onClick={handleUpload} 
                        disabled={loading}
                        className="btn-clinical primary py-2 px-4 d-inline-flex align-items-center gap-2"
                        style={{ fontSize: '0.88rem', width: 'auto', flexGrow: 1 }}
                      >
                        {loading ? <Cpu size={16} className="spin" /> : <Sparkles size={16} />}
                        <span>{loading ? 'VALIDATING & PROCESSING...' : `VALIDATE & INGEST ${selectedCategory.label.toUpperCase()}`}</span>
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
                    <Cpu size={14} className="spin" />
                    <span>{scanLog}</span>
                  </span>
                  <span className="small fw-bold" style={{ color: 'var(--text-primary)' }}>{scanProgress}%</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar" style={{ width: `${scanProgress}%` }} />
                </div>
              </div>
            )}

            {/* Comprehensive Validation Error Alert Banner */}
            {errorState && (
              <div 
                className="mt-4 p-4 rounded-3 border border-danger" 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.08)',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
                }}
              >
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div className="d-flex align-items-start gap-3">
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <AlertTriangle size={20} className="text-danger" />
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <h5 className="fw-bolder m-0 text-danger" style={{ fontSize: '1rem', letterSpacing: '-0.01em' }}>
                          {errorState.title}
                        </h5>
                        {errorState.errorCode && (
                          <span className="badge font-monospace text-uppercase" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', fontSize: '0.66rem' }}>
                            {errorState.errorCode}
                          </span>
                        )}
                      </div>
                      <p className="m-0 mb-2 fw-medium" style={{ fontSize: '0.88rem', color: isDark ? '#FCA5A5' : '#B91C1C', lineHeight: 1.45 }}>
                        {errorState.message}
                      </p>
                      {errorState.documentType && (
                        <div className="mb-2 font-monospace" style={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#4B5563' }}>
                          Detected document type: <strong className="text-capitalize">{errorState.documentType.replace(/_/g, ' ')}</strong>
                        </div>
                      )}
                      {errorState.issues && errorState.issues.length > 0 && (
                        <div className="d-flex flex-wrap gap-1.5 mt-2">
                          {errorState.issues.map((issue, idx) => (
                            <span key={idx} className="badge rounded-pill px-2.5 py-1 font-monospace" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', fontSize: '0.7rem' }}>
                              {issue}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2 flex-shrink-0">
                    <button 
                      onClick={resetScanner} 
                      className="btn-clinical secondary py-1.5 px-3"
                      style={{ fontSize: '0.76rem', width: 'auto', background: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444', color: '#EF4444' }}
                    >
                      Remove &amp; Re-upload
                    </button>
                    <button 
                      onClick={() => setErrorState(null)} 
                      className="btn-clinical secondary py-1.5 px-3"
                      style={{ fontSize: '0.72rem', width: 'auto' }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Structured Results Stage */}
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
                    Validated: {result.timestamp} · {result.type}
                  </span>
                </div>

                <div className="d-flex gap-2">
                  <button 
                    onClick={downloadJsonExport}
                    className="btn-clinical secondary py-1.5 px-3 d-inline-flex align-items-center gap-1.5 fw-bold"
                    style={{ 
                      fontSize: '0.78rem', 
                      width: 'auto',
                      background: 'rgba(14, 165, 233, 0.14)',
                      border: '1.5px solid #0EA5E9',
                      color: '#0284C7',
                      boxShadow: '0 2px 8px rgba(14, 165, 233, 0.2)'
                    }}
                  >
                    <Download size={14} /> Export JSON
                  </button>
                  <button 
                    onClick={resetScanner}
                    className="btn-clinical primary py-1.5 px-3 d-inline-flex align-items-center gap-1.5 fw-bold"
                    style={{ 
                      fontSize: '0.78rem', 
                      width: 'auto',
                      background: isPrescription 
                        ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' 
                        : 'linear-gradient(135deg, #10B981 0%, #0D9488 100%)',
                      border: `1px solid ${isPrescription ? '#EA580C' : '#0D9488'}`,
                      color: '#FFFFFF',
                      boxShadow: isPrescription 
                        ? '0 3px 12px rgba(249, 115, 22, 0.35)' 
                        : '0 3px 12px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <RotateCcw size={14} /> Scan Another
                  </button>
                </div>
              </div>

              {/* Result Content */}
              <div className="flex-grow-1 overflow-auto" style={{ maxHeight: '700px' }}>
                {selectedCategory.id === 'prescription' ? (
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
                          CLINICAL RECOMMENDATIONS &amp; INSTRUCTIONS
                        </h6>
                        <ul className="text-secondary small ps-3 mb-0" style={{ lineHeight: '1.6' }}>
                          {result.data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Lab / Pathology Biomarkers Panel with Advanced Medical Reading Bars */
                  <div className="d-flex flex-column gap-3">
                    <h5 className="fw-bold font-monospace d-flex align-items-center gap-2 m-0" style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                      <Activity size={16} style={{ color: '#10B981' }} />
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
                                    className={`badge font-monospace ${isAbnormal ? 'bg-danger text-white' : 'bg-success text-white'}`}
                                    style={{ fontSize: '0.65rem' }}
                                  >
                                    {bio.status || 'NORMAL'}
                                  </span>
                                </div>
                                
                                <div className="d-flex align-items-baseline gap-1 my-2">
                                  <span className="font-monospace fs-4 fw-bold" style={{ color: 'var(--text-primary)' }}>
                                    {bio.value}
                                  </span>
                                  <span className="text-secondary small font-monospace">{bio.unit}</span>
                                </div>
                              </div>

                              <MedicalReadingBar 
                                label={k}
                                value={bio.value}
                                unit={bio.unit}
                                referenceRange={bio.reference_range}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {result.data.clinical_interpretation && (
                      <div className="p-3.5 rounded-3 border mt-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <h6 className="fw-bold font-monospace mb-2" style={{ fontSize: '0.85rem', color: 'var(--brand-blue)' }}>
                          CLINICAL INTERPRETATION SUMMARY
                        </h6>
                        <p className="text-secondary small mb-0" style={{ lineHeight: '1.6' }}>
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

export default Upload;
