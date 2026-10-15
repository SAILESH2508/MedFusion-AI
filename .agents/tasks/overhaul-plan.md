# MedFusion AI — Full Application Overhaul Plan
Generated: 2026-10-15

## Audit Findings

### 1. Current CSS Theme vs Required Theme — Differences
The existing `index.css` uses a **botanical/earthy palette** (teal greens, warm peaches, sage) across both modes. The required new palette is **blue-dominant** with teal, green, lavender, purple, peach, coral, and amber accents. Every `--bg-*`, `--text-*`, `--accent-*`, `--border-*`, `--btn-*`, and `--card-*` variable must be replaced wholesale with the required values.

Key divergences found:
- Dark mode root is currently `#203F3C` (deep muted teal) → must be `#263D60` (blue)
- Light mode root is `#F0DCCB` (warm peach) → must be `#D5E3F5` (blue-tinted)
- Grid color variable `--grid-color` used in current CSS but body uses it via variable. The new grid must use hard-coded `rgba()` in `body {}` and `[data-theme="dark"] body {}` as specified.
- No `--card-blue`, `--card-teal`, `--card-green`, `--card-lavender`, `--card-peach`, `--card-coral`, `--card-amber`, `--form-surface`, `--input-surface`, `--accent-blue`, `--accent-teal`, `--accent-green`, `--accent-purple`, `--accent-coral`, `--accent-amber` variables exist → must add all.
- `--primary-accent` is botanical teal → must become blue (`#356CC0` light / `#8DB8F0` dark)
- `--secondary-accent` is copper/terracotta → mapped to coral accent
- Current `--bg-card`, `--bg-card-secondary`, `--bg-upload`, etc. are all peach/sage-based → must map to new card tokens

### 2. Neon/Glassmorphism/Glow Audit
- No `backdrop-filter: blur(>10px)` found on any card or surface (already removed in prior run: `backdrop-filter: none !important` is enforced on `.glass-card`, nav, sidebar)
- No neon colors, no glow animations found in `index.css`
- `AnatomyDiagram.jsx` SVG uses `rgba(0,0,0,...)` gradients hardcoded into `defs` — these are internal to the SVG and acceptable (diagram background, not a page surface)
- `DigitalTwin.jsx` view-mode toggle uses `background: 'rgba(15, 23, 42, 0.88)'` + `backdropFilter: 'blur(8px)'` inline style — this is glassmorphism that must be removed

### 3. Hardcoded Hex/RGB Colors Bypassing CSS Variables
Files with hardcoded colors that bypass the theme system:
- `DigitalTwin.jsx`: inline `rgba(15, 23, 42, 0.88)`, `rgba(255,255,255,0.12/0.15/0.22)` in view-mode toggle toolbar
- `AnatomyDiagram.jsx`: SVG internal colors are illustrative organ colors (anatomically appropriate, acceptable — not surface colors)
- `PatientDashboard.jsx`: preset buttons use `rgba(25,135,84,0.2)`, `rgba(220,53,69,0.2)`, `#4ade80`, `#f87171` — hardcoded green/red for healthy/risk presets. These convey clinical meaning (green=healthy, red=risk) and are acceptable as semantic colors.
- `Upload.jsx` / `GuestUpload.jsx`: upload areas use `var(--bg-upload-rx)` / `var(--bg-upload-lab)` which are CSS variable references — will be updated by theme changes
- Multiple components use `background: 'rgba(255,255,255,0.04)'` for guest form inputs in `GuestUpload.jsx` — these will be replaced with `var(--input-surface)`
- `App.jsx` Vitals Index SVG uses `stroke="rgba(255,255,255,0.08)"` — this is a sidebar dark-surface indicator, acceptable

### 4. Scanner Page (Upload.jsx) Layout Analysis
Current layout: `col-lg-5` left + `col-lg-7` right = already a two-column design. 
Problem found: The left panel has `glass-card float-subtle` with a 4.5s infinite float animation on the entire upload control area — this is distracting and creates layout jitter. The `minHeight: '260px'` drop zone is appropriate.
The right panel (result area) shows a large centered placeholder when empty, which wastes vertical space.

