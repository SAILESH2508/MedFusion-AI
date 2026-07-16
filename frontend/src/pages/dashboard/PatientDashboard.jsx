import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { 
  Heart, 
  Activity, 
  ShieldAlert, 
  Compass, 
  BookOpen, 
  Printer, 
  RotateCcw, 
  User,
  Sparkles,
  Cpu
} from 'lucide-react';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarContext } from '../../context/SidebarContext';
import { getRiskColor, getRiskBg, getAge } from '../../services/utils';

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

function PatientDashboard({ user }) {
  const { setSidebarContent } = useContext(SidebarContext);
  const [selectedDisease, setSelectedDisease] = useState('heart_attack'); // 'heart_attack' | 'diabetes' | 'cancer' | 'neurological'
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Vitals & Symptoms Forms State
  const [hasChanges, setHasChanges] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [age, setAge] = useState(38);
  const [gender, setGender] = useState('M');
  const [familyHistory, setFamilyHistory] = useState('no');
  const [smoking, setSmoking] = useState('no');

  // Neurological-specific
  const [sleepQuality, setSleepQuality] = useState(7);
  const [physicalActivity, setPhysicalActivity] = useState(4);
  const [neurologicalSymptoms, setNeurologicalSymptoms] = useState({
    no_symptoms: true,
    forgetfulness: false,
    confusion: false,
    speech_difficulty: false,
    loss_of_balance: false,
    numbness_weakness: false
  });

  // Heart-specific
  const [systolicBp, setSystolicBp] = useState(125);
  const [diastolicBp, setDiastolicBp] = useState(82);
  const [cholesterol, setCholesterol] = useState(195);
  const [maxHeartRate, setMaxHeartRate] = useState(165);
  const [chestPain, setChestPain] = useState('none');
  const [exerciseAngina, setExerciseAngina] = useState('no');
  const [fastingSugar, setFastingSugar] = useState('no');
  const [heartSymptoms, setHeartSymptoms] = useState({
    no_symptoms: true,
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
    no_symptoms: true,
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
    no_symptoms: true,
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

  // Consolidated Patient Records State
  const [predictionsHistory, setPredictionsHistory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [pathologyReports, setPathologyReports] = useState([]);

  // Medical Report Scan & Upload State
  const [uploadingReport, setUploadingReport] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

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
    cancerCategory, alcohol, toxinExposure, cancerSymptoms,
    sleepQuality, physicalActivity, neurologicalSymptoms
  ]);

  // Compute BMI
  const bmi = (weight && height) ? parseFloat((Number(weight) / ((Number(height) / 100) * (Number(height) / 100))).toFixed(1)) : 0;

  // Symptom check togglers
  const handleHeartSymptomToggle = (key) => {
    setHasChanges(true);
    if (key === 'no_symptoms') {
      setHeartSymptoms({
        no_symptoms: true,
        shortness_of_breath: false,
        left_arm_pain: false,
        jaw_neck_pain: false,
        cold_sweats_nausea: false,
        dizziness: false
      });
    } else {
      setHeartSymptoms(prev => {
        const next = { ...prev, [key]: !prev[key] };
        const hasRealSymptom = Object.keys(next).some(k => k !== 'no_symptoms' && next[k]);
        next.no_symptoms = !hasRealSymptom;
        return next;
      });
    }
  };

  const handleDiabetesSymptomToggle = (key) => {
    setHasChanges(true);
    if (key === 'no_symptoms') {
      setDiabetesSymptoms({
        no_symptoms: true,
        excessive_thirst: false,
        frequent_urination: false,
        unexplained_weight_loss: false,
        blurry_vision: false,
        slow_healing_sores: false
      });
    } else {
      setDiabetesSymptoms(prev => {
        const next = { ...prev, [key]: !prev[key] };
        const hasRealSymptom = Object.keys(next).some(k => k !== 'no_symptoms' && next[k]);
        next.no_symptoms = !hasRealSymptom;
        return next;
      });
    }
  };

  const handleCancerSymptomToggle = (key) => {
    setHasChanges(true);
    if (key === 'no_symptoms') {
      setCancerSymptoms({
        no_symptoms: true,
        unexplained_weight_loss: false,
        persistent_cough: false,
        persistent_fatigue: false,
        skin_mole_changes: false,
        unusual_lumps: false
      });
    } else {
      setCancerSymptoms(prev => {
        const next = { ...prev, [key]: !prev[key] };
        const hasRealSymptom = Object.keys(next).some(k => k !== 'no_symptoms' && next[k]);
        next.no_symptoms = !hasRealSymptom;
        return next;
      });
    }
  };

  const handleNeurologicalSymptomToggle = (key) => {
    setHasChanges(true);
    if (key === 'no_symptoms') {
      setNeurologicalSymptoms({
        no_symptoms: true,
        forgetfulness: false,
        confusion: false,
        speech_difficulty: false,
        loss_of_balance: false,
        numbness_weakness: false
      });
    } else {
      setNeurologicalSymptoms(prev => {
        const next = { ...prev, [key]: !prev[key] };
        const hasRealSymptom = Object.keys(next).some(k => k !== 'no_symptoms' && next[k]);
        next.no_symptoms = !hasRealSymptom;
        return next;
      });
    }
  };

  // Presets appliers
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

  const applyNeurologicalPreset = (type) => {
    setHasChanges(true);
    if (type === 'healthy') {
      setSystolicBp(115);
      setGlucose(85);
      setSleepQuality(8);
      setPhysicalActivity(7);
      setNeurologicalSymptoms({
        no_symptoms: true,
        forgetfulness: false,
        confusion: false,
        speech_difficulty: false,
        loss_of_balance: false,
        numbness_weakness: false
      });
    } else {
      setSystolicBp(155);
      setGlucose(135);
      setSleepQuality(4.5);
      setPhysicalActivity(1);
      setNeurologicalSymptoms({
        no_symptoms: false,
        forgetfulness: true,
        confusion: true,
        speech_difficulty: false,
        loss_of_balance: true,
        numbness_weakness: true
      });
    }
  };

  const getThemeClass = () => {
    if (selectedDisease === 'heart_attack') return 'theme-heart';
    if (selectedDisease === 'diabetes') return 'theme-diabetes';
    if (selectedDisease === 'cancer') return 'theme-cancer';
    if (selectedDisease === 'neurological') return 'theme-cancer';
    return 'theme-general';
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

  // Sync patient profile
  useEffect(() => {
    api.get('/telemetry/emergency')
      .then(res => {
        const profileData = {
          id: res.data.id || user.patient_id,
          name: res.data.name,
          email: user.email,
          dob: res.data.dob,
          gender: res.data.gender,
          blood_group: res.data.blood_group,
          weight: res.data.weight,
          height: res.data.height,
          allergies: res.data.allergies,
          emergency_contact: res.data.emergency_contact
        };
        setSelectedPatient(profileData);
      })
      .catch(err => console.error("Error fetching patient profile:", err));
  }, [user]);

  // Fetch consolidated clinical records for dynamic relevance check
  const fetchPatientRecords = useCallback(() => {
    if (!user) return;
    
    api.get('/predictions')
      .then(res => setPredictionsHistory(res.data))
      .catch(err => console.error("Error fetching predictions:", err));

    api.get('/prescriptions')
      .then(res => setPrescriptions(res.data))
      .catch(err => console.error("Error fetching prescriptions:", err));

    api.get('/pathology')
      .then(res => setPathologyReports(res.data))
      .catch(err => console.error("Error fetching pathology:", err));
  }, [user]);

  useEffect(() => {
    fetchPatientRecords();
  }, [fetchPatientRecords]);

  // Pre-fill parameters when patient profile is loaded
  useEffect(() => {
    if (selectedPatient) {
      if (selectedPatient.dob) setAge(getAge(selectedPatient.dob));
      if (selectedPatient.gender) setGender(selectedPatient.gender);
      if (selectedPatient.weight) setWeight(selectedPatient.weight);
      if (selectedPatient.height) setHeight(selectedPatient.height);
    }
  }, [selectedPatient]);

  // Evaluate if a predictor is relevant to the patient's records/history
  const isPredictorVisible = useCallback((diseaseId) => {
    // 1. Check history of previous predictions
    const hasHistory = predictionsHistory.some(record => {
      const type = record.disease_type?.toLowerCase() || '';
      if (diseaseId === 'heart_attack' && type.includes('heart')) return true;
      if (diseaseId === 'diabetes' && type.includes('diabetes')) return true;
      if (diseaseId === 'cancer' && type.includes('cancer')) return true;
      if (diseaseId === 'neurological' && type.includes('neuro')) return true;
      return false;
    });
    if (hasHistory) return true;

    // 2. Check current active vitals/symptoms thresholds
    if (diseaseId === 'heart_attack') {
      if (systolicBp > 130 || diastolicBp > 85 || cholesterol > 200 || chestPain !== 'none' || exerciseAngina === 'yes' || fastingSugar === 'yes') return true;
      const hasHeartSymptoms = Object.keys(heartSymptoms).some(k => k !== 'no_symptoms' && heartSymptoms[k]);
      if (hasHeartSymptoms) return true;
    }
    if (diseaseId === 'diabetes') {
      if (glucose > 100 || hba1c > 5.7 || bmi > 25 || hypertension === 'yes' || heartDiseaseHistory === 'yes') return true;
      const hasDiabetesSymptoms = Object.keys(diabetesSymptoms).some(k => k !== 'no_symptoms' && diabetesSymptoms[k]);
      if (hasDiabetesSymptoms) return true;
    }
    if (diseaseId === 'cancer') {
      if (alcohol === 'yes' || toxinExposure === 'yes') return true;
      const hasCancerSymptoms = Object.keys(cancerSymptoms).some(k => k !== 'no_symptoms' && cancerSymptoms[k]);
      if (hasCancerSymptoms) return true;
    }
    if (diseaseId === 'neurological') {
      if (systolicBp > 130 || sleepQuality < 6 || physicalActivity < 3) return true;
      const hasNeuroSymptoms = Object.keys(neurologicalSymptoms).some(k => k !== 'no_symptoms' && neurologicalSymptoms[k]);
      if (hasNeuroSymptoms) return true;
    }

    // 3. Check prescriptions for active meds
    const hasMed = prescriptions.some(rx => {
      try {
        const rxData = typeof rx.extracted_data === 'string' ? JSON.parse(rx.extracted_data) : rx.extracted_data;
        const medicines = rxData?.medicines || [];
        return medicines.some(m => {
          const mName = m.name?.toLowerCase() || '';
          if (diseaseId === 'heart_attack') {
            return mName.includes('lisinopril') || mName.includes('atorvastatin') || mName.includes('metoprolol') || mName.includes('amlodipine') || mName.includes('statin') || mName.includes('aspirin');
          }
          if (diseaseId === 'diabetes') {
            return mName.includes('metformin') || mName.includes('insulin') || mName.includes('glimepiride') || mName.includes('voglibose') || mName.includes('diab');
          }
          return false;
        });
      } catch (e) {
        return false;
      }
    });
    if (hasMed) return true;

    // 4. Check pathology reports
    const hasPathTrigger = pathologyReports.some(report => {
      try {
        const reportData = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
        return reportData.some(bm => {
          const name = bm.name?.toLowerCase() || '';
          const val = Number(bm.value);
          if (isNaN(val)) return false;
          if (diseaseId === 'heart_attack') {
            return (name.includes('cholesterol') && val > 200) || (name.includes('bp') && val > 130);
          }
          if (diseaseId === 'diabetes') {
            return (name.includes('glucose') && val > 100) || (name.includes('hba1c') && val > 5.7);
          }
          return false;
        });
      } catch (e) {
        return false;
      }
    });
    if (hasPathTrigger) return true;

    return false;
  }, [
    predictionsHistory, prescriptions, pathologyReports,
    systolicBp, diastolicBp, cholesterol, chestPain, exerciseAngina, fastingSugar, heartSymptoms,
    glucose, hba1c, bmi, hypertension, heartDiseaseHistory, diabetesSymptoms,
    alcohol, toxinExposure, cancerSymptoms,
    sleepQuality, physicalActivity, neurologicalSymptoms
  ]);

  // Set patient sidebar content dynamically
  useEffect(() => {
    const allPredictors = [
      { id: 'heart_attack', label: 'Heart Attack Predictor', icon: <Heart size={20} /> },
      { id: 'diabetes', label: 'Diabetes Risk Engine', icon: <Activity size={20} /> },
      { id: 'cancer', label: 'Cancer Risk Surveillance', icon: <Compass size={20} /> },
      { id: 'neurological', label: 'Neurological & Stroke Screening', icon: <Cpu size={20} /> },
    ];
    
    // Hide irrelevant predictors to avoid informational clutter
    const filteredPredictors = allPredictors.filter(p => p.id === selectedDisease || isPredictorVisible(p.id));
    const displayedPredictors = filteredPredictors.length > 0 ? filteredPredictors : [allPredictors[0]];

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
            {displayedPredictors.map((disease) => (
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
          {allPredictors.length > displayedPredictors.length && (
            <div className="mt-3 text-center">
              <span className="text-secondary font-monospace" style={{ fontSize: '0.72rem', opacity: 0.65 }}>
                🔍 Filtered based on clinical history
              </span>
            </div>
          )}
        </div>
      </div>
    );
    return () => setSidebarContent(null);
  }, [selectedDisease, handleDiseaseSelect, setSidebarContent, isAnalyzing, isPredictorVisible]);

  const handleReportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingReport(true);
    setUploadStatus('Uploading and scanning medical report...');

    const formData = new FormData();
    formData.append('file', file);
    if (selectedPatient) {
      formData.append('patient_id', selectedPatient.id);
    }

    try {
      const response = await api.post('/pathology/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const biomarkers = response.data.report_data || [];
      if (biomarkers.length === 0) {
        setUploadStatus('AI Scan complete, but no matching vitals/biomarkers were found in the file.');
        return;
      }

      const extracted = [];
      biomarkers.forEach(bm => {
        const name = bm.name.toLowerCase();
        const value = Number(bm.value);
        if (isNaN(value)) return;
        
        if (name.includes('glucose') || name.includes('sugar') || name.includes('fbs') || name.includes('ppbs')) {
          setGlucose(value);
          extracted.push(`Glucose: ${value} ${bm.unit || 'mg/dL'}`);
        } else if (name.includes('cholesterol') || name.includes('ldl') || name.includes('lipid')) {
          setCholesterol(value);
          extracted.push(`Cholesterol: ${value} ${bm.unit || 'mg/dL'}`);
        } else if (name.includes('hba1c')) {
          setHba1c(value);
          extracted.push(`HbA1c: ${value} ${bm.unit || '%'}`);
        } else if (name.includes('systolic') || name.includes('sbp')) {
          setSystolicBp(value);
          extracted.push(`Systolic BP: ${value} ${bm.unit || 'mmHg'}`);
        } else if (name.includes('diastolic') || name.includes('dbp')) {
          setDiastolicBp(value);
          extracted.push(`Diastolic BP: ${value} ${bm.unit || 'mmHg'}`);
        } else if (name.includes('weight')) {
          setWeight(value);
          extracted.push(`Weight: ${value} ${bm.unit || 'kg'}`);
        } else if (name.includes('height')) {
          setHeight(value);
          extracted.push(`Height: ${value} ${bm.unit || 'cm'}`);
        } else if (name.includes('heart rate') || name.includes('pulse') || name.includes('bpm')) {
          setMaxHeartRate(value);
          extracted.push(`Max Heart Rate: ${value} ${bm.unit || 'BPM'}`);
        }
      });

      if (extracted.length > 0) {
        setUploadStatus(`AI successfully extracted: ${extracted.join(', ')}. Vitals form updated!`);
        setHasChanges(true);
      } else {
        setUploadStatus('Scan complete, but extracted parameters do not match required fields.');
      }
    } catch (err) {
      console.error("Failed to upload report:", err);
      setUploadStatus(`Error during scan: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploadingReport(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } };
      handleReportUpload(fakeEvent);
    }
  };

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
      } else if (selectedDisease === 'cancer') {
        params = {
          ...params,
          cancer_type: cancerCategory,
          alcohol,
          exposure: toxinExposure,
          symptoms: Object.keys(cancerSymptoms).filter(k => cancerSymptoms[k])
        };
      } else if (selectedDisease === 'neurological') {
        params = {
          ...params,
          systolic_bp: systolicBp,
          glucose: glucose,
          sleep_quality: sleepQuality,
          physical_activity: physicalActivity,
          symptoms: Object.keys(neurologicalSymptoms).filter(k => neurologicalSymptoms[k])
        };
      }

      try {
        const diseaseNameMap = {
          heart_attack: 'Heart Attack',
          diabetes: 'Diabetes',
          cancer: 'Cancer Screening',
          neurological: 'Neurological Screening'
        };
        const response = await api.post('/predictions/predict/', {
          disease_type: diseaseNameMap[selectedDisease] || 'Heart Attack',
          parameters: params,
          patient_id: selectedPatient ? selectedPatient.id : null
        });
        
        setResult(response.data);
        fetchPatientRecords();
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

      case 'neurological':
        return (
          <div className="reveal">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <h4 className="fw-bold text-white d-flex align-items-center gap-2 m-0" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
                <Cpu className="animate-pulse" size={18} style={{ color: 'var(--theme-accent)' }} />
                <span style={{ color: 'var(--theme-accent)' }}>Neurological & Cognitive Vitals</span>
              </h4>
              <div className="d-flex gap-2">
                <button 
                  type="button" 
                  onClick={() => applyNeurologicalPreset('healthy')}
                  className="btn border rounded font-monospace hover-white px-3 py-1.5"
                  style={{ fontSize: '0.78rem', width: 'auto', backgroundColor: 'rgba(25, 135, 84, 0.2)', color: '#4ade80', borderColor: 'rgba(25, 135, 84, 0.5)' }}
                >
                  🌿 Healthy Preset
                </button>
                <button 
                  type="button" 
                  onClick={() => applyNeurologicalPreset('risk')}
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
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">BLOOD GLUCOSE</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      type="range" 
                      value={glucose} 
                      onChange={(e) => setGlucose(Number(e.target.value))} 
                      min="50" max="300" 
                      className="flex-grow-1 m-0"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                      <input 
                        type="number" 
                        value={glucose} 
                        onChange={(e) => setGlucose(e.target.value === '' ? '' : Number(e.target.value))}
                        min="50" max="300"
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
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">DAILY SLEEP QUANTITY</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      type="range" 
                      value={sleepQuality} 
                      onChange={(e) => setSleepQuality(Number(e.target.value))} 
                      min="3" max="12" step="0.5"
                      className="flex-grow-1 m-0"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                      <span className="fs-6">{sleepQuality} Hrs</span>
                    </div>
                  </div>
                  <small className="text-secondary d-block mt-2" style={{ fontSize: '0.74rem' }}>Target: 7 - 9 hours daily</small>
                </div>
              </div>
              <div className="col-md-6">
                <div className="predictor-card">
                  <label className="small text-secondary fw-semibold mb-2 font-monospace">PHYSICAL ACTIVITY</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      type="range" 
                      value={physicalActivity} 
                      onChange={(e) => setPhysicalActivity(Number(e.target.value))} 
                      min="0" max="21" 
                      className="flex-grow-1 m-0"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0 font-monospace fw-bold" style={{ color: 'var(--theme-accent)' }}>
                      <span className="fs-6">{physicalActivity} Hrs/Wk</span>
                    </div>
                  </div>
                  <small className="text-secondary d-block mt-2" style={{ fontSize: '0.74rem' }}>Recommended: 2.5+ hours/week</small>
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

      case 'neurological':
        return (
          <div className="reveal">
            <h4 className="fw-bold mb-4 text-white d-flex align-items-center gap-2" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              <ShieldAlert className="animate-pulse" size={18} style={{ color: 'var(--theme-accent)' }} />
              <span style={{ color: 'var(--theme-accent)' }}>Active Cognitive & Neurological Symptoms Checklist</span>
            </h4>
            <div className="row g-2">
              {Object.keys(neurologicalSymptoms).map((sym) => (
                <div className="col-md-6" key={sym}>
                  <div 
                    onClick={() => handleNeurologicalSymptomToggle(sym)}
                    className={`p-3 rounded border cursor-pointer transition-all d-flex align-items-center gap-3 ${
                      neurologicalSymptoms[sym] 
                        ? (sym === 'no_symptoms' ? 'active-no-symptoms' : 'border-cancer active-symptom') 
                        : 'border-white-5 hover-border-white-10 text-secondary bg-white-10 bg-opacity-30'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={neurologicalSymptoms[sym]} 
                      onChange={() => handleNeurologicalSymptomToggle(sym)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={sym.replace(/_/g, ' ')}
                      className="m-0 cursor-pointer"
                      style={{ width: '20px', height: '20px', marginBottom: 0 }}
                    />
                    <span className={`text-capitalize font-monospace ${neurologicalSymptoms[sym] ? 'text-white fw-bold' : ''}`} style={{ fontSize: '0.95rem' }}>{sym.replace(/_/g, ' ')}</span>
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

  return (
    <div className={`reveal px-1 py-1 ${getThemeClass()}`}>
      <div className="row g-4 mt-2 align-items-stretch">
        {/* CENTERED LAYOUT STAGE: Vitals Forms and Holographic Results HUD */}
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
                {/* AI Lab Report Auto-Fill Scanner Dropzone */}
                <div className="glass-card p-4">
                  <h4 className="fw-bold mb-3 text-white d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
                    <Sparkles className="animate-pulse" size={18} style={{ color: 'var(--theme-accent)' }} />
                    <span style={{ color: 'var(--theme-accent)' }}>AI Pathology Scanner & Auto-Fill</span>
                  </h4>
                  <p className="text-secondary font-monospace" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                    Upload pathlab reports (PDF or images) to scan biomarkers and auto-fill the vitals form parameters below.
                  </p>
                  
                  <div className="mt-3">
                    <label 
                      htmlFor="report-upload-input"
                      className="w-100 d-flex flex-column align-items-center justify-content-center border-dashed rounded-3 p-4 transition-all cursor-pointer hover-bg-white-5"
                      style={{ 
                        border: '2px dashed var(--theme-accent)',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        minHeight: '120px'
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                    >
                      <input 
                        type="file" 
                        id="report-upload-input"
                        accept=".pdf,image/*"
                        onChange={handleReportUpload}
                        className="d-none" 
                        disabled={uploadingReport}
                      />
                      {uploadingReport ? (
                        <div className="d-flex flex-column align-items-center gap-2">
                          <div className="spinner-border spinner-border-sm text-theme-accent animate-pulse" role="status">
                            <span className="visually-hidden">Scanning...</span>
                          </div>
                          <span className="text-secondary font-monospace small">AI Engine scanning report contents...</span>
                        </div>
                      ) : (
                        <div className="d-flex flex-column align-items-center gap-2 text-center">
                          <Activity size={32} className="text-theme-accent text-opacity-75 mb-1 animate-pulse" />
                          <span className="text-white fw-bold font-monospace" style={{ fontSize: '0.9rem' }}>
                            Drag & drop or <span className="text-theme-accent">browse files</span>
                          </span>
                          <span className="text-secondary font-monospace" style={{ fontSize: '0.75rem' }}>
                            Supports PDF, PNG, JPG (e.g. blood panel, lipid profile)
                          </span>
                        </div>
                      )}
                    </label>

                    {uploadStatus && (
                      <div className="mt-3 p-3 rounded font-monospace small bg-white-5 border border-white-10 text-white-75" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                        <div className="d-flex align-items-start gap-2">
                          <div className="flex-grow-1">{uploadStatus}</div>
                          <button 
                            type="button" 
                            className="btn btn-close btn-close-white p-0 m-0 shadow-none border-0" 
                            style={{ fontSize: '0.75rem', opacity: 0.5 }}
                            onClick={() => setUploadStatus('')}
                            aria-label="Close status"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

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

                {/* Container 4: Consent check & Action Dispatch Gate */}
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
                <p className="text-secondary small font-monospace mt-2">{simulationLog || 'Please wait while we process your vitals...'}</p>
                <div className="w-50 bg-white-10 rounded mt-3" style={{ height: '6px', overflow: 'hidden' }}>
                  <div className="h-100 bg-theme-accent" style={{ width: `${analysisProgress}%`, transition: 'width 0.4s ease' }}></div>
                </div>
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
                      <p className="small text-secondary text-uppercase fw-bold font-monospace mb-3" style={{ letterSpacing: '0.08em', fontSize: '0.72rem' }}>Risk Telemetry</p>
                      
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

                      {result.remedies?.stage && (
                        <div 
                          className="mt-3 px-3 py-1.5 rounded font-monospace small fw-bold text-center" 
                          style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                            color: 'var(--theme-accent)', 
                            border: '1.5px solid var(--theme-accent)',
                            fontSize: '0.82rem',
                            letterSpacing: '0.04em',
                            boxShadow: '0 0 10px rgba(var(--theme-accent-rgb), 0.1)'
                          }}
                        >
                          STATUS: {result.remedies.stage}
                        </div>
                      )}
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
                            <h5 className="font-monospace text-theme-accent small mb-2 fw-bold" style={{ fontSize: '0.94rem' }}>Extracted OTC & Home Remedies</h5>
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
                            <h5 className="font-monospace text-danger small mb-2 fw-bold" style={{ fontSize: '0.94rem' }}>Critical Warning Flags</h5>
                            <div className="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-30 rounded mb-3">
                              <ul className="small text-danger ps-3 mb-0 font-monospace" style={{ fontSize: '0.88rem' }}>
                                {result.remedies?.urgent_warning_signs?.map((item, idx) => (
                                  <li key={idx} className="mb-1">{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-3 bg-white-10 border border-white-10 rounded">
                              <h6 className="fw-bold text-white m-0 mb-2 font-monospace" style={{ fontSize: '0.94rem' }}>Clinical Recommendations</h6>
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

export default PatientDashboard;
