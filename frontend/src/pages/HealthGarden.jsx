import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Flower2, Zap, Pill, Salad, Activity, ClipboardList, CheckSquare, Trophy, Calendar, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { SidebarContext } from '../context/SidebarContext';

const STAGE_CONFIG = [
  { stage: 0, emoji: '🌱', name: 'Seed', color: '#8B7355', desc: 'Your health journey begins. Every small step matters.' },
  { stage: 1, emoji: '🌿', name: 'Sprout', color: '#4CAF50', desc: 'You\'re building healthy habits. Keep going!' },
  { stage: 2, emoji: '🪴', name: 'Small Plant', color: '#2E7D32', desc: 'Your consistency is showing. Well done!' },
  { stage: 3, emoji: '🌳', name: 'Growing Plant', color: '#1B5E20', desc: 'Strong roots and steady growth. Impressive!' },
  { stage: 4, emoji: '🌸', name: 'Flowering Plant', color: '#E91E63', desc: 'You\'re blooming! Your dedication is paying off.' },
  { stage: 5, emoji: '🌺', name: 'Mature Plant', color: '#C2185B', desc: 'A beautiful, thriving garden. Remarkable consistency!' },
  { stage: 6, emoji: '🏡', name: 'Personal Health Garden', color: '#00f5d4', desc: 'Your Personal Health Garden — a living testament to your commitment.' },
];

const ACTIVITY_BUTTONS = [
  { type: 'medication_taken', label: 'Medication Taken', icon: Pill, points: 10, color: '#df40ff' },
  { type: 'meal_completed', label: 'Meal Completed', icon: Salad, points: 5, color: '#00f5d4' },
  { type: 'symptom_logged', label: 'Symptom Logged', icon: ClipboardList, points: 5, color: '#ff8f00' },
  { type: 'activity_completed', label: 'Activity Done', icon: Activity, points: 10, color: '#ff3366' },
  { type: 'checkin', label: 'Health Check-in', icon: CheckSquare, points: 5, color: '#00d2ff' },
];

