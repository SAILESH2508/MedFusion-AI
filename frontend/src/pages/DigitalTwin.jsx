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
  UserCheck, Salad, Sprout, RefreshCw,
  HeartPulse, ShieldCheck, Flame, Trophy
} from 'lucide-react';
import { api } from '../services/api';
import { SidebarContext } from '../context/SidebarContext';
import { useTheme } from '../context/useTheme';

// Subcomponents
import OrganInfoPanel from './digital-twin/OrganInfoPanel';
import IntegratedGardenSection from './digital-twin/IntegratedGardenSection';
import { GARDEN_STAGES, GARDEN_ACTIONS } from './digital-twin/gardenConstants';
import IntegratedDietSection from './digital-twin/IntegratedDietSection';

/* ─── 8 Functional Anatomical Systems (Cephalocaudal & Vital Priority) ─── */
const ORGANS = [
  { id: 'brain',      label: 'Brain',      icon: BrainIcon,    color: '#A78BFA' },
  { id: 'heart',      label: 'Heart',      icon: Heart,        color: '#EF4444' },
  { id: 'lungs',      label: 'Lungs',      icon: Wind,         color: '#38BDF8' },
  { id: 'kidneys',    label: 'Kidneys',    icon: Droplet,      color: '#FB7185' },
  { id: 'liver',      label: 'Liver',      icon: FlaskConical, color: '#F97316' },
  { id: 'pancreas',   label: 'Pancreas',   icon: Activity,     color: '#EC4899' },
  { id: 'stomach',    label: 'Stomach',    icon: FlaskConical, color: '#FBBF24' },
  { id: 'intestines', label: 'Intestines', icon: Wind,         color: '#10B981' },
];

/* ─── Twin Primary Sections (Habits & Garden First, Clinical-to-Lifestyle Progression) ─── */
const TWIN_TABS = [
  { id: 'garden',   label: 'Wellness Habits & Garden',   shortLabel: 'Habits & Garden',  icon: <Sprout size={17} />,    theme: 'twin-tab-garden' },
  { id: 'organs',   label: 'Clinical Anatomy & Organs',  shortLabel: 'Organs & Systems', icon: <HeartPulse size={17} />, theme: 'twin-tab-organs' },
  { id: 'diet',     label: 'Metabolic Nutrition & Diet', shortLabel: 'Nutrition & Diet', icon: <Salad size={17} />,     theme: 'twin-tab-diet' },
];

