import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const TYPE_COLORS = {
  prediction: '#f59e0b',
  pathology: '#38bdf8',
  prescription: '#a855f7',
};

function flattenRecords(patientData) {
  const records = [];

  // Predictions
  if (Array.isArray(patientData?.predictions)) {
    patientData.predictions.forEach((item) => {
      records.push({
        ...item,
        _type: 'prediction',
        _title: item.disease_type || 'Risk Assessment',
        _summary: `${item.risk_score}% — ${item.risk_level}`,
      });
    });
  }

  // Pathology reports
  if (Array.isArray(patientData?.pathology)) {
    patientData.pathology.forEach((item) => {
      const count = Array.isArray(item.report_data) ? item.report_data.length : 0;
      records.push({
        ...item,
        _type: 'pathology',
        _title: 'Pathology Report',
        _summary: `${count} biomarker${count !== 1 ? 's' : ''}`,
      });
    });
  }

  // Prescriptions
  if (Array.isArray(patientData?.prescriptions)) {
    patientData.prescriptions.forEach((item) => {
      const meds = item.extracted_data?.medicines;
      const count = Array.isArray(meds) ? meds.length : 0;
      records.push({
        ...item,
        _type: 'prescription',
        _title: 'Prescription',
        _summary: `${count} medication${count !== 1 ? 's' : ''}`,
      });
    });
  }

  // Sort by created_at descending, slice to 20
  records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return records.slice(0, 20);
}

function RecordDetails({ item }) {
  if (item._type === 'prediction') {
    return (
      <div style={{ marginTop: '8px', fontSize: '0.78rem' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Disease: <strong style={{ color: 'var(--text-primary)' }}>{item.disease_type}</strong></span>
          <span style={{ color: 'var(--text-secondary)' }}>Score: <strong style={{ color: TYPE_COLORS.prediction }}>{item.risk_score}%</strong></span>
          <span style={{ color: 'var(--text-secondary)' }}>Level: <strong style={{ color: 'var(--text-primary)' }}>{item.risk_level}</strong></span>
        </div>
        {item.clinical_reasoning && (
          <p style={{ marginTop: '6px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4' }}>
            {item.clinical_reasoning}
          </p>
        )}
      </div>
    );
  }

  if (item._type === 'pathology') {
    const biomarkers = Array.isArray(item.report_data) ? item.report_data : [];
    return (
      <div style={{ marginTop: '8px', fontSize: '0.78rem' }}>
        {biomarkers.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No biomarker details available.</span>
        ) : (
          <ul style={{ margin: 0, padding: '0 0 0 16px', color: 'var(--text-secondary)' }}>
            {biomarkers.map((b, i) => (
              <li key={i}>
                {b.name}: <strong style={{ color: TYPE_COLORS.pathology, fontFamily: 'monospace' }}>{b.value}</strong>
                {b.unit ? ` ${b.unit}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (item._type === 'prescription') {
    const meds = item.extracted_data?.medicines;
    return (
      <div style={{ marginTop: '8px', fontSize: '0.78rem' }}>
        {!Array.isArray(meds) || meds.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No medication details available.</span>
        ) : (
          <ul style={{ margin: 0, padding: '0 0 0 16px', color: 'var(--text-secondary)' }}>
            {meds.map((m, i) => (
              <li key={i}>
                <strong style={{ color: TYPE_COLORS.prescription }}>{m.name || m}</strong>
                {m.dosage ? ` — ${m.dosage}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return null;
}

export default function HealthTimeline({ patientData, loading }) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-info" role="status" style={{ width: '1.5rem', height: '1.5rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-2 text-secondary" style={{ fontSize: '0.85rem' }}>Loading records…</span>
      </div>
    );
  }

  const records = flattenRecords(patientData);

  if (records.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-secondary m-0" style={{ fontSize: '0.85rem' }}>No health records found yet.</p>
        <p className="text-secondary mt-1" style={{ fontSize: '0.78rem', opacity: 0.6 }}>
          Upload a pathology report or complete a health assessment to see your timeline.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '20px' }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute',
        left: '6px',
        top: 0,
        bottom: 0,
        width: '2px',
        background: 'var(--border-color, rgba(255,255,255,0.1))',
        borderRadius: '1px',
      }} />

      {records.map((item, idx) => {
        const color = TYPE_COLORS[item._type] || '#aaa';
        const key = `${item._type}-${item.id || idx}`;
        const isExpanded = expandedId === key;
        const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown date';

        return (
          <div key={key} style={{ marginBottom: '12px', position: 'relative' }}>
            {/* Dot */}
            <div style={{
              position: 'absolute',
              left: '-17px',
              top: '10px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }} />

            {/* Card */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : key)}
              style={{
                background: 'var(--bg-card-hover, rgba(255,255,255,0.04))',
                border: `1px solid var(--border-color, rgba(255,255,255,${isExpanded ? '0.12' : '0.07'}))`,
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '0.6rem',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color,
                    marginBottom: '2px',
                  }}>
                    {item._type}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item._title}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace', display: 'block' }}>{date}</span>
                  <span style={{ fontSize: '0.72rem', color, fontFamily: 'monospace' }}>{item._summary}</span>
                </div>
              </div>

              {isExpanded && <RecordDetails item={item} />}

              {isExpanded && (
                <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.07))', paddingTop: '6px' }}>
                  <Link to="/profile?tab=vault" style={{ fontSize: '0.72rem', color: 'var(--accent-teal, #38bdf8)', textDecoration: 'none' }}>
                    View full record →
                  </Link>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
