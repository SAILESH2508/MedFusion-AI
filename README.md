# MedFusion AI // Clinical Telemetry, Digital Twin & Diagnostic Radar

<div align="center">

![MedFusion AI Banner](https://img.shields.io/badge/MedFusion%20AI-Clinical%20Intelligence-2563EB?style=for-the-badge&logo=medfusion)
![React](https://img.shields.io/badge/React%2018-Vite-61DAFB?style=for-the-badge&logo=react)
![Django](https://img.shields.io/badge/Django%205-REST%20Framework-092E20?style=for-the-badge&logo=django)
![Google Gemini](https://img.shields.io/badge/Gemini%202.0%20Flash-Vision%20%26%20Reasoning-4285F4?style=for-the-badge&logo=google)
![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-Random%20Forest-F7931E?style=for-the-badge&logo=scikit-learn)
![Leaflet](https://img.shields.io/badge/Leaflet-Live%20Facility%20Radar-199900?style=for-the-badge&logo=leaflet)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**An intelligent clinical telemetry ecosystem bridging the gap between pharmacological prescriptions, digital health twin simulation, longitudinal pathology analytics, and real-time medical facility dispatch.**

</div>

---

## 🌟 Executive Overview

**MedFusion AI** is an advanced, enterprise-grade clinical health intelligence platform designed for patients, physicians, and emergency responders. By integrating multimodal neural reasoning (**Google Gemini 2.0 Flash**) with an offline **Machine Learning fallback node (Random Forest ensembles)**, MedFusion AI provides real-time disease risk prediction, digital organ simulation, automated prescription digestion, biometric lab analysis, personalized nutrition planning, and live medical facility geospatial routing.

---

## 🚀 Key Modules & Capabilities

### 🧬 1. Personal Digital Health Twin & Organ Simulation
- **Interactive Physiological Avatar**: Full-body interactive SVG/Canvas visualization modeling the status of 6 major organ subsystems in real time:
  - **Cardiovascular System**: Heart rate, resting BP, arterial stiffness, coronary strain.
  - **Respiratory System**: SpO2, respiratory rate, pulmonary reserve.
  - **Metabolic & Endocrine**: Fasting blood sugar, insulin sensitivity, HbA1c trajectory.
  - **Hepatic & Renal**: ALT/AST, eGFR, creatinine filtration efficiency.
  - **Musculoskeletal**: Body composition, BMI, physical resilience index.
  - **Neurological & Stress**: Autonomic nervous balance, systemic stress index.
- **Dynamic Health Twin Score**: Composite longitudinal health metric (0–100) computed from multi-organ telemetry, medication adherence, and pathology metrics.
- **"What-If" Simulation Sandbox**: Dynamic sliders allowing patients and doctors to model how lifestyle adjustments (sleep hours, weekly aerobic exercise, dietary sodium, alcohol consumption, smoking cessation, and Rx adherence) affect overall organ longevity and disease risk over 1, 5, and 10-year horizons.

---

### 🗺️ 2. Live Medical Facility Radar & Emergency Dispatch
- **High-Performance Geospatial Mapping**: Powered by **Leaflet** with high-contrast medical GIS cartography, Google Hybrid satellite imagery, and fallback Esri terrain layers.
- **Instant GPS Geolocation**: High-precision device geolocation with manual coordinate override and one-click metropolitan presets (Bangalore, Mumbai, Delhi, Chennai, Hyderabad, Kolkata).
- **Multi-Category Facility Radar**:
  - **Hospitals**: Emergency triage capability, 24/7 trauma care flags, ICU capacity indicators, direct telephone dialer.
  - **Clinics**: Primary care centers, outpatient polyclinics, family physician practices.
  - **Pharmacies**: Prescription dispensing, medical supply stock, chemist contacts.
  - **Diagnostic Labs**: Pathology collection centers, ultrasound/MRI imaging labs.
  - **Dental Clinics**: Maxillofacial and general dentistry practices.
- **Emergency SOS Fast Route**: Automatic detection of the nearest hospital with one-click phone dispatch, live turn-by-turn routing via Google Maps, and distance indicators.
- **Clinical Referral & Emergency Sheet Export**: Instant `.txt` download summarizing patient coordinates, nearest facilities, emergency contact numbers, and turn-by-turn directions for paramedic responders.

---

### 🔬 3. Multi-Modal Vision AI Document Pipeline
- **Smart Prescription Ingestion (Rx OCR)**:
  - Upload physical prescription photos or PDFs.
  - Vision AI extracts drug trade names, active chemical compounds, dosages, administration routes (oral, IV, topical), frequencies (e.g. BD, TDS), and duration.
  - Automatic detection of contraindications, potential drug-drug interactions, and special clinical precautions.
- **Pathology Laboratory Report Analyzer**:
  - Ingests complex multi-page laboratory panels (Lipid profiles, Complete Blood Counts, Liver Function Tests, Renal Panels, HbA1c).
  - Normalizes values, compares with standard clinical reference intervals, and flags anomalies (High / Borderline / Low) with plain-English AI explanations.

---

### 📊 4. AI Clinical Risk Prediction & Hybrid ML Engine
Interactive clinical screening workspace featuring real-time risk coefficient gauges (LOW, MODERATE, HIGH, CRITICAL):
- **Cardiovascular Risk Engine**: Predicts heart attack probability using blood pressure, serum cholesterol, resting ECG, maximum heart rate achieved, chest pain type, and exercise-induced angina.
- **Metabolic & Glycemic Engine**: Evaluates Type 2 Diabetes onset using fasting plasma glucose, HbA1c, BMI, blood pressure, and age.
- **Oncological Surveillance Engine**: Screens for overall cancer risk and category-specific oncological markers (Lung, Breast, Prostate, Colorectal, Skin) based on lifestyle hazards, toxin exposures, and active red-flag symptoms.
- **Dual-Layer Hybrid Fallback**:
  - **Primary**: Cloud neural reasoning via Google Gemini 2.0 Flash.
  - **Secondary (Local Offline Mode)**: When network access is offline or API quotas are exhausted, execution instantly falls back to local pre-trained Scikit-Learn Random Forest models (`heart_attack_rf.pkl`, `diabetes_rf.pkl`, `cancer_rf.pkl`) without disruption.
- **Preventative Remedy Matrix**:
  - Evidence-based dietary guidelines (e.g., DASH diet, Mediterranean, low-glycemic index).
  - Target exercise parameters and behavioral habit recommendations.
  - Non-prescription supplement suggestions and lab panels to request from physicians.
  - Urgent red-flag warning criteria triggering immediate emergency care.

---

### 🩺 5. Doctor Clinical Examiner Console
Dedicated workspace designed for registered medical practitioners:
- **Verified Clinical Registration**: Secure authentication validating Medical License IDs and credential verification files.
- **Patient Directory & Triage**: Patient roster displaying registered patient profiles, pathology counts, risk stratifications, and historical diagnostic runs.
- **Interactive EHR Navigation Map**: One-click jump to Patient Identity, Prescription History, Pathology Panels, AI Risk Runs, and Regimen Formulator.
- **Digital Regimen Formulator**: Allows physicians to manually prescribe medications (drug name, dosage, frequency, specific instructions) and commit them directly to the patient's electronic health record.
- **Clinical Calculators**:
  - **BMI Classification**: Underweight, Normal, Overweight, Obese classes I–III.
  - **Target Heart Rate (Karvonen formula)**: Computes aerobic, anaerobic, and VO2 max zones (60%–85%).

---

### 🥗 6. Personalized AI Diet Planner & Smart Grocery Matrix
- **Tailored Clinical Nutrition**: Generates 7-day meal plans calibrated to user metabolic goals, allergies, and chronic conditions (Diabetic, Renal-safe, Cardiac-protective, Mediterranean, High-protein, Low-carb).
- **Macro & Caloric Precision**: Detailed breakdown of daily Calories, Protein, Carbohydrates, Healthy Fats, and Fiber.
- **Dynamic Meal Swapping**: Replace any individual meal (Breakfast, Lunch, Dinner, Snack) with alternate AI-recommended options while maintaining macro balance.
- **Automated Shopping List Generator**: Consolidates ingredients from active meal plans into an categorized checklist for grocery shopping.

---

### 🌿 7. Health Garden & Chronobiology Wellness
- **Gamified Wellness Ecosystem**: Cultivate a virtual wellness garden that flourishes as medication adherence, water intake, daily steps, and balanced meals are logged.
- **Chronobiology Optimization**: Guides patients on optimal medication and meal timing based on natural circadian biological rhythms to maximize therapeutic efficacy and sleep quality.

---

### 🚨 8. Smart Emergency QR Profile & Digital Vault
- **Public Emergency Triage QR (`/emergency/:token`)**: Cryptographically tokenized public view accessible via smartphone camera scan by first responders or paramedics.
- **Life-Critical Telemetry**: Instantly displays Blood Group, Known Severe Allergies, Chronic Conditions, Active Medications, Emergency Contacts, and Physician Details without requiring login.
- **Printable & PDF Export**: Export credit-card sized emergency cards for wallet storage.

---

### 💬 9. Omnipresent MedFusion Clinical AI Assistant
- Floating clinical assistant accessible across every screen.
- Explains confusing lab terminology, answers medication usage questions, assesses symptom severity, and advises when to seek immediate medical attention.

---

## 🛠️ Technology Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18, Vite | High-performance single page application |
| **Routing & State** | React Router 6, React Context API | Dynamic client routing and persistent state |
| **UI & Styling** | Vanilla CSS, CSS Custom Properties, Bootstrap Grid | Fluid responsive design, light/dark mode design tokens |
| **Icons & Motion** | Lucide React, Framer Motion | Modern medical iconography & smooth micro-animations |
| **Geospatial & Maps** | Leaflet, React-Leaflet, OpenStreetMap, Google Hybrid | Live facility radar, routing polylines, custom markers |
| **Backend Framework** | Django 5.x, Django REST Framework (DRF) | Scalable REST API with token authentication |
| **Primary AI Core** | Google Gemini 2.0 Flash (google-genai SDK) | Vision OCR, clinical diagnostics, nutritional planning |
| **Local Machine Learning** | Scikit-learn, NumPy, Pickle | Offline Random Forest diagnostic classifiers |
| **Database** | SQLite (development) / PostgreSQL (production ready) | Structured relational patient health records |
| **Storage & Security** | Django Media Storage, Cryptographic tokens | Prescription uploads and emergency QR tokenization |

---

## 📂 Project Architecture

```text
medfusion-ai/
├── backend/                              # Django REST API Backend
│   ├── manage.py                         # Django execution utility
│   ├── requirements.txt                  # Python dependencies
│   ├── seed_clinical_twin_data.py        # Demo patient & digital twin seeder
│   ├── medfusion_backend/                # Core Django project settings & WSGI/ASGI
│   │   ├── settings.py                   # App configuration, CORS, JWT, Gemini setup
│   │   ├── urls.py                       # Top-level URL routing
│   │   └── wsgi.py
│   └── medical/                          # Clinical API Application
│       ├── models.py                     # Models: User, Prescription, Pathology, Prediction, Twin, Diet, Garden
│       ├── views.py                      # Core views: Auth, Ingestion, Predictions, Facilities, QR Vault
│       ├── diet_views.py                 # AI Diet Generation, Meal Swapping, Shopping List
│       ├── garden_views.py               # Wellness Garden activity, achievements, and status
│       ├── urls.py                       # Modular endpoint mapping
│       ├── ml_models/                    # Trained Scikit-Learn Random Forest models
│       │   ├── cancer_rf.pkl             # Oncological prediction binary
│       │   ├── diabetes_rf.pkl           # Type-2 diabetes prediction binary
│       │   └── heart_attack_rf.pkl       # Cardiovascular risk prediction binary
│       └── services/                     # Business logic & AI abstractions
│           ├── ai_service.py             # Gemini 2.0 Flash reasoning & Vision OCR
│           ├── health_monitor.py         # Longitudinal telemetry analysis
│           └── ml_predictor.py           # Local Scikit-learn Random Forest fallback runner
│
└── frontend/                             # React 18 / Vite Frontend Application
    ├── index.html                        # HTML entry point with Google Fonts
    ├── package.json                      # Frontend dependencies & npm scripts
    ├── vite.config.js                    # Vite bundler configuration & proxy
    └── src/
        ├── App.jsx                       # Root routing, global modal manager, persistent state
        ├── index.css                     # Comprehensive design system, dark/light themes, typography
        ├── components/                   # Reusable UI components
        │   ├── AIChatbot.jsx             # Floating conversational medical companion
        │   ├── InteractiveMap.jsx        # Leaflet facility radar & Google hybrid tile engine
        │   └── Navbar.jsx                # Responsive navigation & theme toggler
        ├── pages/                        # View routing pages
        │   ├── Auth.jsx                  # Unified Patient & Doctor login / verified sign-up modal
        │   ├── DigitalTwin.jsx           # 3D organ telemetry, biological rhythm & What-If sandbox
        │   ├── EmergencyCard.jsx         # Public tokenized emergency triage profile
        │   ├── GuestDashboard.jsx        # Unauthenticated guest experience
        │   ├── GuestUpload.jsx           # Guest document ingestion demo
        │   ├── Landing.jsx               # Hero presentation, platform capabilities, quick start
        │   ├── NearbyMap.jsx             # Facility radar, SOS routing, category filters, export sheet
        │   ├── Profile.jsx               # Emergency vault, pillbox, allergy logs, smart QR card
        │   ├── Upload.jsx                # Vision AI document ingestion (Rx & Pathology)
        │   ├── dashboard/                # Clinical dashboards
        │   │   ├── DoctorDashboard.jsx   # Clinical examiner patient directory & regimen builder
        │   │   └── PatientDashboard.jsx  # Health score, risk engines, telemetry timelines
        │   ├── digital-twin/             # Digital Twin modular sections
        │   │   ├── IntegratedDietSection.jsx   # AI meal planner & grocery list
        │   │   └── IntegratedGardenSection.jsx # Chronobiology & wellness garden
        │   └── profile/                  # Vault submodules
        │       ├── MedicalVault.jsx      # Historical pathology reports & prescriptions
        │       ├── PillBox.jsx           # Active medication schedule & reminders
        │       └── ProfileIdentity.jsx   # Biometric ID card & QR generator
        └── services/
            └── api.js                    # Axios API client, auth interceptors & base URLs
```

---

## 🔌 API Reference Blueprint

### 🔐 Authentication & Accounts
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup/` | Register new Patient or verified Doctor (with license upload) |
| `POST` | `/api/auth/login/` | Authenticate user credentials and return bearer auth token |
| `GET` | `/api/health/` | API gateway health check |

### 🧬 Digital Health Twin
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health-twin/` | Retrieve user digital health twin telemetry & scores |
| `GET` | `/api/health-twin/organ/<id>/` | Detailed telemetry for a specific organ system |
| `GET` | `/api/health-twin/timeline/` | Longitudinal biometric trends over time |
| `POST` | `/api/health-twin/observations/`| Log new vitals (BP, SpO2, glucose, heart rate) |

### 🗺️ Live Facility Radar & Routing
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/nearby/` | Search nearby hospitals, clinics, pharmacies, dentists, and labs |
| `GET` | `/api/geocode/` | Geocode address text into GPS coordinates |
| `GET` | `/api/reverse-geocode/` | Convert lat/lon coordinates into street address |

### 📄 Document Ingestion (Vision AI)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/prescriptions/upload/` | Upload prescription image for Gemini Vision OCR extraction |
| `GET` | `/api/prescriptions/` | List user historical verified prescriptions |
| `POST` | `/api/pathology/analyze/` | Ingest lab report PDF/image and extract structured biomarkers |
| `GET` | `/api/pathology/trends/` | Calculate longitudinal biomarker trends |

### 🔬 Clinical Predictions & Risk Engines
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/predictions/predict/` | Run disease screening (heart attack, diabetes, cancer) |
| `POST` | `/api/predictions/simulate/`| Run simulated What-If scenarios with altered parameters |
| `GET` | `/api/predictions/history/` | List historical prediction outcomes |

### 🥗 Diet & Nutrition
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET/POST`| `/api/diet/preferences/` | Get or update dietary requirements & allergies |
| `POST` | `/api/diet/generate/` | Generate complete 7-day personalized meal plan |
| `POST` | `/api/diet/swap/` | Swap individual meal with alternative balanced option |
| `GET` | `/api/diet/shopping-list/` | Get consolidated grocery shopping list |

### 🌿 Health Garden & Habits
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/garden/status/` | Get current garden health level and active plants |
| `POST` | `/api/garden/activity/` | Log wellness habit (water, steps, medication, sleep) |
| `GET` | `/api/garden/achievements/` | Retrieve unlocked wellness milestones |

### 🚨 Emergency Vault & QR Dispatch
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/emergency/generate/` | Generate secure, shareable public emergency token |
| `POST` | `/api/emergency/revoke/` | Invalidate existing emergency token |
| `GET` | `/api/emergency/<token>/` | Public paramedic emergency profile (no login required) |

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- **Node.js**: `v18.x` or higher
- **Python**: `3.10` to `3.12`
- **Google Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/)

---

### 2. Backend Setup (Django)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Create a `.env` file in the `backend/` folder:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GOOGLE_API_KEY=your_gemini_api_key_here
   DEFAULT_LLM_MODEL=gemini-2.0-flash
   DEBUG=True
   SECRET_KEY=your_django_secret_key_here
   ```

5. Run database migrations:
   ```bash
   python manage.py migrate
   ```

6. *(Optional)* Seed demo patient and clinical twin data:
   ```bash
   python seed_clinical_twin_data.py
   ```

7. Start the backend development server:
   ```bash
   python manage.py runserver
   ```
   *The Django API will be live at `http://localhost:8000`.*

---

### 3. Frontend Setup (React / Vite)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```
   *The application will launch at `http://localhost:5173` (or `http://localhost:5174`).*

---

## 🧪 Production Build & Verification

To compile the frontend client for production deployment:
```bash
cd frontend
npm run build
```
This runs Vite's optimized bundler, performs tree-shaking, generates source hashes, and verifies that there are zero TypeScript/JSX or CSS bundling errors.

---

## 🛡️ Clinical Safety & Disclaimer

> [!IMPORTANT]
> **Clinical Disclaimer**: MedFusion AI is an assistive clinical intelligence and telemetry platform intended for informational, educational, and workflow acceleration purposes. It is **not** a replacement for professional clinical judgment, emergency medical dispatch, diagnosis, or treatment. Always consult qualified healthcare providers for medical advice.

---

## 📄 License
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for complete details.
