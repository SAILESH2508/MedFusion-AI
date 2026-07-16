import React from 'react';
import { Smile, Clock, Save, Brain, Thermometer, Activity, Shuffle, Heart, BatteryWarning, Info } from 'lucide-react';

function SymptomDiary({
  wellnessRating,
  setWellnessRating,
  energyLevel,
  setEnergyLevel,
  moodState,
  setMoodState,
  selectedSymptoms,
  handleToggleDiarySymptom,
  diaryNotes,
  setDiaryNotes,
  healthLogs,
  handleSaveDiaryLog
}) {
  // Compute dynamic label and color for the live wellness rating
  const getWellnessLabel = (val) => {
    if (val >= 8) return { label: 'Optimal Status', color: '#00f5d4' };
    if (val >= 4) return { label: 'Moderate Symptoms', color: '#ff8f00' };
    return { label: 'Critical / Needs Attention', color: '#ff3366' };
  };

  const currentStatus = getWellnessLabel(wellnessRating);

  const energyClasses = {
    High: 'active-high',
    Moderate: 'active-moderate',
    Low: 'active-low'
  };

  const moodClasses = {
    Excellent: 'active-high',
    Good: 'active-high',
    Neutral: 'active-neutral',
    Anxious: 'active-low',
    Depressed: 'active-low'
  };

  const energyOptions = [
    { value: 'High', label: 'High ⚡' },
    { value: 'Moderate', label: 'Moderate 🎚️' },
    { value: 'Low', label: 'Low 💤' }
  ];

  const moodOptions = [
    { value: 'Excellent', label: 'Excellent 😊' },
    { value: 'Good', label: 'Good 🙂' },
    { value: 'Neutral', label: 'Neutral 😐' },
    { value: 'Anxious', label: 'Anxious 😰' },
    { value: 'Depressed', label: 'Depressed 😔' }
  ];

  const symptomOptions = [
    { key: 'headache', label: 'Headache', icon: <Brain size={15} className="symptom-icon" /> },
    { key: 'fatigue', label: 'Fatigue', icon: <BatteryWarning size={15} className="symptom-icon" /> },
    { key: 'cough', label: 'Coughing', icon: <Activity size={15} className="symptom-icon" /> },
    { key: 'fever', label: 'Fever / Chills', icon: <Thermometer size={15} className="symptom-icon" /> },
    { key: 'dizziness', label: 'Dizziness', icon: <Shuffle size={15} className="symptom-icon" /> },
    { key: 'chest_tightness', label: 'Chest Tension', icon: <Heart size={15} className="symptom-icon" /> }
  ];

  return (
    <>
      {/* Left Column: Wellness Entry Form */}
      <div className="col-lg-5 text-start theme-heart">
        <div className="glass-card p-4 h-100 d-flex flex-column border-theme-accent border-opacity-20 hover-border-theme-accent-glow bg-white-5">
          <h4 className="fw-bold text-white mb-4 text-uppercase font-monospace d-flex align-items-center gap-2" style={{ fontSize: '1.05rem', letterSpacing: '0.05em' }}>
            <Smile className="text-theme-accent animate-pulse" />
            Symptom Diary Check-in
          </h4>

          <form onSubmit={handleSaveDiaryLog} className="d-flex flex-column gap-3 font-monospace flex-grow-1 overflow-y-auto overflow-x-hidden pe-1" style={{ fontSize: '0.85rem' }}>
            {/* Wellness Rating Slider */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-secondary small fw-semibold">Wellness Rating</span>
                <span className="small font-bold" style={{ color: currentStatus.color }}>
                  {currentStatus.label} ({wellnessRating}/10)
                </span>
              </div>
              <input
                type="range"
                min="1" max="10"
                value={wellnessRating}
                onChange={(e) => setWellnessRating(Number(e.target.value))}
                className="w-100 m-0 custom-wellness-slider"
              />
            </div>

            {/* Energy Level Selector (Segmented buttons instead of select dropdown) */}
            <div>
              <label className="text-secondary small fw-semibold mb-2 d-block">Current Energy Level</label>
              <div className="segment-container">
                {energyOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEnergyLevel(opt.value)}
                    className={`segment-btn ${energyLevel === opt.value ? `active ${energyClasses[opt.value]}` : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood State Selector (Segmented pills instead of select dropdown) */}
            <div>
              <label className="text-secondary small fw-semibold mb-2 d-block">Current Mood State</label>
              <div className="mood-segment-container">
                {moodOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMoodState(opt.value)}
                    className={`segment-btn ${moodState === opt.value ? `active ${moodClasses[opt.value]}` : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Symptoms Checklist (Modern icon card toggles) */}
            <div>
              <label className="text-secondary small fw-semibold mb-2.5 d-block">Report Symptoms Experienced Today</label>
              <div className="row g-2">
                {symptomOptions.map(opt => {
                  const isActive = selectedSymptoms[opt.key];
                  return (
                    <div className="col-6" key={opt.key}>
                      <button
                        type="button"
                        onClick={() => handleToggleDiarySymptom(opt.key)}
                        className={`w-100 symptom-toggle-card ${isActive ? 'active' : ''}`}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diary Notes */}
            <div>
              <label className="text-secondary small fw-semibold mb-2 d-block">Symptom Notes & Observations</label>
              <textarea
                placeholder="Record symptoms details, timings, blood pressure readings, or questions for your physician..."
                value={diaryNotes}
                onChange={(e) => setDiaryNotes(e.target.value)}
                className="diary-textarea"
              />
            </div>

            <button
              type="submit"
              className="btn-clinical border border-theme-accent border-opacity-35 text-theme-accent mt-2 py-2.5 w-100 text-uppercase font-bold d-flex align-items-center justify-content-center gap-2 hover-white"
              style={{ fontSize: '0.82rem', letterSpacing: '0.05em' }}
            >
              <Save size={14} /> Log Daily Status
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Historical Daily Logs Timeline list */}
      <div className="col-lg-7 text-start theme-general">
        <div className="glass-card p-4 h-100 d-flex flex-column border-theme-accent border-opacity-20 hover-border-theme-accent-glow bg-white-5">
          <h4 className="fw-bold text-white mb-4 text-uppercase font-monospace d-flex align-items-center gap-2" style={{ fontSize: '1.15rem', letterSpacing: '0.05em' }}>
            <Clock className="text-theme-accent" />
            Symptom Diary Logs
          </h4>

          {healthLogs.length === 0 ? (
            <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 flex-grow-1 font-monospace text-secondary border border-dashed border-white-10 rounded-4 m-2" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <div className="p-3 bg-white-5 rounded-circle text-theme-accent border border-theme-accent border-opacity-20 mb-3 shadow-lg">
                <Clock size={28} className="animate-pulse" />
              </div>
              <strong className="text-white d-block mb-1" style={{ fontSize: '0.9rem', letterSpacing: '0.02em' }}>NO WELLNESS LOGS RECORDED</strong>
              <p className="small m-0 px-4" style={{ maxWidth: '360px', fontSize: '0.78rem', lineHeight: '1.4', opacity: 0.7 }}>
                Complete the daily wellness check-in form on the left to start compiling your symptom diary logs.
              </p>
            </div>
          ) : (
            <div className="d-flex flex-column flex-grow-1 overflow-auto pe-1">
              <div className="timeline-track-container">
                {healthLogs.map((log) => {
                  const rating = log.wellnessRating || 5;
                  const progressWidth = `${rating * 10}%`;
                  const ratingInfo = getWellnessLabel(rating);

                  const energySymbol = log.energyLevel === 'High' ? '⚡' : log.energyLevel === 'Moderate' ? '🎚️' : '💤';
                  const moodEmoji = log.moodState === 'Excellent' ? '😊' : log.moodState === 'Good' ? '🙂' : log.moodState === 'Neutral' ? '😐' : log.moodState === 'Anxious' ? '😰' : '😔';

                  return (
                    <div key={log.id} className="timeline-log-card font-monospace mb-4">
                      {/* Timeline Node Point */}
                      <div className="timeline-marker-dot" style={{ backgroundColor: ratingInfo.color, boxShadow: `0 0 8px ${ratingInfo.color}` }}></div>

                      {/* Header with Date/Time */}
                      <div className="d-flex justify-content-between align-items-center border-bottom border-white-5 pb-2 mb-3 flex-wrap gap-2">
                        <strong className="text-white d-flex align-items-center gap-1.5" style={{ fontSize: '0.85rem' }}>
                          <Smile size={14} className="text-theme-accent animate-pulse" /> Check-in Registered
                        </strong>
                        <span className="small text-secondary font-monospace" style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                          {log.date} @ {log.timestamp}
                        </span>
                      </div>

                      {/* Metrics Panel */}
                      <div className="row g-3 mb-3">
                        {/* Wellness Score Card */}
                        <div className="col-4 text-start">
                          <span className="text-secondary small d-block" style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}>WELLNESS</span>
                          <strong className="text-white" style={{ fontSize: '0.88rem' }}>{rating}/10</strong>
                          <div className="mini-progress-track">
                            <div
                              className={`mini-progress-fill ${rating >= 8 ? 'wellness-high-fill' : rating >= 4 ? 'wellness-med-fill' : 'wellness-low-fill'}`}
                              style={{ width: progressWidth }}
                            ></div>
                          </div>
                        </div>

                        {/* Energy Level Card */}
                        <div className="col-4 text-start">
                          <span className="text-secondary small d-block" style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}>ENERGY</span>
                          <strong className="text-white text-uppercase" style={{ fontSize: '0.82rem' }}>
                            {log.energyLevel} {energySymbol}
                          </strong>
                        </div>

                        {/* Mood State Card */}
                        <div className="col-4 text-start">
                          <span className="text-secondary small d-block" style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}>MOOD</span>
                          <strong className="text-white text-uppercase" style={{ fontSize: '0.82rem' }}>
                            {log.moodState} {moodEmoji}
                          </strong>
                        </div>
                      </div>

                      {/* Active Symptoms list */}
                      {log.symptoms?.length > 0 && (
                        <div className="mb-3 border-top border-white-5 pt-2.5">
                          <span className="text-danger small fw-bold d-block mb-1.5 text-uppercase" style={{ fontSize: '0.62rem', letterSpacing: '0.02em' }}>
                            ⚠️ Reported Symptoms:
                          </span>
                          <div className="d-flex flex-wrap gap-1.5">
                            {log.symptoms.map(sym => (
                              <span
                                key={sym}
                                className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20 py-1.5 px-2.5 text-uppercase font-bold font-monospace"
                                style={{ fontSize: '0.62rem', borderRadius: '4px' }}
                              >
                                {sym.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes Box */}
                      {log.notes && (
                        <div className="p-2.5 bg-white-5 rounded border border-white-5 text-secondary small italic mt-2" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                          <span className="text-white-50 not-italic fw-semibold d-block small mb-0.5 text-uppercase" style={{ fontSize: '0.62rem' }}>Clinical Observations:</span>
                          "{log.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default SymptomDiary;
