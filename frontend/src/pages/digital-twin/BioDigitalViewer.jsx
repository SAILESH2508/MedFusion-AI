/**
 * BioDigitalViewer.jsx — BioDigital Human Interactive 3D Cloud Integration
 *
 * Integrates the BioDigital Human cloud-based interactive 3D anatomy platform
 * for clinical-grade anatomical exploration, dissection, and pathology layers.
 * 
 * Supports:
 *  - Organ-specific deep-linking (Heart, Lungs, Liver, Kidneys, Brain)
 *  - Custom BioDigital Enterprise Model ID configuration
 *  - Interactive dissection & layer toggling
 */

import React, { useState, useMemo } from 'react';
import { ExternalLink, Settings, Sparkles, Shield, RefreshCw, Globe, X } from 'lucide-react';

// Preset standard curated BioDigital anatomical models and deep-link parameters
const BIODIGITAL_MODELS = {
  heart: {
    title: 'Cardiovascular & Coronary Circulation',
    modelId: 'production/maleAdult/cardiovascular_system',
    fallbackQuery: 'heart+cardiovascular',
    description: 'Detailed 4-chamber cardiac view with coronary arteries, cardiac conduction system, and great vessels.',
  },
  lungs: {
    title: 'Respiratory System & Bronchial Tree',
    modelId: 'production/maleAdult/respiratory_system',
    fallbackQuery: 'lungs+respiratory',
    description: 'Bilateral lung lobes, trachea, primary and secondary bronchi, and alveolar micro-capillary interface.',
  },
  liver: {
    title: 'Digestive & Hepato-Biliary System',
    modelId: 'production/maleAdult/digestive_system',
    fallbackQuery: 'liver+digestive',
    description: 'Hepatic lobes, portal venous system, gallbladder, and biliary drainage networks.',
  },
  kidneys: {
    title: 'Urinary System & Renal Microvasculature',
    modelId: 'production/maleAdult/urinary_system',
    fallbackQuery: 'kidneys+urinary',
    description: 'Renal cortex, pyramids, renal pelvis, ureters, and suprarenal adrenal gland interface.',
  },
  brain: {
    title: 'Central Nervous System & Brainstem',
    modelId: 'production/maleAdult/nervous_system',
    fallbackQuery: 'brain+nervous',
    description: 'Cerebral cortex gyri/sulci, ventricular system, cerebellum, brainstem, and cranial nerves.',
  },
};

export default function BioDigitalViewer({ selectedOrgan = 'heart', onOrganSelect }) {
  const [customModelId, setCustomModelId] = useState('');
  const [developerKey, setDeveloperKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const activeOrganKey = (selectedOrgan || 'heart').toLowerCase();
  const organConfig = BIODIGITAL_MODELS[activeOrganKey] || BIODIGITAL_MODELS.heart;

  // Build BioDigital iframe URL
  const iframeSrc = useMemo(() => {
    const baseUrl = 'https://human.biodigital.com/widget/';
    const params = new URLSearchParams({
      be: customModelId || organConfig.modelId,
      ui_tools: 'true',
      ui_dissect: 'true',
      ui_isolate: 'true',
      ui_xray: 'true',
      ui_cross_sections: 'true',
      ui_info: 'true',
      ui_nav: 'true',
      background: '000814',
      theme: 'dark',
    });

    if (developerKey) {
      params.append('dk', developerKey);
    }

    return `${baseUrl}?${params.toString()}`;
  }, [customModelId, organConfig.modelId, developerKey]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-nav)' }}>
      
      {/* Top Banner Control Bar — placed below the main view mode switcher */}
      <div style={{
        position: 'absolute',
        top: '56px',
        left: '12px',
        right: '12px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '6px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={15} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                BioDigital Human™ Cloud
              </span>
              <span style={{ fontSize: '0.55rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)', fontFamily: 'monospace' }}>
                Clinical Grade
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
              {organConfig.title}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setIframeKey(k => k + 1)}
            title="Reload Viewer"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RefreshCw size={11} />
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            title="Configure BioDigital API / Model"
            style={{
              background: showConfig ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: 'var(--accent-cyan)',
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
            <Settings size={11} />
            <span>Config</span>
          </button>

          <a
            href="https://www.biodigital.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="Learn about BioDigital Licensing"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Configuration Drawer */}
      {showConfig && (
        <div style={{
          position: 'absolute',
          top: '98px',
          left: '12px',
          right: '12px',
          zIndex: 15,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '12px 14px',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
              BioDigital Enterprise API Integration
            </span>
            <button
              onClick={() => setShowConfig(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px', lineHeight: 1.4 }}>
            Institutions with an active BioDigital Human Developer subscription can supply their developer API key and enterprise custom model identifier below.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.58rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>
                Custom Model Bookmark / ID
              </label>
              <input
                type="text"
                placeholder={organConfig.modelId}
                value={customModelId}
                onChange={e => setCustomModelId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  padding: '4px 8px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.58rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>
                Developer Key (DK)
              </label>
              <input
                type="password"
                placeholder="Optional BioDigital API key"
                value={developerKey}
                onChange={e => setDeveloperKey(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  padding: '4px 8px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            <button
              onClick={() => { setCustomModelId(''); setDeveloperKey(''); }}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', padding: '3px 10px', borderRadius: '4px', fontSize: '0.62rem', cursor: 'pointer' }}
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => { setShowConfig(false); setIframeKey(k => k + 1); }}
              style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: 'var(--accent-cyan)', padding: '3px 12px', borderRadius: '4px', fontSize: '0.62rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Apply & Reload
            </button>
          </div>
        </div>
      )}

      {/* Embedded BioDigital Human Interactive Iframe */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', paddingTop: '98px', boxSizing: 'border-box' }}>
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
            background: 'var(--bg-nav)',
          }}
        />
      </div>

      {/* Bottom Footer Attribution */}
      <div style={{
        position: 'absolute',
        bottom: '6px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.55rem',
        fontFamily: 'monospace',
        color: 'rgba(255,255,255,0.3)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        letterSpacing: '0.04em',
      }}>
        Powered by BioDigital Human™ Platform · Licensed Clinical 3D Anatomical Anatomy
      </div>
    </div>
  );
}

