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
      <div className="glass-card text-center p-5 mb-4 rounded-4 border-white-10">
        <h2 className="fw-bolder mb-3 text-white" style={{ fontSize: '2.5rem', lineHeight: '1.25', letterSpacing: '-0.03em' }}>
          Welcome to MedFusion AI — <span className="text-info">Next-Generation Health Intelligence</span>
        </h2>
        <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '820px', fontSize: '1.08rem', lineHeight: '1.65', opacity: 0.9 }}>
          Empower your healthcare journey with secure, real-time predictive analytics. MedFusion AI integrates clinical diagnostics, pathology scans, and biometric telemetry to deliver personalised disease risk assessments and custom daily wellness pathways.
        </p>
        <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap mt-2">
          <Link
            to="/dashboard"
            aria-label="Check my health risk"
            className="btn-clinical primary w-auto-override px-4 py-3 d-inline-flex align-items-center gap-2 font-monospace text-uppercase fw-bold text-decoration-none"
            style={{ fontSize: '0.88rem', letterSpacing: '0.06em', borderRadius: '10px' }}
          >
            <Activity size={16} /> Check My Health Risk
          </Link>
          <Link
            to="/upload"
            aria-label="Scan a medical report"
            className="btn-clinical w-auto-override px-4 py-3 d-inline-flex align-items-center gap-2 font-monospace text-uppercase fw-bold text-decoration-none"
            style={{ fontSize: '0.88rem', letterSpacing: '0.06em', borderRadius: '10px' }}
          >
            <ScanLine size={16} /> Scan a Report
          </Link>
        </div>
      </div>

      {/* Feature Grid Panel */}
      <div className="row g-4 mt-4">
        {features.map((f, i) => {
          const cardThemes = ['theme-heart', 'theme-diabetes', 'theme-general'];
          return (
            <div className={`col-md-4 ${cardThemes[i]}`} key={i}>
              <div className="glass-card text-center h-100 p-5">
                <div className="mb-4 text-theme-accent d-flex justify-content-center">{f.icon}</div>
                <h3 className="fw-bold mb-3" style={{ fontSize: '1.25rem' }}>{f.title}</h3>
                <p className="text-secondary mb-0" style={{ fontSize: '0.88rem' }}>{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default Landing;
