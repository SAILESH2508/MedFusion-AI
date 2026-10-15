import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Heart, Wind, FlaskConical, Droplet, Brain as BrainIcon, ClipboardList } from 'lucide-react';

const ORGAN_INFO = {
  heart: {
    name: 'Heart',
    icon: <Heart size={20} color="#c1121f" />,
    accent: '#c1121f',
    description: 'The heart is a muscular pump that drives oxygenated blood throughout the body via systole and diastole cycles, maintaining circulation and oxygen delivery.',
    biomarkerKeys: ['cholesterol', 'ldl', 'hdl', 'triglycerides', 'systolic', 'diastolic', 'total cholesterol', 'bp'],
    predictionType: 'Heart Attack',
  },
  lungs: {
    name: 'Lungs',
    icon: <Wind size={20} color="#e07a8a" />,
    accent: '#e07a8a',
    description: 'The lungs facilitate gas exchange — drawing in oxygen and expelling carbon dioxide — across millions of alveolar surfaces on each breath.',
    biomarkerKeys: ['oxygen saturation', 'spo2', 'peak flow', 'fev1', 'fvc'],
    predictionType: null,
  },
  liver: {
    name: 'Liver',
    icon: <FlaskConical size={20} color="#c87941" />,
    accent: '#c87941',
    description: 'The liver performs over 500 functions including metabolising nutrients, filtering toxins, producing bile, and synthesising essential plasma proteins.',
    biomarkerKeys: ['alt', 'ast', 'bilirubin', 'ggt', 'albumin', 'sgpt', 'sgot', 'alkaline phosphatase'],
    predictionType: null,
  },
  kidneys: {
    name: 'Kidneys',
    icon: <Droplet size={20} color="#d44a4e" />,
    accent: '#d44a4e',
    description: 'The kidneys filter approximately 180 litres of blood per day, excreting metabolic waste, regulating electrolyte balance, and producing hormones that control blood pressure.',
    biomarkerKeys: ['creatinine', 'urea', 'bun', 'egfr', 'uric acid', 'potassium', 'sodium'],
    predictionType: null,
  },
  brain: {
    name: 'Brain',
    icon: <BrainIcon size={20} color="#b0a4b8" />,
    accent: '#b0a4b8',
    description: 'The brain coordinates sensory processing, motor output, language, cognition, and autonomic regulation through approximately 86 billion neurons.',
    biomarkerKeys: ['glucose', 'hba1c', 'haemoglobin', 'hemoglobin'],
    predictionType: 'Diabetes',
  },
};

function extractBiomarkers(pathology, biomarkerKeys) {
  const matches = [];
  if (!pathology || !Array.isArray(pathology)) return matches;
  const seen = new Set();
  for (const report of pathology) {
    const reportDate = report.created_at || '';
    const reportData = Array.isArray(report.report_data) ? report.report_data : [];
    for (const item of reportData) {
      const nameLower = (item.name || '').toLowerCase();
      const matched = biomarkerKeys.some((key) => nameLower.includes(key));
      if (matched && !seen.has(nameLower)) {
        seen.add(nameLower);
        matches.push({
          name: item.name,
          value: item.value,
          unit: item.unit || '',
          date: reportDate ? new Date(reportDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        });
      }
    }
  }
  return matches;
}

function extractRisk(predictions, predictionType) {
  if (!predictionType || !predictions || !Array.isArray(predictions)) return null;
  const filtered = predictions.filter(p => (p.disease_type || '').toLowerCase() === predictionType.toLowerCase());
  if (!filtered.length) return null;
  filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return filtered[0];
}

function RiskBar({ score, level }) {
  const pct = Math.min(Math.max(score || 0, 0), 100);
  const color = pct >= 75 ? '#dc2f02' : pct >= 50 ? '#e85d04' : pct >= 25 ? '#f4a261' : '#2dc98e';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Score</span>
        <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color, fontWeight: 700 }}>{pct.toFixed(0)}% — {level}</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: '3px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function OrganInfoPanel({ selectedOrgan, patientData }) {
  if (!selectedOrgan) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', margin: 0, fontSize: '0.85rem', fontFamily: 'monospace' }}>
          Select an organ in the viewer to explore health data
        </p>
      </div>
    );
  }

  const info = ORGAN_INFO[selectedOrgan];
  if (!info) return null;

  const biomarkers = extractBiomarkers(patientData?.pathology, info.biomarkerKeys);
  const risk = extractRisk(patientData?.predictions, info.predictionType);
  const hasData = biomarkers.length > 0 || risk !== null;

  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(${info.accent.slice(1).match(/.{2}/g).map(h=>parseInt(h,16)).join(',')},0.08) 0%, rgba(0,0,0,0) 60%)`,
      border: `1px solid ${info.accent}30`,
      borderRadius: '12px',
      padding: '16px',
      transition: 'all 0.3s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{info.icon}</span>
        <div style={{ flex: 1 }}>
          <h6 style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em', margin: '0 0 4px', fontSize: '0.95rem', textTransform: 'uppercase' }}>
            {info.name}
          </h6>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.78rem', lineHeight: '1.5' }}>
            {info.description}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: `linear-gradient(90deg, ${info.accent}40, transparent)`, margin: '12px 0' }} />

      {!hasData ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--bg-card-hover, rgba(255,255,255,0.03))', borderRadius: '8px' }}>
          <ClipboardList size={16} style={{ color: 'var(--text-secondary, rgba(255,255,255,0.4))', flexShrink: 0 }} />
          <p style={{ color: 'var(--text-muted, rgba(255,255,255,0.35))', margin: 0, fontSize: '0.78rem', fontStyle: 'italic' }}>
            No recorded data for this organ yet. Upload a pathology report or run a health assessment to see data here.
          </p>
        </div>
      ) : (
        <>
          {/* Risk bar */}
          {risk && (
            <div style={{ marginBottom: '14px' }}>
              <RiskBar score={risk.risk_score} level={risk.risk_level} />
              {risk.created_at && (
                <p style={{ margin: '4px 0 0', fontSize: '0.68rem', color: 'var(--text-muted, rgba(255,255,255,0.3))', fontFamily: 'monospace' }}>
                  Assessment date: {new Date(risk.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          )}

          {/* Biomarkers */}
          {biomarkers.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--text-secondary, rgba(255,255,255,0.35))', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
                Recorded Biomarkers
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {biomarkers.map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-card-hover, rgba(255,255,255,0.04))', borderRadius: '6px', border: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
                    <span style={{ color: 'var(--text-primary, rgba(255,255,255,0.75))', fontSize: '0.78rem' }}>{b.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: info.accent, fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 600 }}>
                        {b.value} {b.unit && <span style={{ color: 'var(--text-secondary, rgba(255,255,255,0.35))', fontSize: '0.7rem' }}>{b.unit}</span>}
                      </span>
                      <span style={{ color: 'var(--text-muted, rgba(255,255,255,0.25))', fontSize: '0.68rem', fontFamily: 'monospace' }}>{b.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link to vault */}
          <Link
            to="/profile?tab=vault"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#38bdf8', textDecoration: 'none', fontFamily: 'monospace', opacity: 0.8 }}
          >
            View full records in Medical Vault <ExternalLink size={10} />
          </Link>
        </>
      )}
    </div>
  );
}
