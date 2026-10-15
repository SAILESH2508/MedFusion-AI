import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

function EmergencyCard() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No emergency token provided.');
      setLoading(false);
      return;
    }

    // Use plain axios — no JWT required for public emergency endpoint
    axios
      .get(`${API_BASE_URL}/emergency/${token}/`)
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        if (err.response && err.response.status === 404) {
          setError('Emergency card not found. The QR code may have been revoked or is invalid.');
        } else {
          setError('Unable to load the emergency card. Please check your connection and try again.');
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.loadingText}>Loading emergency medical card...</p>
        </div>
      </div>
    );
  }

  // ── Error / Not Found ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, borderColor: 'var(--accent-red)' }}>
          <div style={styles.errorBadge}>NOT FOUND</div>
          <p style={{ color: 'var(--accent-red)', fontFamily: 'monospace', textAlign: 'center', marginTop: '1rem' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // ── Card display ───────────────────────────────────────────────────────────
  const allergies = Array.isArray(data.allergies) ? data.allergies : [];
  const activeMeds = Array.isArray(data.active_meds) ? data.active_meds : [];

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Branding */}
        <div style={styles.brandRow}>
          <span style={styles.brandBlue}>MEDFUSION</span>
          <span style={styles.brandOrange}>AI</span>
          <span style={styles.brandSub}>Emergency Medical Card</span>
        </div>

        {/* Emergency header */}
        <div style={styles.emergencyHeader}>
          <ShieldAlert size={16} style={{ marginRight: '6px', flexShrink: 0 }} />
          EMERGENCY MEDICAL INFORMATION
        </div>

        {/* Patient name */}
        <div style={styles.section}>
          <span style={styles.label}>PATIENT NAME</span>
          <span style={styles.valueLarge}>{data.name || 'Unknown'}</span>
        </div>

        {/* Vault ID */}
        <div style={styles.section}>
          <span style={styles.label}>MEDFUSION VAULT ID</span>
          <span style={styles.valueAccent}>{data.vault_id || 'N/A'}</span>
        </div>

        {/* Blood group */}
        <div style={styles.section}>
          <span style={styles.label}>BLOOD GROUP</span>
          <span style={{ ...styles.valueLarge, color: 'var(--accent-red)', fontSize: '2rem' }}>
            {data.blood_group || 'Unknown'}
          </span>
        </div>

        {/* Allergies */}
        <div style={styles.section}>
          <span style={styles.label}>KNOWN ALLERGIES</span>
          {allergies.length > 0 ? (
            <div style={styles.badgeRow}>
              {allergies.map((a, i) => (
                <span key={i} style={styles.allergyBadge}>{a}</span>
              ))}
            </div>
          ) : (
            <span style={styles.valueSecondary}>No known allergies on record</span>
          )}
        </div>

        {/* Active medications */}
        <div style={styles.section}>
          <span style={styles.label}>ACTIVE MEDICATIONS</span>
          {activeMeds.length > 0 ? (
            <div style={styles.medList}>
              {activeMeds.map((med, i) => (
                <div key={i} style={styles.medItem}>
                  <span style={styles.medName}>{med.name}</span>
                  {med.dosage && (
                    <span style={styles.medDosage}>{med.dosage}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span style={styles.valueSecondary}>No active medications on record</span>
          )}
        </div>

        {/* Emergency contact */}
        <div style={styles.section}>
          <span style={styles.label}>EMERGENCY CONTACT</span>
          <span style={{ ...styles.valueLarge, color: 'var(--primary-accent)' }}>
            {data.emergency_contact || 'Not provided'}
          </span>
        </div>

        {/* Last updated */}
        <div style={styles.section}>
          <span style={styles.label}>LAST UPDATED</span>
          <span style={styles.valueSecondary}>{data.last_updated || '—'}</span>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Disclaimer */}
        <p style={styles.disclaimer}>
          This card is for emergency reference only. Always consult a qualified healthcare provider.
          Information reflects the patient's last recorded profile update.
        </p>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Inline styles so the page is self-contained and works without the app CSS
const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-main, #193C32)',
    backgroundImage: 'linear-gradient(to right, var(--grid-color, rgba(195, 219, 195, 0.15)) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-color, rgba(195, 219, 195, 0.15)) 1px, transparent 1px)',
    backgroundSize: '30px 30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    fontFamily: 'monospace',
  },
  card: {
    background: 'var(--bg-card, #294F41)',
    border: '1px solid var(--border-color, #3E6250)',
    borderRadius: '10px',
    padding: '2rem',
    maxWidth: '480px',
    width: '100%',
    boxShadow: 'var(--card-shadow, 0 1px 3px rgba(0,0,0,0.25))',
  },
  brandRow: {
    textAlign: 'center',
    marginBottom: '1rem',
    letterSpacing: '0.02em',
  },
  brandBlue: {
    color: 'var(--text-primary, #EDF2E8)',
    fontWeight: 800,
    fontSize: '1.35rem',
  },
  brandOrange: {
    color: 'var(--primary-accent, #83B394)',
    fontWeight: 800,
    fontSize: '1.35rem',
    marginLeft: '2px',
  },
  brandSub: {
    display: 'block',
    color: 'var(--text-secondary, #C0D0C1)',
    fontSize: '0.72rem',
    letterSpacing: '0.12em',
    marginTop: '2px',
  },
  emergencyHeader: {
    background: 'rgba(185, 28, 28, 0.15)',
    border: '1px solid var(--accent-red, #991B1B)',
    borderRadius: '8px',
    color: 'var(--accent-red, #FCA5A5)',
    fontWeight: 700,
    fontSize: '0.85rem',
    letterSpacing: '0.06em',
    padding: '0.65rem 1rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  emergencyIcon: {
    marginRight: '0.5rem',
  },
  section: {
    marginBottom: '1.1rem',
  },
  label: {
    display: 'block',
    color: 'var(--text-muted, #8FA892)',
    fontSize: '0.65rem',
    letterSpacing: '0.08em',
    marginBottom: '4px',
    textTransform: 'uppercase',
  },
  valueLarge: {
    display: 'block',
    color: 'var(--text-primary, #EDF2E8)',
    fontWeight: 700,
    fontSize: '1.15rem',
  },
  valueAccent: {
    display: 'block',
    color: 'var(--primary-accent, #83B394)',
    fontWeight: 700,
    fontSize: '1rem',
  },
  valueSecondary: {
    display: 'block',
    color: 'var(--text-secondary, #C0D0C1)',
    fontSize: '0.88rem',
    fontStyle: 'italic',
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '4px',
  },
  allergyBadge: {
    background: 'rgba(185, 28, 28, 0.12)',
    border: '1px solid var(--accent-red, #991B1B)',
    color: 'var(--accent-red, #FCA5A5)',
    borderRadius: '6px',
    padding: '3px 10px',
    fontSize: '0.76rem',
    fontWeight: 700,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  },
  medList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '4px',
  },
  medItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--bg-upload, #244A3D)',
    border: '1px solid var(--border-color, #3E6250)',
    borderRadius: '6px',
    padding: '6px 12px',
  },
  medName: {
    color: 'var(--text-primary, #EDF2E8)',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  medDosage: {
    color: 'var(--text-secondary, #C0D0C1)',
    fontSize: '0.76rem',
  },
  divider: {
    borderTop: '1px solid var(--border-color, #3E6250)',
    margin: '1.25rem 0',
  },
  disclaimer: {
    color: 'var(--text-muted, #8FA892)',
    fontSize: '0.7rem',
    lineHeight: '1.55',
    textAlign: 'center',
    margin: 0,
  },
  loadingText: {
    color: 'var(--text-secondary, #C0D0C1)',
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  },
  errorBadge: {
    background: 'rgba(185, 28, 28, 0.15)',
    border: '1px solid var(--accent-red, #991B1B)',
    color: 'var(--accent-red, #FCA5A5)',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: '0.85rem',
    letterSpacing: '0.06em',
  },
};

export default EmergencyCard;
