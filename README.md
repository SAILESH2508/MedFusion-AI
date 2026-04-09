# MedFusion AI — Intelligent Clinical Platform

MedFusion AI is a next-generation diagnostic suite designed for ortho-dental intelligence. It provides a sleek, clinical-grade interface for image ingestion, neural inference, and medical record management.

## 🚀 Actual Core Features
- **Neural Ingestion Core**: Unified processing center for pharmacological orders and lab-tested pathology reports.
- **Radiology Voxel Mapping**: Intelligent processing of radiographic imagery (X-Ray, CT, MRI) with confidence-weighted diagnostic findings.
- **Clinical Telemetry Hub**: Longitudinal tracking of metabolic trajectories (e.g., LDL-C) with autonomous health score synthesis.
- **Autonomous Correlation**: AI-powered cross-referencing of prescriptions against biometric telemetry to identify metabolic risks.
- **Neural Integrity Gates**: Strict modality validation that blocks non-clinical data, ensuring a secure diagnostic environment.
- **Emergency Clinical Vault**: Instant-access identity module for responders featuring verified blood types and allergy alerts.
- **Interactive Clinical Assistant**: Neural-GPT interface for real-time protocol consultation and clinical inquiries.

## 🛠️ Technology Stack
- **Backend**: FastAPI, SQLAlchemy (SQLite), PyTorch Neural Core.
- **Frontend**: React (Vite), Framer Motion, Lucide-React, Tailwind CSS.
- **Security**: AES-256 Metadata Vaulting & Modality-Gated Inference.

## 📦 Project Structure
```text
medfusion-ai/
├── backend/                # FastAPI Application
│   ├── app/
│   │   ├── ai_engine/      # Neural Inference Models
│   │   ├── models/         # DB Models (SQLAlchemy)
│   │   ├── services/       # AI Orchestrate Logic
│   │   └── main.py         # Entry point
│   └── medfusion.db        # SQLite Local Database
├── frontend/               # React Application
│   ├── src/
│   │   ├── components/     # UI Components (Navbar, AI Assistant)
│   │   ├── pages/          # Hub, Upload, Archive, Viewer
│   │   └── index.css       # Design System & Design Tokens
└── docker-compose.yml      # Orchestration
```

## 🛠️ Getting Started

### 1. Manual Setup (Recommended for Local Dev)
**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 2. Docker Setup
```bash
docker-compose up --build
```

## 🧪 Testing
Run the automated diagnostic suite:
```bash
cd backend
python test_api.py
```

## 🔐 Security & Protocols
- **AES-256 Vaulting**: All clinical assets are stored with industry-standard encryption mappings.
- **Neural Integrity**: Modality-gated inference ensures specific diagnostic nodes only process relevant imagery.
- **Clinical Handshake**: Verified link between front-end telemetry and neural core processing.
