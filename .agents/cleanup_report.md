# MedFusion AI — Dead Feature Cleanup Report

**Date:** 2026-10-05  
**Commit:** `0dce38e`  
**Review verdict:** ✅ APPROVED

---

## Removed Features

| Feature | Description |
|---|---|
| **Neurological Disease Predictor** | Removed the neurological/stroke prediction `elif` branch from `ai_service.py` and all associated state, handlers, and sidebar tile from the patient/guest dashboards |
| **Home Remedies suggestions** | Removed `home_remedies` key from the AI fallback remedies dict and from all dashboard tab/export sections |
| **OTC (Over-the-Counter) Suggestions** | Removed `otc_suggestions` key from the AI fallback remedies dict and from all dashboard tab/export sections |
| **Cohere LLM Provider** | Removed Cohere import, enum value, model config, API key loading, and generate branch from `llm_provider.py` |
| **Anthropic LLM Provider** | Removed Anthropic import, enum value, model config, API key loading, and generate branch from `llm_provider.py` |
| **Daily Clinical Planner** | Removed the Daily Clinical Planner widget, all planner state and handlers, and localStorage persistence from `DoctorDashboard.jsx` |
| **Consultations Profile Tab** | Removed the Consultations tab from the Profile page sidebar; deleted `Consultations.jsx` |
| **Symptom Diary Profile Tab** | Removed the Symptom Diary tab from the Profile page sidebar; deleted `SymptomDiary.jsx` |
| **Hybrid & Topo Map Layers** | Removed `hybrid` and `topo` tile layer entries and their special-case `useEffect` branch from `InteractiveMap.jsx` |
| **SmartCard Scanner Beam Animation** | Removed `smartcard-scanner-beam` and `smartcard-bio-grid` divs from `ProfileIdentity.jsx` and the `scanSweep` keyframe from `index.css` |

---

## Kept Features

- **Google and OpenAI LLM providers** — the fallback chain is retained with these two providers plus the local fallback
- **4-category remedy schema** — the LLM prompt and fallback dict now return exactly: prescription, lifestyle, dietary, and monitoring categories
- **Patient Dashboard AI report** — core AI report display and remaining remedy category tabs are preserved
- **Guest Dashboard** — mirrors the same kept/removed surface as PatientDashboard
- **Doctor Dashboard** — all features except the Daily Clinical Planner are preserved
- **Profile page** — Identity, Vault, and Adherence tabs remain; 3-tile sidebar and PillBox are kept
- **ProfileIdentity** — SmartCard display is retained minus the removed beam/bio-grid overlays
- **InteractiveMap** — street and satellite tile layers are preserved
- **All backend medical services** — disease prediction, prescription analysis, and symptom analysis are untouched outside the removed branches

---

## Modified Files

| File | Change summary |
|---|---|
| `backend/medical/services/ai_service.py` | Removed `home_remedies`, `otc_suggestions` from fallback dict; removed neurological/stroke `elif` branch; LLM prompt trimmed to 4 remedy categories |
| `backend/medical/services/llm_provider.py` | Removed Anthropic and Cohere imports, enum values, model configs, key loading, and client/generate branches; fallback chain reduced to 3 models |
| `backend/requirements.txt` | Removed `anthropic` and `cohere` packages |
| `frontend/src/pages/dashboard/PatientDashboard.jsx` | Removed neurological state/handlers/sidebar tile; removed `home_remedies`/`otc_suggestions` tabs and export sections |
| `frontend/src/pages/dashboard/GuestDashboard.jsx` | Same removals as PatientDashboard for the guest path |
| `frontend/src/pages/dashboard/DoctorDashboard.jsx` | Removed Daily Clinical Planner widget, all planner state and handlers, localStorage persistence, and Calendar import |
| `frontend/src/pages/Profile.jsx` | Removed Consultations/SymptomDiary imports, diary tab, and related sidebar tiles; reduced to 3-tile sidebar |
| `frontend/src/pages/profile/ProfileIdentity.jsx` | Removed `smartcard-scanner-beam` and `smartcard-bio-grid` divs |
| `frontend/src/index.css` | Removed `scanSweep` keyframe; set `animation: none` on `.smartcard-scanner-beam` |
| `frontend/src/components/InteractiveMap.jsx` | Removed `hybrid` and `topo` tile layer entries and special-case `useEffect` branch |
| `frontend/package.json` | Removed `recharts` dependency |

---

## Deleted Files

| File | Reason |
|---|---|
| `frontend/src/pages/profile/Consultations.jsx` | Consultations profile tab removed |
| `frontend/src/pages/profile/SymptomDiary.jsx` | Symptom Diary profile tab removed |

---

## Dependencies Removed

### `backend/requirements.txt`

| Package | Reason |
|---|---|
| `anthropic` | Anthropic LLM provider removed |
| `cohere` | Cohere LLM provider removed |

### `frontend/package.json`

| Package | Reason |
|---|---|
| `recharts` | Used exclusively by the removed Daily Clinical Planner widget |

---

## Build Result

The **Vite production build completes with zero errors.**

All deleted files, removed imports, and stripped state variables are consistent across the codebase — no broken references or missing identifiers were found.

---

## Review Findings (post-approval notes)

Two minor residual items were flagged by the reviewer. These are inert at runtime but are dead code:

1. **Dead diary branch in `Profile.jsx`** — `{activeTab === 'diary' && null}` at line 649 is a leftover from the diary removal. The `activeTab` value can never equal `'diary'` since the URL param is validated against `['identity', 'vault', 'adherence']`. This line should be deleted in a follow-up sweep.

2. **Orphaned CSS rules in `index.css`** — `.smartcard-scanner-beam` and `.smartcard-bio-grid` selector blocks remain after their JSX counterparts were removed from `ProfileIdentity.jsx`. The `animation: none` guard prevents any visual effect, but both rule blocks are dead weight and should be removed in a follow-up sweep.

Neither finding affects the build or runtime behaviour.
