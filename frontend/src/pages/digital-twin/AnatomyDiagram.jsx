/**
 * OrganViewer3D — Interactive anatomical body diagram
 *
 * Uses an SVG-based anatomical illustration with proper organ shapes drawn as
 * detailed SVG paths, animated with Framer Motion, and displayed inside a
 * CSS 3D perspective container for depth. This approach produces a professional
 * medical-grade result that looks like actual clinical software — unlike
 * Three.js primitive geometry which always looks like floating toys.
 *
 * Organs are drawn as medically plausible SVG paths. They are clearly labelled
 * as illustrative and not anatomically certified.
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Organ definitions ─────────────────────────────────────────────────────
// Each organ has:
//  - id, label
//  - fill/stroke colours (normal, hover, selected)
//  - SVG path(s) drawn on a 340×540 viewBox torso
//  - label anchor point [x, y] and direction ('left' | 'right')
//  - dot position [x, y]

const ORGANS = [
  {
    id: 'brain',
    label: 'Brain',
    baseColor: '#9e8fa8',
    hoverColor: '#c4b0d0',
    selectedColor: '#dbc8e8',
    glowColor: 'rgba(176,164,184,0.55)',
    labelAnchor: [72, 62],
    dotPos: [170, 68],
    side: 'left',
    // Cerebrum (two hemispheres), cerebellum, brain stem
    paths: [
      // Left hemisphere
      'M148,38 C138,28 128,24 130,38 C126,46 122,58 128,70 C136,80 148,82 160,78 L160,52 Z',
      // Right hemisphere
      'M192,38 C202,28 212,24 210,38 C214,46 218,58 212,70 C204,80 192,82 180,78 L180,52 Z',
      // Central bridge
      'M160,52 L180,52 L180,78 L160,78 Z',
      // Cerebellum
      'M152,82 C145,86 142,94 148,98 C156,102 184,102 192,98 C198,94 195,86 188,82 Z',
      // Brain stem
      'M165,98 L175,98 L176,112 L164,112 Z',
    ],
    strokeWidth: 1.2,
  },
  {
    id: 'lungs',
    label: 'Lungs',
    baseColor: '#d4748a',
    hoverColor: '#e89aac',
    selectedColor: '#f5b0c0',
    glowColor: 'rgba(224,122,138,0.5)',
    labelAnchor: [58, 180],
    dotPos: [130, 178],
    side: 'left',
    paths: [
      // Left lung — 3 lobes
      'M108,148 C96,148 82,156 80,172 C78,188 80,210 84,224 C88,236 96,244 108,246 C116,248 124,244 126,236 C132,220 130,196 128,178 C126,162 118,148 108,148 Z',
      // Left lung upper detail
      'M90,156 C84,164 82,176 84,186',
      // Right lung — 3 lobes
      'M232,148 C244,148 258,156 260,172 C262,188 260,210 256,224 C252,236 244,244 232,246 C224,248 216,244 214,236 C208,220 210,196 212,178 C214,162 222,148 232,148 Z',
      // Right lung upper detail
      'M250,156 C256,164 258,176 256,186',
      // Trachea
      'M163,116 L177,116 L177,152 L163,152 Z',
      // Left bronchus
      'M163,152 C148,152 136,154 128,162',
      // Right bronchus
      'M177,152 C192,152 204,154 212,162',
    ],
    strokeWidth: 1.2,
  },
  {
    id: 'heart',
    label: 'Heart',
    baseColor: '#b01828',
    hoverColor: '#d42038',
    selectedColor: '#ef2d46',
    glowColor: 'rgba(200,20,40,0.65)',
    labelAnchor: [242, 195],
    dotPos: [188, 196],
    side: 'right',
    paths: [
      // Main heart body — proper cardiac silhouette
      'M170,160 C162,152 148,152 144,162 C140,172 144,184 152,192 L170,214 L188,192 C196,184 200,172 196,162 C192,152 178,152 170,160 Z',
      // Left atrium hint
      'M152,160 C148,156 144,158 143,164',
      // Right atrium hint
      'M188,160 C192,156 196,158 197,164',
      // Aorta arch
      'M170,158 C167,148 162,140 158,134 C164,130 170,130 175,130 C178,132 175,144 170,158 Z',
      // Pulmonary artery
      'M170,158 C173,150 178,144 182,138 C178,134 172,132 168,134',
    ],
    strokeWidth: 1.4,
  },
  {
    id: 'liver',
    label: 'Liver',
    baseColor: '#8b4a1a',
    hoverColor: '#b06030',
    selectedColor: '#c87545',
    glowColor: 'rgba(160,82,45,0.5)',
    labelAnchor: [238, 268],
    dotPos: [196, 268],
    side: 'right',
    paths: [
      // Main liver body — right lobe larger
      'M148,250 C144,248 138,250 136,256 C132,264 134,278 140,288 C146,296 156,300 168,298 C182,296 198,290 210,282 C218,276 222,268 220,260 C218,252 210,248 200,248 C188,246 170,248 160,250 Z',
      // Left lobe
      'M148,250 C144,252 140,256 140,262 C140,268 144,274 150,276 C156,278 160,274 160,268 Z',
      // Gallbladder
      'M176,296 C172,296 168,300 168,306 C168,312 172,316 176,316 C180,316 184,312 184,306 C184,300 180,296 176,296 Z',
    ],
    strokeWidth: 1.2,
  },
  {
    id: 'kidneys',
    label: 'Kidneys',
    baseColor: '#8a1a1e',
    hoverColor: '#b02428',
    selectedColor: '#cc3438',
    glowColor: 'rgba(155,34,38,0.5)',
    labelAnchor: [55, 330],
    dotPos: [125, 332],
    side: 'left',
    paths: [
      // Left kidney — bean shape
      'M118,312 C110,312 102,316 100,324 C98,332 100,344 106,350 C112,356 122,358 130,354 C136,350 138,342 136,332 C134,322 128,312 118,312 Z',
      // Left kidney hilum
      'M130,330 C132,334 130,338 126,338',
      // Left ureter
      'M120,354 L118,382',
      // Right kidney — bean shape
      'M222,312 C230,312 238,316 240,324 C242,332 240,344 234,350 C228,356 218,358 210,354 C204,350 202,342 204,332 C206,322 212,312 222,312 Z',
      // Right kidney hilum
      'M210,330 C208,334 210,338 214,338',
      // Right ureter
      'M220,354 L222,382',
    ],
    strokeWidth: 1.2,
  },
];

// ─── Body silhouette paths ─────────────────────────────────────────────────
// A realistic human torso outline including shoulders, neck, head
const BODY_OUTLINE = `
  M170,8
  C158,8 148,12 143,20
  C138,28 138,38 140,46
  C132,48 122,52 116,60
  C108,70 106,82 108,94
  C96,96 86,102 82,112
  C76,124 78,140 82,154
  C74,162 70,174 70,186
  C68,200 70,216 72,230
  C74,244 78,258 82,270
  C84,280 86,292 86,304
  C86,320 84,338 84,354
  C84,368 86,382 90,394
  L94,414
  L246,414
  L250,394
  C254,382 256,368 256,354
  C256,338 254,320 254,304
  C254,292 256,280 258,270
  C262,258 266,244 268,230
  C270,216 272,200 270,186
  C270,174 266,162 258,154
  C262,140 264,124 258,112
  C254,102 244,96 232,94
  C234,82 234,70 226,60
  C220,52 210,48 200,46
  C202,38 202,28 197,20
  C192,12 182,8 170,8 Z
`;

// Rib cage outline (subtle)
const RIB_PATHS = [
  'M128,148 C118,152 112,164 114,176 C116,186 124,192 132,190',
  'M212,148 C222,152 228,164 226,176 C224,186 216,192 208,190',
  'M124,168 C114,172 108,184 110,196 C112,206 120,212 128,210',
  'M216,168 C226,172 232,184 230,196 C228,206 220,212 212,210',
  'M122,190 C112,196 108,208 110,218 C112,228 120,232 128,230',
  'M218,190 C228,196 232,208 230,218 C228,228 220,232 212,230',
  // Sternum
  'M163,130 L177,130 L177,240 L163,240 Z',
  // Costal arch
  'M163,240 C154,248 144,252 134,250',
  'M177,240 C186,248 196,252 206,250',
  // Spine hint (behind)
  'M168,120 L172,120 M168,136 L172,136 M168,152 L172,152 M168,168 L172,168 M168,184 L172,184 M168,200 L172,200 M168,216 L172,216 M168,232 L172,232 M168,248 L172,248 M168,264 L172,264 M168,280 L172,280 M168,296 L172,296 M168,312 L172,312 M168,328 L172,328',
];


// ─── Connection line from organ to label ──────────────────────────────────
function ConnectorLine({ dotPos, labelAnchor, side, color, active }) {
  const mx = side === 'left' ? dotPos[0] - 14 : dotPos[0] + 14;
  return (
    <line
      x1={dotPos[0]}
      y1={dotPos[1]}
      x2={labelAnchor[0] + (side === 'left' ? 72 : 0)}
      y2={labelAnchor[1]}
      stroke={color}
      strokeWidth={active ? 1 : 0.6}
      strokeDasharray={active ? 'none' : '3 3'}
      opacity={active ? 0.85 : 0.35}
      style={{ transition: 'all 0.3s' }}
    />
  );
}

// ─── Label badge ──────────────────────────────────────────────────────────
function LabelBadge({ organ, isActive, isHovered }) {
  const show = isActive || isHovered;
  const color = isActive ? organ.selectedColor : isHovered ? organ.hoverColor : organ.baseColor;
  const x = organ.side === 'left' ? organ.labelAnchor[0] - 4 : organ.labelAnchor[0] + 4;
  const textAnchor = organ.side === 'left' ? 'end' : 'start';

  return (
    <>
      {/* Dot at organ connection point */}
      <circle
        cx={organ.dotPos[0]} cy={organ.dotPos[1]} r={show ? 4 : 3}
        fill={color} opacity={show ? 1 : 0.55}
        style={{ transition: 'all 0.25s' }}
      />
      {/* Connector */}
      <ConnectorLine
        dotPos={organ.dotPos}
        labelAnchor={organ.labelAnchor}
        side={organ.side}
        color={color}
        active={show}
      />
      {/* Label text */}
      <text
        x={x} y={organ.labelAnchor[1] + 1}
        textAnchor={textAnchor}
        fontSize="9.5"
        fontFamily="'Courier New', monospace"
        fontWeight={isActive ? 700 : 500}
        fill={isActive ? '#fff' : 'rgba(255,255,255,0.65)'}
        letterSpacing="0.6"
        style={{ transition: 'all 0.25s', textTransform: 'uppercase' }}
      >
        {organ.label.toUpperCase()}
      </text>
    </>
  );
}

