# MedFusion AI — Intelligent Clinical Platform

MedFusion AI is a next-generation diagnostic suite designed for ortho-dental intelligence. It provides a sleek, clinical-grade interface for image ingestion, neural inference, and medical record management.

## 🚀 Key Features
- **Neural Ingestion Core**: Unified upload center for radiographs, pathology reports, and prescriptions.
- **Inference Bridge**: Real-time diagnostic overlays with pathological voxel mapping.
- **Neural Vault**: Secure, searchable repository of historical clinical telemetry.
- **Clinical AI Assistant**: Terminal-integrated agent for real-time protocol consultation.

## 🛠️ Technology Stack
- **Backend**: FastAPI, SQLAlchemy (SQLite/PostgreSQL), PyTorch.
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide Icons.
- **DevOps**: Docker, Docker Compose.

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
