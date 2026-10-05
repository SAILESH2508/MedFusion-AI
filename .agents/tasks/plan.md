# MedFusion AI — 6 Feature Implementation Plan

## Codebase Exploration Findings

**Stack confirmed:**
- Backend: Django 5 + DRF + SimpleJWT, SQLite, views in `backend/medical/views.py`, URLs in `backend/medical/urls.py`
- Frontend: React 19 + Vite 8, NO Tailwind. Custom CSS in `frontend/src/index.css`.
- **Recharts is NOT installed** (not in package.json). Must use pure SVG charts.
- ML models: `backend/medical/ml_models/{heart_attack_rf.pkl, diabetes_rf.pkl, cancer_rf.pkl}` — all present.
- `_predict_using_ml()` currently returns `Optional[float]`. Needs to return `Optional[dict]` with `{score, factors}`.
- `PathologyReport.report_data` stores `[{name, value, unit}]` per record — client-side trend aggregation from `/api/pathology/` is feasible.
- Existing `/api/telemetry/emergency/` (IsAuthenticated) already exists for profile snapshot. The new QR system uses a separate **token-based** public endpoint.
- Latest migration: `0005_pathologyreport_guest_email_and_more.py` — new `EmergencyToken` model will create `0006_emergencytoken.py`.
- No `ThemeContext` exists yet. Only `SidebarContext` exists.

---

## Implementation Plan

### PHASE 1 — Backend: New Models + New API Endpoints

- [ ] 1. **Add EmergencyToken model** to `backend/medical/models.py`
      ```python
      class EmergencyToken(models.Model):
          patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='emergency_token')
          token = models.CharField(max_length=64, unique=True)
          created_at = models.DateTimeField(auto_now_add=True)
          expires_at = models.DateTimeField(null=True, blank=True)
          is_active = models.BooleanField(default=True)
          
          def __str__(self):
              return f"EmergencyToken for {self.patient} ({'active' if self.is_active else 'revoked'})"
      ```
      Files: `backend/medical/models.py`
      Verify: `cd d:\MEDICAL_PROJECT\medfusion-ai\backend && .venv\Scripts\python.exe manage.py makemigrations 2>&1` — expect `Migrations for 'medical': ... 0006_emergencytoken.py`

- [ ] 2. **Run migrations**
      Files: database (SQLite)
      Verify: `cd d:\MEDICAL_PROJECT\medfusion-ai\backend && .venv\Scripts\python.exe manage.py migrate 2>&1` — expect `Running migrations: Applying medical.0006_emergencytoken... OK`

- [ ] 3. **Modify `_predict_using_ml`** in `backend/medical/services/ai_service.py` to return `Optional[dict]` with score and feature importances.
      
      After `score = float(model.predict(features)[0])`, add:
      ```python
      importances = model.feature_importances_
      feature_names = [...]  # disease-specific list
      factors = sorted(
          [{"feature": n, "importance": float(i), "value": features[0][idx]}
           for idx, (n, i) in enumerate(zip(feature_names, importances))],
          key=lambda x: x["importance"], reverse=True
      )[:5]
      return {"score": round(score, 1), "factors": factors}
      ```
      Feature name arrays (must match numpy feature order exactly):
      - Heart: `["Age","Gender","Systolic BP","Diastolic BP","Cholesterol","Max Heart Rate","Chest Pain","Exercise Angina","Fasting Sugar","Shortness of Breath","Left Arm Pain"]`
      - Diabetes: `["Age","Gender","Glucose","HbA1c","BMI","Hypertension","Heart Disease","Family History","Excessive Thirst","Frequent Urination","Blurry Vision","Slow Healing Sores"]`
      - Cancer: `["Age","Gender","Family History","Smoking","Alcohol","Toxin Exposure","Weight Loss","Persistent Cough","Fatigue","Skin/Mole Changes","Unusual Lumps"]`
      
      Update `_get_fallback_prediction`: `ml_result = self._predict_using_ml(...)` → `risk_score = ml_result['score'] if ml_result else 15.0`, `factors = ml_result['factors'] if ml_result else []`, add `'factors': factors` to return dict.
      
      Update `predict_health_risk`: ensure `factors` key propagates from Gemini response or fallback dict.
      
      Files: `backend/medical/services/ai_service.py`
      Verify: `cd d:\MEDICAL_PROJECT\medfusion-ai\backend && .venv\Scripts\python.exe manage.py check 2>&1`

