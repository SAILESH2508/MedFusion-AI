/**
 * TwinModulesDrawer.jsx — Health Twin Modules Slide-In Drawer
 * MedFusion AI
 *
 * Provides access to all secondary Health Twin features through a clean
 * categorized drawer panel, keeping the main anatomy viewer uncluttered.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ClipboardList, Activity, Shield, BarChart2, Map, User, Database, Heart, Wind, FlaskConical, Droplet, Brain as BrainIcon } from 'lucide-react';
import OrganInfoPanel from './OrganInfoPanel';
import HealthTimeline from './HealthTimeline';
import MedicationSafetyPanel from './MedicationSafetyPanel';
import ModelProvenancePanel from './ModelProvenancePanel';
import HealthChangeExplorer from './HealthChangeExplorer';

const MODULES = [
  {
    id: 'clinical',
    label: 'Clinical Records',
    icon: <ClipboardList size={15} />,
    color: '#38bdf8',
    description: 'Diagnoses, biomarkers, lab reports',
  },
  {
    id: 'assessment',
    label: 'Health Assessment',
    icon: <Activity size={15} />,
    color: '#f97316',
    description: 'Risk scores, organ health insights',
  },
  {
    id: 'safety',
    label: 'Medication Safety',
    icon: <Shield size={15} />,
    color: '#10b981',
    description: 'Drug interactions, prescriptions',
  },
  {
    id: 'timeline',
    label: 'Medical Timeline',
    icon: <BarChart2 size={15} />,
    color: '#a78bfa',
    description: 'Biomarker trends, health history',
  },
  {
    id: 'provenance',
    label: 'ML Model Registry',
    icon: <Database size={15} />,
    color: '#94a3b8',
    description: 'Dataset provenance, model metrics',
  },
];

export default function TwinModulesDrawer({
  open,
  onClose,
  selectedOrgan,
  onOrganSelect,
  patientData,
  organData,
  loadingOrgan,
}) {
  const [activeModule, setActiveModule] = useState(null);
  const drawerRef = useRef();

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Trap body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const selectedModule = MODULES.find(m => m.id === activeModule);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 300,
          background: 'rgba(4,13,26,0.65)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 301,
          width: '100%',
          maxWidth: activeModule ? '640px' : '380px',
          background: 'var(--bg-card, #0b1526)',
          borderLeft: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1), max-width 0.22s ease',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Drawer Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeModule && (
              <button
                onClick={() => setActiveModule(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
              </button>
            )}
            <div>
              {activeModule ? (
                <>
                  <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                    Health Twin Modules
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedModule?.label}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                    Health Twin
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Modules
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Selected organ context strip (when a module is open) */}
        {activeModule && selectedOrgan && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            background: 'rgba(244,149,74,0.06)',
            borderBottom: '1px solid rgba(244,149,74,0.15)',
            flexShrink: 0,
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-orange)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Viewing:
            </span>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-orange)', textTransform: 'uppercase' }}>
              {selectedOrgan}
            </span>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!activeModule ? (
            /* Module Navigation List */
            <div style={{ padding: '12px' }}>
              {/* Patient identity */}
              {patientData?.profile && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  marginBottom: '12px',
                  background: 'rgba(244,149,74,0.06)',
                  border: '1px solid rgba(244,149,74,0.15)',
                  borderRadius: '10px',
                }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f97316, #ec4899)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}>
                    {(patientData.profile.full_name || patientData.profile.name || 'PT').substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.62rem', color: 'var(--brand-orange)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.06em' }}>Patient</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', lineHeight: 1.2 }}>
                      {patientData.profile.full_name || patientData.profile.name || 'Patient'}
                    </span>
                  </div>
                  {(patientData.profile.blood_group || patientData.profile.blood_type) && (
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>
                      {patientData.profile.blood_group || patientData.profile.blood_type}
                    </span>
                  )}
                </div>
              )}

              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '10px', padding: '0 4px' }}>
                SELECT A MODULE
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {MODULES.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModule(mod.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '11px 14px',
                      background: 'transparent',
                      border: '1px solid var(--border-color, rgba(255,255,255,0.07))',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.14s ease',
                      width: '100%',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '9px',
                      background: `${mod.color}14`,
                      border: `1px solid ${mod.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: mod.color, flexShrink: 0,
                    }}>
                      {mod.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', lineHeight: 1.25 }}>{mod.label}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', lineHeight: 1.3 }}>{mod.description}</span>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>

              {/* Return to viewer hint */}
              <div style={{
                marginTop: '16px',
                padding: '10px 12px',
                background: 'rgba(56,189,248,0.04)',
                border: '1px solid rgba(56,189,248,0.12)',
                borderRadius: '8px',
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}>
                Press <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '1px 5px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>Esc</kbd> or click outside to close and return to the anatomy viewer.
              </div>
            </div>
          ) : (
            /* Module Content */
            <div style={{ padding: '16px 20px' }}>
              <ModuleContent
                moduleId={activeModule}
                selectedOrgan={selectedOrgan}
                onOrganSelect={onOrganSelect}
                patientData={patientData}
                organData={organData}
                loadingOrgan={loadingOrgan}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ModuleContent({ moduleId, selectedOrgan, onOrganSelect, patientData, organData, loadingOrgan }) {
  switch (moduleId) {
    case 'clinical':
      return (
        <OrganInfoPanel
          selectedOrgan={selectedOrgan}
          organData={organData}
          loading={loadingOrgan}
        />
      );

    case 'assessment':
      return (
        <HealthChangeExplorer
          patientData={patientData}
        />
      );

    case 'safety':
      return (
        <MedicationSafetyPanel
          patientData={patientData}
        />
      );

    case 'timeline':
      return (
        <HealthTimeline
          patientData={patientData}
          selectedOrgan={selectedOrgan}
          loading={false}
        />
      );

    case 'provenance':
      return <ModelProvenancePanel />;

    default:
      return null;
  }
}
