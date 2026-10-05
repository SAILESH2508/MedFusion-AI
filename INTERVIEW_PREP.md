# MedFusion AI — Complete Technical Interview Preparation Guide
### Updated: October 2026 — Covers every page, component, API, model, and feature

---

## SECTION 1 — COMPLETE PROJECT OVERVIEW

### What is MedFusion AI?

MedFusion AI is a full-stack clinical health intelligence web application. It allows patients to run AI-powered disease risk assessments for Heart Attack, Diabetes, Cancer, and Neurological conditions; scan physical prescriptions and lab reports using computer vision OCR; track medications and symptom logs; view nearby medical facilities on an interactive map; and interact with an AI health chatbot. Doctors get a separate portal to manage patient records, write prescriptions, run safety checks, and use diagnostic calculators.

### Three User Roles

| Role | Access |
|---|---|
| **Guest** | Run health risk predictions (not saved), scan reports (saved by email), use AI chatbot, view nearby facilities |
| **Patient** | Everything Guest can do, PLUS: records saved to profile, Medical Vault history, Pill Box adherence tracker, Symptom Diary, Consultations booking, persistent Emergency ID card |
| **Doctor** | Everything Patient can do, PLUS: Patient Directory with search, assign prescriptions/labs to patients, clinical safety warnings, drug interaction checker, daily planner, BMI/THR calculators |

---

## SECTION 2 — FULL TECH STACK

### Frontend
| Item | Version | Purpose |
|---|---|---|
| React | 19.2.4 | UI framework |
| Vite | 8.0.4 | Build tool & dev server |
| React Router | 7.14.0 | Client-side routing |
| Axios | 1.15.0 | HTTP client with JWT interceptors + 60s timeout |
| Framer Motion | 12.38.0 | Animations and transitions |
| Leaflet | 1.9.4 | Interactive map (loaded dynamically) |
| Lucide React | 1.8.0 | Icon library |
| Recharts | 3.8.1 | Chart components (available but used minimally) |
| Custom CSS | — | No Bootstrap installed — all utility classes hand-written in `index.css` |

### Backend
| Item | Version | Purpose |
|---|---|---|
| Django | 5.0.6 | Web framework |
| Django REST Framework | 3.15.2 | REST API |
| djangorestframework-simplejwt | 5.3.0 | JWT authentication |
| django-cors-headers | 4.4.0 | CORS (allows localhost:5173 and 5174) |
| python-dotenv | 1.0.0 | .env loading |
| google-genai | 2.7.0 | Google Gemini API client |
| openai | 2.40.0 | OpenAI API client (fallback) |
| anthropic | 0.105.2 | Anthropic (imported but not in fallback chain) |
| cohere | 7.0.3 | Cohere API client (fallback) |
| pillow | 12.2.0 | Image processing |
| numpy | 2.4.6 | ML data generation and inference |
| scikit-learn | 1.9.0 | Random Forest ML models |
| SQLite | — | Database (file-based, zero setup) |

### AI/ML
- **Primary LLM:** Google Gemini 2.5 Flash (`gemini-2.5-flash`) configured via `DEFAULT_LLM_MODEL` in `.env`
- **Fallback chain:** `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.5-pro-preview-06-05` → `gemini-2.0-flash-lite` → `gemini-1.5-flash` → `gpt-4o-mini` → `command-r` → `command` → Python rule-based fallback
- **ML Models:** 3 Random Forest Regressors trained on synthetic data (heart_attack_rf.pkl, diabetes_rf.pkl, cancer_rf.pkl) — `n_estimators=100, max_depth=10, random_state=42`

---

## SECTION 3 — ALL PAGES AND THEIR COMPLETE FEATURE SETS

### 3.1 Landing Page (`/`)
**File:** `src/pages/Landing.jsx`

**Elements:**
- Hero glass card with gradient headline "Welcome to MedFusion AI — Next-Generation Health Intelligence"
- Descriptive paragraph about the platform
- Two CTA buttons side-by-side: **⚡ Check My Health Risk** (→ `/dashboard`) and **🧬 Scan a Report** (→ `/upload`)
- Three feature cards with hover animation (Framer Motion `whileHover: y: -5`):
  - 🔮 AI Health Risk Predictor (theme-heart)
  - 🌱 Easy Daily Health Plans (theme-diabetes)
  - 🧬 Smart Prescription Scanner (theme-general)

**State:** None (pure presentational component)

---

### 3.2 Authentication Page (`/auth`)
**File:** `src/pages/Auth.jsx`

**Elements:**
- Portal switcher: **Patient Portal** | **Doctor Portal** — tabs with icons
- Login/Register toggle
- **Patient Login:** Email + Password
- **Patient Register:** Full Name + Email + Password
- **Doctor Register:** Full Name + Email + Password + Medical License ID + Proof of Certification file upload (PDF/JPG/PNG)
- Error display with specific backend error messages
- Auto-login on successful signup (token stored, redirects to `/profile`)
- Theme changes based on portal: `theme-general` (patient) or `theme-cancer` (doctor)