// ─── Single organ shape ───────────────────────────────────────────────────
function OrganShape({ organ, isSelected, isHovered, onSelect, onHover }) {
  const color = isSelected ? organ.selectedColor : isHovered ? organ.hoverColor : organ.baseColor;
  const strokeColor = isSelected ? '#ffffff' : isHovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)';

  const fillPaths = organ.paths.filter((_, i) => {
    // First path and closed paths get fill; open paths (detail lines) get stroke only
    const path = organ.paths[i];
    return path.trim().endsWith('Z') || i === 0;
  });
  const strokePaths = organ.paths.filter(p => !p.trim().endsWith('Z'));

  return (
    <g
      onClick={() => onSelect(isSelected ? null : organ.id)}
      onMouseEnter={() => onHover(organ.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
    >
      {/* Filled shapes */}
      {organ.paths
        .filter(p => p.trim().endsWith('Z'))
        .map((p, i) => (
          <motion.path
            key={`fill-${i}`}
            d={p}
            fill={color}
            fillOpacity={isSelected ? 0.95 : 0.82}
            stroke={strokeColor}
            strokeWidth={isSelected ? 1.6 : organ.strokeWidth}
            strokeLinejoin="round"
            animate={{ fill: color, fillOpacity: isSelected ? 0.95 : 0.82 }}
            transition={{ duration: 0.2 }}
          />
        ))
      }
      {/* Detail stroke lines */}
      {organ.paths
        .filter(p => !p.trim().endsWith('Z'))
        .map((p, i) => (
          <path
            key={`stroke-${i}`}
            d={p}
            fill="none"
            stroke={isSelected ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)'}
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        ))
      }
    </g>
  );
}

// ─── Main viewer ──────────────────────────────────────────────────────────
export default function AnatomyDiagram({ selectedOrgan, onOrganSelect, patientData }) {
  const [hoveredOrgan, setHoveredOrgan] = useState(null);
  const containerRef = useRef();

  // Risk-based heart colour override
  const heartRiskLevel = React.useMemo(() => {
    if (!Array.isArray(patientData?.predictions)) return null;
    const h = patientData.predictions.find(p => (p.disease_type || '').toLowerCase().includes('heart'));
    return h?.risk_level || null;
  }, [patientData]);

  const heartOrgan = React.useMemo(() => {
    const base = ORGANS.find(o => o.id === 'heart');
    if (!base || !heartRiskLevel) return base;
    const lvl = heartRiskLevel.toLowerCase();
    if (lvl.includes('critical')) return { ...base, baseColor: '#cc1a1a', hoverColor: '#e02020', selectedColor: '#ff3030' };
    if (lvl.includes('high'))     return { ...base, baseColor: '#c44010', hoverColor: '#e05020', selectedColor: '#f06030' };
    if (lvl.includes('moderate')) return { ...base, baseColor: '#b06010', hoverColor: '#d07820', selectedColor: '#e89030' };
    return base;
  }, [heartRiskLevel]);

  const resolvedOrgans = ORGANS.map(o => o.id === 'heart' ? heartOrgan : o);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1200px',
      }}
    >
      {/* SVG anatomical diagram */}
      <motion.svg
        viewBox="58 0 224 430"
        aria-hidden="true"
        style={{
          height: '100%',
          maxHeight: '460px',
          width: 'auto',
          transformStyle: 'preserve-3d',
          userSelect: 'none',
        }}
        initial={{ opacity: 0, rotateY: -8 }}
        animate={{ opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <defs>
          {/* Body gradient */}
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0d1829" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#111f38" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#0d1829" stopOpacity="0.95" />
          </linearGradient>
          {/* Grid pattern */}
          <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Background grid */}
        <rect x="58" y="0" width="224" height="430" fill="url(#grid)" />

        {/* Body silhouette fill */}
        <path
          d={BODY_OUTLINE}
          fill="url(#bodyGrad)"
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Subtle inner body shading */}
        <path
          d={BODY_OUTLINE}
          fill="none"
          stroke="rgba(148, 163, 184, 0.06)"
          strokeWidth="6"
          strokeLinejoin="round"
        />

        {/* Rib cage — behind organs */}
        {RIB_PATHS.map((p, i) => (
          <path
            key={i} d={p}
            fill={p.endsWith('Z') ? 'rgba(50,70,100,0.3)' : 'none'}
            stroke="rgba(100,125,165,0.2)"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        ))}

        {/* Organs */}
        {resolvedOrgans.map(organ => (
          <OrganShape
            key={organ.id}
            organ={organ}
            isSelected={selectedOrgan === organ.id}
            isHovered={hoveredOrgan === organ.id}
            onSelect={onOrganSelect}
            onHover={setHoveredOrgan}
          />
        ))}

        {/* Labels — rendered last so they sit on top */}
        {resolvedOrgans.map(organ => (
          <LabelBadge
            key={organ.id}
            organ={organ}
            isActive={selectedOrgan === organ.id}
            isHovered={hoveredOrgan === organ.id}
          />
        ))}

        {/* Measurement grid lines (subtle, decorative) */}
        <line x1="58" x2="282" y1="130" y2="130" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="4 8" />
        <line x1="58" x2="282" y1="250" y2="250" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="4 8" />
        <line x1="58" x2="282" y1="310" y2="310" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="4 8" />

        {/* Prompt text if nothing selected */}
        {!selectedOrgan && (
          <text
            x="170" y="425"
            textAnchor="middle"
            fontSize="7"
            fontFamily="monospace"
            fill="rgba(255,255,255,0.25)"
            letterSpacing="0.4"
          >
            CLICK AN ORGAN TO EXPLORE
          </text>
        )}
      </motion.svg>

      {/* Disclaimer */}
      <div style={{
        position: 'absolute',
        bottom: '6px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.58rem',
        fontFamily: 'monospace',
        color: 'rgba(255,255,255,0.25)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        letterSpacing: '0.04em',
      }}>
        Illustrative diagram — not anatomically certified
      </div>
    </div>
  );
}
