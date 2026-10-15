import React, { useState, useMemo } from 'react';import { AlertTriangle, Search, CheckCircle2 } from 'lucide-react';import { api } from '../../services/api';function extractMedications(prescriptions) {  if (!Array.isArray(prescriptions)) return [];  const seen = new Map();  for (const rx of prescriptions) {    const meds = rx.extracted_data?.medicines;    if (!Array.isArray(meds)) continue;    for (const med of meds) {      const name = (med.name || med || '').trim();      if (!name) continue;      const key = name.toLowerCase();      if (!seen.has(key)) seen.set(key, { name, dosage: med.dosage || null });    }    if (seen.size >= 10) break;  }  return Array.from(seen.values());}function checkAllergyHits(medications, allergies) {  if (!Array.isArray(allergies) || allergies.length === 0) return [];  if (!Array.isArray(medications) || medications.length === 0) return [];  const hits = [];  for (const med of medications) {    const medNameLower = med.name.toLowerCase();    for (const allergy of allergies) {      const allergyLower = (allergy || '').toLowerCase().trim();      if (allergyLower && medNameLower.includes(allergyLower)) hits.push({ med: med.name, allergy });    }  }  return hits;}export default function MedicationSafetyPanel({ patientData }) {  const [safetyReport, setSafetyReport] = useState(null);  const [loading, setLoading] = useState(false);  const [error, setError] = useState('');  const [hasRun, setHasRun] = useState(false);  const currentMeds = useMemo(() => extractMedications(patientData?.prescriptions), [patientData?.prescriptions]);  const allergies = patientData?.profile?.allergies || [];  const allergyHits = useMemo(() => checkAllergyHits(currentMeds, allergies), [currentMeds, allergies]);
  const handleRunSafetyCheck = async () => {
    if (currentMeds.length === 0) return;
    setLoading(true); setError(''); setSafetyReport(null);
    try {
      const response = await api.post('/telemetry/drug-safety/', { medications: currentMeds });
      setSafetyReport(response.data); setHasRun(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Safety check failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div>
      {currentMeds.length === 0 ? (
        <div style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No medications on record to check.
        </div>
      ) : (
        <>
          <div className="mb-3">
            <p style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Current Medications ({currentMeds.length})
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {currentMeds.map((med, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{med.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{med.dosage || 'As directed'}</span>
                </li>
              ))}
            </ul>
          </div>

          {Array.isArray(allergies) && allergies.length > 0 && (
            <div className="mb-3">
              <p style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Known Allergies</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {allergies.map((a, i) => (
                  <span key={i} style={{ background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--accent-red)', padding: '1px 8px', borderRadius: '20px', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {allergyHits.length > 0 && (
            <div style={{ background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={13} /> Allergy Alert
              </p>
              {allergyHits.map((hit, i) => (
                <p key={i} style={{ margin: '2px 0', fontSize: '0.78rem', color: 'var(--accent-red)' }}>
                  <strong>{hit.med}</strong> may conflict with your recorded allergy to <strong>{hit.allergy}</strong>.
                </p>
              ))}
            </div>
          )}

          {!hasRun && (
            <button onClick={handleRunSafetyCheck} disabled={loading}
              style={{ width: '100%', padding: '8px', background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', borderRadius: '8px', color: 'var(--status-info)', fontFamily: 'monospace', fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> Checking...</>
              ) : (
                <><Search size={13} /><span>Run Safety Check</span></>
              )}
            </button>
          )}

          {error && (
            <div style={{ background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: '6px', padding: '6px 10px', marginBottom: '10px', fontSize: '0.78rem', color: 'var(--accent-red)' }}>
              {error}
            </div>
          )}

          {hasRun && safetyReport && (
            <div>
              <button onClick={handleRunSafetyCheck} disabled={loading}
                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.72rem', padding: '3px 10px', cursor: 'pointer', marginBottom: '10px' }}>
                Re-run check
              </button>

              {!safetyReport.has_interactions && (!safetyReport.critical_warnings || safetyReport.critical_warnings.length === 0) && (
                <div style={{ background: 'var(--status-normal-bg)', border: '1px solid var(--status-normal-border)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '0.82rem', color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} /><span>No known interactions detected.</span>
                </div>
              )}

              {Array.isArray(safetyReport.critical_warnings) && safetyReport.critical_warnings.length > 0 && (
                <div style={{ background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={13} /> Critical Warnings
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {safetyReport.critical_warnings.map((w, i) => (
                      <li key={i} style={{ fontSize: '0.78rem', color: 'var(--status-warning)', marginBottom: '2px' }}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(safetyReport.dietary_precautions) && safetyReport.dietary_precautions.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Dietary Precautions</p>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {safetyReport.dietary_precautions.map((p, i) => (
                      <li key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(safetyReport.side_effects) && safetyReport.side_effects.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Side Effects to Monitor</p>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {safetyReport.side_effects.map((s, i) => (
                      <li key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {safetyReport.summary && (
                <details style={{ marginBottom: '10px' }}>
                  <summary style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 0' }}>
                    Full Clinical Summary
                  </summary>
                  <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'var(--bg-card-tinted)', padding: '8px', borderRadius: '6px' }}>
                    {safetyReport.summary}
                  </p>
                </details>
              )}
            </div>
          )}
        </>
      )}

      <p style={{ marginTop: '14px', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '10px', lineHeight: '1.4' }}>
        Drug safety information is provided for awareness only. Always consult your prescribing physician.
      </p>
    </div>
  );
}