/* ─── Dynamic Header Banner Configurations per Section Tab ─── */
const TAB_HEADER_CONFIG = {
  garden: {
    icon: Sprout,
    iconColorLight: '#D97706',
    iconColorDark: '#FBBF24',
    iconBgLight: 'rgba(245, 158, 11, 0.12)',
    iconBgDark: 'rgba(245, 158, 11, 0.22)',
    iconBorderLight: 'rgba(245, 158, 11, 0.35)',
    iconBorderDark: 'rgba(245, 158, 11, 0.45)',
    subColorLight: '#D97706',
    subColorDark: '#FBBF24',
    subTitle: (stageIndex) => `Preventative Lifestyle & Adherence Telemetry — Stage ${stageIndex + 1} of 7`,
    titlePrefix: 'Wellness ',
    titleGradientClass: 'text-gradient-diabetes',
    titleGradientText: 'Habits & Garden',
    description: 'Daily clinical habit adherence, wellness milestones, habit streaks, and restorative health garden progression.',
    bgDark: 'linear-gradient(135deg, #080808 0%, #170d05 35%, #130a05 65%, #080808 100%)',
    borderLight: 'rgba(245, 158, 11, 0.25)',
    borderDark: 'rgba(245, 158, 11, 0.35)',
    shadowColor: 'rgba(245, 158, 11, 0.12)',
    ambientBlob1: 'rgba(245, 158, 11, 0.16)',
    ambientBlob2: 'rgba(16, 185, 129, 0.12)',
  },
  organs: {
    icon: HeartPulse,
    iconColorLight: '#0284C7',
    iconColorDark: '#38BDF8',
    iconBgLight: 'rgba(56, 189, 248, 0.12)',
    iconBgDark: 'rgba(56, 189, 248, 0.22)',
    iconBorderLight: 'rgba(56, 189, 248, 0.35)',
    iconBorderDark: 'rgba(56, 189, 248, 0.45)',
    subColorLight: '#0284C7',
    subColorDark: '#38BDF8',
    subTitle: () => 'Multi-Organ Physiological Engine — 8 Synchronized Systems',
    titlePrefix: 'Clinical ',
    titleGradientClass: 'text-gradient-heart',
    titleGradientText: 'Anatomy & Organs',
    description: 'Deep EHR-synchronized organ metrics, discrete laboratory observations, holdout-validated AI risk models, and clinical checklists.',
    bgDark: 'linear-gradient(135deg, #080808 0%, #061524 35%, #081a2e 65%, #080808 100%)',
    borderLight: 'rgba(56, 189, 248, 0.25)',
    borderDark: 'rgba(56, 189, 248, 0.35)',
    shadowColor: 'rgba(56, 189, 248, 0.12)',
    ambientBlob1: 'rgba(56, 189, 248, 0.16)',
    ambientBlob2: 'rgba(168, 85, 247, 0.12)',
  },
  diet: {
    icon: Salad,
    iconColorLight: '#059669',
    iconColorDark: '#34D399',
    iconBgLight: 'rgba(16, 185, 129, 0.12)',
    iconBgDark: 'rgba(16, 185, 129, 0.22)',
    iconBorderLight: 'rgba(16, 185, 129, 0.35)',
    iconBorderDark: 'rgba(16, 185, 129, 0.45)',
    subColorLight: '#059669',
    subColorDark: '#34D399',
    subTitle: () => 'Metabolic Nutrition & Precision Clinical Meal Planner',
    titlePrefix: 'Metabolic ',
    titleGradientClass: 'text-gradient-lab',
    titleGradientText: 'Nutrition & Diet',
    description: 'Personalized clinical nutrition engine, glycemic index optimization, dietary restrictions, and regional macro balance.',
    bgDark: 'linear-gradient(135deg, #080808 0%, #061a12 35%, #071f16 65%, #080808 100%)',
    borderLight: 'rgba(16, 185, 129, 0.25)',
    borderDark: 'rgba(16, 185, 129, 0.35)',
    shadowColor: 'rgba(16, 185, 129, 0.12)',
    ambientBlob1: 'rgba(16, 185, 129, 0.16)',
    ambientBlob2: 'rgba(56, 189, 248, 0.12)',
  },
};

