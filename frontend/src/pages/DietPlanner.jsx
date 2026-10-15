import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Salad, RefreshCw, Heart, ChevronDown, ChevronUp, Check, Shuffle, Star, ShoppingCart, Plus, Trash2, X, Calendar, Settings, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { SidebarContext } from '../context/SidebarContext';

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
          <span key={i} className="badge d-flex align-items-center gap-1 px-2 py-1"
            style={{ background: 'var(--bg-card-tinted)', border: '1px solid var(--border)', color: 'var(--brand-orange)', fontSize: '0.78rem' }}>
            {v}
            <X size={10} className="cursor-pointer" onClick={() => onChange(value.filter((_, j) => j !== i))} />
          </span>
        ))}
      </div>
      <div className="d-flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-grow-1 bg-transparent text-white border border-white-10 rounded px-3 py-2 font-monospace"
          style={{ fontSize: '0.85rem', outline: 'none', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
        <button onClick={add} className="px-3 py-2 rounded border border-white-10 bg-transparent text-secondary hover-white font-monospace" style={{ width: 'auto', fontSize: '0.82rem' }}>
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
    <div className="p-3 rounded mb-2 font-monospace"
      style={{ background: isDone ? 'var(--bg-card-tinted)' : 'var(--bg-card)', border: `1px solid ${isDone ? 'var(--brand-orange)' : 'var(--border)'}`, transition: 'all 0.2s' }}>
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div className="flex-grow-1">
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="fw-bold" style={{ color: 'var(--text-primary)', fontSize: '0.92rem', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>
              {meal.name}
            </span>
            {isDone && <Check size={14} style={{ color: 'var(--brand-orange)' }} />}
          </div>
          <span className="text-secondary" style={{ fontSize: '0.78rem' }}>{meal.portion} · {meal.calories} kcal</span>
        </div>
        <div className="d-flex gap-1 flex-shrink-0">
          <button title="Mark complete" onClick={() => onComplete(dayKey, slotKey, meal.name, !isDone)}
            className="btn-icon p-1" style={{ width: '28px', height: '28px', color: isDone ? 'var(--accent-teal)' : 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none' }}>
            <Check size={14} />
          </button>
          <button title="Swap meal" onClick={() => onSwap(dayKey, slotKey, meal.name)}
            className="btn-icon p-1" style={{ width: '28px', height: '28px', color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none' }}>
            <Shuffle size={14} />
          </button>
          <button title="Save to favorites" onClick={() => onFavorite(meal)}
            className="btn-icon p-1" style={{ width: '28px', height: '28px', color: 'var(--accent-amber)', background: 'transparent', border: 'none' }}>
            <Star size={14} />
          </button>
          <button title="Show nutrition" onClick={() => setShowNutrition(v => !v)}
            className="btn-icon p-1" style={{ width: '28px', height: '28px', color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none' }}>
            {showNutrition ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showNutrition && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-top border-white-10" style={{ overflow: 'hidden' }}>
            <div className="row g-1 mb-2" style={{ fontSize: '0.72rem' }}>
              {[['Protein', meal.protein], ['Carbs', meal.carbs], ['Fat', meal.fat]].map(([k, v]) => (
                <div className="col-4" key={k}>
                  <div className="text-center p-1 rounded" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)' }}>
                    <span className="text-secondary d-block">{k}</span>
                    <span className="text-white fw-bold">{v}</span>
                  </div>
                </div>
              ))}
            </div>
            {meal.why && <p className="text-secondary mb-0" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>{meal.why}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DietPlanner({ user }) {
  const { setSidebarContent } = useContext(SidebarContext);
  const [activeTab, setActiveTab] = useState('plan');
  const [prefs, setPrefs] = useState(null);
  const [prefDraft, setPrefDraft] = useState(null);
  const [plan, setPlan] = useState(null);
  const [weekStart, setWeekStart] = useState('');
  const [completions, setCompletions] = useState({});
  const [generating, setGenerating] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedDay, setExpandedDay] = useState('monday');
  const [swapModal, setSwapModal] = useState(null); // {day, slot, name}
  const [swapAlternatives, setSwapAlternatives] = useState([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [shopping, setShopping] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [newQty, setNewQty] = useState('');
  const [favorites, setFavorites] = useState([]);

  const load = useCallback(async () => {
    try {
      const [prefRes, planRes, shopRes, favRes] = await Promise.all([
        api.get('/diet/preferences/'),
        api.get('/diet/plan/'),
        api.get('/diet/shopping-list/'),
        api.get('/diet/favorites/'),
      ]);
      setPrefs(prefRes.data.preferences);
      setPrefDraft({ ...prefRes.data.preferences });
      if (planRes.data.plan) {
        setPlan(planRes.data.plan);
        setWeekStart(planRes.data.week_start);
        setCompletions(planRes.data.completions || {});
      }
      setShopping(shopRes.data.items || []);
      setFavorites(favRes.data.favorites || []);
    } catch (e) {
      setError('Failed to load diet data.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setSidebarContent(
      <div className="d-flex flex-column gap-4 pt-2">
        <div className="glass-card p-4 reveal" style={{ borderRadius: '12px' }}>
          <h2 className="fw-bolder m-0" style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>
            <Salad size={18} className="me-2" style={{ color: 'var(--accent-teal)' }} />
            Regional Diet Planner
          </h2>
          <p className="m-0 mt-2" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Personalized meal plans based on your regional cuisine, health profile and dietary preferences.
          </p>
        </div>
        <div className="d-flex flex-column gap-2">
          {[{ id: 'plan', label: 'Weekly Plan', icon: <Calendar size={14} /> }, { id: 'prefs', label: 'Preferences', icon: <Settings size={14} /> }, { id: 'shop', label: 'Shopping List', icon: <ShoppingCart size={14} /> }, { id: 'fav', label: 'Favourites', icon: <Star size={14} /> }].map(t => (
            <div key={t.id} onClick={() => setActiveTab(t.id)}
              className={`disease-select-tile cursor-pointer ${activeTab === t.id ? 'active theme-general-active' : 'inactive'}`}
              style={{ padding: '10px 16px' }}>
              <span className="font-monospace fw-bold text-uppercase d-flex align-items-center gap-2" style={{ fontSize: '0.82rem' }}>{t.icon}{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
    return () => setSidebarContent(null);
  }, [activeTab, setSidebarContent]);

  const handleGenerate = async () => {
    setGenerating(true); setError(''); setSuccess('');
    try {
      const res = await api.post('/diet/generate/');
      setPlan(res.data.plan);
      setWeekStart(res.data.week_start);
      setCompletions({});
      setExpandedDay('monday');
      setSuccess('7-day meal plan generated!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to generate plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = async (day, slot, mealName, completed) => {
    const today = new Date();
    const dayIndex = DAYS.indexOf(day);
    const weekStartDate = new Date(weekStart);
    weekStartDate.setDate(weekStartDate.getDate() + dayIndex);
    const dateStr = weekStartDate.toISOString().split('T')[0];
    try {
      await api.post('/diet/meal-complete/', { date: dateStr, meal_type: slot, meal_name: mealName, completed });
      setCompletions(prev => ({ ...prev, [`${day}_${slot}`]: completed }));
    } catch (e) { /* silent */ }
  };

  const handleSwap = async (day, slot, currentName) => {
    setSwapModal({ day, slot, name: currentName });
    setSwapLoading(true); setSwapAlternatives([]);
    try {
      const res = await api.post('/diet/swap/', { meal_type: slot, current_meal_name: currentName });
      setSwapAlternatives(res.data.alternatives || []);
    } catch (e) {
      setSwapAlternatives([]);
    } finally {
      setSwapLoading(false);
    }
  };

  const applySwap = (alt) => {
    if (!swapModal || !plan) return;
    const updated = JSON.parse(JSON.stringify(plan));
    if (updated[swapModal.day]) updated[swapModal.day][swapModal.slot] = alt;
    setPlan(updated);
    setSwapModal(null);
  };

  const handleFavorite = async (meal) => {
    try {
      await api.post('/diet/favorites/', { meal_data: meal });
      setSuccess('Added to favourites!'); setTimeout(() => setSuccess(''), 3000);
    } catch (e) { /* silent */ }
  };

  const handleSavePrefs = async () => {
    setPrefSaving(true); setError(''); setSuccess('');
    try {
      const res = await api.put('/diet/preferences/', prefDraft);
      setPrefs(res.data.preferences);
      setSuccess('Preferences saved!'); setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save preferences.');
    } finally { setPrefSaving(false); }
  };

  const addShoppingItem = async () => {
    if (!newIngredient.trim()) return;
    try {
      const res = await api.post('/diet/shopping-list/', { ingredient: newIngredient.trim(), quantity: newQty.trim() });
      setShopping(prev => [res.data, ...prev]);
      setNewIngredient(''); setNewQty('');
    } catch (e) { /* silent */ }
  };

  const toggleShoppingItem = async (id) => {
    try {
      const res = await api.patch(`/diet/shopping-list/${id}/`);
      setShopping(prev => prev.map(i => i.id === id ? { ...i, checked: res.data.checked } : i));
    } catch (e) { /* silent */ }
  };

  const deleteShoppingItem = async (id) => {
    try {
      await api.delete(`/diet/shopping-list/${id}/`);
      setShopping(prev => prev.filter(i => i.id !== id));
    } catch (e) { /* silent */ }
  };

  const completedCount = plan ? Object.values(completions).filter(Boolean).length : 0;
  const totalMeals = plan ? DAYS.reduce((acc, d) => acc + Object.keys(plan[d] || {}).length, 0) : 0;

  return (
    <div className="reveal px-1 theme-general" style={{ paddingBottom: '32px' }}>
      {success && <div className="alert mb-3 d-flex align-items-center gap-2 py-2 px-3 rounded font-monospace" style={{ fontSize: '0.8rem', background: 'var(--status-normal-bg)', border: '1px solid var(--status-normal-border)', color: 'var(--accent-green)' }}><CheckCircle2 size={14} /> {success}</div>}
      {error && <div className="alert mb-3 d-flex align-items-center gap-2 py-2 px-3 rounded font-monospace" style={{ fontSize: '0.8rem', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--accent-coral)' }}><AlertTriangle size={14} /> {error} <button onClick={() => setError('')} className="ms-auto bg-transparent border-0 text-secondary p-0"><X size={14} /></button></div>}

      {/* ── WEEKLY PLAN TAB ─────────────────────────────────────────────── */}
      {activeTab === 'plan' && (
        <div>
          <div className="glass-card p-4 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ borderRadius: '16px' }}>
            <div>
              <h2 className="fw-bold m-0" style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                <Salad size={22} className="me-2" style={{ color: 'var(--accent-teal)' }} />
                Weekly Meal Plan
              </h2>
              {weekStart && <span className="text-secondary font-monospace" style={{ fontSize: '0.78rem' }}>Week of {weekStart} · {completedCount}/{totalMeals} meals completed</span>}
            </div>
            <button onClick={handleGenerate} disabled={generating}
              className="btn-clinical primary w-auto-override px-4 py-2 d-flex align-items-center gap-2 font-monospace text-uppercase"
              style={{ fontSize: '0.85rem', borderRadius: '10px' }}>
              <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Generating...' : plan ? 'Regenerate Plan' : 'Generate My Plan'}
            </button>
          </div>

          {!plan && !generating && (
            <div className="glass-card text-center p-5" style={{ borderRadius: '16px' }}>
              <Salad size={48} className="mb-3" style={{ color: 'var(--accent-teal)', opacity: 0.5 }} />
              <h4 className="fw-bold mb-2" style={{ color: 'var(--text-primary)' }}>No meal plan yet</h4>
              <p className="text-secondary mb-4" style={{ fontSize: '0.88rem' }}>Set your regional preferences and generate a personalised 7-day meal plan.</p>
              <button onClick={() => setActiveTab('prefs')} className="btn-clinical primary w-auto-override px-4 py-2 font-monospace text-uppercase" style={{ fontSize: '0.85rem', borderRadius: '10px' }}>
                Set Preferences First
              </button>
            </div>
          )}

          {generating && (
            <div className="glass-card text-center p-5" style={{ borderRadius: '16px' }}>
              <div className="spinner-border mb-3" style={{ width: '40px', height: '40px', color: 'var(--accent-teal)' }} />
              <p className="text-secondary font-monospace" style={{ fontSize: '0.88rem' }}>Generating your personalised regional meal plan with Gemini AI...</p>
            </div>
          )}

          {plan && !generating && (
            <div className="d-flex flex-column gap-3">
              {DAYS.map(day => {
                const dayMeals = plan[day] || {};
                const dayCompletedCount = Object.keys(dayMeals).filter(s => completions[`${day}_${s}`]).length;
                const dayTotal = Object.keys(dayMeals).length;
                const isExpanded = expandedDay === day;
                return (
                  <motion.div key={day} layout className="glass-card" style={{ borderRadius: '14px', overflow: 'hidden' }}>
                    <div className="d-flex align-items-center justify-content-between p-4 cursor-pointer"
                      onClick={() => setExpandedDay(isExpanded ? null : day)}
                      style={{ borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none' }}>
                      <div className="d-flex align-items-center gap-3">
                        <span className="fw-bold font-monospace text-uppercase" style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{DAY_LABELS[day]}</span>
                        <span className="badge font-monospace" style={{ background: dayCompletedCount === dayTotal && dayTotal > 0 ? 'rgba(45,184,176,0.12)' : 'var(--bg-card-tinted)', border: `1px solid ${dayCompletedCount === dayTotal && dayTotal > 0 ? 'var(--accent-teal)' : 'var(--border)'}`, color: dayCompletedCount === dayTotal && dayTotal > 0 ? 'var(--accent-teal)' : 'var(--text-secondary)', fontSize: '0.72rem', padding: '3px 8px' }}>
                          {dayCompletedCount}/{dayTotal}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-secondary)' }} />}
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
                          {Object.keys(dayMeals).map(slot => (
                            <div key={slot}>
                              <span className="text-secondary font-monospace d-block mb-1" style={{ fontSize: '0.75rem' }}>{MEAL_LABELS[slot] || slot}</span>
                              <MealCard meal={dayMeals[slot]} dayKey={day} slotKey={slot} completions={completions} onComplete={handleComplete} onSwap={handleSwap} onFavorite={handleFavorite} />
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
              <div className="p-3 rounded font-monospace text-secondary text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', fontSize: '0.75rem', lineHeight: '1.5' }}>
                This meal plan is generated by AI based on your regional preferences and available health profile. It is not a substitute for advice from a registered dietitian or your doctor.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PREFERENCES TAB ──────────────────────────────────────────────── */}
      {activeTab === 'prefs' && prefDraft && (
        <div className="glass-card p-4" style={{ borderRadius: '16px', maxWidth: '640px' }}>
          <h3 className="fw-bold mb-4" style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }}>Diet Preferences</h3>

          <div className="mb-3">
            <label className="text-secondary small d-block mb-1 font-monospace">REGION / CUISINE</label>
            <select value={prefDraft.region} onChange={e => setPrefDraft(p => ({ ...p, region: e.target.value }))}
              className="w-100 rounded border border-white-10 px-3 py-2 font-monospace"
              style={{ background: 'var(--input-bg)', color: 'var(--input-text)', fontSize: '0.88rem', outline: 'none' }}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="mb-3">
            <label className="text-secondary small d-block mb-2 font-monospace">DIET TYPE</label>
            <div className="d-flex gap-2">
              {[['vegetarian', 'Vegetarian'], ['non_vegetarian', 'Non-Veg'], ['vegan', 'Vegan']].map(([v, l]) => (
                <button key={v} onClick={() => setPrefDraft(p => ({ ...p, diet_type: v }))}
                  className="px-3 py-2 rounded font-monospace text-uppercase fw-bold"
                  style={{ fontSize: '0.78rem', flex: 1, border: `1px solid ${prefDraft.diet_type === v ? 'var(--accent-teal)' : 'var(--border)'}`, background: prefDraft.diet_type === v ? 'rgba(45,184,176,0.1)' : 'transparent', color: prefDraft.diet_type === v ? 'var(--accent-teal)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="text-secondary small d-block mb-1 font-monospace">MEALS PER DAY</label>
            <div className="d-flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setPrefDraft(p => ({ ...p, meals_per_day: n }))}
                  className="rounded font-monospace fw-bold"
                  style={{ width: '44px', height: '44px', border: `1px solid ${prefDraft.meals_per_day === n ? 'var(--accent-teal)' : 'var(--border)'}`, background: prefDraft.meals_per_day === n ? 'rgba(45,184,176,0.1)' : 'transparent', color: prefDraft.meals_per_day === n ? 'var(--accent-teal)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="text-secondary small d-block mb-1 font-monospace">CALORIE PREFERENCE</label>
            <select value={prefDraft.calorie_preference} onChange={e => setPrefDraft(p => ({ ...p, calorie_preference: e.target.value }))}
              className="w-100 rounded border border-white-10 px-3 py-2 font-monospace"
              style={{ background: 'var(--input-bg)', color: 'var(--input-text)', fontSize: '0.88rem', outline: 'none' }}>
              <option value="low">Low (&lt;1500 kcal)</option>
              <option value="moderate">Moderate (1500–2000 kcal)</option>
              <option value="high">High (&gt;2000 kcal)</option>
            </select>
          </div>

          <TagInput label="FOOD ALLERGIES (press Enter to add)" value={prefDraft.food_allergies || []} onChange={v => setPrefDraft(p => ({ ...p, food_allergies: v }))} placeholder="e.g. Peanut, Dairy..." />
          <TagInput label="FOOD DISLIKES (press Enter to add)" value={prefDraft.food_dislikes || []} onChange={v => setPrefDraft(p => ({ ...p, food_dislikes: v }))} placeholder="e.g. Bitter gourd..." />

          <p className="text-secondary mb-3" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
            Allergies from your medical profile are automatically applied even if not listed above.
          </p>

          <button onClick={handleSavePrefs} disabled={prefSaving}
            className="btn-clinical primary w-auto-override px-4 py-2 d-flex align-items-center gap-2 font-monospace text-uppercase"
            style={{ fontSize: '0.85rem', borderRadius: '10px' }}>
            {prefSaving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
            {prefSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}

      {/* ── SHOPPING LIST TAB ────────────────────────────────────────────── */}
      {activeTab === 'shop' && (
        <div className="glass-card p-4" style={{ borderRadius: '16px', maxWidth: '640px' }}>
          <h3 className="fw-bold mb-4 d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }}>
            <ShoppingCart size={20} style={{ color: 'var(--accent-teal)' }} /> Shopping List
          </h3>
          <div className="d-flex gap-2 mb-4">
            <input value={newIngredient} onChange={e => setNewIngredient(e.target.value)} onKeyDown={e => e.key === 'Enter' && addShoppingItem()}
              placeholder="Ingredient" className="flex-grow-1 bg-transparent rounded border border-white-10 px-3 py-2 font-monospace"
              style={{ fontSize: '0.85rem', outline: 'none', background: 'var(--input-bg)', color: 'var(--input-text)' }} />
            <input value={newQty} onChange={e => setNewQty(e.target.value)} onKeyDown={e => e.key === 'Enter' && addShoppingItem()}
              placeholder="Qty" className="rounded border border-white-10 px-2 py-2 font-monospace"
              style={{ width: '80px', fontSize: '0.85rem', outline: 'none', background: 'var(--input-bg)', color: 'var(--input-text)' }} />
            <button onClick={addShoppingItem} className="px-3 py-2 rounded border border-white-10 bg-transparent hover-white font-monospace" style={{ width: 'auto' }}>
              <Plus size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
          {shopping.length === 0
            ? <p className="text-secondary font-monospace text-center py-4" style={{ fontSize: '0.85rem' }}>Your shopping list is empty. Add ingredients from your meal plan.</p>
            : shopping.map(item => (
              <div key={item.id} className="d-flex align-items-center gap-3 p-2 rounded mb-2"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <input type="checkbox" checked={item.checked} onChange={() => toggleShoppingItem(item.id)} style={{ cursor: 'pointer' }} />
                <span className="flex-grow-1 font-monospace" style={{ color: 'var(--text-primary)', fontSize: '0.88rem', textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.5 : 1 }}>{item.ingredient}</span>
                {item.quantity && <span className="text-secondary font-monospace" style={{ fontSize: '0.78rem' }}>{item.quantity}</span>}
                <button onClick={() => deleteShoppingItem(item.id)} className="btn-icon p-1 bg-transparent border-0" style={{ color: 'rgba(255,51,102,0.6)' }} aria-label={`Remove ${item.ingredient} from shopping list`}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          }
        </div>
      )}

      {/* ── FAVOURITES TAB ───────────────────────────────────────────────── */}
      {activeTab === 'fav' && (
        <div className="glass-card p-4" style={{ borderRadius: '16px' }}>
          <h3 className="fw-bold mb-4 d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }}>
            <Star size={20} style={{ color: 'var(--accent-amber)' }} /> Favourite Meals
          </h3>
          {favorites.length === 0
            ? <p className="text-secondary font-monospace text-center py-4" style={{ fontSize: '0.85rem' }}>No favourites yet. Star meals from your plan to save them here.</p>
            : <div className="row g-3">
              {favorites.map((fav) => {
                const meal = typeof fav.meal_data === 'object' ? fav.meal_data : {};
                return (
                  <div className="col-md-6" key={fav.id}>
                    <div className="p-3 rounded h-100" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <div className="fw-bold font-monospace mb-1" style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{meal.name || 'Meal'}</div>
                      <div className="text-secondary font-monospace" style={{ fontSize: '0.78rem' }}>{meal.portion} · {meal.calories} kcal</div>
                      {meal.why && <p className="text-secondary mt-2 mb-0" style={{ fontSize: '0.74rem', fontStyle: 'italic' }}>{meal.why}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>
      )}

      {/* ── SWAP MODAL ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {swapModal && (
          <div className="modal-overlay" onClick={() => setSwapModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="modal-container glass-card p-4" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '30px' }}>
              <button className="modal-close-btn" onClick={() => setSwapModal(null)} aria-label="Close swap modal"><X size={20} /></button>
              <h4 className="fw-bold mb-1 font-monospace" style={{ color: 'var(--text-primary)' }}>Swap Meal</h4>
              <p className="text-secondary mb-4 font-monospace" style={{ fontSize: '0.82rem' }}>Replacing: <strong style={{ color: 'var(--text-primary)' }}>{swapModal?.name}</strong></p>
              {swapLoading && <div className="text-center py-3"><div className="spinner-border" style={{ color: 'var(--accent-teal)', width: '28px', height: '28px' }} /></div>}
              {!swapLoading && swapAlternatives.length === 0 && <p className="text-secondary text-center font-monospace" style={{ fontSize: '0.85rem' }}>No alternatives found. Try again.</p>}
              {!swapLoading && swapAlternatives.map((alt, i) => (
                <div key={i} className="p-3 rounded mb-2 cursor-pointer" onClick={() => applySwap(alt)}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-teal)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                  <div className="fw-bold font-monospace mb-1" style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{alt.name}</div>
                  <div className="text-secondary font-monospace" style={{ fontSize: '0.78rem' }}>{alt.portion} · {alt.calories} kcal</div>
                  {alt.why && <p className="text-secondary mt-1 mb-0" style={{ fontSize: '0.74rem', fontStyle: 'italic' }}>{alt.why}</p>}
                </div>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
