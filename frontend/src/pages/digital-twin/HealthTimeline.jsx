import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  FlaskConical,
  Pill,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api';

const TYPE_CONFIG = {
  prediction: {
    color: 'var(--brand-orange, #f4954a)',
    bg: 'rgba(244, 149, 74, 0.12)',
    border: 'rgba(244, 149, 74, 0.35)',
    label: 'Risk Prediction',
    icon: <Activity size={13} />,
  },
  pathology: {
    color: 'var(--accent-teal, #38bdf8)',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    label: 'Pathology Lab',
    icon: <FlaskConical size={13} />,
  },
  observation: {
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    label: 'Discrete Observation',
    icon: <FlaskConical size={13} />,
  },
  condition: {
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.12)',
    border: 'rgba(167, 139, 250, 0.35)',
    label: 'Clinical Diagnosis',
    icon: <FileText size={13} />,
  },
  prescription: {
    color: 'var(--accent-emerald, #10b981)',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    label: 'Prescription',
    icon: <Pill size={13} />,
  },
};

function formatRecordDate(dateStr) {
  if (!dateStr) return { date: 'Undated', time: '' };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: 'Undated', time: '' };
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  } catch {
    return { date: 'Undated', time: '' };
  }
}

export default function HealthTimeline({ patientData, selectedOrgan, loading }) {
  const [expandedId, setExpandedId] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [filterOrganOnly, setFilterOrganOnly] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const url = filterOrganOnly && selectedOrgan
      ? `/health-twin/timeline/?organ=${selectedOrgan}`
      : `/health-twin/timeline/`;

    setFetchLoading(true);
    api.get(url)
      .then((res) => {
        if (isMounted) {
          setTimelineEvents(res.data.events || []);
          setFetchLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          // Fallback to local flattening
          setTimelineEvents([]);
          setFetchLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [filterOrganOnly, selectedOrgan]);

  if (loading || fetchLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-info" role="status" style={{ width: '1.5rem', height: '1.5rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-2 text-secondary" style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
          Loading chronological records…
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Filter toggle bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
          {timelineEvents.length} RECORDED EVENTS
        </span>
        {selectedOrgan && (
          <button
            onClick={() => setFilterOrganOnly(!filterOrganOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '4px',
              border: filterOrganOnly ? '1px solid var(--brand-orange)' : '1px solid rgba(255,255,255,0.1)',
              background: filterOrganOnly ? 'rgba(244,149,74,0.15)' : 'transparent',
              color: filterOrganOnly ? 'var(--brand-orange)' : 'var(--text-secondary)',
              fontSize: '0.64rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            <Filter size={10} />
            <span>{filterOrganOnly ? `${selectedOrgan} Only` : 'Filter Organ'}</span>
          </button>
        )}
      </div>

      {timelineEvents.length === 0 ? (
        <div className="text-center py-4" style={{ padding: '20px' }}>
          <Activity size={24} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
          <p className="text-primary m-0 fw-semibold" style={{ fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>
            No Events for this Filter
          </p>
          <p className="text-secondary mt-1" style={{ fontSize: '0.75rem', lineHeight: '1.45', margin: '4px 0 0' }}>
            {filterOrganOnly ? `No specific records found for ${selectedOrgan}. Toggle to view all records.` : 'Upload a lab report or run a risk assessment.'}
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '18px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Timeline spine vertical line */}
          <div style={{
            position: 'absolute',
            left: '7px',
            top: '6px',
            bottom: '6px',
            width: '2px',
            background: 'var(--border-color, rgba(255,255,255,0.1))',
            borderRadius: '1px',
          }} />

          {timelineEvents.map((item, idx) => {
            const conf = TYPE_CONFIG[item.event_type] || TYPE_CONFIG.prediction;
            const key = item.id || `idx-${idx}`;
            const isExpanded = expandedId === key;
            const { date, time } = formatRecordDate(item.timestamp);

            return (
              <div key={key} style={{ marginBottom: '10px', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '-16px',
                  top: '12px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: conf.color,
                  border: '2px solid var(--bg-card)',
                  boxShadow: `0 0 6px ${conf.color}50`,
                }} />

                <div
                  onClick={() => setExpandedId(isExpanded ? null : key)}
                  style={{
                    background: isExpanded ? 'var(--bg-card-tinted)' : 'var(--bg-card)',
                    border: `1px solid ${isExpanded ? conf.color : 'var(--border-color)'}`,
                    borderRadius: '9px',
                    padding: '9px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.62rem',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: conf.color,
                          background: conf.bg,
                          border: `1px solid ${conf.border}`,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}>
                          {conf.icon}
                          {conf.label}
                        </span>
                        {item.organ_system && (
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                            · {item.organ_system}
                          </span>
                        )}
                      </div>

                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                        {item.title}
                      </p>

                      <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                        {item.summary}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {date}
                      </span>
                      {time && (
                        <span style={{ display: 'block', fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {time}
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.74rem' }}>
                      {item.clinical_reasoning && (
                        <p style={{ margin: '0 0 6px', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                          {item.clinical_reasoning}
                        </p>
                      )}
                      {item.notes && (
                        <p style={{ margin: '0 0 6px', color: 'var(--text-secondary)' }}>
                          Clinical Notes: {item.notes}
                        </p>
                      )}
                      {item.model_version && (
                        <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Model: {item.model_version} · Provenance: {item.dataset_provenance || 'Benchmark'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
