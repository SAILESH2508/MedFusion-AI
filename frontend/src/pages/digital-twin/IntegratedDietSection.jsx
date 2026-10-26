import React, { useState, useEffect, useCallback } from 'react';
import {
  UtensilsCrossed, RefreshCw, Star, Shuffle, Check, Plus, Trash2, X,
  Calendar, Settings, ShoppingCart, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp, Salad, ShieldAlert, Heart, Info, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

const REGIONS = ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'North Indian', 'Other'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };
const MEAL_LABELS = { breakfast: 'Breakfast', snack1: 'Morning Snack', lunch: 'Lunch', snack2: 'Evening Snack', dinner: 'Dinner' };

function TagInput({ label, value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput('');
  };
  return (
    <div className="mb-3">
      <label className="text-secondary small d-block mb-1 font-monospace">{label}</label>
      <div className="d-flex gap-2 flex-wrap mb-2">
        {value.map((v, i) => (
          <span
            key={i}
            className="badge d-flex align-items-center gap-1 px-2 py-1"
            style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border)', color: 'var(--brand-orange)', fontSize: '0.74rem' }}
          >
            {v}
            <X size={10} className="cursor-pointer" onClick={() => onChange(value.filter((_, j) => j !== i))} />
          </span>
        ))}
      </div>
      <div className="d-flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-grow-1 bg-transparent border rounded px-3 py-1.5 font-monospace"
          style={{ fontSize: '0.8rem', outline: 'none', background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
        />
        <button
          onClick={add}
          className="px-3 py-1.5 rounded border bg-transparent text-secondary font-monospace"
          style={{ width: 'auto', fontSize: '0.8rem', borderColor: 'var(--border)' }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function MealCard({ meal, dayKey, slotKey, completions, onComplete, onSwap, onFavorite }) {
  const completionKey = `${dayKey}_${slotKey}`;
  const isDone = completions[completionKey] || false;
  const [showNutrition, setShowNutrition] = useState(false);

  if (!meal) return null;
  return (
    <div
      className="p-3 rounded-3 mb-2 transition-all"
      style={{
        background: isDone ? 'rgba(224,123,57,0.06)' : 'var(--bg-surface)',
        border: `1px solid ${isDone ? 'rgba(224,123,57,0.45)' : 'var(--border)'}`,
        boxShadow: isDone ? '0 0 10px rgba(224,123,57,0.08)' : 'none',
      }}
    >
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div className="flex-grow-1">
          <div className="d-flex align-items-center gap-2 mb-1">
            <span
              className="fw-bold"
              style={{
                color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-main)',
                textDecoration: isDone ? 'line-through' : 'none',
                letterSpacing: '-0.01em',
              }}
            >
              {meal.name}
            </span>
            {isDone && <Check size={13} style={{ color: 'var(--accent-teal)', flexShrink: 0 }} />}
          </div>
          <span className="font-monospace" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {meal.portion}
            {meal.calories && (
              <>
                {' · '}
                <span style={{ color: 'var(--brand-orange)', fontWeight: 600 }}>{meal.calories} kcal</span>
              </>
            )}
          </span>
        </div>

        <div className="d-flex gap-1 flex-shrink-0">
          <button
            title={isDone ? 'Mark as pending' : 'Mark as completed (+5 pts)'}
            onClick={() => onComplete(dayKey, slotKey, meal.name, !isDone)}
            className="btn-icon p-1"
            style={{ width: '28px', height: '28px', color: isDone ? 'var(--accent-teal)' : 'var(--text-muted)', background: 'transparent', border: 'none' }}
          >
            <Check size={14} />
          </button>
          <button
            title="Swap meal alternative"
            onClick={() => onSwap(dayKey, slotKey, meal.name)}
            className="btn-icon p-1"
            style={{ width: '28px', height: '28px', color: 'var(--brand-blue)', background: 'transparent', border: 'none' }}
          >
            <Shuffle size={14} />
          </button>
          <button
            title="Save to favorites"
            onClick={() => onFavorite(meal)}
            className="btn-icon p-1"
            style={{ width: '28px', height: '28px', color: 'var(--accent-amber)', background: 'transparent', border: 'none' }}
          >
            <Star size={14} />
          </button>
          <button
            title="Toggle macro breakdown"
            onClick={() => setShowNutrition(v => !v)}
            className="btn-icon p-1"
            style={{ width: '28px', height: '28px', color: 'var(--text-muted)', background: 'transparent', border: 'none' }}
          >
            {showNutrition ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showNutrition && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-top border-white-5"
            style={{ overflow: 'hidden' }}
          >
            <div className="row g-1 mb-2" style={{ fontSize: '0.7rem' }}>
              {[['Protein', meal.protein], ['Carbs', meal.carbs], ['Fat', meal.fat]].map(([k, v]) => (
                <div className="col-4" key={k}>
                  <div className="text-center p-1 rounded" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <span className="text-secondary d-block">{k}</span>
                    <span className="fw-bold" style={{ color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                </div>
              ))}
            </div>
            {meal.why && <p className="text-secondary mb-0" style={{ fontSize: '0.72rem', fontStyle: 'italic' }}>{meal.why}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const DEFAULT_PREFS = {
  region: 'Tamil Nadu',
  regional_preference: 'Tamil Nadu',
  diet_type: 'vegetarian',
  calorie_target: 2000,
  calorie_preference: 'moderate',
  health_goal: 'Maintenance',
  allergies: [],
  food_allergies: [],
  dislikes: [],
  food_dislikes: [],
  meals_per_day: 3,
};

export default function IntegratedDietSection({ user, onActivityLogged }) {
  const [activeTab, setActiveTab] = useState('plan');
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [prefDraft, setPrefDraft] = useState(DEFAULT_PREFS);
  const [plan, setPlan] = useState(null);
  const [weekStart, setWeekStart] = useState('');
  const [completions, setCompletions] = useState({});
  const [generating, setGenerating] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDay, setSelectedDay] = useState('monday');
  const [favorites, setFavorites] = useState([]);
  const [shopping, setShopping] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [newQty, setNewQty] = useState('');

  const showMsg = (msg, isErr = false) => {
    if (isErr) setError(msg);
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); }
  };

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await api.get('/diet/preferences/');
      const p = res.data?.preferences || res.data;
      if (p) {
        const merged = { ...DEFAULT_PREFS, ...p };
        setPrefs(merged);
        setPrefDraft(merged);
      }
    } catch { /* silent */ }
  }, []);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await api.get('/diet/plan/');
      const planData = res.data?.plan || res.data?.weekly_plan;
      if (planData) {
        setPlan(planData);
        setWeekStart(res.data.week_start || '');
        setCompletions(res.data.completions || {});
      }
    } catch { /* silent */ }
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await api.get('/diet/favorites/');
      setFavorites(res.data?.favorites || []);
    } catch { /* silent */ }
  }, []);

  const fetchShopping = useCallback(async () => {
    try {
      const res = await api.get('/diet/shopping-list/');
      setShopping(res.data?.items || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (user && user.role === 'Patient') {
      fetchPrefs();
      fetchPlan();
      fetchFavorites();
      fetchShopping();
    }
  }, [user, fetchPrefs, fetchPlan, fetchFavorites, fetchShopping]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/diet/generate/');
      const planData = res.data?.plan || res.data?.weekly_plan;
      if (planData) {
        setPlan(planData);
        setWeekStart(res.data.week_start || '');
        setCompletions(res.data.completions || {});
        showMsg('Personalized meal plan generated successfully.');
      } else {
        showMsg('Meal plan response was empty. Please retry.', true);
      }
    } catch (e) {
      showMsg(e.response?.data?.error || 'Failed to generate meal plan.', true);
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePrefs = async () => {
    setPrefSaving(true);
    try {
      const payload = {
        ...prefDraft,
        region: prefDraft.regional_preference || prefDraft.region || 'Tamil Nadu',
        regional_preference: prefDraft.regional_preference || prefDraft.region || 'Tamil Nadu',
        diet_type: prefDraft.diet_type || 'vegetarian',
        calorie_preference: prefDraft.calorie_target < 1800 ? 'low' : (prefDraft.calorie_target > 2200 ? 'high' : 'moderate'),
        calorie_target: prefDraft.calorie_target || 2000,
        food_allergies: prefDraft.allergies || prefDraft.food_allergies || [],
        allergies: prefDraft.allergies || prefDraft.food_allergies || [],
        food_dislikes: prefDraft.dislikes || prefDraft.food_dislikes || [],
        dislikes: prefDraft.dislikes || prefDraft.food_dislikes || [],
      };
      const res = await api.put('/diet/preferences/', payload);
      const p = res.data?.preferences || res.data || payload;
      const merged = { ...DEFAULT_PREFS, ...p };
      setPrefs(merged);
      setPrefDraft(merged);
      showMsg('Diet preferences saved successfully.');
    } catch (e) {
      showMsg(e.response?.data?.error || 'Failed saving preferences.', true);
    } finally {
      setPrefSaving(false);
    }
  };

  const handleComplete = async (day, slot, mealName, completed) => {
    const key = `${day}_${slot}`;
    setCompletions(prev => ({ ...prev, [key]: completed }));
    try {
      // Backend expects `date` (YYYY-MM-DD) and `meal_type` (not day/slot)
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/diet/meal-complete/', {
        date: today,
        meal_type: slot,
        meal_name: mealName,
        completed,
      });
      // Cross-module integration: award garden activity points!
      if (completed) {
        api.post('/garden/activity/', { activity_type: 'meal_completed', note: mealName })
          .then(res => {
            if (onActivityLogged) onActivityLogged(res.data);
          })
          .catch(() => {});
      }
    } catch {
      setCompletions(prev => ({ ...prev, [key]: !completed }));
    }
  };

  const handleSwap = async (day, slot, currentMeal) => {
    try {
      // Backend expects meal_type and current_meal_name, returns { alternatives: [...] }
      const res = await api.post('/diet/swap/', {
        meal_type: slot,
        current_meal_name: currentMeal,
      });
      const alternatives = res.data?.alternatives || [];
      const swappedMeal = alternatives[0];
      if (swappedMeal) {
        setPlan(prev => ({
          ...prev,
          [day]: {
            ...prev[day],
            [slot]: swappedMeal,
          },
        }));
        showMsg(`Swapped to: ${swappedMeal.name}`);
      } else {
        showMsg('No alternatives available for this meal.', true);
      }
    } catch (e) {
      showMsg(e.response?.data?.error || 'Meal swap unavailable.', true);
    }
  };

  const handleFavorite = async (meal) => {
    try {
      const mealData = {
        name: meal.name,
        portion: meal.portion || '',
        calories: meal.calories || 0,
        protein: meal.protein || '',
        carbs: meal.carbs || '',
        fat: meal.fat || '',
        why: meal.why || '',
      };
      await api.post('/diet/favorites/', {
        meal_data: mealData,
        ...mealData,
      });
      fetchFavorites();
      showMsg(`Added "${meal.name}" to favorites.`);
    } catch (e) {
      showMsg(e.response?.data?.error || 'Failed to save favorite.', true);
    }
  };

  const handleDeleteFavorite = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      // Use path-segment URL matching the backend regex: ^diet/favorites(?:/(?P<fav_id>\d+))?/?
      await api.delete(`/diet/favorites/${id}/`);
      setFavorites(prev => prev.filter(f => f.id !== id));
      showMsg('Meal removed from favorites.');
    } catch {
      showMsg('Failed to remove favorite.', true);
    }
  };

  const addShoppingItem = async () => {
    if (!newIngredient.trim()) return;
    try {
      const res = await api.post('/diet/shopping-list/', { ingredient: newIngredient.trim(), quantity: newQty.trim() });
      setShopping(prev => [res.data, ...prev]);
      setNewIngredient('');
      setNewQty('');
    } catch { /* silent */ }
  };

  const toggleShoppingItem = async (id) => {
    try {
      const res = await api.patch(`/diet/shopping-list/${id}/`);
      setShopping(prev => prev.map(i => i.id === id ? { ...i, checked: res.data.checked } : i));
    } catch { /* silent */ }
  };

  const deleteShoppingItem = async (id) => {
    try {
      await api.delete(`/diet/shopping-list/${id}/`);
      setShopping(prev => prev.filter(i => i.id !== id));
    } catch { /* silent */ }
  };

  const completedCount = plan ? Object.values(completions).filter(Boolean).length : 0;
  const totalMeals = plan ? DAYS.reduce((acc, d) => acc + Object.keys(plan[d] || {}).length, 0) : 0;

  return (
    <div className="d-flex flex-column gap-3">
      {/* ─── Feedback Alerts ─── */}
      {success && (
        <div className="p-2.5 rounded-3 d-flex align-items-center gap-2 font-monospace" style={{ background: 'var(--status-normal-bg)', border: '1px solid var(--status-normal-border)', color: 'var(--status-normal)', fontSize: '0.78rem' }}>
          <CheckCircle2 size={14} /> {success}
        </div>
      )}
      {error && (
        <div className="p-2.5 rounded-3 d-flex align-items-center gap-2 font-monospace" style={{ background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger)', fontSize: '0.78rem' }}>
          <AlertTriangle size={14} /> {error}
          <button onClick={() => setError('')} className="ms-auto bg-transparent border-0 text-secondary p-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Secondary Section Navigation Tabs ─── */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 pb-2 border-bottom border-white-5">
        <div className="d-flex gap-1 p-1 rounded-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {[
            { id: 'plan', label: 'Weekly Schedule', icon: Calendar },
            { id: 'preferences', label: 'Allergens & Goals', icon: Settings },
            { id: 'shopping', label: 'Shopping List', icon: ShoppingCart },
            { id: 'favorites', label: 'Saved Recipes', icon: Star },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="d-flex align-items-center gap-1.5 px-3 py-1.5 rounded-2 font-monospace transition-all border-0"
                style={{
                  background: isActive ? 'var(--bg-card)' : 'transparent',
                  color: isActive ? 'var(--brand-orange)' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: isActive ? 700 : 500,
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                }}
              >
                <TabIcon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="d-flex align-items-center gap-2">
          {activeTab === 'plan' && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-clinical primary py-1.5 px-3 d-flex align-items-center gap-1.5 font-monospace text-uppercase"
              style={{ fontSize: '0.72rem', borderRadius: '6px' }}
            >
              <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
              <span>{generating ? 'Calculating...' : plan ? 'Regenerate' : 'Generate Plan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── TAB 1: WEEKLY PLAN ─── */}
      {activeTab === 'plan' && (
        <div
          className="glass-card rounded-3 d-flex flex-column"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden' }}
        >
          {/* ── Top bar: week info + day selector ── */}
          <div
            className="d-flex align-items-center justify-content-between flex-wrap gap-2 px-4 py-3"
            style={{
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-surface)',
            }}
          >
            <span className="font-monospace" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              {weekStart ? `Week of ${weekStart}` : 'Personalized Nutritional Schedule'}
              {' · '}
              <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>
                {completedCount}/{totalMeals} meals completed
              </span>
            </span>

            {/* Day pill buttons */}
            <div className="d-flex gap-1 flex-wrap">
              {DAYS.map((d, idx) => {
                const isActive = selectedDay === d;
                // Rotating accent colors for each day
                const dayColors = [
                  'var(--brand-orange)',
                  'var(--accent-teal)',
                  'var(--brand-blue)',
                  'var(--accent-violet)',
                  '#10b981',
                  '#f97316',
                  '#e879a0',
                ];
                const col = dayColors[idx % dayColors.length];
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    className="font-monospace transition-all"
                    style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: isActive ? `${col}18` : 'transparent',
                      border: `1px solid ${isActive ? col : 'var(--border)'}`,
                      color: isActive ? col : 'var(--text-muted)',
                      fontSize: '0.7rem',
                      fontWeight: isActive ? 800 : 500,
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                      boxShadow: isActive ? `0 0 8px ${col}30` : 'none',
                    }}
                  >
                    {d.slice(0, 3).toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Schedule body ── */}
          <div className="p-4">
            {!plan && !generating ? (
              <div className="text-center py-4">
                <Salad size={36} className="mb-2 opacity-50" style={{ color: 'var(--accent-teal)' }} />
                <h4 className="fw-bold mb-1" style={{ fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-main)' }}>
                  No Active Meal Plan
                </h4>
                <p className="font-monospace mb-3" style={{ fontSize: '0.78rem', maxWidth: '420px', margin: '0 auto', color: 'var(--text-secondary)' }}>
                  Generate a culturally tailored, regional nutrition schedule aligned with your clinical conditions and calorie target.
                </p>
                <button
                  onClick={handleGenerate}
                  className="btn-clinical primary px-4 py-2 font-monospace text-uppercase"
                  style={{ fontSize: '0.75rem', borderRadius: '6px' }}
                >
                  Generate Weekly Plan
                </button>
              </div>
            ) : plan && plan[selectedDay] ? (
              <div className="d-flex flex-column gap-3">
                {/* Day + calorie target row */}
                <div className="d-flex align-items-center justify-content-between">
                  <h4
                    className="fw-bolder m-0"
                    style={{
                      fontSize: '1rem',
                      fontFamily: 'var(--font-main)',
                      background: 'linear-gradient(90deg, #DC2626, #EA580C)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {DAY_LABELS[selectedDay]} Schedule
                  </h4>
                  <span
                    className="font-monospace d-flex align-items-center gap-1"
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--brand-orange)',
                      fontWeight: 600,
                      background: 'rgba(224,123,57,0.1)',
                      border: '1px solid rgba(224,123,57,0.25)',
                      borderRadius: '6px',
                      padding: '2px 8px',
                    }}
                  >
                    Target: {prefs?.calorie_target || 2000} kcal/day
                  </span>
                </div>

                {/* Meal slots — each with a color-coded header label */}
                <div className="d-flex flex-column gap-2">
                  {Object.keys(MEAL_LABELS).map((slotKey, i) => {
                    const meal = plan[selectedDay]?.[slotKey];
                    // Color per meal slot
                    const slotColors = {
                      breakfast:  { color: '#f97316', bg: 'rgba(249,115,22,0.08)',   label: 'BREAKFAST' },
                      snack1:     { color: '#10b981', bg: 'rgba(16,185,129,0.08)',   label: 'MORNING SNACK' },
                      lunch:      { color: 'var(--brand-blue)', bg: 'rgba(91,159,224,0.08)',  label: 'LUNCH' },
                      snack2:     { color: 'var(--accent-violet)', bg: 'rgba(155,127,212,0.08)', label: 'EVENING SNACK' },
                      dinner:     { color: '#e879a0', bg: 'rgba(232,121,160,0.08)', label: 'DINNER' },
                    };
                    const sc = slotColors[slotKey] || { color: 'var(--text-secondary)', bg: 'transparent', label: MEAL_LABELS[slotKey].toUpperCase() };
                    return (
                      <div key={slotKey}>
                        {/* Colored meal-type header */}
                        <div
                          className="d-flex align-items-center gap-2 mb-1 px-1"
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: sc.color,
                              flexShrink: 0,
                              boxShadow: `0 0 4px ${sc.color}`,
                            }}
                          />
                          <span
                            className="font-monospace"
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              letterSpacing: '0.1em',
                              color: sc.color,
                              textTransform: 'uppercase',
                            }}
                          >
                            {sc.label}
                          </span>
                          <div style={{ flex: 1, height: '1px', background: `${sc.color}30` }} />
                        </div>
                        <MealCard
                          meal={meal}
                          dayKey={selectedDay}
                          slotKey={slotKey}
                          completions={completions}
                          onComplete={handleComplete}
                          onSwap={handleSwap}
                          onFavorite={handleFavorite}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ─── TAB 2: PREFERENCES & ALLERGENS ─── */}
      {activeTab === 'preferences' && prefDraft && (
        <div className="glass-card p-4 rounded-3" style={{ border: '1px solid var(--border)' }}>
          <h4 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
            <Settings size={16} style={{ color: 'var(--brand-orange)' }} />
            Nutritional Parameters & Clinical Goal
          </h4>

          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <label className="text-secondary font-monospace d-block mb-1" style={{ fontSize: '0.72rem' }}>
                Daily Calorie Target (kcal)
              </label>
              <input
                type="number"
                value={prefDraft.calorie_target || 2000}
                onChange={e => setPrefDraft({ ...prefDraft, calorie_target: parseInt(e.target.value) || 2000 })}
                className="w-100 bg-transparent border rounded px-3 py-1.5 font-monospace"
                style={{ fontSize: '0.8rem', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="text-secondary font-monospace d-block mb-1" style={{ fontSize: '0.72rem' }}>
                Regional Cuisine Preference
              </label>
              <select
                value={prefDraft.regional_preference || prefDraft.region || 'Tamil Nadu'}
                onChange={e => setPrefDraft({ ...prefDraft, regional_preference: e.target.value, region: e.target.value })}
                className="w-100 bg-transparent border rounded px-3 py-1.5 font-monospace"
                style={{ fontSize: '0.8rem', color: 'var(--text-primary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}
              >
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="col-12 col-md-4">
              <label className="text-secondary font-monospace d-block mb-1" style={{ fontSize: '0.72rem' }}>
                Primary Health Goal
              </label>
              <select
                value={prefDraft.health_goal || 'Maintenance'}
                onChange={e => setPrefDraft({ ...prefDraft, health_goal: e.target.value })}
                className="w-100 bg-transparent border rounded px-3 py-1.5 font-monospace"
                style={{ fontSize: '0.8rem', color: 'var(--text-primary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}
              >
                <option value="Maintenance">Maintenance & General Wellness</option>
                <option value="Weight Loss">Weight Management & Calorie Deficit</option>
                <option value="Cardiovascular Health">Cardiovascular (Low Sodium, DASH)</option>
                <option value="Glycemic Control">Glycemic Control (Low Glycemic Index)</option>
                <option value="Renal Health">Renal Protection (Controlled Protein)</option>
              </select>
            </div>

            <div className="col-12 col-md-4">
              <label className="text-secondary font-monospace d-block mb-1" style={{ fontSize: '0.72rem' }}>
                Diet Type
              </label>
              <select
                value={prefDraft.diet_type || 'vegetarian'}
                onChange={e => setPrefDraft({ ...prefDraft, diet_type: e.target.value })}
                className="w-100 bg-transparent border rounded px-3 py-1.5 font-monospace"
                style={{ fontSize: '0.8rem', color: 'var(--text-primary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="non_vegetarian">Non-Vegetarian</option>
                <option value="vegan">Vegan</option>
              </select>
            </div>

            <div className="col-12 col-md-4">
              <label className="text-secondary font-monospace d-block mb-1" style={{ fontSize: '0.72rem' }}>
                Meals Per Day
              </label>
              <select
                value={prefDraft.meals_per_day || 3}
                onChange={e => setPrefDraft({ ...prefDraft, meals_per_day: parseInt(e.target.value) })}
                className="w-100 bg-transparent border rounded px-3 py-1.5 font-monospace"
                style={{ fontSize: '0.8rem', color: 'var(--text-primary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}
              >
                <option value={3}>3 meals (Breakfast, Lunch, Dinner)</option>
                <option value={4}>4 meals (+Evening Snack)</option>
                <option value={5}>5 meals (All with Snacks)</option>
                <option value={2}>2 meals (Intermittent Fasting)</option>
              </select>
            </div>
          </div>

          <TagInput
            label="Verified Food Allergens (Strict Exclusion)"
            value={prefDraft.allergies || []}
            onChange={v => setPrefDraft({ ...prefDraft, allergies: v })}
            placeholder="Type allergen (e.g. Peanuts, Shellfish, Gluten) and press Enter"
          />

          <TagInput
            label="Dietary Dislikes / Preferences"
            value={prefDraft.dislikes || []}
            onChange={v => setPrefDraft({ ...prefDraft, dislikes: v })}
            placeholder="Type disliked ingredient and press Enter"
          />

          <div className="mt-3 d-flex justify-content-end">
            <button
              onClick={handleSavePrefs}
              disabled={prefSaving}
              className="btn-clinical primary px-4 py-2 font-monospace text-uppercase"
              style={{ fontSize: '0.74rem', borderRadius: '6px' }}
            >
              {prefSaving ? 'Saving Parameters...' : 'Save Parameters'}
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SHOPPING LIST ─── */}
      {activeTab === 'shopping' && (
        <div className="glass-card p-4 rounded-3" style={{ border: '1px solid var(--border)' }}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h4 className="fw-bold m-0 d-flex align-items-center gap-2" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              <ShoppingCart size={16} style={{ color: 'var(--accent-teal)' }} />
              Prescription & Diet Ingredient Shopping List
            </h4>
            <span className="font-monospace text-secondary" style={{ fontSize: '0.72rem' }}>
              {shopping.filter(i => i.checked).length}/{shopping.length} Purchased
            </span>
          </div>

          <div className="d-flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Ingredient name (e.g. Rolled Oats)"
              value={newIngredient}
              onChange={e => setNewIngredient(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addShoppingItem()}
              className="flex-grow-1 bg-transparent border rounded px-3 py-1.5 font-monospace"
              style={{ fontSize: '0.78rem', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            />
            <input
              type="text"
              placeholder="Qty (e.g. 500g)"
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addShoppingItem()}
              className="bg-transparent border rounded px-3 py-1.5 font-monospace"
              style={{ width: '120px', fontSize: '0.78rem', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            />
            <button
              onClick={addShoppingItem}
              className="btn-clinical primary px-3 py-1.5 font-monospace text-uppercase"
              style={{ fontSize: '0.72rem', borderRadius: '6px' }}
            >
              <Plus size={14} />
            </button>
          </div>

          {shopping.length === 0 ? (
            <p className="text-secondary font-monospace text-center py-4 mb-0" style={{ fontSize: '0.78rem' }}>
              Your shopping list is currently empty.
            </p>
          ) : (
            <div className="d-flex flex-column gap-1.5">
              {shopping.map(item => (
                <div
                  key={item.id}
                  className="p-2 rounded-2 d-flex align-items-center justify-content-between font-monospace"
                  style={{
                    background: item.checked ? 'var(--bg-card-tinted)' : 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="d-flex align-items-center gap-2 cursor-pointer" onClick={() => toggleShoppingItem(item.id)}>
                    <input type="checkbox" checked={item.checked} onChange={() => {}} className="cursor-pointer" />
                    <span
                      style={{
                        fontSize: '0.8rem',
                        textDecoration: item.checked ? 'line-through' : 'none',
                        color: item.checked ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}
                    >
                      {item.ingredient} {item.quantity ? `(${item.quantity})` : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteShoppingItem(item.id)}
                    className="btn-icon p-1 text-danger"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: FAVORITES ─── */}
      {activeTab === 'favorites' && (
        <div className="glass-card p-4 rounded-3" style={{ border: '1px solid var(--border)' }}>
          <h4 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            <Star size={16} style={{ color: 'var(--accent-amber)' }} />
            Saved Clinical Recipes & Meals
          </h4>

          {favorites.length === 0 ? (
            <p className="text-secondary font-monospace text-center py-4 mb-0" style={{ fontSize: '0.78rem' }}>
              No favorite meals saved yet. Click the star icon on any schedule card to save recipes.
            </p>
          ) : (
            <div className="row g-2">
              {favorites.map(fav => {
                const meal = fav.meal_data || fav;
                const mealName = meal.name || meal.meal_name || 'Saved Meal';
                return (
                  <div key={fav.id} className="col-12 col-md-6">
                    <div className="p-3 rounded-2 font-monospace d-flex align-items-center justify-content-between gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <div>
                        <div className="fw-bold mb-1" style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {mealName}
                        </div>
                        <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                          {meal.calories ? `${meal.calories} kcal` : ''} 
                          {meal.protein ? ` · P: ${meal.protein}` : ''} 
                          {meal.carbs ? ` | C: ${meal.carbs}` : ''} 
                          {meal.fat ? ` | F: ${meal.fat}` : ''}
                        </div>
                        {meal.portion && (
                          <div className="text-muted mt-1" style={{ fontSize: '0.70rem' }}>
                            Portion: {meal.portion}
                          </div>
                        )}
                        {meal.why && (
                          <div className="text-secondary mt-1" style={{ fontSize: '0.70rem', fontStyle: 'italic' }}>
                            {meal.why}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDeleteFavorite(fav.id, e)}
                        className="btn-clinical secondary p-2 d-flex align-items-center justify-content-center text-danger border-0 rounded cursor-pointer"
                        title="Remove from favorites"
                        style={{ width: '32px', height: '32px', background: 'rgba(239, 68, 68, 0.1)' }}
                      >
                        <Trash2 size={14} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
