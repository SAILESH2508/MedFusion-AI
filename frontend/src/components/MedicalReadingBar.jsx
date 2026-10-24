import React from 'react';

/**
 * MedicalReadingBar — Advanced RGB-Inspired Clinical Reading Bar
 * 
 * Displays:
 *  - Value, unit, and reference ranges
 *  - Balanced RGB gradient track (Green/Teal for normal reference zone, Amber for borderline, Red for critical)
 *  - Precise marker indicator positioned proportionally
 *  - Clinical status badge (NORMAL, HIGH, LOW, CRITICAL)
 */
export default function MedicalReadingBar({ name = '', value, unit = '', referenceRange = '', status = 'NORMAL' }) {
  const numVal = parseFloat(value);
  if (isNaN(numVal)) {
    return (
      <div className="d-flex justify-content-between align-items-center mt-2 font-monospace text-secondary" style={{ fontSize: '0.78rem' }}>
        <span>Value: {value} {unit}</span>
        <span>Ref: {referenceRange || '—'}</span>
      </div>
    );
  }

  const nameLower = name.toLowerCase();
  let minVal = 0;
  let maxVal = 200;
  let normalMin = 70;
  let normalMax = 100;

  if (nameLower.includes('glucose') || nameLower.includes('fbs') || nameLower.includes('sugar')) {
    minVal = 40; maxVal = 250; normalMin = 70; normalMax = 100;
  } else if (nameLower.includes('hba1c')) {
    minVal = 3.5; maxVal = 13; normalMin = 4.0; normalMax = 5.6;
  } else if (nameLower.includes('cholesterol') || nameLower.includes('lipid')) {
    minVal = 100; maxVal = 350; normalMin = 130; normalMax = 200;
  } else if (nameLower.includes('ldl')) {
    minVal = 40; maxVal = 220; normalMin = 70; normalMax = 100;
  } else if (nameLower.includes('hdl')) {
    minVal = 20; maxVal = 100; normalMin = 40; normalMax = 60;
  } else if (nameLower.includes('triglyceride')) {
    minVal = 40; maxVal = 400; normalMin = 60; normalMax = 150;
  } else if (nameLower.includes('hemoglobin') || nameLower.includes('hb')) {
    minVal = 7; maxVal = 21; normalMin = 12.0; normalMax = 16.5;
  } else if (nameLower.includes('wbc') || nameLower.includes('white blood')) {
    minVal = 2000; maxVal = 16000; normalMin = 4500; normalMax = 11000;
  } else if (nameLower.includes('rbc') || nameLower.includes('red blood')) {
    minVal = 3.0; maxVal = 7.0; normalMin = 4.2; normalMax = 5.9;
  } else if (nameLower.includes('platelet')) {
    minVal = 80000; maxVal = 600000; normalMin = 150000; normalMax = 450000;
  } else if (nameLower.includes('creatinine')) {
    minVal = 0.3; maxVal = 3.5; normalMin = 0.6; normalMax = 1.2;
  } else if (nameLower.includes('urea') || nameLower.includes('bun')) {
    minVal = 5; maxVal = 60; normalMin = 7; normalMax = 20;
  } else if (nameLower.includes('bilirubin')) {
    minVal = 0.1; maxVal = 3.0; normalMin = 0.2; normalMax = 1.2;
  } else if (nameLower.includes('systolic') || nameLower.includes('bp_sys')) {
    minVal = 80; maxVal = 200; normalMin = 90; normalMax = 120;
  } else if (nameLower.includes('diastolic') || nameLower.includes('bp_dia')) {
    minVal = 50; maxVal = 130; normalMin = 60; normalMax = 80;
  } else if (nameLower.includes('heart_rate') || nameLower.includes('pulse')) {
    minVal = 40; maxVal = 180; normalMin = 60; normalMax = 100;
  } else {
    // Dynamic fallback around value
    minVal = Math.floor(Math.max(0, numVal * 0.4));
    maxVal = Math.ceil(numVal * 1.6) || 100;
    normalMin = Math.floor(minVal + (maxVal - minVal) * 0.3);
    normalMax = Math.ceil(minVal + (maxVal - minVal) * 0.7);
  }

  // Calculate percentages along track
  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
  const totalRange = maxVal - minVal;
  const percentOfVal = clamp(((numVal - minVal) / totalRange) * 100, 2, 98);
  const percentOfNormalMin = clamp(((normalMin - minVal) / totalRange) * 100, 0, 100);
  const percentOfNormalMax = clamp(((normalMax - minVal) / totalRange) * 100, 0, 100);
  const normalWidth = percentOfNormalMax - percentOfNormalMin;

  const isLow = numVal < normalMin;
  const isHigh = numVal > normalMax;
  const isOptimal = !isLow && !isHigh;

  const markerColor = isOptimal ? 'var(--rgb-green, #10B981)' : isHigh ? 'var(--rgb-red, #EF4444)' : 'var(--rgb-amber, #F59E0B)';

  return (
    <div className="medical-reading-bar">
      {/* Top Labels: Min, Reference Range, Max */}
      <div className="reading-bar-labels">
        <span>Min: {minVal}</span>
        <span style={{ color: isOptimal ? 'var(--rgb-green, #10B981)' : 'var(--text-secondary)' }}>
          Normal: {normalMin} – {normalMax} {unit}
        </span>
        <span>Max: {maxVal}</span>
      </div>

      {/* Main Bar Track with RGB gradients */}
      <div className="reading-bar-track">
        {/* Safe Reference Zone (Green/Teal Tint) */}
        <div
          className="reading-bar-zone-normal"
          style={{
            left: `${percentOfNormalMin}%`,
            width: `${normalWidth}%`,
          }}
          title={`Normal clinical range: ${normalMin} - ${normalMax} ${unit}`}
        />

        {/* Current Value Marker Pointer */}
        <div
          className="reading-bar-marker"
          style={{
            left: `${percentOfVal}%`,
            background: markerColor,
            boxShadow: `0 0 8px ${markerColor}66`,
          }}
          title={`${name}: ${numVal} ${unit} (${isOptimal ? 'Normal' : isHigh ? 'High' : 'Low'})`}
        />
      </div>

      {/* Bottom readout ticker */}
      <div className="d-flex justify-content-between align-items-center mt-1.5" style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
          Deviation: {isOptimal ? 'Within Reference' : isHigh ? `+${(numVal - normalMax).toFixed(1)} Above Limit` : `-${(normalMin - numVal).toFixed(1)} Below Limit`}
        </span>
        <span className="fw-bold" style={{ color: markerColor }}>
          {numVal} {unit}
        </span>
      </div>
    </div>
  );
}