- [ ] 4. **Add 6 new view functions** to `backend/medical/views.py`. Add `import secrets` at top.
      
      **(a) `get_pathology_trends(request)`** — GET, `@permission_classes([IsAuthenticated])`:
      ```python
      @api_view(['GET'])
      @permission_classes([IsAuthenticated])
      def get_pathology_trends(request):
          try:
              patient = Patient.objects.get(user=request.user)
          except Patient.DoesNotExist:
              return JsonResponse({"trends": {}}, status=200)
          reports = patient.pathology_reports.all().order_by('created_at')
          trends = {}
          for report in reports:
              try:
                  biomarkers = json.loads(report.report_data or '[]')
              except json.JSONDecodeError:
                  continue
              date_str = report.created_at.strftime('%Y-%m-%d')
              for b in biomarkers:
                  if not b.get('name') or b.get('value') is None:
                      continue
                  key = b['name'].strip().title()
                  if key not in trends:
                      trends[key] = {"unit": b.get('unit', ''), "data": []}
                  try:
                      val = float(b['value'])
                  except (ValueError, TypeError):
                      continue
                  trends[key]["data"].append({
                      "date": date_str, "value": val, "source_id": report.id
                  })
          return JsonResponse({"trends": trends}, status=200)
      ```
      
      **(b) `simulate_prediction(request)`** — POST, `@permission_classes([])`:
      Parses `{disease_type, parameters}`. Calls `ai_service._predict_using_ml(disease_type, parameters)`. If None, computes a simple risk score using the same rule-based logic from `_get_fallback_prediction` but inline (no Gemini call, no DB save). Returns `{"simulated_score": X, "simulated_level": "LOW|MODERATE|HIGH|CRITICAL", "factors": [...]}`.
      ```python
      @api_view(['POST'])
      @permission_classes([])
      @csrf_exempt
      def simulate_prediction(request):
          try:
              data = json.loads(request.body)
          except json.JSONDecodeError:
              return JsonResponse({"error": "Invalid JSON"}, status=400)
          disease_type = data.get('disease_type', '')
          parameters = data.get('parameters', {})
          if not disease_type:
              return JsonResponse({"error": "disease_type required"}, status=400)
          ml_result = ai_service._predict_using_ml(disease_type, parameters)
          if ml_result is not None:
              score = ml_result['score']
              factors = ml_result['factors']
          else:
              score = 15.0
              factors = []
          level = "CRITICAL" if score > 80 else ("HIGH" if score > 55 else ("MODERATE" if score > 30 else "LOW"))
          return JsonResponse({"simulated_score": round(score, 1), "simulated_level": level, "factors": factors}, status=200)
      ```
      
      **(c) `generate_emergency_token(request)`** — POST, `@permission_classes([IsAuthenticated])`:
      ```python
      @api_view(['POST'])
      @permission_classes([IsAuthenticated])
      @csrf_exempt
      def generate_emergency_token(request):
          try:
              patient = Patient.objects.get(user=request.user)
          except Patient.DoesNotExist:
              return JsonResponse({"error": "Patient profile not found"}, status=404)
          EmergencyToken.objects.filter(patient=patient).update(is_active=False)
          new_token = secrets.token_urlsafe(32)
          EmergencyToken.objects.create(patient=patient, token=new_token, is_active=True)
          return JsonResponse({"token": new_token, "url": f"/emergency/{new_token}"}, status=201)
      ```
      
      **(d) `revoke_emergency_token(request)`** — DELETE, `@permission_classes([IsAuthenticated])`:
      ```python
      @api_view(['DELETE'])
      @permission_classes([IsAuthenticated])
      def revoke_emergency_token(request):
          try:
              patient = Patient.objects.get(user=request.user)
              EmergencyToken.objects.filter(patient=patient, is_active=True).update(is_active=False)
          except Patient.DoesNotExist:
              pass
          return JsonResponse({}, status=204)
      ```
      
      **(e) `get_emergency_card(request, token)`** — GET, `@permission_classes([])`:
      ```python
      @api_view(['GET'])
      @permission_classes([])
      def get_emergency_card(request, token):
          try:
              et = EmergencyToken.objects.select_related('patient').get(token=token, is_active=True)
          except EmergencyToken.DoesNotExist:
              return JsonResponse({"error": "Invalid or expired emergency token"}, status=404)
          patient = et.patient
          active_meds = []
          latest_rx = patient.prescriptions.order_by('-created_at').first()
          if latest_rx:
              try:
                  rx_data = json.loads(latest_rx.extracted_data or '{}')
                  active_meds = [{"name": m.get('name',''), "dosage": m.get('dosage','')} for m in rx_data.get('medicines', [])]
              except json.JSONDecodeError:
                  pass
          return JsonResponse({
              "name": f"{patient.first_name} {patient.last_name}".strip() or patient.user.full_name,
              "vault_id": f"MF-{str(patient.id).zfill(6)}",
              "blood_group": patient.blood_group,
              "allergies": json.loads(patient.allergies or '[]'),
              "emergency_contact": patient.emergency_contact,
              "active_meds": active_meds,
              "last_updated": et.created_at.strftime('%Y-%m-%d %H:%M')
          }, status=200)
      ```
      
      **(f) `explain_result(request)`** — POST, `@permission_classes([])`:
      ```python
      @api_view(['POST'])
      @permission_classes([])
      @csrf_exempt
      def explain_result(request):
          try:
              data = json.loads(request.body)
          except json.JSONDecodeError:
              return JsonResponse({"error": "Invalid JSON"}, status=400)
          text = data.get('text', '').strip()
          language = data.get('language', 'en')
          if language == 'en' or not text:
              return JsonResponse({"explanation": text}, status=200)
          lang_names = {'ta': 'Tamil', 'hi': 'Hindi'}
          lang_name = lang_names.get(language, 'Tamil')
          prompt = (
              f"Translate and explain the following medical text in {lang_name}. "
              f"Preserve all numbers, units, medication names, and medical values exactly as they appear. "
              f"Do not change numeric values. Return only the translated explanation:\n\n{text}"
          )
          try:
              from .services.llm_provider import llm_provider
              explanation = run_async(llm_provider.generate_response(
                  prompt=prompt,
                  model_name=os.getenv("DEFAULT_LLM_MODEL", "gemini-2.5-flash"),
                  system_prompt=f"You are a medical translator. Translate clinical text accurately to {lang_name}."
              ))
          except Exception as e:
              explanation = text
          return JsonResponse({"explanation": explanation}, status=200)
      ```
      
      Also update `from .models import ...` line to include `EmergencyToken`.
      
      Files: `backend/medical/views.py`
      Verify: `cd d:\MEDICAL_PROJECT\medfusion-ai\backend && .venv\Scripts\python.exe manage.py check 2>&1`

