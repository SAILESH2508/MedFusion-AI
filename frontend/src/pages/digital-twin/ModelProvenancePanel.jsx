/**
 * ModelProvenancePanel.jsx — ML Model Provenance, Datasets & Evaluation Metrics
 * MedFusion AI Clinical Informatics Pipeline
 *
 * Transparently exposes the training cohorts, feature schemas, validation splits,
 * ROC-AUC / Accuracy / Sensitivity metrics, and clinical limitations.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  FileText,
  BarChart2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
} from 'lucide-react';

export default function ModelProvenancePanel() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('heart_attack');

  useEffect(() => {
    let isMounted = true;
    api.get('/health-twin/models/')
      .then((res) => {
        if (isMounted) {
          setModels(res.data.registry || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '30px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '2px solid var(--border-color)',
            borderTopColor: 'var(--brand-orange)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }}
        />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Loading traceable medical dataset metadata…
        </p>
      </div>
    );
  }

  const current = models.find((m) => m.id === selectedModel) || models[0];

  return (
    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Database size={16} style={{ color: 'var(--brand-orange)' }} />
        <h6 style={{ margin: 0, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', fontSize: '0.9rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
          Traceable Medical Datasets &amp; Validation Pipeline
        </h6>
      </div>

      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
        All risk scores displayed in MedFusion AI are evaluated against verified clinical benchmarks from the <strong>UCI Machine Learning Repository</strong> and <strong>National Institutes of Health (NIH)</strong>.
      </p>

      {/* Model Selection Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {models.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedModel(m.id)}
            style={{
              padding: '5px 11px',
              borderRadius: '6px',
              border: selectedModel === m.id ? '1px solid var(--brand-orange)' : '1px solid rgba(255,255,255,0.1)',
              background: selectedModel === m.id ? 'rgba(244,149,74,0.15)' : 'var(--bg-card-tinted)',
              color: selectedModel === m.id ? 'var(--brand-orange)' : 'var(--text-secondary)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: selectedModel === m.id ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {m.disease_label.split('&')[0].trim()}
          </button>
        ))}
      </div>

      {current && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Card: Provenance & Target */}
          <div style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border-card, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '14px' }}>
            <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Scientific Citation &amp; Provenance
            </span>
            <h6 style={{ margin: '3px 0 6px', fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              {current.dataset_name}
            </h6>
            <p style={{ margin: '0 0 6px', fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {current.citation}
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', marginTop: '6px' }}>
              <span style={{ color: 'var(--accent-teal)' }}>Repository: {current.repository}</span>
              <span style={{ color: 'var(--accent-emerald)' }}>License: {current.license}</span>
              <span style={{ color: 'var(--text-secondary)' }}>Cohort Size: N={current.sample_size}</span>
            </div>
          </div>

          {/* Card: Evaluation Metrics */}
          <div style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border-card, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '14px' }}>
            <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Empirical Evaluation Metrics (Holdout Test Split)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '8px' }}>
              {[
                { label: 'ROC-AUC', val: (current.evaluation_metrics.roc_auc * 100).toFixed(1) + '%', col: 'var(--accent-teal)' },
                { label: 'Accuracy', val: (current.evaluation_metrics.accuracy * 100).toFixed(1) + '%', col: 'var(--brand-orange)' },
                { label: 'Sensitivity', val: (current.evaluation_metrics.sensitivity * 100).toFixed(1) + '%', col: 'var(--accent-emerald)' },
                { label: 'Specificity', val: (current.evaluation_metrics.specificity * 100).toFixed(1) + '%', col: '#a78bfa' },
              ].map((metric, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ display: 'block', fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: metric.col }}>
                    {metric.val}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    {metric.label}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Architecture: {current.model_architecture} ({current.model_version})
            </p>
          </div>

          {/* Card: Target Population & Known Limitations */}
          <div style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border-card, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '14px' }}>
            <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Clinical Population &amp; Known Limitations
            </span>
            <p style={{ margin: '6px 0 8px', fontSize: '0.74rem', color: 'var(--text-primary)' }}>
              <strong>Target Cohort:</strong> {current.target_population}
            </p>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {current.known_limitations.map((lim, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{lim}</li>
              ))}
            </ul>
          </div>

          {/* Explicit Clinical Responsibility Disclaimer */}
          <div style={{ background: 'rgba(244,149,74,0.06)', border: '1px solid rgba(244,149,74,0.25)', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertTriangle size={15} color="var(--brand-orange)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
              <strong>Clinical Responsibility Notice:</strong> MedFusion AI predictive risk calculations are machine learning estimates for educational awareness and preventative triage. They do NOT constitute an FDA-cleared diagnostic device and must not replace professional in-person medical evaluation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
