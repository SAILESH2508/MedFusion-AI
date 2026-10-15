import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Cpu, Activity, Shield, Zap, Info, Heart, Wind, Droplet, Brain as BrainIcon, FlaskConical, RotateCcw, AlertTriangle, Globe, Box } from 'lucide-react';
import { api } from '../services/api';
import { SidebarContext } from '../context/SidebarContext';
import OrganInfoPanel from './digital-twin/OrganInfoPanel';
import HealthTimeline from './digital-twin/HealthTimeline';
import HealthChangeExplorer from './digital-twin/HealthChangeExplorer';
import MedicationSafetyPanel from './digital-twin/MedicationSafetyPanel';

const OrganViewer3D = React.lazy(() => import('./digital-twin/OrganViewer3D'));
const BioDigitalViewer = React.lazy(() => import('./digital-twin/BioDigitalViewer'));
import AnatomyDiagram from './digital-twin/AnatomyDiagram';

const ORGAN_BUTTONS = [
  { id: 'heart',   label: 'Heart',   icon: <Heart   size={14} />, color: '#c1121f' },
  { id: 'lungs',   label: 'Lungs',   icon: <Wind    size={14} />, color: '#e07a8a' },
  { id: 'liver',   label: 'Liver',   icon: <FlaskConical size={14} />, color: '#a0522d' },
  { id: 'kidneys', label: 'Kidneys', icon: <Droplet size={14} />, color: '#9b2226' },
  { id: 'brain',   label: 'Brain',   icon: <BrainIcon size={14} />, color: '#b0a4b8' },
];

const TABS = [
  { id: 'timeline', label: 'Timeline', icon: <Activity size={13} /> },
  { id: 'safety',   label: 'Safety',   icon: <Shield  size={13} /> },
  { id: 'explorer', label: 'Explorer', icon: <Zap     size={13} /> },
  { id: 'about',    label: 'About',    icon: <Info    size={13} /> },
];