- [ ] 5. **Add 6 URL patterns** to `backend/medical/urls.py`. The `pathology/trends` route must come **before** `pathology/` in the list:
      ```python
      re_path(r'^pathology/trends/?$', views.get_pathology_trends, name='pathology_trends'),
      # insert above the existing: re_path(r'^pathology/?$', ...)
      
      re_path(r'^predictions/simulate/?$', views.simulate_prediction, name='simulate_prediction'),
      # insert above existing predictions routes
      
      re_path(r'^emergency/generate/?$', views.generate_emergency_token, name='generate_emergency_token'),
      re_path(r'^emergency/revoke/?$', views.revoke_emergency_token, name='revoke_emergency_token'),
      re_path(r'^emergency/(?P<token>[A-Za-z0-9_-]+)/?$', views.get_emergency_card, name='get_emergency_card'),
      
      re_path(r'^ai/explain/?$', views.explain_result, name='explain_result'),
      ```
      Also update `run_prediction` view to pass `factors` in all three return paths (patient, guest, anonymous):
      ```python
      # After computing risk_score, risk_level, clinical_reasoning, remedies:
      factors = analysis.get('factors', [])
      # In each JsonResponse return, add:  "factors": factors
      ```
      Files: `backend/medical/urls.py`, `backend/medical/views.py`
      Verify: `cd d:\MEDICAL_PROJECT\medfusion-ai\backend && .venv\Scripts\python.exe manage.py check 2>&1` — 0 issues

