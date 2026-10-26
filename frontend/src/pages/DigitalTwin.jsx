/**
 * DigitalTwin.jsx — Unified Personal Digital Twin Experience
 * MedFusion AI Clinical Informatics Pipeline
 *
 * Integrates:
 * 1. Clinical Digital Twin (8 anatomical organ systems, EHR observations, AI risk models)
 * 2. Metabolic Nutrition & Diet Planner (regional meal schedule, calorie balance, shopping list)
 * 3. Health Habits & Wellness Garden (streak tracking, 5 clinical habit actions, stage progression)
 * 4. Personal Health Overview (synthesized biomarkers & vitals summary)
 *
 * Navigation operates through the contextual sidebar console (matching the Profile page workflow).
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Heart, Wind, FlaskConical, Droplet, Brain as BrainIcon, Activity,
  LayoutGrid, UserCheck, Salad, Sprout, BarChart3, RefreshCw,
  HeartPulse, ShieldCheck, Flame, Trophy
} from 'lucide-react';
import { api } from '../services/api';
import { SidebarContext } from '../context/SidebarContext';
import { useTheme } from '../context/useTheme';

// Subcomponents
import OrganInfoPanel from './digital-twin/OrganInfoPanel';
import TwinModulesDrawer from './digital-twin/TwinModulesDrawer';
import IntegratedGardenSection, { GARDEN_STAGES, GARDEN_ACTIONS } from './digital-twin/IntegratedGardenSection';
import IntegratedDietSection from './digital-twin/IntegratedDietSection';
import PersonalHealthOverview from './digital-twin/PersonalHealthOverview';

/* ─── 8 Functional Anatomical Systems ─── */
const ORGANS = [
  { id: 'heart',      label: 'Heart',      icon: Heart,        color: '#EF4444' },
  { id: 'lungs',      label: 'Lungs',      icon: Wind,         color: '#38BDF8' },
  { id: 'liver',      label: 'Liver',      icon: FlaskConical, color: '#F97316' },
  { id: 'stomach',    label: 'Stomach',    icon: FlaskConical, color: '#FBBF24' },
  { id: 'pancreas',   label: 'Pancreas',   icon: Activity,     color: '#EC4899' },
  { id: 'kidneys',    label: 'Kidneys',    icon: Droplet,      color: '#FB7185' },
  { id: 'intestines', label: 'Intestines', icon: Wind,         color: '#10B981' },
  { id: 'brain',      label: 'Brain',      icon: BrainIcon,    color: '#A78BFA' },
];

/* ─── Twin Primary Sections (Sidebar Navigation) ─── */
const TWIN_TABS = [
  { id: 'organs',   label: 'Clinical Anatomy & Organs', icon: <HeartPulse size={18} />, theme: 'theme-general-active' },
  { id: 'diet',     label: 'Metabolic Nutrition & Diet', icon: <Salad size={18} />,     theme: 'theme-diabetes-active' },
  { id: 'garden',   label: 'Wellness Habits & Garden',  icon: <Sprout size={18} />,    theme: 'theme-heart-active' },
  { id: 'overview', label: 'Health Overview',           icon: <BarChart3 size={18} />, theme: 'theme-cancer-active' },
];

