# MedFusion AI — Cleanup & Removal Implementation Plan

Generated from codebase exploration. Every item is grounded in actual code read from the repo.

---

## File Reference Map

| Short Name | Full Path |
|---|---|
| `ai_service.py` | `d:\MEDICAL_PROJECT\medfusion-ai\backend\medical\services\ai_service.py` |
| `llm_provider.py` | `d:\MEDICAL_PROJECT\medfusion-ai\backend\medical\services\llm_provider.py` |
| `requirements.txt` | `d:\MEDICAL_PROJECT\medfusion-ai\backend\requirements.txt` |
| `PatientDashboard.jsx` | `d:\MEDICAL_PROJECT\medfusion-ai\frontend\src\pages\dashboard\PatientDashboard.jsx` |
| `GuestDashboard.jsx` | `d:\MEDICAL_PROJECT\medfusion-ai\frontend\src\pages\dashboard\GuestDashboard.jsx` |
| `DoctorDashboard.jsx` | `d:\MEDICAL_PROJECT\medfusion-ai\frontend\src\pages\dashboard\DoctorDashboard.jsx` |
| `Profile.jsx` | `d:\MEDICAL_PROJECT\medfusion-ai\frontend\src\pages\Profile.jsx` |
| `Consultations.jsx` | `d:\MEDICAL_PROJECT\medfusion-ai\frontend\src\pages\profile\Consultations.jsx` |
| `SymptomDiary.jsx` | `d:\MEDICAL_PROJECT\medfusion-ai\frontend\src\pages\profile\SymptomDiary.jsx` |
| `ProfileIdentity.jsx` | `d:\MEDICAL_PROJECT\medfusion-ai\frontend\src\pages\profile\ProfileIdentity.jsx` |
| `InteractiveMap.jsx` | `d:\MEDICAL_PROJECT\medfusion-ai\frontend\src\components\InteractiveMap.jsx` |
| `index.css` | `d:\MEDICAL_PROJECT\medfusion-ai\frontend\src\index.css` |
| `package.json` | `d:\MEDICAL_PROJECT\medfusion-ai\frontend\package.json` |

---

## Step 1 — Backend: Simplify `_get_fallback_prediction()` remedies dict

**What to do:** In `ai_service.py`, in the `_get_fallback_prediction()` method, remove `home_remedies` and `otc_suggestions` from the initial `remedies` dict that is defined once near the top of the method (around line 290). Also remove all subsequent `remedies["home_remedies"] = [...]` and `remedies["otc_suggestions"] = [...]` assignment blocks in every disease branch (diabetes ~lines 437–441, heart ~lines 492–496, neurological ~lines 619–625, cancer ~lines 663–667).

The final `remedies` dict initializer should be:
```python
remedies = {
    "stage": stage_val,
    "dietary_guidelines": [],
    "lifestyle_modifications": [],
    "clinical_recommendations": [],
    "urgent_warning_signs": []
}
```

Remove all 8 assignment blocks total (2 per disease branch: one for `home_remedies`, one for `otc_suggestions`).

**Files:** `ai_service.py`

**Verify:** `cd d:\MEDICAL_PROJECT\medfusion-ai\backend && python -c "from medical.services.ai_service import ai_service; print('OK')"` — no ImportError.

---

## Step 2 — Backend: Update LLM prompt schema in `predict_health_risk()`

**What to do:** In `ai_service.py`, `predict_health_risk()` method (around line 253), the `prompt` string lists `home_remedies` and `otc_suggestions` under the `remedies` JSON schema. Remove those two bullet points from the prompt string. The `remedies` block in the prompt should list only:
- `stage`
- `dietary_guidelines`
- `lifestyle_modifications`
- `clinical_recommendations`
- `urgent_warning_signs`

**Files:** `ai_service.py`

**Verify:** Same command as Step 1 — `python -c "from medical.services.ai_service import ai_service; print('OK')"`.

---

## Step 3 — Backend: Remove neurological block from `_get_fallback_prediction()`

**What to do:** In `ai_service.py`, `_get_fallback_prediction()`, delete the entire `elif "neuro" in disease or "stroke" in disease or "cognitive" in disease or "dementia" in disease:` block (lines ~557–627). This includes all code from that `elif` through the closing of its `remedies["urgent_warning_signs"]` assignment. The cancer `else:` block immediately follows and should remain intact.