---

### PHASE 2 — Frontend: Theme System (Feature 6)

- [ ] 6. **Create `frontend/src/context/ThemeContext.jsx`**:
      ```jsx
      import React, { createContext, useContext, useState, useEffect } from 'react';
      const ThemeContext = createContext();
      export function ThemeProvider({ children }) {
        const [theme, setTheme] = useState(() => localStorage.getItem('medfusion-theme') || 'dark');
        useEffect(() => {
          document.documentElement.setAttribute('data-theme', theme);
          localStorage.setItem('medfusion-theme', theme);
        }, [theme]);
        const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
        return <ThemeContext.Provider value={{theme, toggleTheme}}>{children}</ThemeContext.Provider>;
      }
      export const useTheme = () => useContext(ThemeContext);
      ```
      Files: `frontend/src/context/ThemeContext.jsx`

- [ ] 7. **Update `frontend/src/index.css`**: Add CSS variable support for light/dark theming. At the top of the file, augment the existing `:root` block and add a `[data-theme="light"]` block. The dark theme variables must replicate the existing hardcoded values:
      ```css
      :root, [data-theme="dark"] {
        --bg-deep: #000326;
        --bg-surface: rgba(0,4,30,0.85);
        --bg-card: rgba(0, 4, 45, 0.42);   /* matches existing --glass */
        --text-primary: #ffffff;
        --text-secondary: #cff6ff;
        --border-color: rgba(0, 245, 212, 0.35);  /* matches existing --border */
        --input-bg: rgba(0, 4, 30, 0.85);
        --input-text: #ffffff;
        --nav-bg: rgba(0, 4, 30, 0.8);
      }
      [data-theme="light"] {
        --bg-deep: #f0f4f8;
        --bg-surface: #ffffff;
        --bg-card: #ffffff;
        --text-primary: #0f1b2d;
        --text-secondary: #4a5568;
        --border-color: rgba(0,0,0,0.12);
        --input-bg: #f7fafc;
        --input-text: #0f1b2d;
        --nav-bg: rgba(255,255,255,0.95);
      }
      ```
      Then update these existing rules to use the new variables:
      - `body { background-color: var(--bg-deep); color: var(--text-primary); }` (keep the grid background-image)
      - `.glass-card { background: var(--bg-card); border-color: var(--border-color); }` (keep other properties)
      - `nav.bg-glass { background: var(--nav-bg) !important; }`
      - `.app-sidebar { background: var(--bg-surface) !important; }`
      - `input, select, textarea { background: var(--input-bg) !important; color: var(--input-text) !important; }`
      - Add light theme override: `[data-theme="light"] .text-secondary { color: var(--text-secondary) !important; }`
      - Add light theme override: `[data-theme="light"] .text-white { color: var(--text-primary) !important; }`
      Files: `frontend/src/index.css`