**API Calls:**
- `POST /api/auth/login/` — email + password → JWT token + user object
- `POST /api/auth/signup/` — FormData with optional file → JWT token + user object

**Query param support:** `?portal=doctor` or `?portal=patient` to pre-select tab

---

### 3.3 AI Health Check / Dashboard (`/dashboard`)
**File:** `src/pages/Dashboard.jsx` (router), `src/pages/dashboard/PatientDashboard.jsx`, `src/pages/dashboard/DoctorDashboard.jsx`, `src/pages/dashboard/GuestDashboard.jsx`

---

#### 3.3.1 Patient Dashboard
**Elements:**

**Sidebar (dynamic via SidebarContext):**
- Disease selector tiles: Heart Attack Predictor, Diabetes Risk Engine, Cancer Risk Surveillance, Neurological & Stroke Screening
- Disease tiles filtered by `isPredictorVisible()` — shows only conditions relevant to patient's history and current vitals
- Vitals Index circular progress badge with health score and status label

**Main Content — Vitals Input Form:**
- Disease-specific vitals sliders with inline typeable number inputs
- **Heart Attack:** Systolic BP (80-220), Diastolic BP (40-130), Serum Cholesterol (100-350), Max Heart Rate (50-220), Chest Pain type dropdown, Exercise Angina toggle, Fasting Blood Sugar toggle, Symptoms checklist
- **Diabetes:** Fasting Glucose (40-350), HbA1c (3-14%), Weight (30-200kg), Height (100-250cm), BMI (auto-calculated), Hypertension toggle, Heart Disease History toggle, Symptoms checklist
- **Cancer:** Cancer Type selector (8 types), Alcohol consumption, Toxin Exposure, Symptoms checklist
- **Neurological:** Systolic BP, Glucose, Sleep Quality (1-10), Physical Activity (0-10 hrs/wk), Symptoms checklist
- Preset buttons: 🌿 Healthy Preset / ⚠️ High Risk Preset for each disease
- Age, Gender, Family History, Smoking fields (shared across all disease types)
- Quick Report Scan widget: drag-and-drop lab report → auto-fills vitals fields
- Consent checkbox required before analysis
- **Run Analysis button** with animated telemetry log and progress bar

**Results Panel:**
- Risk Score gauge (0-100%) with color-coded level badge (LOW/MODERATE/HIGH/CRITICAL)
- Clinical Reasoning paragraph
- 4 remedy tabs: 🥗 Dietary | 💪 Lifestyle | 🏠 Home Remedies | 💊 OTC | 🏥 Clinical | ⚠ Warning Signs
- Disease stage indicator
- **Export Report button** (downloads structured `.txt` file)
- Reset button

**API Calls:**
- `GET /api/telemetry/emergency` — loads patient profile to pre-fill age, gender, weight, height
- `GET /api/predictions/` — prediction history for `isPredictorVisible`
- `GET /api/prescriptions/` — prescription history for medication relevance check
- `GET /api/pathology/` — pathology history for biomarker relevance check
- `POST /api/prescriptions/upload/` — quick scan uploads (multipart)
- `POST /api/predictions/predict/` — main prediction call

---

#### 3.3.2 Doctor Dashboard
**Elements:**

**Patient Directory Screen (default):**
- Live search bar filters by name, email, or ID
- Patient cards with avatar initials, name, email
- Refresh Data button
- **Daily Clinical Planner** widget — add/tick/delete tasks, persisted in `localStorage`
- **Diagnostic Calculators** widget — BMI tab (weight + height → BMI + category) and Target Heart Rate tab (age-based Karvonen formula)

**Patient Inspect Screen (after selecting a patient):**
- Sidebar switches to: ← Patient Directory button + active patient card (name, ID, DOB) + EHR navigation map
- Patient header: name, ID, DOB, email, allergies badges
- Prescription history accordion (expanded → medicines table with dosage/frequency)
- Pathology reports accordion (expanded → biomarkers + AI summary)
- AI Predictions accordion (expanded → risk score, level, reasoning)
- **Prescription Writer form:**
  - Medicine name + dosage + frequency → add to list
  - Clinical notes textarea
  - Real-time **Clinical Safety Warnings** via `useMemo` — checks new medications against patient allergies and existing meds using `INTERACTIONS` lookup table
  - **Sign Off & Synchronize Prescription** button with animated status banner (success teal / error red)

**API Calls:**
- `GET /api/patients/` — all patients list
- `GET /api/patients/{id}/` — full records for a patient (prescriptions, pathology, predictions)
- `POST /api/patients/{id}/prescribe/` — write manual prescription

