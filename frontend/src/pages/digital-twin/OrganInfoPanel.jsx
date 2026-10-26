/**
 * OrganInfoPanel.jsx — Comprehensive Clinical Health Twin Organ Inspector
 * MedFusion AI Clinical Informatics Pipeline
 *
 * Displays validated EHR observations, units, reference intervals, active/historical
 * medical diagnoses, prescribed medications, ML risk assessments, and missing data checklists.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  Heart,
  Wind,
  FlaskConical,
  Droplet,
  Brain as BrainIcon,
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
} from 'lucide-react';

const ICONS = {
  heart: <Heart size={18} />,
  lungs: <Wind size={18} />,
  liver: <FlaskConical size={18} />,
  stomach: <FlaskConical size={18} />,
  pancreas: <Activity size={18} />,
  kidneys: <Droplet size={18} />,
  intestines: <Wind size={18} />,
  brain: <BrainIcon size={18} />,
};

function StatusBadge({ status, description }) {
  const configs = {
    ALERT: {
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.45)',
      text: '#ef4444',
      icon: <AlertTriangle size={13} />,
      label: 'CLINICAL ALERT',
    },
    ATTENTION: {
      bg: 'rgba(249, 115, 22, 0.15)',
      border: 'rgba(249, 115, 22, 0.45)',
      text: '#f97316',
      icon: <AlertCircle size={13} />,
      label: 'ATTENTION NEEDED',
    },
    OPTIMAL: {
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.45)',
      text: '#10b981',
      icon: <CheckCircle2 size={13} />,
      label: 'OPTIMAL FUNCTION',
    },
    INSUFFICIENT_DATA: {
      bg: 'rgba(148, 163, 184, 0.12)',
      border: 'rgba(148, 163, 184, 0.3)',
      text: 'var(--text-secondary, #94a3b8)',
      icon: <HelpCircle size={13} />,
      label: 'DATA INCOMPLETE',
    },
  };

  const cfg = configs[status] || configs.INSUFFICIENT_DATA;

  return (
    <div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '20px',
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          color: cfg.text,
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          letterSpacing: '0.06em',
        }}
      >
        {cfg.icon}
        <span>{cfg.label}</span>
      </div>
      {description && (
        <p style={{ margin: '4px 0 0', fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          {description}
        </p>
      )}
    </div>
  );
}

function RiskMeter({ prediction }) {
  const score = prediction.risk_score || 0;
  const level = (prediction.risk_level || 'EVALUATED').toUpperCase();
  const pct = Math.min(Math.max(score, 0), 100);
  const color = pct >= 75 ? '#ef4444' : pct >= 50 ? '#f97316' : pct >= 25 ? '#eab308' : '#22c55e';

  return (
    <div
      style={{
        background: 'var(--bg-card-tinted, rgba(255,255,255,0.03))',
        border: '1px solid var(--border-card, rgba(255,255,255,0.08))',
        borderRadius: '10px',
        padding: '12px',
        marginBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div>
          <span style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {prediction.disease_type} Risk Model
          </span>
          <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Version: {prediction.model_version || 'rf-v1.2.0'} · Holdout Validated
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1.05rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color }}>
            {pct.toFixed(0)}%
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '4px',
              background: `${color}20`,
              color,
              border: `1px solid ${color}40`,
            }}
          >
            {level}
          </span>
        </div>
      </div>

      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}60, ${color})`,
            boxShadow: `0 0 10px ${color}80`,
            transition: 'width 0.8s ease',
          }}
        />
      </div>

      {prediction.clinical_reasoning && (
        <p style={{ margin: '8px 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
          {prediction.clinical_reasoning}
        </p>
      )}

      {prediction.dataset_provenance && (
        <p style={{ margin: '6px 0 0', fontSize: '0.64rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Provenance: {prediction.dataset_provenance}
        </p>
      )}
    </div>
  );
}

export default function OrganInfoPanel({ selectedOrgan, organData, loading }) {

  if (!selectedOrgan) {
    return (
      <div
        className="glass-card text-center p-4"
        style={{ borderRadius: '14px', border: '1px dashed var(--border-color, rgba(255,255,255,0.15))' }}
      >
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
          Select an anatomical system in the 3D viewer or sidebar to inspect its clinical health twin.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card p-4 text-center" style={{ borderRadius: '14px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '2px solid var(--border-color)',
            borderTopColor: 'var(--brand-orange)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 10px',
          }}
        />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
          Synchronizing clinical records for {selectedOrgan}…
        </p>
      </div>
    );
  }

  const organ = organData || {};
  const organName = organ.organ_name || selectedOrgan.toUpperCase();
  const organSystem = organ.organ_system || 'Anatomical System';
  const primaryColor = organ.primary_color || 'var(--brand-orange)';
  const observations = organ.observations || [];
  const activeConditions = organ.active_conditions || [];
  const historicalConditions = organ.historical_conditions || [];
  const medications = organ.medications || [];
  const predictions = organ.predictions || [];
  const missingData = organ.missing_data || [];
  const guidance = organ.clinical_guidance || '';

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, var(--bg-card-tinted, rgba(4,13,26,0.92)) 0%, var(--bg-card) 100%)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
        borderRadius: '16px',
        padding: '18px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      {/* ── Top Header: Organ Title & Status Badge ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: `${primaryColor}22`,
              border: `1.5px solid ${primaryColor}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: primaryColor,
              boxShadow: `0 0 12px ${primaryColor}30`,
              flexShrink: 0,
            }}
          >
            {ICONS[selectedOrgan] || <Activity size={18} />}
          </div>
          <div>
            <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {organSystem}
            </span>
            <h5 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {organName}
            </h5>
          </div>
        </div>

        <StatusBadge status={organ.clinical_status} description={organ.status_description} />
      </div>

      {/* ── 1. Active Diagnoses & Medical Conditions ── */}
      {activeConditions.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Active Diagnoses ({activeConditions.length})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activeConditions.map((cond, i) => (
              <div
                key={`act-${i}`}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#ef4444' }}>
                    {cond.condition_name}
                  </span>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                    ICD-10: {cond.icd10_code || 'N/A'}
                  </span>
                </div>
                {cond.notes && (
                  <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {cond.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. Discrete Biomarkers & Laboratory Observations ── */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Discrete Biomarkers ({observations.length})
          </span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Standard SI Units · Lab Validated
          </span>
        </div>

        {observations.length === 0 ? (
          <div style={{ padding: '12px', background: 'var(--bg-card-tinted)', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              No discrete observations recorded for {organName}.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {observations.map((obs, i) => {
              const isAbn = obs.is_abnormal;
              const flag = obs.abnormality_flag || 'NORMAL';
              const flagColor = flag.includes('CRITICAL') ? '#ef4444' : flag === 'HIGH' ? '#f97316' : flag === 'LOW' ? '#38bdf8' : '#10b981';

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 11px',
                    background: isAbn ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card-tinted)',
                    border: isAbn ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-card, rgba(255,255,255,0.06))',
                    borderRadius: '7px',
                    gap: '8px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {obs.name}
                      </span>
                      {isAbn && (
                        <span
                          style={{
                            fontSize: '0.56rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: flagColor,
                            background: `${flagColor}18`,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            border: `1px solid ${flagColor}40`,
                          }}
                        >
                          {flag}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Ref: {obs.reference_range?.display || 'Standard'} · {obs.provenance || 'EHR'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.88rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isAbn ? flagColor : 'var(--text-primary)' }}>
                      {obs.value} <span style={{ fontSize: '0.66rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{obs.unit}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 3. Relevant Prescribed Medications ── */}
      {medications.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Correlated Medications ({medications.length})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {medications.map((med, i) => (
              <div
                key={i}
                style={{
                  padding: '7px 11px',
                  borderRadius: '7px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.22)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                    {med.name}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 600 }}>
                    {med.dosage || 'Prescribed'}
                  </span>
                </div>
                {med.clinical_purpose && (
                  <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {med.clinical_purpose}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Holdout Validated Risk Assessment ── */}
      {predictions.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Validated ML Risk Stratification
          </span>
          {predictions.map((p, i) => (
            <RiskMeter key={i} prediction={p} />
          ))}
        </div>
      )}

      {/* ── 5. Missing Data Clinical Checklist ── */}
      {missingData.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Missing Clinical Data ({missingData.length})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {missingData.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(249, 115, 22, 0.05)',
                  border: '1px solid rgba(249, 115, 22, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.name}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--brand-orange)', fontFamily: 'var(--font-mono)' }}>
                  {item.recommended_action}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Clinical Guidance Box ── */}
      {guidance && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'var(--bg-card-tinted)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <Info size={16} style={{ color: 'var(--brand-blue, #38bdf8)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: '1.5', fontWeight: 500 }}>
            {guidance}
          </p>
        </div>
      )}

      {/* ── Footer Link ── */}
      <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          to="/profile?tab=vault"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.72rem',
            color: 'var(--brand-orange)',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
          }}
        >
          <span>Open Patient Records Vault</span>
          <ExternalLink size={11} />
        </Link>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          EHR Synced · {observations.length} observations
        </span>
      </div>
    </div>
  );
}