export default function DigitalTwin({ user }) {
  const { setSidebarContent } = useContext(SidebarContext);

  const [selectedOrgan, setSelectedOrgan] = useState('heart');
  const [patientData, setPatientData] = useState({ profile: null, predictions: [], pathology: [], prescriptions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('timeline');
  const [viewMode, setViewMode] = useState('diagram'); // 'diagram' | '3d'

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/health-twin/');
      const d = response.data;
      setPatientData({ profile: d.profile || null, predictions: d.predictions || [], pathology: d.pathology_reports || [], prescriptions: d.prescriptions || [] });
    } catch {
      try {
        const [emR, prR, paR, rxR] = await Promise.all([
          api.get('/telemetry/emergency/').catch(() => ({ data: {} })),
          api.get('/predictions/').catch(() => ({ data: [] })),
          api.get('/pathology/').catch(() => ({ data: [] })),
          api.get('/prescriptions/').catch(() => ({ data: [] })),
        ]);
        setPatientData({
          profile: emR.data || null,
          predictions: Array.isArray(prR.data) ? prR.data : (prR.data?.results || []),
          pathology:   Array.isArray(paR.data) ? paR.data : (paR.data?.results || []),
          prescriptions: Array.isArray(rxR.data) ? rxR.data : (rxR.data?.results || []),
        });
      } catch (e) {
        setError(e.response?.data?.error || e.message || 'Failed to load health data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sidebar injection
  useEffect(() => {
    const name = patientData.profile?.full_name || patientData.profile?.name || user?.full_name || 'Patient';
    const blood = patientData.profile?.blood_group || patientData.profile?.blood_type || null;
    const predCount = patientData.predictions.length;
    const pathCount = patientData.pathology.length;
    const rxCount   = patientData.prescriptions.length;

    setSidebarContent(
      <div>
        {/* Patient pill */}
        <div style={{ marginBottom: '18px' }}>
          <p style={{ fontSize: '0.57rem', fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px' }}>
            Personal Health Twin
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>{name}</p>
            {blood && (
              <span style={{ background: 'rgba(185, 28, 28, 0.15)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '1px 7px', borderRadius: '20px', fontSize: '0.65rem', fontFamily: 'monospace' }}>
                {blood}
              </span>
            )}
          </div>
        </div>

        {/* Record counts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '20px' }}>
          {[
            { label: 'Assessments', val: predCount, color: 'var(--accent-orange)' },
            { label: 'Pathology',   val: pathCount, color: 'var(--primary-accent)' },
            { label: 'Scripts',     val: rxCount,   color: 'var(--text-secondary)' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 6px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 700, color, margin: 0 }}>{val}</p>
              <p style={{ fontSize: '0.52rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Organ selector */}
        <p style={{ fontSize: '0.57rem', fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
          Select Organ
        </p>
        {ORGAN_BUTTONS.map((organ) => {
          const isActive = selectedOrgan === organ.id;
          return (
            <button
              key={organ.id}
              onClick={() => setSelectedOrgan(organ.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                background: isActive ? 'var(--bg-upload)' : 'transparent',
                border: isActive ? '1px solid var(--primary-accent)' : '1px solid transparent',
                borderRadius: '8px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '7px 10px',
                marginBottom: '3px',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontFamily: 'monospace',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ color: isActive ? organ.color : 'rgba(255,255,255,0.3)', lineHeight: 0 }}>{organ.icon}</span>
              <span>{organ.label}</span>
              {isActive && (
                <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: organ.color, flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
    );
    return () => setSidebarContent(null);
  }, [setSidebarContent, selectedOrgan, patientData, user]);

  if (loading) {
    return (
      <div className="reveal px-1 theme-general d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading Health Twin…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reveal px-1 theme-general d-flex align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <p style={{ color: 'var(--accent-red)', fontSize: '0.9rem', marginBottom: '16px' }}>{error}</p>
          <button onClick={fetchData} className="btn-clinical primary" style={{ padding: '6px 20px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.82rem' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reveal theme-general" style={{ padding: '0 4px' }}>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Activity size={20} style={{ color: 'var(--accent-teal, #38bdf8)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
            PERSONAL HEALTH TWIN
          </h2>
          <span style={{ background: 'var(--theme-accent-glow, rgba(56,189,248,0.1))', border: '1px solid var(--theme-accent, rgba(56,189,248,0.25))', color: 'var(--theme-accent, #38bdf8)', fontSize: '0.58rem', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            Interactive
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, fontFamily: 'monospace' }}>
          Click an organ to explore your recorded health data · Hover to highlight · Select to deep-dive
        </p>
      </div>

      <div className="row g-4">

        {/* ── Left: 3D viewer + organ info ───────────────────────────── */}
        <div className="col-lg-7">

          {/* Viewer card */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Unified Top Toolbar: View Mode Selector + Active Organ + Reset */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '12px',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              pointerEvents: 'none',
            }}>
              {/* View mode toggle */}
              <div style={{
                display: 'flex',
                gap: '4px',
                background: 'var(--bg-form)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '3px',
                pointerEvents: 'auto',
              }}>
                {[
                  { id: 'diagram',    label: 'Anatomy',    icon: <Activity size={12} /> },
                  { id: '3d',         label: '3D WebGL',   icon: <Box size={12} /> },
                  { id: 'biodigital', label: 'BioDigital', icon: <Globe size={12} /> },
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: viewMode === mode.id ? 'var(--bg-upload)' : 'transparent',
                      border: viewMode === mode.id ? '1px solid var(--primary-accent)' : '1px solid transparent',
                      borderRadius: '6px',
                      color: viewMode === mode.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontSize: '0.68rem',
                      fontFamily: 'monospace',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontWeight: viewMode === mode.id ? 700 : 500,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>{mode.icon}</span>
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Right side: Organ Badge & Reset */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
                {selectedOrgan && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                  }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: ORGAN_BUTTONS.find(o => o.id === selectedOrgan)?.color || 'var(--primary-accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--text-primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {ORGAN_BUTTONS.find(o => o.id === selectedOrgan)?.label}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => setSelectedOrgan(null)}
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.65rem',
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--primary-accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  <RotateCcw size={11} /> Reset
                </button>
              </div>
            </div>

            {/* Viewers */}
            <div style={{ height:'460px', position:'relative' }}>
              {/* SVG anatomy diagram */}
              <div style={{ position:'absolute', inset:0, opacity: viewMode==='diagram' ? 1 : 0, transition:'opacity 0.3s', pointerEvents: viewMode==='diagram' ? 'auto' : 'none' }}>
                <AnatomyDiagram selectedOrgan={selectedOrgan} onOrganSelect={setSelectedOrgan} patientData={patientData}/>
              </div>

              {/* Three.js 3D viewer — lazy loaded */}
              <div style={{ position:'absolute', inset:0, opacity: viewMode==='3d' ? 1 : 0, transition:'opacity 0.3s', pointerEvents: viewMode==='3d' ? 'auto' : 'none' }}>
                <React.Suspense fallback={
                  <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px' }}>
                    <div style={{ width:'36px', height:'36px', border:'2px solid var(--border-color)', borderTopColor:'var(--primary-accent)', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
                    <p style={{ fontFamily:'monospace', color:'var(--text-secondary)', fontSize:'0.72rem', margin:0, textTransform:'uppercase', letterSpacing:'0.08em' }}>Loading 3D viewer…</p>
                  </div>
                }>
                  {viewMode === '3d' && (
                    <OrganViewer3D selectedOrgan={selectedOrgan} onOrganSelect={setSelectedOrgan} patientData={patientData}/>
                  )}
                </React.Suspense>
              </div>

              {/* BioDigital interactive cloud viewer — lazy loaded */}
              <div style={{ position:'absolute', inset:0, opacity: viewMode==='biodigital' ? 1 : 0, transition:'opacity 0.3s', pointerEvents: viewMode==='biodigital' ? 'auto' : 'none' }}>
                <React.Suspense fallback={
                  <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px', background: 'var(--bg-upload)' }}>
                    <div style={{ width:'36px', height:'36px', border:'2px solid var(--border-color)', borderTopColor:'var(--primary-accent)', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
                    <p style={{ fontFamily:'monospace', color:'var(--text-secondary)', fontSize:'0.72rem', margin:0, textTransform:'uppercase', letterSpacing:'0.08em' }}>Loading BioDigital Cloud…</p>
                  </div>
                }>
                  {viewMode === 'biodigital' && (
                    <BioDigitalViewer selectedOrgan={selectedOrgan} onOrganSelect={setSelectedOrgan} />
                  )}
                </React.Suspense>
              </div>
            </div>
          </div>

          {/* Organ info below viewer */}
          <div style={{ marginTop: '16px' }}>
            <OrganInfoPanel selectedOrgan={selectedOrgan} patientData={patientData} />
          </div>
        </div>

        {/* ── Right: tabs ────────────────────────────────────────────── */}
        <div className="col-lg-5">
          <div className="card-secondary" style={{
            borderRadius: '16px',
            padding: '16px',
            height: '100%',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    background: activeTab === tab.id ? 'var(--theme-accent-glow, rgba(13, 148, 136, 0.15))' : 'transparent',
                    border: activeTab === tab.id ? '1px solid var(--theme-accent, #0d9488)' : '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                    borderRadius: '20px',
                    color: activeTab === tab.id ? 'var(--theme-accent, #0d9488)' : 'var(--text-secondary, #64748b)',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    fontFamily: 'monospace',
                    transition: 'all 0.15s ease',
                    letterSpacing: '0.04em',
                    fontWeight: activeTab === tab.id ? 700 : 500,
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
              {activeTab === 'timeline'  && <HealthTimeline patientData={patientData} loading={false} />}
              {activeTab === 'safety'    && <MedicationSafetyPanel patientData={patientData} />}
              {activeTab === 'explorer'  && <HealthChangeExplorer patientData={patientData} />}
              {activeTab === 'about'     && <AboutTab />}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function AboutTab() {
  return (
    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.65' }}>
      <h6 style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: '0.88rem', marginBottom: '12px', textTransform: 'uppercase' }}>
        About Personal Health Twin
      </h6>

      {[
        { label: '3D Models & Licensed Datasets', text: 'Supports high-fidelity 3D GLTF/GLB models from licensed medical datasets (Zygote CAD solid anatomy, NIH 3D Print Exchange, BodyParts3D) with Draco geometry compression, alongside interactive cloud streaming via the BioDigital Human platform and real-time procedural WebGL fallbacks.' },
        { label: 'Health Timeline', text: 'Displays your existing pathology reports, disease risk assessments, and prescriptions sorted newest first. No data is fabricated or estimated.' },
        { label: 'Medication Safety', text: 'Runs against the same drug safety engine used in the Doctor Dashboard. Results are for awareness only — always consult your prescribing physician.' },
        { label: 'Health Change Explorer', text: 'An educational comparison tool. Hypothetical values you enter are never saved to your records, and no clinical predictions are made.' },
      ].map(({ label, text }) => (
        <div key={label} style={{ marginBottom: '14px' }}>
          <p style={{ color: 'var(--theme-accent, #0d9488)', fontFamily: 'monospace', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>{label}</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{text}</p>
        </div>
      ))}

      <div style={{ background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.25)', borderRadius: '8px', padding: '10px 12px', marginTop: '12px', fontSize: '0.74rem', color: 'var(--accent-yellow, #b45309)', lineHeight: '1.5', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>This feature is for personal health awareness only. It does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions.</span>
      </div>
    </div>
  );
}

