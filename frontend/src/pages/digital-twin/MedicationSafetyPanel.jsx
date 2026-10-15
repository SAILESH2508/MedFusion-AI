import React, { useState, useMemo } from 'react';
import { AlertTriangle, Search, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

function extractMedications(prescriptions) {
  if (!Array.isArray(prescriptions)) return [];
  const seen = new Map();

  for (const rx of prescriptions) {
    const meds = rx.extracted_data?.medicines;
    if (!Array.isArray(meds)) continue;
    for (const med of meds) {
      const name = (med.name || med || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { name, dosage: med.dosage || null });
      }
    }
    if (seen.size >= 10) break;
  }

  return Array.from(seen.values());
}

function checkAllergyHits(medications, allergies) {
  if (!Array.isArray(allergies) || allergies.length === 0) return [];
  if (!Array.isArray(medications) || medications.length === 0) return [];

  const hits = [];
  for (const med of medications) {
    const medNameLower = med.name.toLowerCase();
    for (const allergy of allergies) {
      const allergyLower = (allergy || '').toLowerCase().trim();
      if (allergyLower && medNameLower.includes(allergyLower)) {
        hits.push({ med: med.name, allergy });
      }
    }
  }
  return hits;
}

export default function MedicationSafetyPanel({ patientData }) {
  const [safetyReport, setSafetyReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);

  const currentMeds = useMemo(() => extractMedications(patientData?.prescriptions), [patientData?.prescriptions]);
  const allergies = patientData?.profile?.allergies || [];
  const allergyHits = useMemo(() => checkAllergyHits(currentMeds, allergies), [currentMeds, allergies]);

  const handleRunSafetyCheck = async () => {
    if (currentMeds.length === 0) return;
    setLoading(true);
    setError('');
    setSafetyReport(null);

    try {
      const response = await api.post('/telemetry/drug-safety/', { medications: currentMeds });
      setSafetyReport(response.data);
      setHasRun(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Safety check failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* No medications state */}
      {currentMeds.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.85rem',
        }}>
          No medications on record to check.
        </div>
      ) : (
        <>
          {/* Current medications */}
          <div className="mb-3">
            <p style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Current Medications ({currentMeds.length})
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {currentMeds.map((med, i) => (
                <li key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.82rem',
                }}>
                  <span style={{ color: '#fff' }}>{med.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{med.dosage || 'As directed'}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Known allergies */}
          {Array.isArray(allergies) && allergies.length > 0 && (
            <div className="mb-3">
              <p style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Known Allergies
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {allergies.map((a, i) => (
                  <span key={i} style={{
                    background: 'rgba(220,53,69,0.15)',
                    border: '1px solid rgba(220,53,69,0.3)',
                    color: '#ff6b6b',
                    padding: '1px 8px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontFamily: 'monospace',
                  }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Allergy hits (client-side check) */}
          {allergyHits.length > 0 && (
            <div style={{
              background: 'rgba(220,53,69,0.12)',
              border: '1px solid rgba(220,53,69,0.4)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '12px',
            }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={13} />
                Allergy Alert
              </p>
              {allergyHits.map((hit, i) => (
                <p key={i} style={{ margin: '2px 0', fontSize: '0.78rem', color: '#ff6b6b' }}>
                  <strong>{hit.med}</strong> may conflict with your recorded allergy to <strong>{hit.allergy}</strong>.
                </p>
              ))}
            </div>
          )}

          {/* Run safety check button */}
          {!hasRun && (
            <button
              onClick={handleRunSafetyCheck}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px',
                background: loading ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.15)',
                border: '1px solid rgba(56,189,248,0.35)',
                borderRadius: '8px',
                color: '#38bdf8',
                fontFamily: 'monospace',
                fontSize: '0.82rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Checking…
                </>
              ) : (
                <>
                  <Search size={13} />
                  <span>Run Safety Check</span>
                </>
              )}
            </button>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(220,53,69,0.1)',
              border: '1px solid rgba(220,53,69,0.3)',
              borderRadius: '6px',
              padding: '6px 10px',
              marginBottom: '10px',
              fontSize: '0.78rem',
              color: '#ff6b6b',
            }}>
              {error}
            </div>
          )}

          {/* Safety report results */}
          {hasRun && safetyReport && (
            <div>
              {/* Re-run button */}
              <button
                onClick={handleRunSafetyCheck}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'monospace',
                  fontSize: '0.72rem',
                  padding: '3px 10px',
                  cursor: 'pointer',
                  marginBottom: '10px',
                }}
              >
                Re-run check
              </button>

              {/* Interaction status */}
              {!safetyReport.has_interactions && (!safetyReport.critical_warnings || safetyReport.critical_warnings.length === 0) ? (
                <div style={{
                  background: 'rgba(32,201,151,0.1)',
                  border: '1px solid rgba(32,201,151,0.3)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  fontSize: '0.82rem',
                  color: '#2dc98e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <CheckCircle2 size={15} />
                  <span>No known interactions detected.</span>
                </div>
              ) : null}

              {/* Critical warnings */}
              {Array.isArray(safetyReport.critical_warnings) && safetyReport.critical_warnings.length > 0 && (
                <div style={{
                  background: 'rgba(255,140,0,0.1)',
                  border: '1px solid rgba(255,140,0,0.35)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '10px',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#ffa94d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={13} />
                    Critical Warnings
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {safetyReport.critical_warnings.map((w, i) => (
                      <li key={i} style={{ fontSize: '0.78rem', color: '#ffa94d', marginBottom: '2px' }}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dietary precautions */}
              {Array.isArray(safetyReport.dietary_precautions) && safetyReport.dietary_precautions.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Dietary Precautions
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {safetyReport.dietary_precautions.map((p, i) => (
                      <li key={i} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Side effects */}
              {Array.isArray(safetyReport.side_effects) && safetyReport.side_effects.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Side Effects to Monitor
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {safetyReport.side_effects.map((s, i) => (
                      <li key={i} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Full clinical summary */}
              {safetyReport.summary && (
                <details style={{ marginBottom: '10px' }}>
                  <summary style={{
                    fontSize: '0.78rem',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 0',
                  }}>
                    Full Clinical Summary
                  </summary>
                  <p style={{
                    margin: '6px 0 0',
                    fontSize: '0.78rem',
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: '1.5',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '8px',
                    borderRadius: '6px',
                  }}>
                    {safetyReport.summary}
                  </p>
                </details>
              )}
            </div>
          )}
        </>
      )}

      {/* Footer disclaimer */}
      <p style={{
        marginTop: '14px',
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: '10px',
        lineHeight: '1.4',
      }}>
        Drug safety information is provided for awareness only. Always consult your prescribing physician.
      </p>
    </div>
  );
}
