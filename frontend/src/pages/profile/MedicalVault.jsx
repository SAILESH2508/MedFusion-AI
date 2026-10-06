import React, { useState, useMemo } from 'react';
import { Database, Upload, ChevronUp, ChevronDown, Pill, CheckCircle, FileText, TrendingUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Biomarker direction rules ───────────────────────────────────────────────
// lower=better: glucose, hba1c, cholesterol, ldl, triglycerides, creatinine, urea
// higher=better: hdl, hemoglobin (within range — but we keep conservative; only
//                HDL is clear-cut "higher = better" with no ambiguity)
// everything else: Changed
const LOWER_IS_BETTER = new Set(['glucose', 'fbs', 'rbs', 'hba1c', 'cholesterol', 'ldl', 'triglycerides', 'creatinine', 'urea', 'bun']);
const HIGHER_IS_BETTER = new Set(['hdl']);

function getBiomarkerStatus(biomarkerKey, latest, previous) {
  if (previous === null || previous === undefined) return 'Stable';
  if (latest === previous) return 'Stable';

  const key = biomarkerKey.toLowerCase().trim();

  // Check each word/token in the key against our sets
  const tokens = key.split(/[\s/,_-]+/);
  const matchesLower = tokens.some(t => LOWER_IS_BETTER.has(t)) || LOWER_IS_BETTER.has(key);
  const matchesHigher = tokens.some(t => HIGHER_IS_BETTER.has(t)) || HIGHER_IS_BETTER.has(key);

  if (matchesLower) {
    return latest < previous ? 'Improving' : 'Worsening';
  }
  if (matchesHigher) {
    return latest > previous ? 'Improving' : 'Worsening';
  }
  return 'Changed';
}

const STATUS_COLORS = {
  Improving: '#00c896',
  Worsening: '#ff4d6d',
  Stable: '#64748b',
  Changed: '#f59e0b',
};

// ─── Pure SVG line chart ──────────────────────────────────────────────────────
function BiomarkerChart({ data }) {
  if (!data || data.length < 2) return null;

  const PADDING = { top: 10, right: 16, bottom: 28, left: 36 };
  const WIDTH = 520;
  const HEIGHT = 120;
  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal || 1;

  const xStep = chartW / (data.length - 1);

  const toX = (i) => PADDING.left + i * xStep;
  const toY = (v) => PADDING.top + chartH - ((v - minVal) / valRange) * chartH;

  const polyPoints = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');

  // Area fill path
  const areaPath =
    `M${toX(0)},${toY(data[0].value)} ` +
    data.slice(1).map((d, i) => `L${toX(i + 1)},${toY(d.value)}`).join(' ') +
    ` L${toX(data.length - 1)},${PADDING.top + chartH} L${toX(0)},${PADDING.top + chartH} Z`;

  // Y-axis labels (3 ticks)
  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal].map((v, i) => ({
    value: v.toFixed(1),
    y: toY(v),
  }));

  // X-axis date labels — show at most 5 dates evenly
  const maxLabels = Math.min(5, data.length);
  const labelIndices = Array.from({ length: maxLabels }, (_, i) =>
    Math.round((i / (maxLabels - 1)) * (data.length - 1))
  );

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: '100%', height: '120px', display: 'block' }}
      aria-label="Biomarker trend chart"
    >
      <defs>
        <linearGradient id="bioAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--theme-accent, #00f5d4)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--theme-accent, #00f5d4)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <line
          key={i}
          x1={PADDING.left}
          y1={t.y}
          x2={PADDING.left + chartW}
          y2={t.y}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((t, i) => (
        <text
          key={i}
          x={PADDING.left - 4}
          y={t.y + 3}
          textAnchor="end"
          fill="rgba(255,255,255,0.35)"
          fontSize="9"
          fontFamily="monospace"
        >
          {t.value}
        </text>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#bioAreaGrad)" />

      {/* Line */}
      <polyline
        points={polyPoints}
        fill="none"
        stroke="var(--theme-accent, #00f5d4)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(d.value)}
          r="3.5"
          fill="var(--theme-accent, #00f5d4)"
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="1"
        />
      ))}

      {/* X-axis date labels */}
      {labelIndices.map((idx) => {
        const d = data[idx];
        const x = toX(idx);
        return (
          <text
            key={idx}
            x={x}
            y={HEIGHT - 2}
            textAnchor="middle"
            fill="rgba(255,255,255,0.35)"
            fontSize="8"
            fontFamily="monospace"
          >
            {d.date}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function MedicalVault({
  archive,
  loadingArchive,
  expandedId,
  setExpandedId
}) {
  const [selectedBiomarker, setSelectedBiomarker] = useState('');
  const [showTrends, setShowTrends] = useState(false);

  // ── Build trendData from archive (client-side, no extra API call) ──────────
  const trendData = useMemo(() => {
    const map = {};
    archive.forEach((record) => {
      if (record.type !== 'pathology') return;

      let reportData = [];
      try {
        reportData = typeof record.report_data === 'string'
          ? JSON.parse(record.report_data || '[]')
          : (record.report_data || []);
      } catch (e) { reportData = []; }

      const date = record.created_at ? record.created_at.split('T')[0] : '';

      reportData.forEach((b) => {
        if (!b || !b.name) return;
        const numVal = parseFloat(b.value);
        if (isNaN(numVal)) return;

        const key = b.name.trim();
        if (!map[key]) {
          map[key] = {
            name: key,
            unit: b.unit || '',
            data: [],
          };
        }
        map[key].data.push({
          date,
          value: numVal,
          source_id: record.id,
        });
      });
    });

    // Sort each biomarker's data chronologically
    Object.values(map).forEach((bm) => {
      bm.data.sort((a, b) => (a.date > b.date ? 1 : -1));
    });

    return map;
  }, [archive]);

  const biomarkerNames = useMemo(() => Object.keys(trendData).sort(), [trendData]);
  const hasBiomarkers = biomarkerNames.length > 0;

  // ── Trend panel data ───────────────────────────────────────────────────────
  const selectedData = selectedBiomarker ? trendData[selectedBiomarker] : null;
  const trendPoints = selectedData ? selectedData.data : [];
  const latest = trendPoints.length > 0 ? trendPoints[trendPoints.length - 1] : null;
  const previous = trendPoints.length > 1 ? trendPoints[trendPoints.length - 2] : null;

  const absChange = latest && previous ? (latest.value - previous.value) : null;
  const pctChange = (absChange !== null && previous && previous.value !== 0)
    ? ((absChange / previous.value) * 100)
    : null;

  const status = selectedBiomarker && latest
    ? getBiomarkerStatus(selectedBiomarker, latest.value, previous?.value ?? null)
    : null;

  return (
    <div className="glass-card p-4 text-start vault-glass-card theme-cancer">
      <div className="d-flex justify-content-between align-items-center border-bottom border-white-10 pb-3 mb-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold text-white d-flex align-items-center gap-2 m-0" style={{ fontSize: '1.35rem' }}>
            <Database className="text-theme-accent" />
            Patient Medical Vault
          </h3>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Link to="/upload" className="px-3 py-2 bg-theme-accent text-white border-0 rounded font-monospace text-uppercase text-decoration-none hover-white font-bold d-flex align-items-center gap-2" style={{ fontSize: '0.8rem' }}>
            <Upload size={14} /> Scan New Report
          </Link>
        </div>
      </div>

      {/* ── Archive list ─────────────────────────────────────────────────── */}
      <div className="d-flex flex-column gap-3 vault-list-container" style={{ maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
        {loadingArchive ? (
          <div className="text-center py-5 font-monospace text-secondary small">
            Retrieving clinical records database...
          </div>
        ) : archive.length === 0 ? (
          <div className="text-center py-5 bg-white-5 rounded border border-white-5 font-monospace text-secondary">
            <FileText size={32} className="mx-auto mb-3 opacity-40 text-theme-accent animate-pulse" />
            <p className="m-0 italic">No medical records archived in this profile.</p>
            <small className="d-block mt-1 mb-4 opacity-70">Upload reports using the AI scanner tool to log them permanently here.</small>
            <Link to="/upload" className="btn-clinical primary mx-auto py-2.5 px-4 d-inline-flex align-items-center gap-2 font-monospace text-uppercase text-decoration-none" style={{ fontSize: '0.85rem', width: 'auto' }}>
              <Upload size={16} /> Scan New Document
            </Link>
          </div>
        ) : (
          archive.map((record) => {
            const isRx = record.type === 'prescription';
            const recKey = `${isRx ? 'rx' : 'path'}-${record.id}`;
            const isExpanded = expandedId === recKey;

            let parsedData = {};
            try {
              parsedData = typeof record.extracted_data === 'string'
                ? JSON.parse(record.extracted_data || '{}')
                : (record.extracted_data || {});
            } catch (e) { parsedData = {}; }

            let parsedReportData = [];
            try {
              parsedReportData = typeof record.report_data === 'string'
                ? JSON.parse(record.report_data || '[]')
                : (record.report_data || []);
            } catch (e) { parsedReportData = []; }

            let parsedAnalysis = {};
            try {
              parsedAnalysis = typeof record.analysis === 'string'
                ? JSON.parse(record.analysis || '{}')
                : (record.analysis || {});
            } catch (e) { parsedAnalysis = {}; }

            return (
              <div key={recKey} className="vault-record-card font-monospace hover-border-accent" style={{ fontSize: '0.88rem' }}>
                <div className="d-flex justify-content-between align-items-center cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : recKey)}>
                  <div className="d-flex align-items-center gap-3">
                    <div className={`p-2.5 rounded-circle ${isRx ? 'bg-info bg-opacity-10 text-info' : 'bg-success bg-opacity-10 text-success'}`}>
                      {isRx ? <FileText size={18} /> : <Database size={18} />}
                    </div>
                    <div>
                      <strong className="text-white text-uppercase fs-6">
                        {isRx ? 'Physician Prescription' : 'Lab Pathology Report'}
                      </strong>
                      <span className="text-secondary small d-block font-monospace mt-1">Archived: {new Date(record.created_at).toLocaleString([], { hour12: false })}</span>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <span className="text-secondary d-none d-sm-inline">Record ID: <strong className="text-white">#{record.id}</strong></span>
                    <span className={`badge px-3 py-1.5 ${isRx ? 'badge-clinical-info' : 'badge-clinical-success'}`} style={{ fontSize: '0.75rem' }}>
                      {isRx ? 'PRESCRIPTION' : 'LAB_PATHOLOGY'}
                    </span>
                    <ChevronDown
                      size={20}
                      className="text-secondary"
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease'
                      }}
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-top border-white-10 pt-4 animate-fadeIn text-start">
                    {isRx ? (
                      <div>
                        {parsedData.physician && (
                          <div className="mb-3.5 inner-vault-card">
                            <span className="text-secondary small d-block mb-0.5">PRESCRIBING PHYSICIAN</span>
                            <strong className="text-white fs-6">Dr. {parsedData.physician}</strong>
                          </div>
                        )}

                        <h5 className="text-theme-accent fw-bold mb-3 d-flex align-items-center gap-1.5" style={{ fontSize: '0.95rem' }}>
                          <Pill size={15} />
                          Active Pharmacological Agents & Dosages
                        </h5>
                        <div className="row g-3">
                          {parsedData.medicines && parsedData.medicines.length > 0 ? (
                            parsedData.medicines.map((m, idx) => (
                              <div className="col-12 col-xl-6 d-flex" key={idx}>
                                <div className="inner-vault-card d-flex flex-column justify-content-between gap-2 w-100">
                                  <div className="d-flex justify-content-between align-items-start gap-2">
                                    <strong className="text-white small text-wrap">{m.name}</strong>
                                    <span className="badge bg-white-10 border border-white-10 text-secondary py-1 px-2 font-bold flex-shrink-0" style={{ fontSize: '0.72rem' }}>{m.frequency || 'N/A'}</span>
                                  </div>
                                  <span className="text-secondary small mt-auto">Dosage: {m.dosage || 'N/A'}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-12 text-secondary italic">No extracted medicines.</div>
                          )}
                        </div>

                        {parsedData.recommendations && parsedData.recommendations.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-success fw-bold mb-2.5" style={{ fontSize: '0.95rem' }}>Physician Guidance & Care Directives</h5>
                            <div className="inner-vault-card text-secondary small" style={{ lineHeight: '1.6' }}>
                              {Array.isArray(parsedData.recommendations)
                                ? parsedData.recommendations.join(', ')
                                : String(parsedData.recommendations)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <h5 className="text-theme-accent fw-bold mb-3 d-flex align-items-center gap-1.5" style={{ fontSize: '0.95rem' }}>
                          <Database size={15} />
                          Physiological Biomarkers Analyzed
                        </h5>
                        <div className="row g-3 mb-4">
                          {(() => {
                            const seenNames = new Set();
                            const uniqueBiomarkers = parsedReportData.filter(b => {
                              if (!b || !b.name) return false;
                              const nameKey = b.name.toLowerCase().trim();
                              if (seenNames.has(nameKey)) return false;
                              seenNames.add(nameKey);
                              return true;
                            });
                            return uniqueBiomarkers.map((b, idx) => {
                              const nameLower = (b.name || '').toLowerCase();
                              const val = parseFloat(b.value);
                              let isAbnormal = false;
                              if (!isNaN(val)) {
                                if (nameLower.includes('glucose') || nameLower.includes('fbs')) isAbnormal = val > 100 || val < 70;
                                else if (nameLower.includes('hba1c')) isAbnormal = val >= 5.7;
                                else if (nameLower.includes('cholesterol')) isAbnormal = val >= 200;
                                else if (nameLower.includes('hemoglobin') || (nameLower.includes('hb') && !nameLower.includes('hba'))) isAbnormal = val > 17.5 || val < 11.5;
                                else if (nameLower.includes('wbc') || nameLower.includes('white blood')) isAbnormal = val > 11000 || val < 4000;
                                else if (nameLower.includes('rbc') || nameLower.includes('red blood')) isAbnormal = val > 6.1 || val < 4.0;
                                else if (nameLower.includes('platelet')) isAbnormal = val > 450000 || val < 150000;
                              }
                              return (
                                <div className="col-12 col-xl-6 d-flex" key={idx}>
                                  <div className="inner-vault-card d-flex flex-column justify-content-between gap-2 w-100">
                                    <div className="d-flex justify-content-between align-items-start gap-2">
                                      <span className="text-secondary small text-capitalize text-wrap">{b.name}</span>
                                      <span className={`badge ${isAbnormal ? 'badge-clinical-danger' : 'badge-clinical-success'} py-1 px-2 flex-shrink-0`} style={{ fontSize: '0.7rem' }}>
                                        {isAbnormal ? 'ABNORMAL' : 'NORMAL'}
                                      </span>
                                    </div>
                                    <strong className="text-white fs-6 mt-auto">{b.value} {b.unit}</strong>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {parsedAnalysis.summary && (
                          <div>
                            <h5 className="text-success fw-bold mb-2.5 d-flex align-items-center gap-1.5" style={{ fontSize: '0.95rem' }}>
                              <CheckCircle size={15} />
                              Pathology Interpretation Summary
                            </h5>
                            <div className="inner-vault-card text-secondary small" style={{ lineHeight: '1.6' }}>
                              {parsedAnalysis.summary}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Biomarker Trend Timeline ──────────────────────────────────────── */}
      <div className="mt-4 border-top border-white-10 pt-4">
        {/* Toggle button */}
        <button
          onClick={() => setShowTrends(!showTrends)}
          className="d-flex align-items-center gap-2 bg-transparent border border-white-10 rounded px-3 py-2 text-theme-accent font-monospace text-uppercase hover-white w-100"
          style={{ fontSize: '0.82rem', letterSpacing: '0.04em', justifyContent: 'space-between' }}
        >
          <span className="d-flex align-items-center gap-2">
            <TrendingUp size={15} />
            Biomarker Trend Timeline
          </span>
          <ChevronDown
            size={15}
            style={{ transform: showTrends ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
          />
        </button>

        {showTrends && (
          <div className="mt-3 animate-fadeIn">
            {!hasBiomarkers ? (
              /* Empty state */
              <div className="text-center py-4 bg-white-5 rounded border border-white-5 font-monospace text-secondary" style={{ fontSize: '0.82rem' }}>
                <TrendingUp size={28} className="mx-auto mb-2 opacity-30 text-theme-accent" />
                <p className="m-0">No biomarker history available yet.</p>
                <small className="d-block mt-1 opacity-70">Upload a lab report to start tracking trends.</small>
              </div>
            ) : (
              <div>
                {/* Biomarker selector */}
                <div className="mb-3">
                  <label className="text-secondary font-monospace d-block mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                    SELECT BIOMARKER
                  </label>
                  <select
                    value={selectedBiomarker}
                    onChange={(e) => setSelectedBiomarker(e.target.value)}
                    className="bg-dark text-white border border-white-10 rounded p-2 font-monospace w-100"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="">— choose a biomarker —</option>
                    {biomarkerNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Trend panel */}
                {selectedBiomarker && selectedData && (
                  <div className="glass-card p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>

                    {/* Header row */}
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <strong className="text-white font-monospace" style={{ fontSize: '1rem' }}>{selectedBiomarker}</strong>
                      {status && (
                        <span
                          className="badge font-monospace px-2 py-1"
                          style={{
                            fontSize: '0.72rem',
                            background: `${STATUS_COLORS[status]}22`,
                            color: STATUS_COLORS[status],
                            border: `1px solid ${STATUS_COLORS[status]}44`,
                            letterSpacing: '0.04em'
                          }}
                        >
                          {status.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="row g-2 mb-3 font-monospace" style={{ fontSize: '0.8rem' }}>
                      <div className="col-6 col-sm-3">
                        <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <span className="text-secondary d-block" style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}>LATEST</span>
                          <strong className="text-white">{latest?.value} <span className="text-secondary" style={{ fontWeight: 400 }}>{selectedData.unit}</span></strong>
                          <span className="text-secondary d-block" style={{ fontSize: '0.62rem' }}>{latest?.date}</span>
                        </div>
                      </div>
                      <div className="col-6 col-sm-3">
                        <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <span className="text-secondary d-block" style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}>PREVIOUS</span>
                          <strong className="text-white">{previous ? `${previous.value}` : '—'} <span className="text-secondary" style={{ fontWeight: 400 }}>{previous ? selectedData.unit : ''}</span></strong>
                          <span className="text-secondary d-block" style={{ fontSize: '0.62rem' }}>{previous?.date || '—'}</span>
                        </div>
                      </div>
                      <div className="col-6 col-sm-3">
                        <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <span className="text-secondary d-block" style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}>CHANGE</span>
                          <strong style={{ color: absChange === null ? 'inherit' : absChange > 0 ? '#f59e0b' : absChange < 0 ? '#00c896' : '#64748b' }}>
                            {absChange !== null ? `${absChange > 0 ? '+' : ''}${absChange.toFixed(2)}` : '—'}
                          </strong>
                        </div>
                      </div>
                      <div className="col-6 col-sm-3">
                        <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <span className="text-secondary d-block" style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}>% CHANGE</span>
                          <strong style={{ color: pctChange === null ? 'inherit' : pctChange > 0 ? '#f59e0b' : pctChange < 0 ? '#00c896' : '#64748b' }}>
                            {pctChange !== null ? `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(2)}%` : '—'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* SVG chart or single-point note */}
                    {trendPoints.length >= 2 ? (
                      <div className="mb-3 p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <BiomarkerChart data={trendPoints} />
                      </div>
                    ) : (
                      <div className="mb-3 text-center text-secondary font-monospace py-3" style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                        Only one data point recorded. Upload another lab report to see a trend chart.
                      </div>
                    )}

                    {/* Medical disclaimer */}
                    <div className="mb-3 px-2 py-2 rounded" style={{ background: 'rgba(255,193,7,0.05)', border: '1px solid rgba(255,193,7,0.15)', fontSize: '0.72rem' }}>
                      <span className="text-secondary font-monospace" style={{ lineHeight: '1.5' }}>
                        ⚕ Recorded values shown in chronological order. Direction labels reflect typical clinical conventions and do not constitute a diagnosis.
                      </span>
                    </div>

                    {/* Data table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table className="w-100 font-monospace" style={{ fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <th className="text-secondary text-start pb-1 pe-3" style={{ fontWeight: 600, letterSpacing: '0.04em', fontSize: '0.68rem' }}>DATE</th>
                            <th className="text-secondary text-start pb-1 pe-3" style={{ fontWeight: 600, letterSpacing: '0.04em', fontSize: '0.68rem' }}>VALUE</th>
                            <th className="text-secondary text-start pb-1" style={{ fontWeight: 600, letterSpacing: '0.04em', fontSize: '0.68rem' }}>UNIT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...trendPoints].reverse().map((pt, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td className="text-secondary py-1 pe-3">{pt.date}</td>
                              <td className="text-white py-1 pe-3">{pt.value}</td>
                              <td className="text-secondary py-1">{selectedData.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MedicalVault;