---

#### 3.3.3 Guest Dashboard
**Elements:** Identical to Patient Dashboard vitals forms and result display, with these differences:
- Guest Name and Guest Email fields shown above the form
- History fetched by email (not by JWT token) with 1-second debounce
- Guest popup modal on first visit explaining benefits of logging in
- Export Report button same as Patient Dashboard

**API Calls:**
- `POST /api/predictions/predict/` — with `guest_email` and `guest_name` in payload
- `GET /api/predictions/?email={email}` — guest history
- `GET /api/prescriptions/?email={email}` — guest prescriptions
- `GET /api/pathology/?email={email}` — guest pathology reports

---

### 3.4 AI Report Scanner (`/upload`)
**Files:** `src/pages/Upload.jsx` (authenticated), `src/pages/GuestUpload.jsx` (unauthenticated)

**Elements:**

**Sidebar (dynamic via SidebarContext):**
- **Patient/Guest:** Document Category selector — Prescription (Rx) | Lab Report (Pathology)
- **Doctor:** Target Patient selector dropdown + Document Category selector + Active Patient Bio Card (name, ID, gender, age, blood group, weight/height, allergies)

**Left Panel — Ingestion Controls:**
- Drop zone with scanning beam animation
- **Full drag-and-drop support** (`onDragOver`/`onDragLeave`/`onDrop`) — glows on hover, shows "Drop it here!" text
- Click-to-browse file picker (JPG, PNG, PDF, max 16MB)
- File validation (type + size)
- **INGEST button** with animated scanner log ticker and progress bar

**Right Panel — Results:**
- **Prescription results:** Medicines list (name, dosage, frequency, timing, type, description) with times-of-day badges, Recommendations list, Clinical Intent summary, Physician name
- **Lab Report results:** Biomarker cards with value, unit, status badge (NORMAL/HIGH/LOW), reference range, colour-coded range bar chart per biomarker, Clinical Interpretation summary
- **Export JSON button** downloads raw OCR data as `.json`
- Reset Scanner button

**GuestUpload extras:** Name + Email fields (email is required before upload)

**API Calls:**
- `GET /api/patients/` — Doctor role: fetch patient list for sidebar dropdown
- `POST /api/prescriptions/upload/` — multipart with file + optional patient_id + optional guest_email/name
- `POST /api/pathology/analyze/` — multipart with file + optional patient_id + optional guest_email/name

---

### 3.5 My Profile (`/profile`)
**File:** `src/pages/Profile.jsx` + 6 sub-components

**Sidebar:**
- Health Vault Console header
- 4 tab navigation tiles: Profile & Vitals | Medical Vault & History | Pill Box & Consultations | Symptom Diary Logs
- Vitals Index circular badge (health score + status)

**Tab 1 — Identity & Vitals** (`ProfileIdentity.jsx`)
- Holographic Emergency Medical ID smartcard with scanner beam animation
- Patient name, Vault ID (MF-XXXXXX), Emergency Contact, Allergies list
- Edit mode: First Name, Last Name, Blood Group (select dropdown), Emergency Contact, Allergies (comma-separated)
- Clinical Demographics grid: Age, Gender, DOB, Blood Group, Height, Weight — all in telemetry node cards
- Daily Clinical Targets: Hydration (35ml/kg), Metabolic BMR (Mifflin formula), Optimal Sleep (7.5-8.5hrs), Cardio Target (150min/wk AHA)
- BMI gradient track visual with pointer

**Tab 2 — Medical Vault & History** (`MedicalVault.jsx` + `RiskAssessments.jsx`)
- Left: Prescription + Pathology records accordion list — expand to see medicines or biomarkers
- Right: AI Risk Assessment History accordion — expand to see risk score, clinical reasoning, remedy tabs

**Tab 3 — Pill Box & Consultations** (`PillBox.jsx` + `Consultations.jsx`)
- **PillBox:** Pulls medicines from prescription history + custom meds. Sorted by time slot (Morning/Afternoon/Evening/Night). Checkbox to mark taken. Daily Compliance circular gauge. Add supplementary med form. **AI Safety Audit** button — calls `POST /api/telemetry/drug-safety/` → shows interactions, dietary warnings, side effects
- **Consultations:** Upcoming appointments list. Virtual Specialist Directory (4 fixed doctors). Book Session modal with date, time, reason. All stored in local state (no backend — demo feature)

**Tab 4 — Symptom Diary** (`SymptomDiary.jsx`)
- Wellness Rating slider (1-10) with live label (Optimal/Moderate/Critical)
- Energy Level selector (High/Moderate/Low)
- Mood State selector (Excellent/Good/Neutral/Anxious/Depressed)
- Symptom checklist (Headache, Fatigue, Nausea, Dizziness, Chest Tightness)
- Notes textarea
- Log Entry button — saves to localStorage with date/time
- Health Log history list

