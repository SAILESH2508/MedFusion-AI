import React from 'react';
import {
  HeartPulse, Activity, Salad, Sprout, ShieldAlert, CheckCircle2,
  AlertCircle, AlertTriangle, Clock, ArrowRight, UserCheck, Droplet,
  Flame, Award, Calendar, ChevronRight
} from 'lucide-react';

export default function PersonalHealthOverview({
  patientData,
  gardenData,
  onSwitchTab,
  onSelectOrgan,
}) {
  const profile = patientData?.profile || {};
  const metrics = patientData?.system_metrics || {};
  const organs = patientData?.organs || {};

  // Extract key indicators from pathology & predictions
  const observations = patientData?.pathology || [];
  const predictions = patientData?.predictions || [];

  return (
    <div className="d-flex flex-column gap-4">
      {/* ─── Profile & Clinical Summary Hero ─── */}
      <div
        className="glass-card p-4 rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-3"
        style={{
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <div
            className="p-3 rounded-circle d-flex align-items-center justify-content-center"
            style={{
              background: 'rgba(44, 111, 181, 0.12)',
              border: '1.5px solid var(--brand-blue)',
              color: 'var(--brand-blue)',
            }}
          >
            <HeartPulse size={26} />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h2 className="fw-bold m-0" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                {profile.full_name || 'Patient Digital Twin'}
              </h2>
              {profile.blood_group && (
                <span
                  className="badge font-monospace"
                  style={{
                    background: 'rgba(192, 57, 43, 0.12)',
                    color: 'var(--accent-red)',
                    border: '1px solid var(--accent-red)',
                    fontSize: '0.68rem',
                  }}
                >
                  Blood Type: {profile.blood_group}
                </span>
              )}
            </div>
            <p className="text-secondary font-monospace m-0" style={{ fontSize: '0.78rem' }}>
              Clinically synthesized digital twin combining discrete EHR labs, metabolic dietary records, and habit telemetry.
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="text-end font-monospace" style={{ fontSize: '0.72rem' }}>
            <span className="text-secondary d-block">Clinical Systems Monitored</span>
            <strong style={{ color: 'var(--text-primary)' }}>8 Functional Anatomical Units</strong>
          </div>
        </div>
      </div>

      {/* ─── Tri-Pillar Integrated Health Status ─── */}
      <div className="row g-3">
        {/* Pillar 1: Clinical Anatomy */}
        <div className="col-12 col-md-4">
          <div
            className="glass-card p-3.5 d-flex flex-column justify-content-between h-100 cursor-pointer transition-all"
            style={{ borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
            onClick={() => onSwitchTab('organs')}
          >
            <div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="badge font-monospace text-uppercase" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontSize: '0.68rem' }}>
                  Anatomical Systems
                </span>
                <ChevronRight size={14} className="text-secondary" />
              </div>

              <div className="fw-bold mb-1" style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                Clinical Organ Telemetry
              </div>
              <p className="text-secondary font-monospace" style={{ fontSize: '0.74rem', minHeight: '34px' }}>
                {metrics.optimal_count ?? 8} optimal systems, {metrics.attention_count ?? 0} attention flagged, {metrics.alert_count ?? 0} critical alerts.
              </p>
            </div>

            <div className="pt-2 border-top border-white-5 d-flex align-items-center justify-content-between font-monospace" style={{ fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--brand-orange)' }}>Inspect 8 Organs →</span>
              <span className="text-secondary">{metrics.total_systems || 8} Active Units</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Nutrition & Diet */}
        <div className="col-12 col-md-4">
          <div
            className="glass-card p-3.5 d-flex flex-column justify-content-between h-100 cursor-pointer transition-all"
            style={{ borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
            onClick={() => onSwitchTab('diet')}
          >
            <div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="badge font-monospace text-uppercase" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.68rem' }}>
                  Metabolic Nutrition
                </span>
                <ChevronRight size={14} className="text-secondary" />
              </div>

              <div className="fw-bold mb-1" style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                Personalized Diet Regimen
              </div>
              <p className="text-secondary font-monospace" style={{ fontSize: '0.74rem', minHeight: '34px' }}>
                Cultural regional meal planning tailored to clinical diagnoses, allergens, and caloric thresholds.
              </p>
            </div>

            <div className="pt-2 border-top border-white-5 d-flex align-items-center justify-content-between font-monospace" style={{ fontSize: '0.72rem' }}>
              <span style={{ color: '#10b981' }}>View Meal Plan →</span>
              <span className="text-secondary">7-Day Schedule</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Habit Garden */}
        <div className="col-12 col-md-4">
          <div
            className="glass-card p-3.5 d-flex flex-column justify-content-between h-100 cursor-pointer transition-all"
            style={{ borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
            onClick={() => onSwitchTab('garden')}
          >
            <div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="badge font-monospace text-uppercase" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.68rem' }}>
                  Habits & Streaks
                </span>
                <ChevronRight size={14} className="text-secondary" />
              </div>

              <div className="fw-bold mb-1" style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                Wellness Garden Ecosystem
              </div>
              <p className="text-secondary font-monospace" style={{ fontSize: '0.74rem', minHeight: '34px' }}>
                {gardenData?.current_streak || 0}-day active streak · {gardenData?.total_points || 0} cumulative habit points logged.
              </p>
            </div>

            <div className="pt-2 border-top border-white-5 d-flex align-items-center justify-content-between font-monospace" style={{ fontSize: '0.72rem' }}>
              <span style={{ color: '#f59e0b' }}>Log Health Action →</span>
              <span className="text-secondary">Stage: {gardenData?.stage?.name || 'Seed'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Key Health Indicators Matrix ─── */}
      <div className="glass-card p-4 rounded-3" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="fw-bold m-0" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              Discrete Health Indicators & Biomarkers
            </h3>
            <span className="text-secondary font-monospace" style={{ fontSize: '0.74rem' }}>
              Continuous clinical monitoring across laboratory values and resting vitals
            </span>
          </div>
          <button
            onClick={() => onSwitchTab('organs')}
            className="btn-clinical secondary py-1.5 px-3 font-monospace text-uppercase"
            style={{ fontSize: '0.72rem', borderRadius: '6px' }}
          >
            View All Organ Observations
          </button>
        </div>

        <div className="row g-2.5">
          {[
            { name: 'Systolic Blood Pressure', value: '118', unit: 'mmHg', target: '90 - 120 mmHg', status: 'OPTIMAL', organ: 'heart', date: 'Latest Vitals' },
            { name: 'Fasting Blood Glucose', value: '92', unit: 'mg/dL', target: '70 - 99 mg/dL', status: 'OPTIMAL', organ: 'pancreas', date: 'EHR Lab Panel' },
            { name: 'Serum Creatinine', value: '0.9', unit: 'mg/dL', target: '0.6 - 1.2 mg/dL', status: 'OPTIMAL', organ: 'kidneys', date: 'EHR Lab Panel' },
            { name: 'Total Cholesterol', value: '185', unit: 'mg/dL', target: '120 - 200 mg/dL', status: 'OPTIMAL', organ: 'heart', date: 'Lipid Profile' },
            { name: 'Alanine Aminotransferase (ALT)', value: '28', unit: 'U/L', target: '7 - 56 U/L', status: 'OPTIMAL', organ: 'liver', date: 'Hepatic Function' },
            { name: 'Blood Oxygen (SpO2)', value: '98', unit: '%', target: '95 - 100 %', status: 'OPTIMAL', organ: 'lungs', date: 'Pulse Oximetry' },
          ].map((item, idx) => (
            <div key={idx} className="col-12 col-md-6 col-xl-4">
              <div
                className="p-3 rounded-2 font-monospace transition-all cursor-pointer"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
                onClick={() => {
                  onSelectOrgan(item.organ);
                  onSwitchTab('organs');
                }}
              >
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="text-secondary text-truncate" style={{ fontSize: '0.74rem', maxWidth: '180px' }}>
                    {item.name}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: 'var(--status-success)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      fontSize: '0.62rem',
                    }}
                  >
                    NORMAL
                  </span>
                </div>

                <div className="d-flex align-items-baseline gap-1 mb-1">
                  <span className="fw-bold" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                    {item.value}
                  </span>
                  <span className="text-secondary" style={{ fontSize: '0.72rem' }}>
                    {item.unit}
                  </span>
                </div>

                <div className="d-flex justify-content-between text-secondary" style={{ fontSize: '0.66rem' }}>
                  <span>Ref: {item.target}</span>
                  <span>{item.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
