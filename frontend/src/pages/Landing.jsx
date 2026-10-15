import { Link } from 'react-router-dom';
import { Activity, Leaf, ScanLine } from 'lucide-react';

function Landing() {
  const features = [
    { icon: <Activity size={28} />, title: "AI Health Risk Predictor", desc: "Checks your risk level for heart conditions, diabetes, and cancer using advanced medical AI." },
    { icon: <Leaf size={28} />, title: "Easy Daily Health Plans", desc: "Provides custom lifestyle changes, food guides, and active next steps to keep you healthy." },
    { icon: <ScanLine size={28} />, title: "Smart Prescription Scanner", desc: "Lets you upload written prescriptions and lab results to import your health details instantly." }
  ];

  return (
    <div className="reveal" style={{ paddingBottom: '32px' }}>

      {/* Hero Header Panel */}
      <div className="glass-card text-center p-5 mb-4 position-relative">
        <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill mb-3 font-monospace text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.06em', background: 'var(--bg-card-tinted)', border: '1px solid var(--border)', color: 'var(--brand-orange)' }}>
          <Activity size={12} /> Clinical Predictive Intelligence
        </div>

        <h2 className="fw-bolder mb-3" style={{ fontSize: '2.4rem', lineHeight: '1.25', letterSpacing: '-0.03em' }}>
          Welcome to MedFusion AI — <span className="text-info">Health Intelligence Platform</span>
        </h2>
        <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '800px', fontSize: '1.05rem', lineHeight: '1.65' }}>
          Empower your healthcare journey with secure, real-time predictive analytics. MedFusion AI integrates clinical diagnostics, pathology scans, and biometric telemetry to deliver personalized disease risk assessments and custom daily wellness pathways.
        </p>
        <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap mt-2">
          <Link
            to="/dashboard"
            aria-label="Check my health risk"
            className="btn-clinical primary w-auto-override px-4 py-3 d-inline-flex align-items-center gap-2 font-monospace text-uppercase fw-bold text-decoration-none"
            style={{ fontSize: '0.88rem', letterSpacing: '0.04em', borderRadius: '8px' }}
          >
            <Activity size={16} /> Check My Health Risk
          </Link>
          <Link
            to="/upload"
            aria-label="Scan a medical report"
            className="btn-clinical secondary w-auto-override px-4 py-3 d-inline-flex align-items-center gap-2 font-monospace text-uppercase fw-bold text-decoration-none"
            style={{ fontSize: '0.88rem', letterSpacing: '0.04em', borderRadius: '8px' }}
          >
            <ScanLine size={16} /> Scan a Report
          </Link>
        </div>
      </div>

      {/* Feature Grid Panel — Intentional Multi-Color Layered Surfaces */}
      <div className="row g-4 mt-2">
        {features.map((f, i) => {
          const cardClass = i === 0 ? 'card-secondary' : i === 1 ? 'panel-form' : 'panel-upload-rx';
          const iconColor = i === 0 ? 'var(--brand-orange)' : i === 1 ? 'var(--brand-blue)' : 'var(--accent-teal)';
          return (
            <div className="col-md-4" key={i}>
              <div className={`${cardClass} text-center h-100 p-4 d-flex flex-column justify-content-between`}>
                <div>
                  <div className="mb-3 d-flex justify-content-center" style={{ color: iconColor }}>{f.icon}</div>
                  <h3 className="fw-bold mb-2" style={{ fontSize: '1.15rem' }}>{f.title}</h3>
                  <p className="text-secondary mb-0" style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default Landing;