**Doctor Profile (separate view):**
- Avatar circle with initials, full name, role badge, email, license number
- Edit mode: Full Name + License Number
- Practice Stats: Registered Patients count, Ingested Prescriptions count, Pathology Files count

**API Calls:**
- `GET /api/telemetry/emergency` — load patient profile data
- `GET /api/predictions/` — load risk assessment history
- `GET /api/prescriptions/` + `GET /api/pathology/` — load Medical Vault archive
- `POST /api/profile/update/` — save profile edits
- `POST /api/telemetry/drug-safety/` — AI drug safety analysis
- `GET /api/patients/` — Doctor: load practice stats

---

### 3.6 Nearby Facilities (`/nearby`)
**Files:** `src/pages/NearbyMap.jsx`, `src/components/InteractiveMap.jsx`

**Sidebar:**
- Facility Radar header
- Live counts per facility type (Hospitals, Clinics, Pharmacies, Dentists, Labs)
- Nearest Hospital quick-card with one-tap directions (patients only)

**Main Content:**
- Page header with live result count + Export Emergency Sheet button (patients only)
- **SOS Emergency Panel** — nearest hospital name, distance, phone, Navigate Now + Call buttons
- **Interactive Leaflet Map** with:
  - 4 tile layers: 🗺 Street (OSM), 🛰 Satellite (ESRI), 🏙 Hybrid (ESRI + OSM labels overlay), ⛰ Topo
  - maxZoom: 21, maxNativeZoom: 19 — full street-level detail on zoom
  - Custom emoji+colour marker icons per facility type (drop-pin shape)
  - Pulsing "You are Here" marker
  - Click marker → rich popup (name, address, phone, hours, distance, Directions + Call + Website buttons)
  - OSRM route drawing — calculates actual driving route with distance + ETA
  - Recenter button, Clear Route button
  - Anti-blur CSS: `backdrop-filter: none` on all Leaflet panes, `translateZ(0)` GPU promotion
- Facility filter: Hospital | Clinic | Pharmacy | Dentist | Lab toggle buttons with live count badges
- Radius slider: 1km–15km (patients) / 1km–10km (guests)
- **Radius/type changes correctly re-fetch** via `lastFetchConfigRef` cache key
- Search filter input
- Sort: Distance | Name
- "Open Now" filter toggle
- PlaceCard list with expand/collapse for address, phone, hours, operator, action buttons
- Legend

**Location State Persistence:** Location, places, activeTypes, and radius are lifted to `AppContent` in `App.jsx` — survives navigation, never re-requests GPS or re-fetches API on return visit

**External APIs (no key required):**
- Overpass API (`overpass-api.de`) — OpenStreetMap facility data
- OSRM (`router.project-osrm.org`) — driving route calculation

---

### 3.7 AI Chatbot (global overlay)
**File:** `src/components/AIChatbot.jsx`

**Elements:**
- Fixed-position FAB button (bottom-right, z-index 9999) — purple gradient circle
- Unread message badge counter
- Chat panel (390px wide, max 600px tall):
  - Header: MedFusion AI avatar, online status pulse, Symptom Checker toggle, Export Chat button
  - Message bubbles (user right, assistant left) with timestamps and follow-up suggestion chips
  - Voice input button (Web Speech API — uses `SpeechRecognition`)
  - Symptom Checker mode: guided step-by-step symptom assessment
  - Text input with Send button
- Personalised system prompt if logged-in patient (uses patient name)
- General health assistant prompt for guests
- Follow-up question chips auto-generated by backend

**API Calls:**
- `POST /api/chat/` — message + history array + include_followups flag → reply + follow_ups array
- Uses `is_patient: true` + `patient_name` when user is logged in

---

## SECTION 4 — COMPLETE BACKEND API REFERENCE

All endpoints are under `/api/` prefix.