export default function DigitalTwin({ user, openAuth }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setSidebarContent } = useContext(SidebarContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab state: 'organs' | 'diet' | 'garden' | 'overview'
  const initialTab = searchParams.get('tab') || 'organs';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Organ selection state
  const [selectedOrgan, setSelectedOrgan] = useState('heart');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Clinical twin data state
  const [patientData, setPatientData] = useState({
    profile: null, organs: {}, system_metrics: null,
    predictions: [], pathology: [], prescriptions: [],
  });
  const [organData, setOrganData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOrgan, setLoadingOrgan] = useState(false);
  const [error, setError] = useState('');

  // Integrated Health Garden state
  const [gardenData, setGardenData] = useState({
    total_points: 0,
    current_streak: 0,
    best_streak: 0,
    today_activities: [],
    today_activity_count: 0,
    stage: { stage: 0, name: 'Seed', icon: 'seed', next_at: 50 },
    achievements_earned: [],
    recovery_message: null,
  });

  // Sync tab with URL search parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'organs', 'diet', 'garden'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  }, [setSearchParams]);

  /* ─── Fetch Clinical Health Twin Summary ─── */
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
        setError(err.response?.data?.error || err.message || 'Failed to load clinical health twin data.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  /* ─── Fetch Detailed Organ Clinical Snapshot ─── */
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

  /* ─── Fetch Health Garden State ─── */
  const fetchGarden = useCallback(async () => {
    if (!user || user.role !== 'Patient') return;
    try {
      const res = await api.get('/garden/status/');
      setGardenData(res.data);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchGarden(); }, [fetchGarden]);
  useEffect(() => { if (selectedOrgan) fetchOrganDetails(selectedOrgan); }, [selectedOrgan, fetchOrganDetails]);

  /* ─── Sidebar Console Builder (Profile Page Process Pattern) ─── */
  useEffect(() => {
    setSidebarContent(
      <div className="d-flex flex-column gap-4 pt-2">
        {/* Console Header Card */}
        <div className="glass-card p-4 mb-2 reveal border-theme-accent border-opacity-15 bg-white-5" style={{ borderRadius: '12px' }}>
          <h2 className="fw-bolder fs-6 m-0" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem', color: 'var(--text-on-dark)' }}>
            Digital Twin <span className="text-theme-accent">Console</span>
          </h2>
          <p className="text-secondary m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
            Unified clinical anatomical systems, metabolic nutrition, and wellness habit engine.
          </p>
        </div>

        {/* Primary Twin Sections (Clickable Navigation) */}
        <div className="mt-1">
          <h4 className="fw-bold mb-3" style={{ fontSize: '1.05rem', letterSpacing: '0.05em', color: 'var(--text-on-dark)' }}>
            <span className="text-theme-accent font-monospace text-uppercase" style={{ letterSpacing: '0.06em' }}>Twin Sections</span>
          </h4>
          <div className="d-flex flex-column gap-2 mt-2">
            {TWIN_TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`disease-select-tile cursor-pointer ${isSelected ? `active ${tab.theme}` : 'inactive'}`}
                  style={{ padding: '12px 16px' }}
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

        {/* ── Active Tab Contextual Sub-Tools in Sidebar ── */}
        {activeTab === 'organs' && (
          <div className="d-flex flex-column gap-3">
            <div className="glass-card p-3" style={{ borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="font-monospace text-uppercase" style={{ fontSize: '0.68rem', color: 'var(--brand-orange)', letterSpacing: '0.05em' }}>
                  Anatomical Status
                </span>
                <span className="badge" style={{ background: 'var(--bg-card-tinted)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: '0.64rem' }}>
                  8 Systems
                </span>
              </div>
              <div className="p-2.5 rounded font-monospace" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.16)', fontSize: '0.74rem' }}>
                <div className="d-flex justify-content-between mb-1.5">
                  <span style={{ color: 'rgba(255, 255, 255, 0.82)' }}>Optimal Systems:</span>
                  <strong style={{ color: '#34d399' }}>{patientData.system_metrics?.optimal_count ?? 8}/8</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span style={{ color: 'rgba(255, 255, 255, 0.82)' }}>Active Selection:</span>
                  <strong style={{ color: 'var(--brand-orange)', textTransform: 'capitalize' }}>{selectedOrgan}</strong>
                </div>
              </div>
            </div>

            <div className="glass-card p-3 text-center" style={{ borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.16)', background: 'rgba(255, 255, 255, 0.08)' }}>
              <span className="font-monospace d-block mb-2" style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.82)' }}>
                Advanced Diagnostics
              </span>
              <button
                onClick={() => setDrawerOpen(true)}
                className="btn-clinical primary w-100 py-2 d-flex align-items-center justify-content-center gap-1.5 font-monospace text-uppercase cursor-pointer"
                style={{ fontSize: '0.74rem', borderRadius: '8px' }}
              >
                <LayoutGrid size={13} />
                <span>Diagnostic Modules</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'diet' && (
          <div className="d-flex flex-column gap-3">
            <div className="glass-card p-3" style={{ borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.16)', background: 'rgba(255, 255, 255, 0.08)' }}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="font-monospace text-uppercase" style={{ fontSize: '0.68rem', color: 'var(--brand-orange)', letterSpacing: '0.05em' }}>
                  Metabolic Nutrition
                </span>
                <span className="badge" style={{ background: 'rgba(13, 148, 136, 0.25)', color: '#2dd4bf', border: '1px solid rgba(45, 212, 191, 0.4)', fontSize: '0.64rem' }}>
                  7-Day Engine
                </span>
              </div>
              <p className="font-monospace mb-2" style={{ fontSize: '0.74rem', lineHeight: '1.4', color: 'rgba(255, 255, 255, 0.85)' }}>
                Personalized meals aligned with verified patient EHR vitals, lab reports, and medication regimens.
              </p>
              <div className="p-2.5 rounded font-monospace" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.16)', fontSize: '0.74rem' }}>
                <div className="d-flex justify-content-between mb-1.5">
                  <span style={{ color: 'rgba(255, 255, 255, 0.82)' }}>Cross-Module Synergy:</span>
                  <strong style={{ color: '#34d399' }}>+5 pts/meal</strong>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.72)' }}>
                  Completed meals automatically grow your wellness habit streak.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'garden' && (() => {
          const stageIdx = gardenData.stage?.stage ?? 0;
          const stageMeta = GARDEN_STAGES[stageIdx] || GARDEN_STAGES[0];
          const StageIcon = stageMeta.icon;
          return (
            <div className="d-flex flex-column gap-3">
              <div className="glass-card p-3" style={{ borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.16)', background: 'rgba(255, 255, 255, 0.08)' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="font-monospace text-uppercase" style={{ fontSize: '0.68rem', color: 'var(--brand-orange)', letterSpacing: '0.05em' }}>
                    Habit Level
                  </span>
                  <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.12)', color: 'rgba(255, 255, 255, 0.9)', border: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '0.64rem' }}>
                    Stage {stageIdx + 1}/7
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="p-2 rounded-2" style={{ background: 'rgba(255, 255, 255, 0.08)', border: `1px solid ${stageMeta.color}`, color: stageMeta.color }}>
                    <StageIcon size={18} />
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize: '0.85rem', color: '#FFFFFF' }}>
                      {stageMeta.name}
                    </div>
                    <div className="font-monospace" style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                      {gardenData.total_points} total points
                    </div>
                  </div>
                </div>
                <div className="d-flex justify-content-between font-monospace" style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                  <span>Streak: <strong className="text-theme-accent">{gardenData.current_streak} days</strong></span>
                  <span>Best: {gardenData.best_streak} days</span>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'overview' && (
          <div className="d-flex flex-column gap-3">
            <div className="glass-card p-3" style={{ borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.16)', background: 'rgba(255, 255, 255, 0.08)' }}>
              <span className="font-monospace text-uppercase d-block mb-2" style={{ fontSize: '0.68rem', color: 'var(--brand-orange)', letterSpacing: '0.05em' }}>
                Digital Twin Pillars
              </span>
              <div className="d-flex flex-column gap-1.5 font-monospace" style={{ fontSize: '0.76rem' }}>
                <div className="p-2.5 rounded d-flex align-items-center justify-content-between" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.16)', color: '#FFFFFF' }}>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>1. Clinical Organs</span>
                  <strong style={{ color: 'var(--brand-orange)' }}>8 Systems</strong>
                </div>
                <div className="p-2.5 rounded d-flex align-items-center justify-content-between" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.16)', color: '#FFFFFF' }}>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>2. Nutrition Regimen</span>
                  <strong style={{ color: '#34d399' }}>7-Day Plan</strong>
                </div>
                <div className="p-2.5 rounded d-flex align-items-center justify-content-between" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.16)', color: '#FFFFFF' }}>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>3. Wellness Habits</span>
                  <strong style={{ color: '#fbbf24' }}>{gardenData.current_streak}d Streak</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );

    return () => setSidebarContent(null);
  }, [activeTab, selectedOrgan, patientData, gardenData, handleTabChange, setSidebarContent]);

  /* ─── Loading State ─── */
  if (loading && !patientData.profile) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center p-5 text-center font-monospace" style={{ minHeight: '60vh' }}>
        <RefreshCw size={28} className="animate-spin text-theme-accent mb-3" />
        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Synthesizing Clinical Digital Twin, Metabolic Diet & Habit Ecosystem...
        </span>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4 font-monospace">
      {/* ══ 1. UNIFIED PATIENT & DIGITAL TWIN HEADER BANNER (Theme-Adaptive) ════════════════ */}
      <div
        className="position-relative overflow-hidden"
        style={{
          borderRadius: '20px',
          padding: '28px 32px',
          background: isDark
            ? 'linear-gradient(135deg, #080808 0%, #0e0814 40%, #140a08 70%, #080808 100%)'
            : '#FFFFFF',
          border: isDark
            ? '1px solid rgba(224, 123, 57, 0.3)'
            : '1px solid rgba(224, 123, 57, 0.25)',
          boxShadow: isDark
            ? '0 0 48px rgba(224,123,57,0.1), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 4px 20px rgba(224, 123, 57, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
          marginBottom: '0',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Ambient glow blobs */}
        <div style={{ position: 'absolute', top: '-30px', right: '100px', width: '200px', height: '200px', borderRadius: '50%', background: `radial-gradient(circle, rgba(167,139,250,${isDark ? '0.12' : '0.08'}) 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '80px', width: '150px', height: '150px', borderRadius: '50%', background: `radial-gradient(circle, rgba(224,123,57,${isDark ? '0.14' : '0.08'}) 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ position: 'relative', zIndex: 1 }}>
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: isDark ? 'rgba(224,123,57,0.2)' : 'rgba(224,123,57,0.12)', border: '1px solid rgba(224,123,57,0.35)' }}>
                <HeartPulse size={14} style={{ color: '#E07B39' }} />
              </div>
              <span className="font-monospace text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.14em', color: isDark ? 'var(--brand-orange)' : '#D9681E', fontWeight: 700 }}>
                Clinical Informatics Console &nbsp;·&nbsp; Patient Twin #{user?.id || 'GUEST'}
              </span>
            </div>
            <h1
              className="fw-bolder m-0 mb-2"
              style={{ fontSize: '2rem', letterSpacing: '-0.03em', color: isDark ? '#FFFFFF' : '#0F172A', lineHeight: 1.1, fontFamily: 'var(--font-main)' }}
            >
              Digital <span style={{ background: 'linear-gradient(90deg, #DC2626, #EA580C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Twin</span>
            </h1>
            <p className="m-0" style={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.65)' : '#475569', maxWidth: '520px', lineHeight: 1.5, fontWeight: isDark ? 400 : 500 }}>
              Unified clinical simulation — organ anatomy, metabolic nutrition, wellness habits & personalized health overview all in one engine.
            </p>
          </div>

          {/* Quick Health Summary Pill Badges */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Health Score Pill */}
            <div
              className="d-flex align-items-center gap-2 px-3 py-1.5 rounded-2 font-monospace"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(224,123,57,0.08)',
                border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(224,123,57,0.25)',
                fontSize: '0.74rem',
              }}
            >
              <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#64748B' }}>Health Score:</span>
              <strong style={{ color: '#EA580C', fontSize: '0.85rem' }}>
                {patientData.profile?.health_score ?? (patientData.system_metrics?.optimal_count ? `${patientData.system_metrics.optimal_count * 12}/100` : '85/100')}
              </strong>
            </div>

            {/* Blood Pressure Pill */}
            <div
              className="d-flex align-items-center gap-1.5 px-3 py-1.5 rounded-2 font-monospace d-none d-sm-flex"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.08)',
                border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(16,185,129,0.25)',
                fontSize: '0.74rem',
              }}
            >
              <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#64748B' }}>BP:</span>
              <strong style={{ color: '#059669' }}>118/78 mmHg</strong>
            </div>

            {/* Habit Streak Pill */}
            <div
              className="d-flex align-items-center gap-1.5 px-3 py-1.5 rounded-2 font-monospace"
              style={{
                background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)',
                border: isDark ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(245,158,11,0.25)',
                fontSize: '0.74rem',
              }}
            >
              <Flame size={13} style={{ color: '#D97706' }} />
              <strong style={{ color: '#D97706' }}>{gardenData.current_streak}d Streak</strong>
            </div>

            {!user && (
              <button
                onClick={() => openAuth && openAuth('patient')}
                className="btn-clinical primary px-3 py-1.5 d-flex align-items-center gap-1 font-monospace text-uppercase"
                style={{ fontSize: '0.72rem', borderRadius: '6px' }}
              >
                <UserCheck size={13} />
                <span>Sign In</span>
              </button>
            )}

            <button
              onClick={() => { fetchSummary(); fetchGarden(); }}
              className="btn-clinical secondary px-3 py-1.5 d-flex align-items-center gap-1.5 font-monospace text-uppercase cursor-pointer"
              style={{ fontSize: '0.72rem', borderRadius: '6px' }}
              title="Sync all twin data"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══ MOBILE-ONLY TAB SELECTOR (d-md-none) ══════════════════════════ */}
      {/* On desktop, the sidebar is the single primary navigation point (Profile page pattern). */}
      <div className="d-flex d-md-none gap-1 p-1 rounded-3 overflow-auto" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {TWIN_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="d-flex align-items-center gap-1.5 px-2.5 py-1.5 rounded-2 font-monospace border-0 flex-shrink-0 cursor-pointer"
              style={{
                background: isActive ? 'var(--bg-card)' : 'transparent',
                color: isActive ? 'var(--brand-orange)' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontWeight: isActive ? 700 : 500,
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══ 2. MAIN SECTION ROUTING ════════════════════════════════════ */}

      {/* ── SECTION 1: CLINICAL ANATOMY & ORGANS ── */}
      {activeTab === 'organs' && (
        <div className="d-flex flex-column gap-3">
          {/* Organ Selector Strip */}
          <div
            className="p-2 rounded-3 d-flex gap-2 overflow-auto"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            {ORGANS.map(organ => {
              const isActive = selectedOrgan === organ.id;
              const status = patientData.organs?.[organ.id]?.clinical_status;
              const OrganIcon = organ.icon;

              return (
                <button
                  key={organ.id}
                  onClick={() => setSelectedOrgan(organ.id)}
                  className="d-flex align-items-center gap-2 px-3 py-2 rounded-2 font-monospace transition-all position-relative"
                  style={{
                    background: isActive ? `${organ.color}15` : 'var(--bg-surface)',
                    border: `1px solid ${isActive ? organ.color : 'var(--border)'}`,
                    color: isActive ? organ.color : 'var(--text-secondary)',
                    fontSize: '0.74rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <OrganIcon size={14} style={{ color: organ.color }} />
                  <span>{organ.label}</span>
                  {status === 'ALERT' && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                  )}
                  {status === 'ATTENTION' && !isActive && (
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f97316' }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Organ Clinical Inspector Panel */}
          <OrganInfoPanel
            selectedOrgan={selectedOrgan}
            organData={organData}
            loading={loadingOrgan}
          />
        </div>
      )}

      {/* ── SECTION 2: METABOLIC NUTRITION & DIET PLANNER ── */}
      {activeTab === 'diet' && (
        <IntegratedDietSection
          user={user}
          onActivityLogged={(updatedGarden) => {
            if (updatedGarden) {
              setGardenData(prev => ({
                ...prev,
                total_points: updatedGarden.total_points,
                current_streak: updatedGarden.current_streak,
                best_streak: updatedGarden.best_streak,
                stage: updatedGarden.stage,
                today_activity_count: updatedGarden.today_activity_count,
              }));
            }
          }}
        />
      )}

      {/* ── SECTION 3: WELLNESS HABITS & GARDEN ── */}
      {activeTab === 'garden' && (
        <IntegratedGardenSection
          gardenData={gardenData}
          onGardenUpdate={setGardenData}
          user={user}
          openAuth={openAuth}
        />
      )}

      {/* ── SECTION 4: PERSONAL HEALTH OVERVIEW ── */}
      {activeTab === 'overview' && (
        <PersonalHealthOverview
          patientData={patientData}
          gardenData={gardenData}
          onSwitchTab={handleTabChange}
          onSelectOrgan={setSelectedOrgan}
        />
      )}

      {/* ══ 3. SECONDARY CLINICAL MODULES DRAWER ═══════════════════════ */}
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