**Files:** `ai_service.py`

**Verify:** `python -c "from medical.services.ai_service import ai_service; print('OK')"` — no SyntaxError.

---

## Step 4 — Backend: Remove Anthropic & Cohere from `llm_provider.py`

**What to do:** Make the following removals in `llm_provider.py`:

1. **Imports (lines 9–10):** Remove `import anthropic` and `import cohere`.
2. **Enum (lines 19–22):** Remove `ANTHROPIC = "anthropic"` and `COHERE = "cohere"` from `ModelProvider`.
3. **`self.models` dict:** Remove the `"gemini-2.5-pro-preview-06-05"`, `"gemini-2.0-flash-lite"`, `"gemini-1.5-flash"`, `"command-r"`, and `"command"` entries. Keep only: `"gemini-2.5-flash"`, `"gemini-2.0-flash"`, `"gpt-4o-mini"`.
4. **`_load_keys()`:** Remove the `self.cohere_keys = [...]` block (3 lines).
5. **`_get_client()`:** Remove the `elif provider == ModelProvider.COHERE and self.cohere_keys:` branch entirely.
6. **`generate_response()`:** Remove the `elif provider == ModelProvider.COHERE:` block (the `h = ...` and `res = await ...` Cohere block). Note: there is no Anthropic `generate_response` branch in this file — Anthropic is import-only.
7. **`_select_best_fallback()`:** Replace the `chain` list with:
   ```python
   chain = [
       'gemini-2.5-flash',
       'gemini-2.0-flash',
       'gpt-4o-mini',
   ]
   ```

**Files:** `llm_provider.py`

**Verify:** `python -c "from medical.services.llm_provider import llm_provider; print('OK')"` — no ImportError or AttributeError.

---

## Step 5 — Backend: Remove Anthropic & Cohere from `requirements.txt`

**What to do:** Remove the lines `anthropic==0.105.2` and `cohere==7.0.3` from `requirements.txt`.

**Files:** `requirements.txt`

**Verify:** `python -c "import ast; open('requirements.txt').read()"` — visual check that neither package appears. No install needed.

---

## Step 6 — Frontend: Remove `recharts` from `package.json`

**What to do:** Confirmed via grep — `recharts` is not imported or used anywhere in `frontend/src`. Remove the `"recharts": "^3.8.1"` line from the `dependencies` section of `package.json`. Do NOT run `npm install`.

**Files:** `package.json`

**Verify:** `cd d:\MEDICAL_PROJECT\medfusion-ai\frontend && npx vite build 2>&1 | Select-String -Pattern "recharts|error" | head -20` — build should not reference recharts (it was never imported, so this is a no-op removal).

---

## Step 7 — Frontend: Remove neurological from `PatientDashboard.jsx`

**What to do:** Make the following removals in `PatientDashboard.jsx`:

1. **State declarations (lines ~47–56):** Remove the three neurological state variables and their `useState` initializers:
   ```js
   const [sleepQuality, setSleepQuality] = useState(7);
   const [physicalActivity, setPhysicalActivity] = useState(4);
   const [neurologicalSymptoms, setNeurologicalSymptoms] = useState({...});
   ```

2. **`useEffect` hasChanges deps array (line ~142):** Remove `sleepQuality, physicalActivity, neurologicalSymptoms` from the dependency array.

3. **`handleNeurologicalSymptomToggle` function (~lines 187–203):** Delete the entire function.

4. **`applyNeurologicalPreset` function (~lines 324–356):** Delete the entire function.

5. **`getThemeClass()` (~line 359):** Remove the line `if (selectedDisease === 'neurological') return 'theme-cancer';`.

6. **`isPredictorVisible` callback:**
   - Remove the `if (diseaseId === 'neurological') { ... }` block (the `sleepQuality`, `physicalActivity`, `neurologicalSymptoms` check).
   - Remove `sleepQuality, physicalActivity, neurologicalSymptoms` from the `useCallback` deps array.

7. **Sidebar `useEffect` (`setSidebarContent`):** Remove the `{ id: 'neurological', label: 'Neurological & Stroke Screening', icon: <Cpu size={20} /> }` entry from the `allPredictors` array. If `Cpu` is no longer used elsewhere in the file, remove it from the lucide-react import line.

