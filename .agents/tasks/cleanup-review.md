# MedFusion AI — Dead Feature Cleanup

Removes the neurological disease predictor, home remedies / OTC suggestions from the AI output surface, Cohere and Anthropic provider support, the Daily Clinical Planner from DoctorDashboard, and the Consultations / SymptomDiary tabs from the Profile page. The goal is to trim surface area, reduce dependency footprint, and align the fallback prediction path with the 4-category remedy schema the LLM is now asked to return.

Watch for: one stale dead-code branch (`activeTab === 'diary'`) left in `Profile.jsx` — the diary removal was not fully swept. Two CSS rule blocks (`.smartcard-scanner-beam`, `.smartcard-bio-grid`) remain in `index.css` as orphaned selectors after the corresponding JSX was removed from `ProfileIdentity.jsx`; `animation: none` is set on the beam rule, but the full rule bodies are still present.

**Verdict**: APPROVED

---

## High-level view

The Vite production build completes with zero errors. All deleted files, removed imports, and stripped state variables are consistent across the codebase — no broken references or missing identifiers were found.

The diary tab removal in `Profile.jsx` was 95% complete. The import, component usage, sidebar tile, and URL validation guard were all removed, but a single dead JSX branch (`activeTab === 'diary' && null`) was left behind at line 649.

`index.css` has `animation: none` on `.smartcard-scanner-beam` and the `scanSweep` keyframe is gone, but the `.smartcard-scanner-beam` and `.smartcard-bio-grid` selector blocks remain as dead CSS after their JSX counterparts were removed from `ProfileIdentity.jsx`.

---

<details>
<summary>Issues (2)</summary>

1. **Dead diary branch in Profile.jsx** — `{activeTab === 'diary' && null}` at line 649 is leftover from the diary removal. Delete the line.

2. **Orphaned CSS rules in index.css** — `.smartcard-scanner-beam` and `.smartcard-bio-grid` rule blocks remain after their JSX divs were removed from `ProfileIdentity.jsx`. Remove both selector blocks from `index.css`.

</details>

<details>
<summary>Details</summary>

### Dead diary branch in Profile.jsx

At line 649 of `Profile.jsx`:

```jsx
{activeTab === 'diary' && null}
```

`activeTab` can never equal `'diary'`: the URL param is validated against `['identity', 'vault', 'adherence']`, no sidebar tile sets it, and `setActiveTab('diary')` is never called anywhere. The branch is confirmed dead — not a runtime error — but is residual code from the diary removal that should be swept.

### Orphaned CSS rules in index.css

The `.smartcard-scanner-beam` and `.smartcard-bio-grid` selector blocks remain in `index.css` after their `<div>` counterparts were removed from `ProfileIdentity.jsx`. The `@keyframes scanSweep` (now renamed `scanningBeam` in the file) definition is absent (confirmed by grep), and the beam rule has `animation: none` — so no animation fires. The selectors themselves are dead weight. Both rule blocks should be deleted.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `backend/medical/services/ai_service.py` | Removed `home_remedies`, `otc_suggestions` from fallback remedies dict; removed neurological/stroke `elif` block; LLM prompt trimmed to 4 remedy categories |
| `backend/medical/services/llm_provider.py` | Removed Anthropic and Cohere imports, enum values, model configs, key loading, and client/generate branches; fallback chain reduced to 3 models |
| `backend/requirements.txt` | Removed `anthropic` and `cohere` packages |
| `frontend/src/pages/dashboard/PatientDashboard.jsx` | Removed neurological state/handlers/sidebar tile; removed `home_remedies`/`otc_suggestions` tabs and export sections |
| `frontend/src/pages/dashboard/GuestDashboard.jsx` | Same removals as PatientDashboard for the guest path |
| `frontend/src/pages/dashboard/DoctorDashboard.jsx` | Removed Daily Clinical Planner widget, all planner state and handlers, localStorage persistence, Calendar import |
| `frontend/src/pages/Profile.jsx` | Removed Consultations/SymptomDiary imports; removed diary tab; 3-tile sidebar; col-12 PillBox; `'Pill Box'` label; col-4 mobile tabs — one dead diary branch remains |
| `frontend/src/pages/profile/ProfileIdentity.jsx` | Removed `smartcard-scanner-beam` and `smartcard-bio-grid` divs |
| `frontend/src/index.css` | Removed `scanSweep` keyframe; set `animation: none` on `.smartcard-scanner-beam`; orphaned rule blocks for both removed divs remain |
| `frontend/src/components/InteractiveMap.jsx` | Removed `hybrid` and `topo` tile layer entries and special-case `useEffect` branch |
| `frontend/package.json` | Removed `recharts` dependency |
| `frontend/src/pages/profile/Consultations.jsx` | Deleted |
| `frontend/src/pages/profile/SymptomDiary.jsx` | Deleted |

</details>
