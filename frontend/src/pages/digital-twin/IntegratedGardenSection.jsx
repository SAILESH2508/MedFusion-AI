import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sprout, Leaf, Flower2, ShieldCheck,
  Flame, Pill, UtensilsCrossed, Activity,
  Trophy, Award, Sparkles, Clock, CheckCircle2, Plus, RefreshCw,
  Info, AlertCircle, ChevronRight, Check, X
} from 'lucide-react';
import { api } from '../../services/api';
import { GARDEN_STAGES, GARDEN_ACTIONS, GARDEN_ACHIEVEMENTS } from './gardenConstants';

export default function IntegratedGardenSection({
  gardenData,
  onGardenUpdate,
  user,
  openAuth,
}) {
  const [loggingActivity, setLoggingActivity] = useState(null);
  const [activeNote, setActiveNote] = useState('');
  const [selectedActivityForNote, setSelectedActivityForNote] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  /* ─── Handle Activity Logging ─── */
  const handleLogActivity = async (activityType, points, customNote = '') => {
    if (!user) {
      if (openAuth) openAuth('patient', 'Please authenticate to log activities and save your garden progress.');
      return;
    }

    setLoggingActivity(activityType);
    try {
      const payload = {
        activity_type: activityType,
        note: customNote || '',
      };
      const res = await api.post('/garden/activity/', payload);

      if (onGardenUpdate) {
        onGardenUpdate(prev => ({
          ...prev,
          total_points: res.data.total_points,
          current_streak: res.data.current_streak,
          best_streak: res.data.best_streak,
          stage: res.data.stage,
          achievements_earned: res.data.achievements_earned || prev.achievements_earned,
          today_activities: res.data.today_activities || [
            {
              activity_type: activityType,
              points: res.data.points_awarded || points,
              note: customNote,
              logged_at: new Date().toISOString(),
            },
            ...prev.today_activities,
          ],
          today_activity_count: res.data.today_activity_count ?? (prev.today_activity_count + 1),
          recovery_message: null,
        }));
      }

      setToastMessage({
        type: activityType,
        points: res.data.points_awarded || points,
      });
      setTimeout(() => setToastMessage(null), 3500);

      setSelectedActivityForNote(null);
      setActiveNote('');
    } catch (err) {
      console.error('Failed logging activity in garden:', err);
    } finally {
      setLoggingActivity(null);
    }
  };

  const currentStageIndex = gardenData.stage?.stage ?? 0;
  const currentStageMeta = GARDEN_STAGES[currentStageIndex] || GARDEN_STAGES[0];
  const StageIcon = currentStageMeta.icon;
  const nextThreshold = currentStageMeta.next;
  const prevThreshold = currentStageMeta.threshold;

  const stageProgressPercent = nextThreshold
    ? Math.min(100, Math.max(0, Math.round(((gardenData.total_points - prevThreshold) / (nextThreshold - prevThreshold)) * 100)))
    : 100;

  return (
    <div className="d-flex flex-column gap-4">
      {/* ─── Toast Feedback ─── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="p-3 rounded-3 d-flex align-items-center gap-3 font-monospace"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--status-success)',
              boxShadow: 'var(--shadow-md)',
              color: 'var(--text-primary)',
            }}
          >
            <CheckCircle2 size={18} style={{ color: 'var(--status-success)' }} />
            <div>
              <span className="fw-bold" style={{ fontSize: '0.84rem', color: 'var(--status-success)' }}>
                +{toastMessage.points} Wellness Points Added!
              </span>
              <span className="text-secondary d-block" style={{ fontSize: '0.82rem' }}>
                Your routine activity has been registered into your Digital Twin profile.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Inactivity Recovery Notice ─── */}
      {gardenData.recovery_message && (
        <div
          className="p-3 rounded-3 d-flex align-items-center gap-3 font-monospace"
          style={{
            background: 'var(--bg-card-tinted)',
            border: '1px solid var(--accent-amber)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="p-2 rounded-2" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
            <Sprout size={18} />
          </div>
          <div>
            <strong style={{ color: 'var(--accent-amber)', fontSize: '0.85rem', display: 'block' }}>
              Your health garden can grow again today
            </strong>
            <span className="text-secondary" style={{ fontSize: '0.76rem' }}>
              A brief gap in routine is part of health management. Record any action below to resume progress.
            </span>
          </div>
        </div>
      )}

      {/* ─── Stats Strip ─── */}
      <div className="row g-3">
        <div className="col-6 col-lg-3">
          <div className="glass-card p-3 d-flex align-items-center gap-3" style={{ borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div className="p-2 rounded-3" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
              <Award size={20} />
            </div>
            <div>
              <span className="text-secondary font-monospace d-block text-uppercase" style={{ fontSize: '0.76rem', letterSpacing: '0.05em', fontWeight: 600 }}>
                Total Points
              </span>
              <span className="fw-bold font-monospace" style={{ fontSize: '1.45rem', color: 'var(--text-primary)' }}>
                {gardenData.total_points}
                <span className="text-secondary fw-normal ms-1" style={{ fontSize: '0.76rem' }}>pts</span>
              </span>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="glass-card p-3 d-flex align-items-center gap-3" style={{ borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div className="p-2 rounded-3" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Flame size={20} />
            </div>
            <div>
              <span className="text-secondary font-monospace d-block text-uppercase" style={{ fontSize: '0.76rem', letterSpacing: '0.05em', fontWeight: 600 }}>
                Current Streak
              </span>
              <span className="fw-bold font-monospace" style={{ fontSize: '1.45rem', color: '#f59e0b' }}>
                {gardenData.current_streak}
                <span className="text-secondary fw-normal ms-1" style={{ fontSize: '0.76rem' }}>days</span>
              </span>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="glass-card p-3 d-flex align-items-center gap-3" style={{ borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div className="p-2 rounded-3" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}>
              <Trophy size={20} />
            </div>
            <div>
              <span className="text-secondary font-monospace d-block text-uppercase" style={{ fontSize: '0.76rem', letterSpacing: '0.05em', fontWeight: 600 }}>
                Best Streak
              </span>
              <span className="fw-bold font-monospace" style={{ fontSize: '1.45rem', color: 'var(--text-primary)' }}>
                {gardenData.best_streak}
                <span className="text-secondary fw-normal ms-1" style={{ fontSize: '0.76rem' }}>days</span>
              </span>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="glass-card p-3 d-flex align-items-center gap-3" style={{ borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div className="p-2 rounded-3" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-secondary font-monospace d-block text-uppercase" style={{ fontSize: '0.76rem', letterSpacing: '0.05em', fontWeight: 600 }}>
                Today's Count
              </span>
              <span className="fw-bold font-monospace" style={{ fontSize: '1.45rem', color: '#10b981' }}>
                {gardenData.today_activity_count ?? (gardenData.today_activities || []).length}
                <span className="text-secondary fw-normal ms-1" style={{ fontSize: '0.76rem' }}>logged</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Growth Stage Visualizer Panel ─── */}
      <div
        className="glass-card p-4 text-center position-relative"
        style={{
          borderRadius: '16px',
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}
      >
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 rounded-2" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <StageIcon size={20} />
            </div>
            <div className="text-start">
              <span className="badge font-monospace text-uppercase" style={{ background: 'var(--bg-card-tinted)', color: 'var(--brand-orange)', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                Stage {currentStageIndex + 1} of 7
              </span>
              <h3 className="fw-bold m-0" style={{ fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                {currentStageMeta.name}
              </h3>
            </div>
          </div>

          <div className="font-monospace text-secondary" style={{ fontSize: '0.84rem' }}>
            {gardenData.total_points} Total Points Accumulated
          </div>
        </div>

        {/* Central Clean Botanical Icon Node */}
        <div className="my-4 d-flex justify-content-center align-items-center gap-4">
          <div
            className="p-4 rounded-circle d-flex align-items-center justify-content-center"
            style={{
              width: '100px',
              height: '100px',
              background: 'var(--bg-surface)',
              border: `2px solid ${currentStageMeta.color}`,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <StageIcon size={44} style={{ color: currentStageMeta.color }} />
          </div>
        </div>

        <p className="text-secondary font-monospace mx-auto mb-3" style={{ maxWidth: '520px', fontSize: '0.92rem' }}>
          {currentStageMeta.description}
        </p>

        {/* Stage Progress Bar */}
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <div className="d-flex justify-content-between font-monospace text-secondary mb-1" style={{ fontSize: '0.82rem' }}>
            <span>{gardenData.total_points} pts</span>
            <span>{nextThreshold ? `${nextThreshold - gardenData.total_points} pts to next stage` : 'Maximum Milestone Achieved'}</span>
          </div>
          <div style={{ height: '7px', background: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div
              style={{
                height: '100%',
                width: `${stageProgressPercent}%`,
                background: 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)',
                borderRadius: '4px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Stage Milestones Roadmap */}
        <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-white-5 flex-wrap gap-2">
          {GARDEN_STAGES.map((s, idx) => {
            const isCompleted = idx <= currentStageIndex;
            const StepIcon = s.icon;
            return (
              <div
                key={s.stage}
                className="d-flex flex-column align-items-center text-center font-monospace"
                style={{
                  flex: 1,
                  minWidth: '60px',
                  opacity: isCompleted ? 1 : 0.4,
                }}
              >
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center mb-1"
                  style={{
                    width: '28px',
                    height: '28px',
                    background: isCompleted ? 'var(--bg-card-tinted)' : 'var(--bg-surface)',
                    border: `1px solid ${isCompleted ? s.color : 'var(--border)'}`,
                    color: isCompleted ? s.color : 'var(--text-muted)',
                  }}
                >
                  <StepIcon size={16} />
                </div>
                <span style={{ fontSize: '0.75rem', color: isCompleted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {s.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 5 Activity Action Buttons ─── */}
      <div
        className="glass-card"
        style={{ borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}
      >
        {/* Header with clear hierarchy */}
        <div
          className="d-flex align-items-center justify-content-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}
        >
          <h3 className="fw-bold m-0 d-flex align-items-center gap-2.5" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            <Activity size={20} style={{ color: 'var(--brand-orange)' }} />
            <span>Daily Health Actions</span>
          </h3>
          <span className="text-secondary font-monospace" style={{ fontSize: '0.82rem' }}>
            Earn wellness points for clinical self-care
          </span>
        </div>

        {/* Separated Action Cards with Breathing Room */}
        <div className="p-3.5 d-flex flex-column gap-2.5" style={{ background: 'var(--bg-surface)' }}>
          {GARDEN_ACTIONS.map((action) => {
            const isLoading = loggingActivity === action.type;
            const isNoteActive = selectedActivityForNote === action.type;
            const ActionIcon = action.icon;

            return (
              <div
                key={action.type}
                className="d-flex align-items-center gap-3.5"
                style={{
                  minHeight: '62px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  borderLeft: `5px solid ${action.color}`,
                  background: 'var(--bg-card)',
                  padding: '12px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                {/* Coloured icon badge — with comfortable breathing room from left line */}
                <div
                  className="flex-shrink-0 d-flex align-items-center justify-content-center rounded-3"
                  style={{
                    width: '38px',
                    height: '38px',
                    background: action.bg,
                    color: action.color,
                    border: `1px solid ${action.border}`,
                  }}
                >
                  <ActionIcon size={19} />
                </div>

                {/* Label + description OR note input */}
                <div className="flex-grow-1 overflow-hidden" style={{ minWidth: 0 }}>
                  {isNoteActive ? (
                    <input
                      type="text"
                      placeholder="Add clinical note and press Enter..."
                      value={activeNote}
                      onChange={e => setActiveNote(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLogActivity(action.type, action.points, activeNote)}
                      className="w-100 border rounded-2 px-3 font-monospace"
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--text-primary)',
                        borderColor: action.color,
                        background: 'transparent',
                        outline: 'none',
                        height: '32px',
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <div className="fw-bold text-truncate" style={{ fontSize: '0.96rem', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                        {action.label}
                      </div>
                      <div className="text-secondary text-truncate" style={{ fontSize: '0.82rem', lineHeight: '1.3', marginTop: '2px' }}>
                        {action.description}
                      </div>
                    </>
                  )}
                </div>

                {/* Right cluster: points + action buttons (colored per action) */}
                <div className="d-flex align-items-center gap-2.5 flex-shrink-0">
                  <span
                    className="badge font-monospace"
                    style={{
                      background: action.bg,
                      color: action.color,
                      border: `1px solid ${action.border}`,
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    +{action.points} pts
                  </span>

                  {isNoteActive ? (
                    <>
                      <button
                        onClick={() => handleLogActivity(action.type, action.points, activeNote)}
                        disabled={isLoading}
                        className="d-flex align-items-center gap-1.5 font-monospace text-uppercase fw-bold"
                        style={{
                          fontSize: '0.78rem',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          border: 'none',
                          background: action.color,
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                          boxShadow: `0 2px 8px ${action.color}40`,
                        }}
                      >
                        {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.5} />}
                        <span>{isLoading ? 'Saving' : 'Save'}</span>
                      </button>
                      <button
                        onClick={() => { setSelectedActivityForNote(null); setActiveNote(''); }}
                        className="d-flex align-items-center justify-content-center"
                        style={{
                          borderRadius: '6px',
                          padding: '6px 10px',
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                        title="Cancel"
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleLogActivity(action.type, action.points)}
                        disabled={isLoading}
                        className="d-flex align-items-center gap-1.5 font-monospace text-uppercase fw-bold"
                        style={{
                          fontSize: '0.78rem',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          border: 'none',
                          background: action.color,
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                          boxShadow: `0 2px 8px ${action.color}40`,
                          opacity: isLoading ? 0.65 : 1,
                        }}
                      >
                        {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
                        <span>{isLoading ? '...' : 'LOG'}</span>
                      </button>
                      <button
                        onClick={() => { setSelectedActivityForNote(action.type); setActiveNote(''); }}
                        title="Log with custom clinical note"
                        className="d-flex align-items-center justify-content-center"
                        style={{
                          borderRadius: '6px',
                          padding: '6px 10px',
                          border: `1px solid ${action.border}`,
                          background: action.bg,
                          color: action.color,
                          cursor: 'pointer',
                        }}
                      >
                        <Clock size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Today's Activity Log & Achievements Split ─── */}
      <div className="row g-3">
        {/* Today's Activity Log List */}
        <div className="col-12 col-lg-7">
          <div className="glass-card p-3.5 h-100" style={{ borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <Clock size={16} style={{ color: 'var(--accent-teal)' }} />
                <h4 className="fw-bold m-0" style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  Today's Activity Log
                </h4>
              </div>
              <span className="badge font-monospace" style={{ background: 'var(--bg-card-tinted)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: '0.76rem' }}>
                {(gardenData.today_activities || []).length} Logged
              </span>
            </div>

            {!(gardenData.today_activities && gardenData.today_activities.length > 0) ? (
              <div className="text-center py-4 text-secondary font-monospace" style={{ fontSize: '0.88rem' }}>
                <Sprout size={28} className="mb-2 opacity-40" style={{ color: '#10b981' }} />
                <div>No actions logged yet today.</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                  Use any action above to record habits into your Digital Twin.
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: '280px' }}>
                {gardenData.today_activities.map((item, idx) => {
                  const cfg = GARDEN_ACTIONS.find(a => a.type === item.activity_type) || {
                    label: item.activity_type?.replace(/_/g, ' ') || 'Activity',
                    points: item.points || 5,
                    icon: Activity,
                    color: '#38bdf8',
                    bg: 'rgba(56, 189, 248, 0.1)',
                  };
                  const Icon = cfg.icon;

                  let timeString = '';
                  try {
                    if (item.logged_at) {
                      timeString = new Date(item.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                  } catch { timeString = ''; }

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-2 d-flex align-items-center justify-content-between font-monospace"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="d-flex align-items-center gap-2.5">
                        <div className="p-1 rounded-2" style={{ background: cfg.bg, color: cfg.color }}>
                          <Icon size={14} />
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            {cfg.label}
                          </div>
                          {item.note && (
                            <div className="text-secondary" style={{ fontSize: '0.76rem' }}>
                              {item.note}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        {timeString && <span className="text-secondary" style={{ fontSize: '0.76rem' }}>{timeString}</span>}
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.76rem' }}>
                          +{item.points || cfg.points} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Achievements Gallery */}
        <div className="col-12 col-lg-5">
          <div className="glass-card p-3.5 h-100" style={{ borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <Trophy size={16} style={{ color: 'var(--brand-orange)' }} />
                <h4 className="fw-bold m-0" style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  Milestone Badges
                </h4>
              </div>
              <span className="font-monospace text-secondary" style={{ fontSize: '0.76rem' }}>
                {(gardenData.achievements_earned || []).length}/{GARDEN_ACHIEVEMENTS.length}
              </span>
            </div>

            <div className="d-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {GARDEN_ACHIEVEMENTS.map(ach => {
                const isEarned = (gardenData.achievements_earned || []).includes(ach.id);
                const AchIcon = ach.icon;

                return (
                  <div
                    key={ach.id}
                    title={`${ach.name}: ${ach.desc}`}
                    className="p-2 rounded-2 d-flex align-items-center gap-2 transition-all font-monospace"
                    style={{
                      background: isEarned ? 'var(--bg-card-tinted)' : 'var(--bg-surface)',
                      border: `1px solid ${isEarned ? 'var(--brand-orange)' : 'var(--border)'}`,
                      opacity: isEarned ? 1 : 0.45,
                    }}
                  >
                    <div
                      className="p-1.5 rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        background: isEarned ? 'rgba(244, 149, 74, 0.15)' : 'transparent',
                        color: isEarned ? 'var(--brand-orange)' : 'var(--text-muted)',
                      }}
                    >
                      <AchIcon size={16} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="fw-bold text-truncate" style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                        {ach.name}
                      </div>
                      <div className="text-secondary text-truncate" style={{ fontSize: '0.75rem' }}>
                        {isEarned ? 'Unlocked' : 'In Progress'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