8. **`executeApiCall` inside `runPredictionAnalysis`:**
   - Remove the `else if (selectedDisease === 'neurological') { ... }` params block.
   - Remove `neurological: 'Neurological Screening'` from the `diseaseNameMap` object.

9. **`renderDiseaseVitals()` switch statement:** Remove the entire `case 'neurological':` block (both occurrences — the vitals form case and the symptoms checklist case, roughly lines 1287–1542 and surrounding).

**Files:** `PatientDashboard.jsx`

**Verify:** `cd d:\MEDICAL_PROJECT\medfusion-ai\frontend && npx vite build` — zero errors related to PatientDashboard.

---

## Step 8 — Frontend: Remove neurological from `GuestDashboard.jsx`

**What to do:** Apply the exact same set of removals as Step 7 to `GuestDashboard.jsx`. The structure is identical. Specifically:

1. Remove `sleepQuality`, `physicalActivity`, `neurologicalSymptoms` state declarations (~lines 52–61).
2. Remove those three from the `useEffect` hasChanges dependency array (~line 131).
3. Remove `handleNeurologicalSymptomToggle` function (~lines 201–217).
4. Remove `applyNeurologicalPreset` function (~lines 324–356).
5. Remove `if (selectedDisease === 'neurological') return 'theme-cancer';` from `getThemeClass()`.
6. Remove the `if (diseaseId === 'neurological') { ... }` block from `isPredictorVisible`, and remove `sleepQuality, physicalActivity, neurologicalSymptoms` from its `useCallback` deps array.
7. Remove the `{ id: 'neurological', ... }` entry from `allPredictors` in the sidebar `useEffect`. Remove `Cpu` from lucide imports if no longer used.
8. Remove the `else if (selectedDisease === 'neurological')` params block from `executeApiCall`, and remove `neurological: 'Neurological Screening'` from `diseaseNameMap`.
9. Remove both `case 'neurological':` blocks from `renderDiseaseVitals()`.

Note: In `GuestDashboard.jsx` the `allPredictors` array is used as `const displayedPredictors = allPredictors;` (no filtering), so after removing neurological there will only be 3 entries.

**Files:** `GuestDashboard.jsx`

**Verify:** `cd d:\MEDICAL_PROJECT\medfusion-ai\frontend && npx vite build` — zero errors.

---

## Step 9 — Frontend: Update remedy tabs in `PatientDashboard.jsx` (remove OTC/Home Remedies tab content)

**What to do:** The current remedy tab structure has 3 tabs: `diet`, `lifestyle`, `clinical`. The `clinical` tab (~lines 2120–2165) contains a sub-section called "Extracted OTC & Home Remedies" that renders `otc_suggestions` and `home_remedies` arrays. Since those are removed from the data model, replace the `clinical` tab content:

- Remove the entire `col-md-6` div containing "Extracted OTC & Home Remedies" header and its `otc_suggestions` + `home_remedies` map renders.
- Keep the `col-md-6` that shows "Critical Warning Flags" (`urgent_warning_signs`) and "Clinical Recommendations" (`clinical_recommendations`).
- Change the outer `<div className="row g-3">` layout: since only one column remains, either remove the row/col wrapper or change the col to `col-12` for full width.
- Rename the `clinical` tab button label to better reflect its content — change `"Clinical Follow-up"` to `"Clinical & Warnings"` (or keep as-is if preferred — either is acceptable).

Also add a new 4th tab button for **Warning Signs**:
- Add `<button onClick={() => setRemedyTab('warnings')} ...>Warning Signs</button>` after the `clinical` tab button.
- Add a `{remedyTab === 'warnings' && ...}` block that renders `result.remedies?.urgent_warning_signs`.
- Move the `urgent_warning_signs` display OUT of the `clinical` tab and INTO the new `warnings` tab.
- Update the `clinical` tab to show only `clinical_recommendations` and `otc_suggestions` sub-section removal as above.

The final 4 tabs should be: **Dietary Plan | Lifestyle Changes | Clinical Follow-up | Warning Signs**

**Files:** `PatientDashboard.jsx`

**Verify:** `npx vite build` — zero errors.

---

## Step 10 — Frontend: Update remedy tabs in `GuestDashboard.jsx`

