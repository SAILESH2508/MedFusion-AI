import React from 'react';
import { Heart, Activity, Sparkles, Clock, ChevronDown, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

function RiskAssessments({
  history,
  loadingHistory,
  expandedHistId,
  setExpandedHistId
}) {
  return (
    <div className="glass-card p-4 text-start vault-glass-card" style={{ borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
      {/* ── Section Header ── */}
      <div className="d-flex justify-content-between align-items-center border-bottom border-white-10 pb-3 mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-2.5">
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(244, 63, 94, 0.22) 100%)',
            border: '1.5px solid rgba(239, 68, 68, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Heart size={18} style={{ color: '#EF4444' }} />
          </div>
          <div>
            <h3 className="fw-bold m-0" style={{ fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              AI Risk Assessment <span style={{ color: '#EF4444' }}>History</span>
            </h3>
            <span className="font-monospace text-secondary" style={{ fontSize: '0.72rem' }}>
              Holdout-validated machine learning diagnostic ledger
            </span>
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Link
            to="/dashboard"
            className="px-3 py-2 text-white border-0 rounded-3 font-monospace text-uppercase text-decoration-none hover-white font-bold d-flex align-items-center gap-2"
            style={{
              fontSize: '0.8rem',
              background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
              boxShadow: '0 3px 12px rgba(239, 68, 68, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={14} /> Run Vitals
          </Link>
        </div>
      </div>

      {/* ── Risk History Records List ── */}
      <div className="d-flex flex-column gap-3 vault-list-container" style={{ maxHeight: '720px', overflowY: 'auto', paddingRight: '4px', paddingBottom: '16px' }}>
        {loadingHistory ? (
          <div className="text-center py-5 font-monospace text-secondary small">
            Retrieving risk assessments history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-5 bg-white-5 rounded-3 border border-white-5 font-monospace text-secondary">
            <Clock size={32} className="mx-auto mb-3 opacity-40 text-danger" />
            <p className="m-0 italic">No past risk screens logged in your medical vault.</p>
            <small className="d-block mt-1 mb-4 opacity-70">Calculations run in the public portal are not auto-saved unless logged into a session.</small>
            <Link to="/dashboard" className="btn-clinical primary mx-auto py-2.5 px-4 d-inline-flex align-items-center gap-2 font-monospace text-uppercase text-decoration-none" style={{ fontSize: '0.85rem', width: 'auto' }}>
              <Sparkles size={16} /> Run Vitals
            </Link>
          </div>
        ) : (
          history.map((record) => {
            const isExpanded = expandedHistId === record.id;
            
            // Safe parsing of remedies
            let remedies = {};
            if (record.remedies) {
              try {
                remedies = typeof record.remedies === 'string' ? JSON.parse(record.remedies) : record.remedies;
              } catch (e) {
                console.error("Failed to parse remedies in history", e);
              }
            }
            
            // Safe parsing of parameters
            let inputParams = {};
            if (record.input_parameters) {
              try {
                inputParams = typeof record.input_parameters === 'string' ? JSON.parse(record.input_parameters) : record.input_parameters;
              } catch (e) {
                console.error("Failed to parse input parameters in history", e);
              }
            }

            // Disease type color and icon identification (case-insensitive!)
            const typeStr = (record.disease_type || '').toLowerCase();
            const isDiabetes = typeStr.includes('diabetes');
            const isCancer = typeStr.includes('cancer') || typeStr.includes('oncology');
            const isHeart = typeStr.includes('heart') || typeStr.includes('cardiac') || (!isDiabetes && !isCancer);

            const diseaseColor = isDiabetes ? '#10B981' : isCancer ? '#A855F7' : '#EF4444';
            const diseaseBg = isDiabetes ? 'rgba(16, 185, 129, 0.12)' : isCancer ? 'rgba(168, 85, 247, 0.12)' : 'rgba(239, 68, 68, 0.12)';
            const diseaseBorder = isDiabetes ? '#10B981' : isCancer ? '#A855F7' : '#EF4444';
            const diseaseLabel = isDiabetes ? 'DIABETES RISK PROFILE' : isCancer ? 'CANCER RISK PROFILE' : 'HEART ATTACK RISK PROFILE';
            const DiseaseIcon = isDiabetes ? Activity : isCancer ? Sparkles : Heart;

            // Risk Level styling
            const riskStr = (record.risk_level || '').toUpperCase();
            const isCritical = riskStr === 'CRITICAL' || riskStr === 'HIGH' || (record.risk_score && record.risk_score >= 70);
            const isModerate = riskStr === 'MODERATE' || (record.risk_score && record.risk_score >= 30 && record.risk_score < 70);

            const riskColor = isCritical ? '#EF4444' : isModerate ? '#F59E0B' : '#10B981';
            const riskBg = isCritical ? 'rgba(239, 68, 68, 0.22)' : isModerate ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.18)';
            const riskBorder = isCritical ? '#EF4444' : isModerate ? '#F59E0B' : '#10B981';

            return (
              <div
                key={record.id}
                className="vault-record-card font-monospace hover-border-accent"
                style={{
                  fontSize: '0.88rem',
                  borderLeft: `4px solid ${diseaseColor}`,
                  borderRadius: '12px',
                  background: isExpanded ? 'rgba(15, 23, 42, 0.65)' : (isDiabetes ? 'rgba(16, 185, 129, 0.09)' : isCancer ? 'rgba(168, 85, 247, 0.09)' : 'rgba(239, 68, 68, 0.08)'),
                  transition: 'all 0.2s ease',
                  border: isExpanded ? `1.5px solid ${diseaseColor}` : `1px solid ${diseaseColor}50`,
                  borderLeftWidth: '4px',
                  borderLeftColor: diseaseColor
                }}
              >
                <div
                  className="d-flex justify-content-between align-items-center cursor-pointer"
                  onClick={() => setExpandedHistId(isExpanded ? null : record.id)}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="p-2 rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: diseaseBg,
                        border: `1.5px solid ${diseaseBorder}`,
                        color: diseaseColor,
                        transition: 'transform 0.2s ease'
                      }}
                    >
                      <DiseaseIcon size={18} />
                    </div>
                    <div>
                      <strong className="text-uppercase" style={{ fontSize: '0.84rem', color: diseaseColor, letterSpacing: '0.04em' }}>
                        {diseaseLabel}
                      </strong>
                      <span className="text-secondary small d-block font-monospace mt-0.5" style={{ fontSize: '0.72rem' }}>
                        Generated: {new Date(record.created_at).toLocaleString([], { hour12: false })}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2.5">
                    <span className="font-monospace" style={{ fontSize: '0.80rem' }}>
                      <strong style={{ color: riskColor, fontSize: '0.92rem' }}>{record.risk_score}%</strong>
                    </span>
                    <span
                      className="badge font-monospace px-2.5 py-1"
                      style={{
                        fontSize: '0.68rem',
                        background: riskBg,
                        color: riskColor,
                        border: `1px solid ${riskBorder}`,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        borderRadius: '6px'
                      }}
                    >
                      {record.risk_level || 'LOW'}
                    </span>
                    <ChevronDown
                      size={16}
                      className="text-secondary"
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease'
                      }}
                    />
                  </div>
                </div>
                
                {/* ── Expanded Detail Pane ── */}
                {isExpanded && (
                  <div className="mt-3.5 border-top border-white-10 pt-3.5 animate-fadeIn">
                    <div className="row g-3">
                      <div className="col-lg-7">
                        <div className="inner-vault-card h-100 p-3 rounded-3" style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)' }}>
                          <h6 className="fw-bold mb-2 text-uppercase d-flex align-items-center gap-1.5" style={{ fontSize: '0.84rem', color: diseaseColor }}>
                            <Activity size={14} style={{ color: diseaseColor }} />
                            AI Clinical Synthesis & Reasoning
                          </h6>
                          <p className="text-secondary small m-0" style={{ fontSize: '0.82rem', lineHeight: '1.6' }}>
                            {record.clinical_reasoning || 'Holdout ML model analyzed multi-variable physiological biomarker variance against clinical risk thresholds.'}
                          </p>
                        </div>
                      </div>

                      <div className="col-lg-5">
                        <div className="inner-vault-card h-100 p-3 rounded-3" style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)' }}>
                          <h6 className="fw-bold mb-2 text-uppercase d-flex align-items-center gap-1.5" style={{ fontSize: '0.84rem', color: '#38BDF8' }}>
                            <ShieldCheck size={14} style={{ color: '#38BDF8' }} />
                            Recommended Clinical Directives
                          </h6>
                          {remedies && (() => {
                            const lifestyle = Array.isArray(remedies.lifestyle_modifications) ? remedies.lifestyle_modifications : (remedies.lifestyle_modifications ? [remedies.lifestyle_modifications] : []);
                            const dietary = Array.isArray(remedies.dietary_guidelines) ? remedies.dietary_guidelines : (remedies.dietary_guidelines ? [remedies.dietary_guidelines] : []);
                            return (
                              <div className="d-flex flex-column gap-2" style={{ fontSize: '0.78rem' }}>
                                {lifestyle.length > 0 && (
                                  <div>
                                    <span className="fw-bold d-block mb-1 text-uppercase" style={{ fontSize: '0.70rem', color: '#38BDF8' }}>Lifestyle Modifications</span>
                                    <ul className="text-secondary ps-3 mb-0">
                                      {lifestyle.slice(0, 3).map((v, i) => <li key={i} className="mb-0.5">{String(v)}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {dietary.length > 0 && (
                                  <div>
                                    <span className="fw-bold d-block mb-1 text-uppercase" style={{ fontSize: '0.70rem', color: '#34D399' }}>Metabolic Nutrition</span>
                                    <ul className="text-secondary ps-3 mb-0">
                                      {dietary.slice(0, 3).map((v, i) => <li key={i} className="mb-0.5">{String(v)}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {lifestyle.length === 0 && dietary.length === 0 && (
                                  <span className="text-secondary italic">Check summary details for full remedy suggestions.</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Evaluated Parameters */}
                      {inputParams && Object.keys(inputParams).length > 0 && (
                        <div className="col-12 mt-1">
                          <div className="inner-vault-card p-3 rounded-3" style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)' }}>
                            <span className="text-secondary small text-uppercase font-monospace d-block mb-2" style={{ fontSize: '0.70rem', letterSpacing: '0.05em' }}>
                              Evaluated Biomarker Vitals:
                            </span>
                            <div className="d-flex flex-wrap gap-2">
                              {Object.entries(inputParams).map(([key, val]) => {
                                if (typeof val === 'object') return null;
                                return (
                                  <span
                                    key={key}
                                    className="badge px-2.5 py-1.5 font-monospace"
                                    style={{
                                      fontSize: '0.72rem',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.12)',
                                      color: 'var(--text-secondary)'
                                    }}
                                  >
                                    {key.toUpperCase().replace(/_/g, ' ')}: <strong style={{ color: diseaseColor }}>{String(val).toUpperCase()}</strong>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RiskAssessments;
