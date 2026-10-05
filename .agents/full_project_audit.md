# MedFusion AI — Full Project Audit
**Generated:** 2025-07-14  
**Scope:** Complete deep-read of all frontend pages, components, backend views, models, services, and configuration files.

---

## 1. Executive Summary

MedFusion AI is a full-stack medical intelligence web application built on **React 19 + Vite (frontend)** and **Django 5 + DRF (backend)**. It serves three user roles — **Patient**, **Doctor**, and **Guest** — each with a distinct but overlapping feature set.

The core value propositions are:
1. **AI-powered disease risk prediction** (Heart Attack, Diabetes, Cancer, Neurological/Stroke) using a Google Gemini LLM with local Random Forest fallback.
2. **OCR-based document ingestion** — prescriptions and pathology lab reports uploaded as images/PDFs are parsed by Gemini Vision.
3. **Nearby medical facility radar** — real-time OpenStreetMap/Overpass API search with a full Leaflet interactive map.
4. **Persistent health vault** — patient profiles, medication adherence tracker, symptom diary, consultation booking.
5. **Global AI chatbot** — conversational health assistant with urgency detection, voice input, guided symptom checker, and follow-up suggestions.

The LLM falls back from Gemini 2.5 Flash → 2.0 Flash → 1.5 Flash → GPT-4o-mini → Cohere Command-R → Cohere Command. When all LLMs fail, a deterministic rule-based Python scorer (Random Forest stub) produces risk scores locally.

**Critical observations:**
- The backend `.env` contains only a Google API key (`GOOGLE_API_KEY`); OpenAI and Cohere are wired but not configured — they will always fall through to the deterministic fallback.
- `DEBUG=True` is the default; `SECRET_KEY` is hardcoded as a fallback in `settings.py` — both are production hazards.
- SQLite is the only database configured. This is not suitable for production.
- CSRF is disabled on all sensitive mutation endpoints via `@csrf_exempt` — JWT is the only protection.
- Doctor registration requires a certification file but there is **no admin verification step**; any uploaded file is accepted.

---

## 2. Tech Stack — Exact Versions

### Frontend
| Package | Version |
|---------|---------|
| React | 19.2.4 |
| React DOM | 19.2.4 |
| React Router DOM | 7.14.0 |
| Vite | 8.0.4 |
| Axios | 1.15.0 |
| Framer Motion | 12.38.0 |
| Leaflet | 1.9.4 |
| React Leaflet | 5.0.0 |
| Lucide React | 1.8.0 |
| Recharts | 3.8.1 |

### Backend
| Package | Version |
|---------|---------|
| Django | 5.0.6 |
| Django REST Framework | 3.15.2 |
| djangorestframework-simplejwt | 5.3.0 |
| django-cors-headers | 4.4.0 |
| google-genai | 2.7.0 |
| openai | 2.40.0 |
| anthropic | 0.105.2 |
| cohere | 7.0.3 |
| numpy | 2.4.6 |
| scikit-learn | 1.9.0 |
| Pillow | 12.2.0 |
| python-dotenv | 1.0.0 |
| bcrypt | 4.0.1 |

### Infrastructure
- **Database:** SQLite (`db.sqlite3`)
- **File storage:** Django default storage (`media/uploads/`, `media/doctor_proofs/`)
- **API base URL:** `http://127.0.0.1:8000/api`
- **CORS origins:** localhost:3000, 5173, 5174
- **JWT lifetime:** Access token 60 min, Refresh token 1 day

---

## 3. Database Models

### 3.1 `User` (extends `AbstractUser`)
| Field | Type | Notes |
|-------|------|-------|
| `email` | EmailField (unique) | USERNAME_FIELD |
| `full_name` | CharField(255) | |
| `role` | CharField(50) | choices: `'Patient'`, `'Doctor'` |
| `license_number` | CharField(100) | Doctor only |
| `medical_proof_file` | CharField(255) | File path of uploaded certification |
| `created_at` | DateTimeField (auto) | |

### 3.2 `Patient`
| Field | Type | Notes |
|-------|------|-------|
| `user` | OneToOneField(User) | `related_name='patient_profile'` |
| `doctor` | ForeignKey(User, null) | Assigned doctor; `related_name='patients'` |
| `first_name` | CharField(100) | |
| `last_name` | CharField(100) | |
| `dob` | DateField (null) | |
| `gender` | CharField(1) | 'M', 'F', 'O' |
| `blood_group` | CharField(3) | A+/A-/B+/B-/AB+/AB-/O+/O- |
| `weight_kg` | FloatField (null) | |
| `height_cm` | FloatField (null) | |
| `allergies` | TextField | JSON string of list |
| `emergency_contact` | CharField(50) | |

### 3.3 `Prescription`
| Field | Type | Notes |
|-------|------|-------|
| `patient` | ForeignKey(Patient, null) | null for guest uploads |
| `guest_email` | EmailField (null) | For anonymous scans |
| `guest_name` | CharField(255, null) | |
| `image_url` | CharField(255) | Stored filename |
| `extracted_data` | TextField | JSON string: `{medicines, recommendations, urgency, physician, clinical_intent}` |
| `status` | CharField(50) | pending/processing/completed/failed |
| `created_at` | DateTimeField (auto) | |

### 3.4 `PathologyReport`
| Field | Type | Notes |
|-------|------|-------|
| `patient` | ForeignKey(Patient, null) | null for guest uploads |
| `guest_email` | EmailField (null) | |
| `guest_name` | CharField(255, null) | |
| `report_data` | TextField | JSON list of `{name, value, unit}` biomarkers |
| `clinical_insight` | TextField | JSON of AI analysis: `{risk_index, normalcy_index, normalcy_level, insights, summary}` |
| `created_at` | DateTimeField (auto) | |