- [ ] 8. **Update `frontend/src/App.jsx`**: 
      - Import `ThemeProvider, useTheme` from `./context/ThemeContext`
      - Import `Sun, Moon` from `lucide-react` (add to existing lucide imports)
      - In `App()` function, wrap the `<Router>` return in `<ThemeProvider>...</ThemeProvider>`
      - In `Navbar` function, add `const { theme, toggleTheme } = useTheme();` at top
      - In desktop nav div, add theme toggle button before the Login/logout controls:
        ```jsx
        <button onClick={toggleTheme} className="btn-icon p-2 border-0 bg-transparent text-white opacity-70 hover-opacity-100" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        ```
      - Add same toggle button to mobile nav section
      Files: `frontend/src/App.jsx`
      Verify: `cd d:\MEDICAL_PROJECT\medfusion-ai\frontend && node_modules\.bin\vite build 2>&1`

---

### PHASE 3 — Frontend: Prediction Features (Features 2 & 3)

- [ ] 9. **Update `frontend/src/pages/dashboard/PatientDashboard.jsx`** — Feature 2 (Explainable Risk):
      - Add state: `const [showFactors, setShowFactors] = useState(false);`
      - In the result render section, after the risk score/level display and before the remedy tabs section, add:
        ```jsx
        {/* Explainable Risk Panel */}
        <button onClick={() => setShowFactors(f => !f)} style={{...existing btn style}}>
          {showFactors ? 'Hide' : 'Why this score?'}
        </button>
        {showFactors && (
          <div style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'16px', marginTop:'12px'}}>
            <h5 style={{color:'var(--theme-accent)', fontFamily:'monospace', fontSize:'0.9rem', marginBottom:'12px'}}>Key Risk Factors</h5>
            <p style={{color:'rgba(255,255,255,0.5)', fontSize:'0.75rem', marginBottom:'12px', lineHeight:'1.5'}}>
              These factors influenced the machine learning model's estimate. They do not establish medical causation or constitute a diagnosis.
            </p>
            {result.factors && result.factors.length > 0 ? result.factors.map((f, i) => (
              <div key={i} style={{marginBottom:'10px'}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.8rem', marginBottom:'4px'}}>
                  <span style={{color:'#fff', fontFamily:'monospace'}}>{f.feature}</span>
                  <span style={{color:'rgba(255,255,255,0.5)'}}>{f.value}</span>
                </div>
                <div style={{background:'rgba(255,255,255,0.08)', borderRadius:'4px', height:'6px'}}>
                  <div style={{background:'var(--theme-accent)', height:'100%', borderRadius:'4px', width: (f.importance * 100) + '%', transition:'width 0.5s ease'}} />
                </div>
              </div>
            )) : <p style={{color:'rgba(255,255,255,0.4)', fontSize:'0.8rem'}}>Factor breakdown not available for this analysis.</p>}
          </div>
        )}
        ```
      Files: `frontend/src/pages/dashboard/PatientDashboard.jsx`

- [ ] 10. **Update `frontend/src/pages/dashboard/PatientDashboard.jsx`** — Feature 3 (What-If Simulator):
       - Add state: `const [showSimulator, setShowSimulator] = useState(false);`, `const [simParams, setSimParams] = useState({});`, `const [simResult, setSimResult] = useState(null);`, `const [simLoading, setSimLoading] = useState(false);`, `const [simError, setSimError] = useState('');`
       - After the `showFactors` button, add 'What If?' button that initializes simParams from current form state and opens simulator
       - Build `buildSimParams()` helper that returns disease-appropriate fields
       - Simulator panel: renders inputs for key parameters (Heart: systolicBp, diastolicBp, cholesterol, maxHeartRate; Diabetes: glucose, hba1c, bmi; Cancer: alcohol, toxinExposure, smoking), shows current vs simulated results, 'Recalculate' button calls `api.post('/predictions/simulate/', {...})`, shows disclaimer
       - **Important**: Never call `/predictions/predict/` from the simulator — only `/predictions/simulate/`
       Files: `frontend/src/pages/dashboard/PatientDashboard.jsx`

- [ ] 11. **Apply identical changes to `frontend/src/pages/dashboard/GuestDashboard.jsx`** — same showFactors panel and simulator panel as steps 9–10. The component structure is near-identical to PatientDashboard.
       Files: `frontend/src/pages/dashboard/GuestDashboard.jsx`
       Verify: `cd d:\MEDICAL_PROJECT\medfusion-ai\frontend && node_modules\.bin\vite build 2>&1`