**What to do:** Apply the same tab restructuring as Step 9 to `GuestDashboard.jsx`. The structure is identical (same line patterns, same `remedyTab` state, same `AnimatePresence` blocks). Remove the OTC/home remedies sub-section from the `clinical` tab, add the `warnings` tab rendering `urgent_warning_signs`.

**Files:** `GuestDashboard.jsx`

**Verify:** `npx vite build` — zero errors.

---

## Step 11 — Frontend: Update `handleExportReport` in both dashboards

**What to do:** Both `PatientDashboard.jsx` and `GuestDashboard.jsx` already have correct `handleExportReport` implementations — they already only export `dietary_guidelines`, `lifestyle_modifications`, `clinical_recommendations`, and `urgent_warning_signs`. Confirm there are no `home_remedies` or `otc_suggestions` lines in the export. If any were left from prior state, remove them.

Current export in both files (confirmed by reading code): the export already only includes the 4 correct sections. No change needed unless OTC/home lines were inadvertently present.

**Files:** `PatientDashboard.jsx`, `GuestDashboard.jsx`

**Verify:** Visual code review — `grep -n "home_remedies\|otc_suggestions" frontend/src/pages/dashboard/*.jsx` should return zero matches after Steps 9–10.

---

## Step 12 — Frontend: Remove Daily Clinical Planner from `DoctorDashboard.jsx`

**What to do:** Make the following removals in `DoctorDashboard.jsx`:

1. **State (lines ~53–68):** Remove `plannerTasks` state (with its `useState` lazy initializer reading from `localStorage`) and `newTaskText` state.

2. **Functions:** Remove all four planner functions:
   - `saveTasks()` (~line 107)
   - `addTask()` (~line 113)
   - `toggleTask()` (~line 121)
   - `deleteTask()` (~line 126)

3. **JSX — the entire Daily Clinical Planner widget** (~lines 435–485): Remove the `glass-card` div that starts with `<Calendar className="text-theme-accent animate-pulse" size={18} />` and `Daily Planner` heading, including the add-task input form and tasks list render. This is the first `glass-card` inside the `col-lg-4` column.

4. **`Calendar` import:** After removing the planner widget, `Calendar` is no longer used in `DoctorDashboard.jsx`. Remove `Calendar` from the lucide-react import line (~line 10). Note: `Calendar` IS still used in `App.jsx` and `Consultations.jsx` and `ProfileIdentity.jsx` — those are separate files and are unaffected.

5. **Column layout:** The right `col-lg-4` column should now contain ONLY the Diagnostic Calculators widget (the `glass-card` starting with `<Calculator className="text-theme-accent" size={18} />`). Keep the `d-flex flex-column justify-content-start gap-3` on the column but remove `flex-grow-1` from the Calculators card if it was only there to fill space alongside the planner. Actually: keep the column and its Calculators card exactly as-is — no layout change needed since the Calculators card already has its own fixed sizing.

**Files:** `DoctorDashboard.jsx`

**Verify:** `npx vite build` — zero errors.

---

## Step 13 — Frontend: Delete `Consultations.jsx` and clean `Profile.jsx`

**What to do:**

**Sub-step A — Delete the file:**
Delete `d:\MEDICAL_PROJECT\medfusion-ai\frontend\src\pages\profile\Consultations.jsx`.

**Sub-step B — Edit `Profile.jsx`:**

1. **Import line (~line 19):** Remove `import Consultations from './profile/Consultations';`.

2. **State variables (~lines 186–201):** Remove all 6 Consultations state variables:
   ```js
   const [upcomingAppointments, setUpcomingAppointments] = useState([]);
   const [selectedDoctor, setSelectedDoctor] = useState('');
   const [appointmentDate, setAppointmentDate] = useState('');
   const [appointmentTime, setAppointmentTime] = useState('');
   const [appointmentReason, setAppointmentReason] = useState('');
   const [showBookingModal, setShowBookingModal] = useState(false);
   ```

3. **`handleBookAppointment` function (~lines 203–218):** Remove the entire function.

4. **`adherence` tab JSX (~lines 798–829 in the returned JSX):** In the `{activeTab === 'adherence' && ...}` AnimatePresence block, the inner layout is:
   ```jsx
   <div className="col-lg-6">
     <PillBox ... />
   </div>
   <div className="col-lg-6">
     <Consultations ... />
   </div>
   ```
   Remove the entire `col-lg-6` div wrapping `<Consultations ... />`. Change the remaining `col-lg-6` wrapper around `<PillBox ... />` to `col-12` so PillBox spans full width.