### 3.5 `PredictionRecord`
| Field | Type | Notes |
|-------|------|-------|
| `patient` | ForeignKey(Patient, null) | null for guest predictions |
| `guest_email` | EmailField (null) | |
| `guest_name` | CharField(255, null) | |
| `disease_type` | CharField(50) | 'Heart Attack', 'Diabetes', 'Cancer Screening', 'Neurological Screening' |
| `input_parameters` | TextField | JSON string of submitted vitals/symptoms |
| `risk_score` | FloatField | 0.0 – 100.0 percentage |
| `risk_level` | CharField(50) | 'LOW', 'MODERATE', 'HIGH', 'CRITICAL' |
| `clinical_reasoning` | TextField | Plain text paragraph |
| `remedies` | TextField | JSON: `{stage, dietary_guidelines, lifestyle_modifications, home_remedies, otc_suggestions, clinical_recommendations, urgent_warning_signs}` |
| `created_at` | DateTimeField (auto) | |

---

## 4. Backend API Endpoints

All endpoints are prefixed with `/api/` (configured in `medfusion_backend/urls.py`, mounted under the `medical` app).

| # | Method | URL | Auth | Description |
|---|--------|-----|------|-------------|
| 1 | GET | `/api/health/` | None | Health check: returns server status, Python/Django versions, DB stats |
| 2 | POST | `/api/auth/signup/` | None | Register new Patient or Doctor. Doctor requires `license_number` + `medical_proof_file` (multipart). Returns JWT + user object. |
| 3 | POST | `/api/auth/login/` | None | Login by email/password. Returns JWT access token + user profile. |
| 4 | POST | `/api/prescriptions/upload/` | Optional (auto-assigns patient) | Upload image/PDF; Gemini Vision OCR extracts medicines, dosages, recommendations. Saved to `Prescription` model. Supports `patient_id` (Doctor) or `guest_email` (Guest). |
| 5 | GET | `/api/prescriptions/` | Optional (role-filtered) | List prescriptions. Doctors see their patients' Rxs; Patients see own; Guests query by `?email=`. |
| 6 | POST | `/api/pathology/analyze/` | Optional | Upload image/PDF or send JSON biomarkers. Extracts biomarkers via Gemini Vision, then analyzes with Gemini text. Returns `PathologyReport`. |
| 7 | GET | `/api/pathology/` | Optional (role-filtered) | List pathology reports; same filtering logic as prescriptions. |
| 8 | GET | `/api/telemetry/emergency/` | IsAuthenticated | Returns patient profile: name, blood group, allergies, active meds, emergency contact, vitals. Doctors get a basic snapshot. |
| 9 | GET | `/api/telemetry/health/` | IsAuthenticated | Invokes `HealthMonitor.generate_health_summary()` — adherence score, alert thresholds, risk alerts. |
| 10 | POST | `/api/profile/update/` | IsAuthenticated | Updates Patient (name, DOB, gender, weight, height, blood group, allergies, emergency contact) or Doctor (name, license). |
| 11 | POST | `/api/predictions/predict/` | Optional | Run disease risk prediction for Heart Attack / Diabetes / Cancer / Neurological. Returns full `PredictionRecord`. |
| 12 | GET | `/api/predictions/` | Optional | List prediction history; Patient → own records; Guest → `?email=`. |
| 13 | GET | `/api/predictions/<pk>/` | IsAuthenticated | Get single prediction detail. |
| 14 | GET | `/api/patients/` | IsAuthenticated (Doctor only) | List all registered patients with counts (prescriptions, pathology, predictions). |
| 15 | GET | `/api/patients/<patient_id>/` | IsAuthenticated (Doctor only) | Full EHR: prescriptions + pathology reports + predictions for one patient. |
| 16 | POST | `/api/patients/<patient_id>/prescribe/` | IsAuthenticated (Doctor only) | Manually write a prescription (medicines list + recommendations). Stored as `Prescription` with `status=completed`. |
| 17 | POST | `/api/telemetry/chat/` | IsAuthenticated | Personalized patient chat with clinical context injected from Patient profile. Returns `{response}`. |
| 18 | POST | `/api/chat/` | None | General-purpose AI chatbot. Accepts `message`, `history`, `is_patient`, `patient_name`, `include_followups`. Returns `{reply, follow_ups}`. |
| 19 | POST | `/api/telemetry/drug-safety/` | IsAuthenticated | Drug interaction checker. Accepts `medications` list. Returns `{has_interactions, critical_warnings, dietary_precautions, side_effects, summary}`. |

---

## 5. AI/ML Services

### 5.1 LLM Provider (`llm_provider.py`)

A multi-provider fallback chain:

```
Primary:  gemini-2.5-flash      (Google Gemini)
         gemini-2.0-flash
         gemini-2.5-pro-preview-06-05
         gemini-2.0-flash-lite
         gemini-1.5-flash
         gpt-4o-mini             (OpenAI)
         command-r               (Cohere)
         command                 (Cohere)
```

- Uses `asyncio.wait_for` with a 30-second timeout per model.
- On quota/auth/network errors, calls `_select_best_fallback()` and recurses.
- If all 8 models fail, returns the string `"AI system failure. All fallbacks exhausted."`.
- **Currently configured:** Only `GOOGLE_API_KEY` is set in `.env`. OpenAI and Cohere keys are missing — those providers will always fail initialization.
- DEFAULT_LLM_MODEL env var = `gemini-2.5-flash`.

### 5.2 AI Service (`ai_service.py`)

Three main async methods:

**`analyze_prescription(image_bytes)`**  
- Sends image + structured prompt to Gemini Vision.
- Extracts: medicines (name, dosage, frequency, frequency_number, timing, times_of_day, type, description), recommendations, urgency, physician, clinical_intent.
- Returns parsed JSON dict. On failure, returns `_get_fallback_vitals()` — demo data with 1-2 realistic medicines.

**`extract_biomarkers_from_image(image_bytes)`**  
- Sends pathology report image to Gemini Vision.
- Returns a list of `{name, value, unit}` biomarker objects.
- If empty, `analyze_pathology()` inserts 5 hardcoded defaults (Glucose, Cholesterol, Hemoglobin, WBC, HbA1c).

**`analyze_pathology(biomarkers)`**  
- Sends biomarker list to Gemini text model.
- Returns: `{risk_index, normalcy_index, normalcy_level, insights[], summary}`.