**Two-column redesign changes needed:**
- Remove `float-subtle` class from the left scanner card (animation is distracting in a clinical tool)
- Change left column to `col-lg-4` and right to `col-lg-8` for better result display real estate
- Apply the same layout change in `GuestUpload.jsx`
- Map upload area backgrounds to new `--form-surface` and card tokens
- The Scanner sidebar content (document category selection) is correctly placed — no changes needed there

### 5. Disease Prediction Flow — Trace and Analysis
**Frontend → Backend:**
- `PatientDashboard.jsx` / `GuestDashboard.jsx` → POST `/api/predictions/predict/`
- Payload: `{ disease_type: "Heart Attack" | "Diabetes" | "Cancer Screening", parameters: {...}, patient_id }`
- `views.py::run_prediction` → `ai_service.predict_health_risk(disease_type, parameters)`
- `ai_service.py::predict_health_risk` → `llm_provider.generate_response()` → Gemini/GPT

**Result:** No ML model file mismatch. The prediction engine uses **LLM-based scoring, not a scikit-learn pickle**. The `_predict_using_ml()` method in `ai_service.py` is used for `factors` enrichment only, and has a fallback if the ML model files are absent. The primary risk score comes from LLM or the deterministic fallback calculation in `_get_fallback_prediction()`.

**Issues found:**
- `.env` has `GOOGLE_API_KEY` and `DEFAULT_LLM_MODEL` — no `OPENAI_API_KEY` present. The LLM provider falls back gracefully but `gpt-4o-mini` will always fail silently. This is not a bug, just a configuration fact.
- The prediction result shape matches what the frontend expects: `risk_score`, `risk_level`, `clinical_reasoning`, `remedies` object with `dietary_guidelines`, `lifestyle_modifications`, `clinical_recommendations`, `urgent_warning_signs`. **No mismatch.**
- `simulate_prediction` endpoint is referenced in both dashboards — must verify it exists in `urls.py`. ✓ Confirmed at `predictions/simulate/`

### 6. OCR/Document Analysis Flow
- `Upload.jsx` → POST `/api/prescriptions/upload/` or `/api/pathology/analyze/`
- Backend: `upload_prescription` → `ai_service.analyze_prescription(image_bytes)` → returns `{ medicines, recommendations, urgency, physician, clinical_intent }`
- Frontend normalizes: `res.data.extracted_data` → `{ medicines, recommendations, next_steps }` ← **MISMATCH**
  - Backend `analyze_prescription` returns the medicine list at top level (`res.data.medicines`) BUT it is stored in DB via `Prescription.to_dict()` which wraps it in `extracted_data`
  - When prescriptions come back from list endpoint, `extracted_data` is a JSON string that must be parsed
  - In `Upload.jsx` line `const ext = res.data.extracted_data || {}` — this works for the initial upload response because `upload_prescription` returns `prescription.to_dict()` which has `extracted_data` as a dict
  - **No bug here** — the normalization is correct
- For pathology: backend returns `{ report_data: [...biomarkers...], analysis: {...} }`; frontend processes `res.data.report_data` — ✓ matches

### 7. Diet Recommendations Flow
- `DietPlanner.jsx` → GET/PUT `/api/diet/preferences/`, POST `/api/diet/generate/`, GET `/api/diet/plan/`, POST `/api/diet/swap/`
- All endpoints confirmed in `urls.py` and `diet_views.py` — ✓ fully wired
- The `DietPlanner.jsx` uses `var(--accent-teal)` extensively (inline styles) — will need to update to `var(--accent-teal)` which continues to exist in the new token set
- **Alert in DietPlanner.jsx**: success alert uses `color: '#00f5a0'` (hardcoded neon green) — must replace with `var(--accent-green)`
- Error alert uses `color: '#ff6080'` (hardcoded neon red) — must replace with `var(--accent-coral)` or `var(--status-danger)`

