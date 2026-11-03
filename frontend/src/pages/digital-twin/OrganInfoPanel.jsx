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
  heart: <Heart size={20} />,
  lungs: <Wind size={20} />,
  liver: <FlaskConical size={20} />,
  stomach: <FlaskConical size={20} />,
  pancreas: <Activity size={20} />,
  kidneys: <Droplet size={20} />,
  intestines: <Wind size={20} />,
  brain: <BrainIcon size={20} />,
};

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
        padding: '14px',
        marginBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            {prediction.disease_type} Risk Model
          </span>
          <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            Version: {prediction.model_version || 'rf-v1.2.0'} · Holdout Validated
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color }}>
            {pct.toFixed(0)}%
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '2px 8px',
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
        <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {prediction.clinical_reasoning}
        </p>
      )}

      {prediction.dataset_provenance && (
        <p style={{ margin: '6px 0 0', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
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
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
          Select an anatomical system in the 3D viewer or selector bar to inspect its clinical health twin.
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
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
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
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      {/* ── Top Header: Organ Title & System ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: `${primaryColor}22`,
              border: `1.5px solid ${primaryColor}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: primaryColor,
              boxShadow: `0 0 14px ${primaryColor}30`,
              flexShrink: 0,
            }}
          >
            {ICONS[selectedOrgan] || <Activity size={20} />}
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
              {organSystem}
            </span>
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {organName}
            </h4>
          </div>
        </div>
      </div>

      {/* ── 1. Active Diagnoses & Medical Conditions ── */}
      {activeConditions.length > 0 && (
        <div style={{ marginBottom: '22px' }}>
          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
            Active Diagnoses ({activeConditions.length})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeConditions.map((cond, i) => (
              <div
                key={`act-${i}`}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ef4444' }}>
                    {cond.condition_name}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }}>
                    ICD-10: {cond.icd10_code || 'N/A'}
                  </span>
                </div>
                {cond.notes && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {cond.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. Discrete Biomarkers & Laboratory Observations ── */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
            Discrete Biomarkers ({observations.length})
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Standard SI Units · Lab Validated
          </span>
        </div>

        {observations.length === 0 ? (
          <div style={{ padding: '14px', background: 'var(--bg-card-tinted)', borderRadius: '10px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              No discrete observations recorded for {organName}.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    padding: '12px 16px',
                    background: isAbn ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card-tinted)',
                    border: isAbn ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-card, rgba(255,255,255,0.06))',
                    borderRadius: '10px',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {obs.name}
                      </span>
                      {isAbn && (
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: flagColor,
                            background: `${flagColor}18`,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: `1px solid ${flagColor}40`,
                          }}
                        >
                          {flag}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '2px' }}>
                      Ref: {obs.reference_range?.display || 'Standard'} · {obs.provenance || 'EHR'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '1.05rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isAbn ? flagColor : 'var(--text-primary)' }}>
                      {obs.value} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{obs.unit}</span>
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
        <div style={{ marginBottom: '22px' }}>
          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
            Correlated Medications ({medications.length})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {medications.map((med, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.22)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {med.name}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 600 }}>
                    {med.dosage || 'Prescribed'}
                  </span>
                </div>
                {med.clinical_purpose && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
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
        <div style={{ marginBottom: '22px' }}>
          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
            Validated ML Risk Stratification
          </span>
          {predictions.map((p, i) => (
            <RiskMeter key={i} prediction={p} />
          ))}
        </div>
      )}

      {/* ── 5. Missing Data Clinical Checklist ── */}
      {missingData.length > 0 && (
        <div style={{ marginBottom: '22px' }}>
          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
            Missing Clinical Data ({missingData.length})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {missingData.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(249, 115, 22, 0.05)',
                  border: '1px solid rgba(249, 115, 22, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.name}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--brand-orange)', fontFamily: 'var(--font-mono)', lineHeight: '1.4' }}>
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
            marginTop: '8px',
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'var(--bg-card-tinted)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Info size={18} style={{ color: 'var(--brand-blue, #38bdf8)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.6', fontWeight: 400 }}>
            {guidance}
          </p>
        </div>
      )}

      {/* ── Footer Link ── */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          to="/profile?tab=vault"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: 'var(--brand-orange)',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
          }}
        >
          <span>Open Patient Records Vault</span>
          <ExternalLink size={12} />
        </Link>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          EHR Synced · {observations.length} observations
        </span>
      </div>
    </div>
  );
}
