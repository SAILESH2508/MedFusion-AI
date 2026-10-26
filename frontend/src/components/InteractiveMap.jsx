/**
 * InteractiveMap — Full Leaflet map with:
 *  - Real-world OpenStreetMap tiles (same as Google Maps data)
 *  - Satellite view toggle (ESRI World Imagery)
 *  - Coloured markers per facility type with popups
 *  - User location pulsing marker
 *  - Directions to selected place via OSRM (real routing, no API key)
 *  - Route polyline drawn on map
 *  - Map controls: zoom, locate, layer toggle
 *  - Click marker → info popup with Call / Directions buttons
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Navigation, Layers, Crosshair, X } from 'lucide-react';

// Leaflet CSS — inject once
function ensureLeafletCSS() {
  if (document.getElementById('leaflet-css')) return;
  const link = document.createElement('link');
  link.id   = 'leaflet-css';
  link.rel  = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

const TILE_LAYERS = {
  street: {
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 21,
    maxNativeZoom: 19,
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, DigitalGlobe, GeoEye, i-cubed',
    maxZoom: 21,
    maxNativeZoom: 19,
  },
};

const TYPE_COLORS = {
  hospital: '#ff3366',
  clinic:   '#00f5d4',
  pharmacy: '#ff8f00',
  dentist:  '#df40ff',
  lab:      '#ffd600',
};

const TYPE_SVGS = {
  hospital: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12M6 12h12"/></svg>`,
  clinic: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`,
  pharmacy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
  dentist: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>`,
  lab: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31L4.1 19.5A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-2.5L14 9.31V2"/></svg>`,
};

// Build a custom div icon for each place type
function createIcon(L, type, isSelected) {
  const color = TYPE_COLORS[type] || '#00f5d4';
  const svg = TYPE_SVGS[type] || `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const size  = isSelected ? 44 : 36;
  const html  = `
    <div style="
      width:${size}px;height:${size}px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${color};
      border:3px solid #fff;
      box-shadow:0 4px 14px rgba(0,0,0,0.55);
      display:flex;align-items:center;justify-content:center;
    ">
      <span style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center">${svg}</span>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size], popupAnchor: [0, -size] });
}

// Pulsing "you are here" icon
function createUserIcon(L) {
  const html = `
    <div style="position:relative;width:20px;height:20px">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(91,159,224,0.25);animation:userPulse 1.5s infinite"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:#5B9FE0;border:2px solid #fff;box-shadow:0 0 6px rgba(91,159,224,0.6)"></div>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
}

export default function InteractiveMap({ location, places, isPatient, onLocationSelect }) {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const tileRef         = useRef(null);
  const markersRef      = useRef([]);
  const userMarkerRef   = useRef(null);
  const routeLayerRef   = useRef(null);

  const [tileLayer, setTileLayer]         = useState('street');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [routing, setRouting]             = useState(false);
  const [routeInfo, setRouteInfo]         = useState(null); // {distance, duration}

  // ── Init map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!location || !mapContainerRef.current || mapRef.current) return;

    ensureLeafletCSS();

    import('leaflet').then((mod) => {
      const L = mod.default || mod;

      // Fix default icon path issue in bundlers
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current, {
        center:             [location.lat, location.lon],
        zoom:               15,
        maxZoom:            21,
        zoomControl:        false,
        attributionControl: true,
      });

      // Add zoom controls top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Street tile layer
      const tile = L.tileLayer(TILE_LAYERS.street.url, {
        attribution:   TILE_LAYERS.street.attribution,
        maxZoom:       21,
        maxNativeZoom: 19,
        keepBuffer:    4,
      }).addTo(map);

      tileRef.current  = tile;
      mapRef.current   = map;

      // User location marker (Draggable for pinpoint precision)
      const userIcon = createUserIcon(L);
      const userMarker = L.marker([location.lat, location.lon], {
        icon: userIcon,
        zIndexOffset: 1000,
        draggable: false,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:'Outfit',sans-serif;font-size:0.8rem;color:#1A2333;font-weight:700">
            📍 ${location.displayName || location.city || 'Your Location'}
            <div style="font-size:0.68rem;color:#666;font-family:monospace;font-weight:normal;margin-top:2px">
              ${location.lat.toFixed(5)}°N, ${location.lon.toFixed(5)}°E
            </div>
            <div style="font-size:0.65rem;color:#0ea5e9;font-weight:600;margin-top:4px">
              Drag pin or click map to move
            </div>
          </div>`
        );

      userMarkerRef.current = userMarker;

      // Map is view-only — location is set via GPS button or region presets, not by clicking the map
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // ── Pan map & update marker whenever location changes ─────────────────
  useEffect(() => {
    if (!mapRef.current || !location) return;

    mapRef.current.flyTo([location.lat, location.lon], 15, { duration: 0.8 });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([location.lat, location.lon]);
      const popupText = location.displayName || location.city || 'Your Location';
      userMarkerRef.current.bindPopup(
        `<div style="font-family:'Outfit',sans-serif;font-size:0.8rem;color:#1A2333;font-weight:700">
          📍 ${popupText}
          <div style="font-size:0.68rem;color:#666;font-family:monospace;font-weight:normal;margin-top:2px">
            ${location.lat.toFixed(5)}°N, ${location.lon.toFixed(5)}°E
          </div>
        </div>`
      );
    }
  }, [location?.lat, location?.lon, location?.displayName, location?.city]);

  // ── Update tile layer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    import('leaflet').then((mod) => {
      const L = mod.default || mod;
      if (tileRef.current) { tileRef.current.remove(); }
      const cfg = TILE_LAYERS[tileLayer];

      tileRef.current = L.tileLayer(cfg.url, {
          attribution:   cfg.attribution,
          maxZoom:       21,
          maxNativeZoom: cfg.maxNativeZoom || 19,
          keepBuffer:    4,
        }).addTo(mapRef.current);
    });
  }, [tileLayer]);

  // ── Update markers when places change ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;

    import('leaflet').then((mod) => {
      const L = mod.default || mod;

      // Remove old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      places.forEach((place) => {
        const isSelected = selectedPlace?.id === place.id;
        const icon = createIcon(L, place.type, isSelected);
        const color = TYPE_COLORS[place.type] || '#00f5d4';

        const popup = L.popup({ maxWidth: 260, className: 'medfusion-popup' }).setContent(`
          <div style="font-family:'Outfit',sans-serif;padding:4px 2px;min-width:200px">
            <div style="font-weight:700;font-size:0.9rem;color:#111;margin-bottom:4px">${place.name}</div>
            ${place.address ? `<div style="font-size:0.75rem;color:#555;margin-bottom:3px">${place.address}</div>` : ''}
            ${place.phone   ? `<div style="font-size:0.75rem;color:#555;margin-bottom:3px">Tel: ${place.phone}</div>` : ''}
            ${place.opening_hours ? `<div style="font-size:0.75rem;color:#555;margin-bottom:6px">Hours: ${place.opening_hours}</div>` : ''}
            <div style="font-size:0.72rem;font-weight:600;color:${color};margin-bottom:8px">
              ${place.distance < 1 ? Math.round(place.distance * 1000) + ' m away' : place.distance.toFixed(1) + ' km away'}
              ${place.emergency ? ' • 24H EMERGENCY' : ''}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}&travelmode=driving"
                target="_blank"
                style="padding:5px 10px;background:${color};color:#fff;border-radius:6px;font-size:0.68rem;font-weight:700;text-decoration:none;font-family:monospace;text-transform:uppercase">
                Directions
              </a>
              ${place.phone ? `<a href="tel:${place.phone}" style="padding:5px 10px;background:#f0f0f0;color:#333;border-radius:6px;font-size:0.68rem;font-weight:700;text-decoration:none;font-family:monospace;text-transform:uppercase">Call</a>` : ''}
              ${place.website ? `<a href="${place.website}" target="_blank" style="padding:5px 10px;background:#f0f0f0;color:#333;border-radius:6px;font-size:0.68rem;font-weight:700;text-decoration:none;font-family:monospace;text-transform:uppercase">Web</a>` : ''}
            </div>
          </div>
        `);

        const marker = L.marker([place.lat, place.lon], { icon })
          .addTo(mapRef.current)
          .bindPopup(popup);

        marker.on('click', () => {
          setSelectedPlace(place);
        });

        markersRef.current.push(marker);
      });
    });
  }, [places, selectedPlace]);

  // ── Draw OSRM route ───────────────────────────────────────────────────
  const drawRoute = useCallback(async (dest) => {
    if (!mapRef.current || !location) return;
    setRouting(true);
    setRouteInfo(null);

    try {
      import('leaflet').then(async (mod) => {
        const L = mod.default || mod;
        const url = `https://router.project-osrm.org/route/v1/driving/${location.lon},${location.lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;
        const res  = await fetch(url);
        const data = await res.json();

        if (data.code !== 'Ok' || !data.routes?.[0]) {
          setRouting(false);
          return;
        }

        const route = data.routes[0];
        const distKm = (route.distance / 1000).toFixed(1);
        const durMin = Math.round(route.duration / 60);
        setRouteInfo({ distance: distKm, duration: durMin });

        // Remove old route
        if (routeLayerRef.current) { routeLayerRef.current.remove(); }

        routeLayerRef.current = L.geoJSON(route.geometry, {
          style: { color: '#00f5d4', weight: 5, opacity: 0.85, dashArray: null },
        }).addTo(mapRef.current);

        // Fit map to route
        mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
        setRouting(false);
      });
    } catch {
      setRouting(false);
    }
  }, [location]);

  const clearRoute = useCallback(() => {
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    setRouteInfo(null);
    setSelectedPlace(null);
    if (mapRef.current && location) {
      mapRef.current.setView([location.lat, location.lon], 15);
    }
  }, [location]);

  const recenter = useCallback(() => {
    if (mapRef.current && location) {
      mapRef.current.setView([location.lat, location.lon], 15, { animate: true });
    }
  }, [location]);

  if (!location) return null;

  return (
    <div className="glass-card glass-card--map p-3 mb-4" style={{ borderRadius: '14px' }}>
      {/* Header row */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h5 className="fw-bold font-monospace m-0" style={{ fontSize: '0.88rem', letterSpacing: '0.06em', color: '#FFFFFF' }}>
          INTERACTIVE MAP — {places.length} FACILITIES
        </h5>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          {/* Layer toggle */}
          {Object.entries(TILE_LAYERS).map(([key, cfg]) => {
            const isActive = tileLayer === key;
            return (
              <button
                key={key}
                onClick={() => setTileLayer(key)}
                className="d-flex align-items-center gap-1 px-3 py-1.5 rounded-2 font-monospace"
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 600,
                  background: isActive ? 'var(--brand-orange, #F4954A)' : 'rgba(255, 255, 255, 0.12)',
                  border: isActive ? '1px solid var(--brand-orange, #F4954A)' : '1px solid rgba(255, 255, 255, 0.22)',
                  color: '#FFFFFF',
                  boxShadow: isActive ? '0 2px 8px rgba(244, 149, 74, 0.35)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {cfg.label}
              </button>
            );
          })}
          {/* Recenter */}
          <button
            onClick={recenter}
            title="Re-center on my location"
            aria-label="Re-centre map on my location"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              borderRadius: '6px',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <Crosshair size={14} />
          </button>
          {/* Clear route */}
          {routeInfo && (
            <button
              onClick={clearRoute}
              aria-label="Clear route"
              style={{ background: 'rgba(255,0,85,0.18)', border: '1px solid rgba(255,0,85,0.4)', borderRadius: '6px', color: '#ff4d79', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
            >
              <X size={12} /> Clear Route
            </button>
          )}
        </div>
      </div>

      {/* Location accuracy tip */}
      <div className="d-flex align-items-center justify-content-between px-3 py-1.5 rounded mb-2.5" style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: '0.72rem' }}>
        <span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
          <strong style={{ color: '#38BDF8' }}>💡 Pinpoint Accuracy: </strong>
          Click anywhere on the map or drag the blue marker to set your exact location.
        </span>
        {location?.displayName && (
          <span className="font-monospace text-truncate d-none d-md-inline" style={{ maxWidth: '280px', color: '#F4954A', fontSize: '0.68rem' }}>
            📍 {location.displayName}
          </span>
        )}
      </div>

      {/* Route info bar */}
      {routeInfo && (
        <div className="d-flex align-items-center gap-3 mb-2 px-3 py-2 rounded" style={{ background: 'rgba(91, 159, 224, 0.15)', border: '1px solid rgba(91, 159, 224, 0.4)', fontSize: '0.78rem' }}>
          <span className="font-monospace fw-bold" style={{ color: '#38BDF8' }}>Route calculated</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{routeInfo.distance} km</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>~{routeInfo.duration} min drive</span>
        </div>
      )}

      {routing && (
        <div className="d-flex align-items-center gap-2 mb-2 px-3 py-2 rounded" style={{ background: 'rgba(255, 255, 255, 0.07)', border: '1px solid rgba(255, 255, 255, 0.16)', fontSize: '0.75rem' }}>
          <div className="spinner-border" style={{ width: '14px', height: '14px', borderWidth: '2px', color: '#38BDF8' }} />
          <span className="font-monospace" style={{ color: 'rgba(255, 255, 255, 0.82)' }}>Calculating route via OSRM...</span>
        </div>
      )}

      {/* Map container */}
      <div
        ref={mapContainerRef}
        style={{
          height: '420px',
          borderRadius: '10px',
          background: '#0a0f2a',
          position: 'relative',
          isolation: 'isolate',
          transform: 'translateZ(0)',          /* own GPU compositing layer */
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',        /* prevent subpixel blur */
          WebkitBackfaceVisibility: 'hidden',
        }}
      />

      {/* Selected place quick panel */}
      {selectedPlace && !routeInfo && (
        <div className="mt-3 p-3 rounded d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ background: 'rgba(255, 255, 255, 0.08)', border: `1px solid ${TYPE_COLORS[selectedPlace.type] || 'rgba(255,255,255,0.22)'}` }}>
          <div>
            <p className="fw-bold m-0" style={{ fontSize: '0.88rem', color: '#FFFFFF' }}>
              {selectedPlace.name}
            </p>
            <p className="text-secondary m-0 mt-1" style={{ fontSize: '0.72rem' }}>
              {selectedPlace.distance < 1 ? `${Math.round(selectedPlace.distance * 1000)} m` : `${selectedPlace.distance.toFixed(1)} km`} away
              {selectedPlace.phone && ` • ${selectedPlace.phone}`}
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              onClick={() => drawRoute(selectedPlace)}
              disabled={routing}
              className="d-flex align-items-center gap-2 px-3 py-2 rounded font-monospace text-uppercase fw-bold"
              style={{
                fontSize: '0.68rem', cursor: routing ? 'not-allowed' : 'pointer',
                background: `${TYPE_COLORS[selectedPlace.type]}22`,
                border: `1px solid ${TYPE_COLORS[selectedPlace.type]}`,
                color: TYPE_COLORS[selectedPlace.type],
              }}
            >
              <Navigation size={12} />
              {routing ? 'Routing...' : 'Show Route'}
            </button>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lon}&travelmode=driving`}
              target="_blank" rel="noopener noreferrer"
              className="d-flex align-items-center gap-2 px-3 py-2 rounded font-monospace text-uppercase fw-bold text-decoration-none"
              style={{ fontSize: '0.68rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.25)', color: '#FFFFFF' }}
            >
              Google Maps
            </a>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="d-flex flex-wrap align-items-center gap-3 mt-3 pt-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="d-flex align-items-center gap-1.5" style={{ fontSize: '0.74rem', color: '#FFFFFF', fontWeight: 600 }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}88` }} />
            <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          </div>
        ))}
        <div className="d-flex align-items-center gap-1.5" style={{ fontSize: '0.74rem', color: '#FFFFFF', fontWeight: 600 }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#38BDF8', border: '2px solid #FFFFFF', display: 'inline-block', boxShadow: '0 0 6px rgba(56, 189, 248, 0.8)' }} />
          <span>You</span>
        </div>
      </div>

      <style>{`
        @keyframes userPulse {
          0%   { transform: scale(0.8); opacity: 0.8; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }

        /* ── Compositing isolation ──────────────────────────────────────
           Remove backdrop-filter from the map wrapper card so it doesn't
           create a stacking context that gets composited over Leaflet's
           GPU-accelerated tile pane during zoom animations.           */
        .glass-card--map {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          background: #1C2333 !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          color: #FFFFFF !important;
        }

        /* ── Leaflet container — own compositing layer ──────────────────
           Force the Leaflet root element onto its own GPU layer so the
           browser never needs to re-composite it through a parent filter. */
        .leaflet-container {
          transform: translateZ(0) !important;
          -webkit-transform: translateZ(0) !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
          -webkit-font-smoothing: subpixel-antialiased !important;
          text-rendering: optimizeLegibility !important;
        }

        /* ── Tile & pane layers — no filter inheritance ─────────────────
           Any filter (including backdrop-filter) on a parent creates a
           new compositing layer that Leaflet's CSS3 transforms are then
           rendered inside — causing blur during zoom. Strip all filters. */
        .leaflet-map-pane,
        .leaflet-tile-pane,
        .leaflet-overlay-pane,
        .leaflet-shadow-pane,
        .leaflet-marker-pane,
        .leaflet-tooltip-pane,
        .leaflet-popup-pane,
        .leaflet-tile {
          filter: none !important;
          -webkit-filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* ── Tile rendering — crisp pixels, no blur ─────────────────────
           During CSS3 zoom Leaflet scales existing tiles before new ones
           load. 'auto' lets the browser use bilinear filtering which keeps
           text/labels sharp; 'pixelated' would make them blocky.        */
        .leaflet-tile {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: optimizeQuality;
          image-rendering: auto;
          will-change: transform;
        }

        /* ── Zoom animation — GPU path, no subpixel shift ───────────────
           will-change promotes the element to its own layer BEFORE the
           animation starts, preventing the browser from needing to
           re-rasterize through a parent filter mid-animation.           */
        .leaflet-zoom-animated {
          will-change: transform;
          transform-origin: 0 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        /* ── Marker & popup elements — force subpixel antialiasing ──────
           div icons (our custom markers) must not inherit any blur from
           parent stacking contexts. Force onto own GPU layer.           */
        .leaflet-marker-icon,
        .leaflet-div-icon,
        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip-container {
          filter: none !important;
          -webkit-filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          -webkit-font-smoothing: subpixel-antialiased;
        }

        /* ── Popup styling ───────────────────────────────────────────── */
        .medfusion-popup .leaflet-popup-content-wrapper {
          border-radius: 10px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35) !important;
          border: 1px solid rgba(0,0,0,0.08) !important;
        }
        .medfusion-popup .leaflet-popup-tip { background: white !important; }
        .leaflet-control-attribution { font-size: 0.58rem !important; opacity: 0.6; }
      `}</style>
    </div>
  );
}
