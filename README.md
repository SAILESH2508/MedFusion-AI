# MedFusion AI // Clinical Telemetry & Diagnostic Core

MedFusion AI is a high-fidelity clinical telemetry platform designed to bridge the gap between pharmacological prescriptions and longitudinal biometric pathology. By leveraging a neural inference core (Gemini AI) and local Machine Learning backup nodes, it provides automated diagnostic insights, cross-modal correlation, and a secure clinical vault for patient safety.

---

## 🚀 Core Features

### 1. AI Health Diagnostics & Risk Engine (Patient Portal)
An interactive screening workspace offering detailed health prediction and clinical modeling:
- **Cardiovascular Vitals Engine**: Models Heart Attack probability based on blood pressure, cholesterol, max heart rate, chest pain profiles, and exercise angina.
- **Metabolic & Glycemic Engine**: Screenings for Type 2 Diabetes risk utilizing fasting glucose, HbA1c, weight, height, BMI calculations, and hypertension history.
- **Oncological Surveillance Engine**: General and category-specific (Lung, Breast, Prostate, Colorectal, Skin) cancer screening based on lifestyle factors, toxins, and active warning flags.
- **Predictive Risk Coefficients**: Instant probability calculation styled as LOW, MODERATE, HIGH, or CRITICAL with high-fidelity visual radial gauge.
- **Preventative Remedy Matrix**: Dynamic remedy planning categorized into:
  - *Dietary Plans* (e.g. low GI, Mediterranean)
  - *Lifestyle Changes* (exercise, behavioral habits)
  - *Clinical Recommendations & OTC suggestions* (supplements, lab panels to order)
  - *Urgent warning red flags* for immediate emergency department evaluation.
- **Dynamic Predictor Safety Lock**: Gated buttons requiring user parameter changes and confirmation checkbox verification before executing predictions.
- **Reactive Symptom Checklists**: Features a "No Symptoms" option in checklists which clears all active symptoms on selection, and automatically checks itself if all other symptoms are unchecked.

### 2. Clinical Examiner Dashboard (Doctor Portal)
A secure workspace built for medical practitioners:
- **Patient Directory Console**: Interactive directory synchronizing registered patient profiles, pathology count, and historical AI disease runs.
- **EHR Navigation Map**: Visual maps to scroll instantly to Patient Profile, Prescription logs, Pathology panels, AI Disease risks, and Regimen Formulators.
- **Regimen Builder**: Manual prescription formulator allowing physicians to construct drug regimens (dosage, frequencies) and log clinical guidance directly to patient EHRs.
- **Daily Planner Widget**: Tasks planner for medical professionals to coordinate clinical diagnostics and pathology reviews.
- **Diagnostic Calculator Widget**: Calculators for BMI classifications and Target Heart Rate (THR) aerobic zone thresholds (60-85%).

### 3. Neural Ingestion Pipeline
A unified ingestion gateway using **Gemini 2.5 Flash** for clinical documentation:
- **Prescription Ingestion**: Upload prescription images to extract medicines (dosage, frequency, timing, details), safety recommendations, and physician metadata.
- **Pathology Lab Processing**: Intelligent ingestion of lab report biomarkers (Glucose, Cholesterol, WBC count, etc.) into structured metabolic data.

### 4. Hybrid Machine Learning Fallback
- **Local RF Inference Node**: If the GenAI API quota is exceeded or offline, MedFusion AI automatically runs predictive calculations locally via trained **Random Forest models** (`heart_attack_rf.pkl`, `diabetes_rf.pkl`, `cancer_rf.pkl`) utilizing numpy/pickle.

### 5. Emergency Clinical Vault
- A mission-critical identity card summarizing crucial biometric parameters (Allergies, Blood Groups, Active Meds, Emergency Contacts) for quick clinical triage.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS/Vanilla CSS, Lucide | Premium, dark-mode, high-fidelity patient and doctor dashboard. |
| **Backend** | Django REST Framework, SQLite | High-performance API gateway and patient database persistence. |
| **AI Engine** | Gemini AI (GenAI SDK) | Vision-to-text extraction, clinical reasoning, and remedy formulation. |
| **ML Engine** | Scikit-learn (Random Forest) | Local fallback inference models. |

---

## 📦 Project Architecture

```text
medfusion-ai/
├── backend/                # Django REST API
│   ├── medical/            # Core clinical models, views, and urls
│   │   ├── services/       # AI service layers (AI & local ML fallback)
│   │   ├── ml_models/      # Pre-trained Random Forest models (.pkl)
│   │   └── migrations/     # Django ORM migrations
│   └── manage.py           
└── frontend/               # React Application
    ├── src/
    │   ├── pages/          # Auth, Landing, Profile, Upload, Dashboard
    │   ├── services/       # Axios API layer
    │   ├── context/        # Sidebar and UI context providers
    │   └── index.css       # Glassmorphism, dynamic grids, and theme styling
    └── package.json        
```

---

## ⚙️ Configuration & Environment Setup

### Backend Environment Variables
Create a file named `.env` in the `backend/` directory with the following variables:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_API_KEY=your_gemini_api_key_here
DEFAULT_LLM_MODEL=gemini-2.5-flash
```

### Local Machine Learning Models Training
Pre-trained Random Forest model binaries are stored under `backend/medical/ml_models/`. To retrain or synthesize new training datasets, run:
```bash
cd backend
python medical/train_models.py
```

---

## ⚡ Quick Start

### 1. Launch Backend (Django)
Ensure you have dependencies installed from `backend/requirements.txt`.
```powershell
cd backend
python manage.py runserver
```

### 2. Launch Frontend (React)
Ensure you have packages installed via `npm install`.
```powershell
cd frontend
npm run dev
```

---

## 🛡️ Clinical Security & Privacy
- **Asset Gating**: Strict limits on document sizing (16MB maximum).
- **Relational Integrity**: Complete trace audit logs connecting Patient, Prescriptions, Pathology, and AI predictions.
- **Privacy Gated**: Offline diagnostic fallbacks to maintain system continuity when cloud networks are inaccessible.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
