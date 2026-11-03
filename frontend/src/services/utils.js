export const INTERACTIONS = [
  { drug1: 'aspirin', drug2: 'warfarin', warning: 'Aspirin + Warfarin increases risk of severe bleeding.' },
  { drug1: 'aspirin', drug2: 'ibuprofen', warning: 'Aspirin + Ibuprofen can reduce the cardioprotective effects of aspirin.' },
  { drug1: 'lisinopril', drug2: 'spironolactone', warning: 'Lisinopril + Spironolactone can lead to dangerously high blood potassium levels (hyperkalemia).' },
  { drug1: 'metformin', drug2: 'contrast dye', warning: 'Metformin + Contrast Dye increases the risk of lactic acidosis (renal clearance warning).' },
  { drug1: 'atorvastatin', drug2: 'clarithromycin', warning: 'Atorvastatin + Clarithromycin increases the risk of muscle toxicity (rhabdomyolysis).' },
];

export const getAge = (dobString) => {
  try {
    const birth = new Date(dobString);
    const birthYear = birth.getFullYear();
    if (isNaN(birthYear)) return 35;
    return new Date().getFullYear() - birthYear;
  } catch (e) {
    return 35;
  }
};

export const getInitials = (name, email) => {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) return email.substring(0, 2).toUpperCase();
  return 'US';
};

export const getRiskColor = (level) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL': return 'var(--status-danger)';
    case 'HIGH': return 'var(--status-danger)';
    case 'MODERATE': return 'var(--status-warning)';
    default: return 'var(--status-normal)';
  }
};

export const getRiskBg = (level) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL': return 'var(--status-danger-bg)';
    case 'HIGH': return 'var(--status-danger-bg)';
    case 'MODERATE': return 'var(--status-warning-bg)';
    default: return 'var(--status-normal-bg)';
  }
};

let hasShownGuestPopup = false;
export const getHasShownGuestPopup = () => hasShownGuestPopup;
export const setHasShownGuestPopup = (val) => {
  hasShownGuestPopup = val;
};
export const formatProvenance = (provenance) => {
  if (!provenance) return 'EHR Synced';

  const known = {
    clinical_lab_ehr: 'Clinical Lab EHR',
    clinical_lab_ebr: 'Clinical Lab EHR',
    clinical_lab_portal: 'Clinical Lab Portal',
    pathology_report_extraction: 'Pathology Lab Report',
    pathology_report: 'Pathology Report',
    clinical_triage: 'Clinical Triage',
    patient_entered: 'Patient Reported',
    ehr: 'Verified EHR',
    lab_validated: 'Lab Validated',
    vital_signs_stream: 'Vital Signs Monitor',
    uci_machine_learning_repository: 'UCI Machine Learning Repository',
  };

  const key = String(provenance).toLowerCase().trim();
  if (known[key]) return known[key];

  // Convert snake_case or raw identifier to clean Title Case
  return String(provenance)
    .replace(/[_-]+/g, ' ')
    .replace(/\bebr\b/gi, 'EHR')
    .replace(/\behr\b/gi, 'EHR')
    .replace(/\buci\b/gi, 'UCI')
    .replace(/\bml\b/gi, 'ML')
    .replace(/\bai\b/gi, 'AI')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .trim();
};

