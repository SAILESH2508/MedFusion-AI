import React from 'react';
import { Heart, Activity, Sparkles, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

function RiskAssessments({
  history,
  loadingHistory,
  expandedHistId,
  setExpandedHistId
}) {
  return (
    <div className="glass-card p-4 text-start vault-glass-card theme-heart">
      <div className="d-flex justify-content-between align-items-center border-bottom border-white-10 pb-3 mb-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold text-white d-flex align-items-center gap-2 m-0" style={{ fontSize: '1.35rem' }}>
            <Heart className="text-theme-accent" />
            AI Risk Assessment History
          </h3>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Link to="/dashboard" className="px-3 py-2 bg-theme-accent text-white border-0 rounded font-monospace text-uppercase text-decoration-none hover-white font-bold d-flex align-items-center gap-2" style={{ fontSize: '0.8rem' }}>
            <Sparkles size={14} /> Run Vitals
          </Link>
        </div>
      </div>

      <div className="d-flex flex-column gap-3 vault-list-container" style={{ maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
        {loadingHistory ? (
          <div className="text-center py-5 font-monospace text-secondary small">
            Retrieving risk assessments history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-5 bg-white-5 rounded border border-white-5 font-monospace text-secondary">
            <Clock size={32} className="mx-auto mb-3 opacity-40 text-theme-accent animate-pulse" />
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

            return (
              <div key={record.id} className="vault-record-card font-monospace hover-border-accent" style={{ fontSize: '0.88rem' }}>
                <div className="d-flex justify-content-between align-items-center cursor-pointer" onClick={() => setExpandedHistId(isExpanded ? null : record.id)}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-white-10 p-2.5 rounded-circle text-theme-accent">
                      <Heart size={18} />
                    </div>
                    <div>
                      <strong className="text-white text-uppercase fs-6">{record.disease_type.replace(/_/g, ' ')} Risk Profile</strong>
                      <span className="text-secondary small d-block font-monospace mt-1">Generated: {new Date(record.created_at).toLocaleString([], { hour12: false })}</span>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-4">
                    <span className="text-secondary d-none d-sm-inline">Risk Index: <strong className="text-white">{record.risk_score}%</strong></span>
                    <span className={`badge px-3 py-1.5 ${
                      record.risk_level === 'HIGH' || record.risk_level === 'CRITICAL' 
                        ? 'badge-clinical-danger' 
                        : record.risk_level === 'MODERATE' 
                        ? 'badge-clinical-warning' 
                        : 'badge-clinical-success'
                    }`} style={{ fontSize: '0.78rem' }}>{record.risk_level}</span>
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
                
                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 border-top border-white-10 pt-4 animate-fadeIn">
                    <div className="row g-4">
                      <div className="col-lg-7">
                        <div className="inner-vault-card h-100">
                          <h6 className="fw-bold text-white mb-2.5 text-uppercase d-flex align-items-center gap-1.5" style={{ fontSize: '0.88rem' }}>
                            <Activity size={14} className="text-theme-accent" />
                            AI Clinical Reasoning
                          </h6>
                          <p className="text-secondary small m-0" style={{ fontSize: '0.82rem', lineHeight: '1.6' }}>{record.clinical_reasoning}</p>
                        </div>
                      </div>
                      <div className="col-lg-5">
                        <div className="inner-vault-card h-100">
                          <h6 className="fw-bold text-white mb-2.5 text-uppercase d-flex align-items-center gap-1.5" style={{ fontSize: '0.88rem' }}>
                            <Sparkles size={14} className="text-theme-accent" />
                            AI Recommended Directives
                          </h6>
                          {remedies && (
                            <div className="d-flex flex-column gap-3.5" style={{ fontSize: '0.8rem' }}>
                              {remedies.lifestyle_modifications?.length > 0 && (
                                <div>
                                  <span className="text-theme-accent fw-bold d-block mb-1.5 text-uppercase" style={{ fontSize: '0.72rem' }}>Lifestyle Modifications</span>
                                  <ul className="text-secondary ps-3 mb-0">
                                    {remedies.lifestyle_modifications.slice(0, 3).map((v, i) => <li key={i} className="mb-0.5">{v}</li>)}
                                  </ul>
                                </div>
                              )}
                              {remedies.dietary_guidelines?.length > 0 && (
                                <div>
                                  <span className="text-success fw-bold d-block mb-1.5 text-uppercase" style={{ fontSize: '0.72rem' }}>Nutrition Guidelines</span>
                                  <ul className="text-secondary ps-3 mb-0">
                                    {remedies.dietary_guidelines.slice(0, 3).map((v, i) => <li key={i} className="mb-0.5">{v}</li>)}
                                  </ul>
                                </div>
                              )}
                              {!remedies.lifestyle_modifications && !remedies.dietary_guidelines && (
                                <span className="text-secondary italic">Check summary details for full remedy suggestions.</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Parameters logged */}
                      {inputParams && Object.keys(inputParams).length > 0 && (
                        <div className="col-12 mt-1">
                          <div className="inner-vault-card">
                            <span className="text-secondary small text-uppercase font-monospace d-block mb-2">Evaluated Vital Parameters:</span>
                            <div className="d-flex flex-wrap gap-2.5">
                              {Object.entries(inputParams).map(([key, val]) => {
                                if (typeof val === 'object') return null;
                                return (
                                  <span key={key} className="badge bg-white-10 border border-white-10 text-secondary" style={{ fontSize: '0.78rem' }}>
                                    {key.toUpperCase().replace(/_/g, ' ')}: <strong className="text-white">{String(val).toUpperCase()}</strong>
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
