# MedFusion AI — Complete Project Report
**Generated:** October 14, 2026  
**Workspace:** `d:\MEDICAL_PROJECT\medfusion-ai`

---

## 1. Project Overview

**MedFusion AI** is a full-stack clinical intelligence web application that provides AI-powered health risk assessment, medical document scanning, personalised diet planning, gamified health engagement, and a nearby-facilities map. It targets three user types — **Patients**, **Doctors**, and anonymous **Guests** — with role-based access throughout.

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7, Vite 8, Framer Motion, Lucide React, Bootstrap (CSS), Axios |
| Backend | Django 5.0.6, Django REST Framework 3.15.2, SimpleJWT, CORS Headers |
| Database | SQLite3 (development) |
| AI | Google Gemini 2.5 Flash (primary), OpenAI (fallback) via dual LLM provider |
| Mapping | Leaflet 1.9.4 + OpenStreetMap tiles + ESRI satellite, OSRM routing, Overpass API |
| Auth | JWT (access 60 min, refresh 1 day) |

---

## 2. Frontend Pages & Routes

### Route Table

| Route | Component File | Auth Required | Access |
|---|---|---|---|
| `/` | `pages/Landing.jsx` | None | All |
| `/auth` | `pages/Auth.jsx` | None | All |
| `/dashboard` | `pages/Dashboard.jsx` → routes to `DoctorDashboard` or `PatientDashboard` or `GuestDashboard` | None | All (role-conditional render) |
| `/upload` | `pages/Upload.jsx` (auth) / `pages/GuestUpload.jsx` (unauth) | None (guest fallback) | All |
| `/nearby` | `pages/NearbyMap.jsx` | None | All |
| `/diet` | `pages/DietPlanner.jsx` | Yes — Patient only | Patient |
| `/garden` | `pages/HealthGarden.jsx` | Yes — Patient only | Patient |
| `/profile` | `pages/Profile.jsx` | Yes — opens auth modal if unauth | Authenticated users |
| `/vault` | Redirects to `/profile` | — | — |
| `/emergency/:token` | `pages/EmergencyCard.jsx` | None (public QR) | Public |
| `*` | Redirects to `/` | — | — |

---

### Page Descriptions

#### `/` — Landing Page (`Landing.jsx`)
The marketing entry point. Shows a hero section with tagline, CTA buttons ("Check My Health Risk" → `/dashboard`, "Scan a Report" → `/upload`), and a 3-card feature grid covering AI Health Risk Predictor, Easy Daily Health Plans, and Smart Prescription Scanner.

---

#### `/auth` — Authentication (`Auth.jsx`)
Dual-portal login/signup form. Key features:
- Toggle between **Patient** and **Doctor** portals
- Login and Signup modes
- Doctor signup requires `license_number` + upload of a medical proof file (PDF/JPG/PNG)
- On success, JWT token is saved to `localStorage` as `medfusion_token`, user object as `medfusion_user`
- Can also appear as a **modal overlay** (triggered from any page via `openAuth()` call)
- Accepts optional `?portal=doctor|patient` query param and a contextual `message` prop

---

#### `/dashboard` — Dashboard (`Dashboard.jsx` dispatcher)

##### Patient Dashboard (`PatientDashboard.jsx`)
The primary patient analytics screen. Features:
- **Disease selector** in the sidebar: Heart Attack Predictor, Diabetes Risk Engine, Cancer Risk Surveillance
  - Predictors are intelligently filtered — only shown when triggered by prior history, active vitals thresholds, relevant medications, or pathology biomarkers
- **Vitals input forms** per disease:
  - *Heart Attack:* Systolic BP, Diastolic BP, Cholesterol, Max Heart Rate, Chest Pain type, Exercise Angina, Fasting Blood Sugar, Heart Symptom checklist (6 symptoms)
  - *Diabetes:* Glucose, HbA1c, Weight, Height (auto-calculates BMI), Hypertension, Heart Disease History, Diabetes Symptom checklist
  - *Cancer:* Cancer Category, Alcohol use, Toxin Exposure, Cancer Symptom checklist (5 symptoms)
