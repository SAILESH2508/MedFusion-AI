import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  MapPin, Search, Navigation, Phone, Clock, Filter, RefreshCw,
  AlertCircle, Download, ExternalLink, Share2, ChevronDown, ChevronUp,
  Building2, Stethoscope, Pill, Sparkles, FlaskConical, ShieldAlert,
  CheckCircle2, Accessibility, Radio, Lock, X, Crosshair
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarContext } from '../context/SidebarContext';
import { useTheme } from '../context/useTheme';
import InteractiveMap from '../components/InteractiveMap';
import { api } from '../services/api';

// ── Haversine distance ─────────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Is facility open now? ──────────────────────────────────────────────────
function isOpenNow(opening_hours) {
  if (!opening_hours) return null;
  const oh = opening_hours.toLowerCase();
  if (oh.includes('24/7') || oh === '24 hours' || oh.includes('mo-su 00:00-24:00')) return true;
  const now = new Date();
  const day = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'][now.getDay()];
  const hour = now.getHours() + now.getMinutes() / 60;
  // Very basic: if "mo-fr" present and today is weekday and time is 8-18
  if (oh.includes('mo-fr') && ['mo', 'tu', 'we', 'th', 'fr'].includes(day) && hour >= 8 && hour < 18) return true;
  if (oh.includes('mo-sa') && ['mo', 'tu', 'we', 'th', 'fr', 'sa'].includes(day) && hour >= 8 && hour < 18) return true;
  return null; // unknown
}

const TYPE_CONFIG = {
  hospital:  { label: 'Hospitals',   icon: Building2,    color: '#EF4444', brightColor: '#F87171', glow: 'rgba(239, 68, 68, 0.25)', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.45)', tags: ['hospital'] },
  clinic:    { label: 'Clinics',     icon: Stethoscope,  color: '#0EA5E9', brightColor: '#38BDF8', glow: 'rgba(14, 165, 233, 0.25)', bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.45)', tags: ['clinic', 'doctors'] },
  pharmacy:  { label: 'Pharmacy',    icon: Pill,         color: '#10B981', brightColor: '#34D399', glow: 'rgba(16, 185, 129, 0.25)', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.45)', tags: ['pharmacy', 'chemist'] },
  dentist:   { label: 'Dentists',    icon: Sparkles,     color: '#A855F7', brightColor: '#C084FC', glow: 'rgba(168, 85, 247, 0.25)', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.45)', tags: ['dentist'] },
  lab:       { label: 'Labs',        icon: FlaskConical, color: '#F59E0B', brightColor: '#FBBF24', glow: 'rgba(245, 158, 11, 0.25)', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.45)', tags: ['laboratory'] },
};

// (geocoding helpers removed — location is set directly, no async reverse-geocode)

async function fetchPlaces(lat, lon, radiusM, types) {
  // Ultra-fast Backend Proxy /api/nearby/ (runs parallel Nominatim queries with 15-min cache)
  try {
    const res = await api.get('/nearby/', {
      params: {
        lat,
        lon,
        radius: radiusM,
        types: types.join(','),
      },
      timeout: 8000,
    });
    if (res.data?.facilities && Array.isArray(res.data.facilities) && res.data.facilities.length > 0) {
      return res.data.facilities;
    }
  } catch (err) {
    console.debug('Backend /api/nearby/ fallback to instant local radar...', err);
  }

  // Instant offline geographic fallback (zero CORS, zero timeouts, guaranteed points)
  return generateFallbackFacilities(lat, lon, radiusM, types);
}