**`predict_health_risk(disease_type, parameters)`**  
- Sends comprehensive clinical parameters to Gemini with a structured prompt requesting risk_score, risk_level, clinical_reasoning, and 7-section remedies (stage, dietary, lifestyle, home, OTC, clinical, urgent_warnings).
- On LLM failure, falls back to `_get_fallback_prediction()`.

**`_get_fallback_prediction(disease_type, parameters, error_msg)`**  
- First tries `_predict_using_ml()` — a scikit-learn Random Forest (stubs exist, actual model training path not seen in read files).
- If ML score unavailable, uses pure Python rule-based scoring:
  - **Diabetes:** Scores glucose (≤100/≤140/≤200/higher), HbA1c (≤5.7/≥6.5), BMI, age, hypertension, family history, symptoms.
  - **Heart Attack:** Scores cholesterol, systolic/diastolic BP, chest pain type (typical_angina = +35), exercise angina, age, family history, smoking, symptoms.
  - **Neurological:** Scores systolic BP, glucose, sleep quality (< 6 hrs), physical activity (< 3 hrs/wk), age (55+, 70+), family history, smoking, symptoms.
  - **Cancer:** Basic scoring for alcohol, toxin exposure, symptoms, age, smoking, family history.
- Generates disease-specific remedies as full arrays with clinical evidence basis.

### 5.3 Health Monitor (`health_monitor.py`)

A supplementary service invoked at `/api/telemetry/health/`:
- Defines threshold alerts for critical glucose, BP, cholesterol, HbA1c.
- `analyze_medication_adherence()` — counts recent prescriptions, computes a simulated adherence score (min 85, capped).
- `generate_health_summary()` — aggregates adherence, pathology alerts, and patient profile to return a structured health summary.

### 5.4 Patient Chat (`patient_chat` view)
- Separate from the global `/api/chat/` endpoint.
- Fetches the authenticated patient's full profile (gender, DOB, weight, height, allergies, blood group) and injects it as a system prompt context.
- Maintains conversation history (last 10 messages).

### 5.5 Drug Safety Advisor (`check_drug_safety` view)
- Accepts a list of `{name, dosage}` medication objects.
- Sends to Gemini with a pharmacologist system prompt requesting: `has_interactions`, `critical_warnings`, `dietary_precautions`, `side_effects`, `summary`.
- Frontend also has a client-side pre-check: `INTERACTIONS` array in `utils.js` with 5 known drug pairs (aspirin+warfarin, aspirin+ibuprofen, lisinopril+spironolactone, metformin+contrast dye, atorvastatin+clarithromycin).

---

## 6. Frontend Pages — Complete Inventory

### 6.1 Landing Page (`/`) — `Landing.jsx`

**Features:**
- Hero banner with gradient title "Next-Generation Health Intelligence".
- Descriptive paragraph about the platform.
- **Two CTA buttons** (recently added):
  - "⚡ Check My Health Risk" → `Link to="/dashboard"`
  - "🧬 Scan a Report" → `Link to="/upload"`
- Feature grid (3 cards with hover animation via Framer Motion):
  1. 🔮 AI Health Risk Predictor
  2. 🌱 Easy Daily Health Plans
  3. 🧬 Smart Prescription Scanner
- Theme classes applied per card: `theme-heart`, `theme-diabetes`, `theme-general`.

**State:** None (purely presentational).  
**API calls:** None.

---

### 6.2 Auth Page (`/auth`) — `Auth.jsx`

**Features:**
- Modal-capable component (can be rendered full-page or in a modal overlay via `onClose` prop).
- Portal switcher: Patient Portal / Doctor Portal (tabs).
- Login mode: email + password fields.
- Signup mode (Patient): full name + email + password.
- Signup mode (Doctor): adds Medical License ID field + file upload (certification proof PDF/JPG/PNG).
- System notice gateway banner when `message` prop is passed (used for guest-mode upsell).
- Error / success message display.
- Toggle between Login/Signup.
- URL query param `?portal=doctor|patient` respected on mount and URL change.

**State variables:** `portal`, `isLogin`, `email`, `password`, `name`, `license`, `proofFile`, `error`, `loading`.

**API calls:**
- `POST /api/auth/login/` → sets JWT via `setAuthToken()`, calls `login()` prop.
- `POST /api/auth/signup/` → multipart FormData for Doctor (includes file). Auto-login on success.

**Navigation:** Doctors → `/dashboard`; Patients → `/profile` after login/signup.

---

### 6.3 Dashboard Router (`/dashboard`) — `Dashboard.jsx`

Simple router: `user.role === 'Doctor'` → `<DoctorDashboard>`, otherwise → `<PatientDashboard>`. Guest (unauthenticated) → `<GuestDashboard>`.

---

### 6.4 Patient Dashboard — `PatientDashboard.jsx`

The most complex page in the app (~1500+ lines).

**Disease Predictors (switchable via sidebar):**
| ID | Label | Theme |
|----|-------|-------|
| `heart_attack` | Heart Attack Predictor | `theme-heart` (red) |
| `diabetes` | Diabetes Risk Engine | `theme-diabetes` (teal) |
| `cancer` | Cancer Risk Surveillance | `theme-cancer` (orange) |
| `neurological` | Neurological & Stroke Screening | `theme-cancer` |

**Sidebar content (dynamic via SidebarContext):**
- "AI Health Diagnostics" header panel.
- "Screening Profile" selector: shows only predictors relevant to the patient's clinical history (filtered by `isPredictorVisible`).
- Filter note: "🔍 Filtered based on clinical history" when predictors are hidden.

**`isPredictorVisible(diseaseId)` logic:**
1. Checks `predictionsHistory` for prior runs of that disease type.
2. Checks current vitals thresholds (e.g., BP > 130, glucose > 100, etc.).
3. Checks `prescriptions` for known medications (lisinopril, atorvastatin, metformin, insulin, etc.).
4. Checks `pathologyReports` for out-of-range biomarkers.

**Vitals input panels (one per disease):**

