import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

function Landing() {
  const features = [
    { icon: "🔮", title: "AI Health Risk Predictor", desc: "Checks your risk level for heart conditions, diabetes, and cancer using advanced medical AI." },
    { icon: "🌱", title: "Easy Daily Health Plans", desc: "Provides custom lifestyle changes, food guides, and active next steps to keep you healthy." },
    { icon: "🧬", title: "Smart Prescription Scanner", desc: "Lets you upload written prescriptions and lab results to import your health details instantly." }
  ];

  return (
    <div className="reveal" style={{ paddingBottom: '32px' }}>

      {/* Hero Header Panel */}
      <div className="glass-card text-center p-5 mb-4" style={{ 
        borderRadius: '16px', 
        border: '1px solid rgba(255, 255, 255, 0.09)', 
        background: 'linear-gradient(135deg, rgba(0, 8, 84, 0.4) 0%, rgba(0, 3, 40, 0.6) 100%)', 
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.07)'
      }}>
        <h2 className="fw-bolder mb-3 text-white" style={{ fontSize: '2.5rem', lineHeight: '1.25', letterSpacing: '-0.03em' }}>
          Welcome to MedFusion AI — <span style={{ background: 'linear-gradient(135deg, #00f5d4 0%, #00bfff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>Next-Generation Health Intelligence</span>
        </h2>
        <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '820px', fontSize: '1.08rem', lineHeight: '1.65', opacity: 0.9 }}>
          Empower your healthcare journey with secure, real-time predictive analytics. MedFusion AI integrates clinical diagnostics, pathology scans, and biometric telemetry to deliver personalised disease risk assessments and custom daily wellness pathways.
        </p>
        <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap mt-2">
          <Link
            to="/dashboard"
            className="btn-clinical primary w-auto-override px-4 py-3 d-inline-flex align-items-center gap-2 font-monospace text-uppercase fw-bold text-decoration-none"
            style={{ fontSize: '0.88rem', letterSpacing: '0.06em', borderRadius: '10px' }}
          >
            ⚡ Check My Health Risk
          </Link>
          <Link
            to="/upload"
            className="px-4 py-3 d-inline-flex align-items-center gap-2 font-monospace text-uppercase fw-bold text-decoration-none"
            style={{
              fontSize: '0.88rem', letterSpacing: '0.06em',
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.85)',
              borderRadius: '10px',
              width: 'auto',
            }}
          >
            🧬 Scan a Report
          </Link>
        </div>
      </div>

      {/* Feature Grid Panel */}
      <div className="row g-4 mt-4">
        {features.map((f, i) => {
          const cardThemes = ['theme-heart', 'theme-diabetes', 'theme-general'];
          return (
            <div className={`col-md-4 ${cardThemes[i]}`} key={i}>
              <motion.div 
                whileHover={{ y: -5 }}
                className="glass-card text-center h-100 p-5"
              >
                <div className="display-4 mb-4">{f.icon}</div>
                <h3 className="fw-bold mb-3" style={{ fontSize: '1.25rem' }}>{f.title}</h3>
                <p className="text-secondary mb-0" style={{ fontSize: '0.88rem' }}>{f.desc}</p>
              </motion.div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default Landing;
