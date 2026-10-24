/**
 * DigitalTwin.jsx — Personal Health Twin: Immersive 3D Anatomy Viewer
 * MedFusion AI Clinical Informatics Pipeline
 *
 * Layout: Full-page 3D canvas as primary content.
 * All secondary modules accessible through a single Health Twin Modules drawer.
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Heart, Wind, FlaskConical, Droplet, Brain as BrainIcon, Activity,
  LayoutGrid, UserCheck, RotateCcw, Cpu, Zap, Map, Maximize2, Minimize2,
} from 'lucide-react';
import { api } from '../services/api';
import { SidebarContext } from '../context/SidebarContext';
import OrganViewer3D from './digital-twin/OrganViewer3D';
import AnatomyDiagram from './digital-twin/AnatomyDiagram';
import BioDigitalViewer from './digital-twin/BioDigitalViewer';
import TwinModulesDrawer from './digital-twin/TwinModulesDrawer';

/* ─── Organ definitions ───────────────────────────────────────────────────── */
const ORGANS = [
  { id: 'heart',      label: 'Heart',      icon: <Heart size={13} />,       color: '#EF4444' },
  { id: 'lungs',      label: 'Lungs',      icon: <Wind size={13} />,        color: '#38BDF8' },
  { id: 'liver',      label: 'Liver',      icon: <FlaskConical size={13} />, color: '#F97316' },
  { id: 'stomach',    label: 'Stomach',    icon: <FlaskConical size={13} />, color: '#FBBF24' },
  { id: 'pancreas',   label: 'Pancreas',   icon: <Activity size={13} />,    color: '#EC4899' },
  { id: 'kidneys',    label: 'Kidneys',    icon: <Droplet size={13} />,     color: '#FB7185' },
  { id: 'intestines', label: 'Intestines', icon: <Wind size={13} />,        color: '#10B981' },
  { id: 'brain',      label: 'Brain',      icon: <BrainIcon size={13} />,   color: '#A78BFA' },
];

/* ─── View modes ──────────────────────────────────────────────────────────── */
const VIEW_MODES = [
  { id: '3d',        label: '3D Twin',   icon: <Cpu size={11} /> },
  { id: '2d',        label: '2D Map',    icon: <Map size={11} /> },
  { id: 'biodigital',label: 'BioDigital',icon: <Zap size={11} /> },
];