---

### PHASE 4 — Frontend: Profile Features (Features 1 & 4)

- [ ] 12. **Update `frontend/src/pages/profile/MedicalVault.jsx`** — Feature 1 (Biomarker Trend Timeline):
       - Add `useMemo` import from 'react' (and `useState`)
       - Add state: `const [selectedBiomarker, setSelectedBiomarker] = useState(null);`, `const [showTrends, setShowTrends] = useState(false);`
       - Compute trendData via useMemo from `archive`:
         ```js
         const trendData = useMemo(() => {
           const trends = {};
           archive.filter(r => r.type === 'pathology').forEach(record => {
             let biomarkers = [];
             try { biomarkers = typeof record.report_data === 'string' ? JSON.parse(record.report_data) : (record.report_data || []); } catch(e) {}
             const dateStr = record.created_at ? record.created_at.split('T')[0] : '';
             biomarkers.forEach(b => {
               if (!b?.name || b.value === undefined) return;
               const key = b.name.trim();
               if (!trends[key]) trends[key] = { unit: b.unit || '', data: [] };
               const val = parseFloat(b.value);
               if (!isNaN(val)) trends[key].data.push({ date: dateStr, value: val, source_id: record.id });
             });
           });
           // Sort each biomarker's data by date
           Object.values(trends).forEach(t => t.data.sort((a,b) => a.date.localeCompare(b.date)));
           return trends;
         }, [archive]);
         const biomarkerNames = Object.keys(trendData).sort();
         ```
       - Below the existing `vault-list-container` div, add the Biomarker Trend Timeline section:
         - Toggle button: `showTrends` state
         - Biomarker dropdown: `<select value={selectedBiomarker} onChange={e => setSelectedBiomarker(e.target.value)}>` with biomarkerNames.map(...)
         - When selectedBiomarker is set and trendData[selectedBiomarker] exists: show trend panel
         - **SVG Line Chart** (pure SVG, no library): Render a `<svg viewBox="0 0 400 100" style={{width:'100%'}}>`. Compute min/max from values, map to Y coords (inverted: lower Y = higher value). Map dates to evenly-spaced X coords. Draw `<polyline points="...">` with stroke var(--theme-accent), no fill. Add `<circle>` at each data point. Add `<text>` labels at bottom for dates.
         - Status label logic: safe-direction biomarkers: glucose/hba1c/cholesterol/ldl → lower=Improving; hdl → higher=Improving. All others: use "Changed" (never "Worsening"/"Improving" for unknown biomarkers). Only 1 data point → "Stable".
         - Stats row: Latest value, Previous value, Change, % Change, Unit
         - Disclaimer text (small, muted)
         - Data table: date | value | unit columns
       - Empty state: shown when biomarkerNames.length === 0
       Files: `frontend/src/pages/profile/MedicalVault.jsx`

- [ ] 13. **Create `frontend/src/pages/EmergencyCard.jsx`** — Feature 4 (public emergency card):
       ```jsx
       import React, { useState, useEffect } from 'react';
       import { useParams, Link } from 'react-router-dom';
       import axios from 'axios';
       import { API_BASE_URL } from '../services/api';
       
       function EmergencyCard() {
         const { token } = useParams();
         const [card, setCard] = useState(null);
         const [loading, setLoading] = useState(true);
         const [error, setError] = useState('');
         
         useEffect(() => {
           axios.get(`${API_BASE_URL}/emergency/${token}/`)
             .then(res => setCard(res.data))
             .catch(() => setError('This emergency card is invalid or has been revoked.'))
             .finally(() => setLoading(false));
         }, [token]);
         
         // Render: MedFusion AI branding, EMERGENCY header (red), patient name, vault ID, blood group, allergies badges, emergency contact, active meds, last updated. Style with glass-card + font-monospace. Disclaimer at bottom.
       }
       export default EmergencyCard;
       ```
       Full styling matches existing glassmorphism. No auth required (uses plain axios, not the `api` instance).
       Files: `frontend/src/pages/EmergencyCard.jsx`

