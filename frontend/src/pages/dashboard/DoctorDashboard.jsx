import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { 
  RotateCcw, 
  ChevronRight, 
  Cpu,
  User,
  Plus,
  Trash2,
  Calculator,
  Calendar,
  FileText,
  Database,
  Activity,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { SidebarContext } from '../../context/SidebarContext';
import { INTERACTIONS, getAge } from '../../services/utils';

function DoctorDashboard({ user }) {
  const { setSidebarContent } = useContext(SidebarContext);

  // Doctor-Specific State Variables
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState({ prescriptions: [], pathology_reports: [], predictions: [] });
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [doctorMeds, setDoctorMeds] = useState([]);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFreq, setMedFreq] = useState('Once daily');
  const [submittingRx, setSubmittingRx] = useState(false);

  // Daily Clinical Planner widget State
  const [plannerTasks, setPlannerTasks] = useState(() => {
    if (user) {
      const stored = localStorage.getItem(`doctor_tasks_${user.id}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse stored doctor tasks", e);
        }
      }
      return [
        { id: 1, text: "Review latest pathology lab files", completed: false },
        { id: 2, text: "Follow up with newly diagnosed diabetic patients", completed: false },
        { id: 3, text: "Certify pending medical proof updates", completed: true }
      ];
    }
    return [];
  });
  const [newTaskText, setNewTaskText] = useState('');

  // Diagnostic calculators State
  const [calcTab, setCalcTab] = useState('bmi'); // 'bmi' | 'thr'
  const [calcWeight, setCalcWeight] = useState(70);
  const [calcHeight, setCalcHeight] = useState(175);
  const [calcAge, setCalcAge] = useState(35);

  // Clinical Safety Warnings State derived via useMemo
  const rxWarnings = useMemo(() => {
    if (!selectedPatient) {
      return [];
    }
    const warnings = [];
    const patientAllergies = selectedPatient.allergies || [];
    
    // Get patient's existing active medications from history prescriptions
    const existingMeds = [];
    patientDetails.prescriptions?.forEach(rx => {
      let ext = {};
      try { ext = typeof rx.extracted_data === 'string' ? JSON.parse(rx.extracted_data) : rx.extracted_data; } catch(e) { /* ignore parsing error */ }
      ext?.medicines?.forEach(m => {
        if (m.name) existingMeds.push(m.name.toLowerCase().trim());
      });
    });
    
    // Add medications currently in doctor's formulation list
    const currentFormulating = doctorMeds.map(m => m.name.toLowerCase().trim());
    const typingMed = medName.toLowerCase().trim();
    if (typingMed) {
      currentFormulating.push(typingMed);
    }
    
    const allCirculatingMeds = [...existingMeds, ...currentFormulating];
    
    // 1. Check Allergies
    currentFormulating.forEach(med => {
      patientAllergies.forEach(allergen => {
        if (med.includes(allergen.toLowerCase()) || allergen.toLowerCase().includes(med)) {
          warnings.push(`⚠️ ALLERGY HAZARD: Patient is allergic to "${allergen}" which matches "${med}"!`);
        }
      });
    });
    
    // 2. Check Interactions between all circulating medications
    for (let i = 0; i < allCirculatingMeds.length; i++) {
      for (let j = i + 1; j < allCirculatingMeds.length; j++) {
        const m1 = allCirculatingMeds[i];
        const m2 = allCirculatingMeds[j];
        
        INTERACTIONS.forEach(item => {
          const matches = (
            (m1.includes(item.drug1) && m2.includes(item.drug2)) ||
            (m1.includes(item.drug2) && m2.includes(item.drug1))
          );
          if (matches) {
            warnings.push(`⚠️ DRUG-DRUG INTERACTION: ${item.warning}`);
          }
        });
      }
    }
    
    return Array.from(new Set(warnings));
  }, [medName, doctorMeds, selectedPatient, patientDetails]);

  const saveTasks = (updatedTasks) => {
    setPlannerTasks(updatedTasks);
    if (user) {
      localStorage.setItem(`doctor_tasks_${user.id}`, JSON.stringify(updatedTasks));
    }
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask = {
      id: Date.now(),
      text: newTaskText.trim(),
      completed: false
    };
    saveTasks([...plannerTasks, newTask]);
    setNewTaskText('');
  };

  const toggleTask = (taskId) => {
    const updated = plannerTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    saveTasks(updated);
  };

  const deleteTask = (taskId) => {
    const updated = plannerTasks.filter(t => t.id !== taskId);
    saveTasks(updated);
  };

  // Fetch Patients Registry for Doctors
  const fetchPatients = useCallback(async () => {
    if (!user || user.role !== 'Doctor') return;
    setLoadingPatients(true);
    try {
      const res = await api.get('/patients');
      setPatients(res.data.patients || []);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    } finally {
      setLoadingPatients(false);
    }
  }, [user]);

  // Fetch Detailed Reports for selected Patient
  const fetchPatientDetails = useCallback(async (patientId) => {
    setLoadingDetails(true);
    try {
      const res = await api.get(`/patients/${patientId}`);
      setPatientDetails(res.data || { prescriptions: [], pathology_reports: [], predictions: [] });
    } catch (err) {
      console.error("Failed to fetch patient details:", err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Handle manual prescription sign-off
  const handlePrescribe = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSubmittingRx(true);
    try {
      const payload = {
        medicines: doctorMeds,
        recommendations: doctorNotes ? doctorNotes.split('\n').filter(r => r.trim() !== '') : ["Continue daily monitoring"]
      };
      await api.post(`/patients/${selectedPatient.id}/prescribe`, payload);
      fetchPatientDetails(selectedPatient.id);
      setDoctorMeds([]);
      setDoctorNotes('');
      alert("Prescription synchronized successfully!");
    } catch (err) {
      console.error("Failed to issue prescription:", err);
      alert("Failed to synchronize prescription. Check backend server.");
    } finally {
      setSubmittingRx(false);
    }
  };

  const addMedicine = () => {
    if (!medName.trim()) return;
    setDoctorMeds(prev => [...prev, { name: medName, dosage: medDosage || 'N/A', frequency: medFreq || 'Once daily' }]);
    setMedName('');
    setMedDosage('');
    setMedFreq('Once daily');
  };

  const removeMedicine = (index) => {
    setDoctorMeds(prev => prev.filter((_, i) => i !== index));
  };

  // Fetch patients list on mount
  useEffect(() => {
    if (user && user.role === 'Doctor') {
      fetchPatients();
    }
  }, [user, fetchPatients]);

  // Sync patient records when selecting a patient
  useEffect(() => {
    if (selectedPatient) {
      fetchPatientDetails(selectedPatient.id);
      setDoctorNotes('');
      setDoctorMeds([]);
    }
  }, [selectedPatient, fetchPatientDetails]);

  // Sync doctor sidebar content dynamically
  useEffect(() => {
    if (!user || user.role !== 'Doctor') return;
    
    setSidebarContent(
      <div className="d-flex flex-column gap-4 pt-2">
        {/* Header Console */}
        <div className="glass-card p-4 mb-2 reveal border-theme-accent border-opacity-15 bg-white-5" style={{ borderRadius: '12px' }}>
          <h2 className="fw-bolder fs-6 m-0 text-white" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem' }}>
            Clinical <span className="text-theme-accent" style={{ textShadow: '0 0 20px var(--theme-accent-glow)' }}>Examiner</span>
          </h2>
          <p className="text-secondary m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
            Logged in as Dr. {user.full_name || "Examiner"}. Select patients to review diagnostics, pathology and write clinical recommendations.
          </p>
        </div>

        {!selectedPatient ? (
          /* DIRECTORY VIEW: Practice Analytics */
          <div className="reveal d-flex flex-column gap-4">
            <div>
              <h4 className="fw-bold mb-3 text-white font-monospace text-uppercase" style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                <span className="text-theme-accent">Practice Overview</span>
              </h4>
              <div className="d-flex flex-column gap-2">
                <div className="p-3 bg-white-5 rounded border border-white-5 d-flex justify-content-between align-items-center font-monospace">
                  <span className="text-secondary small" style={{ fontSize: '0.72rem' }}>REGISTERED PATIENTS</span>
                  <span className="text-white fw-bold">{patients.length}</span>
                </div>
                <div className="p-3 bg-white-5 rounded border border-white-5 d-flex justify-content-between align-items-center font-monospace">
                  <span className="text-secondary small" style={{ fontSize: '0.72rem' }}>PATHOLOGY REPORTS</span>
                  <span className="text-white fw-bold">
                    {patients.reduce((acc, p) => acc + (p.pathology_count || 0), 0)}
                  </span>
                </div>
                <div className="p-3 bg-white-5 rounded border border-white-5 d-flex justify-content-between align-items-center font-monospace">
                  <span className="text-secondary small" style={{ fontSize: '0.72rem' }}>AI DISEASE RUNS</span>
                  <span className="text-white fw-bold">
                    {patients.reduce((acc, p) => acc + (p.prediction_count || 0), 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* INSPECT VIEW: Return Control & Section Quick Links */
          <div className="reveal d-flex flex-column gap-4 animate-fadeIn">
            <button 
              onClick={() => setSelectedPatient(null)}
              className="btn-clinical border border-white-10 text-secondary w-100 py-3 d-flex align-items-center justify-content-center gap-2 font-monospace text-uppercase"
              style={{ fontSize: '0.85rem' }}
            >
              ← Patient Directory
            </button>

            <div className="p-3 bg-white-5 border border-theme-accent border-opacity-15 rounded bg-opacity-20 font-monospace">
              <span className="fw-bold text-theme-accent font-monospace text-uppercase d-block mb-1.5" style={{ fontSize: '0.72rem' }}>Active Session Case</span>
              <span className="text-white fw-bold d-block" style={{ fontSize: '0.88rem' }}>{selectedPatient.name.toUpperCase()}</span>
              <span className="text-secondary small d-block">ID: MF-P-{selectedPatient.id} // DOB: {selectedPatient.dob || '1995-08-12'}</span>
            </div>

            <div>
              <h4 className="fw-bold mb-3 text-white font-monospace text-uppercase" style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                <span className="text-theme-accent">EHR Navigation Map</span>
              </h4>
              <div className="d-flex flex-column gap-2">
                {[
                  { id: 'profile', label: 'Clinical Profile', icon: <User size={15} /> },
                  { id: 'prescriptions', label: 'Prescription Logs', icon: <FileText size={15} /> },
                  { id: 'pathology', label: 'Pathology Reports', icon: <Database size={15} /> },
                  { id: 'predictions', label: 'AI Disease Risks', icon: <Activity size={15} /> },
                  { id: 'formulate', label: 'Issue Regimen', icon: <Sparkles size={15} /> },
                ].map(section => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`section-${section.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="btn-clinical border border-white-5 bg-white-5 text-secondary w-100 py-2.5 px-3 text-start d-flex align-items-center gap-2.5 font-monospace"
                    style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                  >
                    {section.icon}
                    <span>{section.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );

    return () => setSidebarContent(null);
  }, [patients, selectedPatient, setSidebarContent, user]);

  return (
    <div className="reveal px-1 py-1 theme-general font-monospace" style={{ height: 'calc(100vh - 155px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {!selectedPatient ? (
        /* PATIENT DIRECTORY SCREEN WITH PLANNER & CALCULATOR WIDGETS */
        <div className="row g-4 flex-grow-1 align-items-stretch" style={{ minHeight: 0, overflow: 'hidden' }}>
          {/* Patient Directory Console Column */}
          <div className="col-lg-8 d-flex" style={{ height: 'calc(100% - 24px)', overflow: 'hidden' }}>
            <div className="glass-card p-4 flex-grow-1 d-flex flex-column" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="d-flex align-items-center justify-content-between mb-4 border-bottom border-white-10 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="fw-bold m-0 text-white text-uppercase d-flex align-items-center gap-2" style={{ fontSize: '1.25rem' }}>
                    <Cpu className="text-theme-accent animate-pulse" size={24} />
                    Patient Directory Console
                  </h3>
                  <span className="text-secondary small font-monospace">Synchronized clinical registry database</span>
                </div>
                <button onClick={fetchPatients} className="px-4 py-2 border border-white-10 bg-transparent text-secondary rounded d-flex align-items-center gap-2 hover-white font-monospace text-uppercase" style={{ fontSize: '0.85rem' }}>
                  <RotateCcw size={16} className={loadingPatients ? 'animate-spin' : ''} />
                  Refresh Data
                </button>
              </div>

              {loadingPatients ? (
                <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 py-5">
                  <div className="spinner-border text-theme-accent mb-3" style={{ width: '40px', height: '40px' }} role="status"></div>
                  <p className="text-secondary small font-monospace">Syncing medical directories...</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 py-5 text-center">
                  <p className="text-secondary font-monospace">No registered clinical patient records detected.</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3 overflow-auto flex-grow-1 pe-2" style={{ minHeight: 0 }}>
                  {patients.map((p) => (
                    <div 
                      key={p.id} 
                      className="d-flex align-items-center justify-content-between p-3 rounded border border-white-5"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.03)',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--theme-accent-glow)';
                        e.currentTarget.style.borderColor = 'var(--theme-accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      <div className="d-flex align-items-center gap-3 text-truncate pe-3">
                        <div className="rounded-circle bg-theme-accent bg-opacity-10 border border-theme-accent border-opacity-35 d-flex align-items-center justify-content-center fw-bold text-theme-accent flex-shrink-0" style={{ width: '48px', height: '48px', fontSize: '1rem' }}>
                          {p.name ? p.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'P'}
                        </div>
                        <div className="text-truncate">
                          <span className="text-white fw-bold d-block text-truncate mb-1" style={{ fontSize: '1.05rem', letterSpacing: '0.02em' }} title={p.name}>{p.name}</span>
                          <span className="text-secondary font-monospace d-block text-truncate" style={{ fontSize: '0.8rem', opacity: 0.7 }} title={p.email}>{p.email}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedPatient(p)}
                        className="btn-clinical py-2 px-4 d-inline-flex align-items-center justify-content-center gap-2 font-monospace text-uppercase flex-shrink-0 w-auto-override"
                        style={{ fontSize: '0.85rem', borderRadius: '8px' }}
                      >
                        Inspect <ChevronRight size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Planner & Calculator Tools Column */}
          <div className="col-lg-4 d-flex flex-column justify-content-start gap-3" style={{ height: 'calc(100% - 24px)', overflow: 'hidden' }}>
            {/* Daily Clinical Planner widget */}
            <div className="glass-card p-3 d-flex flex-column gap-2.5 flex-grow-1" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="d-flex align-items-center gap-2 border-bottom border-white-10 pb-2">
                <Calendar className="text-theme-accent animate-pulse" size={18} />
                <h4 className="fw-bold m-0 text-white text-uppercase" style={{ fontSize: '0.95rem', letterSpacing: '0.02em' }}>Daily Planner</h4>
              </div>
              
              {/* Add task form */}
              <div className="d-flex gap-2">
                <input 
                  type="text" 
                  placeholder="New task..." 
                  value={newTaskText} 
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }}
                  className="font-monospace text-white bg-dark border-secondary px-3 py-1 flex-grow-1"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem' }}
                />
                <button 
                  onClick={addTask} 
                  className="btn-clinical px-3 py-1 d-flex align-items-center justify-content-center"
                  style={{ width: 'auto' }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Tasks List */}
              <div className="d-flex flex-column gap-2 overflow-auto flex-grow-1" style={{ minHeight: 0 }}>
                {plannerTasks.length === 0 ? (
                  <p className="text-secondary small font-monospace italic text-center py-3 m-0">No tasks planned for today.</p>
                ) : (
                  plannerTasks.map((t) => (
                    <div key={t.id} className="d-flex align-items-center justify-content-between p-2 rounded bg-white-5 border border-white-5">
                      <div className="d-flex align-items-center gap-2 cursor-pointer flex-grow-1 text-start" onClick={() => toggleTask(t.id)}>
                        <input 
                          type="checkbox" 
                          checked={t.completed} 
                          onChange={() => toggleTask(t.id)} 
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer"
                        />
                        <span className={`small text-white font-monospace text-start ${t.completed ? 'text-decoration-line-through text-secondary' : ''}`} style={{ fontSize: '0.82rem' }}>
                          {t.text}
                        </span>
                      </div>
                      <button 
                        onClick={() => deleteTask(t.id)}
                        className="px-1.5 py-0.5 bg-transparent border-0 text-danger hover-white"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Diagnostic Calculator widget */}
            <div className="glass-card p-3 d-flex flex-column gap-2.5" style={{ borderRadius: '16px' }}>
              <div className="d-flex align-items-center justify-content-between border-bottom border-white-10 pb-2">
                <div className="d-flex align-items-center gap-2">
                  <Calculator className="text-theme-accent" size={18} />
                  <h4 className="fw-bold m-0 text-white text-uppercase" style={{ fontSize: '0.95rem', letterSpacing: '0.02em' }}>Quick Calc</h4>
                </div>
                
                {/* Calc tabs */}
                <div className="d-flex gap-1">
                  <button 
                    onClick={() => setCalcTab('bmi')} 
                    className="px-2 py-0.5 rounded font-monospace text-uppercase" 
                    style={{ fontSize: '0.7rem', width: 'auto', background: calcTab === 'bmi' ? 'rgba(0,245,212,0.15)' : 'transparent', color: calcTab === 'bmi' ? '#00f5d4' : '#6c757d', border: calcTab === 'bmi' ? '1px solid rgba(0,245,212,0.3)' : '1px solid transparent' }}
                  >
                    BMI
                  </button>
                  <button 
                    onClick={() => setCalcTab('thr')} 
                    className="px-2 py-0.5 rounded font-monospace text-uppercase" 
                    style={{ fontSize: '0.7rem', width: 'auto', background: calcTab === 'thr' ? 'rgba(0,245,212,0.15)' : 'transparent', color: calcTab === 'thr' ? '#00f5d4' : '#6c757d', border: calcTab === 'thr' ? '1px solid rgba(0,245,212,0.3)' : '1px solid transparent' }}
                  >
                    THR
                  </button>
                </div>
              </div>

              {calcTab === 'bmi' ? (
                <div className="d-flex flex-column gap-3">
                  <div>
                    <label className="text-secondary small font-monospace d-flex justify-content-between">
                      <span>Weight (kg)</span>
                      <span className="text-white fw-bold">{calcWeight} kg</span>
                    </label>
                    <input 
                      type="range" 
                      min="30" max="200" 
                      value={calcWeight} 
                      onChange={(e) => setCalcWeight(Number(e.target.value))}
                      className="w-100" 
                    />
                  </div>
                  <div>
                    <label className="text-secondary small font-monospace d-flex justify-content-between">
                      <span>Height (cm)</span>
                      <span className="text-white fw-bold">{calcHeight} cm</span>
                    </label>
                    <input 
                      type="range" 
                      min="100" max="230" 
                      value={calcHeight} 
                      onChange={(e) => setCalcHeight(Number(e.target.value))}
                      className="w-100" 
                    />
                  </div>

                  {(() => {
                    const hMet = calcHeight / 100;
                    const calculatedBmi = parseFloat((calcWeight / (hMet * hMet)).toFixed(1));
                    let category = 'Normal';
                    let color = '#00f5d4';
                    let bg = 'rgba(0, 245, 212, 0.1)';
                    if (calculatedBmi < 18.5) {
                      category = 'Underweight';
                      color = '#60a5fa';
                      bg = 'rgba(96, 165, 250, 0.1)';
                    } else if (calculatedBmi >= 25 && calculatedBmi < 30) {
                      category = 'Overweight';
                      color = '#facc15';
                      bg = 'rgba(250, 204, 21, 0.1)';
                    } else if (calculatedBmi >= 30) {
                      category = 'Obese';
                      color = '#f87171';
                      bg = 'rgba(248, 113, 113, 0.1)';
                    }
                    return (
                      <div className="p-2.5 rounded border text-center font-monospace d-flex align-items-center justify-content-around" style={{ borderColor: color, background: bg }}>
                        <div>
                          <span className="text-secondary d-block" style={{ fontSize: '0.72rem' }}>BMI Value</span>
                          <span className="fw-bold fs-5 text-white">{calculatedBmi}</span>
                        </div>
                        <div className="border-end border-white-10 h-75" style={{ minHeight: '30px' }}></div>
                        <div>
                          <span className="text-secondary d-block" style={{ fontSize: '0.72rem' }}>Classification</span>
                          <span className="fw-bold" style={{ color: color, fontSize: '0.85rem' }}>{category.toUpperCase()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  <div>
                    <label className="text-secondary small font-monospace d-flex justify-content-between">
                      <span>Patient Age (Years)</span>
                      <span className="text-white fw-bold">{calcAge} yrs</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" max="110" 
                      value={calcAge} 
                      onChange={(e) => setCalcAge(Number(e.target.value))}
                      className="w-100" 
                    />
                  </div>

                  {(() => {
                    const maxHr = 220 - calcAge;
                    const zoneMin = Math.round(maxHr * 0.6);
                    const zoneMax = Math.round(maxHr * 0.85);
                    return (
                      <div className="p-2.5 rounded border border-white-5 bg-white-5 font-monospace d-flex flex-column gap-2 text-start">
                        <div className="d-flex justify-content-between text-secondary" style={{ fontSize: '0.75rem' }}>
                          <span>EST. MAX HEART RATE:</span>
                          <span className="text-white fw-bold">{maxHr} BPM</span>
                        </div>
                        <div className="d-flex justify-content-between text-secondary" style={{ fontSize: '0.75rem' }}>
                          <span>AEROBIC ZONE (60-85%):</span>
                          <span className="text-theme-accent fw-bold">{zoneMin} - {zoneMax} BPM</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* PATIENT DETAIL & ACTIONS SCREEN */
        <div className="row g-4 align-items-stretch flex-grow-1" style={{ minHeight: 0, overflow: 'hidden' }}>
          
          {/* LEFT STAGE: Patient Information, Diagnostic & Ingested Records */}
          <div className="col-lg-6 col-md-6 d-flex flex-column gap-4 reveal" style={{ height: 'calc(100% - 24px)', overflow: 'hidden' }}>
            
            {/* Profile Card */}
            <div id="section-profile" className="glass-card p-4">
              <div className="d-flex align-items-center gap-3 mb-3 border-bottom border-white-10 pb-3">
                <div className="rounded-circle bg-theme-accent bg-opacity-10 border border-theme-accent border-opacity-35 d-flex align-items-center justify-content-center fw-bold text-theme-accent" style={{ width: '48px', height: '48px', fontSize: '1.1rem' }}>
                  {selectedPatient.name ? selectedPatient.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'P'}
                </div>
                <div>
                  <h4 className="text-white fw-bold m-0" style={{ fontSize: '1.15rem' }}>{selectedPatient.name}</h4>
                  <span className="text-secondary small font-monospace">{selectedPatient.email} // ID: MF-P-{selectedPatient.id}</span>
                </div>
              </div>

              <div className="row g-3 font-monospace" style={{ fontSize: '0.85rem' }}>
                <div className="col-4">
                  <span className="text-secondary d-block">Gender</span>
                  <span className="text-white fw-bold">{selectedPatient.gender === 'M' ? 'Male' : 'Female'}</span>
                </div>
                <div className="col-4">
                  <span className="text-secondary d-block">Blood Group</span>
                  <span className="text-white fw-bold">{selectedPatient.blood_group || '--'}</span>
                </div>
                <div className="col-4">
                  <span className="text-secondary d-block">Emergency</span>
                  <span className="text-white fw-bold">{selectedPatient.emergency_contact || '--'}</span>
                </div>
                <div className="col-4">
                  <span className="text-secondary d-block">Weight</span>
                  <span className="text-white fw-bold">{selectedPatient.weight || '--'} kg</span>
                </div>
                <div className="col-4">
                  <span className="text-secondary d-block">Height</span>
                  <span className="text-white fw-bold">{selectedPatient.height || '--'} cm</span>
                </div>
                <div className="col-4">
                  <span className="text-secondary d-block">DOB</span>
                  <span className="text-white fw-bold">{selectedPatient.dob || '--'}</span>
                </div>
              </div>
            </div>

            {/* Ingested Medical History Records */}
            <div className="glass-card p-4 flex-grow-1 d-flex flex-column gap-3 overflow-auto" style={{ minHeight: 0 }}>
              <h4 className="fw-bold text-white font-monospace d-flex align-items-center gap-2 mb-2 pb-2 border-bottom border-white-10" style={{ fontSize: '1.1rem' }}>
                <FileText className="text-theme-accent" size={18} />
                Clinical History Logs
              </h4>

              {loadingDetails ? (
                <div className="d-flex flex-column align-items-center justify-content-center py-5 my-auto">
                  <div className="spinner-border text-theme-accent mb-2" style={{ width: '30px', height: '30px' }} role="status"></div>
                  <span className="text-secondary small font-monospace">Fetching patient history logs...</span>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3 font-monospace">
                  
                  {/* Prescriptions */}
                  <div id="section-prescriptions">
                    <span className="text-theme-accent fw-bold d-block border-bottom border-white-5 pb-1 mb-2 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>Issued Prescriptions ({patientDetails.prescriptions.length})</span>
                    {patientDetails.prescriptions.length === 0 ? (
                      <p className="text-secondary small m-0 italic">No prescription logs recorded.</p>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {patientDetails.prescriptions.map((rx, idx) => {
                          let ext = {};
                          try { ext = typeof rx.extracted_data === 'string' ? JSON.parse(rx.extracted_data) : rx.extracted_data; } catch(e) { console.error(e); }
                          return (
                            <div key={idx} className="p-3 bg-white-5 border border-white-5 rounded">
                              <div className="d-flex justify-content-between align-items-baseline">
                                <span className="text-white fw-bold" style={{ fontSize: '0.85rem' }}>👨‍⚕️ {ext?.physician || 'Physician'}</span>
                                <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>{new Date(rx.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="mt-2 border-start border-theme-accent border-opacity-30 ps-2">
                                {ext?.medicines?.map((m, mIdx) => (
                                  <span key={mIdx} className="badge bg-white-5 text-secondary border border-white-10 me-1 mb-1" style={{ fontSize: '0.75rem' }}>
                                    💊 {m.name} ({m.dosage}) - {m.frequency}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Pathology Reports */}
                  <div id="section-pathology" className="mt-2">
                    <span className="text-success fw-bold d-block border-bottom border-white-5 pb-1 mb-2 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>Pathology & Labs ({patientDetails.pathology_reports.length})</span>
                    {patientDetails.pathology_reports.length === 0 ? (
                      <p className="text-secondary small m-0 italic">No lab reports recorded.</p>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {patientDetails.pathology_reports.map((report, idx) => {
                          let analysis = {};
                          try { analysis = typeof report.analysis === 'string' ? JSON.parse(report.analysis) : report.analysis; } catch(e) { console.error(e); }
                          return (
                            <div key={idx} className="p-3 bg-white-5 border border-white-5 rounded">
                              <div className="d-flex justify-content-between align-items-baseline">
                                <span className="text-white fw-bold" style={{ fontSize: '0.85rem' }}>🧪 Pathology Panel</span>
                                <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>{new Date(report.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="mt-2 text-secondary" style={{ fontSize: '0.8rem' }}>
                                <span className="d-block text-white fw-bold mb-1">Normalcy: <span className="text-theme-accent">{analysis?.normalcy_level || 'NORMAL'}</span></span>
                                <p className="m-0 italic">{analysis?.summary}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* AI Predictions */}
                  <div id="section-predictions" className="mt-2">
                    <span className="text-warning fw-bold d-block border-bottom border-white-5 pb-1 mb-2 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>AI Disease Risk Screenings ({patientDetails.predictions.length})</span>
                    {patientDetails.predictions.length === 0 ? (
                      <p className="text-secondary small m-0 italic">No AI prediction logs recorded.</p>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {patientDetails.predictions.map((pred, idx) => (
                          <div key={idx} className="p-3 bg-white-5 border border-white-5 rounded">
                            <div className="d-flex justify-content-between align-items-baseline">
                              <span className="text-white fw-bold" style={{ fontSize: '0.85rem' }}>🔮 {pred.disease_type} prediction</span>
                              <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>{new Date(pred.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="d-flex align-items-baseline gap-2 mt-2" style={{ fontSize: '0.8rem' }}>
                              <span className="text-secondary">Risk Score:</span>
                              <span className="text-white fw-bold">{pred.risk_score}%</span>
                              <span className={`badge px-2.5 py-1 ${
                                pred.risk_level === 'HIGH' || pred.risk_level === 'CRITICAL' 
                                  ? 'badge-clinical-danger' 
                                  : pred.risk_level === 'MODERATE' 
                                  ? 'badge-clinical-warning' 
                                  : 'badge-clinical-success'
                              }`} style={{ fontSize: '0.7rem' }}>
                                {pred.risk_level}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* RIGHT STAGE: Clinical Notes & Prescription Issuer */}
          <div className="col-lg-6 col-md-6 d-flex flex-column reveal" style={{ height: 'calc(100% - 24px)', overflow: 'hidden' }}>
            <div id="section-formulate" className="glass-card p-4 flex-grow-1 d-flex flex-column gap-3" style={{ overflow: 'hidden', borderRadius: '16px' }}>
              
              <div>
                <h4 className="fw-bold text-white font-monospace d-flex align-items-center gap-2 mb-2" style={{ fontSize: '1.15rem' }}>
                  <Sparkles className="text-theme-accent animate-pulse" size={20} />
                  Issue Clinical Guidance
                </h4>
                <p className="text-secondary font-monospace m-0" style={{ fontSize: '0.82rem' }}>
                  Formulate drug regimens and write clinical instructions for this patient profile.
                </p>
              </div>

              <form onSubmit={handlePrescribe} className="d-flex flex-column gap-3 flex-grow-1 font-monospace" style={{ overflowY: 'auto', minHeight: 0 }}>
                
                {/* Medicine Builder Row */}
                <div className="border border-white-5 p-3 rounded bg-white-5">
                  <span className="small text-theme-accent fw-bold d-block mb-3 text-uppercase" style={{ fontSize: '0.78rem' }}>Regimen Builder</span>
                  <div className="row g-2">
                    <div className="col-5">
                      <label className="small text-secondary mb-1">Medication Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Metformin" 
                        value={medName} 
                        onChange={(e) => setMedName(e.target.value)} 
                        style={{ marginBottom: 0, padding: '8px 12px', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div className="col-3">
                      <label className="small text-secondary mb-1">Dosage</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 500mg" 
                        value={medDosage} 
                        onChange={(e) => setMedDosage(e.target.value)} 
                        style={{ marginBottom: 0, padding: '8px 12px', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div className="col-4">
                      <label className="small text-secondary mb-1">Frequency</label>
                      <select 
                        value={medFreq} 
                        onChange={(e) => setMedFreq(e.target.value)} 
                        style={{ marginBottom: 0, padding: '8px 12px', fontSize: '0.82rem' }}
                      >
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily (BD)">Twice daily</option>
                        <option value="Three times (TDS)">Three times</option>
                        <option value="Before meals">Before meals</option>
                        <option value="As needed (PRN)">As needed</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={addMedicine}
                    className="btn-clinical border border-theme-accent border-opacity-30 text-theme-accent mt-3 py-2 w-100 font-monospace text-uppercase"
                    style={{ fontSize: '0.8rem' }}
                  >
                    + Add to Prescribed List
                  </button>
                </div>

                {/* Added Medicines List */}
                {doctorMeds.length > 0 && (
                  <div className="border border-white-5 p-3 rounded bg-white-5" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    <span className="small text-white fw-bold d-block mb-2 text-uppercase" style={{ fontSize: '0.78rem' }}>Current Prescribed Regimen</span>
                    <div className="d-flex flex-column gap-2">
                      {doctorMeds.map((med, idx) => (
                        <div key={idx} className="d-flex align-items-center justify-content-between p-2 bg-white-5 rounded border border-white-5">
                          <span className="text-white small" style={{ fontSize: '0.8rem' }}>💊 {med.name} ({med.dosage}) — {med.frequency}</span>
                          <button 
                            type="button" 
                            onClick={() => removeMedicine(idx)}
                            className="px-2 py-1 bg-transparent border-0 text-danger hover-white"
                            style={{ fontSize: '0.75rem' }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations notes */}
                <div className="flex-grow-1 d-flex flex-column">
                  <label className="small text-secondary fw-semibold mb-2">Clinical Diagnostics Notes & General Instructions</label>
                  <textarea 
                    placeholder="Enter diet recommendations, active lifestyle modifications, or daily telemetry review observations..."
                    value={doctorNotes} 
                    onChange={(e) => setDoctorNotes(e.target.value)} 
                    rows={5}
                    className="flex-grow-1"
                    style={{ resize: 'none', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: 'white' }}
                  />
                </div>

                {/* Clinical Safety Alert Banner */}
                {rxWarnings.length > 0 && (
                  <div className="reveal p-3 rounded border border-danger border-opacity-35 bg-danger bg-opacity-10 d-flex flex-column gap-2 text-danger small">
                    {rxWarnings.map((warning, idx) => (
                      <span key={idx} className="d-block">{warning}</span>
                    ))}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn-clinical primary py-3 d-flex align-items-center justify-content-center gap-2 font-monospace text-uppercase" 
                  disabled={submittingRx || (doctorMeds.length === 0 && !doctorNotes.trim())}
                  style={{ fontSize: '0.9rem' }}
                >
                  {submittingRx ? (
                    <>
                      <RefreshCw size={16} className="spinner-border border-0" style={{ animation: 'spin 1.5s linear infinite', width: '16px', height: '16px' }} />
                      Synchronizing clinical note...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Sign Off & Synchronize Prescription
                    </>
                  )}
                </button>

              </form>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default DoctorDashboard;
