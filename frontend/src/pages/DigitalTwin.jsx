import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Cpu, Activity, Shield, Zap, Brain } from 'lucide-react';
import { api } from '../services/api';
import { SidebarContext } from '../context/SidebarContext';
import OrganInfoPanel from './digital-twin/OrganInfoPanel';
import HealthTimeline from './digital-twin/HealthTimeline';
import HealthChangeExplorer from './digital-twin/HealthChangeExplorer';
import MedicationSafetyPanel from './digital-twin/MedicationSafetyPanel';

// Lazy-load the 3D canvas to avoid blocking initial page render
const OrganViewer3D = React.lazy(() => import('./digital-twin/OrganViewer3D'));

const ORGAN_BUTTONS = [
  { id: 'heart', label: 'Heart', icon: '❤️' },
  { id: 'lungs', label: 'Lungs', icon: '🫁' },
  { id: 'liver', label: 'Liver', icon: '🟤' },
  { id: 'kidneys', label: 'Kidneys', icon: '🫘' },
  { id: 'brain', label: 'Brain', icon: '🧠' },
];

const TABS = [
  { id: 'timeline', label: 'Timeline', icon: <Activity size={13} /> },
  { id: 'safety', label: 'Safety', icon: <Shield size={13} /> },
  { id: 'explorer', label: 'Explorer', icon: <Zap size={13} /> },
  { id: 'about', label: 'About', icon: <Brain size={13} /> },
];

function LoadingSpinner({ message = 'Loading…' }) {
  return (
    <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '300px' }}>
      <div>
        <div className="d-flex justify-content-center mb-3">
          <div className="spinner-border text-info" role="status" style={{ width: '2rem', height: '2rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
        <p className="text-secondary text-center m-0" style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{message}</p>
      </div>
    </div>
  );
}