export default function DigitalTwin({ user, openAuth }) {
  const { setSidebarContent } = useContext(SidebarContext);

  /* ── State ── */
  const [selectedOrgan, setSelectedOrgan] = useState('heart');
  const [viewerMode, setViewerMode]       = useState('3d');
  const [isIsolated, setIsIsolated]       = useState(false);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [patientData, setPatientData]     = useState({
    profile: null, organs: {}, system_metrics: null,
    predictions: [], pathology: [], prescriptions: [],
  });
  const [organData, setOrganData]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [loadingOrgan, setLoadingOrgan] = useState(false);
  const [error, setError]             = useState('');

  /* ── Data fetching ── */
  const fetchSummary = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setPatientData({
        profile: { full_name: 'Guest Explorer', blood_group: 'O+' },
        organs: {},
        system_metrics: { total_systems: 8, alert_count: 0, attention_count: 0, optimal_count: 8 },
        predictions: [], pathology: [], prescriptions: [],
      });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/health-twin/');
      const d = response.data;
      setPatientData({
        profile:        d.profile || null,
        organs:         d.organs || {},
        system_metrics: d.system_metrics || null,
        predictions:    d.predictions || [],
        pathology:      d.pathology_reports || [],
        prescriptions:  d.prescriptions || [],
      });
    } catch {
      try {
        const [emR, prR, paR, rxR] = await Promise.all([
          api.get('/telemetry/emergency/').catch(() => ({ data: {} })),
          api.get('/predictions/').catch(() => ({ data: [] })),
          api.get('/pathology/').catch(() => ({ data: [] })),
          api.get('/prescriptions/').catch(() => ({ data: [] })),
        ]);
        setPatientData({
          profile:        emR.data || null,
          organs:         {},
          system_metrics: null,
          predictions:    Array.isArray(prR.data) ? prR.data : (prR.data?.results || []),
          pathology:      Array.isArray(paR.data) ? paR.data : (paR.data?.results || []),
          prescriptions:  Array.isArray(rxR.data) ? rxR.data : (rxR.data?.results || []),
        });
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to load health twin data.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchOrganDetails = useCallback(async (organId) => {
    if (!organId || !user) { setOrganData(null); return; }
    setLoadingOrgan(true);
    try {
      const res = await api.get(`/health-twin/organ/${organId}/`);
      setOrganData(res.data);
    } catch {
      setOrganData(null);
    } finally {
      setLoadingOrgan(false);
    }
  }, [user]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { if (selectedOrgan) fetchOrganDetails(selectedOrgan); }, [selectedOrgan, fetchOrganDetails]);

  /* ── Clear sidebar (this page owns its own layout) ── */
  useEffect(() => {
    setSidebarContent(null);
    return () => setSidebarContent(null);
  }, [setSidebarContent]);

  /* ── Loading / Error states ── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#040d1a' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#f97316', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Loading Health Twin…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</p>
          <button onClick={fetchSummary} style={{ padding: '6px 18px', borderRadius: '8px', background: 'rgba(249,115,22,0.15)', border: '1px solid #f97316', color: '#f97316', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const metrics = patientData.system_metrics || { alert_count: 0, optimal_count: 8 };
  const selectedOrganInfo = ORGANS.find(o => o.id === selectedOrgan);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 'calc(100vh - 64px)',  /* subtract navbar height */
      overflow: 'hidden',
      background: '#040d1a',
    }}>

      {/* ══ FULL-SCREEN VIEWER ══════════════════════════════════════════ */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {viewerMode === '3d' && (
          <OrganViewer3D
            selectedOrgan={selectedOrgan}
            onOrganSelect={(organId) => {
              setSelectedOrgan(organId);
              if (!organId) setIsIsolated(false);
            }}
            patientData={patientData}
            organData={organData}
            hideControls={true}
            isIsolated={isIsolated}
            onToggleIsolated={() => setIsIsolated(prev => !prev)}
          />
        )}
        {viewerMode === '2d' && (
          <AnatomyDiagram
            selectedOrgan={selectedOrgan}
            onOrganSelect={setSelectedOrgan}
            patientData={patientData}
          />
        )}
        {viewerMode === 'biodigital' && (
          <BioDigitalViewer
            selectedOrgan={selectedOrgan}
            onOrganSelect={setSelectedOrgan}
            onSwitchTo3D={() => setViewerMode('3d')}
          />
        )}
      </div>

      {/* ══ TOP BAR: title + view mode + auth prompt ═══════════════════ */}
      <div style={{
        position: 'absolute',
        top: '14px',
        left: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        gap: '10px',
        pointerEvents: 'none',
      }}>
        {/* Page title */}
        <div style={{ pointerEvents: 'auto' }}>
          <span style={{
            fontSize: '0.62rem', fontFamily: 'monospace', color: '#f97316',
            letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', lineHeight: 1,
          }}>
            MedFusion AI
          </span>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Health Twin
          </h1>
        </div>

        {/* View mode switcher */}
        <div style={{ display: 'flex', gap: '3px', pointerEvents: 'auto', background: 'rgba(4,13,26,0.82)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '3px' }}>
          {VIEW_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewerMode(mode.id)}
              title={mode.label}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '4px 10px',
                background: viewerMode === mode.id ? 'rgba(56,189,248,0.18)' : 'transparent',
                border: viewerMode === mode.id ? '1px solid rgba(56,189,248,0.4)' : '1px solid transparent',
                borderRadius: '6px',
                color: viewerMode === mode.id ? '#38bdf8' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                fontSize: '0.68rem',
                fontFamily: 'monospace',
                fontWeight: viewerMode === mode.id ? 700 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {mode.icon}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Auth prompt for guests */}
        {!user && openAuth && (
          <button
            onClick={() => openAuth('patient')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px',
              background: 'rgba(249,115,22,0.15)',
              border: '1px solid rgba(249,115,22,0.4)',
              borderRadius: '8px',
              color: '#f97316',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontFamily: 'monospace',
              fontWeight: 600,
              pointerEvents: 'auto',
              transition: 'all 0.15s ease',
            }}
          >
            <UserCheck size={13} />
            <span>Sign In</span>
          </button>
        )}
      </div>

      {/* ══ BOTTOM BAR: organ selector + selected info + Modules button ═ */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        right: '16px',
        zIndex: 20,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '12px',
        pointerEvents: 'none',
      }}>

        {/* Left: Selected organ info pill */}
        <div style={{ pointerEvents: 'auto', flexShrink: 0 }}>
          {selectedOrgan && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 12px',
              background: 'rgba(4,13,26,0.88)',
              border: `1px solid ${selectedOrganInfo?.color || '#f97316'}40`,
              borderRadius: '10px',
              backdropFilter: 'blur(8px)',
            }}>
              <span style={{ color: selectedOrganInfo?.color || '#f97316', display: 'flex', alignItems: 'center' }}>
                {selectedOrganInfo?.icon}
              </span>
              <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {selectedOrganInfo?.label}
              </span>
              {patientData.organs?.[selectedOrgan]?.clinical_status === 'ALERT' && (
                <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.18)', padding: '1px 5px', borderRadius: '4px' }}>
                  ALERT
                </span>
              )}
              {viewerMode === '3d' && (
                <button
                  onClick={() => setIsIsolated(prev => !prev)}
                  style={{
                    background: isIsolated ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.06)',
                    border: isIsolated ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.14)',
                    color: isIsolated ? '#f97316' : 'rgba(255,255,255,0.6)',
                    borderRadius: '5px',
                    padding: '2px 7px',
                    fontSize: '0.62rem',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginLeft: '2px',
                    transition: 'all 0.15s ease',
                  }}
                  title={isIsolated ? 'Show full body anatomy' : 'Isolate organ in 3D'}
                >
                  {isIsolated ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
                  <span>{isIsolated ? 'Full Body' : 'Isolate'}</span>
                </button>
              )}
              <button
                onClick={() => { setSelectedOrgan(null); setIsIsolated(false); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '0 0 0 2px', display: 'flex', alignItems: 'center', lineHeight: 1 }}
                title="Clear selection"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Center: Compact organ selector */}
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'rgba(4,13,26,0.88)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '5px',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'auto',
          flexShrink: 0,
        }}>
          {ORGANS.map(organ => {
            const isActive = selectedOrgan === organ.id;
            const status = patientData.organs?.[organ.id]?.clinical_status;
            return (
              <button
                key={organ.id}
                onClick={() => setSelectedOrgan(organ.id)}
                title={organ.label}
                style={{
                  position: 'relative',
                  width: '32px',
                  height: '32px',
                  borderRadius: '7px',
                  background: isActive ? `${organ.color}20` : 'transparent',
                  border: isActive ? `1.5px solid ${organ.color}` : '1.5px solid transparent',
                  color: isActive ? organ.color : 'rgba(255,255,255,0.35)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? `0 0 10px ${organ.color}30` : 'none',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}}
              >
                {organ.icon}
                {/* Status dot */}
                {status === 'ALERT' && (
                  <span style={{ position: 'absolute', top: '3px', right: '3px', width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 4px #ef4444' }} />
                )}
                {status === 'ATTENTION' && !isActive && (
                  <span style={{ position: 'absolute', top: '3px', right: '3px', width: '5px', height: '5px', borderRadius: '50%', background: '#f97316' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Modules button + system status */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', pointerEvents: 'auto', flexShrink: 0 }}>
          {/* Health Twin Modules button */}
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 16px',
              background: 'rgba(4,13,26,0.92)',
              border: '1px solid rgba(249,115,22,0.35)',
              borderRadius: '10px',
              color: '#f97316',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '0.04em',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.12)'; e.currentTarget.style.borderColor = '#f97316'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(4,13,26,0.92)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.35)'; }}
          >
            <LayoutGrid size={14} />
            <span>Health Twin Modules</span>
          </button>
        </div>
      </div>

      {/* Guest mode overlay hint */}
      {!user && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15,
          background: 'rgba(4,13,26,0.85)',
          border: '1px solid rgba(249,115,22,0.2)',
          borderRadius: '8px',
          padding: '6px 14px',
          fontSize: '0.68rem',
          fontFamily: 'monospace',
          color: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(6px)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          Guest mode — sign in to sync your EHR records
        </div>
      )}

      {/* ══ MODULES DRAWER ══════════════════════════════════════════════ */}
      <TwinModulesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selectedOrgan={selectedOrgan}
        onOrganSelect={setSelectedOrgan}
        patientData={patientData}
        organData={organData}
        loadingOrgan={loadingOrgan}
      />
    </div>
  );
}
