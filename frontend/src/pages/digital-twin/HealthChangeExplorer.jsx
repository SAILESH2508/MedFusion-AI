import React, { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

function buildBiomarkerList(patientData) {
  const seen = new Map();
  if (!Array.isArray(patientData?.pathology)) return [];
  for (const report of patientData.pathology) {
    const date = report.created_at || '';
    const reportData = Array.isArray(report.report_data) ? report.report_data : [];
    for (const item of reportData) {
      if (!item.name) continue;
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { name: item.name, value: item.value, unit: item.unit || '', date: date ? new Date(date).toLocaleDateString() : 'Unknown date', reference_range: item.reference_range || null });
      } else {
        const existing = seen.get(key);
        if (date && existing.date && new Date(date) > new Date(existing.date)) {
          seen.set(key, { name: item.name, value: item.value, unit: item.unit || '', date: new Date(date).toLocaleDateString(), reference_range: item.reference_range || null });
        }
      }
    }
  }
  return Array.from(seen.values());
}

function parseNumeric(val) {
  if (val === null || val === undefined) return null;
  const n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
}

function isInRange(value, rangeStr) {
  if (!rangeStr || value === null) return null;
  const rangeTrimmed = rangeStr.trim();
  const rangeMatch = rangeTrimmed.match(/^([\d.]+)\s*[-–]\s*([\d.]+)$/);
  if (rangeMatch) { const lo = parseFloat(rangeMatch[1]); const hi = parseFloat(rangeMatch[2]); return value >= lo && value <= hi; }
  const ltMatch = rangeTrimmed.match(/^<\s*([\d.]+)$/);
  if (ltMatch) return value < parseFloat(ltMatch[1]);
  const gtMatch = rangeTrimmed.match(/^>\s*([\d.]+)$/);
  if (gtMatch) return value > parseFloat(gtMatch[1]);
  return null;
}