- [ ] 14. **Update `frontend/src/App.jsx`** — add `/emergency/:token` route:
       - Import `EmergencyCard` from `./pages/EmergencyCard`
       - Add route before the wildcard `*` route: `<Route path="/emergency/:token" element={<EmergencyCard />} />`
       - This route should NOT be wrapped in any auth protection
       Files: `frontend/src/App.jsx`

- [ ] 15. **Update `frontend/src/pages/Profile.jsx`** — add emergency token state management:
       - Add state: `const [emergencyToken, setEmergencyToken] = useState(() => { try { const userId = user?.id || 'guest'; return localStorage.getItem('medfusion_emergency_token_' + userId) || null; } catch(e) { return null; } });`
       - Add handlers:
         ```js
         const handleGenerateToken = async () => {
           try {
             const res = await api.post('/emergency/generate/');
             const tok = res.data.token;
             setEmergencyToken(tok);
             localStorage.setItem('medfusion_emergency_token_' + (user?.id || 'guest'), tok);
           } catch (err) { console.error('Failed to generate token:', err); }
         };
         const handleRevokeToken = async () => {
           try {
             await api.delete('/emergency/revoke/');
             setEmergencyToken(null);
             localStorage.removeItem('medfusion_emergency_token_' + (user?.id || 'guest'));
           } catch (err) { console.error('Failed to revoke token:', err); }
         };
         ```
       - Pass `emergencyToken`, `onGenerateToken={handleGenerateToken}`, `onRevokeToken={handleRevokeToken}` as props to `<ProfileIdentity>`
       Files: `frontend/src/pages/Profile.jsx`