**Files:** `Consultations.jsx` (delete), `Profile.jsx` (edit)

**Verify:** `npx vite build` — no unresolved import error for Consultations.

---

## Step 14 — Frontend: Delete `SymptomDiary.jsx` and clean `Profile.jsx`

**What to do:**

**Sub-step A — Delete the file:**
Delete `d:\MEDICAL_PROJECT\medfusion-ai\frontend\src\pages\profile\SymptomDiary.jsx`.

**Sub-step B — Edit `Profile.jsx`:**

1. **Import line:** Remove `import SymptomDiary from './profile/SymptomDiary';`.

2. **State variables:** Remove all 6 Symptom Diary state variables and their initializers:
   ```js
   const [wellnessRating, setWellnessRating] = useState(8);
   const [energyLevel, setEnergyLevel] = useState('High');
   const [moodState, setMoodState] = useState('Good');
   const [selectedSymptoms, setSelectedSymptoms] = useState({...});
   const [diaryNotes, setDiaryNotes] = useState('');
   const [healthLogs, setHealthLogs] = useState(() => {...});
   ```

3. **Handler functions:** Remove `handleToggleDiarySymptom` and `handleSaveDiaryLog` functions.

4. **`tabThemes` object (~line after the `activeTheme` calculation):** Remove `diary: 'theme-heart',` from the `tabThemes` object.

5. **Tab validation in `activeTab` computation (~line 37):** Change:
   ```js
   const activeTab = (tabParam && ['identity', 'vault', 'adherence', 'diary'].includes(tabParam))
   ```
   to:
   ```js
   const activeTab = (tabParam && ['identity', 'vault', 'adherence'].includes(tabParam))
   ```

6. **Sidebar `useEffect` (patient branch):** Remove the `{ id: 'diary', label: 'Symptom Diary Logs', icon: <Smile size={18} /> }` entry from the tile list array. Remove `diary: 'theme-heart-active'` from `tabThemeClasses` inside the same map. Also remove `Smile` from lucide-react imports if no longer used anywhere else in `Profile.jsx`.

7. **Mobile tab switcher (`d-md-none` div):** Remove the `<div className="col-3 p-0">` entry for `diary`. Change remaining tab wrapper divs from `col-3` to `col-4` (3 tabs × col-4 = 12 grid units).

8. **AnimatePresence JSX block:** Remove the entire:
   ```jsx
   {activeTab === 'diary' && (
     <motion.div key="diary" ...>
       <SymptomDiary ... />
     </motion.div>
   )}
   ```

**Files:** `SymptomDiary.jsx` (delete), `Profile.jsx` (edit)

**Verify:** `npx vite build` — no unresolved import for SymptomDiary.

---

## Step 15 — Frontend: Rename adherence tab labels in `Profile.jsx`

**What to do:** After Steps 13–14, the adherence tab label still says "Pill Box & Consultations" in two places. Update both:

1. **Sidebar `useEffect` tile array:** Change `label: 'Pill Box & Consultations'` to `label: 'Pill Box'` for the `adherence` entry.
2. **Mobile tab switcher:** Change the tab button label for `id: 'adherence'` from `'Pill Box & Consultations'` (or its `.split(' & ')[0]` fallback `'Pill Box'`) to just `'Pill Box'`. Also update the full label string in the tab definition object if there is one.

**Files:** `Profile.jsx`

**Verify:** `npx vite build` — zero errors.

---

## Step 16 — Frontend: Remove decorative overlays from `ProfileIdentity.jsx`

**What to do:** In `ProfileIdentity.jsx`, inside the `<div className="smartcard-hologram p-4 ...">` container, there are two purely decorative elements immediately after the opening div:

```jsx
{/* Holographic visuals */}
<div className="smartcard-bio-grid"></div>
<div className="smartcard-scanner-beam"></div>
```

Remove both lines (the comment and both empty divs). The `smartcard-hologram` container itself remains — only these two children are removed.

**Files:** `ProfileIdentity.jsx`

**Verify:** `npx vite build` — zero errors.

---

