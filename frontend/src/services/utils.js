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
    case 'CRITICAL': return '#ff0055'; // Vibrant Pink Red
    case 'HIGH': return '#ff8c00';     // Amber Orange
    case 'MODERATE': return '#ffd700'; // Pure Yellow
    default: return '#00f5d4';         // Neon Mint Green
  }
};

export const getRiskBg = (level) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL': return 'rgba(255, 0, 85, 0.2)';
    case 'HIGH': return 'rgba(255, 140, 0, 0.2)';
    case 'MODERATE': return 'rgba(255, 215, 0, 0.2)';
    default: return 'rgba(0, 245, 212, 0.2)';
  }
};

let hasShownGuestPopup = false;
export const getHasShownGuestPopup = () => hasShownGuestPopup;
export const setHasShownGuestPopup = (val) => {
  hasShownGuestPopup = val;
};
