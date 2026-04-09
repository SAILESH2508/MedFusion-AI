import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InferenceViewer from './pages/InferenceViewer';
import RecordsArchive from './pages/RecordsArchive';


import MedicalHub from './pages/MedicalHub';
import UniversalUpload from './pages/UniversalUpload';
import PathologyIntel from './pages/PathologyIntel';
import ClinicalTelemetry from './pages/ClinicalTelemetry';
import ClinicalProfile from './pages/ClinicalProfile';

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="App">
                <Routes>
                    <Route path="/" element={<MedicalHub />} />
                    <Route path="/ingestion" element={<UniversalUpload />} />
                    <Route path="/pathology" element={<PathologyIntel />} />
                    <Route path="/telemetry" element={<ClinicalTelemetry />} />
                    <Route path="/archive" element={<RecordsArchive />} />
                    <Route path="/profile" element={<ClinicalProfile />} />
                </Routes>

            </div>
        </Router>
    );
}

export default App;
