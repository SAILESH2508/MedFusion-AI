import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
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
        <div style={{ ...styles.card, borderColor: 'rgba(255,60,60,0.4)' }}>
          <div style={styles.errorBadge}>⚠ NOT FOUND</div>
          <p style={{ color: '#ff6b6b', fontFamily: 'monospace', textAlign: 'center', marginTop: '1rem' }}>
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
          <span style={styles.emergencyIcon}>🚨</span>
          EMERGENCY MEDICAL INFORMATION
        </div>

        {/* Patient name */}
        <div style={styles.section}>
          <span style={styles.label}>PATIENT NAME</span>
          <span style={styles.valueLarge}>{data.patient_name || 'Unknown'}</span>
        </div>

        {/* Vault ID */}
        <div style={styles.section}>
          <span style={styles.label}>MEDFUSION VAULT ID</span>
          <span style={styles.valueAccent}>{data.vault_id || 'N/A'}</span>
        </div>

        {/* Blood group */}
        <div style={styles.section}>
          <span style={styles.label}>BLOOD GROUP</span>
          <span style={{ ...styles.valueLarge, color: '#ff6b6b', fontSize: '2rem' }}>
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
          <span style={{ ...styles.valueLarge, color: '#4fc3f7' }}>
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
          ⚕ This card is for emergency reference only. Always consult a qualified healthcare provider.
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
    background: '#0a0a14',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    fontFamily: 'monospace',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '480px',
    width: '100%',
    backdropFilter: 'blur(12px)',
  },
  brandRow: {
    textAlign: 'center',
    marginBottom: '1rem',
    letterSpacing: '0.02em',
  },
  brandBlue: {
    color: '#4fc3f7',
    fontWeight: 900,
    fontSize: '1.4rem',
  },
  brandOrange: {
    color: '#ff9f43',
    fontWeight: 900,
    fontSize: '1.4rem',
    marginLeft: '2px',
  },
  brandSub: {
    display: 'block',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.72rem',
    letterSpacing: '0.12em',
    marginTop: '2px',
  },
  emergencyHeader: {
    background: 'rgba(255,50,50,0.12)',
    border: '1px solid rgba(255,50,50,0.35)',
    borderRadius: '8px',
    color: '#ff6b6b',
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
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.62rem',
    letterSpacing: '0.08em',
    marginBottom: '4px',
  },
  valueLarge: {
    display: 'block',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '1.15rem',
  },
  valueAccent: {
    display: 'block',
    color: '#00f5d4',
    fontWeight: 700,
    fontSize: '1rem',
  },
  valueSecondary: {
    display: 'block',
    color: 'rgba(255,255,255,0.4)',
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
    background: 'rgba(255,60,60,0.12)',
    border: '1px solid rgba(255,60,60,0.35)',
    color: '#ff6b6b',
    borderRadius: '20px',
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
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '6px',
    padding: '5px 10px',
  },
  medName: {
    color: '#e0e0e0',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  medDosage: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.76rem',
  },
  divider: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    margin: '1.25rem 0',
  },
  disclaimer: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.7rem',
    lineHeight: '1.55',
    textAlign: 'center',
    margin: 0,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  },
  errorBadge: {
    background: 'rgba(255,60,60,0.12)',
    border: '1px solid rgba(255,60,60,0.35)',
    color: '#ff6b6b',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: '0.85rem',
    letterSpacing: '0.06em',
  },
};

export default EmergencyCard;
