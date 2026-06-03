import React, { useState, useEffect, useContext } from 'react';
import { 
  Upload as UploadIcon, 
  CheckCircle, 
  Cpu, 
  FileText, 
  ArrowRight,
  Sparkles,
  Database
} from 'lucide-react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { SidebarContext } from '../context/SidebarContext';

const getAge = (dobString) => {
  try {
    const birth = new Date(dobString);
    const diff = Date.now() - birth.getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  } catch (e) {
    return 30;
  }
};

function Upload({ user }) {
  const { setSidebarContent } = useContext(SidebarContext);
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('Prescription (Rx)');
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLog, setScanLog] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const getInitials = (name) => {
    if (!name) return 'US';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() 
      : name.substring(0, 2).toUpperCase();
  };

  // Doctor Patient Selection States
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');



  const activePatient = patients.find(p => String(p.id) === String(selectedPatientId));

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

  // Simulated visual logs for scanning wow factor
  const rxLogs = [
    "Establishing optical sensor matrix...",
    "Scanning document layout and topography...",
    "Executing optical character recognition (OCR)...",
    "Filtering artifact noises from handwritten tokens...",
    "Synthesizing active pharmacological ingredients...",
    "Cross-referencing clinical drug monographs...",
    "Structuring medication dosages and timing schedules...",
    "Finalizing prescription digital ingestion..."
  ];

  const labLogs = [
    "Establishing digital hematology ingestion core...",
    "Detecting key clinical biomarkers and units...",
    "Normalizing raw biomarkers and vitals parameters...",
    "Evaluating risk scales relative to healthy parameters...",
    "Assessing metabolic markers (FBS, PPBS, Lipids)...",
    "Running multi-layer pathological classification...",
    "Generating clinical normal range indices...",
    "Finalizing pathology analysis digest..."
  ];

  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    setResult(null);
    setError('');
    setScanProgress(5);
    
    const selectedLogs = docType.includes('Rx') ? rxLogs : labLogs;
    
    // Animate visual scanning progression
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < selectedLogs.length) {
        setScanLog(selectedLogs[currentStep]);
        setScanProgress((prev) => Math.min(prev + 12, 90));
        currentStep++;
      }
    }, 450);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (user && user.role === 'Doctor') {
        if (!selectedPatientId) {
          setError("Please select a registered patient to assign this medical record to.");
          setLoading(false);
          return;
        }
        formData.append('patient_id', selectedPatientId);
      }
      
      const endpoint = docType.includes('Rx') ? '/prescriptions/upload/' : '/pathology/analyze/';
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(interval);
      setScanProgress(100);
      setScanLog("Medical record ingested successfully!");
      
      // Normalize backend data to match frontend's expected schema for Lab Reports
      let normalizedData = res.data;
      if (!docType.includes('Rx')) {
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
          } else if (nameLower.includes('cholesterol')) {
            refRange = "< 200 mg/dL";
            if (val >= 200) status = "HIGH";
          } else if (nameLower.includes('hemoglobin') || nameLower.includes('hb')) {
            refRange = "12.0 - 16.0 g/dL";
            if (val > 16.0) status = "HIGH";
            else if (val < 12.0) status = "LOW";
          } else if (nameLower.includes('wbc')) {
            refRange = "4,500 - 11,000 cells/mcL";
            if (val > 11000) status = "HIGH";
            else if (val < 4500) status = "LOW";
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
          clinical_interpretation: res.data.analysis?.summary || res.data.analysis?.error || "Metabolic profile analyzed successfully."
        };
      }
      
      setTimeout(() => {
        setResult({
          type: docType,
          timestamp: new Date().toLocaleString(),
          data: normalizedData
        });
        setLoading(false);
      }, 500);
      
    } catch (err) {
      clearInterval(interval);
      setError(err.response?.data?.error || "Clinical OCR ingestion failed. Please try a cleaner PNG/JPG file.");
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setFile(null);
    setResult(null);
    setError('');
    setScanProgress(0);
    setScanLog('');
    // Reset the actual file input DOM element
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(selected.type)) {
      setError('Unsupported file type. Please upload a JPG, PNG, or PDF.');
      return;
    }
    // Validate file size (16MB)
    if (selected.size > 16 * 1024 * 1024) {
      setError('File too large. Maximum size is 16MB.');
      return;
    }
    setError('');
    setFile(selected);
  };

  useEffect(() => {
    if (user && user.role === 'Doctor') {
      setSidebarContent(
        <div className="d-flex flex-column gap-4 pt-2">
          <div className="glass-card p-4 mb-2 reveal border-theme-accent border-opacity-15 bg-white-5" style={{ borderRadius: '12px' }}>
            <h2 className="fw-bolder fs-6 m-0 text-white" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem' }}>
              Clinical <span className="text-theme-accent" style={{ textShadow: '0 0 20px var(--theme-accent-glow)' }}>Scanner</span>
            </h2>
            <p className="text-secondary m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
              Upload lab reports or prescriptions to extract clinical values directly into patient records.
            </p>
          </div>

          <div className="mt-2">
            <h4 className="fw-bold mb-3 text-white" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              <span className="text-theme-accent font-monospace text-uppercase" style={{ letterSpacing: '0.06em' }}>Target Patient Entity</span>
            </h4>
            <select 
              value={selectedPatientId} 
              onChange={(e) => setSelectedPatientId(e.target.value)}
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                color: 'white', 
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                width: '100%',
                outline: 'none',
                marginBottom: '10px'
              }}
            >
              <option value="" disabled>-- Select Registered Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#000' }}>{p.name.toUpperCase()} (ID: MF-P-{p.id})</option>
              ))}
            </select>
          </div>

          <div className="mt-2">
            <h4 className="fw-bold mb-3 text-white" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              <span className="text-theme-accent font-monospace text-uppercase" style={{ letterSpacing: '0.06em' }}>Document Category</span>
            </h4>
            <div className="d-flex flex-column gap-3 mt-3">
              {[
                { id: 'Prescription (Rx)', label: 'Prescription (Rx)', icon: <FileText size={20} />, key: 'prescription' },
                { id: 'Lab Report (Pathology)', label: 'Lab Report (Pathology)', icon: <Database size={20} />, key: 'lab' },
              ].map((category) => (
                <div 
                  key={category.id}
                  onClick={() => setDocType(category.id)}
                  className={`disease-select-tile cursor-pointer ${
                    docType === category.id ? `active ${category.key}` : 'inactive'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ padding: '16px 20px' }}
                >
                  <div className="d-flex align-items-center justify-content-start gap-3 font-monospace fw-bold text-uppercase" style={{ fontSize: '0.9rem' }}>
                    {category.icon}
                    <span>{category.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
      return () => setSidebarContent(null);
    } else {
      setSidebarContent(
        <div className="d-flex flex-column gap-4 pt-2">
          {/* Sleek Medical Header Console inside Sidebar */}
          <div className="glass-card p-4 mb-2 reveal border-theme-accent border-opacity-15 bg-white-5" style={{ borderRadius: '12px' }}>
            <h2 className="fw-bolder fs-6 m-0 text-white" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem' }}>
              AI Report <span className="text-theme-accent" style={{ textShadow: '0 0 20px var(--theme-accent-glow)' }}>Scanner</span>
            </h2>
            <p className="text-secondary m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
              Select your report category and ingest documents to extract medical parameters.
            </p>
          </div>

          {/* Ingest category selection switcher */}
          <div className="mt-2">
            <h4 className="fw-bold mb-3 text-white" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              <span className="text-theme-accent font-monospace text-uppercase" style={{ letterSpacing: '0.06em' }}>Document Category</span>
            </h4>
            <div className="d-flex flex-column gap-3 mt-3">
              {[
                { id: 'Prescription (Rx)', label: 'Prescription (Rx)', icon: <FileText size={20} />, key: 'prescription' },
                { id: 'Lab Report (Pathology)', label: 'Lab Report (Pathology)', icon: <Database size={20} />, key: 'lab' },
              ].map((category) => (
                <div 
                  key={category.id}
                  onClick={() => setDocType(category.id)}
                  className={`disease-select-tile cursor-pointer ${
                    docType === category.id ? `active ${category.key}` : 'inactive'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ padding: '16px 20px' }}
                >
                  <div className="d-flex align-items-center justify-content-start gap-3 font-monospace fw-bold text-uppercase" style={{ fontSize: '0.9rem' }}>
                    {category.icon}
                    <span>{category.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
      return () => setSidebarContent(null);
    }
  }, [docType, setSidebarContent, loading, user, patients, selectedPatientId]);



  return (
    <div className={`reveal px-1 py-1 ${user && user.role === 'Doctor' ? 'theme-cancer' : 'theme-general'}`}>
      <div className="row g-4 mt-2 flex-grow-1">
        {/* ============================================================== */}
        {/* LEFT SIDEBAR PANEL: Scanner Ingestion Input Control */}
        {/* ============================================================== */}
        <div className="col-lg-5 col-md-5 reveal d-flex">
          <div className="glass-card p-4 d-flex flex-column gap-4 w-100 justify-content-between" style={{ borderRadius: '16px' }}>
            <div className="d-flex flex-column gap-3 w-100">
              <h4 className="fw-bold text-white font-monospace d-flex align-items-center gap-3 mb-2" style={{ fontSize: '1.25rem' }}>
                <Database size={24} className="text-theme-accent animate-pulse" />
                {user && user.role === 'Doctor' ? 'Clinical Ingestion suite' : 'Ingestion Controls'}
              </h4>

              {/* Active Patient Bio Card Widget */}
              {user && user.role === 'Doctor' && activePatient && (
                <div className="reveal mt-0 p-2 border border-white-10 rounded bg-white-5" style={{ animation: 'fadeIn 0.4s ease' }}>
                  <div className="d-flex justify-content-between align-items-center mb-1 pb-1 border-bottom border-white-5">
                    <span className="fw-bold text-theme-accent font-monospace text-uppercase" style={{ fontSize: '0.7rem' }}>Active Bio Profile</span>
                    <span className="badge bg-white-5 border border-white-10 text-theme-accent font-monospace px-1 py-0.5" style={{ fontSize: '0.65rem' }}>
                      ID: MF-P-{activePatient.id}
                    </span>
                  </div>
                  
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="avatar-circle-sm" style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(223, 64, 255, 0.1)", border: "1px solid rgba(223, 64, 255, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--theme-accent)", fontWeight: "bold", fontSize: "0.75rem" }}>
                      {getInitials(activePatient.name)}
                    </div>
                    <div>
                      <h5 className="text-white fw-bold m-0" style={{ fontSize: "0.85rem" }}>{activePatient.name}</h5>
                      <span className="text-secondary small font-monospace" style={{ fontSize: "0.75rem" }}>{activePatient.email}</span>
                    </div>
                  </div>

                  <div className="row g-1 text-center font-monospace mb-1" style={{ fontSize: '0.7rem' }}>
                    <div className="col-4">
                      <div className="p-1 bg-white-5 rounded border border-white-5">
                        <span className="text-secondary d-block" style={{ fontSize: '0.55rem', opacity: 0.8 }}>SEX / AGE</span>
                        <span className="text-white fw-semibold">{activePatient.gender} / {getAge(activePatient.dob)} Y</span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1 bg-white-5 rounded border border-white-5">
                        <span className="text-secondary d-block" style={{ fontSize: '0.55rem', opacity: 0.8 }}>BLOOD GP</span>
                        <span className="text-white fw-semibold">{activePatient.blood_group}</span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1 bg-white-5 rounded border border-white-5">
                        <span className="text-secondary d-block" style={{ fontSize: '0.55rem', opacity: 0.8 }}>WT / HT</span>
                        <span className="text-white fw-semibold">{activePatient.weight}k / {activePatient.height}c</span>
                      </div>
                    </div>
                  </div>

                  {activePatient.allergies && activePatient.allergies.length > 0 ? (
                    <div className="mt-1 font-monospace" style={{ fontSize: '0.65rem' }}>
                      <span className="text-danger d-block fw-bold mb-1" style={{ fontSize: '0.55rem' }}>⚠️ KNOWN ALLERGIES:</span>
                      <div className="d-flex flex-wrap gap-1">
                        {activePatient.allergies.map((allergy, index) => (
                          <span key={index} className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20" style={{ fontSize: '0.6rem' }}>
                            {allergy.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 font-monospace" style={{ fontSize: '0.65rem' }}>
                      <span className="text-success d-block fw-bold" style={{ fontSize: '0.55rem' }}>✅ ALLERGIES: NONE LOGGED</span>
                    </div>
                  )}
                </div>
              )}

              <div 
                className={`border border-2 border-dashed rounded p-4 text-center mt-3 mb-2 ${docType.includes('Rx') ? 'border-theme-accent hover-border-theme-accent-glow' : 'border-success hover-border-success-glow'} transition-all cursor-pointer position-relative overflow-hidden`}
                onClick={() => document.getElementById('fileInput').click()}
                style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}
              >
                <div 
                  className="position-absolute w-100" 
                  style={{ 
                    height: '3px', 
                    background: docType.includes('Rx') ? 'rgba(0, 245, 212, 0.4)' : 'rgba(0, 255, 170, 0.4)', 
                    top: 0, 
                    left: 0, 
                    animation: 'scanSweep 4s linear infinite',
                    boxShadow: docType.includes('Rx') ? '0 0 15px rgba(0, 245, 212, 0.8)' : '0 0 15px rgba(0, 255, 170, 0.8)'
                  }}
                ></div>
                <UploadIcon size={56} className={`${docType.includes('Rx') ? 'text-theme-accent' : 'text-success'} mb-3 animate-pulse`} />
                <span className="text-white fw-bold font-monospace d-block text-uppercase" style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}>
                  {file ? `Ingested: ${file.name.toUpperCase()}` : user && user.role === 'Doctor' ? (docType.includes('Rx') ? 'UPLOAD PATIENT Rx RECORD' : 'UPLOAD PATIENT PATHOLOGY REPORT') : (docType.includes('Rx') ? 'DROP RX PRESCRIPTION HERE' : 'DROP PATHOLOGY LAB REPORT HERE')}
                </span>
                <span className="text-secondary d-block font-monospace mt-2" style={{ fontSize: '0.9rem', opacity: 0.85 }}>
                  {user && user.role === 'Doctor' ? (docType.includes('Rx') ? 'Supports physician Rx sheets or image logs' : 'Supports standard blood chemistry panel metrics') : (docType.includes('Rx') ? 'Supports scanned prescription images or PDFs' : 'Supports blood chemistry or pathology sheets')}
                </span>
                
                <input 
                  id="fileInput"
                  type="file" 
                  className="d-none" 
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileChange}
                />
              </div>

              <button 
                onClick={handleUpload} 
                disabled={!file || loading}
                className="font-monospace text-uppercase fw-bold w-100 d-flex align-items-center justify-content-center gap-2 mt-2"
                style={{
                  background: docType.includes('Rx') ? 'rgba(0, 245, 212, 0.1)' : 'rgba(0, 255, 170, 0.1)',
                  border: `2px solid ${docType.includes('Rx') ? 'rgba(0, 245, 212, 0.5)' : 'rgba(0, 255, 170, 0.5)'}`,
                  borderRadius: '12px',
                  padding: '14px 20px',
                  fontSize: '1rem',
                  letterSpacing: '0.08em',
                  color: docType.includes('Rx') ? '#00f5d4' : '#00ffaa',
                  cursor: !file || loading ? 'not-allowed' : 'pointer',
                  opacity: !file || loading ? 0.45 : 1,
                  boxShadow: `0 4px 15px ${docType.includes('Rx') ? 'rgba(0, 245, 212, 0.15)' : 'rgba(0, 255, 170, 0.15)'}`,
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={e => { if (file && !loading) { e.currentTarget.style.boxShadow = `0 8px 25px ${docType.includes('Rx') ? 'rgba(0, 245, 212, 0.4)' : 'rgba(0, 255, 170, 0.4)'}`; e.currentTarget.style.background = docType.includes('Rx') ? 'rgba(0, 245, 212, 0.2)' : 'rgba(0, 255, 170, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 4px 15px ${docType.includes('Rx') ? 'rgba(0, 245, 212, 0.15)' : 'rgba(0, 255, 170, 0.15)'}`; e.currentTarget.style.background = docType.includes('Rx') ? 'rgba(0, 245, 212, 0.1)' : 'rgba(0, 255, 170, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Sparkles size={20} style={{ opacity: 0.95 }} />
                {loading
                  ? 'INGESTING...'
                  : user && user.role === 'Doctor'
                    ? (docType.includes('Rx') ? 'INGEST RX TO PATIENT RECORD' : 'ANALYZE PATHOLOGY TO EHR')
                    : (docType.includes('Rx') ? 'INGEST RX TO PATIENT RECORD' : 'EXTRACT CLINICAL BIOMARKERS')
                }
              </button>
            </div>

            {/* Simulated Scanning status ticker in left panel */}
            {loading && (
              <div className="border-top border-white-10 pt-4 mt-auto reveal">
                <h4 className="fw-bold mb-2 text-white font-monospace d-flex align-items-center gap-2" style={{ fontSize: '1.05rem' }}>
                  <Cpu className={`${docType.includes('Rx') ? 'text-theme-accent' : 'text-success'} animate-pulse`} size={20} />
                  Scanner Sensor Feed
                </h4>
                <p className="text-theme-accent font-monospace bg-white-10 px-3 py-2 border border-white-5 rounded" style={{ fontSize: '0.85rem', minHeight: '52px' }}>
                  {scanLog}
                </p>
                <div className="progress rounded overflow-hidden mt-3" style={{ height: '5px' }}>
                  <div 
                    className={`progress-bar ${docType.includes('Rx') ? 'bg-theme-accent' : 'bg-success'}`} 
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT STAGE: Telemetry Extractor */}
        {/* ============================================================== */}
        <div className="col-lg-7 col-md-7 reveal d-flex">
          {!result && !loading && (
            <div className="glass-card text-center p-5 d-flex flex-column align-items-center justify-content-center w-100" style={{ borderRadius: '16px' }}>
              <div 
                className="mb-4 rounded-circle d-flex align-items-center justify-content-center" 
                style={{ 
                  width: '130px', 
                  height: '130px',
                  background: docType.includes('Rx') ? 'rgba(0, 245, 212, 0.08)' : 'rgba(0, 255, 170, 0.08)',
                  border: docType.includes('Rx') ? '1px solid rgba(0, 245, 212, 0.2)' : '1px solid rgba(0, 255, 170, 0.2)',
                  boxShadow: docType.includes('Rx') ? '0 0 30px rgba(0, 245, 212, 0.15)' : '0 0 30px rgba(0, 255, 170, 0.15)'
                }}
              >
                {docType.includes('Rx') ? (
                  <FileText size={60} className="text-theme-accent animate-pulse" />
                ) : (
                  <Database size={60} className="text-success animate-pulse" />
                )}
              </div>
              <h4 className="fw-bold text-white font-monospace text-uppercase animate-pulse mb-2" style={{ fontSize: '1.35rem', letterSpacing: '0.04em' }}>
                {docType.includes('Rx') ? 'Prescription OCR Ingestor' : 'Pathology Vector Engine'}
              </h4>
              <p className="text-secondary font-monospace mt-2 px-4 m-0" style={{ maxWidth: '580px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {docType.includes('Rx') ? (
                  "Awaiting prescription sheet upload. Ingest a scanned physician Rx note or digital medication record inside the left panel to isolate drug formulations, dosages, intake intervals, and administration safety alerts."
                ) : (
                  "Awaiting diagnostic profile ingestion. Ingest a blood pathology, metabolic panel, or chemical profile sheet inside the left panel to map critical metrics (Glucose, Cholesterol, WBC, etc.) against healthy baseline thresholds."
                )}
              </p>
            </div>
          )}

          {loading && (
            <div className="glass-card text-center p-5 d-flex flex-column align-items-center justify-content-center w-100" style={{ borderRadius: '16px' }}>
              <div className="mb-5 position-relative d-flex align-items-center justify-content-center" style={{ width: '160px', height: '160px' }}>
                <div className={`spinner-border ${docType.includes('Rx') ? 'text-theme-accent' : 'text-success'} position-absolute`} style={{ width: '100px', height: '100px', borderWidth: '4.5px' }} role="status"></div>
                <Cpu size={42} className={`${docType.includes('Rx') ? 'text-theme-accent' : 'text-success'} position-absolute animate-pulse`} />
              </div>
              <h3 className="fw-bold mb-2 font-monospace text-white" style={{ fontSize: '1.8rem' }}>Extracting Clinical Vectors</h3>
              <p className="text-secondary font-monospace" style={{ fontSize: '1.1rem' }}>Re-mapping handwritten characters onto OCR models...</p>
            </div>
          )}

          {error && (
            <div className="glass-card text-center p-5 d-flex flex-column align-items-center justify-content-center w-100 border-danger" style={{ borderRadius: '16px' }}>
              <h4 className="fw-bold text-danger mb-3" style={{ fontSize: '1.6rem' }}>Scan Failed</h4>
              <p className="text-secondary" style={{ fontSize: '1.1rem' }}>{error}</p>
              <button onClick={resetScanner} className="px-4 py-2 border border-white-10 bg-transparent text-secondary rounded mt-4" style={{ fontSize: '1rem' }}>Reset Scanner</button>
            </div>
          )}

          {result && !loading && (
            <div className="glass-card w-100 p-5 d-flex flex-column" style={{ borderColor: 'var(--accent-teal)', borderRadius: '16px' }}>
              <div className="d-flex align-items-center justify-content-between mb-4 border-bottom border-white-10 pb-3 flex-wrap gap-2">
                <div className="font-monospace">
                  <h3 className="fw-bold m-0 text-white text-uppercase d-flex align-items-center gap-2" style={{ fontSize: '1.35rem' }}>
                    <CheckCircle className="text-theme-accent animate-pulse" size={24} />
                    Ingestion Vector Complete
                  </h3>
                  <span className="text-secondary small font-monospace">Extracted: {result.timestamp}</span>
                </div>
                <button 
                  onClick={resetScanner}
                  className="px-4 py-2 border border-white-10 bg-transparent text-secondary rounded d-flex align-items-center gap-2 hover-white font-monospace text-uppercase"
                  style={{ width: 'auto', fontSize: '0.88rem' }}
                >
                  <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                  Recalibrate
                </button>
              </div>
              
              <div className="w-100">
                {result.type.includes('Rx') ? (
                <div className="font-monospace">
                  <h5 className="text-theme-accent fw-bold mb-3" style={{ fontSize: '1.05rem' }}>Extracted Pharmacological Agents</h5>
                  <div className="row g-3 mb-4">
                    {result.data.medicines?.map((m, i) => (
                      <div className="col-md-6" key={i}>
                        <div className="p-3.5 bg-white-10 bg-opacity-20 border border-white-5 rounded d-flex align-items-center justify-content-between">
                          <div>
                            <span className="text-white fw-bold d-block" style={{ fontSize: '0.98rem' }}>💊 {m.name}</span>
                            <span className="text-secondary" style={{ fontSize: '0.82rem' }}>Dosage: {m.dosage}</span>
                          </div>
                          <span className="badge bg-white-5 border border-white-10 text-theme-accent p-2" style={{ fontSize: '0.8rem' }}>{m.frequency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <h5 className="text-white fw-bold mb-3" style={{ fontSize: '1.05rem' }}>Physiological Intent & Recommendations</h5>
                  <div className="p-4 bg-white-10 rounded border border-white-5 mb-4" style={{ fontSize: '0.92rem' }}>
                    <ul className="text-secondary ps-3 mb-0">
                      {result.data.recommendations?.map((r, i) => <li key={i} className="mb-2">{r}</li>)}
                    </ul>
                  </div>
                  
                  {result.data.next_steps && (
                    <div className="mt-4 p-4 bg-white-10 rounded border border-theme-accent border-opacity-30 bg-opacity-10" style={{ fontSize: '0.92rem' }}>
                      <h6 className="text-theme-accent fw-bold mb-2" style={{ fontSize: '0.98rem' }}>Suggested Follow-up Runs</h6>
                      <ul className="text-secondary mb-0 ps-3">
                        {result.data.next_steps.map((step, i) => <li key={i} className="mb-1">{step}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="font-monospace">
                  <h5 className="text-theme-accent fw-bold mb-3" style={{ fontSize: '1.05rem' }}>Extracted Physiological Biomarkers</h5>
                  <div className="row g-3 mb-4">
                    {result.data.biomarkers && Object.keys(result.data.biomarkers).map((k, i) => {
                      const bio = result.data.biomarkers[k];
                      const isAbnormal = bio.status?.toUpperCase() !== 'NORMAL';
                      return (
                        <div className="col-md-6" key={i}>
                          <div className={`p-4 rounded border h-100 ${isAbnormal ? 'border-danger border-opacity-40 bg-danger bg-opacity-5' : 'border-white-5 bg-white-10 bg-opacity-20'}`}>
                            <span className="text-secondary d-block text-capitalize" style={{ fontSize: '0.85rem' }}>{k.replace(/_/g, ' ')}</span>
                            <div className="d-flex justify-content-between align-items-baseline mt-2">
                              <span className="text-white fw-bold" style={{ fontSize: '1.15rem' }}>{bio.value} {bio.unit}</span>
                              <span className={`badge ${isAbnormal ? 'bg-danger bg-opacity-20 text-danger border-danger' : 'bg-theme-accent bg-opacity-20 text-theme-accent border-theme-accent'} border p-1.5 px-2.5`} style={{ fontSize: '0.78rem' }}>
                                {bio.status}
                              </span>
                            </div>
                            <small className="text-secondary d-block mt-2" style={{ fontSize: '0.8rem' }}>Ref Range: {bio.reference_range}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <h5 className="text-white fw-bold mb-3" style={{ fontSize: '1.05rem' }}>Pathological Interpretation Digest</h5>
                  <div className="p-4 bg-white-10 rounded border border-white-5 mb-4" style={{ fontSize: '0.92rem' }}>
                    <p className="text-secondary small m-0" style={{ lineHeight: 1.6 }}>{result.data.clinical_interpretation}</p>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Upload;