### 8. Health Twin Visualization Analysis
`DigitalTwin.jsx` contains **3 distinct visualization modes**:
1. `AnatomyDiagram` (2D SVG front-facing body map with clickable organs) — **KEEP THIS**
2. `OrganViewer3D` (Three.js/WebGL 3D organ viewer) — **REMOVE**
3. `BioDigitalViewer` (BioDigital cloud iframe viewer) — **REMOVE**

The view-mode toolbar currently shows 3 options: "Anatomy" | "3D WebGL" | "BioDigital". After simplification, only the `AnatomyDiagram` remains, so the entire view-mode toggle bar should be removed. The right-side tabs (Timeline, Safety, Explorer, About) are kept as-is.

Changes needed in `DigitalTwin.jsx`:
- Remove `OrganViewer3D` import and lazy load
- Remove `BioDigitalViewer` import and lazy load  
- Remove `viewMode` state
- Remove the view-mode toolbar (the `position: 'absolute'` panel with 3 buttons)
- Replace the multi-viewer `div` with direct `<AnatomyDiagram>` render
- Remove the `Box` and `Globe` lucide imports
- Remove the glassmorphism `backdropFilter: 'blur(8px)'` from the toolbar

The `OrganViewer3D.jsx` and `BioDigitalViewer.jsx` files themselves can remain on disk (not imported = dead code, harmless, no bundle impact since they were `React.lazy`).

### 9. Vitals Index in Sidebar
The Vitals Index widget in `App.jsx` Sidebar renders when `user.role === 'Patient' && navbarHealthScore`. The score is calculated in `Profile.jsx::calculateHealthScore()` which uses:
- BMI from `profile.weight` and `profile.height` (real user data)
- `profile.allergies.length` (real user data)
- `history` prediction records with `risk_level === 'HIGH' | 'CRITICAL'` (real user data)

**The Vitals Index IS calculated from real user data.** It is not fabricated. It is a composite heuristic score, not a raw biomarker. No removal needed — keep it.

However, the SVG progress ring uses `stroke="rgba(255, 255, 255, 0.08)"` and `stroke={themeAccentColor}` where `themeAccentColor` uses `var(--accent-green)` / `var(--accent-orange)` / `var(--accent-red)`. These will map correctly to the new palette tokens.

The colors `var(--accent-orange)` and `var(--accent-red)` currently exist in the CSS. After the palette change, `--accent-orange` → removed, replaced by `--accent-amber` and `--accent-coral`. The Vitals Index in `App.jsx` references `var(--accent-orange)` and `var(--accent-red)`:
- Must update `App.jsx` to use `var(--accent-amber)` (for moderate) and `var(--accent-coral)` (for unstable)

### 10. Authentication, Profile, Medical Vault, Prediction History, PillBox
- **Auth**: JWT-based, token in localStorage, interceptors in `api.js` — working
- **Profile**: GET `/telemetry/emergency` → returns patient data correctly. `ProfileIdentity`, `MedicalVault`, `RiskAssessments`, `PillBox` are separate tab components — no broken wiring found
- **Medical Vault**: GET `/prescriptions/` + GET `/pathology/` — wired in `Profile.jsx::fetchArchive()` — working
- **Prediction History**: GET `/predictions/` — wired in `Profile.jsx::fetchHistory()` — working
- **PillBox**: Medication adherence uses localStorage (`medfusion_custom_meds_*` and `medfusion_adherence_*`) — works offline. Drug safety check calls POST `/telemetry/drug-safety/` — endpoint confirmed in `urls.py`
- **Emergency QR Token**: POST `/emergency/generate/` + DELETE `/emergency/revoke/` — confirmed in `urls.py`

---

## Implementation Plan

### FEAT-001: Replace CSS Theme Variables (Blue-Dominant Palette)

Replace entire `:root, [data-theme='dark']` and `[data-theme='light']` blocks in `index.css` with the new blue-dominant multi-color system. Update the body grid background CSS. Add new card/form/input surface tokens. Keep all existing utility classes and component rules — only the variable values change.

**Files:** `frontend/src/index.css`

**Specific changes:**