function GardenVisual({ stage, totalPoints, nextAt }) {
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG[0];
  const progress = nextAt ? Math.min(100, ((totalPoints - (nextAt - (STAGE_CONFIG[stage]?.threshold || 0))) / (nextAt === 50 ? 50 : nextAt - (stage === 1 ? 50 : stage === 2 ? 150 : stage === 3 ? 300 : stage === 4 ? 500 : stage === 5 ? 750 : 1000))) * 100) : 100;

  return (
    <div className="text-center py-4">
      {/* Main garden emoji with animation */}
      <motion.div
        animate={{ rotate: [-1, 1, -1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="garden-stage d-inline-block"
        style={{ fontSize: '6rem', lineHeight: 1, filter: `drop-shadow(0 0 20px ${cfg.color}40)` }}
      >
        {cfg.emoji}
      </motion.div>

      <div className="mt-3 mb-1">
        <span className="fw-bold font-monospace" style={{ color: cfg.color, fontSize: '1.1rem', letterSpacing: '0.04em' }}>
          {cfg.name}
        </span>
      </div>
      <p className="text-secondary font-monospace mb-3" style={{ fontSize: '0.82rem', maxWidth: '300px', margin: '0 auto' }}>
        {cfg.desc}
      </p>

      {/* Progress to next stage */}
      {nextAt && (
        <div className="mx-auto" style={{ maxWidth: '260px' }}>
          <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.7rem' }}>
            <span className="text-secondary font-monospace">{totalPoints} pts</span>
            <span className="text-secondary font-monospace">Next: {nextAt} pts</span>
          </div>
          <div className="rounded-pill overflow-hidden" style={{ height: '6px', background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, progress)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ height: '100%', background: cfg.color, borderRadius: '6px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityButton({ type, label, icon: Icon, points, color, onClick, loading }) {
  return (
    <button onClick={() => onClick(type)} disabled={loading}
      aria-label={`Log activity: ${label} (+${points} points)`}
      className="activity-btn d-flex flex-column align-items-center gap-1 p-3 rounded font-monospace"
      style={{
        border: `1px solid ${color}40`, background: `${color}10`, color, cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s', opacity: loading ? 0.6 : 1, flex: 1, minWidth: '80px',
      }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = `${color}20`; e.currentTarget.style.borderColor = `${color}80`; }}}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.borderColor = `${color}40`; }}>
      <Icon size={20} />
      <span style={{ fontSize: '0.65rem', textAlign: 'center', lineHeight: '1.2', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>+{points}</span>
    </button>
  );
}

function AchievementBadge({ achievement }) {
  return (
    <div className="achievement-badge text-center p-3 rounded"
      aria-disabled={!achievement.earned}
      style={{
        border: `1px solid ${achievement.earned ? 'rgba(0,245,212,0.35)' : 'var(--border-color)'}`,
        background: achievement.earned ? 'rgba(0,245,212,0.06)' : 'var(--bg-card)',
        opacity: achievement.earned ? 1 : 0.4,
        filter: achievement.earned ? 'none' : 'grayscale(1)',
        transition: 'all 0.3s',
      }}>
      <div style={{ fontSize: '1.8rem', lineHeight: 1 }}>{achievement.emoji}</div>
      <div className="fw-bold mt-1 font-monospace" style={{ fontSize: '0.72rem', color: 'var(--text-primary)', lineHeight: '1.2' }}>
        {achievement.name}
      </div>
      <div className="text-secondary mt-1" style={{ fontSize: '0.65rem', lineHeight: '1.3' }}>
        {achievement.desc}
      </div>
      {achievement.earned && (
        <div className="mt-1" style={{ fontSize: '0.6rem', color: 'var(--accent-teal)' }}>✓ Earned</div>
      )}
    </div>
  );
}

export default function HealthGarden({ user }) {
  const { setSidebarContent } = useContext(SidebarContext);
  const [garden, setGarden] = useState(null);
  const [history, setHistory] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeView, setActiveView] = useState('garden'); // garden | history | achievements

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gardenRes, histRes, achRes] = await Promise.all([
        api.get('/garden/'),
        api.get('/garden/history/'),
        api.get('/garden/achievements/'),
      ]);
      setGarden(gardenRes.data);
      setHistory(histRes.data.history || []);
      setAchievements(achRes.data.achievements || []);
    } catch (e) {
      showToast('Failed to load garden data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setSidebarContent(
      <div className="d-flex flex-column gap-4 pt-2">
        <div className="glass-card p-4 reveal" style={{ borderRadius: '12px' }}>
          <h2 className="fw-bolder m-0" style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>
            <Flower2 size={18} className="me-2" style={{ color: 'var(--accent-teal)' }} />
            Health Garden
          </h2>
          <p className="m-0 mt-2" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Your garden grows with every health action. Log daily activities to nurture it.
          </p>
        </div>
        {garden && (
          <div className="d-flex flex-column gap-2">
            {[
              { label: 'Total Points', value: garden.total_points, color: 'var(--accent-teal)' },
              { label: 'Current Streak', value: `${garden.current_streak} days`, color: '#ff8f00' },
              { label: 'Best Streak', value: `${garden.best_streak} days`, color: '#df40ff' },
              { label: 'Garden Stage', value: garden.stage?.name || 'Seed', color: 'var(--accent-green)' },
            ].map(s => (
              <div key={s.label} className="d-flex justify-content-between p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                <span className="text-secondary font-monospace" style={{ fontSize: '0.78rem' }}>{s.label}</span>
                <span className="fw-bold font-monospace" style={{ color: s.color, fontSize: '0.82rem' }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
    return () => setSidebarContent(null);
  }, [garden, setSidebarContent]);

  const logActivity = async (activityType) => {
    setActLoading(true);
    try {
      const res = await api.post('/garden/activity/', { activity_type: activityType });
      setGarden(prev => ({ ...prev, ...res.data }));
      const btn = ACTIVITY_BUTTONS.find(b => b.type === activityType);
      showToast(`+${res.data.points_awarded} pts — ${btn?.label || 'Activity logged'}! ${res.data.stage?.emoji || ''}`);
      // Reload achievements if new ones earned
      if (res.data.achievements_earned?.length > (garden?.achievements_earned?.length || 0)) {
        const achRes = await api.get('/garden/achievements/');
        setAchievements(achRes.data.achievements || []);
        showToast('New achievement unlocked!');
      }
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to log activity.', 'error');
    } finally {
      setActLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border" style={{ color: 'var(--accent-teal)', width: '40px', height: '40px' }} />
      </div>
    );
  }

  const stage = garden?.stage || { stage: 0, name: 'Seed', emoji: '🌱', next_at: 50 };
  const todayCount = garden?.today_activities?.length || 0;
  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div className="reveal px-1 theme-general" style={{ paddingBottom: '32px' }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="position-fixed top-0 start-50 translate-middle-x mt-4 px-4 py-2 rounded font-monospace"
            style={{ zIndex: 9999, background: toast.type === 'error' ? 'rgba(255,51,102,0.15)' : 'rgba(0,245,212,0.15)', border: `1px solid ${toast.type === 'error' ? 'rgba(255,51,102,0.4)' : 'rgba(0,245,212,0.4)'}`, color: toast.type === 'error' ? '#ff6080' : 'var(--accent-teal)', fontSize: '0.85rem' }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recovery message */}
      {garden?.recovery_message && (
        <div className="mb-4 p-3 rounded font-monospace" style={{ background: 'rgba(255,143,0,0.08)', border: '1px solid rgba(255,143,0,0.25)', color: '#ff8f00', fontSize: '0.85rem' }}>
          {garden.recovery_message}
        </div>
      )}

      {/* Tab switcher */}
      <div className="d-flex gap-2 mb-4">
        {[['garden', Flower2, 'Garden'], ['history', Calendar, 'Timeline'], ['achievements', Trophy, 'Achievements']].map(([v, Icon, l]) => (
          <button key={v} onClick={() => setActiveView(v)}
            className="d-flex align-items-center gap-2 px-3 py-2 rounded font-monospace text-uppercase fw-bold"
            style={{ fontSize: '0.78rem', flex: 1, border: `1px solid ${activeView === v ? 'var(--accent-teal)' : 'var(--border-color)'}`, background: activeView === v ? 'rgba(0,245,212,0.08)' : 'transparent', color: activeView === v ? 'var(--accent-teal)' : 'var(--text-secondary)', cursor: 'pointer', justifyContent: 'center', transition: 'all 0.2s' }}>
            <Icon size={14} />{l}
          </button>
        ))}
      </div>

      {/* ── GARDEN VIEW ──────────────────────────────────────────────────── */}
      {activeView === 'garden' && (
        <div>
          {/* Stats strip */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Total Points', value: garden?.total_points || 0, icon: Zap, color: 'var(--accent-teal)' },
              { label: 'Streak', value: `${garden?.current_streak || 0}d`, icon: TrendingUp, color: '#ff8f00' },
              { label: 'Best', value: `${garden?.best_streak || 0}d`, icon: Trophy, color: '#df40ff' },
              { label: 'Today', value: `${todayCount} acts`, icon: CheckSquare, color: '#00d2ff' },
            ].map(s => (
              <div className="col-6 col-md-3" key={s.label}>
                <div className="glass-card p-3 text-center" style={{ borderRadius: '12px' }}>
                  <s.icon size={20} style={{ color: s.color }} className="mb-1" />
                  <div className="fw-bold font-monospace" style={{ color: s.color, fontSize: '1.1rem' }}>{s.value}</div>
                  <div className="text-secondary font-monospace" style={{ fontSize: '0.68rem' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Garden Visual */}
          <div className="glass-card mb-4" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            <GardenVisual stage={stage.stage} totalPoints={garden?.total_points || 0} nextAt={stage.next_at} />
          </div>

          {/* Activity Buttons */}
          <div className="glass-card p-4 mb-4" style={{ borderRadius: '16px' }}>
            <h4 className="fw-bold mb-3 font-monospace text-uppercase" style={{ fontSize: '0.88rem', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
              Log Today's Activity
            </h4>
            <div className="d-flex gap-2 flex-wrap">
              {ACTIVITY_BUTTONS.map(btn => (
                <ActivityButton key={btn.type} {...btn} onClick={logActivity} loading={actLoading} />
              ))}
            </div>
          </div>

          {/* Today's activities */}
          {garden?.today_activities?.length > 0 && (
            <div className="glass-card p-4" style={{ borderRadius: '16px' }}>
              <h4 className="fw-bold mb-3 font-monospace text-uppercase" style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Today's Log</h4>
              <div className="d-flex flex-column gap-2">
                {garden.today_activities.map((a, i) => {
                  const btn = ACTIVITY_BUTTONS.find(b => b.type === a.activity_type);
                  return (
                    <div key={i} className="d-flex align-items-center justify-content-between p-2 rounded"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                      <div className="d-flex align-items-center gap-2">
                        {btn && <btn.icon size={14} style={{ color: btn.color }} />}
                        <span className="font-monospace" style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>{btn?.label || a.activity_type}</span>
                        {a.note && <span className="text-secondary font-monospace" style={{ fontSize: '0.72rem' }}>· {a.note}</span>}
                      </div>
                      <span className="fw-bold font-monospace" style={{ color: 'var(--accent-teal)', fontSize: '0.82rem' }}>+{a.points}pts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY VIEW ─────────────────────────────────────────────────── */}
      {activeView === 'history' && (
        <div className="glass-card p-4" style={{ borderRadius: '16px' }}>
          <h3 className="fw-bold mb-4 font-monospace" style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>
            <Calendar size={18} className="me-2" style={{ color: 'var(--accent-teal)' }} />
            30-Day Growth Timeline
          </h3>
          {history.length === 0
            ? <p className="text-secondary font-monospace text-center py-5" style={{ fontSize: '0.85rem' }}>No activity recorded yet. Start logging daily activities to see your timeline.</p>
            : <div className="d-flex flex-column gap-3">
              {[...history].reverse().map(day => (
                <div key={day.date} className="p-3 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold font-monospace" style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span className="badge font-monospace" style={{ background: 'rgba(0,245,212,0.1)', border: '1px solid rgba(0,245,212,0.3)', color: 'var(--accent-teal)', fontSize: '0.7rem', padding: '3px 8px' }}>
                      +{day.points} pts
                    </span>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {day.activities.map((a, i) => {
                      const btn = ACTIVITY_BUTTONS.find(b => b.type === a.type);
                      return (
                        <span key={i} className="badge font-monospace" style={{ background: `${btn?.color || '#fff'}15`, border: `1px solid ${btn?.color || '#fff'}30`, color: btn?.color || 'var(--text-secondary)', fontSize: '0.68rem', padding: '3px 8px' }}>
                          {btn?.label || a.type}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* ── ACHIEVEMENTS VIEW ────────────────────────────────────────────── */}
      {activeView === 'achievements' && (
        <div className="glass-card p-4" style={{ borderRadius: '16px' }}>
          <h3 className="fw-bold mb-1 font-monospace" style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>
            <Trophy size={18} className="me-2" style={{ color: '#ff8f00' }} />
            Achievements
          </h3>
          <p className="text-secondary font-monospace mb-4" style={{ fontSize: '0.8rem' }}>
            {earnedCount}/{achievements.length} earned
          </p>
          <div className="row g-3">
            {achievements.map(a => (
              <div className="col-6 col-md-3" key={a.id}>
                <AchievementBadge achievement={a} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