- **Shared demographics:** Age, Gender, Family History, Smoking status
- **Preset buttons:** "Healthy Preset" / "High Risk Preset" for each disease — quick-fill demo values
- **Medical Report Upload** — drag-and-drop or file-select a lab report image/PDF. AI extracts biomarkers and auto-populates vitals form
- **Animated analysis pipeline:** 9-step simulated log display with progress bar (400ms interval) before API call completes
- **Consent checkbox** required before submission
- **Results panel** shows: Risk Score (%), Risk Level (LOW/MODERATE/HIGH/CRITICAL), Clinical Reasoning
  - **Remedy tabs:** Diet Guidelines, Lifestyle Modifications, Clinical Recommendations, Urgent Warning Signs
  - **Explainable Factors:** Toggle expandable contributing factor list
  - **What-If Simulator:** Adjust parameters and rerun prediction to compare outcomes
  - **Voice Explainer:** Text-to-speech with EN/Tamil/Hindi language selector and AI translation
  - **Export Report:** Download `.txt` clinical report
- **Consolidated Clinical Records:** Loads patient's predictions, prescriptions, and pathology reports on mount for relevance filtering

##### Doctor Dashboard (`DoctorDashboard.jsx`)
The clinical management screen for doctors. Features:
- **Patient Directory** with search/filter — lists all registered patients with name, email, last visit
- **Patient Detail View:** Click a patient to load their prescriptions, pathology reports, and prediction records
- **Manual Prescription Writing:** Add medication name, dosage, frequency → generates a structured prescription record via API
- **Drug Safety Engine (AI):**
  - Real-time allergy hazard detection (compares new meds against patient's known allergies)
  - Drug-drug interaction checker using a built-in `INTERACTIONS` table from `utils.js`, comparing all circulating medications
  - Warnings appear inline as the doctor types
- **Diagnostic Calculators:** BMI calculator (weight/height) and Target Heart Rate calculator (age-based) — switchable via tab
- **AI Drug Safety Check:** Calls `POST /api/telemetry/drug-safety/` for a deeper AI-powered safety report
- **Patient chat:** Send a message about a specific patient to the AI and get a clinical response

##### Guest Dashboard (`GuestDashboard.jsx`)
Identical UI to Patient Dashboard but unauthenticated. Key differences:
- Collects guest name and email for result attribution
- Results are **not persisted** to user account (session-only unless guest_email provided)
- Shows a one-time "Create an account to save results" prompt popup
- After analysis, prompts login via `openAuth()` modal

---

#### `/upload` — AI Report Scanner

##### Authenticated Upload (`Upload.jsx`)
- **File Upload Zone:** Drag-and-drop or click-to-select, supports JPG/PNG/PDF up to 16MB
- **Document Type selector:** "Prescription (Rx)" or "Pathology Report"
- **Doctor mode:** Loads patient list from `/api/patients`, doctor selects target patient before scanning
- **Patient mode:** Auto-associates scan with the logged-in patient
- **Scan Progress:** Animated log display while AI processes the file
- **Prescription result:** Extracted medicines with name, dosage, frequency, timing, times_of_day, type, description; plus recommendations, urgency, physician, clinical intent
- **Pathology result:** Biomarker table with AI-calculated risk_index, normalcy_index, normalcy_level, insights, and per-biomarker trend (Improved/Worsened/Stable/Changed vs. last scan)
- **JSON Export:** Download raw extracted data
- **Sidebar:** Shows patient identity card when a patient is selected

##### Guest Upload (`GuestUpload.jsx`)
- Same scan UI but collects guest name + email
- Results not saved to account; one-time popup encourages login
- After scan, CTA to log in and save

---

#### `/nearby` — Nearby Medical Facilities (`NearbyMap.jsx`)
- **Geolocation:** Auto-detects user location via browser `navigator.geolocation`
- **Facility Types:** Hospitals 🏥, Clinics 🩺, Pharmacies 💊, Dentists 🦷, Labs 🔬 — multi-select filter chips
- **Search radius:** Adjustable (default differs by role — guests get smaller radius)
- **Data source:** Real-time Overpass API (OpenStreetMap) — no API key needed
- **Interactive Map:** Leaflet with OpenStreetMap street tiles + ESRI satellite toggle, color-coded markers per type, pulsing user-location marker, OSRM routing with drawn polyline
- **Facility list:** Distance, open/closed status, address, phone, call button, directions button, share link
- **CSV Export:** Download facility list
- **Persistent state:** Map location, places, active types, and radius are lifted to App.jsx so they survive navigating away and back
- **Sidebar:** Facility count and filter controls

---

#### `/diet` — AI Diet Planner (`DietPlanner.jsx`) — Patient only
- **Preferences Setup:** Region (8 Indian regions + Other), Diet type (vegetarian / non-vegetarian / vegan), Food allergies (tag input), Food dislikes (tag input), Meals per day (2–6), Calorie preference (low/moderate/high), Budget (low/moderate/high) — saved per patient
- **Weekly Meal Plan:** AI-generated 7-day plan with 5 meals/day (Breakfast, Morning Snack, Lunch, Evening Snack, Dinner). Each meal shows name, cuisine, calories, protein, carbs, fat, description
- **Nutrition accordion:** Expandable per-meal macro details
- **Meal Completion tracking:** Check off meals as done, persisted via API
- **Swap Meal:** Request AI to regenerate a specific meal slot
- **Favorites:** Star a meal to save it to favorites list (with dedicated Favorites tab)
- **Shopping List:** AI aggregates ingredients from the week's plan; items can be checked off, added, or deleted
- **Sidebar:** Navigation tabs — Plan, Preferences, Favorites, Shopping List

---

#### `/garden` — Health Garden (`HealthGarden.jsx`) — Patient only
A gamified health engagement system:
- **Garden visual:** Emoji-based plant that evolves through 7 stages (Seed → Sprout → Small Plant → Growing Plant → Flowering Plant → Mature Plant → Personal Health Garden) based on total points
- **Activity logging:** 5 activity types with point values:
  - Medication Taken (+10 pts)
  - Meal Completed (+5 pts)
  - Symptom Logged (+5 pts)
  - Activity Done (+10 pts)
  - Health Check-in (+5 pts)
- **Streak tracking:** Current streak and best streak
- **Achievements system:** Unlockable badges (fetched from `/api/garden/achievements/`)
- **Activity history:** Timeline of logged activities
- **Progress bar** to next garden stage
- **Sidebar:** Garden stats and achievement count

---

#### `/profile` — User Profile (`Profile.jsx`) — Authenticated only
A tabbed profile hub with 4 tabs:

**Tab 1 — Identity (`ProfileIdentity.jsx`)**
- **Holographic Emergency Medical ID Smartcard:** Displays vault ID (`MF-XXXXXX`), blood group, DOB, gender, weight, height, allergies, emergency contact
- **Emergency QR Token:** Generate/revoke a shareable QR token (token stored in `localStorage`). Scanned → opens `/emergency/:token` public card
- **Edit mode:** Inline form to update first/last name, DOB, gender, blood group, weight, height, allergies, emergency contact
- **BMI display** with category badge
- **Health Status Ledger:** Derived from health score — shows Optimal / Moderate / Unstable
- Doctor profile: Shows credentials, license number, proof document link

**Tab 2 — Medical Vault (`MedicalVault.jsx`)**
- Consolidated archive of all prescriptions, pathology reports, and predictions
- **Prescription records:** Medicine list per prescription with dosage/frequency
- **Pathology records:** Biomarker table with trend arrows (Improved ↑ / Worsened ↓ / Stable / Changed) comparing latest vs. previous values
- **Voice Explainer** on pathology analysis — reads out the AI clinical insight in EN/Tamil/Hindi
- Sort/filter archive; expandable cards

**Tab 3 — Risk Assessments (`RiskAssessments.jsx`)**
- Historical prediction records with expandable detail
- Shows risk score, risk level, clinical reasoning, remedies per record
- "Run Vitals" CTA link to `/dashboard`

**Tab 4 — PillBox (`PillBox.jsx`)**
- All extracted medications from prescription history (de-duplicated by name)
- **Custom medication** add/edit/delete (patient-defined, not AI-extracted)
- **Daily medication tracker:** Check off medications as taken today
- **AI Drug Safety Check:** One-click call to `/api/telemetry/drug-safety/` — returns interaction report and safety assessment
- Allergy mismatch warnings displayed inline

---

#### `/emergency/:token` — Emergency Card (`EmergencyCard.jsx`) — Public
- Publicly accessible via QR code or direct URL, no authentication needed
- Fetches patient data from `GET /api/emergency/:token/`
- Displays: Patient name, Vault ID, Blood group, Allergies, Active medications, Emergency contact, DOB, Gender, Weight, Height
- Styled as a printable medical card
- Shows error message if token is revoked or invalid

---

## 3. Frontend Components

| Component | File | Purpose |
|---|---|---|
| `AIChatbot` | `components/AIChatbot.jsx` | Floating chat widget available on all pages. Features: message history, urgency detection (critical/warning/normal), guided Symptom Checker (4-step flow), follow-up question suggestions, voice input (browser Speech Recognition API), export chat as text, theme-aware styling |
| `InteractiveMap` | `components/InteractiveMap.jsx` | Leaflet map abstraction. Street & satellite tile layers, colored facility markers, pulsing user-location marker, OSRM route polyline, popups with Call/Directions buttons |
| `VoiceExplainer` | `components/VoiceExplainer.jsx` | Reads AI-generated text aloud via browser `speechSynthesis`. Supports EN, Tamil (தமிழ்), Hindi (हिंदी) via AI translation API call. Inline play/stop toggle |

---

## 4. Context Providers

| Context | File | Purpose |
|---|---|---|
| `SidebarContext` | `context/SidebarContext.jsx` | Provides `sidebarContent` / `setSidebarContent` — pages inject their own sidebar content dynamically |
| `ThemeContext` | `context/ThemeContext.jsx` | Provides `theme` ('dark' / 'light') and `toggleTheme` — persisted in `localStorage` |
| `useTheme` hook | `context/useTheme.js` | Custom hook to consume `ThemeContext` |

---

## 5. Frontend Services

| File | Contents |
|---|---|
| `services/api.js` | Axios instance (`api`) with base URL `http://127.0.0.1:8000/api`, 60s timeout, JWT `Authorization: Bearer` header injection interceptor, 401 session-expiry handler with auto-logout, `setAuthToken` / `removeAuthToken` helpers |
| `services/utils.js` | Shared utilities: `getAge(dob)`, `getRiskColor(level)`, `getRiskBg(level)`, `getInitials(name)`, `getHasShownGuestPopup()`, `setHasShownGuestPopup()`, and the `INTERACTIONS` drug-drug interaction table |

---

## 6. Backend API Endpoints

All endpoints are under the `/api/` prefix.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup/` | None | Register Patient or Doctor. Doctors must supply `license_number` + `medical_proof_file`. Returns JWT token + user object |
| POST | `/api/auth/login/` | None | Authenticate with email + password. Returns JWT token + user object |

### Prescriptions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/prescriptions/upload/` | Optional | Upload prescription image. AI extracts medicines, dosage, frequency, timing. Saves to Patient or Guest record |
| GET | `/api/prescriptions/` | Optional | List prescriptions for the authenticated patient, or for a doctor's patients, or by guest email |

### Pathology

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/pathology/analyze/` | Optional | Analyze biomarkers from JSON or uploaded image. AI produces risk_index, normalcy_index, insights. Saves to Patient/Guest |
| GET | `/api/pathology/` | Optional | List pathology reports |
| GET | `/api/pathology/trends/` | Optional | Biomarker trend analysis over time |

### Predictions / Risk Assessment

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/predictions/predict/` | Optional | Run AI risk prediction. Accepts `disease_type` (Heart Attack, Diabetes, Cancer Screening) + `parameters`. Returns risk_score, risk_level, clinical_reasoning, remedies |
| POST | `/api/predictions/simulate/` | Optional | What-if simulation — same as predict but ephemeral (not persisted) |
| GET | `/api/predictions/` | Optional | List all prediction records for authenticated patient or guest |
| GET | `/api/predictions/history/` | Optional | Alias for list |
| GET | `/api/predictions/:pk/` | Yes (Patient) | Get single prediction record |

### Profile & Telemetry

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/telemetry/emergency/` | Yes | Patient snapshot — name, blood group, allergies, active meds, emergency contact, vitals |
| GET | `/api/telemetry/health/` | Yes (Patient) | AI-powered health monitoring summary (health score, status, alerts) |
| POST | `/api/profile/update/` | Yes | Update patient profile (name, DOB, gender, blood group, weight, height, allergies, emergency contact) or doctor profile (name, license) |
| POST | `/api/telemetry/chat/` | Yes (Doctor) | Doctor-specific AI chat about a patient |
| POST | `/api/telemetry/drug-safety/` | Yes | AI drug safety check — interactions + allergy hazards for patient's medication list |

### Emergency QR Token

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/emergency/generate/` | Yes (Patient) | Generate a unique emergency QR token linked to the patient |
| DELETE | `/api/emergency/revoke/` | Yes (Patient) | Revoke/invalidate the emergency token |
| GET | `/api/emergency/:token/` | None (Public) | Public emergency card data — retrieved by scanning QR code |

### Doctor Patient Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/patients/` | Yes (Doctor) | List all patients with summary |
| GET | `/api/patients/:id/` | Yes (Doctor) | Get full patient details including prescriptions, pathology, predictions |
| POST | `/api/patients/:id/prescribe/` | Yes (Doctor) | Add a manual prescription for a patient |

### AI Utility

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/chat/` | None | General AI health chat. Accepts message + history. Returns reply + optional follow-up questions. Supports `include_followups` flag |
| POST | `/api/ai/explain/` | None | AI translation/explanation of medical text (used by VoiceExplainer for multilingual support) |

### Diet Planner

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET/POST | `/api/diet/preferences/` | Yes (Patient) | Get or update diet preferences (region, diet type, allergies, dislikes, meals/day, calorie, budget) |
| POST | `/api/diet/generate/` | Yes (Patient) | Generate a new 7-day AI meal plan based on preferences |
| GET | `/api/diet/plan/` | Yes (Patient) | Get the current active meal plan |
| POST | `/api/diet/swap/` | Yes (Patient) | Swap a single meal slot with an AI-generated alternative |
| POST | `/api/diet/meal-complete/` | Yes (Patient) | Mark a meal as completed (or un-completed) |
| GET/POST/DELETE | `/api/diet/favorites/` | Yes (Patient) | Get, add, or remove favorite meals |
| GET/POST | `/api/diet/shopping-list/` | Yes (Patient) | Get or add shopping list items |
| PATCH/DELETE | `/api/diet/shopping-list/:id/` | Yes (Patient) | Update (check/uncheck) or delete a shopping list item |

### Health Garden

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/garden/` | Yes (Patient) | Get garden status (total points, streak, stage, achievements) |
| POST | `/api/garden/activity/` | Yes (Patient) | Log a health activity (type + optional note). Awards points and updates streak |
| GET | `/api/garden/history/` | Yes (Patient) | Get activity history log |
| GET | `/api/garden/achievements/` | Yes (Patient) | Get list of unlocked achievements |

### System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health/` or `/api/health/` | None | System health check — Python version, Django version, DB connection status, record counts |

---

## 7. Backend Models

All models live in the `medical` Django app.

### `User` (extends `AbstractUser`)
Custom user model. Auth via email (not username).

| Field | Type | Notes |
|---|---|---|
| `email` | EmailField (unique) | Primary login identifier |
| `full_name` | CharField | Display name |
| `role` | CharField | `'Patient'` or `'Doctor'` |
| `license_number` | CharField | Doctors only |
| `medical_proof_file` | CharField | Path to uploaded certification file |
| `created_at` | DateTimeField | Auto |

### `Patient`
One-to-one with User (Patient role).

| Field | Type | Notes |
|---|---|---|
| `user` | OneToOneField → User | |
| `doctor` | ForeignKey → User (nullable) | Assigned doctor |
| `first_name`, `last_name` | CharField | |
| `dob` | DateField | |
| `gender` | CharField | M/F/O |
| `blood_group` | CharField | A+/A-/B+/B-/AB+/AB-/O+/O- |
| `weight_kg`, `height_cm` | FloatField | |
| `allergies` | TextField | JSON list |
| `emergency_contact` | CharField | |

### `Prescription`
| Field | Type | Notes |
|---|---|---|
| `patient` | ForeignKey → Patient (nullable) | Null for guest |
| `guest_email`, `guest_name` | Nullable fields | Guest attribution |
| `image_url` | CharField | Stored filename |
| `extracted_data` | TextField | JSON — medicines, recommendations, urgency, physician, clinical_intent |
| `status` | CharField | pending/processing/completed/failed |
| `created_at` | DateTimeField | |

### `PathologyReport`
| Field | Type | Notes |
|---|---|---|
| `patient` | ForeignKey → Patient (nullable) | |
| `guest_email`, `guest_name` | Nullable | |
| `report_data` | TextField | JSON — input biomarkers list |
| `clinical_insight` | TextField | JSON — AI risk_index, normalcy_index, insights |
| `created_at` | DateTimeField | |

### `EmergencyToken`
| Field | Type | Notes |
|---|---|---|
| `patient` | OneToOneField → Patient | |
| `token` | CharField (64, unique) | Random hex string |
| `created_at` | DateTimeField | |
| `expires_at` | DateTimeField (nullable) | Currently unused (no expiry logic) |
| `is_active` | BooleanField | False = revoked |

### `PredictionRecord`
| Field | Type | Notes |
|---|---|---|
| `patient` | ForeignKey → Patient (nullable) | |
| `guest_email`, `guest_name` | Nullable | |
| `disease_type` | CharField | 'Heart Attack', 'Diabetes', 'Cancer Screening' |
| `input_parameters` | TextField | JSON — all vitals/symptom inputs |
| `risk_score` | FloatField | 0–100 % |
| `risk_level` | CharField | LOW/MODERATE/HIGH/CRITICAL |
| `clinical_reasoning` | TextField | AI narrative |
| `remedies` | TextField | JSON — dietary_guidelines, lifestyle_modifications, clinical_recommendations, urgent_warning_signs |
| `created_at` | DateTimeField | |

### Diet Models

| Model | Key Fields |
|---|---|
| `DietPreference` | OneToOne → Patient; region, diet_type, food_allergies (JSON), food_dislikes (JSON), meals_per_day, calorie_preference, budget |
| `MealPlan` | FK → Patient; week_start, plan_data (JSON — 7 days × 5 meal slots), is_active |
| `MealCompletion` | FK → Patient; date, meal_type, completed — unique_together (patient, date, meal_type) |
| `FavoriteMeal` | FK → Patient; meal_data (JSON blob) |
| `ShoppingListItem` | FK → Patient; ingredient, quantity, checked |

### Health Garden Models

| Model | Key Fields |
|---|---|
| `HealthActivity` | FK → Patient; activity_type (5 types), points, note, logged_at |
| `GardenProgress` | OneToOne → Patient; total_points, current_streak, best_streak, last_activity_date, achievements (JSON list of IDs) |

---

## 8. Authentication & Authorization

### Mechanism
- **JWT** via `djangorestframework-simplejwt`
- Access token lifetime: **60 minutes**
- Refresh token lifetime: **1 day** (rotation enabled)
- Frontend stores token in `localStorage` as `medfusion_token`
- All authenticated API requests include `Authorization: Bearer <token>` header

### User Roles

| Role | Permissions |
|---|---|
| **Guest** | Health risk prediction (ephemeral), prescription scan, pathology scan, AI chat, nearby map |
| **Patient** | All guest features + persistent records, profile, emergency QR, PillBox, Diet Planner, Health Garden |
| **Doctor** | Patient directory, patient records, manual prescriptions, drug safety checks, patient AI chat, scanner for any patient |

### Frontend Route Guards
- `/diet` and `/garden` — redirect to `/` if not `user.role === 'Patient'`
- `/profile` — opens auth modal if unauthenticated
- `Dashboard` — renders role-appropriate component (GuestDashboard / PatientDashboard / DoctorDashboard)
- `Upload` — renders GuestUpload if unauthenticated

### Backend Permissions
- Default DRF permission: `AllowAny` (endpoints self-handle auth context)
- Endpoints explicitly using `@permission_classes([IsAuthenticated])`: `telemetry/emergency`, `telemetry/health`, `profile/update`, `predictions/:pk`, `patients/*`, `emergency/generate`, `emergency/revoke`, all `garden/*`, all `diet/*`
- Role checks done in view logic (e.g. `user.role != 'Doctor'` returns 403)

---

## 9. Key Features Summary

| Feature | Description |
|---|---|
| **AI Health Risk Prediction** | 3 disease models (Heart Attack, Diabetes, Cancer). Takes vitals + symptoms, returns risk score (0–100%), risk level, clinical reasoning, 4-category remedies. Works for guests and patients. |
| **Smart Predictor Filtering** | Sidebar shows only disease predictors relevant to the patient's current vitals, medication history, pathology results, or prior predictions |
| **What-If Simulator** | Patients can adjust parameters and re-run prediction to see how lifestyle changes would affect their risk score |
| **Prescription Scanner** | Upload image/PDF of any prescription. Gemini AI extracts complete medication list with dosage, frequency, timing, meal context |
| **Pathology Report Analyzer** | Upload lab report image or submit biomarkers as JSON. AI produces risk_index, normalcy_index, clinical insights, and compares to previous scan |
| **Biomarker Auto-Fill** | On the Dashboard, uploading a pathology report auto-populates the vitals form (glucose → diabetes form, cholesterol/BP → heart form, etc.) |
| **Medical Vault** | Full patient archive of prescriptions, pathology reports, and risk assessments in one view. Biomarker trend arrows (Improved/Worsened/Stable) |
| **Voice Explainer** | AI results narrated via browser TTS in English, Tamil, or Hindi (with AI translation) |
| **PillBox & Drug Safety** | Daily medication tracker (extracted + custom meds). AI drug safety check detects interactions and allergy conflicts |
| **Emergency QR Card** | Patient generates a shareable QR token. Anyone who scans it (first responders, ER) sees critical patient data — no login required |
| **Holographic Emergency ID** | Profile displays a visual "smartcard" with Vault ID, blood group, allergies, and emergency contact |
| **AI Diet Planner** | Generates a 7-day personalised meal plan by Indian region, diet type, calorie preference, and budget. Meal swap, completion tracking, favorites, and shopping list |
| **Health Garden (Gamification)** | Points-based engagement system with 7 plant growth stages and achievements. Patients earn points by logging medications, meals, symptoms, and check-ins |
| **Nearby Facilities Map** | Real-time map of hospitals, clinics, pharmacies, dentists, and labs using OpenStreetMap/Overpass. Real routing via OSRM. No API key required |
| **AI Chatbot** | Floating chat widget on all pages. Urgency detection for medical emergencies (critical/warning/normal). Guided symptom checker (4 steps). Follow-up question suggestions. Voice input. Export chat |
| **Doctor Dashboard** | Patient registry, full clinical history per patient, manual prescription writing, drug interaction/allergy safety engine, diagnostic calculators (BMI, Target Heart Rate), patient-specific AI chat |
| **Dual LLM Provider** | Backend uses Google Gemini 2.5 Flash as primary and OpenAI as fallback. Configurable via `.env` |
| **Dark/Light Theme** | Full theme toggle persisted per user, respects all components |
| **Health Score** | Computed by `health_monitor.py` (from pathology + prediction records), displayed in sidebar and navbar for Patient users |

---

## 10. External Integrations

| Integration | Purpose | Config Key |
|---|---|---|
| **Google Gemini** (google-genai 2.7.0) | Primary LLM — prescription OCR, pathology analysis, risk prediction, diet generation, chat, translation | `GOOGLE_API_KEY`, `DEFAULT_LLM_MODEL` |
| **OpenAI** (openai 2.40.0) | Fallback LLM | (via `llm_provider.py`) |
| **Overpass API** | OpenStreetMap facility data for NearbyMap | No key needed |
| **OSRM** | Turn-by-turn routing for NearbyMap | No key needed |
| **Leaflet** + **OpenStreetMap tiles** | Map rendering | No key needed |
| **ESRI World Imagery** | Satellite tile layer in InteractiveMap | No key needed |
| **Browser Speech Recognition API** | Voice input in AIChatbot | No key needed |
| **Browser SpeechSynthesis API** | Voice output in VoiceExplainer | No key needed |

---

## 11. Known Issues / TODO Items

| Location | Issue |
|---|---|
| `EmergencyToken.expires_at` | Field exists but expiry logic is not implemented — tokens never auto-expire |
| `backend/medfusion_backend/settings.py` | `DEBUG=True`, `ALLOWED_HOSTS` is permissive (localhost only), `SECRET_KEY` has a hardcoded fallback — not production-ready |
| `backend/medfusion_backend/settings.py` | `SECURE_SSL_REDIRECT=False`, `SESSION_COOKIE_SECURE=False`, `CSRF_COOKIE_SECURE=False` — all need to be `True` in production |
| `services/api.js` | `console.warn('Session expired…')` left in production code |
| `PatientDashboard.jsx` | Multiple `console.error(...)` calls in catch blocks — fine for dev, should use a logger in production |
| `DoctorDashboard.jsx` | Multiple `console.error(...)` in fetch catch blocks |
| `.env` | `GOOGLE_API_KEY` is committed in plain text — should be excluded via `.gitignore` and injected via environment |
| `medical/models.py` | `EmergencyToken.expires_at` — the field exists but is `null=True` with no scheduled job or view logic to enforce expiry |
| `backend/medical/services/_ml_section_raw.txt` | Raw text file in services folder — appears to be scratch/notes artifact, not used at runtime |
| Diet Planner | No pagination on meal history or shopping list — could become unwieldy at scale |
| Database | SQLite3 — not suitable for production concurrency |

---

## 12. Tech Stack Summary

### Frontend

| Package | Version |
|---|---|
| react | ^19.2.4 |
| react-dom | ^19.2.4 |
| react-router-dom | ^7.14.0 |
| axios | ^1.15.0 |
| framer-motion | ^12.38.0 |
| lucide-react | ^1.8.0 |
| leaflet | ^1.9.4 |
| vite | ^8.0.4 |

Build: Vite (ESM, `"type": "module"`). Dev server: `npm run dev`. Build: `npm run build`.

### Backend

| Package | Version |
|---|---|
| django | 5.0.6 |
| djangorestframework | 3.15.2 |
| django-cors-headers | 4.4.0 |
| djangorestframework-simplejwt | 5.3.0 |
| google-genai | 2.7.0 |
| openai | 2.40.0 |
| scikit-learn | 1.9.0 |
| numpy | 2.4.6 |
| pillow | 12.2.0 |
| python-dotenv | 1.0.0 |
| requests | 2.34.2 |
| bcrypt | 4.0.1 |

Run: `python manage.py runserver` (port 8000). CORS allowed origins: `localhost:3000`, `5173`, `5174`.

---

*Report generated by investigation of source code on October 14, 2026.*
