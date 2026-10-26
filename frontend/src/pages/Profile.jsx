import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  User,
  Activity,
  Database,
  Heart,
  FileText,
  FileUp,
  Droplet,
  Scale,
  Ruler,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarContext } from '../context/SidebarContext';
import { getAge, getInitials } from '../services/utils';
import { useTheme } from '../context/useTheme';

// Import Decomposed Tab Components
import ProfileIdentity from './profile/ProfileIdentity';
import MedicalVault from './profile/MedicalVault';
import RiskAssessments from './profile/RiskAssessments';


function Profile({ user, onUserUpdate }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
  // SECURITY NOTE: The emergency token is persisted in localStorage so it
  // survives page refreshes without requiring an extra network round-trip on
  // every profile load. Trade-off: localStorage is accessible to any JS
  // running in the same origin, so an XSS vulnerability could expose the
  // token. Mitigations in place: (1) the token only grants read access to
  // non-sensitive emergency card fields — no auth credentials are stored;
  // (2) users can revoke the token at any time via handleRevokeToken;
  // (3) the token is scoped per user ID. If a stricter posture is required,
  // swap localStorage for sessionStorage (cleared on tab close) or replace
  // client-side persistence with a GET /api/emergency/status/ call on mount.
  const _userId = user?.id || user?.user_id || user?.pk || 'guest';
  const [emergencyToken, setEmergencyToken] = useState(() => {
    try {
      const uid = user?.id || user?.user_id || user?.pk || 'guest';
      return localStorage.getItem(`medfusion_emergency_token_${uid}`) || '';
    } catch (e) {
      return '';
    }
  });

  const handleGenerateToken = async () => {
    try {
      const res = await api.post('/emergency/generate/');
      const token = res.data.token || '';
      const uid = user?.id || user?.user_id || user?.pk || 'guest';
      setEmergencyToken(token);
      // See SECURITY NOTE above regarding localStorage usage.
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
      setEmergencyToken('');
      localStorage.removeItem(`medfusion_emergency_token_${uid}`);
    }
  };

  // ------------------------------------------------------------------

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTabState, setActiveTabState] = useState('identity');

  const activeTab = (tabParam && ['identity', 'vault'].includes(tabParam))
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
            <h2 className="fw-bolder fs-6 m-0" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem', color: 'var(--text-on-dark)' }}>
              Doctor <span className="text-theme-accent">Credentials</span>
            </h2>
            <p className="text-secondary m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
              Verify credential profiles and clinical practicing registry statistics.
            </p>
          </div>
          <div className="mt-2">
            <h4 className="fw-bold mb-3" style={{ fontSize: '1.05rem', letterSpacing: '0.05em', color: 'var(--text-on-dark)' }}>
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
            <h2 className="fw-bolder fs-6 m-0" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem', color: 'var(--text-on-dark)' }}>
              Health <span className="text-theme-accent">Vault Console</span>
            </h2>
            <p className="text-secondary m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
              Manage clinical profiles, run health risk diagnostics, scan doctor prescriptions, or chat with AI.
            </p>
          </div>

          <div className="mt-2">
            <h4 className="fw-bold mb-3" style={{ fontSize: '1.05rem', letterSpacing: '0.05em', color: 'var(--text-on-dark)' }}>
              <span className="text-theme-accent font-monospace text-uppercase" style={{ letterSpacing: '0.06em' }}>Portal Sections</span>
            </h4>
            <div className="d-flex flex-column gap-2 mt-2">
              {[
                { id: 'identity', label: 'Profile & Vitals', icon: <User size={18} /> },
                { id: 'vault', label: 'Medical Vault & History', icon: <FileUp size={18} /> },
              ].map((tab) => {
                const tabThemeClasses = {
                  identity: 'theme-general-active',
                  vault: 'theme-cancer-active',
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

  if (loading) return <div className="text-center py-5 opacity-50 font-monospace text-theme-accent small">Loading profile...</div>;
  if (!profile) return <div className="glass-card p-5 text-center font-monospace text-danger">Failed to load profile. Please refresh the page.</div>;

  if (user && user.role === 'Doctor') {
    return (
      <div className="reveal px-1 theme-general font-monospace" style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        <div className="row g-4 flex-grow-1">

          {/* Avatar and Credentials Panel */}
          <div className="col-lg-5 col-md-5 d-flex">
            <div className="glass-card text-center w-100 p-5 d-flex flex-column align-items-center justify-content-center position-relative border-theme-accent border-opacity-15 bg-white-5">
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
                <User size={55} className="text-theme-accent" />
              </div>

              {!isEditing ? (
                <>
                  <h2 className="fw-bold mb-1 text-uppercase" style={{ letterSpacing: '0.02em', fontSize: '1.5rem', color: 'var(--text-primary)' }}>{profile.name}</h2>
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
                    className="text-center w-100 p-2 border border-white-10 rounded bg-transparent font-monospace" style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              )}

              <div className="row g-3 w-100 mt-2">
                <div className="col-12">
                  <div className="bg-white-10 bg-opacity-20 p-3.5 rounded border border-white-5 text-start font-monospace">
                    <span className="small text-secondary d-block text-uppercase mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.06em' }}>Medical License ID</span>
                    {!isEditing ? (
                      <strong style={{ color: 'var(--text-primary)' }} className="fs-6">{user.license_number || 'N/A'}</strong>
                    ) : (
                      <input
                        type="text"
                        value={editData.license_number || ''}
                        onChange={(e) => setEditData({ ...editData, license_number: e.target.value })}
                        className="py-1 mt-1 font-monospace w-100 bg-transparent border-white-10"
                        style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}
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
              <h3 className="fw-bold m-0 d-flex align-items-center gap-2 border-bottom border-white-10 pb-3" style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                <Activity className="text-theme-accent" />
                Practice Registry Statistics
              </h3>

              <div className="row g-4 font-monospace">
                <div className="col-md-4">
                  <div className="p-4 rounded border border-white-5 bg-white-10 bg-opacity-25 text-center hover-border-accent transition-all">
                    <span className="text-secondary d-block small mb-1" style={{ fontSize: '0.72rem' }}>PATIENTS MANAGED</span>
                    <span className="fw-bold fs-3 text-info">{docStats.patientCount}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-4 rounded border border-white-5 bg-white-10 bg-opacity-25 text-center hover-border-accent transition-all">
                    <span className="text-secondary d-block small mb-1" style={{ fontSize: '0.72rem' }}>INGESTED PRESCRIPTIONS</span>
                    <span className="fw-bold fs-3 text-info">{docStats.rxCount}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-4 rounded border border-white-5 bg-white-10 bg-opacity-25 text-center hover-border-accent transition-all">
                    <span className="text-secondary d-block small mb-1" style={{ fontSize: '0.72rem' }}>PATHOLOGY FILES</span>
                    <span className="fw-bold fs-3 text-info">{docStats.pathCount}</span>
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
  };
  const activeTheme = tabThemes[activeTab] || 'theme-general';

  return (
    <div className={`reveal px-1 ${activeTheme} transition-all duration-300 ${activeTab === 'vault' ? 'vault-tab-active-layout' : ''}`}>

      {/* ── Profile Header Banner (Theme-Adaptive) ──────────────────── */}
      <div
        className="mb-4 position-relative overflow-hidden"
        style={{
          borderRadius: '20px',
          padding: '28px 32px',
          background: isDark
            ? 'linear-gradient(135deg, #080808 0%, #081008 35%, #0a1508 65%, #080808 100%)'
            : '#FFFFFF',
          border: isDark
            ? '1px solid rgba(52, 211, 153, 0.28)'
            : '1px solid rgba(16, 185, 129, 0.25)',
          boxShadow: isDark
            ? '0 0 40px rgba(52,211,153,0.08), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 4px 20px rgba(16, 185, 129, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ position: 'absolute', top: '-25px', right: '80px', width: '180px', height: '180px', borderRadius: '50%', background: `radial-gradient(circle, rgba(52,211,153,${isDark ? '0.12' : '0.08'}) 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '100px', width: '130px', height: '130px', borderRadius: '50%', background: `radial-gradient(circle, rgba(45,212,191,${isDark ? '0.1' : '0.08'}) 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: isDark ? 'rgba(52,211,153,0.18)' : 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)' }}>
              <User size={14} style={{ color: isDark ? '#34d399' : '#059669' }} />
            </div>
            <span className="font-monospace text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.14em', color: isDark ? '#34d399' : '#059669', fontWeight: 700 }}>
              Patient Identity Vault &nbsp;·&nbsp; {profile?.vault_id || `MF-P-${user?.id || '—'}`}
            </span>
          </div>
          <h1 className="fw-bolder m-0 mb-2" style={{ fontSize: '2rem', letterSpacing: '-0.03em', color: isDark ? '#FFFFFF' : '#0F172A', lineHeight: 1.1, fontFamily: 'var(--font-main)' }}>
            Health <span style={{ background: 'linear-gradient(90deg, #DC2626, #EA580C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Profile</span>
          </h1>
          <p className="m-0" style={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.65)' : '#475569', maxWidth: '520px', lineHeight: 1.5, fontWeight: isDark ? 400 : 500 }}>
            Manage your clinical identity, medical history vault, risk assessments, and emergency QR card — all secured in one place.
          </p>
        </div>
      </div>

      {/* Global save success / error toast */}
      {saveSuccess && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 mb-3 rounded-3 font-monospace" style={{ fontSize: '0.8rem', background: 'rgba(57, 116, 91, 0.15)', border: '1px solid var(--primary-accent)', color: 'var(--primary-accent)', letterSpacing: '0.02em' }}>
          <CheckCircle2 size={14} /> {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3 rounded-3 font-monospace" style={{ fontSize: '0.8rem', background: 'rgba(185, 28, 28, 0.12)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', letterSpacing: '0.02em' }}>
          <AlertTriangle size={14} /> {saveError}
        </div>
      )}

      {/* Holographic Segmented Tab Switcher */}
      <div className="mb-4 tab-selector-container p-1 bg-glass d-md-none" style={{ borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div className="row g-1 w-100 m-0">
          {[
            { id: 'identity', label: 'Identity', icon: <User size={16} /> },
            { id: 'vault', label: 'Vault', icon: <FileText size={16} /> },
          ].map((tab) => (
            <div className="col p-0" key={tab.id}>
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`btn-clinical py-2 w-100 d-flex align-items-center justify-content-center gap-1 border-0 rounded-3 font-monospace text-uppercase font-bold ${activeTab === tab.id ? 'primary' : 'bg-transparent text-secondary hover-white'}`}
                style={{ fontSize: '0.72rem', letterSpacing: '0.02em', transition: 'all 0.25s' }}
              >
                {tab.icon}
                <span>{tab.label}</span>
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

      </AnimatePresence>
    </div>
  );
}

export default Profile;