export default function DigitalTwin({ user }) {
  const { setSidebarContent } = useContext(SidebarContext);

  const [selectedOrgan, setSelectedOrgan] = useState('heart');
  const [patientData, setPatientData] = useState({
    profile: null,
    predictions: [],
    pathology: [],
    prescriptions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('timeline');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Try dedicated health-twin endpoint first
      const response = await api.get('/health-twin/');
      const data = response.data;
      setPatientData({
        profile: data.profile || null,
        predictions: data.predictions || [],
        pathology: data.pathology_reports || [],
        prescriptions: data.prescriptions || [],
      });
    } catch {
      // Fallback: parallel calls to existing endpoints
      try {
        const [emergencyRes, predictionsRes, pathologyRes, prescriptionsRes] = await Promise.all([
          api.get('/telemetry/emergency/').catch(() => ({ data: {} })),
          api.get('/predictions/').catch(() => ({ data: [] })),
          api.get('/pathology/').catch(() => ({ data: [] })),
          api.get('/prescriptions/').catch(() => ({ data: [] })),
        ]);

        setPatientData({
          profile: emergencyRes.data || null,
          predictions: Array.isArray(predictionsRes.data) ? predictionsRes.data : (predictionsRes.data?.results || []),
          pathology: Array.isArray(pathologyRes.data) ? pathologyRes.data : (pathologyRes.data?.results || []),
          prescriptions: Array.isArray(prescriptionsRes.data) ? prescriptionsRes.data : (prescriptionsRes.data?.results || []),
        });
      } catch (fallbackErr) {
        setError(fallbackErr.response?.data?.error || fallbackErr.message || 'Failed to load health data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Inject sidebar content
  useEffect(() => {
    const profileName = patientData.profile?.full_name || patientData.profile?.name || user?.full_name || 'Patient';
    const bloodGroup = patientData.profile?.blood_group || patientData.profile?.blood_type || null;

    setSidebarContent(
      <div style={{ padding: '0 4px' }}>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>
            Personal Health Twin
          </p>
          <p style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, margin: 0 }}>
            {profileName}
          </p>
          {bloodGroup && (
            <span style={{
              display: 'inline-block',
              marginTop: '4px',
              background: 'rgba(230,57,70,0.2)',
              border: '1px solid rgba(230,57,70,0.4)',
              color: '#e63946',
              padding: '1px 8px',
              borderRadius: '20px',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
            }}>
              {bloodGroup}
            </span>
          )}
        </div>

        <p style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
          Select Organ
        </p>
        {ORGAN_BUTTONS.map((organ) => (
          <button
            key={organ.id}
            onClick={() => setSelectedOrgan(organ.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              background: selectedOrgan === organ.id ? 'rgba(0,245,212,0.12)' : 'transparent',
              border: selectedOrgan === organ.id ? '1px solid rgba(0,245,212,0.35)' : '1px solid transparent',
              borderRadius: '8px',
              color: selectedOrgan === organ.id ? '#00f5d4' : 'rgba(255,255,255,0.6)',
              padding: '6px 10px',
              marginBottom: '4px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontFamily: 'monospace',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <span>{organ.icon}</span>
            <span>{organ.label}</span>
          </button>
        ))}
      </div>
    );

    return () => setSidebarContent(null);
  }, [setSidebarContent, selectedOrgan, patientData, user]);

  if (loading) {
    return (
      <div className="reveal px-1 theme-general">
        <LoadingSpinner message="Loading health twin data…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="reveal px-1 theme-general">
        <div className="text-center py-5">
          <p className="text-danger mb-3" style={{ fontSize: '0.9rem' }}>{error}</p>
          <button
            onClick={fetchData}
            style={{
              background: 'rgba(0,245,212,0.1)',
              border: '1px solid rgba(0,245,212,0.3)',
              color: '#00f5d4',
              padding: '6px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reveal px-1 theme-general">
      {/* Page header */}
      <div className="mb-4">
        <h2 className="text-white fw-bold d-flex align-items-center gap-2 mb-1" style={{ fontSize: '1.4rem' }}>
          <Cpu size={22} style={{ color: '#00f5d4' }} />
          Personal Health Twin
        </h2>
        <p className="text-secondary m-0" style={{ fontSize: '0.85rem' }}>
          Your medical data in an interactive 3D view.
        </p>
      </div>

      <div className="row g-4">
        {/* Left column — 3D viewer + organ info */}
        <div className="col-lg-7">
          <div className="glass-card p-3" style={{ borderRadius: '12px' }}>
            {/* 3D viewer */}
            <div style={{ height: '480px', position: 'relative', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
              <React.Suspense fallback={
                <div className="d-flex justify-content-center align-items-center h-100">
                  <div>
                    <div className="spinner-border text-info mb-2" role="status" style={{ width: '1.5rem', height: '1.5rem' }}>
                      <span className="visually-hidden">Loading 3D viewer…</span>
                    </div>
                    <p className="text-secondary text-center m-0" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>Loading 3D viewer…</p>
                  </div>
                </div>
              }>
                <OrganViewer3D
                  selectedOrgan={selectedOrgan}
                  onOrganSelect={setSelectedOrgan}
                  patientData={patientData}
                />
              </React.Suspense>
            </div>
          </div>

          {/* Organ info panel */}
          <OrganInfoPanel selectedOrgan={selectedOrgan} patientData={patientData} />
        </div>

        {/* Right column — tabs */}
        <div className="col-lg-5">
          <div className="glass-card p-3" style={{ borderRadius: '12px', minHeight: '520px' }}>
            {/* Tab buttons */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    background: activeTab === tab.id ? 'rgba(0,245,212,0.15)' : 'rgba(255,255,255,0.04)',
                    border: activeTab === tab.id ? '1px solid rgba(0,245,212,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '20px',
                    color: activeTab === tab.id ? '#00f5d4' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontFamily: 'monospace',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ overflowY: 'auto', maxHeight: '540px' }}>
              {activeTab === 'timeline' && (
                <HealthTimeline patientData={patientData} loading={false} />
              )}
              {activeTab === 'safety' && (
                <MedicationSafetyPanel patientData={patientData} />
              )}
              {activeTab === 'explorer' && (
                <HealthChangeExplorer patientData={patientData} />
              )}
              {activeTab === 'about' && (
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  <h6 className="text-white fw-bold mb-2">About Personal Health Twin</h6>
                  <p>
                    The Personal Health Twin is an interactive educational tool that brings together your medical records,
                    pathology results, risk assessments, and medication history in one place.
                  </p>
                  <p>
                    <strong className="text-white">3D Viewer:</strong> The organ models shown are illustrative procedural
                    shapes. They do not represent your actual internal anatomy and are not medically accurate.
                    They are provided to give a familiar visual context for organ-specific health data only.
                  </p>
                  <p>
                    <strong className="text-white">Health Timeline:</strong> Displays your existing pathology reports,
                    disease risk assessments, and prescriptions, sorted newest first. No data is fabricated.
                  </p>
                  <p>
                    <strong className="text-white">Medication Safety:</strong> Runs against the same drug safety engine
                    used in the Doctor Dashboard. Results are for awareness only — always consult your prescribing physician.
                  </p>
                  <p>
                    <strong className="text-white">Health Change Explorer:</strong> An educational comparison tool.
                    Hypothetical values you enter are never saved to your records, and no clinical predictions are made.
                  </p>
                  <div style={{
                    background: 'rgba(255,193,7,0.08)',
                    border: '1px solid rgba(255,193,7,0.2)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginTop: '12px',
                    fontSize: '0.75rem',
                    color: '#ffc107',
                  }}>
                    ⚠️ This feature is for personal health awareness only. It does not constitute medical advice,
                    diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