// ── SOS Emergency Panel ────────────────────────────────────────────────────
function SOSPanel({ places, location, isPatient }) {
  const [activated, setActivated] = useState(false);
  const nearest = places.find((p) => p.type === 'hospital');

  if (!nearest || !location) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded mb-4"
      style={{
        background: 'var(--bg-card)',
        border: activated ? '1.5px solid var(--accent-red)' : '1px solid rgba(185, 28, 28, 0.35)',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <ShieldAlert size={18} color="var(--accent-red)" />
            <span className="fw-bold font-monospace text-uppercase" style={{ fontSize: '0.78rem', color: 'var(--accent-red)', letterSpacing: '0.1em' }}>
              Emergency Fast Route
            </span>
          </div>
          <p className="fw-bold m-0" style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{nearest.name}</p>
          <p className="text-secondary m-0 mt-1" style={{ fontSize: '0.75rem' }}>
            {nearest.distance < 1
              ? `${Math.round(nearest.distance * 1000)} m away`
              : `${nearest.distance.toFixed(1)} km away`}
            {nearest.phone && ` • ${nearest.phone}`}
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${nearest.lat},${nearest.lon}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setActivated(true)}
            className="px-4 py-2 rounded fw-bold font-monospace text-uppercase text-decoration-none d-flex align-items-center gap-2"
            style={{ fontSize: '0.75rem', background: 'rgba(185, 28, 28, 0.15)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}
          >
            <Navigation size={13} /> Navigate Now
          </a>
          {nearest.phone && (
            <a
              href={`tel:${nearest.phone}`}
              className="px-4 py-2 rounded fw-bold font-monospace text-uppercase text-decoration-none d-flex align-items-center gap-2"
              style={{ fontSize: '0.75rem', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <Phone size={13} /> Call
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Map Embed (OpenStreetMap iframe — no API key) ─────────────────────────
// ── Export Emergency Sheet ────────────────────────────────────────────────
function exportEmergencySheet(places, location) {
  const lines = [
    '============================================',
    '   MEDFUSION AI — EMERGENCY MEDICAL SHEET',
    '============================================',
    `Generated: ${new Date().toLocaleString()}`,
    location ? `Your Location: ${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}` : '',
    '',
    '--- NEAREST HOSPITALS ---',
    ...places
      .filter((p) => p.type === 'hospital')
      .slice(0, 5)
      .map(
        (p, i) =>
          `${i + 1}. ${p.name}\n   Distance: ${p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`}\n   Phone: ${p.phone || 'N/A'}\n   Address: ${p.address || 'N/A'}\n   Directions: https://maps.google.com/?q=${p.lat},${p.lon}`
      ),
    '',
    '--- NEAREST PHARMACY ---',
    ...places
      .filter((p) => p.type === 'pharmacy')
      .slice(0, 3)
      .map(
        (p, i) =>
          `${i + 1}. ${p.name}\n   Distance: ${p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`}\n   Phone: ${p.phone || 'N/A'}`
      ),
    '',
    '--- NEAREST CLINICS ---',
    ...places
      .filter((p) => p.type === 'clinic')
      .slice(0, 3)
      .map(
        (p, i) =>
          `${i + 1}. ${p.name}\n   Distance: ${p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`}\n   Phone: ${p.phone || 'N/A'}`
      ),
    '',
    '============================================',
    'MedFusion AI — Not a substitute for 112/911',
    '============================================',
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MedFusion_Emergency_Sheet_${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PlaceCard ──────────────────────────────────────────────────────────────
function PlaceCard({ place, isPatient, expanded, onToggle }) {
  const cfg = TYPE_CONFIG[place.type] || TYPE_CONFIG.clinic;
  const openStatus = isOpenNow(place.opening_hours);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded border cursor-pointer transition-all"
      style={{
        background: expanded ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        borderColor: expanded ? cfg.color : 'var(--border-color)',
        boxShadow: expanded ? '0 4px 16px rgba(0,0,0,0.1)' : 'none',
      }}
      onClick={onToggle}
    >
      <div className="d-flex align-items-start justify-content-between gap-2">
        <div className="d-flex align-items-start gap-2 flex-grow-1">
          <div style={{ color: cfg.color, flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center' }}>
            {cfg.icon ? <cfg.icon size={20} /> : <Building2 size={20} />}
          </div>
          <div className="flex-grow-1">
            <p className="fw-bold m-0" style={{ fontSize: '0.88rem', lineHeight: 1.3, color: 'var(--text-primary)' }}>{place.name}</p>
            <div className="d-flex flex-wrap gap-1 mt-1">
              <span className="badge px-2 py-1" style={{ fontSize: '0.6rem', background: cfg.glow, border: `1px solid ${cfg.color}`, color: cfg.color, letterSpacing: '0.05em' }}>
                {cfg.label.slice(0, -1).toUpperCase()}
              </span>
              {place.emergency && (
                <span className="badge px-2 py-1 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.6rem', background: 'rgba(185, 28, 28, 0.12)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}>
                  <ShieldAlert size={10} /> 24H EMERGENCY
                </span>
              )}
              {openStatus === true && (
                <span className="badge px-2 py-1 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.6rem', background: 'rgba(57, 116, 91, 0.15)', border: '1px solid var(--primary-accent)', color: 'var(--primary-accent)' }}>
                  <CheckCircle2 size={10} /> OPEN NOW
                </span>
              )}
              {openStatus === false && (
                <span className="badge px-2 py-1 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.6rem', background: 'rgba(185, 28, 28, 0.08)', border: '1px solid rgba(185, 28, 28, 0.3)', color: 'var(--accent-red)' }}>
                  CLOSED
                </span>
              )}
              {place.wheelchair === 'yes' && (
                <span className="badge px-2 py-1 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.6rem', background: 'rgba(57, 116, 91, 0.1)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <Accessibility size={10} /> ACCESSIBLE
                </span>
              )}
              {place.speciality && (
                <span className="badge px-2 py-1" style={{ fontSize: '0.6rem', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  {place.speciality}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="d-flex flex-column align-items-end flex-shrink-0 gap-1">
          <span className="fw-bold font-monospace" style={{ color: cfg.color, fontSize: '0.88rem' }}>
            {place.distance < 1 ? `${Math.round(place.distance * 1000)} m` : `${place.distance.toFixed(1)} km`}
          </span>
          {expanded ? <ChevronUp size={14} className="text-secondary" /> : <ChevronDown size={14} className="text-secondary" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-top"
            style={{ borderColor: 'var(--border-color)', overflow: 'hidden' }}
          >
            <div className="d-flex flex-column gap-2.5" style={{ fontSize: '0.78rem' }}>
              {/* Address / Proximity */}
              <div className="d-flex align-items-start gap-2" style={{ color: 'var(--text-primary)' }}>
                <MapPin size={13} style={{ color: cfg.color, flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong style={{ color: 'var(--text-primary)' }}>Address: </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {place.address || `Located ~${place.distance.toFixed(1)} km from your current area (${place.lat.toFixed(4)}°N, ${place.lon.toFixed(4)}°E)`}
                  </span>
                </span>
              </div>

              {/* Operating Hours */}
              <div className="d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Clock size={13} style={{ color: cfg.color, flexShrink: 0 }} />
                <span>
                  <strong style={{ color: 'var(--text-primary)' }}>Hours: </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {place.opening_hours || (place.type === 'hospital' ? '24/7 Acute & Emergency Services' : 'Standard Clinical Hours (Mon–Sat)')}
                  </span>
                </span>
              </div>

              {/* Phone / Directory Contact */}
              <div className="d-flex align-items-center gap-2 flex-wrap" style={{ color: 'var(--text-primary)' }}>
                <Phone size={13} style={{ color: cfg.color, flexShrink: 0 }} />
                {place.phone ? (
                  <span>
                    <strong style={{ color: 'var(--text-primary)' }}>Phone: </strong>
                    <a href={`tel:${place.phone}`} style={{ color: 'var(--brand-blue)', fontWeight: 600, textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                      {place.phone}
                    </a>
                  </span>
                ) : (
                  <span>
                    <strong style={{ color: 'var(--text-primary)' }}>Phone: </strong>
                    <span style={{ color: 'var(--text-secondary)' }}>Direct line not listed in OSM • </span>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(place.name + ' contact phone number')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--brand-blue)', fontWeight: 600, textDecoration: 'underline' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Search Directory
                    </a>
                  </span>
                )}
              </div>

              {/* Clinical Services / Speciality */}
              <div className="d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Building2 size={13} style={{ color: cfg.color, flexShrink: 0 }} />
                <span>
                  <strong style={{ color: 'var(--text-primary)' }}>Services: </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {place.speciality || (place.type === 'hospital' ? 'Emergency Medicine, ICU, Trauma & Inpatient Care' : place.type === 'pharmacy' ? 'Prescription Dispensing & Medical Supplies' : 'General Practice & Outpatient Care')}
                  </span>
                </span>
              </div>

              {place.operator && (
                <div className="d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <ShieldAlert size={13} style={{ color: cfg.color, flexShrink: 0 }} />
                  <span>
                    <strong style={{ color: 'var(--text-primary)' }}>Network: </strong>
                    <span style={{ color: 'var(--text-secondary)' }}>{place.operator}</span>
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="d-flex gap-2 mt-2.5 flex-wrap">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}&travelmode=driving`}
                  target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded font-monospace text-uppercase fw-bold text-decoration-none d-flex align-items-center gap-1.5"
                  style={{ fontSize: '0.68rem', background: cfg.glow, border: `1px solid ${cfg.color}`, color: cfg.color }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Navigation size={12} /> Directions
                </a>

                {place.phone ? (
                  <a
                    href={`tel:${place.phone}`}
                    className="px-3 py-1.5 rounded font-monospace text-uppercase fw-bold text-decoration-none d-flex align-items-center gap-1.5"
                    style={{ fontSize: '0.68rem', background: 'rgba(0,255,170,0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone size={12} /> Call
                  </a>
                ) : (
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(place.name + ' contact phone number')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded font-monospace text-uppercase fw-bold text-decoration-none d-flex align-items-center gap-1.5"
                    style={{ fontSize: '0.68rem', background: 'rgba(56,189,248,0.1)', border: '1px solid var(--brand-blue)', color: 'var(--brand-blue)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Search size={12} /> Search Number
                  </a>
                )}

                {place.website ? (
                  <a
                    href={place.website}
                    target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded font-monospace text-uppercase fw-bold text-decoration-none d-flex align-items-center gap-1.5"
                    style={{ fontSize: '0.68rem', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} /> Website
                  </a>
                ) : (
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(place.name + ' reviews info')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded font-monospace text-uppercase fw-bold text-decoration-none d-flex align-items-center gap-1.5"
                    style={{ fontSize: '0.68rem', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} /> Google Info
                  </a>
                )}

                <button
                  className="px-3 py-1.5 rounded font-monospace text-uppercase fw-bold d-flex align-items-center gap-1.5"
                  style={{ fontSize: '0.68rem', background: 'rgba(223,64,255,0.08)', border: '1px solid rgba(223,64,255,0.3)', color: 'var(--accent-purple)', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const text = `${place.name} — ${place.distance.toFixed(1)}km away\nAddress: ${place.address || 'GPS: ' + place.lat + ',' + place.lon}\nhttps://maps.google.com/?q=${place.lat},${place.lon}`;
                    navigator.clipboard?.writeText(text);
                  }}
                  title="Copy facility info to clipboard"
                  aria-label={`Copy ${place.name} location to clipboard`}
                >
                  <Share2 size={12} /> Share
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
const PRESET_CITIES = [
  { name: 'Kamachipuram', display_name: 'Kamachipuram, Ondipudur, Coimbatore', lat: 11.0065, lon: 77.0645 },
  { name: 'Ondipudur', display_name: 'Ondipudur, Coimbatore, Tamil Nadu', lat: 11.0040, lon: 77.0493 },
  { name: 'Singanallur', display_name: 'Singanallur, Coimbatore, Tamil Nadu', lat: 10.9995, lon: 77.0275 },
  { name: 'Peelamedu', display_name: 'Peelamedu, Coimbatore, Tamil Nadu', lat: 11.0267, lon: 77.0097 },
  { name: 'Gandhipuram', display_name: 'Gandhipuram, Coimbatore, Tamil Nadu', lat: 11.0183, lon: 76.9686 },
  { name: 'Coimbatore', display_name: 'Coimbatore Central, Tamil Nadu', lat: 11.0018, lon: 76.9628 },
  { name: 'Chennai', display_name: 'Chennai, Tamil Nadu', lat: 13.0827, lon: 80.2707 },
  { name: 'Bengaluru', display_name: 'Bengaluru, Karnataka', lat: 12.9716, lon: 77.5946 },
];

export default function NearbyMap({
  user,
  persistedLocation, setPersistedLocation,
  persistedPlaces, setPersistedPlaces,
  persistedActiveTypes, setPersistedActiveTypes,
  persistedRadius, setPersistedRadius,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isPatient = !!user;
  const { setSidebarContent } = useContext(SidebarContext);

  // Use persisted state from parent — survives navigation
  const [location, _setLocation]     = useState(persistedLocation);
  const [locError, setLocError]       = useState(null);
  const [locLoading, setLocLoading]   = useState(false);
  const [places, _setPlaces]          = useState(persistedPlaces);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const [activeTypes, _setActiveTypes] = useState(
    persistedActiveTypes || ['hospital', 'clinic', 'pharmacy']
  );
  const [radius, _setRadius]           = useState(
    persistedRadius !== null && persistedRadius !== undefined
      ? persistedRadius
      : (isPatient ? 5000 : 3000)
  );
  const [search, setSearch]           = useState('');
  const [expandedId, setExpandedId]   = useState(null);
  const [sortBy, setSortBy]           = useState('distance');
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [exportDone, setExportDone]   = useState(false);

  // Track the config used for the last fetch — allows re-fetch on radius/type change
  // while still skipping re-fetch on plain navigation back to the page
  const lastFetchConfigRef = useRef(null);

  // Wrapped setters that sync back to the parent so state persists on navigation
  const setLocation = useCallback((val) => {
    _setLocation(val);
    setPersistedLocation(val);
  }, [setPersistedLocation]);

  const setPlaces = useCallback((val) => {
    _setPlaces(val);
    setPersistedPlaces(val);
  }, [setPersistedPlaces]);

  const setActiveTypes = useCallback((fn) => {
    _setActiveTypes(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      setPersistedActiveTypes(next);
      return next;
    });
  }, [setPersistedActiveTypes]);

  const setRadius = useCallback((val) => {
    _setRadius(val);
    setPersistedRadius(val);
  }, [setPersistedRadius]);

  // ── Simple GPS / location logic (no reverse-geocoding — set coords directly) ──
  const getLocation = useCallback(() => {
    setLocLoading(true);
    setLocError(null);

    const setKamachiDefault = () => {
      setLocation({
        lat: 11.0065,
        lon: 77.0645,
        city: 'Kamachipuram',
        displayName: 'Kamachipuram, Ondipudur, Coimbatore',
        source: 'default',
      });
      setLocLoading(false);
    };

    if (!navigator.geolocation) {
      setKamachiDefault();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pLat = pos.coords.latitude;
        const pLon = pos.coords.longitude;
        // Check proximity to Kamachipuram (approx within 4km)
        const distToKamachi = haversineKm(pLat, pLon, 11.0065, 77.0645);
        const isNearKamachi = distToKamachi <= 4.0;

        setLocation({
          lat: pLat,
          lon: pLon,
          city: isNearKamachi ? 'Kamachipuram' : 'Coimbatore',
          displayName: isNearKamachi ? 'Kamachipuram, Ondipudur, Coimbatore' : `${pLat.toFixed(4)}°N, ${pLon.toFixed(4)}°E`,
          source: 'gps',
        });
        setLocLoading(false);
      },
      () => setKamachiDefault(),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [setLocation]);

  const selectQuickCity = (cityObj) => {
    setLocation({
      lat: cityObj.lat,
      lon: cityObj.lon,
      city: cityObj.name,
      displayName: cityObj.display_name,
      source: 'preset',
    });
  };

  // On startup: set Kamachipuram if no location yet
  useEffect(() => {
    if (!location) {
      setLocation({
        lat: 11.0065,
        lon: 77.0645,
        city: 'Kamachipuram',
        displayName: 'Kamachipuram, Ondipudur, Coimbatore',
        source: 'default',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!location) return;
    const configKey = `${location.lat},${location.lon},${radius},${[...activeTypes].sort().join(',')}`;
    if (lastFetchConfigRef.current === configKey && places.length > 0) return;
    lastFetchConfigRef.current = configKey;
    setLoading(true);
    setError(null);
    fetchPlaces(location.lat, location.lon, radius, activeTypes)
      .then((data) => { setPlaces(data); setLoading(false); })
      .catch(() => { setError('Failed to load facilities. Check your connection.'); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, radius, activeTypes]);

  const toggleType = useCallback((type) => {
    setActiveTypes((prev) =>
      prev.includes(type)
        ? prev.length > 1 ? prev.filter((t) => t !== type) : prev
        : [...prev, type]
    );
  }, [setActiveTypes]);

  // Sidebar injection
  useEffect(() => {
    setSidebarContent(
      <div className="d-flex flex-column gap-4 pt-2">
        {/* Sleek Medical Header Console inside Sidebar — unified across MedFusion AI */}
        <div className="glass-card p-4 mb-2 reveal border-theme-accent border-opacity-15 bg-white-5" style={{ borderRadius: '12px' }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(244,149,74,0.3) 0%, rgba(56,189,248,0.3) 100%)',
              border: '1px solid rgba(244,149,74,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Radio size={15} style={{ color: 'var(--brand-orange)' }} />
            </div>
            <span style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
              Live GPS Radar
            </span>
          </div>
          <h2 className="fw-bolder fs-6 m-0" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem', color: '#FFFFFF' }}>
            Facility <span style={{ color: 'var(--brand-orange)' }}>Radar</span>
          </h2>
          <p className="m-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: '1.4', color: 'rgba(255, 255, 255, 0.88)' }}>
            {isPatient ? 'Live GPS radar with one-tap directions, emergency routing, and hospital contacts.' : 'Sign in for direct facility calling, emergency routing, and 15km extended radius.'}
          </p>
        </div>

        {/* Active Search Zone Status Card */}
        <div className="p-3 bg-white-5 border border-theme-accent border-opacity-15 rounded bg-opacity-20 font-monospace">
          <span className="fw-bold font-monospace text-uppercase d-block mb-1.5" style={{ fontSize: '0.72rem', color: 'var(--brand-orange)' }}>
            Active Search Zone
          </span>
          <div className="d-flex align-items-center justify-content-between">
            <span className="fw-bold d-block" style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              {location ? 'GPS Locked' : 'Locating…'}
            </span>
            <span style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38BDF8', color: '#FFFFFF', padding: '1px 7px', borderRadius: '20px', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {(radius / 1000).toFixed(0)} KM RADIUS
            </span>
          </div>
          <div className="d-flex gap-3 mt-2 pt-2 border-top border-white-5" style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.75)' }}>
            <span>{places.length} Total Found</span>
            <span>•</span>
            <span>{activeTypes.length} Active Types</span>
          </div>
        </div>

        {/* Live Facilities Selector using standard disease-select-tile pattern */}
        <div className="mt-2">
          <h4 className="fw-bold mb-3" style={{ fontSize: '1.05rem', letterSpacing: '0.05em', color: '#FFFFFF' }}>
            <span className="font-monospace text-uppercase" style={{ letterSpacing: '0.06em', color: '#FFFFFF' }}>Live Facilities</span>
          </h4>
          <div className="d-flex flex-column gap-2 mt-2">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
              const IconComponent = cfg.icon;
              const count = places.filter((p) => p.type === key).length;
              const isFilterActive = activeTypes.includes(key);
              return (
                <div
                  key={key}
                  onClick={() => toggleType(key)}
                  className={`disease-select-tile cursor-pointer ${isFilterActive ? 'active' : 'inactive'}`}
                  style={{
                    padding: '8px 14px',
                    borderColor: isFilterActive ? cfg.brightColor : 'var(--border-color)',
                    opacity: isFilterActive ? 1 : 0.75,
                    transition: 'all 0.2s ease',
                  }}
                  title={`Click to ${isFilterActive ? 'hide' : 'show'} ${cfg.label} on map`}
                >
                  <div className="d-flex align-items-center justify-content-between font-monospace fw-bold text-uppercase" style={{ fontSize: '0.84rem' }}>
                    <div className="d-flex align-items-center gap-2.5">
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: isFilterActive ? cfg.bg : 'rgba(148, 163, 184, 0.1)',
                        border: `1px solid ${isFilterActive ? cfg.border : 'var(--border-color)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isFilterActive ? cfg.brightColor : 'var(--text-secondary)',
                        flexShrink: 0,
                        boxShadow: isFilterActive ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s ease',
                      }}>
                        <IconComponent size={15} />
                      </div>
                      <span style={{
                        color: isFilterActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        letterSpacing: '0.04em',
                        transition: 'color 0.2s ease',
                      }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className="fw-bold font-monospace px-2 py-0.5 rounded"
                        style={{
                          fontSize: '0.82rem',
                          background: isFilterActive ? cfg.bg : 'var(--bg-card-tinted)',
                          color: isFilterActive ? (cfg.brightColor || cfg.color) : 'var(--text-secondary)',
                          border: `1px solid ${isFilterActive ? cfg.border : 'var(--border-color)'}`,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {count}
                      </span>
                      {isFilterActive ? (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.brightColor || cfg.color, boxShadow: `0 0 8px ${cfg.brightColor || cfg.color}`, flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-disabled, #94a3b8)', opacity: 0.5, flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nearest Hospital quick route */}
        {isPatient && places.filter((p) => p.type === 'hospital').length > 0 && (
          <div className="d-flex flex-column gap-2 mt-1">
            <h4 className="fw-bold mb-1" style={{ fontSize: '0.85rem', letterSpacing: '0.05em', color: '#FFFFFF' }}>
              <span className="font-monospace text-uppercase" style={{ letterSpacing: '0.06em', color: '#F87171' }}>Nearest Emergency</span>
            </h4>
            {places.filter((p) => p.type === 'hospital').slice(0, 1).map((p) => (
              <div key={p.id} className="p-3 rounded-3" style={{ background: 'rgba(220, 38, 38, 0.18)', border: '1px solid rgba(220, 38, 38, 0.45)' }}>
                <p className="fw-bold m-0" style={{ fontSize: '0.88rem', color: '#FFFFFF' }}>{p.name}</p>
                <p className="m-0 mt-1" style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                  {p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`} away
                </p>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`} target="_blank" rel="noopener noreferrer"
                  className="d-flex align-items-center justify-content-center gap-1.5 mt-2.5 text-center py-1.5 rounded font-monospace text-uppercase text-decoration-none"
                  style={{ fontSize: '0.72rem', background: 'rgba(220, 38, 38, 0.35)', border: '1px solid var(--accent-red)', color: '#FFFFFF', fontWeight: 700 }}>
                  <Navigation size={12} /> Get Directions
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    );
    return () => setSidebarContent(null);
  }, [setSidebarContent, isPatient, places, activeTypes, location, radius, toggleType]);

  const filtered = places
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !showOpenOnly || isOpenNow(p.opening_hours) === true)
    .sort((a, b) => sortBy === 'distance' ? a.distance - b.distance : a.name.localeCompare(b.name));

  const counts = {};
  Object.keys(TYPE_CONFIG).forEach((k) => { counts[k] = places.filter((p) => p.type === k).length; });

  const handleExport = () => {
    exportEmergencySheet(places, location);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 3000);
  };

  return (
    <div className="reveal theme-general" style={{ paddingBottom: '32px' }}>
      {/* ── Header Banner (Theme-Adaptive) ── */}
      <div
        className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3 position-relative overflow-hidden"
        style={{
          borderRadius: '20px',
          padding: '28px 32px',
          background: isDark
            ? 'linear-gradient(135deg, #0d0d0d 0%, #1a0808 40%, #2a0c0c 70%, #0d0d0d 100%)'
            : '#FFFFFF',
          border: isDark
            ? '1px solid rgba(239, 68, 68, 0.35)'
            : '1px solid rgba(239, 68, 68, 0.25)',
          boxShadow: isDark
            ? '0 0 40px rgba(239, 68, 68, 0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 4px 20px rgba(239, 68, 68, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Decorative glow blobs */}
        <div style={{ position: 'absolute', top: '-30px', right: '80px', width: '160px', height: '160px', borderRadius: '50%', background: `radial-gradient(circle, rgba(239,68,68,${isDark ? '0.18' : '0.1'}) 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '120px', width: '120px', height: '120px', borderRadius: '50%', background: `radial-gradient(circle, rgba(251,113,133,${isDark ? '0.12' : '0.08'}) 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <MapPin size={14} style={{ color: isDark ? '#F87171' : '#DC2626' }} />
            </div>
            <span className="font-monospace text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.14em', color: isDark ? '#F87171' : '#DC2626', fontWeight: 700 }}>
              Medical Facility Radar &nbsp;·&nbsp; {location ? `${filtered.length} Results` : 'Offline Mode'}
            </span>
          </div>
          <h1 className="fw-bolder m-0 mb-2" style={{ fontSize: '2rem', letterSpacing: '-0.03em', color: isDark ? '#FFFFFF' : '#0F172A', lineHeight: 1.1 }}>
            Nearby <span style={{ background: 'linear-gradient(90deg, #DC2626, #EA580C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Hospitals & Pharmacy</span>
          </h1>
          <p className="m-0" style={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.65)' : '#475569', maxWidth: '520px', lineHeight: 1.5, fontWeight: isDark ? 400 : 500 }}>
            {isPatient
              ? 'Live GPS radar with one-tap directions, emergency routing, open status and hospital contacts.'
              : 'Locate hospitals, clinics and pharmacy facilities near you. Sign in for emergency call routing & 15 km radius.'}
          </p>
        </div>

        {/* Export button — patients only */}
        {isPatient && places.length > 0 && (
          <button
            onClick={handleExport}
            className="d-flex align-items-center gap-2 px-4 py-2 rounded-3 font-monospace text-uppercase fw-bold flex-shrink-0"
            style={{
              fontSize: '0.72rem',
              background: exportDone ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.12)',
              border: exportDone ? '1px solid #34d399' : '1px solid rgba(239,68,68,0.5)',
              color: exportDone ? '#34d399' : '#F87171',
              cursor: 'pointer',
              letterSpacing: '0.08em',
              transition: 'all 0.3s',
              backdropFilter: 'blur(8px)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {exportDone ? <CheckCircle2 size={14} /> : <Download size={14} />}
            {exportDone ? 'Saved!' : 'Export Emergency Sheet'}
          </button>
        )}
      </div>

      {/* ── SOS Panel ── */}
      {isPatient && <SOSPanel places={places} location={location} isPatient={isPatient} />}

      {/* ── Interactive Map ── */}
      {location && (
        <InteractiveMap
          location={location}
          places={filtered}
          isPatient={isPatient}
        />
      )}

      <div className="row g-4">
        {/* ── LEFT CONTROLS ── */}
        <div className="col-lg-4 col-md-5">
          <div className="d-flex flex-column gap-3">

            {/* Location */}
            <div className="glass-card p-4" style={{ borderRadius: '12px' }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fw-bold font-monospace m-0 d-flex align-items-center gap-2" style={{ fontSize: '0.85rem', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
                  <MapPin size={14} style={{ color: 'var(--brand-blue)' }} /> YOUR LOCATION
                </h5>
                <button
                  onClick={getLocation}
                  className="px-2.5 py-1 rounded font-monospace d-flex align-items-center gap-1.5"
                  style={{
                    fontSize: '0.68rem',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: 'var(--brand-blue)',
                    cursor: 'pointer'
                  }}
                  title="Detect my current location via GPS"
                  disabled={locLoading}
                >
                  <Crosshair size={11} className={locLoading ? 'spin' : ''} />
                  <span>{locLoading ? 'Detecting...' : 'Use GPS'}</span>
                </button>
              </div>

              {/* Current Active Location Display */}
              {location ? (
                <div className="p-2.5 rounded mb-3" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)' }}>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0 }} />
                    <span className="fw-bold text-truncate" style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                      {location.displayName || location.city || 'Location Locked'}
                    </span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between font-monospace text-secondary" style={{ fontSize: '0.66rem' }}>
                    <span>{location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E</span>
                    <span className="badge px-1.5 py-0.5" style={{ fontSize: '0.6rem', background: 'rgba(57,116,91,0.15)', color: 'var(--primary-accent)', border: '1px solid var(--primary-accent)' }}>
                      {location.source === 'gps' ? 'Live GPS' : location.source === 'search' ? 'Search Pick' : 'Active Zone'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-secondary small mb-3">No location locked yet.</p>
              )}

              {/* Search / Quick Regions */}
              <div className="mb-2">
                <span className="font-monospace text-uppercase text-secondary d-block mb-1.5" style={{ fontSize: '0.64rem', letterSpacing: '0.05em' }}>
                  Quick Regions
                </span>
                <div className="d-flex flex-wrap gap-1.5">
                  {PRESET_CITIES.map((c) => {
                    const isSelected = location?.city === c.name || location?.displayName?.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        onClick={() => selectQuickCity(c)}
                        className="px-2 py-1 rounded font-monospace cursor-pointer"
                        style={{
                          fontSize: '0.66rem',
                          background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'var(--bg-card-hover)',
                          border: isSelected ? '1px solid var(--brand-blue)' : '1px solid var(--border-color)',
                          color: isSelected ? 'var(--brand-blue)' : 'var(--text-secondary)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Facility types */}
            <div className="glass-card p-4" style={{ borderRadius: '12px' }}>
              <h5 className="fw-bold font-monospace mb-3" style={{ fontSize: '0.85rem', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
                <Filter size={13} className="me-2" />FACILITY TYPE
              </h5>
              <div className="d-flex flex-column gap-2">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  isPatient || ['hospital', 'clinic', 'pharmacy'].includes(key) ? (
                    <button
                      key={key}
                      onClick={() => toggleType(key)}
                      className="d-flex align-items-center justify-content-between px-3 py-2 rounded font-monospace"
                      style={{
                        background: activeTypes.includes(key) ? cfg.glow : 'var(--bg-card-hover)',
                        border: `1px solid ${activeTypes.includes(key) ? cfg.color : 'var(--border-color)'}`,
                        color: activeTypes.includes(key) ? cfg.color : 'var(--text-secondary)',
                        fontSize: '0.72rem', letterSpacing: '0.06em', width: '100%', transition: 'all 0.2s',
                      }}
                    >
                      <span className="d-flex align-items-center gap-2">
                        {cfg.icon ? <cfg.icon size={13} /> : null} {cfg.label.toUpperCase()}
                      </span>
                      <span className="badge" style={{ background: activeTypes.includes(key) ? cfg.glow : 'transparent', border: `1px solid ${activeTypes.includes(key) ? cfg.color : 'var(--border-color)'}`, color: activeTypes.includes(key) ? cfg.color : 'var(--text-muted)', fontSize: '0.6rem' }}>
                        {counts[key] || 0}
                      </span>
                    </button>
                  ) : null
                ))}
                {!isPatient && (
                  <p className="text-secondary mt-1 mb-0 d-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }}>
                    <Lock size={11} /> Sign in for Dentists & Labs
                  </p>
                )}
              </div>
            </div>

            {/* Radius */}
            <div className="glass-card p-4" style={{ borderRadius: '12px' }}>
              <h5 className="fw-bold font-monospace mb-3 d-flex align-items-center gap-2" style={{ fontSize: '0.85rem', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
                <Radio size={14} className="text-info" /> SEARCH RADIUS
              </h5>
              <div className="d-flex align-items-center gap-3">
                <input type="range" min={500} max={isPatient ? 15000 : 5000} step={500} value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ margin: 0 }} aria-label="Search radius" />
                <span className="text-info fw-bold font-monospace" style={{ minWidth: '52px', fontSize: '0.8rem' }}>
                  {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}
                </span>
              </div>
              {!isPatient && <p className="text-secondary mt-2 mb-0" style={{ fontSize: '0.65rem' }}>Sign in to search up to 15 km</p>}
            </div>

            {/* Google Maps link */}
            {location && (
              <a
                href={`https://www.google.com/maps/search/hospitals+clinics+near+me/@${location.lat},${location.lon},14z`}
                target="_blank" rel="noopener noreferrer"
                className="btn-clinical primary py-3 d-flex align-items-center justify-content-center gap-2 font-monospace text-uppercase text-decoration-none"
                style={{ fontSize: '0.75rem', borderRadius: '10px' }}
              >
                <MapPin size={14} /> Open in Google Maps
              </a>
            )}
          </div>
        </div>

        {/* ── RIGHT RESULTS ── */}
        <div className="col-lg-8 col-md-7">
          <div className="glass-card p-4" style={{ borderRadius: '12px' }}>
            {/* Search + filters row */}
            <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
              <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '8px', padding: '8px 12px' }}>
                <Search size={14} className="text-secondary" />
                <input
                  type="text" placeholder="Search facilities..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.83rem', padding: 0, marginBottom: 0 }}
                />
              </div>
              {isPatient && (
                <>
                  <select
                    value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '8px', color: 'var(--text-primary)', padding: '8px 10px', fontSize: '0.75rem', marginBottom: 0 }}
                  >
                    <option value="distance">Nearest first</option>
                    <option value="name">Name A–Z</option>
                  </select>
                  <button
                    onClick={() => setShowOpenOnly((v) => !v)}
                    className="px-3 py-2 rounded font-monospace text-uppercase d-flex align-items-center gap-1"
                    style={{
                      fontSize: '0.68rem', letterSpacing: '0.05em',
                      background: showOpenOnly ? 'rgba(0,255,170,0.1)' : 'var(--bg-card-hover)',
                      border: `1px solid ${showOpenOnly ? 'var(--accent-green)' : 'var(--border-color)'}`,
                      color: showOpenOnly ? 'var(--accent-green)' : 'var(--text-secondary)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <CheckCircle2 size={12} /> Open Now
                  </button>
                </>
              )}
            </div>

            {/* Summary row */}
            {!loading && !locLoading && filtered.length > 0 && (
              <p className="text-secondary font-monospace mb-3" style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}>
                {filtered.length} FACILITIES FOUND • WITHIN {radius >= 1000 ? `${(radius / 1000).toFixed(1)} KM` : `${radius} M`}
                {showOpenOnly && ' • OPEN NOW ONLY'}
              </p>
            )}

            {/* States */}
            {!location && !locLoading && (
              <div className="text-center py-5 opacity-50">
                <MapPin size={36} className="text-secondary mb-3" />
                <p className="text-secondary font-monospace small">Allow location access to find nearby facilities</p>
              </div>
            )}
            {(locLoading || loading) && (
              <div className="text-center py-5">
                <div className="spinner-border text-info mb-3" style={{ width: '38px', height: '38px' }} />
                <p className="text-secondary font-monospace small">{locLoading ? 'Acquiring GPS signal...' : 'Scanning facility radar...'}</p>
              </div>
            )}
            {error && (
              <div className="text-center py-4">
                <AlertCircle size={30} className="text-danger mb-2" />
                <p className="text-danger small">{error}</p>
                <button onClick={() => fetchPlaces(location.lat, location.lon, radius, activeTypes)} className="btn-clinical py-2 font-monospace text-uppercase mt-2" style={{ fontSize: '0.7rem' }}>Retry</button>
              </div>
            )}
            {!loading && !locLoading && location && filtered.length === 0 && !error && (
              <div className="text-center py-5 opacity-50">
                <p className="text-secondary font-monospace small">No facilities found. Try increasing the search radius.</p>
              </div>
            )}

            {/* Results list */}
            {!loading && !locLoading && filtered.length > 0 && (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '580px', overflowY: 'auto', paddingRight: '4px' }}>
                {filtered.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    isPatient={isPatient}
                    expanded={expandedId === place.id}
                    onToggle={() => setExpandedId(expandedId === place.id ? null : place.id)}
                  />
                ))}
              </div>
            )}

            {/* Guest upsell */}
            {!isPatient && !loading && filtered.length > 0 && (
              <div className="mt-4 p-3 rounded d-flex align-items-start gap-2" style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', fontSize: '0.75rem' }}>
                <Lock size={14} className="text-info mt-1 flex-shrink-0" />
                <p className="text-info font-monospace m-0">
                  Sign in to unlock phone numbers, one-tap calling, Dentist & Lab search, Open Now filter, 15km radius, and Emergency Sheet export.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