*Heart Attack:*
- Systolic BP (range 80–220, typeable input)
- Diastolic BP (range 40–130, typeable input)
- Cholesterol (100–350 mg/dL)
- Max Heart Rate (60–220 BPM)
- Chest Pain dropdown: none / atypical / non-anginal / typical_angina
- Exercise Angina: yes/no
- Fasting Sugar: yes/no
- Heart Symptoms checkboxes: shortness_of_breath, left_arm_pain, jaw_neck_pain, cold_sweats_nausea, dizziness
- Presets: 🌿 Healthy / ⚠️ High Risk

*Diabetes:*
- Fasting Glucose (50–400 mg/dL)
- HbA1c (3.0–15.0%)
- Weight (30–200 kg)
- Height (100–230 cm) → auto-computes BMI
- Hypertension: yes/no
- Heart Disease History: yes/no
- Diabetes Symptoms: excessive_thirst, frequent_urination, unexplained_weight_loss, blurry_vision, slow_healing_sores
- Presets: Healthy / High Risk

*Cancer:*
- Cancer Category dropdown: General Screening, Lung Cancer, Breast Cancer, Colorectal Cancer, Prostate Cancer, Skin Cancer
- Alcohol: yes/no
- Toxin/Chemical Exposure: yes/no
- Cancer Symptoms: unexplained_weight_loss, persistent_cough, persistent_fatigue, skin_mole_changes, unusual_lumps
- Presets: Healthy / High Risk

*Neurological:*
- Systolic BP (shared state with heart panel)
- Glucose (shared state with diabetes panel)
- Sleep Quality slider (1–10 hours)
- Physical Activity (0–10 hours/week)
- Neurological Symptoms: forgetfulness, confusion, speech_difficulty, loss_of_balance, numbness_weakness
- Presets: Healthy / High Risk

**Common demographic section (all predictors):**
- Age (18–90)
- Gender (M/F/O)
- Family History (no/mild/moderate/severe)
- Smoking (no/ex-smoker/current)

**Quick-scan file upload (in form):**
- Drag-and-drop zone + click to select (JPG/PNG/PDF, max 16MB).
- `handleDrop` and `handleReportUpload` parse extracted biomarkers from `/api/pathology/` and auto-populate matching vitals fields.
- Supported mappings: glucose, cholesterol, HbA1c, systolic BP, diastolic BP, weight, height, heart rate.

**Run Analysis flow:**
1. User clicks "Run AI Analysis" (requires `consentChecked`).
2. 9-step animated telemetry log plays over ~4 seconds (progress bar 0→100%).
3. After progress reaches 100%, `api.post('/api/predictions/predict/')` fires.
4. Returns `PredictionRecord` with risk_score, risk_level, clinical_reasoning, remedies.

**Results panel:**
- Risk gauge: colored ring + percentage + level badge (LOW/MODERATE/HIGH/CRITICAL).
- Risk level uses `getRiskColor()` and `getRiskBg()` from `utils.js`.
- Clinical Reasoning section.
- Remedies tabbed panel:
  - 🥗 Diet — dietary_guidelines
  - 🏃 Lifestyle — lifestyle_modifications
  - 🏥 Clinical — clinical_recommendations + urgent_warning_signs
  - Each tab also shows OTC suggestions and home remedies (within lifestyle tab).
- Disease stage badge (from `remedies.stage`).
- **Export Report button**: downloads `.txt` file with full assessment (recently added).
- Reset button: clears result, shows form again.

**Additional patient sidebar (below records):**
- Predictions history list (fetched from `/api/predictions/`).
- Prescriptions list (fetched from `/api/prescriptions/`).
- Pathology reports list (fetched from `/api/pathology/`).

**Pre-fill from profile:** On mount, fetches `/api/telemetry/emergency/` and pre-populates age, gender, weight, height.

**State variables (major):** `selectedDisease`, `selectedPatient`, `hasChanges`, `consentChecked`, `age`, `gender`, `familyHistory`, `smoking`, `systolicBp`, `diastolicBp`, `cholesterol`, `maxHeartRate`, `chestPain`, `exerciseAngina`, `fastingSugar`, `heartSymptoms`, `glucose`, `hba1c`, `weight`, `height`, `hypertension`, `heartDiseaseHistory`, `diabetesSymptoms`, `cancerCategory`, `alcohol`, `toxinExposure`, `cancerSymptoms`, `sleepQuality`, `physicalActivity`, `neurologicalSymptoms`, `isAnalyzing`, `analysisProgress`, `simulationLog`, `result`, `error`, `remedyTab`, `predictionsHistory`, `prescriptions`, `pathologyReports`, `uploadingReport`, `uploadStatus`.

---

### 6.5 Doctor Dashboard — `DoctorDashboard.jsx`

**Layout:** Two views — Patient Directory and Patient Inspect.

**Patient Directory view:**
- `Patient Directory Console`: scrollable list of all registered patients.
- **Patient Search** (recently added): text input filtering by name, email, or ID using `useMemo` + `.filter()`. Searches `filteredPatients`.
- Patient cards show avatar initials, name, email, with hover highlight and "Inspect →" button.
- Refresh Data button re-fetches `/api/patients/`.

**Right column widgets (Directory view only):**

*Daily Clinical Planner:*
- Task list persisted in `localStorage` keyed by `doctor_tasks_{user.id}`.
- Add task (text input + Enter or + button).
- Toggle completed (checkbox + strikethrough).
- Delete task (trash icon).
- Default tasks on first login: review pathology, follow up diabetics, certify proof updates.

*Quick Diagnostic Calculator:*
- BMI tab: weight + height sliders → real-time BMI value + classification (Underweight/Normal/Overweight/Obese) with colored badge.
- THR tab: age slider → max heart rate (`220 - age`) + aerobic zone (60–85% of max HR).