export default function DigitalTwin({ user, openAuth }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setSidebarContent } = useContext(SidebarContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab state: 'garden' | 'overview' | 'organs' | 'diet'
  const initialTab = searchParams.get('tab') || 'garden';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Organ selection state
  const [selectedOrgan, setSelectedOrgan] = useState('brain');

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
    if (tabParam && ['organs', 'diet', 'garden'].includes(tabParam)) {
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
        <div className="glass-card p-3" style={{ borderRadius: '14px', border: '1px solid rgba(14, 165, 233, 0.35)', background: 'rgba(14, 165, 233, 0.08)' }}>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(14, 165, 233, 0.22)', border: '1px solid #0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HeartPulse size={13} style={{ color: '#38BDF8' }} />
              </div>
              <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                Physiological Engine
              </span>
            </div>
            <span style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(14, 165, 233, 0.35)',
              color: '#38BDF8',
              padding: '1px 7px',
              borderRadius: '12px',
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700
            }}>
              8 SYSTEMS
            </span>
          </div>
          <h2 className="fw-bolder fs-6 m-0" style={{ letterSpacing: '-0.02em', fontSize: '1.05rem', color: 'var(--text-on-dark, #E2E8F0)' }}>
            Digital <span style={{ color: '#38BDF8' }}>Twin</span>
          </h2>
          <div className="d-flex align-items-center justify-content-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.15)', fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
            <span>Active View</span>
            <span style={{ color: '#38BDF8', fontWeight: 600, textTransform: 'none' }}>
              {TWIN_TABS.find(t => t.id === activeTab)?.shortLabel || 'Habits & Garden'}
            </span>
          </div>
        </div>

        {/* Primary Twin Sections (Clickable Navigation) */}
        <div>
          <div className="d-flex align-items-center justify-content-between mb-2 px-1">
            <span className="font-monospace text-uppercase fw-bold" style={{ fontSize: '0.67rem', letterSpacing: '0.09em', color: '#94A3B8' }}>
              Navigation
            </span>
            <span className="font-monospace" style={{ fontSize: '0.64rem', color: '#64748B' }}>
              4 Sections
            </span>
          </div>
          <div className="d-flex flex-column gap-2">
            {TWIN_TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`disease-select-tile cursor-pointer ${tab.theme} ${isSelected ? 'active' : 'inactive'}`}
                  style={{
                    padding: '10px 14px',
                    background: isSelected ? undefined : 'rgba(15, 23, 42, 0.45)',
                    boxShadow: 'none',
                  }}
                >
                  <div className="d-flex align-items-center justify-content-start gap-2.5 font-monospace fw-bold text-uppercase" style={{ fontSize: '0.78rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    <div className="disease-icon-box" style={{ width: '26px', height: '26px', borderRadius: '6px', flexShrink: 0 }}>
                      {tab.icon}
                    </div>
                    <span style={{ color: isSelected ? 'var(--text-on-dark, #E2E8F0)' : '#94A3B8', fontSize: '0.8rem' }}>
                      {tab.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Active Tab Contextual Sub-Tools in Sidebar (Streamlined & Minimal) ── */}
        {activeTab === 'organs' && (
          <div className="d-flex flex-column gap-3">
            <div className="p-3 rounded font-monospace" style={{ border: '1px solid rgba(14, 165, 233, 0.28)', borderLeft: '4px solid #0EA5E9', background: 'rgba(15, 23, 42, 0.55)' }}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span style={{ fontSize: '0.66rem', color: '#38BDF8', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Selection
                </span>
                <span className="badge" style={{ background: 'rgba(14, 165, 233, 0.2)', color: '#38BDF8', border: '1px solid rgba(14, 165, 233, 0.4)', fontSize: '0.64rem' }}>
                  {selectedOrgan.toUpperCase()}
                </span>
              </div>
              <div className="d-flex justify-content-between" style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                <span>Optimal Systems:</span>
                <strong style={{ color: '#34D399' }}>{patientData.system_metrics?.optimal_count ?? 8}/8</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diet' && (
          <div className="p-3 rounded font-monospace" style={{ border: '1px solid rgba(16, 185, 129, 0.28)', borderLeft: '4px solid #10B981', background: 'rgba(15, 23, 42, 0.55)' }}>
            <span className="d-block fw-bold text-uppercase mb-2" style={{ fontSize: '0.66rem', color: '#34D399', letterSpacing: '0.07em' }}>
              Metabolic Synergy
            </span>
            <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
              <span>Growth Bonus:</span>
              <strong style={{ color: '#34D399' }}>+5 pts / meal</strong>
            </div>
          </div>
        )}

        {activeTab === 'garden' && (() => {
          const stageIdx = gardenData.stage?.stage ?? 0;
          const stageMeta = GARDEN_STAGES[stageIdx] || GARDEN_STAGES[0];
          return (
            <div className="p-3 rounded font-monospace" style={{ border: '1px solid rgba(245, 158, 11, 0.28)', borderLeft: '4px solid #F59E0B', background: 'rgba(15, 23, 42, 0.55)' }}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-bold text-uppercase" style={{ fontSize: '0.66rem', color: '#FBBF24', letterSpacing: '0.07em' }}>
                  Habit Streak
                </span>
                <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.4)', fontSize: '0.64rem' }}>
                  Stage {stageIdx + 1}/7
                </span>
              </div>
              <div className="d-flex justify-content-between" style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                <span>{stageMeta.name}</span>
                <strong style={{ color: '#FBBF24' }}>{gardenData.current_streak} days active</strong>
              </div>
            </div>
          );
        })()}


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
      {/* ── 1. DYNAMIC CATEGORY-THEMED DIGITAL TWIN HEADER BANNER ════════════════ */}
      <div
        className="position-relative overflow-hidden"
        style={{
          borderRadius: '20px',
          padding: '28px 32px',
          background: isDark
            ? currentTabConfig.bgDark
            : '#FFFFFF',
          border: `1px solid ${isDark ? currentTabConfig.borderDark : currentTabConfig.borderLight}`,
          boxShadow: isDark
            ? `0 0 48px ${currentTabConfig.shadowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`
            : `0 4px 20px ${currentTabConfig.shadowColor}, 0 1px 4px rgba(0, 0, 0, 0.04)`,
          marginBottom: '0',
          transition: 'all 0.35s ease',
        }}
      >
        {/* Ambient glow blobs */}
        <div style={{ position: 'absolute', top: '-30px', right: '100px', width: '200px', height: '200px', borderRadius: '50%', background: `radial-gradient(circle, ${currentTabConfig.ambientBlob1} 0%, transparent 70%)`, pointerEvents: 'none', transition: 'all 0.35s ease' }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '80px', width: '150px', height: '150px', borderRadius: '50%', background: `radial-gradient(circle, ${currentTabConfig.ambientBlob2} 0%, transparent 70%)`, pointerEvents: 'none', transition: 'all 0.35s ease' }} />

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ position: 'relative', zIndex: 1 }}>
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: isDark ? currentTabConfig.iconBgDark : currentTabConfig.iconBgLight,
                border: `1px solid ${isDark ? currentTabConfig.iconBorderDark : currentTabConfig.iconBorderLight}`,
                transition: 'all 0.3s ease',
              }}>
                <TabHeaderIcon size={15} style={{ color: isDark ? currentTabConfig.iconColorDark : currentTabConfig.iconColorLight, transition: 'color 0.3s ease' }} />
              </div>
              <span
                className="font-monospace text-uppercase"
                style={{
                  fontSize: '0.68rem',
                  letterSpacing: '0.14em',
                  color: isDark ? currentTabConfig.subColorDark : currentTabConfig.subColorLight,
                  fontWeight: 700,
                  transition: 'color 0.3s ease',
                }}
              >
                {currentTabConfig.subTitle(gardenData.stage?.stage ?? 0)}
              </span>
            </div>
            <h1
              className="fw-bolder m-0 mb-2"
              style={{ fontSize: '2rem', letterSpacing: '-0.03em', color: isDark ? '#FFFFFF' : '#0F172A', lineHeight: 1.1, fontFamily: 'var(--font-main)', transition: 'color 0.3s ease' }}
            >
              {currentTabConfig.titlePrefix}
              <span className={currentTabConfig.titleGradientClass}>
                {currentTabConfig.titleGradientText}
              </span>
            </h1>
            <p className="m-0" style={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.65)' : '#475569', maxWidth: '540px', lineHeight: 1.5, fontWeight: isDark ? 400 : 500, transition: 'color 0.3s ease' }}>
              {currentTabConfig.description}
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
                  className="d-flex align-items-center gap-2 px-3.5 py-2 rounded-2 font-monospace transition-all position-relative"
                  style={{
                    background: isActive ? `${organ.color}15` : 'var(--bg-surface)',
                    border: `1.5px solid ${isActive ? organ.color : 'var(--border)'}`,
                    color: isActive ? organ.color : 'var(--text-secondary)',
                    fontSize: '0.82rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <OrganIcon size={16} style={{ color: organ.color }} />
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



      {/* ══ 3. END OF MAIN CONTENT ═══════════════════════════════════ */}
    </div>
  );
}
