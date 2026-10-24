/**
 * BioDigitalViewer.jsx — BioDigital Human Interactive 3D Cloud Integration & Clinical Fallback
 *
 * Integrates the BioDigital Human cloud-based interactive 3D anatomy platform
 * with an intelligent clinical architecture fallback when institutional API keys
 * are not present, avoiding broken third-party authentication screens.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ExternalLink,
  Settings,
  Shield,
  RefreshCw,
  Globe,
  X,
  Cpu,
  Layers,
  Heart,
  Wind,
  FlaskConical,
  Droplet,
  Brain as BrainIcon,
  Activity,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const BIODIGITAL_MODELS = {
  heart: {
    name: 'Heart',
    title: 'Cardiovascular & Coronary Circulation',
    modelId: 'production/maleAdult/cardiovascular_system',
    fallbackQuery: 'heart+cardiovascular',
    description: 'Detailed 4-chamber cardiac view with coronary arterial arcade, cardiac conduction system (SA/AV nodes), and great vessels (aorta, vena cava, pulmonary trunk).',
    landmarks: ['Left & Right Ventricles', 'Ascending Aorta & Arch', 'Left Anterior Descending (LAD)', 'Sinoatrial Node', 'Pulmonary Arteries & Veins'],
    clinicalFocus: 'Coronary Artery Disease, Myocardial Infarction, Arrhythmias, Valvular Stenosis',
    color: '#EF4444',
    icon: <Heart size={16} color="#EF4444" />,
  },
  lungs: {
    name: 'Lungs',
    title: 'Respiratory System & Bronchial Tree',
    modelId: 'production/maleAdult/respiratory_system',
    fallbackQuery: 'lungs+respiratory',
    description: 'Bilateral lung lobes, trachea, primary and secondary bronchi, and alveolar micro-capillary gas exchange interface.',
    landmarks: ['Right Superior/Middle/Inferior Lobes', 'Left Bilateral Lobes & Cardiac Notch', 'Carina & Bronchial Bifurcation', 'Visceral Pleura'],
    clinicalFocus: 'COPD, Acute Pneumonia, Pulmonary Embolism, SpO2 Oxygenation Efficiency',
    color: '#38BDF8',
    icon: <Wind size={16} color="#38BDF8" />,
  },
  liver: {
    name: 'Liver',
    title: 'Digestive & Hepato-Biliary System',
    modelId: 'production/maleAdult/digestive_system',
    fallbackQuery: 'liver+digestive',
    description: 'Hepatic lobes, portal venous system, gallbladder, cystic duct, and biliary drainage networks executing endogenous filtration and metabolism.',
    landmarks: ['Right & Left Hepatic Lobes', 'Hepatic Portal Vein', 'Gallbladder & Cystic Duct', 'Inferior Vena Cava Fossa'],
    clinicalFocus: 'Cirrhosis, Non-Alcoholic Fatty Liver (NAFLD), ALT/AST Elevation, Bile Synthesis',
    color: '#F97316',
    icon: <FlaskConical size={16} color="#F97316" />,
  },
  stomach: {
    name: 'Stomach',
    title: 'Gastric Anatomy & Digestive Reservoir',
    modelId: 'production/maleAdult/digestive_system',
    fallbackQuery: 'stomach+gastric',
    description: 'Muscular gastric body, fundus, rugae mucosal folds, pyloric sphincter, and gastric vascular arterial arcade regulating acid chyme production.',
    landmarks: ['Gastric Fundus & Body', 'Pyloric Antrum & Sphincter', 'Rugae Mucosal Folds', 'Greater & Lesser Curvatures'],
    clinicalFocus: 'Peptic Ulcers, Gastritis, Acid Reflux (GERD), Intrinsic Factor Synthesis',
    color: '#FBBF24',
    icon: <FlaskConical size={16} color="#FBBF24" />,
  },
  pancreas: {
    name: 'Pancreas',
    title: 'Endocrine Pancreas & Duodenal Complex',
    modelId: 'production/maleAdult/endocrine_system',
    fallbackQuery: 'pancreas+endocrine',
    description: 'Pancreatic ductal system (Duct of Wirsung), islets of Langerhans network (beta-cell insulin secretion), duodenal loop, and ampulla of Vater.',
    landmarks: ['Head, Neck, Body & Tail', 'Main Pancreatic Duct', 'Islets of Langerhans (Beta Cells)', 'Duodenal C-Loop Interface'],
    clinicalFocus: 'Type 1 & Type 2 Diabetes, Acute/Chronic Pancreatitis, HbA1c Dysregulation',
    color: '#EC4899',
    icon: <Activity size={16} color="#EC4899" />,
  },
  kidneys: {
    name: 'Kidneys',
    title: 'Urinary System & Renal Microvasculature',
    modelId: 'production/maleAdult/urinary_system',
    fallbackQuery: 'kidneys+urinary',
    description: 'Renal cortex, medullary pyramids, renal pelvis, nephron filtration networks, ureters, and suprarenal adrenal gland hormonal interface.',
    landmarks: ['Renal Cortex & Glomeruli', 'Medullary Pyramids', 'Renal Pelvis & Ureter', 'Adrenal (Suprarenal) Gland'],
    clinicalFocus: 'Chronic Kidney Disease (CKD), eGFR & Creatinine Clearance, Hypertension',
    color: '#FB7185',
    icon: <Droplet size={16} color="#FB7185" />,
  },
  intestines: {
    name: 'Intestines',
    title: 'Gastrointestinal Tract & Enteric Bowel',
    modelId: 'production/maleAdult/digestive_system',
    fallbackQuery: 'intestines+colon',
    description: 'Duodenum, jejunum, ileum loops, ascending/transverse/descending colon, cecum, and mesenteric vascular supply governing microbiome symbiosis.',
    landmarks: ['Small Intestine (Duodenum/Jejunum/Ileum)', 'Ascending & Transverse Colon', 'Descending & Sigmoid Colon', 'Superior Mesenteric Artery'],
    clinicalFocus: 'Inflammatory Bowel Disease (IBD), Nutrient & Water Absorption, Microbiome Flora',
    color: '#10B981',
    icon: <Wind size={16} color="#10B981" />,
  },
  brain: {
    name: 'Brain',
    title: 'Central Nervous System & Brainstem',
    modelId: 'production/maleAdult/nervous_system',
    fallbackQuery: 'brain+nervous',
    description: 'Cerebral cortex gyri/sulci, Circle of Willis cerebral arterial network, ventricular CSF system, cerebellum, and autonomic brainstem.',
    landmarks: ['Cerebral Hemispheres & Frontal Lobe', 'Circle of Willis Arterial Ring', 'Cerebellum & Arbor Vitae', 'Brainstem (Pons & Medulla)'],
    clinicalFocus: 'Cerebrovascular Accident (Stroke), Neurovascular Balance, Cognitive Processing',
    color: '#A78BFA',
    icon: <BrainIcon size={16} color="#A78BFA" />,
  },
};

export default function BioDigitalViewer({ selectedOrgan = 'heart', onOrganSelect, onSwitchTo3D }) {
  const [developerKey, setDeveloperKey] = useState(() => localStorage.getItem('medfusion_biodigital_key') || '');
  const [customModelId, setCustomModelId] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // If developer key exists, allow live cloud embed; otherwise default to Clinical Architecture view
  const [viewMode, setViewMode] = useState(() => (localStorage.getItem('medfusion_biodigital_key') ? 'cloud_iframe' : 'architectural'));

  const activeOrganKey = (selectedOrgan || 'heart').toLowerCase();
  const organConfig = BIODIGITAL_MODELS[activeOrganKey] || BIODIGITAL_MODELS.heart;

  const handleSaveKey = (key) => {
    setDeveloperKey(key);
    if (key.trim()) {
      localStorage.setItem('medfusion_biodigital_key', key.trim());
      setViewMode('cloud_iframe');
    } else {
      localStorage.removeItem('medfusion_biodigital_key');
      setViewMode('architectural');
    }
    setShowConfig(false);
    setIframeKey(k => k + 1);
  };

  // Build BioDigital iframe URL with developer key parameter
  const iframeSrc = useMemo(() => {
    const baseUrl = 'https://human.biodigital.com/widget/';
    const cleanCustomId = customModelId && !customModelId.includes('@') && customModelId.trim().length > 3
      ? customModelId.trim()
      : '';
    const params = new URLSearchParams({
      be: cleanCustomId || organConfig.modelId,
      ui_tools: 'true',
      ui_dissect: 'true',
      ui_isolate: 'true',
      ui_xray: 'true',
      ui_cross_sections: 'true',
      ui_info: 'true',
      ui_nav: 'true',
      background: '06101e',
      theme: 'dark',
    });

    if (developerKey) {
      params.append('dk', developerKey.trim());
    }

    return `${baseUrl}?${params.toString()}`;
  }, [customModelId, organConfig.modelId, developerKey]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#06101e', color: '#FFFFFF', overflow: 'hidden' }}>

      {/* Top Banner Control Bar */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '12px',
        right: '12px',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10, 18, 36, 0.90)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        padding: '6px 12px',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        {/* Title & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={15} style={{ color: 'var(--accent-teal, #38bdf8)', flexShrink: 0 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-teal, #38bdf8)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                BioDigital Human™ Cloud
              </span>
              <span style={{ fontSize: '0.55rem', background: developerKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 149, 74, 0.15)', color: developerKey ? '#34d399' : '#f4954a', padding: '1px 6px', borderRadius: '4px', border: `1px solid ${developerKey ? '#34d39940' : '#f4954a40'}`, fontFamily: 'monospace', fontWeight: 600 }}>
                {developerKey ? 'Enterprise Active' : 'Clinical Bridge'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.64rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
              {organConfig.title}
            </p>
          </div>
        </div>

        {/* View mode toggle & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setViewMode('architectural')}
              style={{
                background: viewMode === 'architectural' ? 'var(--accent-teal, #38bdf8)' : 'transparent',
                color: viewMode === 'architectural' ? '#000000' : 'rgba(255,255,255,0.75)',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '0.62rem',
                fontFamily: 'monospace',
                fontWeight: viewMode === 'architectural' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Clinical Specs
            </button>
            <button
              onClick={() => {
                if (!developerKey) {
                  setShowConfig(true);
                } else {
                  setViewMode('cloud_iframe');
                }
              }}
              style={{
                background: viewMode === 'cloud_iframe' ? 'var(--accent-teal, #38bdf8)' : 'transparent',
                color: viewMode === 'cloud_iframe' ? '#000000' : 'rgba(255,255,255,0.75)',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '0.62rem',
                fontFamily: 'monospace',
                fontWeight: viewMode === 'cloud_iframe' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Cloud Embed (Requires Key)"
            >
              <KeyRound size={10} />
              Cloud Embed (Requires Key)
            </button>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            title="Configure Enterprise Developer Key"
            style={{
              background: showConfig ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--accent-teal, #38bdf8)',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '0.65rem',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Settings size={12} />
            <span>Key</span>
          </button>

          <a
            href={`https://human.biodigital.com/widget/?be=${organConfig.modelId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Model on BioDigital Web Portal"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Configuration Drawer */}
      {showConfig && (
        <div style={{
          position: 'absolute',
          top: '56px',
          left: '12px',
          right: '12px',
          zIndex: 30,
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid var(--accent-teal, #38bdf8)',
          borderRadius: '8px',
          padding: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={15} style={{ color: 'var(--accent-teal, #38bdf8)' }} />
              <span style={{ fontSize: '0.76rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-teal, #38bdf8)', textTransform: 'uppercase' }}>
                BioDigital Human™ Developer API Key Configuration
              </span>
            </div>
            <button
              onClick={() => setShowConfig(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '2px' }}
            >
              <X size={15} />
            </button>
          </div>

          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 12px', lineHeight: 1.45 }}>
            BioDigital Human™ cloud streams require an authorized commercial Developer Key (<code>dk</code>) or domain registration to bypass the third-party iframe embed block. Enter your institution's key below to activate the live cloud player.
          </p>

          {!developerKey && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '6px',
              padding: '8px 10px',
              marginBottom: '10px',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.5,
            }}>
              A BioDigital Developer Key is required. Enter your key below, or switch to{' '}
              <button
                onClick={() => { setShowConfig(false); setViewMode('architectural'); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-teal, #38bdf8)', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700, padding: 0, textDecoration: 'underline' }}
              >
                Clinical Specs view
              </button>.
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="e.g. your_biodigital_developer_key"
              value={developerKey}
              onChange={(e) => setDeveloperKey(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                padding: '6px 10px',
              }}
            />
            <button
              onClick={() => handleSaveKey(developerKey)}
              style={{
                background: 'var(--brand-orange, #f4954a)',
                color: '#000000',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Save Key
            </button>
            {developerKey && (
              <button
                onClick={() => handleSaveKey('')}
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {viewMode === 'architectural' ? (
        /* Clinical Architecture Fallback View (Safe, crisp, informative) */
        <div style={{
          flex: 1,
          padding: '64px 16px 42px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Informational Status Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}>
            <Shield size={18} style={{ color: 'var(--accent-teal, #38bdf8)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, fontFamily: 'monospace', color: '#FFFFFF', letterSpacing: '0.04em' }}>
                  CLINICAL ANATOMY CLOUD BRIDGE
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--brand-orange, #f4954a)', fontFamily: 'monospace' }}>
                  Bookmark: {organConfig.modelId}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}>
                BioDigital Human™ cloud embeds require institutional domain authentication or a Developer Key (<code>dk</code>). Explore the verified clinical architecture model below or jump directly into our interactive 3D WebGL viewer.
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => onSwitchTo3D && onSwitchTo3D()}
              style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(15, 23, 42, 0.6))',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand-orange)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.45)'}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Cpu size={18} style={{ color: 'var(--accent-teal, #38bdf8)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', fontFamily: 'monospace' }}>
                  Launch 3D Health Twin
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.66rem', color: 'rgba(255,255,255,0.65)' }}>
                  Interactive WebGL model with organ isolation & ribcage
                </p>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--accent-teal, #38bdf8)', flexShrink: 0 }} />
            </button>

            <a
              href={`https://human.biodigital.com/widget/?be=${organConfig.modelId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'linear-gradient(135deg, rgba(244, 149, 74, 0.15), rgba(15, 23, 42, 0.6))',
                border: '1px solid rgba(244, 149, 74, 0.45)',
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'left',
                textDecoration: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FFFFFF'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(244, 149, 74, 0.45)'}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(244, 149, 74, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Globe size={18} style={{ color: 'var(--brand-orange, #f4954a)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', fontFamily: 'monospace' }}>
                  Open on BioDigital Web
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.66rem', color: 'rgba(255,255,255,0.65)' }}>
                  View full model in official BioDigital portal (New Tab)
                </p>
              </div>
              <ExternalLink size={14} style={{ color: 'var(--brand-orange, #f4954a)', flexShrink: 0 }} />
            </a>
          </div>

          {/* Organ Clinical Specifications Detail Card */}
          <div style={{
            background: 'rgba(10, 18, 36, 0.85)',
            border: `1px solid ${organConfig.color}40`,
            borderRadius: '10px',
            padding: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', padding: '4px', background: `${organConfig.color}25`, borderRadius: '6px' }}>
                {organConfig.icon}
              </span>
              <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', fontFamily: 'monospace' }}>
                {organConfig.name} — {organConfig.title}
              </h5>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '0.74rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
              {organConfig.description}
            </p>

            {/* Anatomical Landmarks Chips */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Verified Anatomical Landmarks:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {organConfig.landmarks.map((landmark, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: '5px',
                      padding: '2px 8px',
                      fontSize: '0.66rem',
                      fontFamily: 'monospace',
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    {landmark}
                  </span>
                ))}
              </div>
            </div>

            {/* Clinical & Pathology Focus */}
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'var(--brand-orange, #f4954a)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '2px' }}>
                Diagnostic & Clinical Relevance:
              </span>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>
                {organConfig.clinicalFocus}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Live Cloud Iframe Mode */
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', paddingTop: '56px', boxSizing: 'border-box' }}>
          {!developerKey && (
            <div style={{
              position: 'absolute',
              top: '58px',
              left: '12px',
              right: '12px',
              zIndex: 10,
              background: 'rgba(239, 68, 68, 0.92)',
              borderRadius: '6px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.68rem',
              fontFamily: 'monospace',
              color: '#FFFFFF',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} />
                <span>Notice: No developer key supplied. BioDigital may reject unauthenticated requests.</span>
              </div>
              <button
                onClick={() => setViewMode('architectural')}
                style={{ background: '#FFFFFF', color: '#000000', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.62rem', cursor: 'pointer', fontWeight: 700 }}
              >
                Use Clinical Specs View
              </button>
            </div>
          )}
          <iframe
            key={`${iframeKey}-${activeOrganKey}`}
            id="embedded-human"
            title={`BioDigital Human - ${organConfig.title}`}
            src={iframeSrc}
            width="100%"
            height="100%"
            allow="fullscreen; xr-spatial-tracking"
            style={{
              border: 'none',
              width: '100%',
              height: '100%',
              background: '#06101e',
            }}
          />
        </div>
      )}

      {/* Bottom Footer Attribution */}
      <div style={{
        position: 'absolute',
        bottom: '6px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.55rem',
        fontFamily: 'monospace',
        color: 'rgba(255,255,255,0.4)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        letterSpacing: '0.04em',
      }}>
        BioDigital Human™ Integration · Licensed Clinical 3D Anatomy Platform
      </div>
    </div>
  );
}
