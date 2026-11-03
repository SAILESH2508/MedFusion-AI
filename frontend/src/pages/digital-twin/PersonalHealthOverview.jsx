import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse, Activity, Salad, Sprout, ShieldAlert, CheckCircle2,
  AlertCircle, AlertTriangle, Clock, ArrowRight, UserCheck, Droplet,
  Flame, Award, Calendar, ChevronRight, Wind
} from 'lucide-react';

const ORGAN_META = {
  heart: {
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.25)',
    label: 'Cardiovascular',
    icon: HeartPulse,
  },
  pancreas: {
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.1)',
    border: 'rgba(236, 72, 153, 0.25)',
    label: 'Endocrine',
    icon: Activity,
  },
  kidneys: {
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.25)',
    label: 'Renal',
    icon: Droplet,
  },
  liver: {
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.25)',
    label: 'Hepatic',
    icon: ShieldAlert,
  },
  lungs: {
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.1)',
    border: 'rgba(6, 182, 212, 0.25)',
    label: 'Pulmonary',
    icon: Wind,
  },
};

const BIOMARKER_INDICATORS = [
  {
    name: 'Systolic Blood Pressure',
    value: '118',
    unit: 'mmHg',
    target: '90 - 120 mmHg',
    status: 'OPTIMAL',
    organ: 'heart',
    date: 'Latest Vitals',
    percent: 60,
    normalZone: [25, 65],
  },
  {
    name: 'Fasting Blood Glucose',
    value: '92',
    unit: 'mg/dL',
    target: '70 - 99 mg/dL',
    status: 'OPTIMAL',
    organ: 'pancreas',
    date: 'EHR Lab Panel',
    percent: 45,
    normalZone: [20, 60],
  },
  {
    name: 'Serum Creatinine',
    value: '0.9',
    unit: 'mg/dL',
    target: '0.6 - 1.2 mg/dL',
    status: 'OPTIMAL',
    organ: 'kidneys',
    date: 'EHR Lab Panel',
    percent: 50,
    normalZone: [25, 75],
  },
  {
    name: 'Total Cholesterol',
    value: '185',
    unit: 'mg/dL',
    target: '120 - 200 mg/dL',
    status: 'OPTIMAL',
    organ: 'heart',
    date: 'Lipid Profile',
    percent: 55,
    normalZone: [20, 65],
  },
  {
    name: 'Alanine Aminotransferase (ALT)',
    value: '28',
    unit: 'U/L',
    target: '7 - 56 U/L',
    status: 'OPTIMAL',
    organ: 'liver',
    date: 'Hepatic Function',
    percent: 40,
    normalZone: [15, 70],
  },
  {
    name: 'Blood Oxygen (SpO2)',
    value: '98',
    unit: '%',
    target: '95 - 100 %',
    status: 'OPTIMAL',
    organ: 'lungs',
    date: 'Pulse Oximetry',
    percent: 85,
    normalZone: [65, 100],
  },
];

