import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
  User,
  Activity,
  Database,
  Heart,
  FileText,
  MessageSquare,
  Pill,
  Calendar,
  Smile,
  FileUp,
  Edit3,
  Droplet,
  Scale,
  Ruler
} from 'lucide-react';
import { api } from '../services/api';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarContext } from '../context/SidebarContext';
import { getAge, getInitials } from '../services/utils';

// Import Decomposed Tab Components
import ProfileIdentity from './profile/ProfileIdentity';
import MedicalVault from './profile/MedicalVault';
import RiskAssessments from './profile/RiskAssessments';
import PillBox from './profile/PillBox';
import SymptomDiary from './profile/SymptomDiary';
import Consultations from './profile/Consultations';


function Profile({ user, onUserUpdate }) {
  const { setSidebarContent } = useContext(SidebarContext);
  const chatEndRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTabState, setActiveTabState] = useState('identity');

  const activeTab = (tabParam && ['identity', 'vault', 'adherence', 'diary'].includes(tabParam))
    ? tabParam
    : (tabParam === 'health_log' ? 'diary' : (tabParam === 'assessments' ? 'vault' : (tabParam === 'appointments' || tabParam === 'assistant' ? 'adherence' : activeTabState)));

  const setActiveTab = (tabId) => {
    setActiveTabState(tabId);
  };

  // Archives states
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistId, setExpandedHistId] = useState(null);

  const [archive, setArchive] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Stats for doctors (preserved logic)
  const [docStats, setDocStats] = useState({ patientCount: 0, rxCount: 0, pathCount: 0 });

  // -------------------------------------------------------------
  // DRUG SAFETY & INTERACTION STATE
  // -------------------------------------------------------------
  const [safetyReport, setSafetyReport] = useState(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyError, setSafetyError] = useState('');

  // -------------------------------------------------------------
  // CLINICAL CHATBOT STATE
  // -------------------------------------------------------------
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'assistant',
      text: "Hello! I am your MedFusion Clinical AI Assistant. Feel free to list any symptoms you are experiencing, ask questions about your uploaded lab reports, or inquire about your active prescriptions. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // -------------------------------------------------------------
  // MEDICATION ADHERENCE TRACKER
  // -------------------------------------------------------------
  const [customMeds, setCustomMeds] = useState(() => {
    try {
      const saved = localStorage.getItem(`medfusion_custom_meds_${user?.id || 'guest'}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFrequency, setNewMedFrequency] = useState('Once daily');
  const [newMedTime, setNewMedTime] = useState('Morning'); // Morning, Afternoon, Evening, Night

  const [medsTakenToday, setMedsTakenToday] = useState(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`medfusion_adherence_${user?.id || 'guest'}_${today}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Save custom meds helper
  const saveCustomMeds = (meds) => {
    setCustomMeds(meds);
    localStorage.setItem(`medfusion_custom_meds_${user?.id || 'guest'}`, JSON.stringify(meds));
  };

  // Toggle med taken state
  const handleToggleMedTaken = (medId, timeSlot) => {
    const today = new Date().toISOString().split('T')[0];
    const key = `${medId}-${timeSlot}`;
    const newMedsTaken = { ...medsTakenToday, [key]: !medsTakenToday[key] };
    setMedsTakenToday(newMedsTaken);
    localStorage.setItem(`medfusion_adherence_${user?.id || 'guest'}_${today}`, JSON.stringify(newMedsTaken));
  };

  // Add custom med
  const handleAddCustomMed = (e) => {
    e.preventDefault();
    if (!newMedName.trim()) return;
    const newMed = {
      id: `custom-${Date.now()}`,
      name: newMedName,
      dosage: newMedDosage || 'As directed',
      frequency: newMedFrequency,
      timeSlot: newMedTime,
      isCustom: true
    };
    const updated = [...customMeds, newMed];
    saveCustomMeds(updated);
    setNewMedName('');
    setNewMedDosage('');
  };

  // Delete custom med
  const handleDeleteCustomMed = (id) => {
    const updated = customMeds.filter(m => m.id !== id);
    saveCustomMeds(updated);
  };

  // -------------------------------------------------------------
  // DAILY HEALTH LOG & SYMPTOM DIARY
  // -------------------------------------------------------------
  const [wellnessRating, setWellnessRating] = useState(8);
  const [energyLevel, setEnergyLevel] = useState('High');
  const [moodState, setMoodState] = useState('Good');
  const [selectedSymptoms, setSelectedSymptoms] = useState({
    headache: false,
    fatigue: false,
    cough: false,
    fever: false,
    dizziness: false,
    chest_tightness: false
  });
  const [diaryNotes, setDiaryNotes] = useState('');
  const [healthLogs, setHealthLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(`medfusion_health_logs_${user?.id || 'guest'}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handleToggleDiarySymptom = (symptomKey) => {
    setSelectedSymptoms(prev => ({ ...prev, [symptomKey]: !prev[symptomKey] }));
  };

  const handleSaveDiaryLog = (e) => {
    e.preventDefault();
    const activeSymptomsList = Object.keys(selectedSymptoms).filter(k => selectedSymptoms[k]);
    const newLog = {
      id: `log-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      wellnessRating,
      energyLevel,
      moodState,
      symptoms: activeSymptomsList,
      notes: diaryNotes
    };
    const updatedLogs = [newLog, ...healthLogs];
    setHealthLogs(updatedLogs);
    localStorage.setItem(`medfusion_health_logs_${user?.id || 'guest'}`, JSON.stringify(updatedLogs));

    // Reset inputs
    setWellnessRating(8);
    setEnergyLevel('High');
    setMoodState('Good');
    setSelectedSymptoms({
      headache: false,
      fatigue: false,
      cough: false,
      fever: false,
      dizziness: false,
      chest_tightness: false
    });
    setDiaryNotes('');
    alert("Daily wellness check-in logged successfully!");
  };

  // -------------------------------------------------------------
  // VIRTUAL APPOINTMENTS SCHEDULER
  // -------------------------------------------------------------
  const [upcomingAppointments, setUpcomingAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem(`medfusion_appointments_${user?.id || 'guest'}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('09:00 AM');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);

  const handleBookAppointment = (e) => {
    e.preventDefault();
    if (!selectedDoctor || !appointmentDate || !appointmentTime || !appointmentReason.trim()) {
      alert("Please enter all details to book a consultation.");
      return;
    }
    const newAppointment = {
      id: `app-${Date.now()}`,
      doctor: selectedDoctor,
      date: appointmentDate,
      time: appointmentTime,
      reason: appointmentReason,
      status: 'scheduled',
      isUpcoming: true
    };
    const updated = [newAppointment, ...upcomingAppointments];
    setUpcomingAppointments(updated);
    localStorage.setItem(`medfusion_appointments_${user?.id || 'guest'}`, JSON.stringify(updated));

    // Reset states
    setShowBookingModal(false);
    setSelectedDoctor(null);
    setAppointmentDate('');
    setAppointmentTime('09:00 AM');
    setAppointmentReason('');
    alert(`Appointment successfully scheduled with ${newAppointment.doctor.name}!`);
  };

  // -------------------------------------------------------------
  // DATA SYNC AND LOADING LOGIC
  // -------------------------------------------------------------
  const fetchProfile = useCallback(async () => {
    if (user && user.role === 'Doctor') {
      setProfile({
        name: user.full_name || 'Medical Examiner',
        vault_id: `MF-DR-${user.id || 'N/A'}`
      });
      setEditData({
        full_name: user.full_name || '',
        license_number: user.license_number || ''
      });
      return;
    }
    try {
      const res = await api.get('/telemetry/emergency');
      setProfile(res.data);
      setEditData({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        blood_group: res.data.blood_group || '',
        emergency_contact: res.data.emergency_contact || '',
        allergies: res.data.allergies?.join(', ') || '',
        dob: res.data.dob || '',
        gender: res.data.gender || '',
        weight: res.data.weight || '',
        height: res.data.height || ''
      });
    } catch (err) {
      console.error("Profile sync error", err);
      setProfile({
        name: user?.full_name || user?.email || 'User',
        vault_id: 'N/A',
        blood_group: '',
        allergies: [],
        emergency_contact: '',
        dob: '',
        gender: '',
        weight: '',
        height: ''
      });
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (user && user.role === 'Doctor') return;
    try {
      setLoadingHistory(true);
      const res = await api.get('/predictions/');
      setHistory(res.data);
    } catch (err) {
      console.error("History sync error:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  const fetchArchive = useCallback(async () => {
    if (user && user.role === 'Doctor') return;
    try {
      setLoadingArchive(true);
      const [rxRes, pathRes] = await Promise.all([
        api.get('/prescriptions/'),
        api.get('/pathology/')
      ]);
      // Normalize combined history
      const normalizedRx = rxRes.data.map(r => ({ ...r, type: 'prescription' }));
      const normalizedPath = pathRes.data.map(p => ({ ...p, type: 'pathology' }));
      const combined = [...normalizedRx, ...normalizedPath].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );
      setArchive(combined);
    } catch (err) {
      console.error("Archive retrieval failed:", err);
    } finally {
      setLoadingArchive(false);
    }
  }, [user]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchHistory(), fetchArchive()]);
      if (user && user.role === 'Doctor') {
        try {
          const res = await api.get('/patients');
          const list = res.data.patients || [];
          let rxTotal = 0;
          let pathTotal = 0;
          list.forEach(p => {
            rxTotal += p.prescription_count || 0;
            pathTotal += p.pathology_count || 0;
          });
          setDocStats({
            patientCount: list.length,
            rxCount: rxTotal,
            pathCount: pathTotal
          });
        } catch (e) {
          console.error("Failed to fetch doctor stats:", e);
        }
      }
      setLoading(false);
    };
    loadAll();
  }, [user, fetchProfile, fetchHistory, fetchArchive]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading]);

  // Sidebar controls
  useEffect(() => {
    if (user && user.role === 'Doctor') {
      setSidebarContent(
        <div className="d-flex flex-column gap-4 pt-2">
          <div className="glass-card p-4 mb-2 reveal border-theme-accent border-opacity-15 bg-white-5" style={{ borderRadius: '12px' }}>
            <h2 className="fw-bolder fs-6 m-0 text-white" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem' }}>
              Doctor <span className="text-theme-accent" style={{ textShadow: '0 0 20px var(--theme-accent-glow)' }}>Credentials</span>
            </h2>
            <p className="text-secondary m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
              Verify credential profiles and clinical practicing registry statistics.
            </p>
          </div>
          <div className="mt-2">
            <h4 className="fw-bold mb-3 text-white" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              <span className="text-theme-accent font-monospace text-uppercase" style={{ letterSpacing: '0.06em' }}>Vault Sections</span>
            </h4>
            <div className="d-flex flex-column gap-3 mt-3">
              <div
                className="disease-select-tile active heart"
                style={{ padding: '16px 20px' }}
              >
                <div className="d-flex align-items-center justify-content-start gap-3 font-monospace fw-bold text-uppercase" style={{ fontSize: '0.9rem' }}>
                  <User size={20} />
                  <span>Clinical Profile</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
      return () => setSidebarContent(null);
    } else {
      setSidebarContent(
        <div className="d-flex flex-column gap-4 pt-2">
          <div className="glass-card p-4 mb-2 reveal border-theme-accent border-opacity-15 bg-white-5" style={{ borderRadius: '12px' }}>
            <h2 className="fw-bolder fs-6 m-0 text-white" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem' }}>
              Health <span className="text-theme-accent" style={{ textShadow: '0 0 20px var(--theme-accent-glow)' }}>Vault Console</span>
            </h2>
            <p className="text-secondary m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
              Manage clinical profiles, run health risk diagnostics, scan doctor prescriptions, or chat with AI.
            </p>
          </div>

          <div className="mt-2">
            <h4 className="fw-bold mb-3 text-white" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              <span className="text-theme-accent font-monospace text-uppercase" style={{ letterSpacing: '0.06em' }}>Portal Sections</span>
            </h4>
            <div className="d-flex flex-column gap-2 mt-2">
              {[
                { id: 'identity', label: 'Profile & Vitals', icon: <User size={18} /> },
                { id: 'vault', label: 'Medical Vault & History', icon: <FileUp size={18} /> },
                { id: 'adherence', label: 'Pill Box & Consultations', icon: <Pill size={18} /> },
                { id: 'diary', label: 'Symptom Diary Logs', icon: <Smile size={18} /> }
              ].map((tab) => {
                const tabThemeClasses = {
                  identity: 'theme-general-active',
                  vault: 'theme-cancer-active',
                  adherence: 'theme-diabetes-active',
                  diary: 'theme-heart-active'
                };
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`disease-select-tile cursor-pointer ${activeTab === tab.id ? `active ${tabThemeClasses[tab.id]}` : 'inactive'}`}
                    style={{ padding: '10px 16px' }}
                  >
                    <div className="d-flex align-items-center justify-content-start gap-2.5 font-monospace fw-bold text-uppercase" style={{ fontSize: '0.82rem' }}>
                      {tab.icon}
                      <span>{tab.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
      return () => setSidebarContent(null);
    }
  }, [activeTab, setSidebarContent, user]);

  // -------------------------------------------------------------
  // DYNAMIC VITALS ANALYTICS LOGIC
  // -------------------------------------------------------------
  const calculateBmi = () => {
    if (!profile?.weight || !profile?.height) return null;
    const hMet = profile.height / 100;
    return parseFloat((profile.weight / (hMet * hMet)).toFixed(1));
  };

  const getBmiCategory = (bmi) => {
    if (!bmi) return { label: 'Unknown', color: 'text-secondary' };
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-info' };
    if (bmi >= 18.5 && bmi < 25) return { label: 'Optimal BMI', color: 'text-success' };
    if (bmi >= 25 && bmi < 30) return { label: 'Overweight', color: 'text-warning' };
    return { label: 'Obese', color: 'text-danger' };
  };

  const calculateHealthScore = () => {
    let score = 100;
    const bmi = calculateBmi();
    if (bmi) {
      if (bmi < 18.5 || bmi >= 25) score -= 6;
      if (bmi >= 30) score -= 10;
    } else {
      score -= 5;
    }
    if (profile?.allergies && profile.allergies.length > 0) {
      score -= Math.min(10, profile.allergies.length * 2);
    }
    if (history.length > 0) {
      const highRisks = history.filter(p => p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL');
      score -= Math.min(15, highRisks.length * 4);
    }
    return Math.max(45, Math.min(100, score));
  };

  useEffect(() => {
    const userId = user?.id || user?.user_id || user?.pk || 'guest';
    if (userId && user?.role === 'Patient') {
      const score = calculateHealthScore();
      if (score) {
        localStorage.setItem(`medfusion_health_score_${userId}`, score);
        window.dispatchEvent(new Event('medfusion_health_score_updated'));
      }
    }
  }, [profile, history, user]);

  // -------------------------------------------------------------
  // PROFILE UPDATE ACTION
  // -------------------------------------------------------------
  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const userId = user.id || user.user_id || user.pk;
      if (!userId) {
        alert("User ID not found. Please try logging in again.");
        return;
      }
      const response = await api.post('/profile/update/', {
        patient_id: userId,
        ...editData
      });
      if (response.data && response.data.user && onUserUpdate) {
        onUserUpdate(response.data.user);
      }
      setIsEditing(false);
      fetchProfile();
      alert("Profile details updated successfully!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to update profile. Check backend server.");
    } finally {
      setSaveLoading(false);
    }
  };

  // -------------------------------------------------------------
  // CLINICAL SAFETY & DRUG INTERACTION ADVISOR
  // -------------------------------------------------------------
  const handleCheckDrugSafety = async (meds) => {
    if (meds.length === 0) return;
    setSafetyLoading(true);
    setSafetyError('');
    setSafetyReport(null);
    try {
      const response = await api.post('/telemetry/drug-safety/', {
        medications: meds.map(m => ({ name: m.name, dosage: m.dosage }))
      });
      setSafetyReport(response.data);
    } catch (err) {
      console.error("Failed to run drug safety analysis:", err);
      setSafetyError(err.response?.data?.error || "Failed to generate safety report. Please verify connection.");
    } finally {
      setSafetyLoading(false);
    }
  };

  // -------------------------------------------------------------
  // CLINICAL AI SYMPTOM ASSISTANT CHAT SEND
  // -------------------------------------------------------------
  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg = {
      sender: 'user',
      text: chatMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    };

    setChatHistory(prev => [...prev, userMsg]);
    const currentMsg = chatMessage;
    setChatMessage('');
    setChatLoading(true);

    try {
      const response = await api.post('/telemetry/chat/', {
        message: currentMsg,
        history: chatHistory
      });

      const resMsg = {
        sender: 'assistant',
        text: response.data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      };
      setChatHistory(prev => [...prev, resMsg]);
    } catch (err) {
      console.error("Failed to fetch chat reply:", err);
      const errorMsg = {
        sender: 'assistant',
        text: "Failed to generate AI clinical advice. Please verify connection to the backend.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return <div className="text-center py-5 opacity-50 font-monospace text-theme-accent small">Synchronizing consolidated health vault...</div>;
  if (!profile) return <div className="glass-card p-5 text-center font-monospace text-danger">[ERROR: NEURAL IDENTITY OFFLINE]</div>;

  if (user && user.role === 'Doctor') {
    return (
      <div className="reveal px-1 py-1 theme-general font-monospace" style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        <div className="row g-4 mt-2 flex-grow-1">

          {/* Avatar and Credentials Panel */}
          <div className="col-lg-5 col-md-5 d-flex">
            <div className="glass-card text-center w-100 p-5 d-flex flex-column align-items-center justify-content-center position-relative border-theme-accent border-opacity-15 bg-white-5">
              {/* Edit controls */}
              <div className="position-absolute top-0 end-0 p-3">
                {!isEditing ? (
                  <button
                    className="px-3 py-1.5 border border-white-10 bg-transparent text-theme-accent rounded d-flex align-items-center gap-2 hover-white font-monospace text-uppercase"
                    onClick={() => {
                      setEditData({
                        full_name: user.full_name || '',
                        license_number: user.license_number || ''
                      });
                      setIsEditing(true);
                    }}
                    style={{ width: 'auto', fontSize: '0.8rem' }}
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                ) : (
                  <div className="d-flex gap-2">
                    <button
                      className="px-2.5 py-1.5 border border-white-10 bg-transparent text-secondary rounded font-monospace text-uppercase"
                      onClick={() => setIsEditing(false)}
                      style={{ width: 'auto', fontSize: '0.8rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-3 py-1.5 bg-theme-accent border-0 text-white rounded d-flex align-items-center gap-2 hover-white font-monospace text-uppercase"
                      onClick={handleSave}
                      disabled={saveLoading}
                      style={{ width: 'auto', fontSize: '0.8rem' }}
                    >
                      {saveLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              <div className="mx-auto mb-4 bg-white-10 rounded-circle border border-2 border-dashed border-theme-accent d-flex align-items-center justify-content-center" style={{ width: '130px', height: '130px' }}>
                <User size={55} className="text-theme-accent animate-pulse" />
              </div>

              {!isEditing ? (
                <>
                  <h2 className="fw-bold text-white mb-1 text-uppercase" style={{ letterSpacing: '0.02em', fontSize: '1.5rem' }}>{profile.name}</h2>
                  <p className="text-theme-accent fw-bold small mb-4">Credentials Vault: {profile.vault_id}</p>
                </>
              ) : (
                <div className="mb-4 w-100 px-4">
                  <label className="text-secondary small font-monospace d-block text-start mb-1.5">Doctor Name</label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={editData.full_name || ''}
                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                    className="text-center w-100 p-2 border border-white-10 rounded text-white bg-transparent font-monospace"
                  />
                </div>
              )}

              <div className="row g-3 w-100 mt-2">
                <div className="col-12">
                  <div className="bg-white-10 bg-opacity-20 p-3.5 rounded border border-white-5 text-start font-monospace">
                    <span className="small text-secondary d-block text-uppercase mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.06em' }}>Medical License ID</span>
                    {!isEditing ? (
                      <strong className="text-white fs-6">{user.license_number || 'N/A'}</strong>
                    ) : (
                      <input
                        type="text"
                        value={editData.license_number || ''}
                        onChange={(e) => setEditData({ ...editData, license_number: e.target.value })}
                        className="py-1 mt-1 font-monospace w-100 text-white bg-transparent border-white-10"
                        style={{ fontSize: '0.9rem' }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Practice Stats Analytics Dashboard */}
          <div className="col-lg-7 col-md-7 d-flex">
            <div className="glass-card p-5 w-100 d-flex flex-column gap-4 justify-content-center text-start border-theme-accent border-opacity-15 bg-white-5">
              <h3 className="fw-bold text-white m-0 d-flex align-items-center gap-2 border-bottom border-white-10 pb-3" style={{ fontSize: '1.4rem' }}>
                <Activity className="text-theme-accent animate-pulse" />
                Practice Registry Statistics
              </h3>

              <div className="row g-4 font-monospace">
                <div className="col-md-4">
                  <div className="p-4 rounded border border-white-5 bg-white-10 bg-opacity-25 text-center hover-border-accent transition-all">
                    <span className="text-secondary d-block small mb-1" style={{ fontSize: '0.72rem' }}>PATIENTS MANAGED</span>
                    <span className="text-white fw-bold fs-3 text-info">{docStats.patientCount}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-4 rounded border border-white-5 bg-white-10 bg-opacity-25 text-center hover-border-accent transition-all">
                    <span className="text-secondary d-block small mb-1" style={{ fontSize: '0.72rem' }}>INGESTED PRESCRIPTIONS</span>
                    <span className="text-white fw-bold fs-3 text-info">{docStats.rxCount}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-4 rounded border border-white-5 bg-white-10 bg-opacity-25 text-center hover-border-accent transition-all">
                    <span className="text-secondary d-block small mb-1" style={{ fontSize: '0.72rem' }}>PATHOLOGY FILES</span>
                    <span className="text-white fw-bold fs-3 text-info">{docStats.pathCount}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-start border-theme-accent border-opacity-30 ps-3">
                <p className="text-secondary m-0 small" style={{ lineHeight: '1.6' }}>
                  All clinical credentials, medical files, and diagnostic records are fully synchronized under HIPAA security compliance guidelines.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Calculate dynamic patient vitals values
  const bmi = calculateBmi();
  const bmiCat = getBmiCategory(bmi);
  const healthScore = calculateHealthScore();


  const tabThemes = {
    identity: 'theme-general',
    vault: 'theme-cancer',
    adherence: 'theme-diabetes',
    diary: 'theme-heart',
    appointments: 'theme-heart'
  };
  const activeTheme = tabThemes[activeTab] || 'theme-general';

  return (
    <div className={`reveal px-1 py-1 ${activeTheme} transition-all duration-300 vault-tab-active-layout`}>


      {/* Holographic Segmented Tab Switcher */}
      <div className="mb-4 tab-selector-container p-1 bg-glass d-md-none" style={{ borderRadius: '12px', border: '1.5px solid var(--theme-accent, rgba(0, 245, 212, 0.25))' }}>
        <div className="row g-1 w-100 m-0">
          {[
            { id: 'identity', label: 'Identity & Vitals', icon: <User size={16} /> },
            { id: 'vault', label: 'Medical Vault & History', icon: <FileText size={16} /> },
            { id: 'adherence', label: 'Pill Box & Consultations', icon: <Pill size={16} /> },
            { id: 'diary', label: 'Symptom Diary', icon: <Smile size={16} /> }
          ].map((tab) => (
            <div className="col-3 p-0" key={tab.id}>
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`btn-clinical py-2.5 w-100 d-flex align-items-center justify-content-center gap-2 border-0 rounded-3 font-monospace text-uppercase font-bold ${activeTab === tab.id ? 'primary' : 'bg-transparent text-secondary hover-white'}`}
                style={{ fontSize: '0.78rem', letterSpacing: '0.03em', transition: 'all 0.25s' }}
              >
                {tab.icon}
                <span className="d-none d-sm-inline">{tab.label}</span>
                <span className="d-inline d-sm-none">{tab.label.split(' & ')[0]}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'identity' && (
          <motion.div
            key="identity"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <ProfileIdentity
              profile={profile}
              user={user}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              editData={editData}
              setEditData={setEditData}
              saveLoading={saveLoading}
              handleSave={handleSave}
              bmi={bmi}
              bmiCat={bmiCat}
              healthScore={healthScore}
              history={history}
            />
          </motion.div>
        )}

        {activeTab === 'diary' && (
          <motion.div
            key="diary"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="row g-4 mt-2 align-items-stretch vault-tab-row"
          >
            <SymptomDiary
              wellnessRating={wellnessRating}
              setWellnessRating={setWellnessRating}
              energyLevel={energyLevel}
              setEnergyLevel={setEnergyLevel}
              moodState={moodState}
              setMoodState={setMoodState}
              selectedSymptoms={selectedSymptoms}
              handleToggleDiarySymptom={handleToggleDiarySymptom}
              diaryNotes={diaryNotes}
              setDiaryNotes={setDiaryNotes}
              healthLogs={healthLogs}
              handleSaveDiaryLog={handleSaveDiaryLog}
            />
          </motion.div>
        )}

        {activeTab === 'vault' && (
          <motion.div
            key="vault"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="row g-4 mt-2 align-items-stretch vault-tab-row"
          >
            <div className="col-lg-6">
              <MedicalVault
                archive={archive}
                loadingArchive={loadingArchive}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
              />
            </div>
            <div className="col-lg-6">
              <RiskAssessments
                history={history}
                loadingHistory={loadingHistory}
                expandedHistId={expandedHistId}
                setExpandedHistId={setExpandedHistId}
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'adherence' && (
          <motion.div
            key="adherence"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="row g-4 mt-2 align-items-stretch vault-tab-row"
          >
            <div className="col-lg-6">
              <PillBox
                archive={archive}
                customMeds={customMeds}
                newMedName={newMedName}
                setNewMedName={setNewMedName}
                newMedDosage={newMedDosage}
                setNewMedDosage={setNewMedDosage}
                newMedFrequency={newMedFrequency}
                setNewMedFrequency={setNewMedFrequency}
                newMedTime={newMedTime}
                setNewMedTime={setNewMedTime}
                medsTakenToday={medsTakenToday}
                handleToggleMedTaken={handleToggleMedTaken}
                handleAddCustomMed={handleAddCustomMed}
                handleDeleteCustomMed={handleDeleteCustomMed}
                safetyReport={safetyReport}
                safetyLoading={safetyLoading}
                safetyError={safetyError}
                handleCheckDrugSafety={handleCheckDrugSafety}
              />
            </div>
            <div className="col-lg-6">
              <Consultations
                upcomingAppointments={upcomingAppointments}
                selectedDoctor={selectedDoctor}
                setSelectedDoctor={setSelectedDoctor}
                appointmentDate={appointmentDate}
                setAppointmentDate={setAppointmentDate}
                appointmentTime={appointmentTime}
                setAppointmentTime={setAppointmentTime}
                appointmentReason={appointmentReason}
                setAppointmentReason={setAppointmentReason}
                showBookingModal={showBookingModal}
                setShowBookingModal={setShowBookingModal}
                handleBookAppointment={handleBookAppointment}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Profile;