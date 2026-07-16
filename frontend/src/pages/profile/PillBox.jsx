import React from 'react';
import { Pill, Plus, Trash2, Cpu, Sparkles, CheckCircle, ShieldAlert } from 'lucide-react';

function PillBox({
  archive,
  customMeds,
  newMedName,
  setNewMedName,
  newMedDosage,
  setNewMedDosage,
  newMedFrequency,
  setNewMedFrequency,
  newMedTime,
  setNewMedTime,
  medsTakenToday,
  handleToggleMedTaken,
  handleAddCustomMed,
  handleDeleteCustomMed,
  safetyReport,
  safetyLoading,
  safetyError,
  handleCheckDrugSafety
}) {
  const rxMeds = [];
  archive.forEach(record => {
    if (record.type === 'prescription') {
      const parsed = typeof record.extracted_data === 'string' 
        ? JSON.parse(record.extracted_data || '{}') 
        : (record.extracted_data || {});
      if (parsed.medicines && Array.isArray(parsed.medicines)) {
        parsed.medicines.forEach(m => {
          if (m.name && !rxMeds.some(exist => exist.name.toLowerCase() === m.name.toLowerCase())) {
            let inferredSlot = 'Morning';
            const freqLower = (m.frequency || '').toLowerCase();
            if (freqLower.includes('night') || freqLower.includes('bed')) inferredSlot = 'Night';
            else if (freqLower.includes('evening') || freqLower.includes('dinner')) inferredSlot = 'Evening';
            else if (freqLower.includes('afternoon') || freqLower.includes('lunch')) inferredSlot = 'Afternoon';
            
            rxMeds.push({
              id: `rx-${record.id}-${m.name}`,
              name: m.name,
              dosage: m.dosage || 'As directed',
              frequency: m.frequency || 'Once daily',
              timeSlot: inferredSlot,
              isCustom: false
            });
          }
        });
      }
    }
  });

  const allMeds = [...rxMeds, ...customMeds];
  const totalScheduled = allMeds.length;
  const totalTaken = allMeds.filter(m => medsTakenToday[`${m.id}-${m.timeSlot}`]).length;
  const adherencePercent = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 100;

  const slots = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const slotIcons = {
    Morning: '',
    Afternoon: '',
    Evening: '',
    Night: ''
  };

  const [showAddForm, setShowAddForm] = React.useState(false);

  return (
    <div className="glass-card p-4 text-start vault-glass-card h-100 d-flex flex-column animate-fadeIn theme-diabetes">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center border-bottom border-white-10 pb-3 mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-2">
          <Pill className="text-theme-accent" />
          <h3 className="fw-bold text-white m-0" style={{ fontSize: '1.35rem' }}>
            Pill Box & Adherence
          </h3>
        </div>
        <div className="d-flex gap-2">
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 border border-white-10 bg-transparent text-secondary rounded font-monospace text-uppercase hover-white font-bold"
            style={{ fontSize: '0.78rem', width: 'auto' }}
          >
            {showAddForm ? 'Cancel' : '+ Add Med'}
          </button>
          <button 
            onClick={() => handleCheckDrugSafety(allMeds)}
            disabled={allMeds.length === 0 || safetyLoading}
            className="px-3 py-1.5 bg-theme-accent text-white border-0 rounded font-monospace text-uppercase hover-white font-bold d-flex align-items-center gap-1.5"
            style={{ fontSize: '0.78rem', width: 'auto' }}
          >
            <Sparkles size={12} /> {safetyLoading ? 'Auditing...' : 'Audit Safety'}
          </button>
        </div>
      </div>

      {/* Progress & Adherence Circular Chart Banner */}
      <div className="adherence-summary-box border border-white-5 font-monospace">
        <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px', flexShrink: 0 }}>
          <svg className="position-absolute" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }} viewBox="0 0 36 36">
            <path strokeWidth="3" stroke="rgba(255, 255, 255, 0.08)" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path strokeDasharray={`${adherencePercent}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="var(--theme-accent)" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <strong className="text-white" style={{ fontSize: '0.85rem' }}>{adherencePercent}%</strong>
        </div>
        <div className="text-start">
          <span className="text-secondary small d-block mb-0.5 text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>Daily Compliance</span>
          <div className="d-flex align-items-center gap-2">
            <strong className="text-white" style={{ fontSize: '1.05rem' }}>{totalTaken} / {totalScheduled} Taken</strong>
            <span className="text-secondary small">({adherencePercent === 100 ? '✓ Excellent work!' : 'Remaining'})</span>
          </div>
        </div>
      </div>

      {/* Collapsible Add supplementary form */}
      {showAddForm && (
        <div className="p-3.5 bg-white-5 rounded border border-white-5 mb-4 animate-fadeIn font-monospace">
          <h5 className="text-white fw-bold mb-3 text-uppercase" style={{ fontSize: '0.85rem' }}>Log Supplementary Med</h5>
          <form onSubmit={(e) => { handleAddCustomMed(e); setShowAddForm(false); }} className="d-flex flex-column gap-2.5" style={{ fontSize: '0.8rem' }}>
            <input 
              type="text" 
              placeholder="Medication Name (e.g. Vitamin D3)" 
              value={newMedName} 
              onChange={(e) => setNewMedName(e.target.value)} 
              className="p-2.5 border border-white-10 rounded text-white bg-transparent w-100" 
              style={{ marginBottom: '4px' }}
              required
            />
            <div className="row g-2" style={{ marginBottom: '4px' }}>
              <div className="col-6">
                <input 
                  type="text" 
                  placeholder="Dosage (e.g. 1000 IU)" 
                  value={newMedDosage} 
                  onChange={(e) => setNewMedDosage(e.target.value)} 
                  className="p-2.5 border border-white-10 rounded text-white bg-transparent w-100"
                />
              </div>
              <div className="col-6">
                <select 
                  value={newMedTime} 
                  onChange={(e) => setNewMedTime(e.target.value)} 
                  className="p-2.5 border border-white-10 rounded text-white bg-transparent bg-dark w-100"
                >
                  {slots.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="d-flex gap-2">
              <select 
                value={newMedFrequency} 
                onChange={(e) => setNewMedFrequency(e.target.value)} 
                className="p-2.5 border border-white-10 rounded text-white bg-transparent bg-dark w-75"
              >
                <option value="Once daily">Once daily</option>
                <option value="Twice daily">Twice daily</option>
                <option value="Three times daily">Three times daily</option>
                <option value="As needed (PRN)">As needed (PRN)</option>
              </select>
              <button 
                type="submit" 
                className="btn-clinical primary py-2 w-25 text-uppercase font-bold"
                style={{ padding: 0 }}
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main List Container (Scrollable) */}
      <div className="d-flex flex-column gap-3.5 vault-list-container flex-grow-1" style={{ overflowY: 'auto', paddingRight: '4px' }}>
        {/* Active Pill Box Grid */}
        {allMeds.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 flex-grow-1 font-monospace text-secondary border border-dashed border-white-10 rounded-4 m-2" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <div className="p-3 bg-white-5 rounded-circle text-theme-accent border border-theme-accent border-opacity-20 mb-3 shadow-lg">
              <Pill size={28} className="animate-pulse" />
            </div>
            <strong className="text-white d-block mb-1" style={{ fontSize: '0.9rem', letterSpacing: '0.02em' }}>PILL BOX IS EMPTY</strong>
            <p className="small m-0 px-4" style={{ maxWidth: '360px', fontSize: '0.78rem', lineHeight: '1.4', opacity: 0.7 }}>
              Schedule supplementary meds using the "+ Add Med" console above or scan a physician prescription to sync automatically.
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3 font-monospace">
            {slots.map(slot => {
              const slotMeds = allMeds.filter(m => m.timeSlot === slot);
              if (slotMeds.length === 0) return null;
              
              return (
                <div key={slot} className="border-bottom border-white-5 pb-2">
                  <span className="text-white fw-bold d-block mb-3" style={{ fontSize: '0.9rem' }}>
                    {slotIcons[slot]} {slot.toUpperCase()} DOSES
                  </span>
                  <div className="d-flex flex-column gap-1">
                    {slotMeds.map(med => {
                      const takenKey = `${med.id}-${slot}`;
                      const isTaken = !!medsTakenToday[takenKey];
                      return (
                        <div key={med.id} className={`med-item-card d-flex align-items-center justify-content-between transition-all ${isTaken ? 'taken' : ''}`}>
                          <div className="d-flex align-items-center gap-3.5 cursor-pointer flex-grow-1" onClick={() => handleToggleMedTaken(med.id, slot)}>
                            <input 
                              type="checkbox" 
                              checked={isTaken}
                              onChange={() => handleToggleMedTaken(med.id, slot)}
                              onClick={(e) => e.stopPropagation()}
                              className="med-checkbox cursor-pointer"
                            />
                            <div className="text-start d-flex align-items-baseline gap-2 flex-wrap">
                              <strong className={`text-white m-0 ${isTaken ? 'text-decoration-line-through text-secondary' : ''}`} style={{ fontSize: '0.92rem' }}>
                                {med.name}
                              </strong>
                              <span className="text-secondary" style={{ fontSize: '0.76rem' }}>
                                &mdash; Dosage: {med.dosage} &bull; {med.frequency}
                              </span>
                            </div>
                          </div>
                          {med.isCustom && (
                            <button 
                              onClick={() => handleDeleteCustomMed(med.id)}
                              className="px-2 py-1 bg-transparent border-0 text-danger hover-white ms-2"
                              style={{ width: 'auto', display: 'inline-flex' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Safety Report Panel inside list */}
        {(safetyReport || safetyError) && (
          <div className="mt-3 p-3.5 bg-white-5 rounded border border-white-5 reveal" style={{ animation: 'fadeIn 0.35s ease' }}>
            <div className="d-flex align-items-center gap-2 border-bottom border-white-10 pb-2 mb-3">
              <CheckCircle className="text-success" size={16} />
              <h4 className="fw-bold m-0 text-white text-uppercase font-monospace" style={{ fontSize: '0.9rem' }}>AI Safety Audit Digest</h4>
            </div>

            {safetyError && (
              <div className="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-20 rounded text-danger font-monospace small">
                Error: {safetyError}
              </div>
            )}

            {safetyReport && (
              <div className="d-flex flex-column gap-3.5 font-monospace" style={{ fontSize: '0.78rem' }}>
                {safetyReport.has_interactions ? (
                  <div className="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded text-danger" style={{ borderLeft: '4px solid #ff3366 !important' }}>
                    <strong className="text-white d-block mb-1.5 font-monospace text-uppercase" style={{ fontSize: '0.72rem' }}>Contraindications</strong>
                    <ul className="m-0 ps-3">
                      {safetyReport.critical_warnings?.map((w, i) => <li key={i} className="mb-0.5">{w}</li>)}
                    </ul>
                  </div>
                ) : (
                  <div className="p-2.5 bg-success bg-opacity-10 border border-success border-opacity-25 rounded text-success">
                    No drug-drug interactions detected.
                  </div>
                )}

                {safetyReport.dietary_precautions?.length > 0 && (
                  <div className="p-3 bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded text-warning">
                    <strong className="text-white d-block mb-1.5 font-monospace text-uppercase" style={{ fontSize: '0.72rem' }}>Dietary Warnings</strong>
                    <ul className="m-0 ps-3">
                      {safetyReport.dietary_precautions.map((p, i) => <li key={i} className="mb-0.5">{p}</li>)}
                    </ul>
                  </div>
                )}

                {safetyReport.side_effects?.length > 0 && (
                  <div className="p-3 bg-white-10 bg-opacity-25 border border-white-5 rounded text-secondary">
                    <strong className="text-white d-block mb-1.5 font-monospace text-uppercase" style={{ fontSize: '0.72rem' }}>Common Side Effects</strong>
                    <ul className="m-0 ps-3">
                      {safetyReport.side_effects.map((se, i) => <li key={i} className="mb-0.5">{se}</li>)}
                    </ul>
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

export default PillBox;