## Step 17 — Frontend: Disable scanner animations in `index.css`

**What to do:** Two animations need to be neutralized:

1. **`scanningBeam` animation on `.smartcard-scanner-beam`** (~line 1802 in index.css): Change:
   ```css
   animation: scanningBeam 3s ease-in-out infinite;
   ```
   to:
   ```css
   animation: none;
   ```
   (The element is also being removed from JSX in Step 16, but the CSS class should still be cleaned up.)

2. **`scanSweep` animation** (~line 948): This is referenced in `Upload.jsx` (line 548) and `GuestUpload.jsx` (line 461) via inline style `animation: 'scanSweep 4s linear infinite'`. Remove (or comment out) the `@keyframes scanSweep` block in index.css:
   ```css
   @keyframes scanSweep {
     0% { top: 5%; opacity: 0.2; }
     20% { opacity: 1; }
     50% { top: 95%; opacity: 1; }
     80% { opacity: 1; }
     100% { top: 5%; opacity: 0.2; }
   }
   ```
   The inline style references in Upload.jsx and GuestUpload.jsx remain — with the keyframe removed the animation simply won't play (the element will be static), which is the desired "tone down" effect. If the task requires hard removal: also remove the inline `animation: 'scanSweep ...'` style property from the upload zone scanning-line div in both Upload.jsx and GuestUpload.jsx.

Do NOT touch: `animate-pulse`, `userPulse`, or any framer-motion styles.

**Files:** `index.css`, optionally `Upload.jsx` and `GuestUpload.jsx`

**Verify:** `npx vite build` — zero errors.

---

## Step 18 — Frontend: Simplify tile layers in `InteractiveMap.jsx`

**What to do:** In `InteractiveMap.jsx`:

1. **`TILE_LAYERS` object (~lines 31–57):** Remove the `hybrid` and `topo` entries entirely. Keep only `street` and `satellite`.

2. **Tile-layer switch `useEffect` (~lines 176–205):** Remove the `if (tileLayer === 'hybrid') { ... } else { ... }` special-case. Replace the entire body of the `if/else` with just the `else` branch (the straightforward `L.tileLayer(cfg.url, {...}).addTo(...)` call). No `if` needed since `hybrid` no longer exists.

3. **JSX layer toggle buttons:** These are rendered via `Object.entries(TILE_LAYERS).map(...)` at ~line 277. No change needed here — removing the entries from `TILE_LAYERS` automatically removes the buttons.

**Files:** `InteractiveMap.jsx`

**Verify:** `npx vite build` — zero errors.

---

## Step 19 — Full build verification

**What to do:** After all steps are complete, run a full Vite build to confirm the codebase is clean.

Also run a final grep to confirm all targeted symbols are gone:
- `grep -r "neurological\|neuro" frontend/src --include="*.jsx" --include="*.js"` — should show zero results (except possibly in comments).
- `grep -r "home_remedies\|otc_suggestions" frontend/src backend --include="*.jsx" --include="*.py"` — should show zero results.
- `grep -r "anthropic\|cohere" backend --include="*.py"` — should show zero results.
- `grep -r "Consultations\|SymptomDiary" frontend/src --include="*.jsx"` — should show zero results.

**Files:** All changed files.

**Verify:** `cd d:\MEDICAL_PROJECT\medfusion-ai\frontend && npx vite build` — zero errors, zero warnings about missing modules.

---

## Dependency Map (execution order rationale)

Steps 1–5 are backend-only and independent of frontend steps. Steps 6–18 are frontend-only. Within each group the ordering is:

- Steps 1–3 must precede each other in order (remedies dict → LLM prompt → neurological block in same file).
- Step 4–5 are independent of 1–3 but logically grouped together.
- Steps 6 is independent.
- Steps 7–8 (neurological removal from dashboards) should be done together.
- Steps 9–10 (remedy tab restructure) should follow 7–8 since they touch the same files.
- Steps 11 is a verification pass only.
- Step 12 (DoctorDashboard planner) is independent of steps 7–10.
- Steps 13–15 (Consultations + SymptomDiary from Profile) should be done together.
- Step 16 (ProfileIdentity decoratives) is independent.
- Step 17 (CSS animations) is independent.
- Step 18 (InteractiveMap tiles) is independent.
- Step 19 is the final verification pass.
