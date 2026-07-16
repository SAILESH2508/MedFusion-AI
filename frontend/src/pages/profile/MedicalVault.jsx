import React from 'react';
import { Database, Upload, ChevronUp, ChevronDown, Pill, CheckCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

function MedicalVault({
  archive,
  loadingArchive,
  expandedId,
  setExpandedId
}) {
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

            // For prescriptions:
            const parsedData = typeof record.extracted_data === 'string'
              ? JSON.parse(record.extracted_data || '{}')
              : (record.extracted_data || {});

            // For pathology reports:
            const parsedReportData = typeof record.report_data === 'string'
              ? JSON.parse(record.report_data || '[]')
              : (record.report_data || []);
            const parsedAnalysis = typeof record.analysis === 'string'
              ? JSON.parse(record.analysis || '{}')
              : (record.analysis || {});

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

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 border-top border-white-10 pt-4 animate-fadeIn text-start">
                    {isRx ? (
                      <div>
                        {/* Physician Name if manual or extracted */}
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
                              const isAbnormal = b.value > 100 || b.value < 70;
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
    </div>
  );
}

export default MedicalVault;
