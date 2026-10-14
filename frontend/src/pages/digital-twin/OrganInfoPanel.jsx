import React from 'react';
import { Link } from 'react-router-dom';

const ORGAN_INFO = {
  heart: {
    name: 'Heart',
    description: 'The heart pumps oxygenated blood throughout the body via a continuous rhythmic contraction cycle.',
    biomarkerKeys: ['cholesterol', 'ldl', 'hdl', 'triglycerides', 'systolic', 'diastolic', 'total cholesterol'],
    predictionType: 'Heart Attack',
  },
  lungs: {
    name: 'Lungs',
    description: 'The lungs facilitate gas exchange, supplying oxygen to the blood and removing carbon dioxide.',
    biomarkerKeys: ['oxygen saturation', 'spo2', 'peak flow', 'fev1'],
    predictionType: null,
  },
  liver: {
    name: 'Liver',
    description: 'The liver metabolises nutrients, detoxifies chemicals, and produces essential proteins.',
    biomarkerKeys: ['alt', 'ast', 'bilirubin', 'ggt', 'albumin', 'sgpt', 'sgot'],
    predictionType: null,
  },
  kidneys: {
    name: 'Kidneys',
    description: 'The kidneys filter waste from the blood and regulate fluid and electrolyte balance.',
    biomarkerKeys: ['creatinine', 'urea', 'bun', 'egfr', 'uric acid'],
    predictionType: null,
  },
  brain: {
    name: 'Brain',
    description: 'The brain coordinates sensory input, motor output, cognition, and autonomic functions.',
    biomarkerKeys: [],
    predictionType: null,
  },
};

function extractBiomarkers(pathology, biomarkerKeys) {
  const matches = [];
  if (!pathology || !Array.isArray(pathology)) return matches;

  for (const report of pathology) {
    const reportDate = report.created_at || '';
    const reportData = report.report_data || [];
    if (!Array.isArray(reportData)) continue;

    for (const item of reportData) {
      const nameLower = (item.name || '').toLowerCase();
      const matched = biomarkerKeys.some((key) => nameLower.includes(key));
      if (matched) {
        matches.push({
          name: item.name,
          value: item.value,
          unit: item.unit || '',
          date: reportDate ? new Date(reportDate).toLocaleDateString() : 'Unknown date',
        });
      }
    }
  }

  return matches;
}

function extractRisk(predictions, predictionType) {
  if (!predictionType || !predictions || !Array.isArray(predictions)) return null;
  const filtered = predictions.filter(
    (p) => (p.disease_type || '').toLowerCase() === predictionType.toLowerCase()
  );
  if (filtered.length === 0) return null;
  // Sort by created_at descending, take most recent
  filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return filtered[0];
}

function getRiskBadgeStyle(riskLevel) {
  const level = (riskLevel || '').toLowerCase();
  if (level.includes('high')) return { background: 'rgba(220,53,69,0.2)', color: '#ff6b6b', border: '1px solid rgba(220,53,69,0.4)' };
  if (level.includes('moderate') || level.includes('medium')) return { background: 'rgba(255,140,0,0.2)', color: '#ffa94d', border: '1px solid rgba(255,140,0,0.4)' };
  return { background: 'rgba(32,201,151,0.2)', color: '#2dc98e', border: '1px solid rgba(32,201,151,0.4)' };
}

export default function OrganInfoPanel({ selectedOrgan, patientData }) {
  if (!selectedOrgan) {
    return (
      <div className="glass-card p-3 mt-3" style={{ borderRadius: '12px' }}>
        <p className="text-secondary m-0 text-center" style={{ fontSize: '0.85rem' }}>
          Select an organ above to view health information.
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
    <div className="glass-card p-3 mt-3" style={{ borderRadius: '12px' }}>
      <h6 className="text-white fw-bold mb-1" style={{ fontSize: '0.95rem' }}>{info.name}</h6>
      <p className="text-secondary mb-2" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>{info.description}</p>

      {!hasData ? (
        <p className="text-secondary m-0" style={{ fontSize: '0.78rem', fontStyle: 'italic' }}>
          No recorded data for this organ yet.
        </p>
      ) : (
        <>
          {biomarkers.length > 0 && (
            <div className="mb-2">
              <p className="text-secondary mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Recorded Biomarkers</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ textAlign: 'left', padding: '2px 4px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Name</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Value</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Unit</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {biomarkers.map((b, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '3px 4px', color: 'var(--text-primary, #fff)' }}>{b.name}</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right', color: 'var(--accent-teal, #00f5d4)', fontFamily: 'monospace' }}>{b.value}</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>{b.unit}</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{b.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {risk && (
            <div className="d-flex align-items-center gap-2 mt-2">
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Risk Assessment:</span>
              <span style={{
                ...getRiskBadgeStyle(risk.risk_level),
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                padding: '1px 8px',
                borderRadius: '20px',
              }}>
                {risk.risk_score}% — {risk.risk_level}
              </span>
            </div>
          )}

          <div className="mt-2">
            <Link to="/profile?tab=vault" style={{ fontSize: '0.72rem', color: 'var(--accent-teal, #00f5d4)', textDecoration: 'none' }}>
              View in Medical Vault →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