**Patient Inspect view:**
- Sidebar switches to EHR Navigation Map with scroll-to-section links.
- Back button → returns to directory.
- Active Session Case panel (name, ID, DOB).
- Sections (each with `id="section-*"` for scroll anchoring):
  1. **Clinical Profile** — patient demographics, blood group, allergies, BMI card.
  2. **Prescription Logs** — list from `patientDetails.prescriptions` with expandable medicine cards.
  3. **Pathology Reports** — list from `patientDetails.pathology_reports` with biomarker tables.
  4. **AI Disease Risks** — list from `patientDetails.predictions` with risk badges.
  5. **Issue Regimen** — Doctor prescription form:
     - Add medicines (name + dosage + frequency dropdown).
     - Medicine list with remove button.
     - Clinical notes textarea.
     - **Clinical Safety Warnings** (real-time):
       - Allergy check: compares medicine names against `selectedPatient.allergies`.
       - Drug-Drug interaction check: uses `INTERACTIONS` array from `utils.js` against both existing meds and new meds.
     - Submit → `POST /api/patients/{id}/prescribe/`.

**Sidebar (Directory mode):**
- Practice Overview stats: registered patients count, total pathology reports, total AI prediction runs.

**State variables:** `patients`, `selectedPatient`, `patientDetails`, `loadingPatients`, `loadingDetails`, `doctorNotes`, `doctorMeds`, `medName`, `medDosage`, `medFreq`, `submittingRx`, `rxStatus`, `patientSearch`, `filteredPatients`, `plannerTasks`, `newTaskText`, `calcTab`, `calcWeight`, `calcHeight`, `calcAge`, `rxWarnings`.

**API calls:**
- `GET /api/patients/` — patient list
- `GET /api/patients/{id}/` — patient EHR
- `POST /api/patients/{id}/prescribe/` — write prescription

---

### 6.6 Guest Dashboard — `GuestDashboard.jsx`

Nearly identical to `PatientDashboard.jsx` with these differences:
- No profile pre-fill (no linked patient record).
- **Guest Identification**: `guestName` and `guestEmail` fields shown in the form; email is used to tie predictions to a pseudo-identity.
- Predictions submitted with `guest_email` and `guest_name` fields.
- `fetchGuestHistory()`: fetches predictions/prescriptions/pathology by `?email=` query param with 1-second debounce.
- Shows all 4 predictors in sidebar (no filtering by clinical history — `displayedPredictors = allPredictors`).
- On first load, triggers `openAuth()` with upsell message (once per session via `hasShownGuestPopup` flag).
- Export Report button identical to PatientDashboard.

---

### 6.7 Upload Page (`/upload`) — `Upload.jsx`

**Shared by Patient and Doctor (role-aware UI).**

**Sidebar content:**
- *Doctor mode:* "Target Patient Entity" — dropdown of all registered patients (fetched from `/api/patients/`); shows active patient bio card widget with allergies, blood group, weight/height.
- *Patient mode:* Document category selector only.

**Document categories:**
- Prescription (Rx) — blue color theme
- Lab Report (Pathology) — orange color theme

**Upload zone:**
- Drag-and-drop + click-to-select (JPG/PNG/PDF, max 16MB).
- Animated scan line effect (CSS `scanSweep` animation).
- `isDragging` state for visual feedback.
- File validation on drop and on input change.

**Upload flow:**
1. User selects file + clicks upload button.
2. Animated scan log (8-step) plays at 450ms intervals.
3. `POST /api/prescriptions/upload/` or `POST /api/pathology/analyze/` (multipart).
4. Result normalized to frontend schema:
   - Rx: `{medicines[], recommendations[], next_steps[]}`.
   - Lab: `{biomarkers{}, clinical_interpretation}` — status tagged HIGH/LOW/NORMAL per biomarker name.

**Results panel (Rx):**
- Medicine cards with dosage, frequency, timing, times of day.
- Recommendations list.
- Download JSON export button.

**Results panel (Lab):**
- Biomarker table with value, unit, reference range, status badge.
- Visual range bar (`renderRangeBar`) for: Glucose, HbA1c, Cholesterol, Hemoglobin, WBC, Platelet.
- Clinical interpretation text.
- Download JSON export button.

**Doctor-only features:**
- Must select a patient before uploading (validated before API call).
- Upload button label: "ANALYZE PATHOLOGY TO EHR" vs patient's "EXTRACT CLINICAL BIOMARKERS".

**State variables:** `file`, `docType`, `loading`, `scanProgress`, `scanLog`, `result`, `error`, `isDragging`, `patients`, `selectedPatientId`, `activePatient`.

---

### 6.8 Guest Upload Page (`/upload` for unauthenticated) — `GuestUpload.jsx`

Same as `Upload.jsx` with:
- No patient selector.
- **Guest identification card**: `guestName` (optional) + `guestEmail` (required) fields.
- Email required validation before upload: `"Please enter your email address so we can link this record to you."`.
- Sends `guest_email` and `guest_name` in FormData.
- On mount, shows auth upsell popup once per session.

---

### 6.9 Profile Page (`/profile`) — `Profile.jsx`

**Doctor view (simplified):**
- Avatar circle + credentials panel (editable name + license number).
- Practice Registry Statistics: patients managed, prescriptions ingested, pathology files (fetched from patient list).
- Edit/Save/Cancel controls.

**Patient view (tabbed layout, 4 tabs):**

**Tab 1: Identity & Vitals** (`ProfileIdentity.jsx`)
- Holographic Emergency Medical ID smartcard (animated scanner beam).
- Patient name, blood group, allergies, emergency contact, DOB, gender.
- Editable via Edit/Save/Cancel.
- BMI calculated and displayed with category badge.
- Health Score ring gauge (calculated from BMI, allergy count, high-risk prediction count — range 45–100).
- Health Status: Optimal (≥85) / Moderate (≥70) / Unstable (<70).
- Health score persisted to `localStorage` keyed by user ID; dispatches `medfusion_health_score_updated` event for navbar pickup.
- Vitals Analytics panel: BMI, weight, height, gender, blood group cards.
- Recent predictions history (expandable accordion).

**Tab 2: Medical Vault & History** (`MedicalVault.jsx`)
- Combined archive: prescriptions + pathology reports, sorted by `created_at` desc.
- Prescription entries show extracted medicines, recommendations.
- Pathology entries show biomarker list.
- Expandable accordion per record.

