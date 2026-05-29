import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  User, 
  Activity, 
  ShieldAlert, 
  Phone, 
  Edit3, 
  Save, 
  X, 
  Database, 
  Heart, 
  FileText, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Compass, 
  CheckCircle,
  Activity as ActivityIcon
} from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarContext } from '../context/SidebarContext';

function Profile({ user, onUserUpdate }) {
  const { setSidebarContent } = useContext(SidebarContext);
  
  const [currentYear] = useState(() => new Date().getFullYear());
  
  const getAge = (dobString) => {
    try {
      const birth = new Date(dobString);
      const birthYear = birth.getFullYear();
      if (isNaN(birthYear)) return 'N/A';
      return currentYear - birthYear;
    } catch (e) {
      return 'N/A';
    }
  };
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('identity'); // 'identity' | 'diagnostics' | 'reports'

  // Archives states
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistId, setExpandedHistId] = useState(null);

  const [archive, setArchive] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [docStats, setDocStats] = useState({ patientCount: 0, rxCount: 0, pathCount: 0 });

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
      const combined = [...rxRes.data, ...pathRes.data].sort((a, b) => 
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
              Manage clinical profiles, historical screening diagnostics, and verified prescription records.
            </p>
          </div>

          <div className="mt-2">
            <h4 className="fw-bold mb-3 text-white" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              <span className="text-theme-accent font-monospace text-uppercase" style={{ letterSpacing: '0.06em' }}>Vault Sections</span>
            </h4>
            <div className="d-flex flex-column gap-3 mt-3">
              {[
                { id: 'identity', label: 'Clinical Profile', icon: <User size={20} /> },
                { id: 'diagnostics', label: 'Health Check History', icon: <Heart size={20} /> },
                { id: 'reports', label: 'Scanned Reports', icon: <FileText size={20} /> },
              ].map((tab) => (
                <div 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`disease-select-tile cursor-pointer ${
                    activeTab === tab.id ? 'active heart' : 'inactive'
                  }`}
                  style={{ padding: '16px 20px' }}
                >
                  <div className="d-flex align-items-center justify-content-start gap-3 font-monospace fw-bold text-uppercase" style={{ fontSize: '0.9rem' }}>
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
      return () => setSidebarContent(null);
    }
  }, [activeTab, setSidebarContent, user]);

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
    } catch {
      alert("Failed to update profile");
    } finally {
      setSaveLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    const r = risk?.toLowerCase();
    if (r?.includes('high')) return 'var(--accent-red)';
    if (r?.includes('mod') || r?.includes('medium')) return 'var(--accent-orange)';
    return 'var(--accent-green)';
  };

  const getRiskBg = (risk) => {
    const r = risk?.toLowerCase();
    if (r?.includes('high')) return 'rgba(255, 51, 102, 0.1)';
    if (r?.includes('mod') || r?.includes('medium')) return 'rgba(255, 143, 0, 0.1)';
    return 'rgba(0, 245, 212, 0.1)';
  };

  if (loading) return <div className="text-center py-5 opacity-50 font-monospace text-theme-accent small">Synchronizing consolidated health vault...</div>;
  if (!profile) return <div className="glass-card p-5 text-center font-monospace text-danger">[ERROR: NEURAL IDENTITY OFFLINE]</div>;

  if (user && user.role === 'Doctor') {
    return (
      <div className="reveal px-1 py-1 theme-general font-monospace" style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        <div className="row g-4 mt-2 flex-grow-1">
          
          {/* Avatar and Credentials Panel */}
          <div className="col-lg-5 col-md-5 d-flex">
            <div className="glass-card text-center w-100 p-5 d-flex flex-column align-items-center justify-content-center position-relative">
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
                      className="px-2 py-1.5 border border-white-10 bg-transparent text-secondary rounded font-monospace text-uppercase" 
                      onClick={() => setIsEditing(false)}
                      style={{ width: 'auto', fontSize: '0.8rem' }}
                    >
                      <X size={12} /> Cancel
                    </button>
                    <button 
                      className="primary px-2 py-1.5 rounded d-flex align-items-center gap-2 font-monospace text-uppercase" 
                      onClick={handleSave} 
                      disabled={saveLoading}
                      style={{ width: 'auto', fontSize: '0.8rem' }}
                    >
                      <Save size={12} /> Save
                    </button>
                  </div>
                )}
              </div>

              <div className="mx-auto mb-4 bg-white-10 rounded-circle border border-2 border-dashed border-theme-accent d-flex align-items-center justify-content-center" style={{ width: '130px', height: '130px' }}>
                <User size={55} className="text-theme-accent animate-pulse" />
              </div>
              
              {!isEditing ? (
                <h2 className="fw-bold text-white mb-1 text-uppercase text-truncate w-100" style={{ letterSpacing: '0.02em', fontSize: '1.5rem' }}>Dr. {user.full_name || 'Medical Examiner'}</h2>
              ) : (
                <div className="mb-3 w-100">
                  <label className="text-secondary small d-block mb-1 text-center text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>Doctor Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={editData.full_name || ''} 
                    onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                    className="text-center font-monospace text-white mt-1 w-100"
                  />
                </div>
              )}

              <span className="badge bg-theme-accent bg-opacity-15 text-theme-accent border border-theme-accent border-opacity-35 px-3 py-2 font-monospace mb-4 text-uppercase" style={{ fontSize: '0.8rem' }}>
                {user.role}
              </span>
              
              <div className="w-100 border-top border-white-10 pt-4 text-start font-monospace small d-flex flex-column gap-3">
                <div>
                  <span className="text-secondary d-block">Authorized Email Address</span>
                  <span className="text-white fw-bold">{user.email}</span>
                </div>
                <div>
                  <span className="text-secondary d-block">Clinical License Identifier</span>
                  {!isEditing ? (
                    <span className="text-white fw-bold text-uppercase">{user.license_number || 'LIC-PENDING-UNRESOLVED'}</span>
                  ) : (
                    <div className="w-100 mt-1">
                      <input 
                        type="text" 
                        placeholder="License Identifier" 
                        value={editData.license_number || ''} 
                        onChange={(e) => setEditData({...editData, license_number: e.target.value})}
                        className="text-center font-monospace text-white w-100"
                      />
                    </div>
                  )}
                </div>
                {user.medical_proof_file && (
                  <div>
                    <span className="text-secondary d-block">Credential Certification Attachment</span>
                    <a 
                      href={`http://localhost:8000${user.medical_proof_file}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-theme-accent fw-bold d-inline-flex align-items-center gap-1 hover-white mt-1 text-decoration-none"
                    >
                      📄 View Certified Proof Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Registry Stats Panel */}
          <div className="col-lg-7 col-md-7 d-flex">
            <div className="glass-card p-5 w-100 d-flex flex-column gap-4 justify-content-center">
              <h3 className="fw-bold mb-2 text-white text-uppercase" style={{ fontSize: '1.25rem' }}>
                Practice & Records Summary
              </h3>
              
              <div className="row g-3">
                <div className="col-6">
                  <div className="p-4 bg-white-5 border border-white-5 rounded text-center">
                    <span className="text-secondary d-block mb-1 text-uppercase small" style={{ fontSize: '0.78rem' }}>Assigned Patients</span>
                    <span className="text-theme-accent fw-bold fs-2">{docStats.patientCount}</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-4 bg-white-5 border border-white-5 rounded text-center">
                    <span className="text-secondary d-block mb-1 text-uppercase small" style={{ fontSize: '0.78rem' }}>Prescriptions Issued</span>
                    <span className="text-theme-accent fw-bold fs-2">{docStats.rxCount}</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="p-4 bg-white-5 border border-white-5 rounded text-center">
                    <span className="text-secondary d-block mb-1 text-uppercase small" style={{ fontSize: '0.78rem' }}>Pathology Reports Ingested</span>
                    <span className="text-theme-accent fw-bold fs-2">{docStats.pathCount}</span>
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

  return (
    <div className="reveal px-1 py-1 theme-general">
      {/* Mobile Tab Selector Container */}
      <div className="mb-4 d-md-none">
        <div className="glass-card p-4 d-flex align-items-center justify-content-center">
          <div className="tab-selector-container">
            <button 
              onClick={() => setActiveTab('identity')} 
              className={`px-4 py-2 font-monospace text-uppercase font-bold ${activeTab === 'identity' ? 'primary' : 'bg-transparent text-secondary hover-white'}`}
              style={{ width: 'auto', borderRadius: '6px', fontSize: '0.92rem' }}
            >
              Clinical Profile
            </button>
            <button 
              onClick={() => setActiveTab('diagnostics')} 
              className={`px-4 py-2 font-monospace text-uppercase font-bold ${activeTab === 'diagnostics' ? 'primary' : 'bg-transparent text-secondary hover-white'}`}
              style={{ width: 'auto', borderRadius: '6px', fontSize: '0.92rem' }}
            >
              Health Check History
            </button>
            <button 
              onClick={() => setActiveTab('reports')} 
              className={`px-4 py-2 font-monospace text-uppercase font-bold ${activeTab === 'reports' ? 'primary' : 'bg-transparent text-secondary hover-white'}`}
              style={{ width: 'auto', borderRadius: '6px', fontSize: '0.92rem' }}
            >
              Scanned Reports
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ==================== TAB 1: CLINICAL PROFILE ==================== */}
        {activeTab === 'identity' && (
          <motion.div
            key="identity"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="row g-4 mt-2"
          >
            {/* Left Column - Demographic Avatar Card */}
            <div className="col-lg-5">
              <div className="glass-card text-center h-100 p-5 d-flex flex-column align-items-center justify-content-center">
                <div className="mx-auto mb-4 bg-white-10 rounded-circle border border-2 border-dashed border-theme-accent d-flex align-items-center justify-content-center" style={{ width: '130px', height: '130px' }}>
                  <User size={55} className="text-theme-accent animate-pulse" />
                </div>
                
                {!isEditing ? (
                  <>
                    <h2 className="fw-bold text-white mb-1 text-uppercase" style={{ letterSpacing: '0.02em', fontSize: '1.5rem' }}>{profile.name}</h2>
                    <p className="text-theme-accent fw-bold small mb-4">Vault ID: {profile.vault_id || 'MF-2026-X9'}</p>
                  </>
                ) : (
                  <div className="mb-4 w-100">
                    <div className="row g-2">
                      <div className="col-6">
                        <input 
                          type="text" 
                          placeholder="First Name" 
                          value={editData.first_name} 
                          onChange={(e) => setEditData({...editData, first_name: e.target.value})}
                          className="text-center"
                        />
                      </div>
                      <div className="col-6">
                        <input 
                          type="text" 
                          placeholder="Last Name" 
                          value={editData.last_name} 
                          onChange={(e) => setEditData({...editData, last_name: e.target.value})}
                          className="text-center"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="row g-3 w-100 mt-2">
                  <div className="col-6">
                    <div className="bg-white-10 bg-opacity-20 p-3 rounded border border-white-5 text-center">
                       <p className="small text-secondary m-0 text-uppercase mb-2" style={{ fontSize: '0.82rem', letterSpacing: '0.08em' }}>Blood Group</p>
                       {!isEditing ? (
                          <h3 className="m-0 fw-bold text-white" style={{ fontSize: '1.6rem' }}>{profile.blood_group || 'O+'}</h3>
                       ) : (
                          <input 
                           type="text" 
                           value={editData.blood_group} 
                           onChange={(e) => setEditData({...editData, blood_group: e.target.value})}
                           className="text-center py-1 mt-1 font-monospace"
                           style={{ fontSize: '1.3rem', marginBottom: 0 }}
                          />
                       )}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="bg-white-10 bg-opacity-20 p-3 rounded border border-white-5 text-center h-100 d-flex flex-column justify-content-center align-items-center">
                       <p className="small text-secondary m-0 text-uppercase mb-2" style={{ fontSize: '0.82rem', letterSpacing: '0.08em' }}>Vault Status</p>
                       <span className="badge bg-theme-accent bg-opacity-20 text-theme-accent border border-theme-accent p-2 px-3 fw-bold" style={{ fontSize: '0.88rem' }}>SECURE_ACTIVE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Emergency Telemetry Info */}
            <div className="col-lg-7">
              <div className="glass-card h-100 p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h3 className="fw-bold text-white d-flex align-items-center gap-2 m-0" style={{ fontSize: '1.4rem' }}>
                    <ShieldAlert className="text-theme-accent animate-pulse" />
                    <span className="text-theme-accent">Emergency Directives</span>
                  </h3>

                  {!isEditing ? (
                    <button 
                      className="px-3 py-1.5 border border-white-10 bg-transparent text-theme-accent rounded d-flex align-items-center gap-2 hover-white font-monospace text-uppercase" 
                      onClick={() => setIsEditing(true)}
                      style={{ width: 'auto', fontSize: '0.88rem' }}
                    >
                      <Edit3 size={12} /> Edit Details
                    </button>
                  ) : (
                    <div className="d-flex gap-2">
                       <button 
                         className="px-2.5 py-1.5 border border-white-10 bg-transparent text-secondary rounded font-monospace text-uppercase" 
                         onClick={() => setIsEditing(false)}
                         style={{ width: 'auto', fontSize: '0.88rem' }}
                       >
                          <X size={12} /> Cancel
                       </button>
                       <button 
                         className="primary px-2.5 py-1.5 rounded d-flex align-items-center gap-2 font-monospace text-uppercase" 
                         onClick={handleSave} 
                         disabled={saveLoading}
                         style={{ width: 'auto', fontSize: '0.88rem' }}
                       >
                          <Save size={12} /> Save
                       </button>
                    </div>
                  )}
                </div>
                
                <div className="mb-4 mt-2">
                  <label className="small text-theme-accent fw-bold mb-3 d-block font-monospace text-uppercase">Patient Biometrics & Demographics</label>
                  <div className="row g-3 font-monospace mb-2" style={{ fontSize: '0.9rem' }}>
                    <div className="col-md-6">
                      <span className="text-secondary d-block">DATE OF BIRTH</span>
                      {!isEditing ? (
                        <span className="text-white fw-bold">{profile.dob || 'N/A'} {profile.dob && `(${getAge(profile.dob)} Yrs)`}</span>
                      ) : (
                        <input 
                          type="date" 
                          value={editData.dob || ''} 
                          onChange={(e) => setEditData({...editData, dob: e.target.value})}
                          style={{ marginBottom: 0, padding: '8px 12px', fontSize: '0.85rem' }}
                        />
                      )}
                    </div>
                    <div className="col-md-6">
                      <span className="text-secondary d-block">BIOLOGICAL GENDER</span>
                      {!isEditing ? (
                        <span className="text-white fw-bold">
                          {profile.gender === 'M' ? 'Male (XY)' : profile.gender === 'F' ? 'Female (XX)' : profile.gender === 'O' ? 'Other' : 'N/A'}
                        </span>
                      ) : (
                        <select 
                          value={editData.gender || ''} 
                          onChange={(e) => setEditData({...editData, gender: e.target.value})}
                          style={{ marginBottom: 0, padding: '8px 12px', fontSize: '0.85rem' }}
                        >
                          <option value="">Select Gender</option>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="O">Other</option>
                        </select>
                      )}
                    </div>
                    <div className="col-md-6">
                      <span className="text-secondary d-block">WEIGHT (KG)</span>
                      {!isEditing ? (
                        <span className="text-white fw-bold">{profile.weight ? `${profile.weight} kg` : 'N/A'}</span>
                      ) : (
                        <input 
                          type="number" 
                          placeholder="Weight (kg)"
                          value={editData.weight || ''} 
                          onChange={(e) => setEditData({...editData, weight: e.target.value})}
                          style={{ marginBottom: 0, padding: '8px 12px', fontSize: '0.85rem' }}
                        />
                      )}
                    </div>
                    <div className="col-md-6">
                      <span className="text-secondary d-block">HEIGHT (CM)</span>
                      {!isEditing ? (
                        <span className="text-white fw-bold">{profile.height ? `${profile.height} cm` : 'N/A'}</span>
                      ) : (
                        <input 
                          type="number" 
                          placeholder="Height (cm)"
                          value={editData.height || ''} 
                          onChange={(e) => setEditData({...editData, height: e.target.value})}
                          style={{ marginBottom: 0, padding: '8px 12px', fontSize: '0.85rem' }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-white-10 my-4" style={{ opacity: 0.15 }} />

                <div className="mb-4 mt-2">
                  <label className="small text-secondary fw-bold mb-3 d-block">Recorded Clinical Allergies</label>
                  {!isEditing ? (
                    <div className="d-flex flex-wrap gap-2">
                       {profile.allergies?.length > 0 ? (
                        profile.allergies.map((a, i) => (
                          <span key={i} className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-30 p-2 px-3 rounded text-uppercase" style={{ fontSize: '0.92rem' }}>
                            ⚠️ {a}
                          </span>
                        ))
                      ) : (
                        <p className="text-secondary small m-0">[No active clinical allergies registered in core database]</p>
                      )}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Comma separated allergies (e.g. Peanuts, Penicillin)" 
                      value={editData.allergies} 
                      onChange={(e) => setEditData({...editData, allergies: e.target.value})}
                    />
                  )}
                </div>

                <hr className="border-white-10 my-4" style={{ opacity: 0.15 }} />

                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <Phone size={16} className="text-theme-accent animate-pulse" />
                    <label className="small text-secondary fw-bold m-0">Emergency Contact Routing Node</label>
                  </div>
                  {!isEditing ? (
                    <p className="fs-5 fw-bold text-white mb-0" style={{ fontSize: '1.35rem' }}>☎️ {profile.emergency_contact || 'N/A'}</p>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Emergency Phone Number" 
                      value={editData.emergency_contact} 
                      onChange={(e) => setEditData({...editData, emergency_contact: e.target.value})}
                    />
                  )}
                </div>

                <div className="p-3 rounded bg-white-10 border border-white-10 d-flex align-items-center gap-3">
                    <Database size={24} className="text-theme-accent animate-pulse" />
                    <div>
                        <p className="m-0 text-white small fw-bold">ENCRYPTED PATIENT METRICS DATA-STREAM</p>
                        <p className="m-0 text-secondary" style={{ fontSize: '0.82rem' }}>AES-256-GCM Secure Telemetry Channel Active & Monitored</p>
                    </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== TAB 2: HEALTH CHECK HISTORY ==================== */}
        {activeTab === 'diagnostics' && (
          <motion.div
            key="diagnostics"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="row g-4 mt-2"
          >
            <div className="col-12">
              <div className="glass-card p-4">
                <h3 className="fw-bold mb-4 text-white d-flex align-items-center gap-2" style={{ fontSize: '1.4rem' }}>
                  <Heart size={18} className="text-theme-accent animate-pulse" />
                  <span className="text-theme-accent">Past AI Health Check Assessments</span>
                </h3>

                {loadingHistory ? (
                  <div className="text-center py-5 opacity-50 font-monospace text-theme-accent small">Retrieving health history database...</div>
                ) : history.length === 0 ? (
                  <div className="text-center py-5 opacity-40 border border-2 border-dashed border-white-10 rounded small">
                    No past AI risk predictions completed yet.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {history.map((record) => {
                      const isExpanded = expandedHistId === record.id;
                      return (
                        <div key={record.id} className="p-3 bg-white-10 bg-opacity-20 rounded border border-white-5 hover-border-accent transition-all">
                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 cursor-pointer" onClick={() => setExpandedHistId(isExpanded ? null : record.id)}>
                            <div className="d-flex align-items-center gap-3">
                              <div className="p-2 rounded bg-white-5 text-white">
                                {record.disease_type.toLowerCase().includes('heart') ? (
                                  <Heart size={18} className="text-danger" />
                                ) : record.disease_type.toLowerCase().includes('diabetes') ? (
                                  <ActivityIcon size={18} className="text-primary" />
                                ) : (
                                  <Compass size={18} className="text-warning" />
                                )}
                              </div>
                              <div>
                                <h6 className="fw-bold text-white m-0 text-uppercase" style={{ fontSize: '1.05rem' }}>
                                  {record.disease_type.replace(/_/g, ' ')} Risk Check
                                </h6>
                                <small className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                  Check Date: {new Date(record.created_at).toLocaleDateString()}
                                </small>
                              </div>
                            </div>

                            <div className="d-flex align-items-center gap-3">
                              <span 
                                className="badge border p-2 px-3 fw-bold" 
                                style={{ 
                                  fontSize: '0.92rem', 
                                  borderColor: getRiskColor(record.risk_level), 
                                  color: getRiskColor(record.risk_level),
                                  background: getRiskBg(record.risk_level)
                                }}
                              >
                                {record.risk_level.toUpperCase()} ({record.risk_score}%)
                              </span>
                              {isExpanded ? <ChevronUp size={16} className="text-secondary" /> : <ChevronDown size={16} className="text-secondary" />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 pt-3 border-top border-white-10 reveal" style={{ fontSize: '0.98rem' }}>
                              <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                  <h6 className="text-theme-accent fw-bold mb-2 small font-monospace">[LIFESTYLE RECOMMENDATIONS]</h6>
                                  <ul className="text-secondary ps-3 mb-0">
                                    {record.remedies?.lifestyle_modifications?.map((r, idx) => <li key={idx} className="mb-1">{r}</li>)}
                                  </ul>
                                </div>
                                <div className="col-md-6">
                                  <h6 className="text-theme-accent fw-bold mb-2 small font-monospace">[CLINICAL RECOMMENDATIONS]</h6>
                                  <ul className="text-secondary ps-3 mb-0">
                                    {record.remedies?.clinical_recommendations?.map((r, idx) => <li key={idx} className="mb-1">{r}</li>)}
                                  </ul>
                                </div>
                              </div>

                              {record.remedies?.urgent_warning_signs?.length > 0 && (
                                <div className="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-30 rounded">
                                  <h6 className="text-danger fw-bold mb-2 small font-monospace">[CRITICAL CLINICAL DANGER WARNINGS]</h6>
                                  <ul className="text-danger ps-3 mb-0">
                                    {record.remedies.urgent_warning_signs.map((r, idx) => <li key={idx} className="mb-1">{r}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== TAB 3: SCANNED REPORTS ARCHIVE ==================== */}
        {activeTab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="row g-4 mt-2"
          >
            <div className="col-12">
              <div className="glass-card p-4">
                <h3 className="fw-bold mb-4 text-white d-flex align-items-center gap-2" style={{ fontSize: '1.4rem' }}>
                  <FileText size={18} className="text-theme-accent animate-pulse" />
                  <span className="text-theme-accent">Past Scanned Prescriptions & Lab Results</span>
                </h3>

                {loadingArchive ? (
                  <div className="text-center py-5 opacity-50 font-monospace text-theme-accent small">Retrieving scanned database archive...</div>
                ) : archive.length === 0 ? (
                  <div className="text-center py-5 opacity-40 border border-2 border-dashed border-white-10 rounded small">
                    No scanned prescriptions or pathology reports found.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {archive.map((record) => {
                      // Use the 'type' field returned by backend to_dict() — 'prescription' or 'pathology'
                      const isRx = record.type === 'prescription';
                      // For prescriptions: medicines live inside extracted_data
                      const medicines = isRx ? (record.extracted_data?.medicines || []) : [];
                      // For pathology: analysis contains the AI result, report_data has biomarkers array
                      const biomarkersArray = !isRx ? (record.report_data || []) : [];
                      const pathAnalysis = !isRx ? (record.analysis || {}) : {};
                      const isExpanded = expandedId === `${isRx ? 'rx' : 'path'}-${record.id}`;
                      return (
                        <div key={`${isRx ? 'rx' : 'path'}-${record.id}`} className="p-3 bg-white-10 bg-opacity-20 rounded border border-white-5 hover-border-accent transition-all">
                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : `${isRx ? 'rx' : 'path'}-${record.id}`)}>
                            <div className="d-flex align-items-center gap-3">
                              <div className="p-2 rounded bg-white-5 text-white">
                                {isRx ? <FileText size={16} className="text-theme-accent" /> : <Activity size={16} className="text-warning" />}
                              </div>
                              <div>
                                <h6 className="fw-bold text-white m-0 text-uppercase" style={{ fontSize: '1.05rem' }}>
                                  {isRx ? 'Extracted Prescription (Rx)' : 'Biomarker Pathology Lab Report'}
                                </h6>
                                <small className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                  Scan Date: {new Date(record.created_at).toLocaleDateString()}
                                </small>
                              </div>
                            </div>

                            <div className="d-flex align-items-center gap-3">
                              <span className="badge bg-white-5 border border-white-10 text-theme-accent p-2 fw-bold" style={{ fontSize: '0.88rem' }}>
                                {isRx ? `${medicines.length} Medications` : `${biomarkersArray.length} Lab Values`}
                              </span>
                              {isExpanded ? <ChevronUp size={16} className="text-secondary" /> : <ChevronDown size={16} className="text-secondary" />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-top border-white-10 reveal" style={{ fontSize: '0.98rem' }}>
                              {isRx ? (
                                <div>
                                  <h6 className="text-theme-accent small mb-2 fw-bold font-monospace">[EXTRACTED MEDICATION AGENTS]</h6>
                                  <div className="row g-2 mb-3">
                                    {medicines.map((m, idx) => (
                                      <div className="col-md-6" key={idx}>
                                        <div className="p-2 bg-white-10 border border-white-5 rounded d-flex justify-content-between align-items-center">
                                          <div>
                                            <span className="text-white fw-bold d-block">💊 {m.name}</span>
                                            <span className="text-secondary small" style={{ fontSize: '0.85rem' }}>Dosage: {m.dosage}</span>
                                          </div>
                                          <span className="badge bg-white-5 border border-white-10 text-theme-accent p-1" style={{ fontSize: '0.82rem' }}>{m.frequency}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {record.extracted_data?.recommendations?.length > 0 && (
                                    <>
                                      <h6 className="text-white small mb-2 fw-bold font-monospace">[INGESTOR RECOMMENDATIONS]</h6>
                                      <ul className="text-secondary ps-3 mb-0">
                                        {record.extracted_data.recommendations.map((rec, idx) => <li key={idx} className="mb-1">{rec}</li>)}
                                      </ul>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <h6 className="text-theme-accent small mb-2 fw-bold font-monospace">[EXTRACTED LAB BIOMARKERS]</h6>
                                  <div className="row g-2 mb-3">
                                    {biomarkersArray.map((bio, idx) => (
                                      <div className="col-md-6" key={idx}>
                                        <div className="p-3 rounded border border-white-5 bg-white-10 h-100">
                                          <span className="text-secondary small d-block text-capitalize" style={{ fontSize: '0.85rem' }}>{bio.name}</span>
                                          <div className="d-flex justify-content-between align-items-baseline mt-1">
                                            <span className="text-white fw-bold">{bio.value} {bio.unit || ''}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {pathAnalysis.summary && (
                                    <div className="p-3 bg-white-10 rounded border border-white-5">
                                      <h6 className="text-white small mb-1 fw-bold font-monospace">[PATHOLOGY INTERPRETATION]</h6>
                                      <p className="text-secondary mb-0" style={{ lineHeight: 1.6 }}>{pathAnalysis.summary}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Profile;