| Method | URL | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup/` | None | Register Patient or Doctor. Doctor requires license_number + medical_proof_file |
| POST | `/api/auth/login/` | None | Login with email + password → JWT access token |
| GET | `/api/health/` | None | System health check — Django version, DB stats, server time |
| POST | `/api/chat/` | None | General AI chatbot. Accepts message + history. Returns reply + follow_ups |
| POST | `/api/prescriptions/upload/` | None (supports guest) | Upload prescription image → Gemini OCR → save + return structured data |
| GET | `/api/prescriptions/` | None (supports guest by ?email) | List prescriptions for patient or guest |
| POST | `/api/pathology/analyze/` | None (supports guest) | Upload lab report image → extract biomarkers → AI analysis |
| GET | `/api/pathology/` | None (supports guest by ?email) | List pathology reports |
| POST | `/api/predictions/predict/` | None (supports guest) | Run disease risk prediction → ML + LLM → save + return result |
| GET | `/api/predictions/` | None (supports guest by ?email) | List prediction records |
| GET | `/api/predictions/history/` | None | Alias for list predictions |
| GET | `/api/predictions/{pk}/` | IsAuthenticated | Get single prediction detail |
| GET | `/api/telemetry/emergency` | IsAuthenticated | Patient emergency snapshot (profile data for ID card) |
| GET | `/api/telemetry/health/` | IsAuthenticated | Health monitoring summary |
| POST | `/api/profile/update/` | IsAuthenticated | Update patient or doctor profile fields |
| GET | `/api/patients/` | IsAuthenticated | Doctor only: list all patients with stats |
| GET | `/api/patients/{id}/` | IsAuthenticated | Doctor only: full EHR for a specific patient |
| POST | `/api/patients/{id}/prescribe/` | IsAuthenticated | Doctor only: write manual prescription to patient record |
| POST | `/api/telemetry/chat/` | IsAuthenticated | Personalised patient chat with profile context |
| POST | `/api/telemetry/drug-safety/` | IsAuthenticated | AI drug interaction + safety analysis for medication list |

---

## SECTION 5 — DATABASE MODELS

### User (extends AbstractUser)
| Field | Type | Notes |
|---|---|---|
| email | EmailField(unique=True) | Used as USERNAME_FIELD |
| full_name | CharField(255) | |
| role | CharField — 'Patient' or 'Doctor' | Default: 'Patient' |
| license_number | CharField(100) | Doctor only |
| medical_proof_file | CharField(255) | File path — Doctor only |
| created_at | DateTimeField(auto_now_add) | |

### Patient
| Field | Type | Notes |
|---|---|---|
| user | OneToOneField(User) | related_name='patient_profile' |
| doctor | ForeignKey(User, null=True) | assigned doctor, related_name='patients' |
| first_name | CharField(100) | |
| last_name | CharField(100) | |
| dob | DateField(null=True) | |
| gender | CharField — M/F/O | |
| blood_group | CharField — A+/A-/B+/B-/AB+/AB-/O+/O- | |
| weight_kg | FloatField(null=True) | |
| height_cm | FloatField(null=True) | |
| allergies | TextField | Stored as JSON list string |
| emergency_contact | CharField(50) | |

### Prescription
| Field | Type | Notes |
|---|---|---|
| patient | ForeignKey(Patient, null=True) | null for guest records |
| guest_email | EmailField(null=True) | |
| guest_name | CharField(255, null=True) | |
| image_url | CharField(255) | Relative path under MEDIA_ROOT/uploads/ |
| extracted_data | TextField | JSON string of OCR result |
| status | CharField — pending/processing/completed/failed | |
| created_at | DateTimeField(auto_now_add) | |

### PathologyReport
| Field | Type | Notes |
|---|---|---|
| patient | ForeignKey(Patient, null=True) | null for guest records |
| guest_email | EmailField(null=True) | |
| guest_name | CharField(255, null=True) | |
| report_data | TextField | JSON list of biomarkers [{name, value, unit}] |
| clinical_insight | TextField | JSON of AI analysis {risk_index, normalcy_index, insights, summary} |
| created_at | DateTimeField(auto_now_add) | |

### PredictionRecord
| Field | Type | Notes |
|---|---|---|
| patient | ForeignKey(Patient, null=True) | null for guest records |
| guest_email | EmailField(null=True) | |
| guest_name | CharField(255, null=True) | |
| disease_type | CharField(50) | 'Heart Attack', 'Diabetes', 'Cancer Screening', 'Neurological Screening' |
| input_parameters | TextField | JSON of all vitals submitted |
| risk_score | FloatField | 0.0 to 100.0 |
| risk_level | CharField(50) | LOW / MODERATE / HIGH / CRITICAL |
| clinical_reasoning | TextField | LLM narrative |
| remedies | TextField | JSON of 6 remedy categories |
| created_at | DateTimeField(auto_now_add) | |

---

## SECTION 6 — AI/ML ARCHITECTURE IN DETAIL

### 6.1 Prediction Flow

```
User submits vitals form (React)
        ↓
POST /api/predictions/predict/ with JWT (or guest_email)
        ↓
run_prediction() view → run_async(ai_service.predict_health_risk(disease_type, parameters))
        ↓
AIService.predict_health_risk():
  1. Build system prompt with disease-specific persona
  2. Build patient parameter JSON
  3. Call llm_provider.generate_response() → Gemini 2.5 Flash
  4. If LLM succeeds → parse JSON → return risk_score, risk_level, clinical_reasoning, remedies
  5. If LLM fails → _get_fallback_prediction() → rule-based scoring + remedies
  6. _predict_using_ml() runs in parallel → RandomForest .pkl → if ML succeeds, overrides risk_score
        ↓