- [ ] 16. **Update `frontend/src/pages/profile/ProfileIdentity.jsx`** — add Emergency QR section:
       - Add `emergencyToken`, `onGenerateToken`, `onRevokeToken` to function props
       - Below the existing allergies section (before the bottom border div in the smartcard), add:
         ```jsx
         {/* Emergency QR Card */}
         <div style={{marginTop:'16px', padding:'16px', background:'rgba(255,255,255,0.03)', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.08)'}}>
           <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
             <span style={{color:'var(--theme-accent)', fontFamily:'monospace', fontSize:'0.7rem', letterSpacing:'0.06em', textTransform:'uppercase'}}>Emergency QR Card</span>
           </div>
           <p style={{color:'rgba(255,255,255,0.45)', fontSize:'0.72rem', margin:'0 0 12px 0'}}>Scan to access emergency medical information without login.</p>
           {!emergencyToken ? (
             <button onClick={onGenerateToken} style={{...btn style matching existing}}>Generate Emergency QR</button>
           ) : (
             <div>
               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/emergency/' + emergencyToken)}`} alt="Emergency QR" style={{width:'180px', height:'180px', borderRadius:'8px', display:'block', margin:'0 auto 12px'}} />
               <div style={{display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center'}}>
                 <button onClick={onGenerateToken}>Regenerate</button>
                 <button onClick={onRevokeToken}>Revoke</button>
                 <a href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(window.location.origin + '/emergency/' + emergencyToken)}`} target="_blank" rel="noopener noreferrer">Download QR</a>
               </div>
               <p style={{color:'rgba(255,255,255,0.35)', fontSize:'0.68rem', textAlign:'center', marginTop:'8px'}}>Revoke at any time to invalidate this QR code.</p>
             </div>
           )}
         </div>
         ```
       Files: `frontend/src/pages/profile/ProfileIdentity.jsx`
       Verify: `cd d:\MEDICAL_PROJECT\medfusion-ai\frontend && node_modules\.bin\vite build 2>&1`

---

### PHASE 5 — Frontend: Voice & Translation (Feature 5)

- [ ] 17. **Create `frontend/src/components/VoiceExplainer.jsx`**:
       Props: `text` (string), `label` (string, optional)
       State: `language` (default 'en'), `displayText` (default = text prop), `translating` (bool), `speaking` (bool)
       
       On language change:
       - If `'en'`: reset `displayText` to original `text` prop immediately
       - If `'ta'` or `'hi'`: call `api.post('/ai/explain/', {text, language})`, set `displayText = response.data.explanation`
       
       Listen button: Creates `SpeechSynthesisUtterance(displayText)`, sets `utterance.lang = {en:'en-IN', ta:'ta-IN', hi:'hi-IN'}[language]`, calls `window.speechSynthesis.speak(utterance)`. If `!window.speechSynthesis`, show 'Voice not supported in this browser.'
       Stop button (shown when speaking): `window.speechSynthesis.cancel()`
       
       Layout: Language selector row (3 buttons EN/தமிழ்/हिंदी), then 'Listen' / 'Stop' button with Volume2/VolumeX icon (import from lucide-react). Container style: background rgba(255,255,255,0.03), border 1px solid rgba(255,255,255,0.08), borderRadius 10px, padding 12px, marginTop 12px. Small disclaimer.
       
       Files: `frontend/src/components/VoiceExplainer.jsx`

- [ ] 18. **Update `PatientDashboard.jsx`** — integrate VoiceExplainer:
       - Import `VoiceExplainer` from `'../../components/VoiceExplainer'`
       - In the result panel, after the `clinical_reasoning` text block: `{result.clinical_reasoning && <VoiceExplainer text={result.clinical_reasoning} label="Clinical Reasoning" />}`
       Files: `frontend/src/pages/dashboard/PatientDashboard.jsx`

- [ ] 19. **Update `GuestDashboard.jsx`** — same integration:
       - Same import and same `VoiceExplainer` placement after `clinical_reasoning`
       Files: `frontend/src/pages/dashboard/GuestDashboard.jsx`

- [ ] 20. **Update `MedicalVault.jsx`** — integrate VoiceExplainer on pathology summary:
       - Import `VoiceExplainer` from `'../../components/VoiceExplainer'`
       - In the pathology expanded section, after `parsedAnalysis.summary` text: `{parsedAnalysis.summary && <VoiceExplainer text={parsedAnalysis.summary} label="Pathology Summary" />}`
       Files: `frontend/src/pages/profile/MedicalVault.jsx`

---

### PHASE 6 — Final Verification

- [ ] 21. **Run all verification steps**:
       1. `cd d:\MEDICAL_PROJECT\medfusion-ai\backend && .venv\Scripts\python.exe manage.py makemigrations 2>&1`
       2. `cd d:\MEDICAL_PROJECT\medfusion-ai\backend && .venv\Scripts\python.exe manage.py migrate 2>&1`
       3. `cd d:\MEDICAL_PROJECT\medfusion-ai\backend && .venv\Scripts\python.exe manage.py check 2>&1` — expect: `System check identified no issues (0 silenced).`
       4. `cd d:\MEDICAL_PROJECT\medfusion-ai\frontend && node_modules\.bin\vite build 2>&1` — expect: successful build output with chunk sizes, no errors
       Fix any errors from any of the above before considering done.

---

## FEAT Decomposition Summary

This task decomposes into 4 sequential FEATs:

| FEAT | Description |
|------|-------------|
| FEAT-001 | Backend: all 6 new endpoints + model + ai_service changes + CSS theme variables + ThemeContext + App.jsx toggle |
| FEAT-002 | Frontend: Explainable Risk + What-If Simulator in PatientDashboard + GuestDashboard |
| FEAT-003 | Frontend: Biomarker Trend Timeline in MedicalVault + Emergency QR (EmergencyCard page + ProfileIdentity + Profile) + App.jsx route |
| FEAT-004 | Frontend: VoiceExplainer component + integration into PatientDashboard, GuestDashboard, MedicalVault |

FEAT-002, FEAT-003, FEAT-004 are independent of each other but all depend on FEAT-001's backend endpoints being present.