export default function HealthChangeExplorer({ patientData }) {
  const biomarkers = useMemo(() => buildBiomarkerList(patientData), [patientData]);
  const [selectedBiomarker, setSelectedBiomarker] = useState(null);
  const [hypotheticalValue, setHypotheticalValue] = useState('');
  const [inputError, setInputError] = useState('');

  const handleBiomarkerChange = (e) => {
    const name = e.target.value;
    const found = biomarkers.find((b) => b.name === name) || null;
    setSelectedBiomarker(found);
    setHypotheticalValue('');
    setInputError('');
  };

  const handleHypotheticalChange = (e) => {
    const raw = e.target.value;
    setHypotheticalValue(raw);
    if (raw === '') { setInputError(''); return; }
    const num = parseFloat(raw);
    if (isNaN(num)) { setInputError('Please enter a valid number.'); }
    else if (num < 0 || num > 10000) { setInputError('Value must be between 0 and 10,000.'); }
    else { setInputError(''); }
  };

  const recordedNum = selectedBiomarker ? parseNumeric(selectedBiomarker.value) : null;
  const hypotheticalNum = hypotheticalValue !== '' && !inputError ? parseFloat(hypotheticalValue) : null;
  const showComparison = selectedBiomarker && hypotheticalNum !== null && recordedNum !== null;
  const absDiff = showComparison ? Math.abs(hypotheticalNum - recordedNum) : null;
  const pctChange = showComparison && recordedNum !== 0 ? ((hypotheticalNum - recordedNum) / Math.abs(recordedNum)) * 100 : null;
  const direction = showComparison ? (hypotheticalNum > recordedNum ? 'higher' : hypotheticalNum < recordedNum ? 'lower' : 'equal to') : null;
  const barMax = showComparison ? Math.max(recordedNum, hypotheticalNum) * 1.2 || 1 : 1;
  const recordedPct = showComparison ? Math.min((recordedNum / barMax) * 100, 100) : 0;
  const hypotheticalPct = showComparison ? Math.min((hypotheticalNum / barMax) * 100, 100) : 0;
  const recordedInRange = selectedBiomarker?.reference_range ? isInRange(recordedNum, selectedBiomarker.reference_range) : null;
  const hypotheticalInRange = selectedBiomarker?.reference_range ? isInRange(hypotheticalNum, selectedBiomarker.reference_range) : null;

  if (!Array.isArray(patientData?.pathology) || patientData.pathology.length === 0 || biomarkers.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-secondary m-0" style={{ fontSize: '0.85rem' }}>No pathology data available for comparison.</p>
        <p className="text-secondary mt-1" style={{ fontSize: '0.78rem', opacity: 0.6 }}>Upload a pathology report to use the Health Change Explorer.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Disclaimer */}
      <div style={{ background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', fontSize: '0.75rem', color: 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
        <span>This is an educational comparison tool only. Hypothetical values are never saved to your records.</span>
      </div>

      {/* Biomarker selector */}
      <div className="mb-3">
        <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Biomarker</label>
        <select value={selectedBiomarker?.name || ''} onChange={handleBiomarkerChange}
          style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '0.85rem' }}>
          <option value="">— Choose a biomarker —</option>
          {biomarkers.map((b) => (
            <option key={b.name} value={b.name}>{b.name} ({b.value} {b.unit}) — {b.date}</option>
          ))}
        </select>
      </div>

      {/* Recorded value display */}
      {selectedBiomarker && (
        <div style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Recorded value: </span>
          <strong style={{ color: 'var(--brand-blue)', fontFamily: 'var(--font-mono)' }}>{selectedBiomarker.value} {selectedBiomarker.unit}</strong>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: '8px' }}>({selectedBiomarker.date})</span>
        </div>
      )}

      {/* Hypothetical input */}
      {selectedBiomarker && (
        <div className="mb-3">
          <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Hypothetical Value (not saved){selectedBiomarker.unit ? ` — ${selectedBiomarker.unit}` : ''}
          </label>
          <input type="number" min={0} max={10000} value={hypotheticalValue} onChange={handleHypotheticalChange}
            placeholder="Enter a hypothetical value..."
            style={{ width: '100%', background: 'var(--bg-input)', border: `1px solid ${inputError ? 'var(--accent-red)' : 'var(--border)'}`, borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '0.85rem' }} />
          {inputError && <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--accent-red)' }}>{inputError}</p>}
        </div>
      )}

      {/* Comparison section */}
      {showComparison && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Comparison</p>

          {/* Bar visualization */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
              <span>Recorded</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-blue)' }}>{recordedNum} {selectedBiomarker.unit}</span>
            </div>
            <div style={{ height: '10px', background: 'var(--grad-track)', borderRadius: '5px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ height: '100%', width: `${recordedPct}%`, background: 'var(--brand-blue)', borderRadius: '5px', transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
              <span>Hypothetical</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-violet)' }}>{hypotheticalNum} {selectedBiomarker.unit}</span>
            </div>
            <div style={{ height: '10px', background: 'var(--grad-track)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${hypotheticalPct}%`, background: 'var(--accent-violet)', borderRadius: '5px', transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Plain language explanation */}
          <div style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Your hypothetical value of <strong style={{ color: 'var(--accent-violet)' }}>{hypotheticalNum} {selectedBiomarker.unit}</strong> is{' '}
            {direction === 'equal to' ? (
              'equal to your recorded value.'
            ) : (
              <>
                <strong style={{ color: direction === 'higher' ? 'var(--accent-red)' : 'var(--accent-emerald)' }}>{absDiff?.toFixed(2)} {selectedBiomarker.unit}</strong>{' '}
                {direction} than your recorded value of{' '}
                <strong style={{ color: 'var(--brand-blue)' }}>{recordedNum} {selectedBiomarker.unit}</strong>.
                {pctChange !== null && (
                  <> That is a <strong>{Math.abs(pctChange).toFixed(1)}%</strong> {direction === 'higher' ? 'increase' : 'decrease'}.</>
                )}
              </>
            )}
          </div>

          {/* Reference range */}
          {selectedBiomarker.reference_range && (
            <div style={{ marginTop: '10px', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Reference range: </span>
              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{selectedBiomarker.reference_range} {selectedBiomarker.unit}</span>
              <div style={{ marginTop: '4px', display: 'flex', gap: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Recorded:{' '}
                  <strong style={{ color: recordedInRange === true ? 'var(--accent-emerald)' : recordedInRange === false ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                    {recordedInRange === true ? 'Within range' : recordedInRange === false ? 'Outside range' : 'Unable to assess'}
                  </strong>
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Hypothetical:{' '}
                  <strong style={{ color: hypotheticalInRange === true ? 'var(--accent-emerald)' : hypotheticalInRange === false ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                    {hypotheticalInRange === true ? 'Within range' : hypotheticalInRange === false ? 'Outside range' : 'Unable to assess'}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Non-parseable value notice */}
      {selectedBiomarker && recordedNum === null && (
        <div style={{ background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.75rem', color: 'var(--status-warning)', marginTop: '8px' }}>
          The recorded value for this biomarker is not a parseable number — comparison is unavailable.
        </div>
      )}
    </div>
  );
}
