import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  User,
  Activity,
  Database,
  Heart,
  FileText,
  Pill,
  FileUp,
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


function Profile({ user, onUserUpdate }) {
  const { setSidebarContent } = useContext(SidebarContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // ------------------------------------------------------------------
  // EMERGENCY QR TOKEN STATE
  // ------------------------------------------------------------------
  const [emergencyToken, setEmergencyToken] = useState(() => {
    try {
      const uid = user?.id || user?.user_id || user?.pk || 'guest';
      return localStorage.getItem(`medfusion_emergency_token_${uid}`) || null;
    } catch (e) {
      return null;
    }
  });

  const handleGenerateToken = async () => {
    try {
      const res = await api.post('/emergency/generate/');
      const token = res.data.token;
      const uid = user?.id || user?.user_id || user?.pk || 'guest';
      setEmergencyToken(token);
      localStorage.setItem(`medfusion_emergency_token_${uid}`, token);
    } catch (err) {
      console.error('Failed to generate emergency token:', err);
    }
  };

  const handleRevokeToken = async () => {
    try {
      await api.delete('/emergency/revoke/');
    } catch (err) {
      console.error('Failed to revoke emergency token:', err);
    } finally {
      const uid = user?.id || user?.user_id || user?.pk || 'guest';
      setEmergencyToken(null);
      localStorage.removeItem(`medfusion_emergency_token_${uid}`);
    }
  };

  // ------------------------------------------------------------------
  // TAB STATE
  // ------------------------------------------------------------------
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTabState, setActiveTabState] = useState('identity');

  const activeTab = (tabParam && ['identity', 'vault', 'adherence'].includes(tabParam))
    ? tabParam
    : activeTabState;

  const setActiveTab = (tabId) => setActiveTabState(tabId);

  // Archives states
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistId, setExpandedHistId] = useState(null);

  const [archive, setArchive] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Stats for doctors
  const [docStats, setDocStats] = useState({ patientCount: 0, rxCount: 0, pathCount: 0 });

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
  // DRUG SAFETY ADVISOR
  // -------------------------------------------------------------
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyError, setSafetyError] = useState('');
  const [safetyReport, setSafetyReport] = useState(null);

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
                { id: 'adherence', label: 'Pill Box', icon: <Pill size={18} /> }
              ].map((tab) => {
                const tabThemeClasses = {
                  identity: 'theme-general-active',
                  vault: 'theme-cancer-active',
                  adherence: 'theme-diabetes-active'
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

  const calculateHealthScore = useCallback(() => {
    let score = 100;
    // Inline BMI calculation so useCallback deps are fully satisfied
    let bmi = null;
    if (profile?.weight && profile?.height) {
      const hMet = profile.height / 100;
      bmi = parseFloat((profile.weight / (hMet * hMet)).toFixed(1));
    }
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
  }, [profile, history]);

  useEffect(() => {
    const uid = user?.id || user?.user_id || user?.pk || 'guest';
    if (uid && user?.role === 'Patient') {
      const score = calculateHealthScore();
      if (score) {
        localStorage.setItem(`medfusion_health_score_${uid}`, score);
        window.dispatchEvent(new Event('medfusion_health_score_updated'));
      }
    }
  }, [profile, history, user, calculateHealthScore]);

  // -------------------------------------------------------------
  // PROFILE UPDATE ACTION
  // -------------------------------------------------------------
  const handleSave = async () => {
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const uid = user.id || user.user_id || user.pk;
      if (!uid) {
        setSaveError('User ID not found. Please try logging in again.');
        setSaveLoading(false);
        return;
      }
      const response = await api.post('/profile/update/', {
        patient_id: uid,
        ...editData
      });
      if (response.data && response.data.user) {
        // Sync updated user to parent App state and localStorage
        const updatedUser = response.data.user;
        localStorage.setItem('medfusion_user', JSON.stringify(updatedUser));
        if (onUserUpdate) onUserUpdate(updatedUser);
      }
      setIsEditing(false);
      await fetchProfile();
      setSaveSuccess('Profile details updated successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      const msg = err.response?.data?.error || 'Failed to update profile. Please try again.';
      setSaveError(msg);
      setTimeout(() => setSaveError(''), 5000);
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

  if (loading) return <div className="text-center py-5 opacity-50 font-monospace text-theme-accent small">Synchronizing consolidated health vault...</div>;
  if (!profile) return <div className="glass-card p-5 text-center font-monospace text-danger">[ERROR: NEURAL IDENTITY OFFLINE]</div>;

  if (user && user.role === 'Doctor') {
    return (
      <div className="reveal px-1 theme-general font-monospace" style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        <div className="row g-4 flex-grow-1">

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
                    Edit
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
  };
  const activeTheme = tabThemes[activeTab] || 'theme-general';

  return (
    <div className={`reveal px-1 ${activeTheme} transition-all duration-300 vault-tab-active-layout`}>

      {/* Global save success / error toast */}
      {saveSuccess && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 mb-3 rounded-3 font-monospace" style={{ fontSize: '0.8rem', background: 'rgba(0,200,130,0.12)', border: '1px solid rgba(0,200,130,0.3)', color: '#00f5a0', letterSpacing: '0.02em' }}>
          <span>✓</span> {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3 rounded-3 font-monospace" style={{ fontSize: '0.8rem', background: 'rgba(255,50,80,0.1)', border: '1px solid rgba(255,50,80,0.3)', color: '#ff6080', letterSpacing: '0.02em' }}>
          <span>⚠</span> {saveError}
        </div>
      )}

      {/* Holographic Segmented Tab Switcher */}
      <div className="mb-4 tab-selector-container p-1 bg-glass d-md-none" style={{ borderRadius: '12px', border: '1.5px solid var(--theme-accent, rgba(0, 245, 212, 0.25))' }}>
        <div className="row g-1 w-100 m-0">
          {[
            { id: 'identity', label: 'Identity & Vitals', icon: <User size={16} /> },
            { id: 'vault', label: 'Medical Vault & History', icon: <FileText size={16} /> },
            { id: 'adherence', label: 'Pill Box', icon: <Pill size={16} /> }
          ].map((tab) => (
            <div className="col-4 p-0" key={tab.id}>
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
              saveSuccess={saveSuccess}
              saveError={saveError}
              emergencyToken={emergencyToken}
              onGenerateToken={handleGenerateToken}
              onRevokeToken={handleRevokeToken}
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
            <div className="col-12">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Profile;