export default function PersonalHealthOverview({
  patientData = {},
  gardenData = {},
  onSwitchTab,
  onSelectOrgan,
}) {
  const navigate = useNavigate();

  const handleNavigateSection = (targetTab, targetOrgan) => {
    if (onSwitchTab) {
      if (targetOrgan && onSelectOrgan) onSelectOrgan(targetOrgan);
      onSwitchTab(targetTab);
    } else {
      // Default navigation when hosted on Profile page
      navigate(`/digital-twin?tab=${targetTab}${targetOrgan ? `&organ=${targetOrgan}` : ''}`);
    }
  };

  const profile = patientData?.profile || {};
  const metrics = patientData?.system_metrics || {};
  const organs = patientData?.organs || {};

  // Extract key indicators from pathology & predictions
  const observations = patientData?.pathology || [];
  const predictions = patientData?.predictions || [];

  return (
    <div className="d-flex flex-column gap-4">
      {/* ─── Profile & Clinical Summary Hero ─── */}
      <div
        className="glass-card p-4 rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-3"
        style={{
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <div
            className="p-3 rounded-circle d-flex align-items-center justify-content-center"
            style={{
              background: 'rgba(44, 111, 181, 0.12)',
              border: '1.5px solid var(--brand-blue)',
              color: 'var(--brand-blue)',
            }}
          >
            <HeartPulse size={26} />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h2 className="fw-bold m-0" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                {profile.full_name || profile.name || 'Patient Digital Twin'}
              </h2>
              {profile.blood_group && (
                <span
                  className="badge font-monospace"
                  style={{
                    background: 'rgba(192, 57, 43, 0.12)',
                    color: 'var(--accent-red)',
                    border: '1px solid var(--accent-red)',
                    fontSize: '0.68rem',
                  }}
                >
                  Blood Type: {profile.blood_group}
                </span>
              )}
            </div>
            <p className="text-secondary font-monospace m-0" style={{ fontSize: '0.78rem' }}>
              Clinically synthesized digital twin combining discrete EHR labs, metabolic dietary records, and habit telemetry.
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="text-end font-monospace" style={{ fontSize: '0.72rem' }}>
            <span className="text-secondary d-block">Clinical Systems Monitored</span>
            <strong style={{ color: 'var(--text-primary)' }}>8 Functional Anatomical Units</strong>
          </div>
        </div>
      </div>

      {/* ─── Tri-Pillar Integrated Health Status ─── */}
      <div className="row g-3">
        {/* Pillar 1: Clinical Anatomy */}
        <div className="col-12 col-md-4">
          <div
            className="glass-card p-3.5 d-flex flex-column justify-content-between h-100 cursor-pointer transition-all"
            style={{ borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
            onClick={() => handleNavigateSection('organs')}
          >
            <div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="badge text-uppercase" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontSize: '0.68rem', fontWeight: 700 }}>
                  Anatomical Systems
                </span>
                <ChevronRight size={14} className="text-secondary" />
              </div>

              <div className="fw-bold mb-1" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                Clinical Organ Telemetry
              </div>
              <p className="text-secondary mb-3" style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{metrics.optimal_count ?? 8}</strong> optimal systems, <strong style={{ color: '#f59e0b' }}>{metrics.attention_count ?? 0}</strong> attention, <strong style={{ color: '#ef4444' }}>{metrics.alert_count ?? 0}</strong> alerts.
              </p>
            </div>

            <div
              className="pt-2.5 mt-auto d-flex align-items-center justify-content-between"
              style={{
                borderTop: '1px solid var(--border)',
                fontSize: '0.74rem',
              }}
            >
              <span className="d-inline-flex align-items-center gap-1" style={{ color: 'var(--brand-orange)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                <span>Inspect Organs</span>
                <ChevronRight size={13} />
              </span>
              <span className="text-secondary text-truncate ms-2" style={{ whiteSpace: 'nowrap' }}>
                {metrics.total_systems || 8} Active Units
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Nutrition & Diet */}
        <div className="col-12 col-md-4">
          <div
            className="glass-card p-3.5 d-flex flex-column justify-content-between h-100 cursor-pointer transition-all"
            style={{ borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
            onClick={() => handleNavigateSection('diet')}
          >
            <div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="badge text-uppercase" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.68rem', fontWeight: 700 }}>
                  Metabolic Nutrition
                </span>
                <ChevronRight size={14} className="text-secondary" />
              </div>

              <div className="fw-bold mb-1" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                Personalized Diet Regimen
              </div>
              <p className="text-secondary mb-3" style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
                Cultural regional meal planning tailored to clinical diagnoses, allergens, and caloric thresholds.
              </p>
            </div>

            <div
              className="pt-2.5 mt-auto d-flex align-items-center justify-content-between"
              style={{
                borderTop: '1px solid var(--border)',
                fontSize: '0.74rem',
              }}
            >
              <span className="d-inline-flex align-items-center gap-1" style={{ color: '#10b981', fontWeight: 600, whiteSpace: 'nowrap' }}>
                <span>View Meal Plan</span>
                <ChevronRight size={13} />
              </span>
              <span className="text-secondary text-truncate ms-2" style={{ whiteSpace: 'nowrap' }}>
                7-Day Regimen
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Habit Garden */}
        <div className="col-12 col-md-4">
          <div
            className="glass-card p-3.5 d-flex flex-column justify-content-between h-100 cursor-pointer transition-all"
            style={{ borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
            onClick={() => handleNavigateSection('garden')}
          >
            <div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="badge text-uppercase" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.68rem', fontWeight: 700 }}>
                  Habits & Streaks
                </span>
                <ChevronRight size={14} className="text-secondary" />
              </div>

              <div className="fw-bold mb-1" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                Wellness Garden Ecosystem
              </div>
              <p className="text-secondary mb-3" style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{gardenData?.current_streak || 0}-day</strong> active streak · <strong style={{ color: 'var(--text-primary)' }}>{gardenData?.total_points || 0}</strong> points logged.
              </p>
            </div>

            <div
              className="pt-2.5 mt-auto d-flex align-items-center justify-content-between"
              style={{
                borderTop: '1px solid var(--border)',
                fontSize: '0.74rem',
              }}
            >
              <span className="d-inline-flex align-items-center gap-1" style={{ color: '#f59e0b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                <span>Log Action</span>
                <ChevronRight size={13} />
              </span>
              <span
                className="text-secondary text-truncate ms-2"
                style={{ whiteSpace: 'nowrap', maxWidth: '140px' }}
                title={gardenData?.stage?.name || 'Seed'}
              >
                {gardenData?.stage?.name === 'Personal Health Garden' ? 'Stage 7/7 · Garden' : `Stage: ${gardenData?.stage?.name || 'Seed'}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Key Health Indicators Matrix ─── */}
      <div className="glass-card p-4 rounded-3" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-orange)' }} />
              <h3 className="fw-bolder m-0" style={{ fontSize: '1.18rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Discrete Health Indicators & Biomarkers
              </h3>
            </div>
            <p className="text-secondary m-0" style={{ fontSize: '0.82rem' }}>
              Continuous clinical monitoring across laboratory values and resting vitals
            </p>
          </div>
          <button
            onClick={() => handleNavigateSection('organs')}
            className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-3 border-0 transition-all cursor-pointer"
            style={{
              background: 'rgba(44, 111, 181, 0.1)',
              color: 'var(--brand-blue)',
              border: '1px solid rgba(44, 111, 181, 0.25)',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--brand-blue)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(44, 111, 181, 0.1)';
              e.currentTarget.style.color = 'var(--brand-blue)';
            }}
          >
            <span>View All Organ Observations</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '16px',
          }}
        >
          {BIOMARKER_INDICATORS.map((item, idx) => {
            const meta = ORGAN_META[item.organ] || ORGAN_META.heart;
            const OrganIcon = meta.icon;

            return (
              <div
                key={idx}
                className="p-3.5 rounded-3 cursor-pointer position-relative d-flex flex-column justify-content-between transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                }}
                onClick={() => handleNavigateSection('organs', item.organ)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = `${meta.color}60`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                {/* Sleek top accent line matching organ identity */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3.5px',
                    background: meta.color,
                  }}
                />

                <div>
                  {/* Row 1: Organ badge + System Tag on left, Status chip on right */}
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-2.5 pt-1">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-2"
                        style={{
                          width: '30px',
                          height: '30px',
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                        }}
                      >
                        <OrganIcon size={16} />
                      </div>
                      <span
                        className="text-uppercase fw-bold"
                        style={{
                          fontSize: '0.68rem',
                          letterSpacing: '0.06em',
                          color: meta.color,
                        }}
                      >
                        {meta.label} System
                      </span>
                    </div>

                    <div
                      className="d-flex align-items-center gap-1.5 px-2 py-0.5 rounded-pill"
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        color: '#059669',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981' }} />
                      <span>NORMAL</span>
                    </div>
                  </div>

                  {/* Row 2: Biomarker Title (Clean sans-serif typography, no awkward wrapping) */}
                  <h4
                    className="m-0 mb-2 fw-bold"
                    style={{
                      fontSize: '0.96rem',
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.3,
                    }}
                  >
                    {item.name}
                  </h4>

                  {/* Row 3: Big Value & Unit + Visual Range Meter */}
                  <div className="d-flex align-items-baseline gap-1.5 mt-1">
                    <span
                      className="fw-bold font-monospace"
                      style={{
                        fontSize: '1.75rem',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                      }}
                    >
                      {item.value}
                    </span>
                    <span
                      className="text-secondary fw-semibold"
                      style={{ fontSize: '0.82rem' }}
                    >
                      {item.unit}
                    </span>
                  </div>

                  {/* Range Visualizer Track */}
                  <div
                    className="position-relative mt-2.5 mb-2"
                    style={{
                      height: '6px',
                      background: 'var(--border)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                    title={`Clinical Range: ${item.target}`}
                  >
                    {/* Optimal target zone */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${item.normalZone[0]}%`,
                        width: `${item.normalZone[1] - item.normalZone[0]}%`,
                        height: '100%',
                        background: 'rgba(16, 185, 129, 0.4)',
                        borderRadius: '2px',
                      }}
                    />
                    {/* Patient reading indicator pin */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `calc(${item.percent}% - 3px)`,
                        top: 0,
                        width: '6px',
                        height: '100%',
                        background: meta.color,
                        borderRadius: '2px',
                        boxShadow: `0 0 6px ${meta.color}`,
                      }}
                    />
                  </div>
                </div>

                {/* Row 4: Reference Range & Source Tag */}
                <div
                  className="d-flex align-items-center justify-content-between pt-2.5 mt-1"
                  style={{
                    borderTop: '1px solid var(--border)',
                    fontSize: '0.74rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Target: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.target}</strong>
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-pill"
                    style={{
                      background: 'rgba(0, 0, 0, 0.04)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                    }}
                  >
                    {item.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
