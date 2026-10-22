import React, { useState, useEffect, useContext } from 'react';
import { 
  Upload as UploadIcon, 
  CheckCircle, 
  Cpu, 
  FileText, 
  ArrowRight,
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
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (!dropped) return;
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(dropped.type)) { setError('Unsupported file type. Please upload a JPG, PNG, or PDF.'); return; }
    if (dropped.size > 16 * 1024 * 1024) { setError('File too large. Maximum size is 16MB.'); return; }
    setError(''); setFile(dropped);
  };

  const getInitials = (name) => {
    if (!name) return 'US';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() 
      : name.substring(0, 2).toUpperCase();
  };

  // Patient Selection States
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    return (user && user.role === 'Patient') ? (user.patient_id || '') : '';
  });

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


  const downloadJsonExport = () => {
    if (!result || !result.data) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `medfusion_ocr_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const renderRangeBar = (name, value) => {
    const val = parseFloat(value);
    if (isNaN(val)) return null;

    const nameLower = name.toLowerCase();
    let minVal = 0;
    let maxVal = 200;
    let normalMin = 70;
    let normalMax = 100;
    
    if (nameLower.includes('glucose') || nameLower.includes('fbs')) {
      minVal = 40; maxVal = 250; normalMin = 70; normalMax = 100;
    } else if (nameLower.includes('hba1c')) {
      minVal = 3; maxVal = 12; normalMin = 4; normalMax = 5.6;
    } else if (nameLower.includes('cholesterol')) {
      minVal = 100; maxVal = 350; normalMin = 120; normalMax = 200;
    } else if (nameLower.includes('hemoglobin') || nameLower.includes('hb')) {
      minVal = 8; maxVal = 20; normalMin = 12; normalMax = 16;
    } else if (nameLower.includes('wbc') || nameLower.includes('white blood cell')) {
      minVal = 2000; maxVal = 15000; normalMin = 4500; normalMax = 11000;
    } else if (nameLower.includes('platelet')) {
      minVal = 100000; maxVal = 500000; normalMin = 150000; normalMax = 450000;
    } else {
      return null;
    }

    const percentOfVal = Math.min(100, Math.max(0, ((val - minVal) / (maxVal - minVal)) * 100));
    const percentOfNormalMin = ((normalMin - minVal) / (maxVal - minVal)) * 100;
    const percentOfNormalMax = ((normalMax - minVal) / (maxVal - minVal)) * 100;

    return (
      <div className="mt-3 font-monospace">
        <div className="d-flex justify-content-between text-secondary" style={{ fontSize: '0.68rem', opacity: 0.8 }}>
          <span>Min: {minVal}</span>
          <span>Ref Range: {normalMin} - {normalMax}</span>
          <span>Max: {maxVal}</span>
        </div>
        
        <div className="position-relative w-100 mt-1.5 rounded" style={{ height: '6px', background: 'var(--grad-track)' }}>
          <div 
            className="position-absolute h-100 bg-success bg-opacity-30 rounded" 
            style={{ 
              left: `${percentOfNormalMin}%`, 
              width: `${percentOfNormalMax - percentOfNormalMin}%` 
            }}
          ></div>
          
          <div 
            className="position-absolute rounded-circle" 
            style={{ 
              left: `${percentOfVal}%`, 
              width: '10px', 
              height: '10px', 
              background: val > normalMax || val < normalMin ? 'var(--brand-orange)' : 'var(--brand-blue)', 
              top: '-2px',
              transform: 'translateX(-50%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}
          ></div>
        </div>
      </div>
    );
  };

  // Scanning progress log messages
  const rxLogs = [
    "Preparing optical character recognition...",
    "Scanning document layout...",
    "Extracting text from image...",
    "Filtering handwritten content...",
    "Identifying active ingredients...",
    "Cross-referencing drug information...",
    "Structuring medication schedules...",
    "Finalising prescription record..."
  ];

  const labLogs = [
    "Preparing pathology analysis...",
    "Detecting clinical biomarkers...",
    "Normalising biomarker values...",
    "Evaluating against reference ranges...",
    "Assessing metabolic markers...",
    "Running pathological classification...",
    "Generating clinical reference indices...",
    "Finalising pathology report..."
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
      // Send selected patient ID if provided (works for both Doctor and Guest)
      // Only block if user is a Doctor AND hasn't selected a patient
      if (user && user.role === 'Doctor' && !selectedPatientId) {
        clearInterval(interval);
        setLoading(false);
        setError("Please select a registered patient to assign this medical record to.");
        return;
      }
      if (selectedPatientId) {
        formData.append('patient_id', selectedPatientId);
      }
      
      const endpoint = docType.includes('Rx') ? '/prescriptions/upload/' : '/pathology/analyze/';
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(interval);
      setScanProgress(100);
      setScanLog("Medical record ingested successfully!");
      
      // Normalize backend data to match frontend's expected schema
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
            else if (val >= 5.7) status = "HIGH"; // Prediabetic/borderline is flagged high
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
          clinical_interpretation: res.data.analysis?.summary || res.data.analysis?.error || "Metabolic profile analyzed successfully."
        };
      }
      
      setTimeout(() => {
        setResult({
          type: docType,
          timestamp: new Date().toLocaleString([], { hour12: false }),
          data: normalizedData
        });
        setLoading(false);
      }, 500);
      
    } catch (err) {
      clearInterval(interval);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || "Clinical OCR ingestion failed. Please try a cleaner PNG/JPG file.";
      setError(msg);
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
            <h2 className="fw-bolder fs-6 m-0" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              Clinical <span style={{ color: 'var(--brand-orange)' }}>Scanner</span>
            </h2>
            <p className="text-secondary m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
              Upload lab reports or prescriptions to extract clinical values directly into patient records.
            </p>
          </div>

          <div className="mt-2">
            <h4 className="fw-bold mb-3" style={{ fontSize: '1.05rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
              <span className="text-theme-accent font-monospace text-uppercase" style={{ letterSpacing: '0.06em' }}>Target Patient Entity</span>
            </h4>
            <select 
              value={selectedPatientId} 
              onChange={(e) => setSelectedPatientId(e.target.value)}
              style={{ 
                background: 'var(--input-bg)', 
                color: 'var(--text-primary)', 
                border: '1px solid var(--input-border)',
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
                <option key={p.id} value={p.id}>{(p.name || 'UNKNOWN PATIENT').toUpperCase()} (ID: MF-P-{p.id})</option>
              ))}
            </select>
          </div>

          <div className="mt-2">
            <h4 className="fw-bold mb-3" style={{ fontSize: '1.05rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
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
                  className={`disease-select-tile cursor-pointer ${category.key} ${
                    docType === category.id ? 'active' : 'inactive'
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
            <h2 className="fw-bolder fs-6 m-0" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              AI Report <span className="text-theme-accent">Scanner</span>
            </h2>
            <p className="text-secondary m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
              Select your report category and ingest documents to extract medical parameters.
            </p>
          </div>


          {/* Ingest category selection switcher */}
          <div className="mt-2">
            <h4 className="fw-bold mb-3" style={{ fontSize: '1.05rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
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
                  className={`disease-select-tile cursor-pointer ${category.key} ${
                    docType === category.id ? 'active' : 'inactive'
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
    <div className={`reveal px-1 ${user && user.role === 'Doctor' ? 'theme-cancer' : 'theme-general'}`}>
      <div className="row g-4 flex-grow-1">
        {/* ============================================================== */}
        {/* LEFT SIDEBAR PANEL: Scanner Ingestion Input Control */}
        {/* ============================================================== */}
        <div className="col-lg-4 col-md-4 reveal d-flex">
          <div className="glass-card p-4 d-flex flex-column gap-4 w-100 justify-content-between" style={{ borderRadius: '16px' }}>
            <div className="d-flex flex-column gap-3 w-100">
              <h4 className="fw-bold font-monospace d-flex align-items-center gap-3 mb-2" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                <Database size={24} className="text-theme-accent" />
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
                      <h5 className="fw-bold m-0" style={{ fontSize: "0.85rem", color: 'var(--text-primary)' }}>{activePatient.name}</h5>
                      <span className="text-secondary small font-monospace" style={{ fontSize: "0.75rem" }}>{activePatient.email}</span>
                    </div>
                  </div>

                  <div className="row g-1 text-center font-monospace mb-1" style={{ fontSize: '0.7rem' }}>
                    <div className="col-4">
                      <div className="p-1 bg-white-5 rounded border border-white-5">
                        <span className="text-secondary d-block" style={{ fontSize: '0.55rem', opacity: 0.8 }}>SEX / AGE</span>
                        <span className="fw-semibold" style={{ color: 'var(--text-primary)' }}>{activePatient.gender} / {getAge(activePatient.dob)} Y</span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1 bg-white-5 rounded border border-white-5">
                        <span className="text-secondary d-block" style={{ fontSize: '0.55rem', opacity: 0.8 }}>BLOOD GP</span>
                        <span className="fw-semibold" style={{ color: 'var(--text-primary)' }}>{activePatient.blood_group}</span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1 bg-white-5 rounded border border-white-5">
                        <span className="text-secondary d-block" style={{ fontSize: '0.55rem', opacity: 0.8 }}>WT / HT</span>
                        <span className="fw-semibold" style={{ color: 'var(--text-primary)' }}>{activePatient.weight}k / {activePatient.height}c</span>
                      </div>
                    </div>
                  </div>

                  {activePatient.allergies && activePatient.allergies.length > 0 ? (
                    <div className="mt-1 font-monospace" style={{ fontSize: '0.65rem' }}>
                      <span className="text-danger d-block fw-bold mb-1" style={{ fontSize: '0.55rem' }}>KNOWN ALLERGIES:</span>
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
                      <span className="text-success d-block fw-bold" style={{ fontSize: '0.55rem' }}>ALLERGIES: NONE LOGGED</span>
                    </div>
                  )}
                </div>
              )}

              <div 
                className={`border border-2 border-dashed rounded p-4 text-center mt-3 mb-2 transition-all cursor-pointer position-relative overflow-hidden ${docType.includes('Rx') ? 'panel-upload-rx' : 'panel-upload-lab'}`}
                onClick={() => document.getElementById('fileInput').click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                aria-label="Upload medical document — click or drag and drop a file here"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('fileInput').click(); } }}
                style={{
                  minHeight: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg-card-tinted)',
                  borderColor: isDragging ? 'var(--brand-orange)' : 'var(--brand-orange)',
                  transition: 'border-color 0.2s ease',
                  borderStyle: 'dashed',
                  borderWidth: '1.5px',
                }}
              >
                <UploadIcon size={52} className="mb-3" style={{ color: 'var(--primary-accent)' }} />
                <span className="fw-bold font-monospace d-block text-uppercase" style={{ fontSize: '1.15rem', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                  {file ? `Ingested: ${file.name.toUpperCase()}` : user && user.role === 'Doctor' ? (docType.includes('Rx') ? 'UPLOAD PATIENT Rx RECORD' : 'UPLOAD PATIENT PATHOLOGY REPORT') : (docType.includes('Rx') ? 'DROP RX PRESCRIPTION HERE' : 'DROP PATHOLOGY LAB REPORT HERE')}
                </span>
                <span className="text-secondary d-block font-monospace mt-2" style={{ fontSize: '0.88rem' }}>
                  {isDragging ? 'Drop it here!' : (user && user.role === 'Doctor' ? (docType.includes('Rx') ? 'Supports physician Rx sheets or image logs' : 'Supports standard blood chemistry panel metrics') : (docType.includes('Rx') ? 'Supports scanned prescription images or PDFs' : 'Supports blood chemistry or pathology sheets'))}
                </span>
                
                <input 
                  id="fileInput"
                  type="file" 
                  className="d-none" 
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileChange}
                  aria-label="Choose a medical document file"
                />
              </div>

              <button 
                onClick={handleUpload} 
                disabled={!file || loading}
                className="btn-clinical primary font-monospace text-uppercase fw-bold w-100 d-flex align-items-center justify-content-center gap-2 mt-2"
                style={{
                  padding: '13px 20px',
                  fontSize: '0.92rem',
                  letterSpacing: '0.06em',
                }}
              >
                <UploadIcon size={18} />
                {loading
                  ? 'INGESTING...'
                  : user && user.role === 'Doctor'
                    ? (docType.includes('Rx') ? 'INGEST RX TO PATIENT RECORD' : 'ANALYZE PATHOLOGY TO EHR')
                    : (docType.includes('Rx') ? 'INGEST RX RECORD' : 'ANALYZE PATHOLOGY METRICS')
                }
              </button>
            </div>

            {/* Simulated Scanning status ticker in left panel */}
            {loading && (
              <div className="border-top border-white-10 pt-4 mt-auto reveal">
                <h4 className="fw-bold mb-2 font-monospace d-flex align-items-center gap-2" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  <Cpu size={20} style={{ color: 'var(--primary-accent)' }} />
                  Scanner Sensor Feed
                </h4>
                <p className="font-monospace bg-white-10 px-3 py-2 border border-white-5 rounded" style={{ fontSize: '0.85rem', minHeight: '52px', color: 'var(--primary-accent)' }}>
                  {scanLog}
                </p>
                <div className="progress rounded overflow-hidden mt-3" style={{ height: '5px' }}>
                  <div 
                    className="progress-bar" 
                    style={{ width: `${scanProgress}%`, backgroundColor: 'var(--primary-accent)' }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT STAGE: Telemetry Extractor */}
        {/* ============================================================== */}
        <div className="col-lg-8 col-md-8 reveal d-flex">
          {!result && !loading && !error && (
            <div className="glass-card text-center p-5 d-flex flex-column align-items-center justify-content-center w-100" style={{ borderRadius: '16px' }}>
              <div 
                className="mb-4 rounded-circle d-flex align-items-center justify-content-center" 
                style={{ 
                  width: '130px', 
                  height: '130px',
                  background: docType.includes('Rx') ? 'var(--bg-upload-rx)' : 'var(--bg-upload-lab)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {docType.includes('Rx') ? (
                  <FileText size={60} className="text-theme-accent" />
                ) : (
                  <Database size={60} className="text-success" />
                )}
              </div>
              <h4 className="fw-bold font-monospace text-uppercase mb-2" style={{ fontSize: '1.35rem', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
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
            <div className="glass-card text-center p-5 d-flex flex-column align-items-center justify-content-center w-100" style={{ borderRadius: '12px' }}>
              <div className="mb-4 position-relative d-flex align-items-center justify-content-center" style={{ width: '120px', height: '120px' }}>
                <div className="spinner-border position-absolute" style={{ width: '80px', height: '80px', borderWidth: '3.5px', borderColor: 'var(--primary-accent) transparent var(--border-color) transparent' }} role="status"></div>
                <Cpu size={36} className="position-absolute" style={{ color: 'var(--primary-accent)' }} />
              </div>
              <h3 className="fw-bold mb-2 font-monospace" style={{ fontSize: '1.3rem', color: 'var(--text-primary)' }}>Extracting Clinical Vectors</h3>
              <p className="font-monospace" style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>Re-mapping handwritten characters onto OCR models...</p>
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
            <div className="w-100 p-5 d-flex flex-column panel-preview" style={{ borderRadius: '16px' }}>
              <div className="d-flex align-items-center justify-content-between mb-4 border-bottom border-white-10 pb-3 flex-wrap gap-2">
                <div className="font-monospace">
                  <h3 className="fw-bold m-0 text-uppercase d-flex align-items-center gap-2" style={{ fontSize: '1.35rem' }}>
                    <CheckCircle style={{ color: 'var(--primary-accent)' }} size={24} />
                    <span style={{ color: 'var(--text-primary)' }}>Ingestion</span> <span style={{ color: 'var(--primary-accent)' }}>Complete</span>
                  </h3>
                  <span className="text-secondary small font-monospace">Extracted: {result.timestamp}</span>
                </div>
                <div className="d-flex gap-2">
                  <button 
                    onClick={downloadJsonExport}
                    className="px-4 py-2 border border-theme-accent border-opacity-35 bg-theme-accent bg-opacity-10 text-theme-accent rounded d-flex align-items-center gap-2 hover-white font-monospace text-uppercase"
                    style={{ width: 'auto', fontSize: '0.88rem' }}
                  >
                    Export JSON
                  </button>
                  <button 
                    onClick={resetScanner}
                    className="px-4 py-2 border border-white-10 bg-transparent text-secondary rounded d-flex align-items-center gap-2 hover-white font-monospace text-uppercase"
                    style={{ width: 'auto', fontSize: '0.88rem' }}
                  >
                    <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                    Recalibrate
                  </button>
                </div>
              </div>
              
              <div className="w-100">
                {result.type.includes('Rx') ? (
                <div className="font-monospace">
                  <h5 className="fw-bold mb-3" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Extracted Pharmacological Agents</h5>
                  <div className="d-flex flex-column gap-3 mb-4">
                    {result.data.medicines?.map((m, i) => {
                      const timesOfDay = Array.isArray(m.times_of_day) ? m.times_of_day : [];
                      return (
                        <div key={i} className="p-3 rounded border border-white-10 bg-white-5" style={{ borderLeft: '3px solid var(--accent-teal)' }}>
                          {/* Top row: name + frequency badge */}
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="fw-bold" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{m.name}</span>
                            <span className="badge badge-brand-blue px-2 py-1 font-monospace" style={{ fontSize: '0.72rem', letterSpacing: '0.08em' }}>{m.frequency || m.frequency_number ? `${m.frequency_number || ''}x / day` : '—'}</span>
                          </div>

                          {/* Dosage + timing row */}
                          <div className="d-flex flex-wrap gap-2 mb-2">
                            <span className="badge bg-white-5 border border-white-10 text-secondary px-2 py-1" style={{ fontSize: '0.72rem' }}>
                              Dosage: {m.dosage}
                            </span>
                            {m.timing && (
                              <span className="badge px-2 py-1 fw-bold" style={{
                                fontSize: '0.72rem',
                                background: m.timing.toLowerCase().includes('before') ? 'rgba(232,184,75,0.15)' : 'rgba(45,184,176,0.12)',
                                border: m.timing.toLowerCase().includes('before') ? '1px solid rgba(232,184,75,0.4)' : '1px solid rgba(45,184,176,0.35)',
                                color: m.timing.toLowerCase().includes('before') ? 'var(--accent-amber)' : 'var(--accent-teal)',
                              }}>
                                {m.timing}
                              </span>
                            )}
                          </div>

                          {/* Times of day pills */}
                          {timesOfDay.length > 0 && (
                            <div className="d-flex flex-wrap gap-2 mt-1">
                              {timesOfDay.map((t, ti) => (
                                <span key={ti} className="badge px-2 py-1 text-capitalize" style={{
                                  fontSize: '0.72rem',
                                  background: 'var(--bg-card-hover)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-primary)',
                                  letterSpacing: '0.05em'
                                }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Description */}
                          {m.description && (
                            <p className="text-secondary mt-2 mb-0" style={{ fontSize: '0.75rem', opacity: 0.75, lineHeight: 1.4 }}>{m.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <h5 className="fw-bold mb-3" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Physiological Intent & Recommendations</h5>
                  <div className="p-4 bg-white-5 rounded border border-white-10 mb-4" style={{ fontSize: '0.92rem' }}>
                    <ul className="text-secondary ps-3 mb-0">
                      {result.data.recommendations?.map((r, i) => <li key={i} className="mb-2">{r}</li>)}
                    </ul>
                  </div>
                  
                  {result.data.next_steps && (
                    <div className="mt-4 p-4 bg-white-5 rounded border border-white-10" style={{ fontSize: '0.92rem', borderLeft: '3px solid var(--primary-accent) !important' }}>
                      <h6 className="fw-bold mb-2" style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>Suggested Follow-up Runs</h6>
                      <ul className="text-secondary mb-0 ps-3">
                        {result.data.next_steps.map((step, i) => <li key={i} className="mb-1">{step}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="font-monospace">
                  <h5 className="fw-bold mb-3" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Extracted Physiological Biomarkers</h5>
                  <div className="row g-3 mb-4">
                    {result.data.biomarkers && Object.keys(result.data.biomarkers).map((k, i) => {
                      const bio = result.data.biomarkers[k];
                      const isAbnormal = bio.status?.toUpperCase() !== 'NORMAL';
                      return (
                        <div className="col-md-6" key={i}>
                          <div className={`p-4 rounded h-100 ${isAbnormal ? 'card-biomarker-abnormal' : 'card-biomarker-normal'}`}>
                            <span className="text-secondary d-block text-capitalize" style={{ fontSize: '0.85rem' }}>{k.replace(/_/g, ' ')}</span>
                            <div className="d-flex justify-content-between align-items-baseline mt-2">
                              <span className="fw-bold" style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>{bio.value} {bio.unit}</span>
                              <span className={`badge ${isAbnormal ? 'badge-brand-orange' : 'badge-brand-blue'} p-1.5 px-2.5`} style={{ fontSize: '0.78rem' }}>
                                {bio.status}
                              </span>
                            </div>
                            <small className="text-secondary d-block mt-2" style={{ fontSize: '0.8rem' }}>Ref Range: {bio.reference_range}</small>
                            
                            {/* Biomarker Range Slider Graph */}
                            {renderRangeBar(k, bio.value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <h5 className="fw-bold mb-3" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Pathological Interpretation Digest</h5>
                  <div className="p-4 bg-white-5 rounded border border-white-10 mb-4" style={{ fontSize: '0.92rem' }}>
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