PredictionRecord saved to SQLite
        ↓
JsonResponse → React renders result
```

### 6.2 Prescription OCR Flow

```
User uploads image (JPG/PNG/PDF) to POST /api/prescriptions/upload/
        ↓
File saved to MEDIA_ROOT/uploads/ with timestamp filename
        ↓
Image bytes read → ai_service.analyze_prescription(image_bytes)
        ↓
Gemini multimodal: types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
System prompt: "You are a Clinical Pharmacy Specialist..."
Returns JSON: { medicines: [{name, dosage, frequency, timing, times_of_day, type, description}],
                recommendations, urgency, physician, clinical_intent }
        ↓
Prescription record saved → returned to frontend
```

### 6.3 Pathology OCR Flow

```
Upload → save file → ai_service.extract_biomarkers_from_image(image_bytes)
        ↓
Gemini extracts: [{name, value, unit}] list
        ↓
If empty → use default fallback biomarkers
        ↓
ai_service.analyze_pathology(biomarkers) → Gemini analysis
Returns: { risk_index, normalcy_index, normalcy_level, insights, summary }
        ↓
PathologyReport saved → returned to frontend
Frontend normalises biomarkers → adds status (NORMAL/HIGH/LOW) + reference ranges
```

### 6.4 LLM Provider & Fallback Chain

```python
Primary:     gemini-2.5-flash       (Google — fast, multimodal, 1M context)
Fallback 1:  gemini-2.0-flash       (Google — previous gen stable)
Fallback 2:  gemini-2.5-pro-preview-06-05  (Google — Pro model)
Fallback 3:  gemini-2.0-flash-lite  (Google — cheapest)
Fallback 4:  gemini-1.5-flash       (Google — older stable)
Fallback 5:  gpt-4o-mini            (OpenAI — paid fallback)
Fallback 6:  command-r              (Cohere)
Fallback 7:  command                (Cohere)
Final:       Python rule-based      (_get_fallback_prediction) — no API, deterministic
```

Each model is tried via `asyncio.to_thread()` wrapping a synchronous SDK call, with a 30-second timeout per attempt. Error types are logged (quota exceeded, network, permission).

### 6.5 ML Random Forest Models

**Training:** Synthetic datasets, 2,000 samples per disease, generated with `numpy.random` using clinically-informed risk formulas.

**Heart Attack model (11 features):**
age, gender, systolic_bp, diastolic_bp, cholesterol, max_heart_rate, chest_pain_type, exercise_angina, fasting_sugar, shortness_of_breath, left_arm_pain

**Diabetes model (12 features):**
age, gender, glucose, hba1c, bmi, hypertension, heart_disease, family_history, excessive_thirst, frequent_urination, blurry_vision, slow_healing_sores

**Cancer model (11 features):**
age, gender, family_history, smoking, alcohol, toxin_exposure, weight_loss, persistent_cough, persistent_fatigue, skin_mole_changes, unusual_lumps

**Limitation:** Trained on synthetic data — directionally correct but not clinically validated against real patient outcomes.

### 6.6 Prompt Engineering

Three distinct personas used:
1. `"Clinical Pharmacy Specialist"` — prescription OCR
2. `"Metabolic Pathology Expert"` — lab analysis
3. `"Senior Clinical Diagnostic Lead and Preventive Medicine Specialist"` — risk prediction

All prompts end with `"Return ONLY a JSON object. No Markdown, no explanation."` JSON extraction uses regex-based `_clean_and_parse_json()` — strips markdown code fences, finds `{...}` or `[...]` boundaries.

Temperature: `0.7` — balances creativity with consistency.

---

## SECTION 7 — FRONTEND ARCHITECTURE

### 7.1 Routing (React Router v7)

| Path | Component | Auth |
|---|---|---|
| `/` | Landing | Public |
| `/auth` | Auth | Public |
| `/dashboard` | PatientDashboard / DoctorDashboard / GuestDashboard | Role-based |
| `/upload` | Upload / GuestUpload | Role-based |
| `/nearby` | NearbyMap | Public |
| `/profile` | Profile | Patient/Doctor only (redirects guests) |
| `/vault` | Redirects to /profile | — |
| `/*` | Redirects to / | — |

### 7.2 Global State

- **User state** — `useState` in `App.jsx`, persisted in `localStorage` as `medfusion_user`
- **JWT token** — `localStorage` key `medfusion_token`, auto-attached via axios request interceptor
- **Sidebar content** — React Context (`SidebarContext`) — each page injects its own sidebar JSX via `setSidebarContent`
- **Map state** (location, places, activeTypes, radius) — lifted to `AppContent` in `App.jsx` for navigation persistence
- **Health score** — stored in `localStorage` per user ID, broadcast via custom `medfusion_health_score_updated` event

### 7.3 Axios Instance (`src/services/api.js`)

- `baseURL: http://127.0.0.1:8000/api`
- `timeout: 60000` (60 seconds — generous for LLM calls)
- Request interceptor: adds `Authorization: Bearer {token}` header
- Response interceptor:
  - Timeout errors → friendly message
  - 401 on protected routes → clear tokens + dispatch `medfusion_auth_logout` event + redirect to `/auth`
  - Auth endpoints (`/auth/login`, `/auth/signup`) excluded from 401 redirect

### 7.4 Utility Functions (`src/services/utils.js`)

| Function | Purpose |
|---|---|
| `getAge(dobString)` | Calculates age in years from ISO date string |
| `getInitials(name, email)` | Returns 2-char initials from name or email |
| `getRiskColor(level)` | Returns hex colour for risk level |
| `getRiskBg(level)` | Returns rgba background for risk level |
| `getHasShownGuestPopup()` | Module-level flag for one-time guest onboarding modal |
| `INTERACTIONS[]` | 5 hardcoded drug-drug interaction pairs for client-side check |

---

## SECTION 8 — SECURITY MEASURES

| Measure | Implementation |
|---|---|
| JWT Authentication | `djangorestframework-simplejwt`, 60-minute access tokens |
| Endpoint protection | `@permission_classes([IsAuthenticated])` on all sensitive endpoints |
| Guest support | `@permission_classes([])` on upload/predict endpoints but patient is still identified if token present |
| CORS | `django-cors-headers` — allows only localhost:5173, 5174, 127.0.0.1:5173/5174, localhost:3000 |
| No LLM data leak | Patient name/email never sent in LLM prompt — only clinical numbers |
| API keys | Stored in `.env` — never in source code or frontend |
| File size limit | 16MB max on all uploads |
| File type validation | Client-side + server-side check (JPG/PNG/PDF only) |
| Input structuring | All vitals are numbers/dropdowns — no free-text injection into LLM prompts |
| CSRF | Django `CsrfViewMiddleware` active; API views use `@csrf_exempt` since JWT is stateless |
| XSS protection | `SECURE_BROWSER_XSS_FILTER = True`, `SECURE_CONTENT_TYPE_NOSNIFF = True` |
| Clickjacking | `X_FRAME_OPTIONS = 'DENY'` |
| HSTS | Commented out in dev (correctly — HTTPS not active locally) |
| Doctor verification | License ID + proof file required at signup — stored in `media/doctor_proofs/` |

---

## SECTION 9 — NEW FEATURES (RECENTLY ADDED)

| Feature | Where | How it Works |
|---|---|---|
| **CTA Buttons on Landing** | `Landing.jsx` | Two side-by-side `<Link>` buttons — uses `w-auto-override` class to defeat global `width:100%` on `.btn-clinical` |
| **Patient Search in Doctor Dashboard** | `DoctorDashboard.jsx` | `useMemo` filters `patients[]` by name/email/ID. `patientSearch` state drives a live search input above the patient cards |
| **Drag-and-Drop Upload** | `Upload.jsx`, `GuestUpload.jsx` | `onDragOver`/`onDragLeave`/`onDrop` handlers on the drop zone div. Drop zone glows and shows "Drop it here!" on hover. Client-side type + size validation on drop |
| **Export Report Download** | `GuestDashboard.jsx`, `PatientDashboard.jsx` | `handleExportReport()` builds a structured plain text file with risk score, reasoning, all remedy categories + disclaimer. `Blob` → `URL.createObjectURL` → invisible `<a>` click → auto-download |
| **Map re-fetch on config change** | `NearbyMap.jsx` | `lastFetchConfigRef` stores `lat,lon,radius,types` string. Re-fetch fires when key changes (radius slider, type toggle), not on plain nav back |
| **Map tile sharpness** | `InteractiveMap.jsx` | `maxZoom:21`, `maxNativeZoom:19`, `keepBuffer:4`. Map container `translateZ(0)` + `backface-visibility:hidden`. Full `backdrop-filter:none` on all Leaflet panes. Hybrid layer = ESRI satellite + OSM HOT labels |
| **Map state persistence** | `App.jsx` | `mapLocation`, `mapPlaces`, `mapActiveTypes`, `mapRadius` lifted to `AppContent` — survives page navigation |
| **Drug Safety Audit** | `PillBox.jsx` | Collects all RX meds + custom meds → `POST /api/telemetry/drug-safety/` → LLM analysis → shows interactions, dietary warnings, side effects |
| **Appointment Booking** | `Consultations.jsx` | Local state only (no backend). Specialist directory of 4 virtual doctors. Modal form: date, time, reason → adds to upcoming list |
| **Symptom Diary** | `SymptomDiary.jsx` | Daily wellness rating, energy, mood, symptoms checklist, notes → saved to `localStorage` per user + date |

---

## SECTION 10 — KNOWN LIMITATIONS AND HONEST GAPS

| Limitation | Detail |
|---|---|
| **Synthetic ML training data** | Random Forest models trained on `numpy.random` generated samples, not real patient outcomes. Directionally correct but not clinically validated. Real datasets (NHANES, Framingham) would require IRB approval |
| **No formal test suite** | No pytest or vitest tests written. ~30 manual test cases run. Coverage is unknown |
| **LLM non-determinism** | Temperature 0.7 means identical inputs produce varying clinical reasoning text between calls. ML model anchors the risk score |
| **SQLite at scale** | Write locks under concurrent requests. Fine for development/demo, not production. Should migrate to PostgreSQL |
| **No token refresh UI** | 60-minute JWT expiry with no silent refresh. User gets logged out after session expires |
| **Appointment booking is local-only** | Consultations tab creates appointments in local state — not persisted to backend, no real booking system |
| **Doctor verification is manual** | Proof of certification file uploaded at signup is stored in `media/doctor_proofs/` — no automated validation |
| **No output validation layer** | LLM responses not cross-validated for medical accuracy. No second LLM verification call (cost-prohibitive) |
| **Handwritten prescription OCR** | Low-quality or heavily handwritten prescriptions return incomplete results. Acknowledged limitation of vision models |
| **No CI/CD pipeline** | No GitHub Actions, no automated tests on push |
| **No production deployment** | Currently local dev only (Django dev server + Vite dev server) |
| **recharts installed but unused** | Package in dependencies but no chart components rendered |

---

## SECTION 11 — DECISION FRAMEWORK (INTERVIEW DEFENCE)

### Q: Why Django over FastAPI?
DRF provides faster model+serializer setup. FastAPI's async-native design would be better for LLM calls (eliminates the `asyncio.run()` workaround needed in WSGI). Would choose FastAPI if rebuilding.

### Q: Why SQLite?
Zero setup overhead for development. Write lock contention at concurrent scale. PostgreSQL would be the production choice.

### Q: Why not LangChain?
Our use case is single-shot LLM calls — no chains, no agents, no memory. LangChain adds significant dependency weight for no benefit in this architecture.

### Q: Why Gemini over GPT-4o?
Multimodal capability (prescription image OCR), 1M token context window, faster Flash variant, generous free tier for development. GPT-4o-mini is a paid fallback.

### Q: Why not fine-tune the LLM?
Would require thousands of labelled (input, ideal_output) pairs in clinical JSON format. We don't have that dataset. Prompt engineering achieves acceptable output quality.

### Q: How do you handle hallucinations?
1. JSON schema validation — if response doesn't parse as valid JSON with required fields, falls back
2. Risk score clamped 0-100
3. Risk level only accepts LOW/MODERATE/HIGH/CRITICAL
4. ML model provides independent deterministic risk score as sanity anchor
5. Disclaimer in all responses

### Q: What's the biggest technical limitation?
ML models trained on synthetic data. Not clinically validated. Risk scores are plausible but not actuarially accurate.

### Q: Cost per request?
Gemini 2.5 Flash ≈ $0.00015/1K input tokens + $0.0006/1K output tokens. A prediction call ≈ 800 input + 1200 output ≈ $0.00084. Development uses free tier ($0).

### Q: If rebuilding from scratch?
1. FastAPI (async-native, no asyncio workaround)
2. Real clinical datasets for ML models (NHANES, Framingham, UCI)
3. RAG with pgvector — ground recommendations in AHA/ADA guidelines
4. Output validation layer (second LLM call)
5. PostgreSQL from day one
6. CI/CD pipeline with golden-set testing on prompt changes

---

## SECTION 12 — QUICK REFERENCE TABLE

| Dimension | Choice | Alternative Considered | Reason |
|---|---|---|---|
| Frontend | React 19 + Vite 8 | Next.js | Separation of concerns — Python ML in backend |
| Backend | Django 5 + DRF | FastAPI | Faster model/serializer setup |
| Auth | JWT (simplejwt) | Sessions, OAuth | Stateless, API-friendly |
| DB | SQLite | PostgreSQL | Dev simplicity |
| Primary LLM | Gemini 2.5 Flash | GPT-4o | Multimodal, 1M context, free tier |
| ML | Random Forest | Neural Network, XGBoost | No GPU needed, fast inference, interpretable |
| OCR | Gemini multimodal | Tesseract, AWS Textract | No additional API key or service |
| Map | Leaflet + Overpass API | Google Maps API | No API key, fully open source |
| Routing | OSRM | Google Directions API | No API key |
| CSS | Hand-written utility classes | Bootstrap/Tailwind | Full control over glassmorphism design |
| LLM prompting | Structured JSON output | Free-form | Parseable, consistent, schema-enforced |
