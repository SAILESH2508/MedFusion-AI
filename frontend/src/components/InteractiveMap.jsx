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
    label: '🗺 Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 21,
    maxNativeZoom: 19,
  },
  satellite: {
    label: '🛰 Satellite',
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

const TYPE_EMOJI = {
  hospital: '🏥',
  clinic:   '🩺',
  pharmacy: '💊',
  dentist:  '🦷',
  lab:      '🔬',
};

// Build a custom div icon for each place type
function createIcon(L, type, isSelected) {
  const color = TYPE_COLORS[type] || '#00f5d4';
  const emoji = TYPE_EMOJI[type] || '📍';
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
      <span style="transform:rotate(45deg);font-size:${isSelected ? 18 : 15}px;line-height:1">${emoji}</span>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size], popupAnchor: [0, -size] });
}

// Pulsing "you are here" icon
function createUserIcon(L) {
  const html = `
    <div style="position:relative;width:20px;height:20px">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(0,245,212,0.25);animation:userPulse 1.5s infinite"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:#00f5d4;border:2px solid #fff;box-shadow:0 0 8px rgba(0,245,212,0.8)"></div>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
}

export default function InteractiveMap({ location, places, isPatient }) {
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

      // User location marker
      const userIcon = createUserIcon(L);
      userMarkerRef.current = L.marker([location.lat, location.lon], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<div style="font-family:monospace;font-size:0.78rem;color:#000;font-weight:bold">📍 Your Location</div>');
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [location]);

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
            <div style="font-weight:700;font-size:0.9rem;color:#111;margin-bottom:4px">${TYPE_EMOJI[place.type] || '📍'} ${place.name}</div>
            ${place.address ? `<div style="font-size:0.75rem;color:#555;margin-bottom:3px">📍 ${place.address}</div>` : ''}
            ${place.phone   ? `<div style="font-size:0.75rem;color:#555;margin-bottom:3px">📞 ${place.phone}</div>` : ''}
            ${place.opening_hours ? `<div style="font-size:0.75rem;color:#555;margin-bottom:6px">🕐 ${place.opening_hours}</div>` : ''}
            <div style="font-size:0.72rem;font-weight:600;color:${color};margin-bottom:8px">
              ${place.distance < 1 ? Math.round(place.distance * 1000) + ' m away' : place.distance.toFixed(1) + ' km away'}
              ${place.emergency ? ' • 🚨 24H EMERGENCY' : ''}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}&travelmode=driving"
                target="_blank"
                style="padding:5px 10px;background:${color};color:#fff;border-radius:6px;font-size:0.68rem;font-weight:700;text-decoration:none;font-family:monospace;text-transform:uppercase">
                🧭 Directions
              </a>
              ${place.phone ? `<a href="tel:${place.phone}" style="padding:5px 10px;background:#f0f0f0;color:#333;border-radius:6px;font-size:0.68rem;font-weight:700;text-decoration:none;font-family:monospace;text-transform:uppercase">📞 Call</a>` : ''}
              ${place.website ? `<a href="${place.website}" target="_blank" style="padding:5px 10px;background:#f0f0f0;color:#333;border-radius:6px;font-size:0.68rem;font-weight:700;text-decoration:none;font-family:monospace;text-transform:uppercase">🌐 Web</a>` : ''}
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
        <h5 className="text-white fw-bold font-monospace m-0" style={{ fontSize: '0.88rem', letterSpacing: '0.06em' }}>
          🗺️ INTERACTIVE MAP — {places.length} FACILITIES
        </h5>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          {/* Layer toggle */}
          {Object.entries(TILE_LAYERS).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setTileLayer(key)}
              className="d-flex align-items-center gap-1 px-2 py-1 rounded font-monospace"
              style={{
                fontSize: '0.65rem', letterSpacing: '0.05em', cursor: 'pointer',
                background: tileLayer === key ? 'rgba(0,245,212,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${tileLayer === key ? 'var(--accent-teal)' : 'rgba(255,255,255,0.08)'}`,
                color: tileLayer === key ? 'var(--accent-teal)' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.2s',
              }}
            >
              {cfg.label}
            </button>
          ))}
          {/* Recenter */}
          <button
            onClick={recenter}
            title="Re-center on my location"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center' }}
          >
            <Crosshair size={14} />
          </button>
          {/* Clear route */}
          {routeInfo && (
            <button
              onClick={clearRoute}
              style={{ background: 'rgba(255,0,85,0.1)', border: '1px solid rgba(255,0,85,0.3)', borderRadius: '6px', color: '#ff3366', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontFamily: 'monospace' }}
            >
              <X size={12} /> Clear Route
            </button>
          )}
        </div>
      </div>

      {/* Route info bar */}
      {routeInfo && (
        <div className="d-flex align-items-center gap-3 mb-2 px-3 py-2 rounded" style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.2)', fontSize: '0.78rem' }}>
          <span className="text-info font-monospace fw-bold">🧭 Route calculated</span>
          <span className="text-secondary">📏 {routeInfo.distance} km</span>
          <span className="text-secondary">⏱ ~{routeInfo.duration} min drive</span>
        </div>
      )}

      {routing && (
        <div className="d-flex align-items-center gap-2 mb-2 px-3 py-2 rounded" style={{ background: 'rgba(0,4,45,0.5)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem' }}>
          <div className="spinner-border text-info" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
          <span className="text-secondary font-monospace">Calculating route via OSRM...</span>
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
          style={{ background: 'rgba(0,4,45,0.6)', border: `1px solid ${TYPE_COLORS[selectedPlace.type] || 'rgba(255,255,255,0.1)'}30` }}>
          <div>
            <p className="text-white fw-bold m-0" style={{ fontSize: '0.88rem' }}>
              {TYPE_EMOJI[selectedPlace.type]} {selectedPlace.name}
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
              style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
            >
              Google Maps
            </a>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="d-flex flex-wrap gap-2 mt-3">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="d-flex align-items-center gap-1" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
            {TYPE_EMOJI[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
          </div>
        ))}
        <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f5d4', border: '1px solid #fff', display: 'inline-block' }} />
          📍 You
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
          background: rgba(0, 4, 30, 0.75) !important;
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