#### A. Replace `:root, [data-theme='dark']` block (lines 1–77 approx)

```css
:root,
[data-theme='dark'] {
  /* Dark Mode — Blue-Dominant Multi-Color */
  --bg-main: #263D60;
  --bg-alt: #2D465F;
  --bg-secondary: #294F4B;
  --bg-surface: #354F79;          /* sidebar / nav use card-blue */
  --bg-card: #354F79;             /* card-blue */
  --bg-card-secondary: #51466C;   /* card-lavender */
  --bg-upload: #315B60;           /* card-teal */
  --bg-upload-rx: #315B60;
  --bg-upload-lab: #294F4B;       /* bg-secondary */
  --bg-form: #334B6D;             /* form-surface */
  --bg-input: #3A5070;            /* input-surface */
  --bg-preview: #355A48;          /* card-green */
  --bg-card-hover: #3D5E8A;

  /* New card tokens */
  --card-blue: #354F79;
  --card-teal: #315B60;
  --card-green: #355A48;
  --card-lavender: #51466C;
  --card-peach: #664A46;
  --card-coral: #67464F;
  --card-amber: #635536;
  --form-surface: #334B6D;
  --input-surface: #3A5070;

  --text-primary: #F1EBDD;
  --text-secondary: #CCD8E8;
  --text-muted: #8FA5BF;

  --border-color: #587397;
  --card-border: #587397;
  --input-border: #587397;
  --border-subtle: rgba(88,115,151,0.20);

  --primary-accent: #8DB8F0;
  --btn-primary: #8DB8F0;
  --btn-primary-hover: #A5C8F5;
  --btn-primary-text: #162840;

  --secondary-accent: #E3A0A0;
  --btn-secondary: #E3A0A0;
  --btn-secondary-hover: #EDADAD;
  --btn-secondary-text: #2A1616;

  --card-shadow: 0 1px 3px rgba(0,0,0,0.30);
  --card-shadow-hover: 0 4px 12px rgba(0,0,0,0.45);

  /* Medical Status Colors */
  --status-normal: #91C69B;
  --status-normal-bg: #263D35;
  --status-normal-border: #4A7F5A;
  --status-warning: #E3C078;
  --status-warning-bg: #3D3220;
  --status-warning-border: #7A6030;
  --status-danger: #E3A0A0;
  --status-danger-bg: #3D2428;
  --status-danger-border: #7A4448;
  --status-info: #7FC8BD;
  --status-info-bg: #1F3840;
  --status-info-border: #3A6870;

  /* Backwards compatibility aliases */
  --bg-deep: var(--bg-main);
  --bg-glow: var(--bg-surface);
  --nav-bg: var(--bg-surface);
  --input-bg: var(--bg-input);
  --input-text: var(--text-primary);
  --accent: var(--primary-accent);
  --theme-accent: var(--primary-accent);
  --theme-accent-glow: rgba(141,184,240,0.15);

  --accent-blue: #8DB8F0;
  --accent-teal: #7FC8BD;
  --accent-green: #91C69B;
  --accent-purple: #B9A1E3;
  --accent-coral: #E3A0A0;
  --accent-amber: #E3C078;
  /* Legacy aliases — keep for any component using old names */
  --accent-red: #E3A0A0;
  --accent-orange: #E3C078;

  --font-main: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

#### B. Replace `[data-theme='light']` block

```css
[data-theme='light'] {
  /* Light Mode — Blue-Dominant Multi-Color */
  --bg-main: #D5E3F5;
  --bg-alt: #D9E8F2;
  --bg-secondary: #D9E8DC;
  --bg-surface: #BED4F0;          /* card-blue for nav/sidebar */
  --bg-card: #BED4F0;             /* card-blue */
  --bg-card-secondary: #D8CEF0;   /* card-lavender */
  --bg-upload: #B9DFDA;           /* card-teal */
  --bg-upload-rx: #B9DFDA;
  --bg-upload-lab: #D9E8DC;       /* bg-secondary */
  --bg-form: #C8D9EF;             /* form-surface */
  --bg-input: #DCE6F5;            /* input-surface */
  --bg-preview: #C8E2CD;          /* card-green */
  --bg-card-hover: #AAC5E5;

  /* New card tokens */
  --card-blue: #BED4F0;
  --card-teal: #B9DFDA;
  --card-green: #C8E2CD;
  --card-lavender: #D8CEF0;
  --card-peach: #F0D0BB;
  --card-coral: #EAC2C0;
  --card-amber: #F0DDAA;
  --form-surface: #C8D9EF;
  --input-surface: #DCE6F5;

  --text-primary: #243651;
  --text-secondary: #4B607A;
  --text-muted: #7090A8;

  --border-color: #A9BED9;
  --card-border: #A9BED9;
  --input-border: #A9BED9;
  --border-subtle: rgba(169,190,217,0.30);

  --primary-accent: #356CC0;
  --btn-primary: #356CC0;
  --btn-primary-hover: #2A5AA8;
  --btn-primary-text: #FFFFFF;

  --secondary-accent: #B95759;
  --btn-secondary: #B95759;
  --btn-secondary-hover: #A04648;
  --btn-secondary-text: #FFFFFF;

  --card-shadow: 0 1px 3px rgba(36,54,81,0.10);
  --card-shadow-hover: 0 4px 12px rgba(36,54,81,0.18);

  /* Medical Status Colors */
  --status-normal: #397B58;
  --status-normal-bg: #D3EAD9;
  --status-normal-border: #88C5A0;
  --status-warning: #A87321;
  --status-warning-bg: #F5E8CC;
  --status-warning-border: #DDB870;
  --status-danger: #B95759;
  --status-danger-bg: #F5D8D8;
  --status-danger-border: #D98A8C;
  --status-info: #267F80;
  --status-info-bg: #D0EBF0;
  --status-info-border: #78C0C8;

  /* Backwards compatibility aliases */
  --bg-deep: var(--bg-main);
  --bg-glow: var(--bg-surface);
  --nav-bg: var(--bg-surface);
  --input-bg: var(--bg-input);
  --input-text: var(--text-primary);
  --accent: var(--primary-accent);
  --theme-accent: var(--primary-accent);
  --theme-accent-glow: rgba(53,108,192,0.15);

  --accent-blue: #356CC0;
  --accent-teal: #267F80;
  --accent-green: #397B58;
  --accent-purple: #7758AA;
  --accent-coral: #B95759;
  --accent-amber: #A87321;
  /* Legacy aliases */
  --accent-red: #B95759;
  --accent-orange: #A87321;

  --font-main: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

#### C. Replace body grid background

```css
body {
  background-color: var(--bg-main) !important;
  background-image:
    linear-gradient(rgba(53,108,192,0.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(53,108,192,0.10) 1px, transparent 1px) !important;
  background-size: 30px 30px !important;
  background-position: 0 0 !important;
  background-attachment: fixed !important;
  color: var(--text-primary);
  font-family: var(--font-main);
  overflow-x: hidden;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

[data-theme="dark"] body {
  background-image:
    linear-gradient(rgba(141,184,240,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(141,184,240,0.08) 1px, transparent 1px) !important;
  background-size: 30px 30px !important;
}
```

**Note:** The existing `body` rule already uses `var(--grid-color)`. The grid color variable should be removed from the variable definitions and the body rule should use the hard-coded `rgba()` values as above, with the dark override rule added separately.

#### D. Update autofill colors

```css
[data-theme='light'] input:-webkit-autofill,
[data-theme='light'] input:-webkit-autofill:hover,
[data-theme='light'] input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #DCE6F5 inset !important;
  -webkit-text-fill-color: #243651 !important;
  caret-color: #243651 !important;
}

[data-theme='dark'] input:-webkit-autofill,
[data-theme='dark'] input:-webkit-autofill:hover,
[data-theme='dark'] input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #3A5070 inset !important;
  -webkit-text-fill-color: #F1EBDD !important;
  caret-color: #F1EBDD !important;
}
```

#### E. Update modal overlay colors

```css
.modal-overlay {
  background: rgba(26,40,64,0.70) !important;
}
[data-theme='light'] .modal-overlay {
  background: rgba(36,54,81,0.50) !important;
}
```

**Verify:** `npm run dev` — application starts. Both light and dark mode show blue-tinted backgrounds everywhere, no white or earthy-peach surfaces. Grid lines visible on both themes.

---

### FEAT-002: Apply Color Tokens Across Components + Scanner Redesign

Fix hardcoded colors, apply multi-color card surfaces across pages, and implement the Scanner (Upload.jsx + GuestUpload.jsx) column-ratio fix.

#### A. Fix `App.jsx` — Vitals Index accent color references

In the Sidebar component `App.jsx`, update the `themeAccentColor` mapping:

```js
// Before:
const themeAccentColor = scoreNum >= 85 ? 'var(--accent-green)' : scoreNum >= 70 ? 'var(--accent-orange)' : 'var(--accent-red)';

// After:
const themeAccentColor = scoreNum >= 85 ? 'var(--accent-green)' : scoreNum >= 70 ? 'var(--accent-amber)' : 'var(--accent-coral)';
```

Also update Mobile nav dropdown background:
```js
// Before: style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
// After: style={{ background: 'var(--bg-form)', borderColor: 'var(--border-color)' }}
```

#### B. `Upload.jsx` and `GuestUpload.jsx` — Scanner Column Ratio + Float Animation

Both files use `col-lg-5` / `col-lg-7`. Change to `col-lg-4` / `col-lg-8`:

**Upload.jsx:**
- Line: `<div className="col-lg-5 col-md-5 reveal d-flex">` → `<div className="col-lg-4 col-md-4 reveal d-flex">`
- Line: `<div className="col-lg-7 col-md-7 reveal d-flex">` → `<div className="col-lg-8 col-md-8 reveal d-flex">`
- Remove `float-subtle` from the left panel's `glass-card`: `className="glass-card float-subtle p-4..."` → `className="glass-card p-4..."`
- Guest form inputs currently use `background: 'rgba(255,255,255,0.04)'` → replace with `background: 'var(--input-surface)'`

**GuestUpload.jsx:** Same column ratio changes. Same `float-subtle` removal. Same input background fix.

#### C. Apply Multi-Color Card Surfaces to Pages

The feature cards in `Landing.jsx` currently use `card-secondary`, `panel-form`, `panel-upload-rx`. These class names still exist but now point to the new colors. No JSX change needed for Landing — the class names remain, the CSS variables behind them are updated.

**DietPlanner.jsx** — Fix hardcoded alert colors:
- `color: '#00f5a0'` → `color: 'var(--accent-green)'`
- `color: '#ff6080'` → `color: 'var(--accent-coral)'`
- `background: 'rgba(0,200,130,0.12)'` → `background: 'var(--status-normal-bg)'`
- `border: '1px solid rgba(0,200,130,0.3)'` → `border: '1px solid var(--status-normal-border)'`
- `background: 'rgba(255,50,80,0.1)'` → `background: 'var(--status-danger-bg)'`
- `border: '1px solid rgba(255,50,80,0.3)'` → `border: '1px solid var(--status-danger-border)'`

The `MealCard` component in `DietPlanner.jsx` uses `background: isDone ? 'var(--bg-upload)' : 'var(--bg-card)'` — already uses variables, will update correctly.

**DigitalTwin.jsx** — Fix glassmorphism in view-mode toggle:
Remove `backdropFilter: 'blur(8px)'` from the view-mode toggle container.
Replace `background: 'rgba(15, 23, 42, 0.88)'` with `background: 'var(--bg-form)'`.
Replace `border: '1px solid rgba(255,255,255,0.12)'` with `border: '1px solid var(--border-color)'`.
Button active state: `background: 'rgba(255,255,255,0.15)'` → `background: 'var(--bg-upload)'`.
Button active border: `'1px solid rgba(255,255,255,0.22)'` → `'1px solid var(--border-color)'`.
Button active color: `'#ffffff'` → `'var(--text-primary)'`.
Button inactive color: `'rgba(255,255,255,0.55)'` → `'var(--text-secondary)'`.

**Dashboard pages** — The `PatientDashboard.jsx` and `GuestDashboard.jsx` use `predictor-card` class which inherits from CSS variables — will update automatically. The preset buttons use green/red semantic colors which are acceptable and should not be changed (they communicate healthy vs. risk intent clearly).

**Files:** `frontend/src/App.jsx`, `frontend/src/pages/Upload.jsx`, `frontend/src/pages/GuestUpload.jsx`, `frontend/src/pages/DietPlanner.jsx`, `frontend/src/pages/DigitalTwin.jsx`

**Verify:** `npm run dev` — Scanner page shows wider result panel. No float animation on upload card. DietPlanner alerts use theme colors. DigitalTwin toolbar has no blur effect.

---

### FEAT-003: Health Twin Simplification — Remove 3D/BioDigital, Keep 2D SVG Anatomy

Simplify `DigitalTwin.jsx` to use only the `AnatomyDiagram` 2D SVG front-facing body map.

#### Changes in `DigitalTwin.jsx`:

1. **Remove lazy imports:**
```js
// Remove these two lines:
const OrganViewer3D = React.lazy(() => import('./digital-twin/OrganViewer3D'));
const BioDigitalViewer = React.lazy(() => import('./digital-twin/BioDigitalViewer'));
```

2. **Remove unused Lucide icons:**
```js
// Remove Box and Globe from import:
import { Cpu, Activity, Shield, Zap, Info, Heart, Wind, Droplet, Brain as BrainIcon, FlaskConical, RotateCcw, AlertTriangle } from 'lucide-react';
// (remove Globe, Box)
```

3. **Remove `viewMode` state:**
```js
// Remove: const [viewMode, setViewMode] = useState('diagram');
```

4. **Remove the view-mode toolbar** (the entire `position: 'absolute'` div at top of viewer card that contains the 3 mode buttons and the organ badge).

5. **Simplify the viewer area** — replace the complex stacked absolute-positioned multi-viewer with a direct render:
```jsx
{/* Viewers — simplified to anatomy diagram only */}
<div style={{ height: '460px', position: 'relative' }}>
  <AnatomyDiagram selectedOrgan={selectedOrgan} onOrganSelect={setSelectedOrgan} patientData={patientData} />
</div>
```
The organ badge and reset button should be moved to a simple toolbar above the viewer (outside the absolute-position overlay) or kept in the sidebar organ selector.

6. **Keep** the `OrganInfoPanel`, `HealthTimeline`, `MedicationSafetyPanel`, `HealthChangeExplorer`, `AboutTab` unchanged.

7. **Update the `AboutTab` text** — remove the section about "3D Models & Licensed Datasets" that describes Three.js/BioDigital options (now irrelevant). Replace with a description of the 2D anatomy diagram.

**Files:** `frontend/src/pages/DigitalTwin.jsx`

**Verify:** `npm run dev` — Navigate to `/digital-twin`. Page loads showing only the 2D anatomy SVG diagram. No view mode buttons. Clicking organs still works. Right panel tabs still function.

---

### FEAT-004: Bug Fixes — Remaining Issues

#### A. `index.css` — Remove `--grid-color` variable
After adding the grid directly to `body {}` using hardcoded `rgba()`, remove `--grid-color: rgba(...)` from both theme blocks so it does not create confusion.

#### B. `App.jsx` — Remove incorrect `bg-white-5` class from Vitals Index container
The sidebar Vitals Index uses `className="... bg-white-5 p-3 rounded-4 border border-white-5 ..."`. The class `bg-white-5` is defined in index.css as `background: var(--bg-card) !important; border: 1px solid var(--border-color) !important;` — this will render correctly with the new palette. No change needed here.

#### C. `PatientDashboard.jsx` — Verify `renderDiseaseVitals` result display uses theme variables
The result display section uses `glass-card` and CSS variables throughout. After theme variable replacement, colors will apply automatically. No specific JSX changes needed.

#### D. `GuestDashboard.jsx` — Consistent with PatientDashboard
Same theme variable usage — auto-applies via FEAT-001.

#### E. Fix `col-md-5` missing in index.css grid
In `index.css`, `col-md-5` is missing from the `@media (min-width: 768px)` block. Currently only `col-md-3`, `col-md-4` are defined there. `Upload.jsx` uses `col-md-5` (before FEAT-002 changes it). After FEAT-002 changes to `col-md-4`, this becomes moot. But for general correctness, add `col-md-5` to the CSS.

Also add `col-md-6` which is used by `PatientDashboard.jsx` in disease vitals (within `renderDiseaseVitals`):
```css
@media (min-width: 768px) {
  .col-md-3 { flex: 0 0 25%; max-width: 25%; }
  .col-md-4 { flex: 0 0 33.333333%; max-width: 33.333333%; }
  .col-md-5 { flex: 0 0 41.666667%; max-width: 41.666667%; }
  .col-md-6 { flex: 0 0 50%; max-width: 50%; }
  .col-lg-3 { flex: 0 0 25%; max-width: 25%; }  /* for DoctorDashboard stats */
}
```

#### F. `ThemeContext.jsx` — ThemeContext export
The file exports `ThemeContext` as default and named `ThemeProvider`. The `useTheme` hook is imported from `./context/useTheme` in `App.jsx` — verify this file exists.

**Files:** `frontend/src/index.css`, `frontend/src/App.jsx`, `frontend/src/pages/dashboard/PatientDashboard.jsx`

**Verify:** `npm run dev` — Full application loads in both light and dark mode without console errors. Scanner page, Health Twin, Dashboard, Diet Planner, Profile all render correctly with the new blue palette.

---

## Complete CSS Variable Tables (Required — Verbatim)

### Light Mode
```
--bg-main: #D5E3F5
--bg-alt: #D9E8F2
--bg-secondary: #D9E8DC
--card-blue: #BED4F0
--card-teal: #B9DFDA
--card-green: #C8E2CD
--card-lavender: #D8CEF0
--card-peach: #F0D0BB
--card-coral: #EAC2C0
--card-amber: #F0DDAA
--form-surface: #C8D9EF
--input-surface: #DCE6F5
--text-primary: #243651
--text-secondary: #4B607A
--border: #A9BED9
--accent-blue: #356CC0
--accent-teal: #267F80
--accent-green: #397B58
--accent-purple: #7758AA
--accent-coral: #B95759
--accent-amber: #A87321
```

### Dark Mode
```
--bg-main: #263D60
--bg-alt: #2D465F
--bg-secondary: #294F4B
--card-blue: #354F79
--card-teal: #315B60
--card-green: #355A48
--card-lavender: #51466C
--card-peach: #664A46
--card-coral: #67464F
--card-amber: #635536
--form-surface: #334B6D
--input-surface: #3A5070
--text-primary: #F1EBDD
--text-secondary: #CCD8E8
--border: #587397
--accent-blue: #8DB8F0
--accent-teal: #7FC8BD
--accent-green: #91C69B
--accent-purple: #B9A1E3
--accent-coral: #E3A0A0
--accent-amber: #E3C078
```

### Grid Background CSS for body
```css
body {
  background-image:
    linear-gradient(rgba(53,108,192,0.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(53,108,192,0.10) 1px, transparent 1px);
  background-size: 30px 30px;
}
[data-theme="dark"] body {
  background-image:
    linear-gradient(rgba(141,184,240,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(141,184,240,0.08) 1px, transparent 1px);
  background-size: 30px 30px;
}
```

---

## Build & Test Commands
- Frontend: `cd d:\MEDICAL_PROJECT\medfusion-ai\frontend && npm run dev`
- Frontend build: `cd d:\MEDICAL_PROJECT\medfusion-ai\frontend && npm run build`
- Backend: `cd d:\MEDICAL_PROJECT\medfusion-ai\backend && python manage.py runserver`
- No automated test suite configured. Verification is manual via `npm run dev` + browser inspection.
