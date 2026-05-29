import { motion } from 'framer-motion';

function Landing() {
  const features = [
    { icon: "🔮", title: "AI Health Risk Predictor", desc: "Checks your risk level for heart conditions, diabetes, and cancer using advanced medical AI." },
    { icon: "🌱", title: "Easy Daily Health Plans", desc: "Provides custom lifestyle changes, food guides, and active next steps to keep you healthy." },
    { icon: "🧬", title: "Smart Prescription Scanner", desc: "Lets you upload written prescriptions and lab results to import your health details instantly." }
  ];

  return (
    <div className="reveal" style={{ marginTop: '-1.25rem', paddingBottom: '32px', maxHeight: 'calc(100vh - 80px)', overflow: 'hidden' }}>
      
      {/* Hero Header Panel - Redesigned with premium clinical copy */}
      <div className="glass-card text-center p-5 mb-4" style={{ 
        borderRadius: '16px', 
        border: '1px solid rgba(255, 255, 255, 0.09)', 
        background: 'linear-gradient(135deg, rgba(0, 8, 84, 0.4) 0%, rgba(0, 3, 40, 0.6) 100%)', 
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.07)'
      }}>
        <h2 className="fw-bolder mb-3 text-white" style={{ fontSize: '2.5rem', lineHeight: '1.25', letterSpacing: '-0.03em' }}>
          Welcome to MedFusion AI — <span style={{ background: 'linear-gradient(135deg, #00f5d4 0%, #00bfff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>Next-Generation Health Intelligence</span>
        </h2>
        
        <p className="text-secondary mx-auto mb-0" style={{ maxWidth: '820px', fontSize: '1.08rem', lineHeight: '1.65', opacity: 0.9 }}>
          Empower your healthcare journey with secure, real-time predictive analytics. MedFusion AI integrates clinical diagnostics, pathology scans, and biometric telemetry to deliver personalized disease risk assessments and custom daily wellness pathways.
        </p>
      </div>

      {/* Feature Grid Panel */}
      <div className="row g-4 mt-2">
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
