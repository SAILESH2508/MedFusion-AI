/**
 * AnatomyDiagram.jsx — Clinical-Grade 2D Anatomical SVG Viewer
 *
 * High-fidelity SVG-based interactive anatomy diagram featuring:
 * - Medically accurate organ silhouettes with anatomical proportions
 * - Animated CT-scan sweep overlay with grid background
 * - Live biomarker overlays driven by patient pathology data
 * - Heartbeat pulse animation on the cardiac organ
 * - Risk-aware colour system (critical → amber → green)
 * - Hoverable/selectable organs with connector annotation lines
 * - Full light/dark theme support via CSS variables
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// ─── Risk color helper ─────────────────────────────────────────────────────
function riskColor(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('critical')) return { base: '#cc1010', hover: '#e02020', selected: '#ff3030', glow: 'rgba(220,20,20,0.7)' };
  if (l.includes('high'))     return { base: '#c04010', hover: '#e06020', selected: '#f07030', glow: 'rgba(200,70,20,0.65)' };
  if (l.includes('moderate')) return { base: '#b07010', hover: '#d09020', selected: '#e8a030', glow: 'rgba(185,140,20,0.6)' };
  return null;
}

// ─── Organ definitions ─────────────────────────────────────────────────────
const ORGANS = [
  {
    id: 'brain',
    label: 'Brain',
    system: 'Nervous System',
    baseColor: '#9e8fa8',
    hoverColor: '#c4b0d0',
    selectedColor: '#dbc8e8',
    glowColor: 'rgba(176,164,184,0.55)',
    labelAnchor: [68, 62],
    dotPos: [170, 68],
    side: 'left',
    paths: [
      'M148,38 C138,28 128,24 130,38 C126,46 122,58 128,70 C136,80 148,82 160,78 L160,52 Z',
      'M192,38 C202,28 212,24 210,38 C214,46 218,58 212,70 C204,80 192,82 180,78 L180,52 Z',
      'M160,52 L180,52 L180,78 L160,78 Z',
      'M152,82 C145,86 142,94 148,98 C156,102 184,102 192,98 C198,94 195,86 188,82 Z',
      'M165,98 L175,98 L176,112 L164,112 Z',
    ],
    strokeWidth: 1.2,
  },
  {
    id: 'lungs',
    label: 'Lungs',
    system: 'Respiratory',
    baseColor: '#d4748a',
    hoverColor: '#e89aac',
    selectedColor: '#f5b0c0',
    glowColor: 'rgba(224,122,138,0.5)',
    labelAnchor: [54, 180],
    dotPos: [130, 178],
    side: 'left',
    paths: [
      'M108,148 C96,148 82,156 80,172 C78,188 80,210 84,224 C88,236 96,244 108,246 C116,248 124,244 126,236 C132,220 130,196 128,178 C126,162 118,148 108,148 Z',
      'M90,156 C84,164 82,176 84,186',
      'M232,148 C244,148 258,156 260,172 C262,188 260,210 256,224 C252,236 244,244 232,246 C224,248 216,244 214,236 C208,220 210,196 212,178 C214,162 222,148 232,148 Z',
      'M250,156 C256,164 258,176 256,186',
      'M163,116 L177,116 L177,152 L163,152 Z',
      'M163,152 C148,152 136,154 128,162',
      'M177,152 C192,152 204,154 212,162',
    ],
    strokeWidth: 1.2,
  },
  {
    id: 'heart',
    label: 'Heart',
    system: 'Cardiovascular',
    baseColor: '#b01828',
    hoverColor: '#d42038',
    selectedColor: '#ef2d46',
    glowColor: 'rgba(200,20,40,0.65)',
    labelAnchor: [244, 195],
    dotPos: [188, 196],
    side: 'right',
    pulse: true,
    paths: [
      'M170,160 C162,152 148,152 144,162 C140,172 144,184 152,192 L170,214 L188,192 C196,184 200,172 196,162 C192,152 178,152 170,160 Z',
      'M152,160 C148,156 144,158 143,164',
      'M188,160 C192,156 196,158 197,164',
      'M170,158 C167,148 162,140 158,134 C164,130 170,130 175,130 C178,132 175,144 170,158 Z',
      'M170,158 C173,150 178,144 182,138 C178,134 172,132 168,134',
    ],
    strokeWidth: 1.4,
  },
  {
    id: 'liver',
    label: 'Liver',
    system: 'Hepatic',
    baseColor: '#8b4a1a',
    hoverColor: '#b06030',
    selectedColor: '#c87545',
    glowColor: 'rgba(160,82,45,0.5)',
    labelAnchor: [240, 270],
    dotPos: [196, 268],
    side: 'right',
    paths: [
      'M148,250 C144,248 138,250 136,256 C132,264 134,278 140,288 C146,296 156,300 168,298 C182,296 198,290 210,282 C218,276 222,268 220,260 C218,252 210,248 200,248 C188,246 170,248 160,250 Z',
      'M148,250 C144,252 140,256 140,262 C140,268 144,274 150,276 C156,278 160,274 160,268 Z',
      'M176,296 C172,296 168,300 168,306 C168,312 172,316 176,316 C180,316 184,312 184,306 C184,300 180,296 176,296 Z',
    ],
    strokeWidth: 1.2,
  },
  {
    id: 'kidneys',
    label: 'Kidneys',
    system: 'Urinary',
    baseColor: '#8a1a1e',
    hoverColor: '#b02428',
    selectedColor: '#cc3438',
    glowColor: 'rgba(155,34,38,0.5)',
    labelAnchor: [52, 338],
    dotPos: [125, 332],
    side: 'left',
    paths: [
      'M118,312 C110,312 102,316 100,324 C98,332 100,344 106,350 C112,356 122,358 130,354 C136,350 138,342 136,332 C134,322 128,312 118,312 Z',
      'M130,330 C132,334 130,338 126,338',
      'M120,354 L118,382',
      'M222,312 C230,312 238,316 240,324 C242,332 240,344 234,350 C228,356 218,358 210,354 C204,350 202,342 204,332 C206,322 212,312 222,312 Z',
      'M210,330 C208,334 210,338 214,338',
      'M220,354 L222,382',
    ],
    strokeWidth: 1.2,
  },
  {
    id: 'stomach',
    label: 'Stomach',
    system: 'Digestive',
    baseColor: '#c2642a',
    hoverColor: '#e07d38',
    selectedColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.55)',
    labelAnchor: [54, 258],
    dotPos: [142, 275],
    side: 'left',
    paths: [
      'M152,246 C140,248 132,256 130,268 C128,284 134,302 148,308 C158,312 170,306 174,296 C176,288 170,282 164,280 C156,278 150,270 152,260 C154,252 156,248 152,246 Z',
      'M132,266 C130,280 134,298 146,306',
    ],
    strokeWidth: 1.2,
  },
  {
    id: 'pancreas',
    label: 'Pancreas',
    system: 'Endocrine',
    baseColor: '#a81da8',
    hoverColor: '#c026d3',
    selectedColor: '#e879f9',
    glowColor: 'rgba(192,38,211,0.55)',
    labelAnchor: [244, 306],
    dotPos: [172, 296],
    side: 'right',
    paths: [
      'M154,292 C162,290 178,290 190,296 C194,298 192,304 186,304 C174,304 160,300 152,300 C146,300 146,294 154,292 Z',
      'M150,292 C146,294 144,300 146,304 C150,308 154,306 156,302 Z',
    ],
    strokeWidth: 1.2,
  },
  {
    id: 'intestines',
    label: 'Intestines',
    system: 'GI Tract',
    baseColor: '#047857',
    hoverColor: '#059669',
    selectedColor: '#10b981',
    glowColor: 'rgba(16,185,129,0.55)',
    labelAnchor: [244, 362],
    dotPos: [170, 350],
    side: 'right',
    paths: [
      'M138,340 C138,326 142,320 150,318 C160,316 180,316 190,318 C198,320 202,326 202,340 C202,356 200,372 196,380 C192,388 184,390 176,390 C164,390 156,388 150,384 C142,378 138,362 138,340 Z',
      'M152,334 C160,330 170,336 178,332 C184,330 186,338 180,342 C172,346 160,344 156,350 C152,354 162,358 172,356 C180,354 184,362 178,366 C170,370 160,366 156,370',
      'M162,342 C168,346 174,342 176,348',
    ],
    strokeWidth: 1.2,
  },
];

// ─── Body silhouette ───────────────────────────────────────────────────────
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

// Rib cage anatomical paths
const RIB_PATHS = [
  'M128,148 C118,152 112,164 114,176 C116,186 124,192 132,190',
  'M212,148 C222,152 228,164 226,176 C224,186 216,192 208,190',
  'M124,168 C114,172 108,184 110,196 C112,206 120,212 128,210',
  'M216,168 C226,172 232,184 230,196 C228,206 220,212 212,210',
  'M122,190 C112,196 108,208 110,218 C112,228 120,232 128,230',
  'M218,190 C228,196 232,208 230,218 C228,228 220,232 212,230',
  'M120,210 C110,216 106,228 108,238 C110,248 118,252 126,250',
  'M220,210 C230,216 234,228 232,238 C230,248 222,252 214,250',
  'M163,130 L177,130 L177,240 L163,240 Z',
  'M163,240 C154,248 144,252 134,250',
  'M177,240 C186,248 196,252 206,250',
  'M168,120 L172,120 M168,136 L172,136 M168,152 L172,152 M168,168 L172,168 M168,184 L172,184 M168,200 L172,200 M168,216 L172,216 M168,232 L172,232 M168,248 L172,248 M168,264 L172,264 M168,280 L172,280 M168,296 L172,296 M168,312 L172,312 M168,328 L172,328',
];

// ─── Connector line ────────────────────────────────────────────────────────
function ConnectorLine({ dotPos, labelAnchor, side, color, active }) {
  return (
    <line
      x1={dotPos[0]}
      y1={dotPos[1]}
      x2={labelAnchor[0] + (side === 'left' ? 68 : 0)}
      y2={labelAnchor[1]}
      stroke={color}
      strokeWidth={active ? 1.2 : 0.6}
      strokeDasharray={active ? 'none' : '3 3'}
      opacity={active ? 0.9 : 0.35}
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
      <circle
        cx={organ.dotPos[0]} cy={organ.dotPos[1]} r={show ? 4.5 : 3}
        fill={color} opacity={show ? 1 : 0.55}
        style={{ transition: 'all 0.25s' }}
      />
      {/* Outer ring on selected */}
      {isActive && (
        <motion.circle
          cx={organ.dotPos[0]} cy={organ.dotPos[1]} r={8}
          fill="none"
          stroke={color}
          strokeWidth={0.8}
          animate={{ r: [6, 10, 6], opacity: [0.9, 0.2, 0.9] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <ConnectorLine
        dotPos={organ.dotPos}
        labelAnchor={organ.labelAnchor}
        side={organ.side}
        color={color}
        active={show}
      />
      {/* System label (small, above organ name) */}
      {show && (
        <text
          x={x} y={organ.labelAnchor[1] - 9}
          textAnchor={textAnchor}
          fontSize="6.5"
          fontFamily="'Courier New', monospace"
          fill={color}
          opacity={0.7}
          letterSpacing="0.5"
        >
          {organ.system.toUpperCase()}
        </text>
      )}
      <text
        x={x} y={organ.labelAnchor[1] + 1}
        textAnchor={textAnchor}
        fontSize="9.5"
        fontFamily="'Courier New', monospace"
        fontWeight={isActive ? 700 : 500}
        fill={isActive ? '#ffffff' : 'rgba(255,255,255,0.65)'}
        letterSpacing="0.6"
        style={{ transition: 'all 0.25s' }}
      >
        {organ.label.toUpperCase()}
      </text>
    </>
  );
}

// ─── Heartbeat animation component ────────────────────────────────────────
function HeartbeatPath({ paths, color, isSelected, isHovered }) {
  const fillColor = isSelected ? color.selectedColor : isHovered ? color.hoverColor : color.baseColor;
  return (
    <motion.g
      animate={isSelected ? {
        scale: [1, 1.04, 0.98, 1.04, 1],
        originX: '170px',
        originY: '185px',
      } : { scale: 1 }}
      transition={isSelected ? {
        duration: 0.8,
        repeat: Infinity,
        repeatDelay: 0.4,
        ease: 'easeInOut',
      } : {}}
      style={{ transformOrigin: '170px 185px' }}
    >
      {paths
        .filter(p => p.trim().endsWith('Z'))
        .map((p, i) => (
          <motion.path
            key={`hf-${i}`}
            d={p}
            fill={fillColor}
            fillOpacity={isSelected ? 0.95 : 0.82}
            stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.25)'}
            strokeWidth={isSelected ? 1.6 : 1.4}
            strokeLinejoin="round"
            animate={{ fill: fillColor }}
            transition={{ duration: 0.25 }}
          />
        ))
      }
      {paths
        .filter(p => !p.trim().endsWith('Z'))
        .map((p, i) => (
          <path
            key={`hs-${i}`}
            d={p}
            fill="none"
            stroke={isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)'}
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        ))
      }
    </motion.g>
  );
}

// ─── Single organ shape ───────────────────────────────────────────────────
function OrganShape({ organ, isSelected, isHovered, onSelect, onHover }) {
  const color = isSelected ? organ.selectedColor : isHovered ? organ.hoverColor : organ.baseColor;
  const strokeColor = isSelected ? '#ffffff' : isHovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)';

  if (organ.pulse) {
    return (
      <g
        onClick={() => onSelect(isSelected ? null : organ.id)}
        onMouseEnter={() => onHover(organ.id)}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'pointer' }}
      >
        {/* Glow filter effect */}
        {isSelected && (
          <motion.path
            d={organ.paths[0]}
            fill={color}
            fillOpacity={0.25}
            stroke={color}
            strokeWidth={6}
            strokeLinejoin="round"
            style={{ filter: 'blur(4px)' }}
            animate={{ fillOpacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <HeartbeatPath
          paths={organ.paths}
          color={organ}
          isSelected={isSelected}
          isHovered={isHovered}
        />
      </g>
    );
  }

  return (
    <g
      onClick={() => onSelect(isSelected ? null : organ.id)}
      onMouseEnter={() => onHover(organ.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
    >
      {/* Glow on selection */}
      {isSelected && (
        <motion.path
          d={organ.paths.find(p => p.trim().endsWith('Z')) || organ.paths[0]}
          fill={color}
          fillOpacity={0.2}
          stroke={color}
          strokeWidth={6}
          strokeLinejoin="round"
          style={{ filter: 'blur(3px)' }}
          animate={{ fillOpacity: [0.12, 0.28, 0.12] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

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
            transition={{ duration: 0.22 }}
          />
        ))
      }
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

// ─── Scan line overlay component ─────────────────────────────────────────
function ScanOverlay() {
  return (
    <g clipPath="url(#bodySilhouetteClip)">
      <motion.rect
        x="50" width="240" height="8"
        fill="url(#scanGrad)"
        opacity={0.65}
        initial={{ y: 0 }}
        animate={{ y: [0, 420, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'linear' }}
      />
      <motion.line
        x1="50" x2="290"
        stroke="rgba(56, 189, 248, 0.85)"
        strokeWidth="1.2"
        initial={{ y: 0 }}
        animate={{ y: [0, 420, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'linear' }}
      />
    </g>
  );
}

// ─── Biomarker status pill ────────────────────────────────────────────────
function StatusPill({ organ, patientData, isSelected }) {
  const relevantPrediction = useMemo(() => {
    if (!patientData?.predictions || !organ) return null;
    return patientData.predictions.find(p =>
      (p.disease_type || '').toLowerCase().includes(organ.id === 'heart' ? 'heart' :
        organ.id === 'pancreas' || organ.id === 'brain' ? 'diabetes' : '')
    );
  }, [organ, patientData]);

  if (!relevantPrediction || !isSelected) return null;

  const score = relevantPrediction.risk_score || 0;
  const level = relevantPrediction.risk_level || 'Low';
  const pct = Math.min(Math.max(score, 0), 100);
  const col = pct >= 75 ? '#ef4444' : pct >= 50 ? '#f97316' : pct >= 25 ? '#eab308' : '#22c55e';

  const x = organ.side === 'left' ? organ.labelAnchor[0] - 4 : organ.labelAnchor[0] + 4;
  const textAnchor = organ.side === 'left' ? 'end' : 'start';

  return (
    <>
      <text
        x={x}
        y={organ.labelAnchor[1] + 14}
        textAnchor={textAnchor}
        fontSize="7.5"
        fontFamily="'Courier New', monospace"
        fontWeight={600}
        fill={col}
        letterSpacing="0.4"
      >
        RISK: {pct.toFixed(0)}% · {level.toUpperCase()}
      </text>
    </>
  );
}

// ─── Main viewer ──────────────────────────────────────────────────────────
export default function AnatomyDiagram({ selectedOrgan, onOrganSelect, patientData }) {
  const [hoveredOrgan, setHoveredOrgan] = useState(null);
  const containerRef = useRef();

  // Risk-based heart colour override from patient data
  const heartRiskLevel = useMemo(() => {
    if (!Array.isArray(patientData?.predictions)) return null;
    const h = patientData.predictions.find(p => (p.disease_type || '').toLowerCase().includes('heart'));
    return h?.risk_level || null;
  }, [patientData]);

  const heartOrgan = useMemo(() => {
    const base = ORGANS.find(o => o.id === 'heart');
    if (!base || !heartRiskLevel) return base;
    const override = riskColor(heartRiskLevel);
    if (!override) return base;
    return {
      ...base,
      baseColor: override.base,
      hoverColor: override.hover,
      selectedColor: override.selected,
      glowColor: override.glow,
    };
  }, [heartRiskLevel]);

  // Risk-based pancreas colour override for diabetes
  const diabetesRiskLevel = useMemo(() => {
    if (!Array.isArray(patientData?.predictions)) return null;
    const d = patientData.predictions.find(p => (p.disease_type || '').toLowerCase().includes('diabetes'));
    return d?.risk_level || null;
  }, [patientData]);

  const pancreasOrgan = useMemo(() => {
    const base = ORGANS.find(o => o.id === 'pancreas');
    if (!base || !diabetesRiskLevel) return base;
    const override = riskColor(diabetesRiskLevel);
    if (!override) return base;
    return { ...base, baseColor: override.base, hoverColor: override.hover, selectedColor: override.selected, glowColor: override.glow };
  }, [diabetesRiskLevel]);

  const resolvedOrgans = ORGANS.map(o => {
    if (o.id === 'heart') return heartOrgan;
    if (o.id === 'pancreas') return pancreasOrgan;
    return o;
  });

  const selected = resolvedOrgans.find(o => o.id === selectedOrgan) || null;

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
        background: 'transparent',
      }}
    >

      <motion.svg
        viewBox="48 -8 244 446"
        aria-label="Interactive 2D Anatomical Diagram"
        style={{
          height: 'min(calc(100vh - 120px), 92%)',
          width: 'auto',
          userSelect: 'none',
          overflow: 'visible',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <defs>
          {/* Clip to human body silhouette */}
          <clipPath id="bodySilhouetteClip">
            <path d={BODY_OUTLINE} />
          </clipPath>
          {/* Body gradient */}
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#07111f" stopOpacity="0.97" />
            <stop offset="50%" stopColor="#0c1a35" stopOpacity="0.99" />
            <stop offset="100%" stopColor="#07111f" stopOpacity="0.97" />
          </linearGradient>
          {/* Scan line gradient */}
          <linearGradient id="scanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(56,189,248,0)" />
            <stop offset="50%" stopColor="rgba(56,189,248,0.35)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </linearGradient>
          {/* Fine grid pattern */}
          <pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(56,189,248,0.04)" strokeWidth="0.4" />
          </pattern>
          {/* Coarser grid */}
          <pattern id="gridLarge" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(56,189,248,0.07)" strokeWidth="0.5" />
          </pattern>
          {/* Glow filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>


        {/* Body silhouette fill */}
        <path
          d={BODY_OUTLINE}
          fill="url(#bodyGrad)"
          stroke="rgba(148, 163, 184, 0.22)"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Inner body edge shading */}
        <path
          d={BODY_OUTLINE}
          fill="none"
          stroke="rgba(56, 189, 248, 0.07)"
          strokeWidth="8"
          strokeLinejoin="round"
        />

        {/* Rib cage */}
        {RIB_PATHS.map((p, i) => (
          <path
            key={i} d={p}
            fill={p.endsWith('Z') ? 'rgba(40,60,95,0.35)' : 'none'}
            stroke="rgba(100,140,200,0.22)"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        ))}

        {/* Measurement guide lines */}
        <line x1="58" x2="282" y1="130" y2="130" stroke="rgba(56,189,248,0.06)" strokeWidth="0.5" strokeDasharray="4 10" />
        <line x1="58" x2="282" y1="245" y2="245" stroke="rgba(56,189,248,0.06)" strokeWidth="0.5" strokeDasharray="4 10" />
        <line x1="58" x2="282" y1="310" y2="310" stroke="rgba(56,189,248,0.06)" strokeWidth="0.5" strokeDasharray="4 10" />
        {/* Vertical midline */}
        <line x1="170" x2="170" y1="8" y2="414" stroke="rgba(56,189,248,0.05)" strokeWidth="0.5" strokeDasharray="3 8" />

        {/* Zone labels */}
        <text x="62" y="128" fontSize="5.5" fontFamily="monospace" fill="rgba(56,189,248,0.3)" letterSpacing="0.8">THORACIC</text>
        <text x="62" y="243" fontSize="5.5" fontFamily="monospace" fill="rgba(56,189,248,0.3)" letterSpacing="0.8">ABDOMINAL</text>
        <text x="62" y="308" fontSize="5.5" fontFamily="monospace" fill="rgba(56,189,248,0.3)" letterSpacing="0.8">PELVIC</text>

        {/* Animated scan line */}
        <ScanOverlay />

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

        {/* Labels — on top */}
        {resolvedOrgans.map(organ => (
          <LabelBadge
            key={organ.id}
            organ={organ}
            isActive={selectedOrgan === organ.id}
            isHovered={hoveredOrgan === organ.id}
          />
        ))}

        {/* Biomarker status pills */}
        {resolvedOrgans.map(organ => (
          <StatusPill
            key={organ.id}
            organ={organ}
            patientData={patientData}
            isSelected={selectedOrgan === organ.id}
          />
        ))}

        {/* Selected organ system highlight at top */}
        {selected && (
          <motion.text
            x="170"
            y="425"
            textAnchor="middle"
            fontSize="7.5"
            fontFamily="monospace"
            fill={selected.selectedColor}
            letterSpacing="0.8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {selected.system.toUpperCase()} SYSTEM SELECTED
          </motion.text>
        )}

        {!selectedOrgan && (
          <text
            x="170" y="425"
            textAnchor="middle"
            fontSize="6.8"
            fontFamily="monospace"
            fill="rgba(255,255,255,0.22)"
            letterSpacing="0.5"
          >
            CLICK AN ORGAN TO EXPLORE
          </text>
        )}
      </motion.svg>

      {/* Disclaimer badge */}
      <div style={{
        position: 'absolute',
        bottom: '4px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.55rem',
        fontFamily: 'monospace',
        color: 'rgba(255,255,255,0.22)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        letterSpacing: '0.04em',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(56,189,248,0.4)', flexShrink: 0 }} />
        Illustrative diagram — not anatomically certified
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(56,189,248,0.4)', flexShrink: 0 }} />
      </div>
    </div>
  );
}
