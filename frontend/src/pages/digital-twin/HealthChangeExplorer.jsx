import React, { useState, useMemo } from 'react';

function buildBiomarkerList(patientData) {
  const seen = new Map(); // name (lowercase) -> item

  if (!Array.isArray(patientData?.pathology)) return [];

  for (const report of patientData.pathology) {
    const date = report.created_at || '';
    const reportData = Array.isArray(report.report_data) ? report.report_data : [];

    for (const item of reportData) {
      if (!item.name) continue;
      const key = item.name.toLowerCase();

      if (!seen.has(key)) {
        seen.set(key, {
          name: item.name,
          value: item.value,
          unit: item.unit || '',
          date: date ? new Date(date).toLocaleDateString() : 'Unknown date',
          reference_range: item.reference_range || null,
        });
      } else {
        // Keep the most recent (first seen wins since pathology sorted desc by caller)
        // But if we find a newer date, replace
        const existing = seen.get(key);
        if (date && existing.date && new Date(date) > new Date(existing.date)) {
          seen.set(key, {
            name: item.name,
            value: item.value,
            unit: item.unit || '',
            date: new Date(date).toLocaleDateString(),
            reference_range: item.reference_range || null,
          });
        }
      }
    }
  }

  return Array.from(seen.values());
}

function parseNumeric(val) {
  if (val === null || val === undefined) return null;
  const n = parseFloat(String(val).replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? null : n;
}

function isInRange(value, rangeStr) {
  if (!rangeStr || value === null) return null;
  // Support formats: "3.5 - 5.0", "< 5.0", "> 0.5", "3.5-5.0"
  const rangeTrimmed = rangeStr.trim();

  const rangeMatch = rangeTrimmed.match(/^([\d.]+)\s*[-–]\s*([\d.]+)$/);
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1]);
    const hi = parseFloat(rangeMatch[2]);
    return value >= lo && value <= hi;
  }
  const ltMatch = rangeTrimmed.match(/^<\s*([\d.]+)$/);
  if (ltMatch) return value < parseFloat(ltMatch[1]);
  const gtMatch = rangeTrimmed.match(/^>\s*([\d.]+)$/);
  if (gtMatch) return value > parseFloat(gtMatch[1]);

  return null; // can't parse
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

    if (raw === '') {
      setInputError('');
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num)) {
      setInputError('Please enter a valid number.');
    } else if (num < 0 || num > 10000) {
      setInputError('Value must be between 0 and 10,000.');
    } else {
      setInputError('');
    }
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
        <p className="text-secondary mt-1" style={{ fontSize: '0.78rem', opacity: 0.6 }}>
          Upload a pathology report to use the Health Change Explorer.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Disclaimer banner */}
      <div style={{
        background: 'rgba(255,193,7,0.12)',
        border: '1px solid rgba(255,193,7,0.35)',
        borderRadius: '8px',
        padding: '8px 12px',
        marginBottom: '14px',
        fontSize: '0.75rem',
        color: '#ffc107',
        lineHeight: '1.4',
      }}>
        ⚠️ This is an educational comparison tool only. Hypothetical values are never saved to your records.
      </div>

      {/* Biomarker selector */}
      <div className="mb-3">
        <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Biomarker
        </label>
        <select
          value={selectedBiomarker?.name || ''}
          onChange={handleBiomarkerChange}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '6px',
            color: '#fff',
            padding: '6px 10px',
            fontSize: '0.85rem',
          }}
        >
          <option value="" style={{ background: '#1a1a2e', color: '#fff' }}>— Choose a biomarker —</option>
          {biomarkers.map((b) => (
            <option key={b.name} value={b.name} style={{ background: '#1a1a2e', color: '#fff' }}>
              {b.name} ({b.value} {b.unit}) — {b.date}
            </option>
          ))}
        </select>
      </div>

      {/* Recorded value display */}
      {selectedBiomarker && (
        <div style={{
          background: 'rgba(0,245,212,0.07)',
          border: '1px solid rgba(0,245,212,0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '12px',
          fontSize: '0.82rem',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Recorded value: </span>
          <strong style={{ color: '#00f5d4', fontFamily: 'monospace' }}>{selectedBiomarker.value} {selectedBiomarker.unit}</strong>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', marginLeft: '8px' }}>({selectedBiomarker.date})</span>
        </div>
      )}

      {/* Hypothetical input */}
      {selectedBiomarker && (
        <div className="mb-3">
          <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Hypothetical Value (not saved){selectedBiomarker.unit ? ` — ${selectedBiomarker.unit}` : ''}
          </label>
          <input
            type="number"
            min={0}
            max={10000}
            value={hypotheticalValue}
            onChange={handleHypotheticalChange}
            placeholder="Enter a hypothetical value…"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${inputError ? 'rgba(220,53,69,0.5)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '6px',
              color: '#fff',
              padding: '6px 10px',
              fontSize: '0.85rem',
            }}
          />
          {inputError && (
            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#ff6b6b' }}>{inputError}</p>
          )}
        </div>
      )}

      {/* Comparison section */}
      {showComparison && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Comparison
          </p>

          {/* Bar visualization */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>
              <span>Recorded</span>
              <span style={{ fontFamily: 'monospace', color: '#00f5d4' }}>{recordedNum} {selectedBiomarker.unit}</span>
            </div>
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ height: '100%', width: `${recordedPct}%`, background: '#00f5d4', borderRadius: '5px', transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>
              <span>Hypothetical</span>
              <span style={{ fontFamily: 'monospace', color: '#df40ff' }}>{hypotheticalNum} {selectedBiomarker.unit}</span>
            </div>
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${hypotheticalPct}%`, background: '#df40ff', borderRadius: '5px', transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Plain language explanation */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.75)',
            lineHeight: '1.5',
          }}>
            Your hypothetical value of <strong style={{ color: '#df40ff' }}>{hypotheticalNum} {selectedBiomarker.unit}</strong> is{' '}
            {direction === 'equal to' ? (
              'equal to your recorded value.'
            ) : (
              <>
                <strong style={{ color: direction === 'higher' ? '#ff6b6b' : '#2dc98e' }}>{absDiff?.toFixed(2)} {selectedBiomarker.unit}</strong> {direction} than your recorded value of{' '}
                <strong style={{ color: '#00f5d4' }}>{recordedNum} {selectedBiomarker.unit}</strong>.
                {pctChange !== null && (
                  <> That is a <strong>{Math.abs(pctChange).toFixed(1)}%</strong> {direction === 'higher' ? 'increase' : 'decrease'}.</>
                )}
              </>
            )}
          </div>

          {/* Reference range */}
          {selectedBiomarker.reference_range && (
            <div style={{ marginTop: '10px', fontSize: '0.78rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Reference range: </span>
              <span style={{ color: '#fff', fontFamily: 'monospace' }}>{selectedBiomarker.reference_range} {selectedBiomarker.unit}</span>
              <div style={{ marginTop: '4px', display: 'flex', gap: '12px' }}>
                <span>
                  Recorded:{' '}
                  <strong style={{ color: recordedInRange === true ? '#2dc98e' : recordedInRange === false ? '#ff6b6b' : 'rgba(255,255,255,0.5)' }}>
                    {recordedInRange === true ? 'Within range' : recordedInRange === false ? 'Outside range' : 'Unable to assess'}
                  </strong>
                </span>
                <span>
                  Hypothetical:{' '}
                  <strong style={{ color: hypotheticalInRange === true ? '#2dc98e' : hypotheticalInRange === false ? '#ff6b6b' : 'rgba(255,255,255,0.5)' }}>
                    {hypotheticalInRange === true ? 'Within range' : hypotheticalInRange === false ? 'Outside range' : 'Unable to assess'}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show limitation if recorded value can't be parsed */}
      {selectedBiomarker && recordedNum === null && (
        <div style={{
          background: 'rgba(255,193,7,0.08)',
          border: '1px solid rgba(255,193,7,0.2)',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '0.75rem',
          color: '#ffc107',
          marginTop: '8px',
        }}>
          The recorded value for this biomarker is not a parseable number — comparison is unavailable.
        </div>
      )}
    </div>
  );
}
