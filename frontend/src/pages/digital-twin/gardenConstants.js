import {
  Sprout, Leaf, TreeDeciduous, Flower2, ShieldCheck, Footprints,
  Flame, Pill, UtensilsCrossed, Activity, HeartPulse, Stethoscope,
} from 'lucide-react';

/* ─── Stage Definitions with Professional Vector Icons (No Emojis) ─── */
export const GARDEN_STAGES = [
  { stage: 0, name: 'Seed', icon: Sprout, color: '#10b981', threshold: 0, next: 50, description: 'The foundation of your preventive wellness routine.' },
  { stage: 1, name: 'Sprout', icon: Leaf, color: '#38bdf8', threshold: 50, next: 150, description: 'Early adherence habits taking root through daily care.' },
  { stage: 2, name: 'Small Plant', icon: Sprout, color: '#14b8a6', threshold: 150, next: 300, description: 'Clinical consistency established across key metrics.' },
  { stage: 3, name: 'Growing Plant', icon: TreeDeciduous, color: '#10b981', threshold: 300, next: 500, description: 'Robust routine stability and sustained lifestyle adherence.' },
  { stage: 4, name: 'Flowering Plant', icon: Flower2, color: '#f59e0b', threshold: 500, next: 750, description: 'Active metabolic resilience and positive biomarker trajectory.' },
  { stage: 5, name: 'Mature Plant', icon: Flower2, color: '#ec4899', threshold: 750, next: 1000, description: 'Regimen mastery with high engagement across clinical goals.' },
  { stage: 6, name: 'Personal Health Garden', icon: ShieldCheck, color: '#8b5cf6', threshold: 1000, next: null, description: 'A comprehensive, lifelong ecosystem of self-care and vitals balance.' },
];

/* ─── 5 Clinical Habit Actions ─── */
export const GARDEN_ACTIONS = [
  {
    type: 'medication_taken',
    label: 'Medication Taken',
    points: 10,
    icon: Pill,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.1)',
    border: 'rgba(56, 189, 248, 0.3)',
    description: 'Confirmed prescribed medication dosage',
  },
  {
    type: 'meal_completed',
    label: 'Meal Completed',
    points: 5,
    icon: UtensilsCrossed,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    description: 'Adhered to nutritional plan meal slot',
  },
  {
    type: 'symptom_logged',
    label: 'Symptom Logged',
    points: 5,
    icon: Stethoscope,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    description: 'Recorded observation, vital sign, or symptom',
  },
  {
    type: 'activity_completed',
    label: 'Activity Done',
    points: 10,
    icon: Activity,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.1)',
    border: 'rgba(236, 72, 153, 0.3)',
    description: 'Completed physical therapy, walk, or workout',
  },
  {
    type: 'checkin',
    label: 'Health Check-in',
    points: 5,
    icon: HeartPulse,
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.1)',
    border: 'rgba(167, 139, 250, 0.3)',
    description: 'Daily health status affirmation',
  },
];

/* ─── Vector Achievements Meta ─── */
export const GARDEN_ACHIEVEMENTS = [
  { id: 'first_step', name: 'First Step', icon: Footprints, desc: 'First daily health check-in logged' },
  { id: 'three_day', name: '3-Day Growth', icon: Sprout, desc: 'Maintained a 3-day active habit streak' },
  { id: 'one_week', name: 'One Week Strong', icon: Leaf, desc: 'Maintained a 7-day health habit streak' },
  { id: 'consistency', name: 'Consistency Builder', icon: Flame, desc: 'Maintained a 30-day health habit streak' },
  { id: 'med_champ', name: 'Medication Champion', icon: Pill, desc: 'Earned 50+ points in medication adherence' },
  { id: 'healthy_plate', name: 'Healthy Plate', icon: UtensilsCrossed, desc: 'Completed 20 logged meals from diet plan' },
  { id: 'active_bloom', name: 'Active Bloom', icon: Activity, desc: 'Logged 10 activity & rehabilitation sessions' },
  { id: 'garden_keeper', name: 'Garden Keeper', icon: ShieldCheck, desc: 'Reached 500+ total cumulative wellness points' },
];