**Tab 3: Pill Box & Consultations** (split between `PillBox.jsx` + `Consultations.jsx`)

*PillBox:*
- **Medication Adherence Tracker** (localStorage-based):
  - Add custom medications: name, dosage, frequency, time slot (Morning/Afternoon/Evening/Night).
  - Per-medication check-off (today's date key in localStorage).
  - Daily adherence percentage shown.
  - Delete custom meds.
- **Drug Safety Advisor button**: submits current medication list to `/api/telemetry/drug-safety/`. Shows `has_interactions`, `critical_warnings`, `dietary_precautions`, `side_effects`, and `summary`.

*Consultations:*
- **Appointment Booking** (localStorage-based):
  - Select doctor (typed input), date, time, reason.
  - Shows upcoming appointments list with status badge (Confirmed).
  - Modal booking form.
  - Note: localStorage only — no backend persistence.

**Tab 4: Symptom Diary** (`SymptomDiary.jsx`)
- **Daily Health Log** (localStorage-based):
  - Wellness rating slider (1–10).
  - Energy Level dropdown: High/Moderate/Low.
  - Mood State dropdown: Excellent/Good/Neutral/Poor.
  - Symptom checkboxes: headache, fatigue, cough, fever, dizziness, chest_tightness.
  - Free text notes.
  - Save → appended to `healthLogs` array in localStorage keyed by `medfusion_health_logs_{userId}`.
- Logs list with date, time, wellness score, symptoms, notes.
- Note: fully client-side, no backend persistence.

**API calls:**
- `GET /api/telemetry/emergency/` — load profile
- `POST /api/profile/update/` — save profile
- `GET /api/predictions/` — history
- `GET /api/prescriptions/` — archive
- `GET /api/pathology/` — archive
- `GET /api/patients/` — doctor stats
- `POST /api/telemetry/drug-safety/` — drug safety check

---

### 6.10 Nearby Map Page (`/nearby`) — `NearbyMap.jsx`

**The most feature-rich utility page.**

**Data source:** OpenStreetMap Overpass API (free, no API key).  
**Facility types:** Hospitals 🏥, Clinics 🩺, Pharmacies 💊, Dentists 🦷, Labs 🔬.

**State persistence:** Location, places, active types, and radius are lifted to `App.jsx` parent state — **navigating away and back does NOT reset the map** (recently added).

**Sidebar:**
- "Medical Facility Radar" header with role-based description.
- Live counts per facility type.
- Nearest hospital quick-link (patients only).

**Features:**

*Location panel:*
- "Get My Location" via `navigator.geolocation` with high accuracy.
- Shows GPS coordinates once acquired.
- Refresh button.
- Error state with retry.

*Facility type filter:*
- Toggle buttons per type (cannot deselect all — minimum 1 active).
- Patients see all 5 types; guests see hospital + clinic + pharmacy only.

*Radius control (patients only):*
- Slider: 1km → 15km. Default 5km for patients, 3km for guests.
- Guest locked at 3km max.

*Search bar:*
- Client-side text filter on facility name.

*Sort & Open-only filter:*
- Sort by distance or name.
- "Show open only" checkbox (uses `isOpenNow()` logic on `opening_hours` OSM tag).

*SOS Emergency Panel (patients only):*
- Appears when hospitals are loaded.
- Shows nearest hospital name, distance, phone.
- "🚨 Navigate Now" → Google Maps Directions link.
- "📞 Call" → tel: link.

*Interactive Leaflet Map (`InteractiveMap.jsx`):*
- Full Leaflet v1.9.4 map (dynamically imported).
- **4 tile layer modes**: Street (OSM), Satellite (ESRI), Hybrid (ESRI + OSM labels), Topo (OpenTopoMap).
- Custom color-coded pin markers per facility type.
- Pulsing "you are here" marker.
- Popup on click: name, address, phone, hours, distance, Directions/Call/Website buttons.
- **OSRM routing**: "Show Route" draws a real driving route polyline on the map with distance (km) + duration (min).
- Recenter button.
- Clear Route button.
- Map compositing fixes: `backdrop-filter: none` on Leaflet layers, `translateZ(0)` GPU promotion — prevents blur during zoom.

*PlaceCard list:*
- Below map, expandable accordion cards per facility.
- Expanded view: address, phone (tel: link), opening hours, operator.
- Action buttons: Directions (Google Maps), Call (patients only), Website (patients only), Share (patients only — clipboard copy).
- Emergency badge (🚨 24H EMERGENCY) if `emergency=yes` in OSM tags.
- Open/Closed/Wheelchair accessible badges.

*Export Emergency Sheet (patients only):*
- Downloads `.txt` with top 5 hospitals, top 3 pharmacies, top 3 clinics including distance, phone, directions URL.

**State variables:** `location`, `locError`, `locLoading`, `places`, `loading`, `error`, `activeTypes`, `radius`, `search`, `expandedId`, `sortBy`, `showOpenOnly`, `exportDone`.

**Last fetch config tracking:** `lastFetchConfigRef` stores `lat,lon,radius,types` key — prevents redundant Overpass API calls on navigation back (changed recently).

---

## 7. Global Components

### 7.1 `App.jsx` — Application Shell

**Routes:**
| Path | Component | Auth |
|------|-----------|------|
| `/` | `<Landing>` | Open |
| `/auth` | `<Auth>` | Open |
| `/dashboard` | `<Dashboard>` (Doctor) or `<GuestDashboard>` (unauthenticated) | Conditional |
| `/upload` | `<Upload>` (auth) or `<GuestUpload>` (unauth) | Conditional |
| `/nearby` | `<NearbyMap>` | Open |
| `/vault` | Redirects to `/profile` | — |
| `/profile` | `<Profile>` | Required (else openAuth + redirect home) |
| `*` | Redirects to `/` | — |

**Persistent map state:** `mapLocation`, `mapPlaces`, `mapActiveTypes`, `mapRadius` held in `App` state — passed as props to `NearbyMap` so navigation away doesn't reset the map.

**Auth modal:** `isAuthOpen`, `authPortalType`, `authMessage` state + `openAuth(portalType, message)` callback passed down to all pages.

**Health score tracking:** Listens for `medfusion_health_score_updated` and `storage` events; reads `medfusion_health_score_{userId}` from localStorage; passes `navbarHealthScore` to `Navbar` and `Sidebar`.

**Token persistence:** JWT stored in `localStorage` as `medfusion_token`; user object as `medfusion_user`.

**Auto-logout:** `api.js` response interceptor: on 401 (non-auth endpoints, when a token exists) → clears localStorage + dispatches `medfusion_auth_logout` event → App listens and calls `logout()`.

### 7.2 `Navbar`

- Desktop links vary by role:
  - **Doctor:** Patient Registry, Clinical Ingestion, Nearby Facilities, Credentials Vault.
  - **Patient:** AI Health Check, AI Report Scanner, Nearby Facilities, My Profile.
  - **Guest:** AI Health Check, AI Report Scanner, Nearby.
- Mobile: hamburger menu with AnimatePresence slide-down.
- Login button → `openAuth('patient')`.

### 7.3 `Sidebar`

- Visible on `/dashboard`, `/upload`, `/nearby`, `/profile` (authenticated).
- Content injected dynamically via `SidebarContext` (`setSidebarContent()`).
- Footer: user avatar + name + email + logout button. Guest: "GUEST PORTAL / Anonymous Mode" + Login button.
- Health score ring gauge shown for Patient users with score.

### 7.4 `AIChatbot.jsx` — Global AI Chatbot

**Availability:** All pages except `/auth`.

**Features:**
- Floating button (bottom-right, 58px circle, purple gradient) with unread badge counter.
- Opens 390px chat panel with spring animation.
- Role-aware greeting: personalized for Patients, generic for Guests.
- Role-aware quick prompts (4 presets).
- **Voice input** (Web Speech API `SpeechRecognition` / `webkitSpeechRecognition`). Start/Stop mic button.
- **Symptom Checker** 🩺 — 4-step guided flow (main symptom → duration → severity → other symptoms) → assembles summary string → sends as chat message.
- **Urgency detection** (`detectUrgency()`): scans message text for critical keywords (chest pain, heart attack, stroke, etc.) → shows red "URGENT — Consider calling emergency services" banner. Warning keywords → orange "Monitor closely" banner.
- **Follow-up suggestions**: AI response includes `FOLLOWUPS: q1 | q2 | q3` parsed from reply; shown as clickable buttons below each AI message.
- **Export chat** → `.txt` download with full transcript.
- **Clear chat** button.
- Sends to: `POST /api/chat/` with message, history (last 6), `is_patient`, `patient_name`, `include_followups: true`.
- Markdown-ish rendering: `**bold**` → colored bold; `• / - / *` → indent; numbered → indent.

### 7.5 `SidebarContext.jsx`

Simple React context with `{ sidebarContent, setSidebarContent }`. Pages inject their sidebar content via `useContext(SidebarContext)`.

---

## 8. Services

### 8.1 `api.js`

- Axios instance with base URL `http://127.0.0.1:8000/api`, 60-second timeout.
- Request interceptor: injects `Authorization: Bearer {token}` from `localStorage.medfusion_token`.
- Response interceptor:
  - Timeout → user-friendly error message.
  - 401 on non-auth endpoints (when token exists) → clears token + user + dispatches logout event + redirects to `/auth` if on protected route.

### 8.2 `utils.js`

- `INTERACTIONS`: 5 drug-drug interaction pairs (client-side pre-check for DoctorDashboard).
- `getAge(dobString)`: returns age in years from DOB string.
- `getInitials(name, email)`: 2-letter initials for avatars.
- `getRiskColor(level)`: CRITICAL=`#ff0055`, HIGH=`#ff8c00`, MODERATE=`#ffd700`, LOW=`#00f5d4`.
- `getRiskBg(level)`: matching rgba backgrounds.
- `getHasShownGuestPopup()` / `setHasShownGuestPopup()`: module-level flag preventing duplicate auth upsell per session.

---

## 9. Role-Based Access Differences

| Feature | Patient | Doctor | Guest |
|---------|---------|--------|-------|
| Disease predictor | ✅ All 4, filtered by history | ❌ (via patient inspect) | ✅ All 4, no filter |
| Profile vault | ✅ Full (identity, vault, pill box, diary) | ✅ Credentials only | ❌ |
| Upload scanner | ✅ Self-upload | ✅ Assign to patient | ✅ (email required) |
| Nearby facilities | ✅ All 5 types, 5km default, 15km max | ✅ (same as patient) | ✅ Hospital/Clinic/Pharmacy only, 3km max |
| Patient directory | ❌ | ✅ | ❌ |
| Write prescription | ❌ | ✅ | ❌ |
| Drug safety advisor | ✅ | ✅ | ❌ |
| AI chatbot | ✅ Personalized | ✅ | ✅ Generic |
| Prediction history | ✅ | ❌ (via patient) | ✅ by email |
| Emergency sheet export | ✅ | ✅ | ❌ |
| SOS panel | ✅ | ✅ | ❌ |
| Health score gauge | ✅ | ❌ | ❌ |
| Map route planning | ✅ | ✅ | ✅ |
| Share facility info | ✅ | ✅ | ❌ |

---

## 10. New Features Added Recently

Based on code evidence:

1. **Drag-and-drop file upload** — both `Upload.jsx` and `GuestUpload.jsx` handle `onDragOver`, `onDragLeave`, `onDrop` events with `isDragging` state and visual feedback (glow, border color, background change). `PatientDashboard.jsx` also has `handleDrop` for the in-dashboard quick scan zone.

2. **Export Report (.txt download)** — `handleExportReport()` in `PatientDashboard.jsx` and `GuestDashboard.jsx`: generates a formatted clinical risk assessment text file using `Blob` + `URL.createObjectURL` + programmatic `<a>` click.

3. **Patient Search in DoctorDashboard** — `patientSearch` state + `filteredPatients` useMemo in `DoctorDashboard.jsx`. Search icon (`lucide-react Search`), input with left-padding for icon, filters by name/email/ID.

4. **NearbyMap State Persistence** — `mapLocation`, `mapPlaces`, `mapActiveTypes`, `mapRadius` lifted to `App.jsx` and passed as `persisted*` props to `NearbyMap`. Internal `lastFetchConfigRef` prevents re-fetching when navigating back if config unchanged.

5. **Landing CTA buttons** — "⚡ Check My Health Risk" and "🧬 Scan a Report" `Link` components added to the Hero panel in `Landing.jsx`.

6. **Neurological/Stroke predictor** — 4th disease type added alongside Heart, Diabetes, Cancer. Includes sleep quality and physical activity inputs, neurological symptom checkboxes, dedicated `applyNeurologicalPreset()`, and neurological fallback scoring in `ai_service.py`.

7. **Typeable number inputs** — Vitals sliders also have `<input type="number">` beside them allowing direct keyboard entry with blur-based clamping.

8. **Interactive Leaflet map** — `InteractiveMap.jsx` replaces any prior static map embed. Full Leaflet with tile layer switching (Street/Satellite/Hybrid/Topo), OSRM routing, custom markers.

---

## 11. Security Measures

- **JWT authentication** via `djangorestframework-simplejwt`. Access token: 60-minute lifetime.
- **CORS** restricted to localhost origins (3000, 5173, 5174).
- **File size limits**: 16MB enforced both frontend (validation before upload) and backend (`FILE_UPLOAD_MAX_MEMORY_SIZE`).
- **File type validation**: frontend checks MIME types (jpeg/png/pdf); backend accepts any file but processes via AI.
- **XSS protection**: `SECURE_BROWSER_XSS_FILTER = True`, `X_FRAME_OPTIONS = 'DENY'`.
- **Content type nosniff**: `SECURE_CONTENT_TYPE_NOSNIFF = True`.
- **Session security**: `SESSION_COOKIE_HTTPONLY = True`.
- **Doctor certification requirement**: license number + file upload mandatory.
- **Auto-logout**: 401 responses on protected endpoints clear the session and redirect.
- **Drug interaction pre-check**: client-side `INTERACTIONS` table in DoctorDashboard before prescribing.
- **Allergy hazard check**: DoctorDashboard compares new medications against patient's known allergies before submission.

---

## 12. Known Limitations and Gaps

### Security
1. **`DEBUG=True` default** and `SECRET_KEY` hardcoded fallback in `settings.py` — critical for any non-local deployment.
2. **`@csrf_exempt` on all mutation endpoints** — CSRF protection removed entirely. JWT mitigates this for authenticated endpoints but unauthenticated endpoints (signup, prescriptions upload, pathology analyze, predictions) are fully CSRF-unprotected.
3. **No admin verification for Doctor accounts** — any user can upload any file to claim doctor status. No admin approval workflow.
4. **API key in `.env`** is a real Google API key (`AIzaSyD4g...`) — should be rotated if this repo is shared.
5. **HTTPS not configured** — `SECURE_SSL_REDIRECT = False`; cookies not marked Secure.

### Architecture
6. **SQLite in production** — not safe for concurrent writes. Should be PostgreSQL.
7. **No real ML models found** — `_predict_using_ml()` references scikit-learn (library is in requirements) but the actual trained model files were not visible in the read files. Risk scoring falls back entirely to the rule-based Python logic.
8. **Consultation booking is localStorage-only** — appointments have no backend persistence; lost on different device or browser.
9. **Symptom Diary is localStorage-only** — same issue.
10. **Medication adherence tracker is localStorage-only** — no backend sync.
11. **No pagination** on `/api/patients/`, `/api/predictions/`, etc. — will be slow with large datasets.
12. **`ALLOWED_HOSTS`** only includes localhost — needs production domain.

### UX / Logic
13. **Pathology fallback biomarkers**: if AI fails to extract from image, 5 hardcoded "demo" biomarkers (Glucose 95, Cholesterol 185, Hemoglobin 14.2, WBC 7200, HbA1c 6.2) are inserted silently — users may not know the data is synthetic.
14. **`isOpenNow()` logic is rudimentary** — only handles `24/7`, `mo-fr`, and `mo-sa` hour patterns; complex OSM opening_hours strings return `null` (unknown status).
15. **Health score is simplistic** — the algorithm (start at 100, subtract for BMI, allergies, high-risk predictions) may not reflect actual clinical health status.
16. **`doctor` ForeignKey on `Patient`** — the `Patient.doctor` field exists in the model but is never populated by any endpoint. All doctors see all patients.
17. **No rate limiting** — no throttling on the AI inference endpoints; a single user could exhaust the Gemini quota rapidly.
18. **Anthropic installed but unreachable** — `anthropic==0.105.2` is in requirements but there is no Anthropic model entry in `LLMProvider.models` and the provider enum has no handler for it.

---

## 13. Recommendations

1. **Rotate the exposed Google API key** immediately if this code is in any shared/public location.
2. Set `DEBUG=False` and use a proper `SECRET_KEY` from environment in all deployments.
3. Add CSRF protection — even with `@csrf_exempt`, add rate limiting (Django Ratelimit or DRF throttling).
4. Implement Doctor account approval queue (admin panel workflow).
5. Migrate to PostgreSQL for production.
6. Persist consultation booking and symptom diary to the backend (add `Appointment` and `HealthLog` models).
7. Add a backend `medfusion_health_score` endpoint to avoid score computation on the client.
8. Add the `prescription_count` / `prediction_count` aggregation to the `list_patients` query as DB annotations rather than Python-side counting to avoid N+1.
9. Add server-side pagination to list endpoints.
10. Document that AI fallback data in pathology mode is synthetic — surface a clear UI warning.
11. Remove `anthropic` from requirements or implement it in the LLM chain.

---

*End of audit — all findings are based on direct source code inspection of files listed in the investigation brief.*
