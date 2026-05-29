import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { 
  Heart, 
  Activity, 
  ShieldAlert, 
  Compass, 
  BookOpen, 
  AlertTriangle, 
  FileText, 
  Printer, 
  RotateCcw, 
  Clock, 
  ChevronRight, 
  Cpu,
  User,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Database,
  Plus,
  Trash2,
  Calculator,
  Calendar,
  CheckSquare
} from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarContext } from '../context/SidebarContext';

function Dashboard({ user }) {
  const { setSidebarContent } = useContext(SidebarContext);
  const [selectedDisease, setSelectedDisease] = useState('heart_attack'); // 'heart_attack' | 'diabetes' | 'cancer'
  
  // Vitals & Symptoms Forms State
  const [hasChanges, setHasChanges] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [age, setAge] = useState(38);
  const [gender, setGender] = useState('M');
  const [familyHistory, setFamilyHistory] = useState('no');
  const [smoking, setSmoking] = useState('no');

  // Heart-specific
  const [systolicBp, setSystolicBp] = useState(125);
  const [diastolicBp, setDiastolicBp] = useState(82);
  const [cholesterol, setCholesterol] = useState(195);
  const [maxHeartRate, setMaxHeartRate] = useState(165);
  const [chestPain, setChestPain] = useState('none');
  const [exerciseAngina, setExerciseAngina] = useState('no');
  const [fastingSugar, setFastingSugar] = useState('no');
  const [heartSymptoms, setHeartSymptoms] = useState({
    no_symptoms: false,
    shortness_of_breath: false,
    left_arm_pain: false,
    jaw_neck_pain: false,
    cold_sweats_nausea: false,
    dizziness: false
  });

  // Diabetes-specific
  const [glucose, setGlucose] = useState(96);
  const [hba1c, setHba1c] = useState(5.2);
  const [weight, setWeight] = useState(72);
  const [height, setHeight] = useState(175);
  const [hypertension, setHypertension] = useState('no');
  const [heartDiseaseHistory, setHeartDiseaseHistory] = useState('no');
  const [diabetesSymptoms, setDiabetesSymptoms] = useState({
    no_symptoms: false,
    excessive_thirst: false,
    frequent_urination: false,
    unexplained_weight_loss: false,
    blurry_vision: false,
    slow_healing_sores: false
  });

  // Cancer-specific
  const [cancerCategory, setCancerCategory] = useState('General Screening');
  const [alcohol, setAlcohol] = useState('no');
  const [toxinExposure, setToxinExposure] = useState('no');
  const [cancerSymptoms, setCancerSymptoms] = useState({
    no_symptoms: false,
    unexplained_weight_loss: false,
    persistent_cough: false,
    persistent_fatigue: false,
    skin_mole_changes: false,
    unusual_lumps: false
  });

  // Simulation & Result State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [simulationLog, setSimulationLog] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Remedy Tab state inside results
  const [remedyTab, setRemedyTab] = useState('diet'); // 'diet' | 'lifestyle' | 'clinical'

  // Track manual changes in vitals/symptoms/demographics
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setHasChanges(true);
    }
  }, [
    age, gender, familyHistory, smoking,
    systolicBp, diastolicBp, cholesterol, maxHeartRate, chestPain, exerciseAngina, fastingSugar, heartSymptoms,
    glucose, hba1c, weight, height, hypertension, heartDiseaseHistory, diabetesSymptoms,
    cancerCategory, alcohol, toxinExposure, cancerSymptoms
  ]);

  // Compute BMI helper — parseFloat ensures it's a number, not a string
  const bmi = (weight && height) ? parseFloat((Number(weight) / ((Number(height) / 100) * (Number(height) / 100))).toFixed(1)) : 0;

  // Simulation logs to show wow factor
  const logs = [
    "Establishing neural connection to MedFusion Core...",
    "Retrieving patient demographic baseline vectors...",
    "Normalizing raw biomarkers and vitals parameters...",
    "Processing clinical variables across multi-layer neural networks...",
    "Evaluating risk scales relative to historical medical data...",
    "Assessing symptoms profiles via clinical NLP parser...",
    "Calculating predictive risk factor metrics...",
    "Upregulating protective remedy recommendations matrix...",
    "Finalizing diagnostic synthesis report..."
  ];



  const handleHeartSymptomToggle = (key) => {
    setHasChanges(true);
    if (key === 'no_symptoms') {
      setHeartSymptoms(prev => {
        const wasChecked = prev.no_symptoms;
        if (wasChecked) {
          return {
            no_symptoms: false,
            shortness_of_breath: false,
            left_arm_pain: false,
            jaw_neck_pain: false,
            cold_sweats_nausea: false,
            dizziness: false
          };
        } else {
          return {
            no_symptoms: true,
            shortness_of_breath: false,
            left_arm_pain: false,
            jaw_neck_pain: false,
            cold_sweats_nausea: false,
            dizziness: false
          };
        }
      });
    } else {
      setHeartSymptoms(prev => ({
        ...prev,
        [key]: !prev[key],
        no_symptoms: false
      }));
    }
  };

  const handleDiabetesSymptomToggle = (key) => {
    setHasChanges(true);
    if (key === 'no_symptoms') {
      setDiabetesSymptoms(prev => {
        const wasChecked = prev.no_symptoms;
        if (wasChecked) {
          return {
            no_symptoms: false,
            excessive_thirst: false,
            frequent_urination: false,
            unexplained_weight_loss: false,
            blurry_vision: false,
            slow_healing_sores: false
          };
        } else {
          return {
            no_symptoms: true,
            excessive_thirst: false,
            frequent_urination: false,
            unexplained_weight_loss: false,
            blurry_vision: false,
            slow_healing_sores: false
          };
        }
      });
    } else {
      setDiabetesSymptoms(prev => ({
        ...prev,
        [key]: !prev[key],
        no_symptoms: false
      }));
    }
  };

  const handleCancerSymptomToggle = (key) => {
    setHasChanges(true);
    if (key === 'no_symptoms') {
      setCancerSymptoms(prev => {
        const wasChecked = prev.no_symptoms;
        if (wasChecked) {
          return {
            no_symptoms: false,
            unexplained_weight_loss: false,
            persistent_cough: false,
            persistent_fatigue: false,
            skin_mole_changes: false,
            unusual_lumps: false
          };
        } else {
          return {
            no_symptoms: true,
            unexplained_weight_loss: false,
            persistent_cough: false,
            persistent_fatigue: false,
            skin_mole_changes: false,
            unusual_lumps: false
          };
        }
      });
    } else {
      setCancerSymptoms(prev => ({
        ...prev,
        [key]: !prev[key],
        no_symptoms: false
      }));
    }
  };

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

  // Doctor Dashboard Widgets State
  const [plannerTasks, setPlannerTasks] = useState(() => {
    if (user && user.role === 'Doctor') {
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
  const [calcTab, setCalcTab] = useState('bmi'); // 'bmi' | 'thr'
  const [calcWeight, setCalcWeight] = useState(70);
  const [calcHeight, setCalcHeight] = useState(175);
  const [calcAge, setCalcAge] = useState(35);

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

  const getAge = (dobString) => {
    try {
      const birth = new Date(dobString);
      const diff = Date.now() - birth.getTime();
      return Math.abs(new Date(diff).getUTCFullYear() - 1970);
    } catch (e) {
      return 30;
    }
  };

  // Fetch Patients Registry for Doctors
  const fetchPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const res = await api.get('/patients');
      setPatients(res.data.patients || []);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

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

  // Sync patients on mount for Doctors
  useEffect(() => {
    if (user && user.role === 'Doctor') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPatients();
    }
  }, [user, fetchPatients]);

  // Sync patient records when selecting a patient
  useEffect(() => {
    if (selectedPatient) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPatientDetails(selectedPatient.id);
      setDoctorNotes('');
      setDoctorMeds([]);
    }
  }, [selectedPatient, fetchPatientDetails]);

  const applyHeartPreset = (type) => {
    setHasChanges(true);
    if (type === 'healthy') {
      setSystolicBp(120);
      setDiastolicBp(80);
      setCholesterol(180);
      setMaxHeartRate(160);
      setChestPain('none');
      setExerciseAngina('no');
      setFastingSugar('no');
      setHeartSymptoms({
        no_symptoms: true,
        shortness_of_breath: false,
        left_arm_pain: false,
        jaw_neck_pain: false,
        cold_sweats_nausea: false,
        dizziness: false
      });
    } else {
      setSystolicBp(165);
      setDiastolicBp(95);
      setCholesterol(285);
      setMaxHeartRate(175);
      setChestPain('typical_angina');
      setExerciseAngina('yes');
      setFastingSugar('yes');
      setHeartSymptoms({
        no_symptoms: false,
        shortness_of_breath: true,
        left_arm_pain: true,
        jaw_neck_pain: true,
        cold_sweats_nausea: true,
        dizziness: false
      });
    }
  };

  const applyDiabetesPreset = (type) => {
    setHasChanges(true);
    if (type === 'healthy') {
      setGlucose(90);
      setHba1c(5.0);
      setWeight(70);
      setHeight(175);
      setHypertension('no');
      setHeartDiseaseHistory('no');
      setDiabetesSymptoms({
        no_symptoms: true,
        excessive_thirst: false,
        frequent_urination: false,
        unexplained_weight_loss: false,
        blurry_vision: false,
        slow_healing_sores: false
      });
    } else {
      setGlucose(210);
      setHba1c(8.5);
      setWeight(105);
      setHeight(175);
      setHypertension('yes');
      setHeartDiseaseHistory('yes');
      setDiabetesSymptoms({
        no_symptoms: false,
        excessive_thirst: true,
        frequent_urination: true,
        unexplained_weight_loss: false,
        blurry_vision: false,
        slow_healing_sores: true
      });
    }
  };

  const applyCancerPreset = (type) => {
    setHasChanges(true);
    if (type === 'healthy') {
      setCancerCategory('General Screening');
      setAlcohol('no');
      setToxinExposure('no');
      setCancerSymptoms({
        no_symptoms: true,
        unexplained_weight_loss: false,
        persistent_cough: false,
        persistent_fatigue: false,
        skin_mole_changes: false,
        unusual_lumps: false
      });
    } else {
      setCancerCategory('Lung Cancer');
      setAlcohol('yes');
      setToxinExposure('yes');
      setCancerSymptoms({
        no_symptoms: false,
        unexplained_weight_loss: true,
        persistent_cough: true,
        persistent_fatigue: true,
        skin_mole_changes: false,
        unusual_lumps: false
      });
    }
  };

  // Reset result when switching disease type so the form is always visible
  const handleDiseaseSelect = useCallback((id) => {
    if (isAnalyzing) return;
    setSelectedDisease(id);
    setResult(null);
    setError('');
    setHasChanges(false);
    setConsentChecked(false);
  }, [isAnalyzing]);

  useEffect(() => {
    if (user && user.role === 'Doctor') {
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
            /* ========================================== */
            /* DIRECTORY VIEW: Practice Analytics & Patient Index */
            /* ========================================== */
            <div className="reveal d-flex flex-column gap-4">
              
              {/* Practice Stats Board */}
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
            /* ========================================== */
            /* INSPECT VIEW: Return Control & Section Quick Links */
            /* ========================================== */
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
    } else {
      setSidebarContent(
        <div className="d-flex flex-column gap-4 pt-2">
          {/* Sleek Medical Header Console inside Sidebar */}
          <div className="glass-card p-4 mb-2 reveal border-theme-accent border-opacity-15 bg-white-5" style={{ borderRadius: '12px' }}>
            <h2 className="fw-bolder fs-6 m-0 text-white" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem' }}>
              AI Health <span className="text-theme-accent" style={{ textShadow: '0 0 20px var(--theme-accent-glow)' }}>Diagnostics</span>
            </h2>
            <p className="text-secondary m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
              Enter your medical numbers and symptoms to check your health risks instantly.
            </p>
          </div>

          {/* Screening Profile selector */}
          <div className="mt-2">
            <h4 className="fw-bold mb-3 text-white" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              <span className="text-theme-accent font-monospace text-uppercase" style={{ letterSpacing: '0.06em' }}>Screening Profile</span>
            </h4>
            <div className="d-flex flex-column gap-3 mt-3">
              {[
                { id: 'heart_attack', label: 'Heart Attack Predictor', icon: <Heart size={20} /> },
                { id: 'diabetes', label: 'Diabetes Risk Engine', icon: <Activity size={20} /> },
                { id: 'cancer', label: 'Cancer Risk Surveillance', icon: <Compass size={20} /> },
              ].map((disease) => (
                <div 
                  key={disease.id}
                  onClick={() => handleDiseaseSelect(disease.id)}
                  className={`disease-select-tile cursor-pointer ${
                    selectedDisease === disease.id ? `active ${disease.id === 'heart_attack' ? 'heart' : disease.id === 'diabetes' ? 'diabetes' : 'cancer'}` : 'inactive'
                  } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ padding: '16px 20px' }}
                >
                  <div className="d-flex align-items-center justify-content-start gap-3 font-monospace fw-bold text-uppercase" style={{ fontSize: '0.9rem' }}>
                    {disease.icon}
                    <span>{disease.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
      return () => setSidebarContent(null);
    }
  }, [selectedDisease, handleDiseaseSelect, setSidebarContent, isAnalyzing, user, selectedPatient, patients]);

  const runPredictionAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setSimulationLog(logs[0]);
    setError('');

    // Simulate premium visual telemetry loading
    let apiCallDispatched = false;
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        const nextProgress = prev + 12;
        if (nextProgress >= 100) {
          clearInterval(interval);
          if (!apiCallDispatched) {
            apiCallDispatched = true;
            executeApiCall();
          }
          return 100;
        }
        const currentLogIdx = Math.min(Math.floor(nextProgress / 12), logs.length - 1);
        setSimulationLog(logs[currentLogIdx]);
        return nextProgress;
      });
    }, 400);

    const executeApiCall = async () => {
      let params = { age, gender, family_history: familyHistory, smoking };

      if (selectedDisease === 'heart_attack') {
        params = {
          ...params,
          systolic_bp: systolicBp,
          diastolic_bp: diastolicBp,
          cholesterol,
          max_heart_rate: maxHeartRate,
          chest_pain: chestPain,
          exercise_angina: exerciseAngina,
          fasting_sugar: fastingSugar,
          symptoms: Object.keys(heartSymptoms).filter(k => heartSymptoms[k])
        };
      } else if (selectedDisease === 'diabetes') {
        params = {
          ...params,
          glucose,
          hba1c,
          weight,
          height,
          bmi,
          hypertension,
          heart_disease_history: heartDiseaseHistory,
          symptoms: Object.keys(diabetesSymptoms).filter(k => diabetesSymptoms[k])
        };
      } else {
        params = {
          ...params,
          cancer_type: cancerCategory,
          alcohol,
          exposure: toxinExposure,
          symptoms: Object.keys(cancerSymptoms).filter(k => cancerSymptoms[k])
        };
      }

      try {
        const response = await api.post('/predictions/predict/', {
          disease_type: selectedDisease === 'heart_attack' ? 'Heart Attack' : selectedDisease === 'diabetes' ? 'Diabetes' : 'Cancer Screening',
          parameters: params
        });
        
        setResult(response.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Prediction analysis failed');
      } finally {
        setIsAnalyzing(false);
      }
    };
  };

  const resetPredictor = () => {
    setResult(null);
    setAnalysisProgress(0);
    setError('');
  };

  const getRiskColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return '#ff0055'; // Vibrant Pink Red
      case 'HIGH': return '#ff8c00';     // Amber Orange
      case 'MODERATE': return '#ffd700'; // Pure Yellow
      default: return '#00f5d4';         // Neon Mint Green
    }
  };

  const getRiskBg = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'rgba(255, 0, 85, 0.2)';
      case 'HIGH': return 'rgba(255, 140, 0, 0.2)';
      case 'MODERATE': return 'rgba(255, 215, 0, 0.2)';
      default: return 'rgba(0, 245, 212, 0.2)';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderDiseaseVitals = () => {
    switch (selectedDisease) {
      case 'heart_attack':
        return (
          <div className="reveal">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <h4 className="fw-bold text-white d-flex align-items-center gap-2 m-0" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
                <Heart className="animate-pulse" size={18} style={{ color: 'var(--theme-accent)' }} />
                <span style={{ color: 'var(--theme-accent)' }}>Cardiovascular Vitals</span>
              </h4>
              <div className="d-flex gap-2">
                <button 
                  type="button" 
                  onClick={() => applyHeartPreset('healthy')}
                  className="btn border rounded font-monospace hover-white px-3 py-1.5"
                  style={{ fontSize: '0.78rem', width: 'auto', backgroundColor: 'rgba(25, 135, 84, 0.2)', color: '#4ade80', borderColor: 'rgba(25, 135, 84, 0.5)' }}
                >
                  🌿 Healthy Preset
                </button>
                <button 
                  type="button" 
                  onClick={() => applyHeartPreset('risk')}
                  className="btn border rounded font-monospace hover-white px-3 py-1.5"
                  style={{ fontSize: '0.78rem', width: 'auto', backgroundColor: 'rgba(220, 53, 69, 0.2)', color: '#f87171', borderColor: 'rgba(220, 53, 69, 0.5)' }}
                >
                  ⚠️ High Risk Preset
                </button>
              </div>
            </div>
            
            <div className="row g-3">
              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">SYSTOLIC PRESSURE</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      type="range" 
                      value={systolicBp} 
                      onChange={(e) => setSystolicBp(Number(e.target.value))} 
                      min="80" max="220" 
                      className="flex-grow-1 m-0"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                      <input 
                        type="number" 
                        value={systolicBp} 
                        onChange={(e) => setSystolicBp(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (systolicBp === '' || systolicBp < 80) setSystolicBp(125);
                          else if (systolicBp > 220) setSystolicBp(220);
                        }}
                        min="80" max="220"
                        className="typeable-number-input"
                        style={{
                          width: '65px',
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: 'var(--theme-accent)',
                          textAlign: 'center',
                          padding: '3px 6px',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          outline: 'none'
                        }}
                      />
                      <span>mmHg</span>
                    </div>
                  </div>
                  <small className="text-secondary d-block mt-2" style={{ fontSize: '0.74rem' }}>Normal range: 90 - 120 mmHg</small>
                </div>
              </div>
              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">DIASTOLIC PRESSURE</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      type="range" 
                      value={diastolicBp} 
                      onChange={(e) => setDiastolicBp(Number(e.target.value))} 
                      min="40" max="130" 
                      className="flex-grow-1 m-0"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                      <input 
                        type="number" 
                        value={diastolicBp} 
                        onChange={(e) => setDiastolicBp(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (diastolicBp === '' || diastolicBp < 40) setDiastolicBp(82);
                          else if (diastolicBp > 130) setDiastolicBp(130);
                        }}
                        min="40" max="130"
                        className="typeable-number-input"
                        style={{
                          width: '65px',
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: 'var(--theme-accent)',
                          textAlign: 'center',
                          padding: '3px 6px',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          outline: 'none'
                        }}
                      />
                      <span>mmHg</span>
                    </div>
                  </div>
                  <small className="text-secondary d-block mt-2" style={{ fontSize: '0.74rem' }}>Normal range: 60 - 80 mmHg</small>
                </div>
              </div>

              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">SERUM CHOLESTEROL</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      type="range" 
                      value={cholesterol} 
                      onChange={(e) => setCholesterol(Number(e.target.value))} 
                      min="100" max="400" 
                      className="flex-grow-1 m-0"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                      <input 
                        type="number" 
                        value={cholesterol} 
                        onChange={(e) => setCholesterol(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (cholesterol === '' || cholesterol < 100) setCholesterol(195);
                          else if (cholesterol > 400) setCholesterol(400);
                        }}
                        min="100" max="400"
                        className="typeable-number-input"
                        style={{
                          width: '65px',
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: 'var(--theme-accent)',
                          textAlign: 'center',
                          padding: '3px 6px',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          outline: 'none'
                        }}
                      />
                      <span>mg/dL</span>
                    </div>
                  </div>
                  <small className="text-secondary d-block mt-2" style={{ fontSize: '0.74rem' }}>Normal range: &lt; 200 mg/dL</small>
                </div>
              </div>
              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">MAX HEART RATE</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      type="range" 
                      value={maxHeartRate} 
                      onChange={(e) => setMaxHeartRate(Number(e.target.value))} 
                      min="60" max="220" 
                      className="flex-grow-1 m-0"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                      <input 
                        type="number" 
                        value={maxHeartRate} 
                        onChange={(e) => setMaxHeartRate(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (maxHeartRate === '' || maxHeartRate < 60) setMaxHeartRate(165);
                          else if (maxHeartRate > 220) setMaxHeartRate(220);
                        }}
                        min="60" max="220"
                        className="typeable-number-input"
                        style={{
                          width: '65px',
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: 'var(--theme-accent)',
                          textAlign: 'center',
                          padding: '3px 6px',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          outline: 'none'
                        }}
                      />
                      <span>BPM</span>
                    </div>
                  </div>
                  <small className="text-secondary d-block mt-2" style={{ fontSize: '0.74rem' }}>Normal range: 60 - 100 BPM</small>
                </div>
              </div>

              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">CHEST PAIN PROFILE</label>
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { val: 'none', label: 'Asymptomatic' },
                      { val: 'mild', label: 'Mild Discomfort' },
                      { val: 'typical_angina', label: 'Typical Angina' },
                      { val: 'atypical_angina', label: 'Atypical Angina' },
                      { val: 'non_anginal', label: 'Non-Anginal' }
                    ].map(opt => (
                      <div 
                        key={opt.val} onClick={() => setChestPain(opt.val)}
                        className={`px-2 py-2 rounded border cursor-pointer font-monospace text-center flex-grow-1 ${chestPain === opt.val ? 'border-theme-accent bg-theme-accent bg-opacity-10 text-white fw-bold' : 'border-white-10 bg-white-5 text-secondary hover-white'}`}
                        style={{ fontSize: '0.75rem', transition: 'all 0.2s' }}
                      >{opt.label}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">EXERCISE ANGINA</label>
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { val: 'no', label: 'No induced pain' },
                      { val: 'mild', label: 'Mild discomfort' },
                      { val: 'yes', label: 'Pain induced' }
                    ].map(opt => (
                      <div 
                        key={opt.val} onClick={() => setExerciseAngina(opt.val)}
                        className={`px-2 py-2 rounded border cursor-pointer font-monospace text-center flex-grow-1 ${exerciseAngina === opt.val ? 'border-theme-accent bg-theme-accent bg-opacity-10 text-white fw-bold' : 'border-white-10 bg-white-5 text-secondary hover-white'}`}
                        style={{ fontSize: '0.75rem', transition: 'all 0.2s' }}
                      >{opt.label}</div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="col-12">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">ELEVATED FASTING BLOOD GLUCOSE (&gt; 120 mg/dL)</label>
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { val: 'no', label: 'Normal' },
                      { val: 'mild', label: 'Borderline' },
                      { val: 'yes', label: 'Elevated' }
                    ].map(opt => (
                      <div 
                        key={opt.val} onClick={() => setFastingSugar(opt.val)}
                        className={`px-3 py-2 rounded border cursor-pointer font-monospace text-center flex-grow-1 ${fastingSugar === opt.val ? 'border-theme-accent bg-theme-accent bg-opacity-10 text-white fw-bold' : 'border-white-10 bg-white-5 text-secondary hover-white'}`}
                        style={{ fontSize: '0.8rem', transition: 'all 0.2s' }}
                      >{opt.label}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'diabetes':
        return (
          <div className="reveal">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <h4 className="fw-bold text-white d-flex align-items-center gap-2 m-0" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
                <Activity className="animate-pulse" size={18} style={{ color: 'var(--theme-accent)' }} />
                <span style={{ color: 'var(--theme-accent)' }}>Metabolic & Glycemic Parameters</span>
              </h4>
              <div className="d-flex gap-2">
                <button 
                  type="button" 
                  onClick={() => applyDiabetesPreset('healthy')}
                  className="btn border rounded font-monospace hover-white px-3 py-1.5"
                  style={{ fontSize: '0.78rem', width: 'auto', backgroundColor: 'rgba(25, 135, 84, 0.2)', color: '#4ade80', borderColor: 'rgba(25, 135, 84, 0.5)' }}
                >
                  🌿 Healthy Preset
                </button>
                <button 
                  type="button" 
                  onClick={() => applyDiabetesPreset('risk')}
                  className="btn border rounded font-monospace hover-white px-3 py-1.5"
                  style={{ fontSize: '0.78rem', width: 'auto', backgroundColor: 'rgba(220, 53, 69, 0.2)', color: '#f87171', borderColor: 'rgba(220, 53, 69, 0.5)' }}
                >
                  ⚠️ High Risk Preset
                </button>
              </div>
            </div>
            
            <div className="row g-3">
              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">FASTING GLUCOSE</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      type="range" 
                      value={glucose} 
                      onChange={(e) => setGlucose(Number(e.target.value))} 
                      min="50" max="400" 
                      className="flex-grow-1 m-0"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                      <input 
                        type="number" 
                        value={glucose} 
                        onChange={(e) => setGlucose(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (glucose === '' || glucose < 50) setGlucose(96);
                          else if (glucose > 400) setGlucose(400);
                        }}
                        min="50" max="400"
                        className="typeable-number-input"
                        style={{
                          width: '65px',
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: 'var(--theme-accent)',
                          textAlign: 'center',
                          padding: '3px 6px',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          outline: 'none'
                        }}
                      />
                      <span>mg/dL</span>
                    </div>
                  </div>
                  <small className="text-secondary d-block mt-2" style={{ fontSize: '0.74rem' }}>Normal range: 70 - 100 mg/dL</small>
                </div>
              </div>
              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">HbA1c LEVEL</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      type="range" 
                      step="0.1"
                      value={hba1c} 
                      onChange={(e) => setHba1c(Number(e.target.value))} 
                      min="3.0" max="16.0" 
                      className="flex-grow-1 m-0"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                      <input 
                        type="number" 
                        step="0.1"
                        value={hba1c} 
                        onChange={(e) => setHba1c(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (hba1c === '' || hba1c < 3.0) setHba1c(5.2);
                          else if (hba1c > 16.0) setHba1c(16.0);
                        }}
                        min="3.0" max="16.0"
                        className="typeable-number-input"
                        style={{
                          width: '65px',
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: 'var(--theme-accent)',
                          textAlign: 'center',
                          padding: '3px 6px',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          outline: 'none'
                        }}
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <small className="text-secondary d-block mt-2" style={{ fontSize: '0.74rem' }}>Normal range: &lt; 5.7%</small>
                </div>
              </div>

              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">WEIGHT</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      type="range" 
                      value={weight} 
                      onChange={(e) => setWeight(Number(e.target.value))} 
                      min="30" max="250" 
                      className="flex-grow-1 m-0"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                      <input 
                        type="number" 
                        value={weight} 
                        onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (weight === '' || weight < 30) setWeight(72);
                          else if (weight > 250) setWeight(250);
                        }}
                        min="30" max="250"
                        className="typeable-number-input"
                        style={{
                          width: '65px',
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: 'var(--theme-accent)',
                          textAlign: 'center',
                          padding: '3px 6px',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          outline: 'none'
                        }}
                      />
                      <span>kg</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">HEIGHT</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      type="range" 
                      value={height} 
                      onChange={(e) => setHeight(Number(e.target.value))} 
                      min="100" max="250" 
                      className="flex-grow-1 m-0"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                      <input 
                        type="number" 
                        value={height} 
                        onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (height === '' || height < 100) setHeight(175);
                          else if (height > 250) setHeight(250);
                        }}
                        min="100" max="250"
                        className="typeable-number-input"
                        style={{
                          width: '65px',
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: 'var(--theme-accent)',
                          textAlign: 'center',
                          padding: '3px 6px',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          outline: 'none'
                        }}
                      />
                      <span>cm</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">HYPERTENSION</label>
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { val: 'no', label: 'None' },
                      { val: 'mild', label: 'Prehypertension' },
                      { val: 'yes', label: 'Diagnosed' }
                    ].map(opt => (
                      <div 
                        key={opt.val} onClick={() => setHypertension(opt.val)}
                        className={`px-2 py-2 rounded border cursor-pointer font-monospace text-center flex-grow-1 ${hypertension === opt.val ? 'border-theme-accent bg-theme-accent bg-opacity-10 text-white fw-bold' : 'border-white-10 bg-white-5 text-secondary hover-white'}`}
                        style={{ fontSize: '0.75rem', transition: 'all 0.2s' }}
                      >{opt.label}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">PREVIOUS HEART DISEASE</label>
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { val: 'no', label: 'None' },
                      { val: 'mild', label: 'Mild / Stable' },
                      { val: 'yes', label: 'Present' }
                    ].map(opt => (
                      <div 
                        key={opt.val} onClick={() => setHeartDiseaseHistory(opt.val)}
                        className={`px-2 py-2 rounded border cursor-pointer font-monospace text-center flex-grow-1 ${heartDiseaseHistory === opt.val ? 'border-theme-accent bg-theme-accent bg-opacity-10 text-white fw-bold' : 'border-white-10 bg-white-5 text-secondary hover-white'}`}
                        style={{ fontSize: '0.75rem', transition: 'all 0.2s' }}
                      >{opt.label}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="predictor-card d-flex flex-row justify-content-between align-items-center font-monospace" style={{ padding: '20px' }}>
                  <span className="small text-secondary" style={{ marginBottom: 0 }}>CALCULATING BODY MASS INDEX (BMI)</span>
                  <span className="fw-bold" style={{ textShadow: '0 0 10px var(--theme-accent-glow)', color: 'var(--theme-accent)' }}>{bmi} kg/m²</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'cancer':
        return (
          <div className="reveal">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <h4 className="fw-bold text-white d-flex align-items-center gap-2 m-0" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
                <Compass className="animate-pulse" size={18} style={{ color: 'var(--theme-accent)' }} />
                <span style={{ color: 'var(--theme-accent)' }}>Oncological Surveillance Parameters</span>
              </h4>
              <div className="d-flex gap-2">
                <button 
                  type="button" 
                  onClick={() => applyCancerPreset('healthy')}
                  className="btn border rounded font-monospace hover-white px-3 py-1.5"
                  style={{ fontSize: '0.78rem', width: 'auto', backgroundColor: 'rgba(25, 135, 84, 0.2)', color: '#4ade80', borderColor: 'rgba(25, 135, 84, 0.5)' }}
                >
                  🌿 Healthy Preset
                </button>
                <button 
                  type="button" 
                  onClick={() => applyCancerPreset('risk')}
                  className="btn border rounded font-monospace hover-white px-3 py-1.5"
                  style={{ fontSize: '0.78rem', width: 'auto', backgroundColor: 'rgba(220, 53, 69, 0.2)', color: '#f87171', borderColor: 'rgba(220, 53, 69, 0.5)' }}
                >
                  ⚠️ High Risk Preset
                </button>
              </div>
            </div>
            
            <div className="row g-3">
              <div className="col-md-12">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">TARGET CANCER SCREENING CATEGORY</label>
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { val: 'General Screening', label: 'General / Multi-Organ' },
                      { val: 'Lung Cancer', label: 'Lung (Pulmonary)' },
                      { val: 'Breast Cancer', label: 'Breast (Mammographic)' },
                      { val: 'Prostate Cancer', label: 'Prostate (Urological)' },
                      { val: 'Colorectal Cancer', label: 'Colorectal (GI)' },
                      { val: 'Skin Cancer', label: 'Skin (Melanoma)' }
                    ].map(opt => (
                      <div 
                        key={opt.val} onClick={() => setCancerCategory(opt.val)}
                        className={`px-3 py-2 rounded border cursor-pointer font-monospace text-center flex-grow-1 ${cancerCategory === opt.val ? 'border-theme-accent bg-theme-accent bg-opacity-10 text-white fw-bold' : 'border-white-10 bg-white-5 text-secondary hover-white'}`}
                        style={{ fontSize: '0.8rem', transition: 'all 0.2s' }}
                      >{opt.label}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">ALCOHOL CONSUMPTION RANGE</label>
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { val: 'no', label: 'None / Rare' },
                      { val: 'mild', label: 'Occasional' },
                      { val: 'yes', label: 'Moderate / Heavy' }
                    ].map(opt => (
                      <div 
                        key={opt.val} onClick={() => setAlcohol(opt.val)}
                        className={`px-2 py-2 rounded border cursor-pointer font-monospace text-center flex-grow-1 ${alcohol === opt.val ? 'border-theme-accent bg-theme-accent bg-opacity-10 text-white fw-bold' : 'border-white-10 bg-white-5 text-secondary hover-white'}`}
                        style={{ fontSize: '0.75rem', transition: 'all 0.2s' }}
                      >{opt.label}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">OCCUPATIONAL HAZARD/TOXIN EXPOSURE</label>
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { val: 'no', label: 'None' },
                      { val: 'mild', label: 'Intermittent' },
                      { val: 'yes', label: 'High Exposure' }
                    ].map(opt => (
                      <div 
                        key={opt.val} onClick={() => setToxinExposure(opt.val)}
                        className={`px-2 py-2 rounded border cursor-pointer font-monospace text-center flex-grow-1 ${toxinExposure === opt.val ? 'border-theme-accent bg-theme-accent bg-opacity-10 text-white fw-bold' : 'border-white-10 bg-white-5 text-secondary hover-white'}`}
                        style={{ fontSize: '0.75rem', transition: 'all 0.2s' }}
                      >{opt.label}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderDiseaseSymptoms = () => {
    switch (selectedDisease) {
      case 'heart_attack':
        return (
          <div className="reveal">
            <h4 className="fw-bold mb-4 text-white d-flex align-items-center gap-2" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              <ShieldAlert className="animate-pulse" size={18} style={{ color: 'var(--theme-accent)' }} />
              <span style={{ color: 'var(--theme-accent)' }}>Active Cardiovascular Symptoms Checklist</span>
            </h4>
            <div className="row g-2">
              {Object.keys(heartSymptoms).map((sym) => (
                <div className="col-md-6" key={sym}>
                  <div 
                    onClick={() => handleHeartSymptomToggle(sym)}
                    className={`p-3 rounded border cursor-pointer transition-all d-flex align-items-center gap-3 ${
                      heartSymptoms[sym] 
                        ? (sym === 'no_symptoms' ? 'active-no-symptoms' : 'border-heart active-symptom') 
                        : 'border-white-5 hover-border-white-10 text-secondary bg-white-10 bg-opacity-30'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={heartSymptoms[sym]} 
                      onChange={() => handleHeartSymptomToggle(sym)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={sym.replace(/_/g, ' ')}
                      className="m-0 cursor-pointer"
                      style={{ width: '20px', height: '20px', marginBottom: 0 }}
                    />
                    <span className={`text-capitalize font-monospace ${heartSymptoms[sym] ? 'text-white fw-bold' : ''}`} style={{ fontSize: '0.95rem' }}>{sym.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'diabetes':
        return (
          <div className="reveal">
            <h4 className="fw-bold mb-4 text-white d-flex align-items-center gap-2" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              <ShieldAlert className="animate-pulse" size={18} style={{ color: 'var(--theme-accent)' }} />
              <span style={{ color: 'var(--theme-accent)' }}>Active Glycemic Symptoms Checklist</span>
            </h4>
            <div className="row g-2">
              {Object.keys(diabetesSymptoms).map((sym) => (
                <div className="col-md-6" key={sym}>
                  <div 
                    onClick={() => handleDiabetesSymptomToggle(sym)}
                    className={`p-3 rounded border cursor-pointer transition-all d-flex align-items-center gap-3 ${
                      diabetesSymptoms[sym] 
                        ? (sym === 'no_symptoms' ? 'active-no-symptoms' : 'border-diabetes active-symptom') 
                        : 'border-white-5 hover-border-white-10 text-secondary bg-white-10 bg-opacity-30'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={diabetesSymptoms[sym]} 
                      onChange={() => handleDiabetesSymptomToggle(sym)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={sym.replace(/_/g, ' ')}
                      className="m-0 cursor-pointer"
                      style={{ width: '20px', height: '20px', marginBottom: 0 }}
                    />
                    <span className={`text-capitalize font-monospace ${diabetesSymptoms[sym] ? 'text-white fw-bold' : ''}`} style={{ fontSize: '0.95rem' }}>{sym.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'cancer':
        return (
          <div className="reveal">
            <h4 className="fw-bold mb-4 text-white d-flex align-items-center gap-2" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              <ShieldAlert className="animate-pulse" size={18} style={{ color: 'var(--theme-accent)' }} />
              <span style={{ color: 'var(--theme-accent)' }}>Active Oncological Symptoms & Warning Flags</span>
            </h4>
            <div className="row g-2">
              {Object.keys(cancerSymptoms).map((sym) => (
                <div className="col-md-6" key={sym}>
                  <div 
                    onClick={() => handleCancerSymptomToggle(sym)}
                    className={`p-3 rounded border cursor-pointer transition-all d-flex align-items-center gap-3 ${
                      cancerSymptoms[sym] 
                        ? (sym === 'no_symptoms' ? 'active-no-symptoms' : 'border-cancer active-symptom') 
                        : 'border-white-5 hover-border-white-10 text-secondary bg-white-10 bg-opacity-30'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={cancerSymptoms[sym]} 
                      onChange={() => handleCancerSymptomToggle(sym)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={sym.replace(/_/g, ' ')}
                      className="m-0 cursor-pointer"
                      style={{ width: '20px', height: '20px', marginBottom: 0 }}
                    />
                    <span className={`text-capitalize font-monospace ${cancerSymptoms[sym] ? 'text-white fw-bold' : ''}`} style={{ fontSize: '0.95rem' }}>{sym.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getThemeClass = () => {
    if (selectedDisease === 'heart_attack') return 'theme-heart';
    if (selectedDisease === 'diabetes') return 'theme-diabetes';
    if (selectedDisease === 'cancer') return 'theme-cancer';
    return 'theme-general';
  };

  if (user && user.role === 'Doctor') {
    return (
      <div className="reveal px-1 py-1 theme-general font-monospace" style={{ height: 'calc(100vh - 155px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!selectedPatient ? (
          /* ============================================================== */
          /* PATIENT DIRECTORY SCREEN WITH SIDEBAR WIDGETS */
          /* ============================================================== */
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
                            {p.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'P'}
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

            {/* Sidebar Tools Column */}
            <div className="col-lg-4 d-flex flex-column justify-content-start gap-4" style={{ height: 'calc(100% - 24px)', overflow: 'hidden' }}>
              
              {/* Daily Clinical Planner widget */}
              <div className="glass-card p-4 d-flex flex-column gap-3 flex-grow-1" style={{ borderRadius: '16px', overflow: 'hidden' }}>
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
              <div className="glass-card p-4 d-flex flex-column gap-3" style={{ borderRadius: '16px' }}>
                <div className="d-flex align-items-center justify-content-between border-bottom border-white-10 pb-2">
                  <div className="d-flex align-items-center gap-2">
                    <Calculator className="text-theme-accent" size={18} />
                    <h4 className="fw-bold m-0 text-white text-uppercase" style={{ fontSize: '0.95rem', letterSpacing: '0.02em' }}>Quick Calc</h4>
                  </div>
                  
                  {/* Calc tabs */}
                  <div className="d-flex gap-1">
                    <button 
                      onClick={() => setCalcTab('bmi')} 
                      className={`px-2 py-0.5 rounded font-monospace text-uppercase`} 
                      style={{ fontSize: '0.7rem', width: 'auto', background: calcTab === 'bmi' ? 'rgba(0,245,212,0.15)' : 'transparent', color: calcTab === 'bmi' ? '#00f5d4' : '#6c757d', border: calcTab === 'bmi' ? '1px solid rgba(0,245,212,0.3)' : '1px solid transparent' }}
                    >
                      BMI
                    </button>
                    <button 
                      onClick={() => setCalcTab('thr')} 
                      className={`px-2 py-0.5 rounded font-monospace text-uppercase`} 
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
          /* ============================================================== */
          /* PATIENT DETAIL & ACTIONS SCREEN */
          /* ============================================================== */
          <div className="row g-4 align-items-stretch flex-grow-1" style={{ minHeight: 0, overflow: 'hidden' }}>
            
            {/* LEFT STAGE: Patient Information, Diagnostic & Ingested Records */}
            <div className="col-lg-6 col-md-6 d-flex flex-column gap-4 reveal" style={{ height: 'calc(100% - 24px)', overflow: 'hidden' }}>
              
              {/* Profile Card */}
              <div id="section-profile" className="glass-card p-4">
                <div className="d-flex align-items-center gap-3 mb-3 border-bottom border-white-10 pb-3">
                  <div className="rounded-circle bg-theme-accent bg-opacity-10 border border-theme-accent border-opacity-35 d-flex align-items-center justify-content-center fw-bold text-theme-accent" style={{ width: '48px', height: '48px', fontSize: '1.1rem' }}>
                    {selectedPatient.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'P'}
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
                    <span className="text-white fw-bold">{selectedPatient.blood_group}</span>
                  </div>
                  <div className="col-4">
                    <span className="text-secondary d-block">Emergency</span>
                    <span className="text-white fw-bold">{selectedPatient.emergency_contact}</span>
                  </div>
                  <div className="col-4">
                    <span className="text-secondary d-block">Weight</span>
                    <span className="text-white fw-bold">{selectedPatient.weight} kg</span>
                  </div>
                  <div className="col-4">
                    <span className="text-secondary d-block">Height</span>
                    <span className="text-white fw-bold">{selectedPatient.height} cm</span>
                  </div>
                  <div className="col-4">
                    <span className="text-secondary d-block">DOB</span>
                    <span className="text-white fw-bold">{selectedPatient.dob}</span>
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
                                <span className={`badge ${
                                  pred.risk_level === 'HIGH' || pred.risk_level === 'CRITICAL' 
                                    ? 'bg-danger bg-opacity-20 text-danger border-danger' 
                                    : pred.risk_level === 'MODERATE' 
                                    ? 'bg-warning bg-opacity-20 text-warning border-warning' 
                                    : 'bg-theme-accent bg-opacity-20 text-theme-accent border-theme-accent'
                                } border py-0.5 px-1.5`} style={{ fontSize: '0.7rem' }}>
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

                  {/* Submit Regimen */}
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

  return (
    <div className={`reveal px-1 py-1 ${getThemeClass()}`}>


      <div className="row g-4 mt-2 align-items-stretch">
          
          {/* ============================================================== */}
          {/* CENTERED LAYOUT STAGE: Vitals Forms and Holographic Results HUD */}
          {/* ============================================================== */}
          <div className="col-12 col-xl-10 mx-auto reveal">
            <AnimatePresence mode="wait">
              
              {/* STAGE A: Input Form Interface */}
              {!result && !isAnalyzing && (
                <motion.div 
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="d-flex flex-column gap-4"
                >
                  {/* Container 1: Modular Demographics Card */}
                  <div className="glass-card p-4">
                    <h4 className="fw-bold mb-3 text-white d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
                      <User className="animate-pulse" size={18} style={{ color: 'var(--theme-accent)' }} />
                      <span style={{ color: 'var(--theme-accent)' }}>Patient Demographics</span>
                    </h4>
                    <div className="row g-3 mt-1">
                      <div className="col-md-6">
                        <div className="predictor-card">
                          <label className="small text-secondary fw-semibold mb-2 font-monospace d-block">Age (Years)</label>
                          <div className="d-flex align-items-center gap-3">
                            <input 
                              type="range" 
                              min="1" max="110" 
                              value={age} 
                              onChange={(e) => setAge(Number(e.target.value))}
                              className="flex-grow-1"
                              style={{ margin: 0 }}
                            />
                            <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                              <input 
                                type="number" 
                                value={age} 
                                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                                onBlur={() => {
                                  if (age === '' || age < 1) setAge(38);
                                  else if (age > 110) setAge(110);
                                }}
                                min="1" max="110"
                                className="typeable-number-input"
                                style={{
                                  width: '65px',
                                  background: 'rgba(255,255,255,0.07)',
                                  border: '1px solid rgba(255,255,255,0.15)',
                                  borderRadius: '4px',
                                  color: 'var(--theme-accent)',
                                  textAlign: 'center',
                                  padding: '3px 6px',
                                  fontSize: '0.82rem',
                                  fontWeight: 'bold',
                                  outline: 'none'
                                }}
                              />
                              <span>Yrs</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="predictor-card">
                          <label className="small text-secondary fw-semibold mb-2 font-monospace">Biological Gender</label>
                          <div className="d-flex flex-wrap gap-2">
                            {[
                              { val: 'M', label: 'Male (XY)' },
                              { val: 'F', label: 'Female (XX)' }
                            ].map(opt => (
                              <div 
                                key={opt.val} onClick={() => setGender(opt.val)}
                                className={`px-3 py-2 rounded border cursor-pointer font-monospace text-center flex-grow-1 ${gender === opt.val ? 'border-theme-accent bg-theme-accent bg-opacity-10 text-white fw-bold' : 'border-white-10 bg-white-5 text-secondary hover-white'}`}
                                style={{ fontSize: '0.82rem', transition: 'all 0.2s' }}
                              >{opt.label}</div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="predictor-card">
                          <label className="small text-secondary fw-semibold mb-2 font-monospace">Family Medical History</label>
                          <div className="d-flex flex-wrap gap-2">
                            {[
                              { val: 'no', label: 'None' },
                              { val: 'mild', label: 'Extended Only' },
                              { val: 'yes', label: 'Immediate Relative' },
                              { val: 'severe', label: 'Multiple Relatives' },
                              { val: 'unknown', label: 'Unknown' }
                            ].map(opt => (
                              <div 
                                key={opt.val} onClick={() => setFamilyHistory(opt.val)}
                                className={`px-2 py-2 rounded border cursor-pointer font-monospace text-center flex-grow-1 ${familyHistory === opt.val ? 'border-theme-accent bg-theme-accent bg-opacity-10 text-white fw-bold' : 'border-white-10 bg-white-5 text-secondary hover-white'}`}
                                style={{ fontSize: '0.75rem', transition: 'all 0.2s' }}
                              >{opt.label}</div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="predictor-card">
                          <label className="small text-secondary fw-semibold mb-2 font-monospace">Smoking Status</label>
                          <div className="d-flex flex-wrap gap-2">
                            {[
                              { val: 'no', label: 'Never / Non-Smoker' },
                              { val: 'former', label: 'Former Smoker' },
                              { val: 'yes', label: 'Active Smoker' }
                            ].map(opt => (
                              <div 
                                key={opt.val} onClick={() => setSmoking(opt.val)}
                                className={`px-2 py-2 rounded border cursor-pointer font-monospace text-center flex-grow-1 ${smoking === opt.val ? 'border-theme-accent bg-theme-accent bg-opacity-10 text-white fw-bold' : 'border-white-10 bg-white-5 text-secondary hover-white'}`}
                                style={{ fontSize: '0.75rem', transition: 'all 0.2s' }}
                              >{opt.label}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Container 2: Dynamic Vitals Form */}
                  <div className="glass-card p-4">
                    {renderDiseaseVitals()}
                  </div>

                  {/* Container 3: Dynamic Symptoms Checklist */}
                  <div className="glass-card p-4">
                    {renderDiseaseSymptoms()}
                  </div>

                  {/* Container 4: Action Dispatch Gate */}
                  <div className="glass-card p-4 d-flex flex-column gap-3">
                    <label 
                      className="d-flex align-items-start gap-3 cursor-pointer text-secondary font-monospace" 
                      style={{ fontSize: '0.88rem', userSelect: 'none', lineHeight: '1.4', marginBottom: 0 }}
                    >
                      <input 
                        type="checkbox" 
                        checked={consentChecked} 
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        className="m-0 cursor-pointer flex-shrink-0"
                        style={{ width: '18px', height: '18px', marginBottom: 0 }}
                      />
                      <span>I confirm that the entered vitals and symptoms are accurate and consent to run this AI clinical analysis.</span>
                    </label>

                    <button 
                      className="btn-clinical primary py-3 d-flex align-items-center justify-content-center gap-2 font-monospace text-uppercase w-100" 
                      onClick={runPredictionAnalysis} 
                      disabled={!hasChanges || !consentChecked}
                      style={{ 
                        letterSpacing: '0.08em', 
                        margin: 0,
                        opacity: (hasChanges && consentChecked) ? 1 : 0.45,
                        cursor: (hasChanges && consentChecked) ? 'pointer' : 'not-allowed',
                        borderColor: (hasChanges && consentChecked) ? 'var(--theme-accent)' : 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <Activity size={18} />
                      {!hasChanges 
                        ? "Modify Parameters to Unlock Analysis" 
                        : !consentChecked 
                        ? "Please Confirm Information Accuracy" 
                        : "Run AI Health Analysis"
                      }
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STAGE B: Analysis Loading Screen */}
              {isAnalyzing && (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-card text-center py-5 d-flex flex-column align-items-center justify-content-center"
                  style={{ minHeight: '400px' }}
                >
                  <div className="mb-4 position-relative d-flex align-items-center justify-content-center" style={{ width: '120px', height: '120px' }}>
                    <div className="position-absolute w-100 h-100 rounded-circle border border-2 border-dashed border-white" style={{ animation: 'spin 10s linear infinite', opacity: 0.25 }}></div>
                    <div className="position-absolute w-75 h-75 rounded-circle border border-1" style={{ animation: 'spin 6s linear infinite reverse', opacity: 0.4, borderColor: 'var(--theme-accent)' }}></div>
                    <div className="spinner-border position-absolute" style={{ width: '80px', height: '80px', borderWidth: '3.5px', color: 'var(--theme-accent)' }} role="status"></div>
                    <Cpu size={32} className="position-absolute animate-pulse" style={{ color: 'var(--theme-accent)' }} />
                  </div>
                  
                  <h3 className="fw-bold mb-2 font-monospace text-white">Analyzing Health Profile...</h3>
                  <p className="text-secondary small font-monospace mt-2">Please wait while we process your vitals...</p>
                </motion.div>
              )}

              {/* STAGE C: Interactive Diagnostic Synthesis Results */}
              {result && !isAnalyzing && (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="reveal"
                >
                  {/* Diagnostics synthesis toolbar */}
                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <button 
                      onClick={resetPredictor}
                      className="btn-icon p-2 px-3 border border-white-10 bg-transparent text-secondary rounded d-flex align-items-center gap-2 hover-white font-monospace text-uppercase"
                      style={{ width: 'auto', fontSize: '0.9rem' }}
                    >
                      <RotateCcw size={14} />
                      Recalibrate Cockpit
                    </button>

                    <button 
                      onClick={handlePrint}
                      className="btn-icon p-2 px-3 border border-white-10 bg-transparent text-secondary rounded d-flex align-items-center gap-2 hover-white font-monospace text-uppercase"
                      style={{ width: 'auto', fontSize: '0.9rem' }}
                    >
                      <Printer size={14} />
                      Print EMR Report
                    </button>
                  </div>

                  {/* Holographic Diagnostic card */}
                  <div className="glass-card mb-4" style={{ borderColor: getRiskColor(result.risk_level), boxShadow: `0 25px 60px rgba(0, 3, 50, 0.75), 0 0 35px ${getRiskBg(result.risk_level)}` }}>
                    <div className="row g-4 align-items-center">
                      
                      {/* Left Risk Gauge sub-column */}
                      <div className="col-md-4 text-center border-end border-white-10 pr-md-4 d-flex flex-column align-items-center justify-content-center">
                        <p className="small text-secondary text-uppercase fw-bold font-monospace mb-3" style={{ letterSpacing: '0.08em', fontSize: '0.72rem' }}>[Risk Telemetry]</p>
                        
                        {/* Ring SVG Gauge */}
                        <div className="position-relative d-flex align-items-center justify-content-center mb-3" style={{ width: '160px', height: '160px' }}>
                          <svg width="160" height="160" viewBox="0 0 160 160" className="position-absolute" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="80" cy="80" r="68" stroke="rgba(255,255,255,0.04)" strokeWidth="8" fill="transparent" />
                            <circle 
                              cx="80" cy="80" r="68" 
                              stroke={getRiskColor(result.risk_level)} 
                              strokeWidth="10" 
                              strokeDasharray={427.2}
                              strokeDashoffset={427.2 - (427.2 * result.risk_score) / 100}
                              strokeLinecap="round"
                              fill="transparent" 
                              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                            />
                          </svg>
                          <div className="d-flex flex-column align-items-center font-monospace">
                            <span className="fs-1 fw-bold text-white leading-none" style={{ fontSize: '2.6rem' }}>{result.risk_score}%</span>
                            <span className="small text-secondary" style={{ fontSize: '0.8rem', letterSpacing: '0.12em' }}>PROBABILITY</span>
                          </div>
                        </div>

                        <div className="px-3 py-1.5 rounded font-monospace fw-bold text-uppercase" style={{ backgroundColor: getRiskBg(result.risk_level), color: getRiskColor(result.risk_level), fontSize: '0.88rem', letterSpacing: '0.06em', border: `1px solid ${getRiskColor(result.risk_level)}` }}>
                          {result.risk_level} RISK COEFFICIENT
                        </div>
                      </div>

                      {/* Right Reasoning sub-column */}
                      <div className="col-md-8 ps-md-4">
                        <h3 className="fw-bold mb-2 text-white font-monospace" style={{ fontSize: '1.35rem' }}>Diagnostic Clinical Synthesis</h3>
                        <p className="text-secondary font-monospace" style={{ lineHeight: 1.6, fontSize: '0.98rem' }}>
                          {result.clinical_reasoning}
                        </p>
                        

                      </div>
                    </div>
                  </div>

                  {/* PRESCRIBED PREVENTATIVE REMEDY MATRIX */}
                  <div className="glass-card p-4">
                    <h4 className="fw-bold mb-4 text-white d-flex align-items-center gap-2" style={{ fontSize: '1.35rem' }}>
                      <BookOpen className="text-theme-accent animate-pulse" size={20} />
                      Prescribed Preventative Remedies
                    </h4>

                    {/* Segmented control tabs for Remedies */}
                    <div className="d-flex bg-white-10 p-1 border border-white-10 rounded mb-4">
                      <button 
                        onClick={() => setRemedyTab('diet')}
                        className={`flex-fill px-3 py-2 text-uppercase text-xs font-bold ${remedyTab === 'diet' ? 'primary' : 'bg-transparent text-secondary hover-white'}`}
                        style={{ borderRadius: '4px', width: 'auto', fontSize: '0.92rem' }}
                      >
                        Dietary Plan
                      </button>
                      <button 
                        onClick={() => setRemedyTab('lifestyle')}
                        className={`flex-fill px-3 py-2 text-uppercase text-xs font-bold ${remedyTab === 'lifestyle' ? 'primary' : 'bg-transparent text-secondary hover-white'}`}
                        style={{ borderRadius: '4px', width: 'auto', fontSize: '0.92rem' }}
                      >
                        Lifestyle Changes
                      </button>
                      <button 
                        onClick={() => setRemedyTab('clinical')}
                        className={`flex-fill px-3 py-2 text-uppercase text-xs font-bold ${remedyTab === 'clinical' ? 'primary' : 'bg-transparent text-secondary hover-white'}`}
                        style={{ borderRadius: '4px', width: 'auto', fontSize: '0.92rem' }}
                      >
                        Clinical Follow-up
                      </button>
                    </div>

                    {/* Tab Contents */}
                    <AnimatePresence mode="wait">
                      {remedyTab === 'diet' && (
                        <motion.div 
                          key="diet"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                        >
                          <div className="row g-2">
                            {result.remedies?.dietary_guidelines?.map((item, idx) => (
                              <div className="col-md-6" key={idx}>
                                <div className="p-3 bg-white-10 bg-opacity-20 rounded border border-white-5 font-monospace text-secondary small h-100 d-flex gap-2" style={{ fontSize: '0.92rem' }}>
                                  <span>•</span>
                                  <span>{item}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {remedyTab === 'lifestyle' && (
                        <motion.div 
                          key="lifestyle"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                        >
                          <div className="row g-2">
                            {result.remedies?.lifestyle_modifications?.map((item, idx) => (
                              <div className="col-md-6" key={idx}>
                                <div className="p-3 bg-white-10 bg-opacity-20 rounded border border-white-5 font-monospace text-secondary small h-100 d-flex gap-2" style={{ fontSize: '0.92rem' }}>
                                  <span>•</span>
                                  <span>{item}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {remedyTab === 'clinical' && (
                        <motion.div 
                          key="clinical"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="font-monospace"
                        >
                          <div className="row g-3">
                            <div className="col-md-6">
                              <h5 className="font-monospace text-theme-accent small mb-2 fw-bold" style={{ fontSize: '0.94rem' }}>[EXTRACTED_OTC_&_HOME_REMEDIES]</h5>
                              <div className="d-flex flex-column gap-2">
                                {result.remedies?.otc_suggestions?.map((item, idx) => (
                                  <div key={idx} className="p-2 rounded bg-white-10 border border-white-5 font-monospace text-secondary small" style={{ fontSize: '0.88rem' }}>
                                    💊 {item}
                                  </div>
                                ))}
                                {result.remedies?.home_remedies?.map((item, idx) => (
                                  <div key={idx} className="p-2 rounded bg-white-10 border border-white-5 font-monospace text-secondary small" style={{ fontSize: '0.88rem' }}>
                                    🏡 {item}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="col-md-6">
                              <h5 className="font-monospace text-danger small mb-2 fw-bold" style={{ fontSize: '0.94rem' }}>[CRITICAL_WARNING_FLAGS]</h5>
                              <div className="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-30 rounded mb-3">
                                <ul className="small text-danger ps-3 mb-0 font-monospace" style={{ fontSize: '0.88rem' }}>
                                  {result.remedies?.urgent_warning_signs?.map((item, idx) => (
                                    <li key={idx} className="mb-1">{item}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-3 bg-white-10 border border-white-10 rounded">
                                <h6 className="fw-bold text-white m-0 mb-2 font-monospace" style={{ fontSize: '0.94rem' }}>CLINICAL RECOMS</h6>
                                <ul className="small text-secondary ps-3 mb-0 font-monospace" style={{ fontSize: '0.88rem' }}>
                                  {result.remedies?.clinical_recommendations?.map((item, idx) => (
                                    <li key={idx} className="mb-1">{item}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
  );
}

export default Dashboard;
