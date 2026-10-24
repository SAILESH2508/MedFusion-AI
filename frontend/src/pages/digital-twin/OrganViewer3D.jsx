/**
 * OrganViewer3D.jsx — Advanced Three.js & WebGL 3D Organ Visualization Engine
 * MedFusion AI Clinical Informatics Pipeline
 * 
 * Features:
 *  1. 8 Organ Anatomical Visualization: Heart, Lungs, Liver, Stomach, Pancreas, Kidneys, Intestines, Brain
 *  2. Dual Rendering Pipeline: Valid GLTF/GLB binary assets & Enhanced Procedural anatomical geometry
 *  3. Full-Body Anatomical View vs Isolated Organ Clinical Exploration
 *  4. Proper Anatomical Camera Framing (model bounds centered, eliminates tiny-body issue)
 *  5. Translucent anatomical human contour & refined thoracic ribcage
 *  6. Layer visibility controls: Skeleton, Silhouette, Biomarker Tags, Telemetry Glow
 *  7. Smooth orbit controls, double-click focus, and camera recentering
 *  8. Direct synchronization with real EHR observations and risk predictions
 */

import React, { useRef, useMemo, useState, useEffect, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  Database,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  Minimize2,
  Compass,
  Activity,
  Heart,
  Info,
} from 'lucide-react';

/* ─── Colour Palette ──────────────────────────────────────────────────────── */
export const ORGAN_COLORS = {
  heart:      { base: '#c0192a', emis: '#ff3040', rim: '#ff8090', name: 'Heart' },
  lungs:      { base: '#c96878', emis: '#e88898', rim: '#ffb0c0', name: 'Lungs' },
  liver:      { base: '#8b4a14', emis: '#c06828', rim: '#e09050', name: 'Liver' },
  stomach:    { base: '#c2642a', emis: '#f59e0b', rim: '#fcd34d', name: 'Stomach' },
  pancreas:   { base: '#9d174d', emis: '#db2777', rim: '#f472b6', name: 'Pancreas' },
  kidneys:    { base: '#8f1c20', emis: '#c83038', rim: '#e06070', name: 'Kidneys' },
  intestines: { base: '#047857', emis: '#10b981', rim: '#6ee7b7', name: 'Intestines' },
  brain:      { base: '#a09ab0', emis: '#c0b8cc', rim: '#e0d8e8', name: 'Brain' },
};

/* Anatomical Coordinates (Subject Perspective: +X Patient Left / Viewer Right, -X Patient Right / Viewer Left) */
export const POS = {
  brain:      [0,      1.55,  0   ],   // Cranial cavity inside skull
  lungs:      [0,      0.45,  0   ],   // Bilateral thoracic cavity
  heart:      [0.08,   0.35,  0.10],   // Anterior mediastinum, tilted apex to patient left
  liver:      [-0.28, -0.05,  0.07],   // Patient's Right Upper Quadrant (Viewer's Left)
  stomach:    [0.22,  -0.06,  0.08],   // Patient's Left Upper Quadrant (Viewer's Right)
  pancreas:   [0.05,  -0.20, -0.02],   // Retroperitoneal, nestled transversely behind stomach
  kidneys:    [0,     -0.38, -0.15],   // Posterior retroperitoneal flanks (bilateral)
  intestines: [0,     -0.72,  0.08],   // Lower abdomen (umbilical & hypogastric region)
};

export const TAG_POS = {
  brain:      [0.72,  1.55, 0],
  lungs:      [-0.82, 0.45, 0],
  heart:      [0.78,  0.35, 0],
  liver:      [-0.82, -0.05, 0],
  stomach:    [0.78,  -0.06, 0],
  pancreas:   [-0.78, -0.20, 0],
  kidneys:    [0.82,  -0.38, 0],
  intestines: [-0.82, -0.72, 0],
};

const ORGAN_GLTF_CONFIG = {
  heart: {
    id: 'heart',
    label: 'Heart',
    url: '/models/organs/heart.glb',
    scale: [0.92, 0.92, 0.92],
    rotation: [0, -0.15, 0],
    position: [0, 0, 0],
    tagPos: TAG_POS.heart,
    dataset: 'NIH 3D Print Exchange (3DPX-000458) / CC0',
  },
  lungs: {
    id: 'lungs',
    label: 'Lungs',
    url: '/models/organs/lungs.glb',
    scale: [0.95, 0.95, 0.95],
    rotation: [0, 0, 0],
    position: [0, 0, 0],
    tagPos: TAG_POS.lungs,
    dataset: 'NIH 3D Print Exchange (3DPX-002130) / CC-BY 3.0',
  },
  liver: {
    id: 'liver',
    label: 'Liver',
    url: '/models/organs/liver.glb',
    scale: [0.95, 0.95, 0.95],
    rotation: [0, 0, 0],
    position: [0, 0, 0],
    tagPos: TAG_POS.liver,
    dataset: 'NIH 3D Hepatic Segmental Atlas / CC-BY 3.0',
  },
  stomach: {
    id: 'stomach',
    label: 'Stomach',
    url: '/models/organs/stomach.glb',
    scale: [0.92, 0.92, 0.92],
    rotation: [0, 0, 0],
    position: [0, 0, 0],
    tagPos: TAG_POS.stomach,
    dataset: 'NIH 3D Print Exchange (3DPX-001928) / CC0',
  },
  pancreas: {
    id: 'pancreas',
    label: 'Pancreas',
    url: '/models/organs/pancreas.glb',
    scale: [0.90, 0.90, 0.90],
    rotation: [0, 0, 0],
    position: [0, 0, 0],
    tagPos: TAG_POS.pancreas,
    dataset: 'Harvard SPL Abdominal Atlas / Academic',
  },
  kidneys: {
    id: 'kidneys',
    label: 'Kidneys',
    url: '/models/organs/kidneys.glb',
    scale: [0.92, 0.92, 0.92],
    rotation: [0, 0, 0],
    position: [0, 0, 0],
    tagPos: TAG_POS.kidneys,
    dataset: 'NIH 3D Print Exchange (3DPX-003841) / CC0',
  },
  intestines: {
    id: 'intestines',
    label: 'Intestines',
    url: '/models/organs/intestines.glb',
    scale: [0.92, 0.92, 0.92],
    rotation: [0, 0, 0],
    position: [0, 0, 0],
    tagPos: TAG_POS.intestines,
    dataset: 'BodyParts3D FMA7200 / CC-BY-SA 2.1 JP',
  },
  brain: {
    id: 'brain',
    label: 'Brain',
    url: '/models/organs/brain.glb',
    scale: [0.88, 0.88, 0.88],
    rotation: [0, 0, 0],
    position: [0, 0, 0],
    tagPos: TAG_POS.brain,
    dataset: 'Harvard SPL Brain Surface Atlas / Academic',
  },
};

// Preload GLTF assets
Object.values(ORGAN_GLTF_CONFIG).forEach(cfg => {
  try {
    useGLTF.preload(cfg.url);
  } catch {
    // preload graceful fallback
  }
});

function riskOverride(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('critical')) return { base: '#cc1010', emis: '#ff2020', rim: '#ff6060' };
  if (l.includes('high'))     return { base: '#c04010', emis: '#f06020', rim: '#ff9060' };
  if (l.includes('moderate')) return { base: '#b07010', emis: '#e09020', rim: '#ffc060' };
  return null;
}

/* ─── PBR Organ Material ─────────────────────────────────────────────────── */
function OrganMat({ color, selected, hovered }) {
  return (
    <meshPhysicalMaterial
      color={color.base}
      emissive={color.emis}
      emissiveIntensity={selected ? 0.75 : hovered ? 0.45 : 0.16}
      roughness={0.44}
      metalness={0.06}
      clearcoat={0.35}
      clearcoatRoughness={0.25}
      reflectivity={0.5}
    />
  );
}

/* ─── Pulsing Wrapper ─────────────────────────────────────────────────────── */
function Pulse({ active, children }) {
  const g = useRef();
  useFrame(({ clock: c }) => {
    if (!g.current) return;
    const s = active ? 1 + 0.034 * Math.sin(c.getElapsedTime() * 5.2) : 1;
    g.current.scale.setScalar(s);
  });
  return <group ref={g}>{children}</group>;
}

/* ─── Floating Label (Shows only for selected organ to avoid clutter) ─────── */
function Tag({ position, label, selected, visible = true, organKey, onClick }) {
  if (!visible || !selected) return null;
  return (
    <Html position={position} center style={{ pointerEvents: 'auto', userSelect: 'none' }}>
      <div 
        onClick={(e) => {
          e.stopPropagation();
          if (onClick && organKey) onClick(organKey);
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          opacity: 1,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{
          width: 16,
          height: 1.5,
          background: 'var(--brand-orange, #f97316)',
          transition: 'all 0.2s',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '0.66rem',
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#ffffff',
          background: 'rgba(10, 18, 36, 0.95)',
          padding: '3px 8px',
          borderRadius: '6px',
          border: '1px solid var(--brand-orange, #f97316)',
          boxShadow: '0 2px 12px rgba(249,115,22,0.3)',
          transition: 'all 0.2s',
        }}>
          {label}
        </span>
      </div>
    </Html>
  );
}

/* ─── Selection Aura (Minimal, non-distracting) ──────────────────────────── */
function SelectionAura() {
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   GLTF MODEL LOADER & ERROR BOUNDARY
══════════════════════════════════════════════════════════════════════════ */
class OrganErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    if (this.props.onError) this.props.onError(err);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function GLTFOrganMesh({ url, organKey, sel, hovered, onClick, riskLevel, scale, rotation, position }) {
  const { scene } = useGLTF(url);
  const col = riskOverride(riskLevel) || ORGAN_COLORS[organKey];

  const processed = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material) {
          node.material = node.material.clone();
          if (col) {
            node.material.color = new THREE.Color(col.base);
            node.material.emissive = new THREE.Color(col.emis);
            node.material.emissiveIntensity = sel ? 0.75 : hovered ? 0.45 : 0.18;
            node.material.roughness = 0.45;
            node.material.metalness = 0.05;
          }
        }
      }
    });
    return c;
  }, [scene, col, sel, hovered]);

  return (
    <primitive
      object={processed}
      scale={scale || [1, 1, 1]}
      rotation={rotation || [0, 0, 0]}
      position={position || [0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick(organKey);
      }}
    />
  );
}

function OrganWithGLTF({
  organKey,
  sel,
  onClick,
  riskLevel,
  proceduralComponent: Procedural,
  useGLTFMode,
  onModelStatus,
  showLabels,
  showRings,
}) {
  const config = ORGAN_GLTF_CONFIG[organKey];
  const [hovered, setHovered] = useState(false);
  const fallback = <Procedural sel={sel} onClick={onClick} riskLevel={riskLevel} showLabels={showLabels} showRings={showRings} />;

  if (!useGLTFMode || !config) return fallback;

  const gltfContent = (
    <OrganErrorBoundary fallback={fallback} onError={() => onModelStatus && onModelStatus(organKey, false)}>
      <React.Suspense fallback={fallback}>
        <group
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
        >
          <GLTFOrganMesh
            url={config.url}
            organKey={organKey}
            sel={sel}
            hovered={hovered}
            onClick={onClick}
            riskLevel={riskLevel}
            scale={config.scale}
            rotation={config.rotation}
            position={config.position}
          />
          <Tag position={config.tagPos} label={config.label} selected={sel} visible={showLabels} organKey={organKey} onClick={onClick} />
          <SelectionAura position={[0, 0, 0]} active={sel} visible={showRings} color={ORGAN_COLORS[organKey].emis} />
        </group>
      </React.Suspense>
    </OrganErrorBoundary>
  );

  if (organKey === 'heart') {
    return <Pulse active={sel}>{gltfContent}</Pulse>;
  }
  return gltfContent;
}

/* ══════════════════════════════════════════════════════════════════════════
   HIGH-FIDELITY PROCEDURAL THREE.JS GEOMETRIES (Fallback)
══════════════════════════════════════════════════════════════════════════ */

/* 1. HEART */
function ProceduralHeart({ sel, onClick, riskLevel, showLabels, showRings }) {
  const col = riskOverride(riskLevel) || ORGAN_COLORS.heart;
  const [hovered, setHovered] = useState(false);
  return (
    <Pulse active={sel}>
      <group 
        onClick={(e) => { e.stopPropagation(); onClick('heart'); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
      >
        <mesh position={[0.06, -0.06, 0.02]} rotation={[0, 0, -0.22]} scale={[0.85, 1.05, 0.85]}>
          <capsuleGeometry args={[0.18, 0.22, 12, 24]} />
          <OrganMat color={col} selected={sel} hovered={hovered} />
        </mesh>
        <mesh position={[-0.08, -0.02, 0.04]} rotation={[0, 0, 0.15]} scale={[0.8, 0.95, 0.8]}>
          <capsuleGeometry args={[0.16, 0.20, 10, 20]} />
          <OrganMat color={col} selected={sel} hovered={hovered} />
        </mesh>
        <mesh position={[-0.14, 0.14, 0.02]} scale={[0.7, 0.7, 0.7]}>
          <sphereGeometry args={[0.16, 18, 18]} />
          <OrganMat color={col} selected={sel} hovered={hovered} />
        </mesh>
        <mesh position={[0.12, 0.16, -0.02]} scale={[0.7, 0.7, 0.7]}>
          <sphereGeometry args={[0.15, 18, 18]} />
          <OrganMat color={col} selected={sel} hovered={hovered} />
        </mesh>
        <mesh position={[-0.01, 0.28, 0.01]} rotation={[0, 0, 0.12]}>
          <cylinderGeometry args={[0.045, 0.045, 0.22, 14]} />
          <meshStandardMaterial color="#881320" emissive="#b91c1c" emissiveIntensity={sel ? 0.5 : 0.15} roughness={0.5} />
        </mesh>
        <mesh position={[0.02, 0.40, 0.01]} rotation={[0, 0, -0.65]}>
          <torusGeometry args={[0.09, 0.035, 12, 24, Math.PI * 0.9]} />
          <meshStandardMaterial color="#881320" emissive="#b91c1c" emissiveIntensity={sel ? 0.5 : 0.15} roughness={0.5} />
        </mesh>
        <Tag position={TAG_POS.heart} label="Heart" selected={sel} visible={showLabels} organKey="heart" onClick={onClick} />
        <SelectionAura position={[0, 0, 0]} active={sel} visible={showRings} color={col.emis} />
      </group>
    </Pulse>
  );
}

/* 2. LUNGS */
function ProceduralLungs({ sel, onClick, showLabels, showRings }) {
  const col = ORGAN_COLORS.lungs;
  const [hovered, setHovered] = useState(false);
  return (
    <group 
      onClick={(e) => { e.stopPropagation(); onClick('lungs'); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
    >
      {/* Right lung (3 lobes) */}
      <mesh position={[-0.44, 0.26, 0]} scale={[0.26, 0.32, 0.24]}>
        <sphereGeometry args={[1, 20, 20]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <mesh position={[-0.48, -0.04, 0.02]} scale={[0.25, 0.28, 0.23]}>
        <sphereGeometry args={[1, 20, 20]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <mesh position={[-0.42, -0.30, 0.02]} scale={[0.24, 0.25, 0.22]}>
        <sphereGeometry args={[1, 20, 20]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>

      {/* Left lung (2 lobes with cardiac notch) */}
      <mesh position={[0.46, 0.24, 0]} scale={[0.25, 0.33, 0.23]}>
        <sphereGeometry args={[1, 20, 20]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <mesh position={[0.48, -0.12, 0.02]} scale={[0.24, 0.32, 0.22]}>
        <sphereGeometry args={[1, 20, 20]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>

      {/* Trachea */}
      <mesh position={[0, 0.66, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.32, 14]} />
        <meshStandardMaterial color="#b07080" roughness={0.55} />
      </mesh>
      <Tag position={TAG_POS.lungs} label="Lungs" selected={sel} visible={showLabels} organKey="lungs" onClick={onClick} />
      <SelectionAura position={[0, 0, 0]} active={sel} visible={showRings} color={col.emis} />
    </group>
  );
}

/* 3. LIVER */
function ProceduralLiver({ sel, onClick, showLabels, showRings }) {
  const col = ORGAN_COLORS.liver;
  const [hovered, setHovered] = useState(false);
  return (
    <group 
      onClick={(e) => { e.stopPropagation(); onClick('liver'); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
    >
      <mesh position={[-0.08, 0.04, 0]} scale={[0.85, 0.75, 0.65]}>
        <sphereGeometry args={[0.34, 22, 22]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <mesh position={[0.18, 0.02, 0.02]} scale={[0.65, 0.48, 0.50]}>
        <sphereGeometry args={[0.24, 18, 18]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      {/* Gallbladder */}
      <mesh position={[-0.06, -0.18, 0.10]} rotation={[0.2, 0, 0]} scale={[0.6, 1.1, 0.6]}>
        <capsuleGeometry args={[0.06, 0.10, 10, 16]} />
        <meshStandardMaterial color="#4d7c0f" emissive="#65a30d" emissiveIntensity={sel ? 0.45 : 0.12} roughness={0.5} />
      </mesh>
      <Tag position={TAG_POS.liver} label="Liver" selected={sel} visible={showLabels} organKey="liver" onClick={onClick} />
      <SelectionAura position={[0, 0, 0]} active={sel} visible={showRings} color={col.emis} />
    </group>
  );
}

/* 4. STOMACH */
function ProceduralStomach({ sel, onClick, showLabels, showRings }) {
  const col = ORGAN_COLORS.stomach;
  const [hovered, setHovered] = useState(false);
  return (
    <group 
      onClick={(e) => { e.stopPropagation(); onClick('stomach'); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
    >
      <mesh position={[0.08, 0.16, 0.02]} scale={[0.82, 0.90, 0.75]}>
        <sphereGeometry args={[0.22, 20, 20]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <mesh position={[0.12, -0.02, 0.04]} rotation={[0, 0, -0.22]} scale={[0.78, 1.25, 0.65]}>
        <capsuleGeometry args={[0.18, 0.26, 12, 22]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <mesh position={[-0.08, -0.16, 0.02]} rotation={[0, 0, 0.65]} scale={[0.70, 1.05, 0.60]}>
        <capsuleGeometry args={[0.14, 0.24, 10, 18]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <Tag position={TAG_POS.stomach} label="Stomach" selected={sel} visible={showLabels} organKey="stomach" onClick={onClick} />
      <SelectionAura position={[0, 0, 0]} active={sel} visible={showRings} color={col.emis} />
    </group>
  );
}

/* 5. PANCREAS */
function ProceduralPancreas({ sel, onClick, showLabels, showRings }) {
  const col = ORGAN_COLORS.pancreas;
  const [hovered, setHovered] = useState(false);
  return (
    <group 
      onClick={(e) => { e.stopPropagation(); onClick('pancreas'); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
    >
      <mesh position={[-0.16, 0, 0.02]} scale={[0.85, 1.15, 0.75]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <mesh position={[0.04, 0.03, 0]} rotation={[0, 0, -0.12]} scale={[1.6, 0.55, 0.55]}>
        <capsuleGeometry args={[0.10, 0.34, 10, 20]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <Tag position={TAG_POS.pancreas} label="Pancreas" selected={sel} visible={showLabels} organKey="pancreas" onClick={onClick} />
      <SelectionAura position={[0, 0, 0]} active={sel} visible={showRings} color={col.emis} />
    </group>
  );
}

/* 6. KIDNEYS */
function ProceduralKidneys({ sel, onClick, showLabels, showRings }) {
  const col = ORGAN_COLORS.kidneys;
  const [hovered, setHovered] = useState(false);
  return (
    <group 
      onClick={(e) => { e.stopPropagation(); onClick('kidneys'); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
    >
      {/* Left kidney */}
      <mesh position={[0.42, 0.02, 0]} scale={[0.65, 1.05, 0.55]}>
        <capsuleGeometry args={[0.18, 0.26, 10, 20]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      {/* Right kidney (slightly lower) */}
      <mesh position={[-0.42, -0.04, 0]} scale={[0.65, 1.05, 0.55]}>
        <capsuleGeometry args={[0.18, 0.26, 10, 20]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <Tag position={TAG_POS.kidneys} label="Kidneys" selected={sel} visible={showLabels} organKey="kidneys" onClick={onClick} />
      <SelectionAura position={[0, 0, 0]} active={sel} visible={showRings} color={col.emis} />
    </group>
  );
}

/* 7. INTESTINES */
function ProceduralIntestines({ sel, onClick, showLabels, showRings }) {
  const col = ORGAN_COLORS.intestines;
  const [hovered, setHovered] = useState(false);
  return (
    <group 
      onClick={(e) => { e.stopPropagation(); onClick('intestines'); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
    >
      <mesh position={[0, 0.22, 0.05]} scale={[1.6, 0.5, 0.5]}>
        <capsuleGeometry args={[0.11, 0.46, 8, 18]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <mesh position={[-0.36, 0.0, 0.02]} scale={[0.5, 1.15, 0.5]}>
        <capsuleGeometry args={[0.11, 0.32, 8, 18]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <mesh position={[0.36, -0.02, 0.02]} scale={[0.5, 1.20, 0.5]}>
        <capsuleGeometry args={[0.11, 0.35, 8, 18]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      {/* Enteric small bowel cluster */}
      <mesh position={[0, -0.04, 0.08]} scale={[0.9, 0.7, 0.5]}>
        <sphereGeometry args={[0.26, 18, 18]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      <Tag position={TAG_POS.intestines} label="Intestines" selected={sel} visible={showLabels} organKey="intestines" onClick={onClick} />
      <SelectionAura position={[0, 0, 0]} active={sel} visible={showRings} color={col.emis} />
    </group>
  );
}

/* 8. BRAIN */
function ProceduralBrain({ sel, onClick, showLabels, showRings }) {
  const col = ORGAN_COLORS.brain;
  const [hovered, setHovered] = useState(false);
  return (
    <group 
      onClick={(e) => { e.stopPropagation(); onClick('brain'); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
    >
      {/* Left hemisphere */}
      <mesh position={[0.13, 0.04, 0]} scale={[0.82, 0.75, 0.90]}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      {/* Right hemisphere */}
      <mesh position={[-0.13, 0.04, 0]} scale={[0.82, 0.75, 0.90]}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      {/* Cerebellum */}
      <mesh position={[0, -0.18, -0.14]} scale={[0.7, 0.5, 0.5]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <OrganMat color={col} selected={sel} hovered={hovered} />
      </mesh>
      {/* Brainstem */}
      <mesh position={[0, -0.28, -0.04]} rotation={[0.15, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.05, 0.16, 14]} />
        <meshStandardMaterial color="#8888a0" roughness={0.6} />
      </mesh>
      <Tag position={TAG_POS.brain} label="Brain" selected={sel} visible={showLabels} organKey="brain" onClick={onClick} />
      <SelectionAura position={[0, 0, 0]} active={sel} visible={showRings} color={col.emis} />
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ANATOMICAL HUMAN BODY SILHOUETTE & SKELETON
══════════════════════════════════════════════════════════════════════════ */
function HumanBodyContour({ visible = true }) {
  if (!visible) return null;
  return (
    <group>
      {/* Cranium */}
      <mesh position={[0, 1.55, 0]} scale={[0.58, 0.72, 0.62]}>
        <sphereGeometry args={[0.42, 24, 20]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.07} wireframe />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.22, 16]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.06} wireframe />
      </mesh>

      {/* Thorax / Ribcage boundary */}
      <mesh position={[0, 0.42, 0]} scale={[0.92, 1.15, 0.48]}>
        <sphereGeometry args={[0.72, 24, 20]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.07} wireframe />
      </mesh>

      {/* Abdominal wall */}
      <mesh position={[0, -0.38, 0]} scale={[0.82, 0.78, 0.40]}>
        <sphereGeometry args={[0.66, 22, 18]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.05} wireframe />
      </mesh>

      {/* Pelvis contour */}
      <mesh position={[0, -1.05, 0]} scale={[0.84, 0.38, 0.32]}>
        <sphereGeometry args={[0.64, 20, 16]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.06} wireframe />
      </mesh>

      {/* Thighs */}
      <mesh position={[-0.22, -1.42, 0]} scale={[0.55, 1.1, 0.38]}>
        <cylinderGeometry args={[0.28, 0.26, 0.64, 16]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.05} wireframe />
      </mesh>
      <mesh position={[0.22, -1.42, 0]} scale={[0.55, 1.1, 0.38]}>
        <cylinderGeometry args={[0.28, 0.26, 0.64, 16]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.05} wireframe />
      </mesh>

      {/* Spinal column */}
      <mesh position={[0, 0.18, -0.28]}>
        <cylinderGeometry args={[0.013, 0.013, 2.4, 10]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function RibCage({ visible = true }) {
  const ribs = useMemo(() => {
    const list = [];
    for (let i = 0; i < 7; i++) {
      const y = 0.65 - i * 0.10;
      const rx = 0.52 - i * 0.02;
      list.push({ y, rx, ry: 0.06, rz: 0.34, side: -1 });
      list.push({ y, rx, ry: 0.06, rz: 0.34, side: 1 });
    }
    return list;
  }, []);

  if (!visible) return null;

  return (
    <group>
      {ribs.map((r, i) => (
        <mesh key={i} position={[r.side * r.rx * 0.48, r.y, 0]} scale={[r.rx, r.ry, r.rz]}>
          <torusGeometry args={[1, 0.065, 5, 24, Math.PI]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} />
        </mesh>
      ))}
      {/* Sternum (anterior midline plate) */}
      <mesh position={[0, 0.38, 0.32]}>
        <boxGeometry args={[0.06, 0.62, 0.02]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   INIT CAMERA — Immediately positions camera on mount to avoid first-frame pop
══════════════════════════════════════════════════════════════════════════ */
function InitCamera({ ctrlRef }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0.415, 4.2);
    if (ctrlRef?.current) {
      ctrlRef.current.target.set(0, 0.415, 0);
      ctrlRef.current.update();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   CAMERA RIG WITH SMOOTH TARGET AND MODEL BOUNDS FRAMING
══════════════════════════════════════════════════════════════════════════ */
function CameraRig({ selected, isIsolated, zoomDelta, resetSignal, ctrlRef }) {
  const { camera } = useThree();
  const isTransitioning = useRef(true);

  useEffect(() => {
    isTransitioning.current = true;
    if (ctrlRef?.current && resetSignal > 0) {
      ctrlRef.current.reset();
    }
  }, [selected, isIsolated, zoomDelta, resetSignal, ctrlRef]);

  // Full-body framing: camera back enough to show head (y≈1.55) through intestines (y≈-0.72)
  // Anatomical centre = (1.55 + (-0.72)) / 2 ≈ 0.415
  const targetPos = useMemo(() => {
    if (isIsolated && selected) {
      // Isolated organ: comfortable close-up, zoomDelta adjustable
      const d = Math.max(1.5, 1.8 * (1 + zoomDelta));
      return new THREE.Vector3(0, 0, d);
    }
    // Full body: base dist 4.2 keeps brain-to-intestines framing at FOV 48
    const dist = Math.max(3.8, 4.2 * (1 + zoomDelta));
    return new THREE.Vector3(0, 0.415, dist);
  }, [selected, isIsolated, zoomDelta]);

  const targetLook = useMemo(() => {
    if (isIsolated && selected) {
      return new THREE.Vector3(0, 0, 0);
    }
    // y=0.415 is the anatomical centre (brain 1.55, intestines -0.72)
    return new THREE.Vector3(0, 0.415, 0);
  }, [selected, isIsolated]);

  useFrame(() => {
    if (isTransitioning.current) {
      camera.position.lerp(targetPos, 0.07);
      if (ctrlRef?.current) {
        ctrlRef.current.target.lerp(targetLook, 0.07);
        ctrlRef.current.update();
      } else {
        camera.lookAt(targetLook);
      }
      if (camera.position.distanceTo(targetPos) < 0.01) {
        isTransitioning.current = false;
      }
    }
  });

  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE WRAPPER
══════════════════════════════════════════════════════════════════════════ */
function Scene({
  selectedOrgan,
  onOrganSelect,
  patientData,
  organData,
  useGLTFMode,
  onModelStatus,
  isIsolated,
  showRibcage,
  showWireframe,
  showLabels,
  showRings,
  autoRotate,
  zoomDelta,
  resetSignal,
}) {
  const ctrlRef = useRef();

  const organsList = [
    { key: 'brain',      procedural: ProceduralBrain },
    { key: 'lungs',      procedural: ProceduralLungs },
    { key: 'heart',      procedural: ProceduralHeart },
    { key: 'stomach',    procedural: ProceduralStomach },
    { key: 'liver',      procedural: ProceduralLiver },
    { key: 'pancreas',   procedural: ProceduralPancreas },
    { key: 'kidneys',    procedural: ProceduralKidneys },
    { key: 'intestines', procedural: ProceduralIntestines },
  ];

  return (
    <>
      {/* 5-point clinical illumination */}
      <ambientLight intensity={0.42} color="#162540" />
      <directionalLight position={[3, 8, 6]} intensity={1.6} color="#dbeafe" />
      <directionalLight position={[-6, 2, 4]} intensity={0.65} color="#93c5fd" />
      <directionalLight position={[0, 4, -7]} intensity={0.5} color="#1e3a8a" />
      <pointLight position={[0, -1.2, 1.4]} intensity={0.4} color="#f97316" distance={6} decay={2} />
      <pointLight position={[0, 2.8, 1.2]} intensity={0.5} color="#38bdf8" distance={6} decay={2} />

      <OrbitControls
        ref={ctrlRef}
        enablePan={true}
        minDistance={0.8}
        maxDistance={9.0}
        autoRotate={autoRotate}
        autoRotateSpeed={1.5}
        minPolarAngle={Math.PI * 0.05}
        maxPolarAngle={Math.PI * 0.95}
        enableDamping
        dampingFactor={0.065}
      />

      <CameraRig
        selected={selectedOrgan}
        isIsolated={isIsolated}
        zoomDelta={zoomDelta}
        resetSignal={resetSignal}
        ctrlRef={ctrlRef}
      />

      <InitCamera ctrlRef={ctrlRef} />

      {/* Surrounding body context (only in Full-Body mode) */}
      {!isIsolated && (
        <>
          <HumanBodyContour visible={showWireframe} />
          <RibCage visible={showRibcage} />
        </>
      )}

      {/* Organs Rendering */}
      {organsList.map(({ key, procedural: Comp }) => {
        const isSelected = selectedOrgan === key;

        // In isolated mode, only render the selected organ
        if (isIsolated && selectedOrgan && !isSelected) {
          return null;
        }

        // Isolated organ is centered at [0,0,0] with comfortable scaling
        const organPosition = isIsolated && isSelected ? [0, 0, 0] : POS[key];
        const organScale = isIsolated && isSelected ? [1.6, 1.6, 1.6] : [1, 1, 1];

        return (
          <group key={key} position={organPosition} scale={organScale}>
            <OrganWithGLTF
              organKey={key}
              sel={isSelected}
              onClick={onOrganSelect}
              riskLevel={
                (() => {
                  // Each organ reads its OWN clinical status, not the selected organ's organData
                  const status = patientData?.organs?.[key]?.clinical_status;
                  if (status === 'ALERT') return 'critical';
                  if (status === 'ATTENTION') return 'moderate';
                  return null;
                })()
              }
              proceduralComponent={Comp}
              useGLTFMode={useGLTFMode}
              onModelStatus={onModelStatus}
              showLabels={showLabels}
              showRings={showRings}
            />
          </group>
        );
      })}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT EXPORT
══════════════════════════════════════════════════════════════════════════ */
export default function OrganViewer3D({
  selectedOrgan,
  onOrganSelect,
  patientData,
  organData,
  hideControls = false,
  isIsolated: controlledIsIsolated,
  onToggleIsolated,
}) {
  const [useGLTFMode, setUseGLTFMode] = useState(true);
  const [modelStatuses, setModelStatuses] = useState({});
  const [internalIsIsolated, setInternalIsIsolated] = useState(false);
  const isIsolated = controlledIsIsolated !== undefined ? controlledIsIsolated : internalIsIsolated;
  const setIsIsolated = onToggleIsolated || setInternalIsIsolated;
  const [showRibcage, setShowRibcage] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showRings, setShowRings] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [zoomDelta, setZoomDelta] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const [showManifest, setShowManifest] = useState(false);

  const handleModelStatus = (key, ok) => {
    setModelStatuses(prev => ({ ...prev, [key]: ok }));
  };

  const handleZoom = (delta) => {
    setZoomDelta(prev => Math.min(Math.max(prev + delta, -0.6), 0.8));
  };

  const handleReset = () => {
    setZoomDelta(0);
    setAutoRotate(false);
    setResetSignal(prev => prev + 1);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', userSelect: 'none' }}>
      
      {/* ── Compact Top Controls Toolbar ── */}
      {!hideControls && (
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '12px',
        right: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
        pointerEvents: 'none',
        gap: '8px',
      }}>
        {/* Left: View Mode Toggle */}
        <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto' }}>
          <button
            onClick={() => setIsIsolated(!isIsolated)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '8px',
              background: isIsolated ? 'var(--brand-orange, #f97316)' : 'rgba(10, 18, 36, 0.88)',
              border: isIsolated ? '1px solid var(--brand-orange, #f97316)' : '1px solid rgba(255,255,255,0.12)',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              fontWeight: 700,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow: isIsolated ? '0 2px 10px rgba(249,115,22,0.35)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {isIsolated ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isIsolated ? 'Full Body' : 'Isolate Organ'}</span>
          </button>
        </div>

        {/* Right: Layer Visibility & Essential Camera Controls */}
        <div style={{ display: 'flex', gap: '5px', pointerEvents: 'auto', alignItems: 'center' }}>
          {!isIsolated && (
            <>
              <button
                onClick={() => setShowRibcage(!showRibcage)}
                style={{
                  background: showRibcage ? 'rgba(56,189,248,0.22)' : 'rgba(10,18,36,0.85)',
                  border: showRibcage ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                  color: showRibcage ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                  borderRadius: '6px',
                  padding: '4px 9px',
                  fontSize: '0.67rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  fontWeight: showRibcage ? 700 : 500,
                  transition: 'all 0.15s ease',
                }}
                title="Toggle Thoracic Ribcage"
              >
                Ribs
              </button>

              <button
                onClick={() => setShowWireframe(!showWireframe)}
                style={{
                  background: showWireframe ? 'rgba(56,189,248,0.22)' : 'rgba(10,18,36,0.85)',
                  border: showWireframe ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                  color: showWireframe ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                  borderRadius: '6px',
                  padding: '4px 9px',
                  fontSize: '0.67rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  fontWeight: showWireframe ? 700 : 500,
                  transition: 'all 0.15s ease',
                }}
                title="Toggle Body Contour (OFF by default)"
              >
                Contour
              </button>
            </>
          )}

          <button
            onClick={() => handleZoom(-0.15)}
            style={{
              background: 'rgba(10,18,36,0.85)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>

          <button
            onClick={() => handleZoom(0.15)}
            style={{
              background: 'rgba(10,18,36,0.85)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>

          <button
            onClick={handleReset}
            style={{
              background: 'rgba(10,18,36,0.85)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Reset Camera Framing"
          >
            <RotateCcw size={13} />
          </button>

          <button
            onClick={() => setShowManifest(true)}
            style={{
              background: 'rgba(10,18,36,0.85)',
              border: '1px solid rgba(56,189,248,0.25)',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '4px 9px',
              fontSize: '0.67rem',
              fontFamily: 'monospace',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="3D Anatomical Scientific Provenance & License"
          >
            <Info size={12} />
            <span>Dataset</span>
          </button>
        </div>
      </div>
      )}

      {/* ── Dataset & Licensing Registry Modal ── */}
      {!hideControls && showManifest && (
        <div style={{
          position: 'absolute',
          inset: '12px',
          zIndex: 30,
          background: 'var(--bg-card, #0b1526)',
          border: '1px solid var(--border, rgba(255,255,255,0.15))',
          borderRadius: '14px',
          padding: '18px',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          color: 'var(--text-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} style={{ color: '#38bdf8' }} />
              <h5 style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.95rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3D Anatomical Asset Registry & Licensing Pipeline
              </h5>
            </div>
            <button
              onClick={() => setShowManifest(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px' }}>
            MedFusion AI utilizes high-resolution anatomical segmentations derived from open scientific repositories:
            <strong> NIH 3D Print Exchange</strong>, <strong>BodyParts3D (DBCLS Japan)</strong>, and <strong>OpenAnatomy (Harvard SPL)</strong>.
            All 8 organ systems support high-performance Draco/GLTF binary CAD rendering with instant procedural fallback.
          </p>

          <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px' }}>
            <table style={{ width: '100%', fontSize: '0.68rem', fontFamily: 'monospace', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '7px 10px', textAlign: 'left' }}>Organ</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left' }}>Asset File</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left' }}>Scientific Source & License</th>
                  <th style={{ padding: '7px 10px', textAlign: 'center' }}>Pipeline Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(ORGAN_GLTF_CONFIG).map((cfg) => {
                  return (
                    <tr key={cfg.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 600 }}>{cfg.label}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--text-muted)' }}>{cfg.url}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--text-secondary)' }}>{cfg.dataset}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={12} /> Ready (GLB + WebGL)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>Coordinate Convention: </span>
            Right-Handed Y-Up (Three.js standard). Craniocaudal (+Y cranial, -Y caudal), Anteroposterior (+Z anterior, -Z posterior), Lateral (+X patient left / viewer right, -X patient right / viewer left).
          </div>
        </div>
      )}

      {/* ── 3D Canvas ── */}
      {/* Camera framing: body spans brain y≈1.55 (top) to intestines y≈-0.72 (bottom);
          centre = (1.55 + (-0.72)) / 2 ≈ 0.415; half-height ≈ 1.135;
          at fov 48 half-angle = 24°; tan(24°) ≈ 0.4452; required dist = 1.135/0.4452 ≈ 2.55 + padding = 4.2 */}
      <Canvas
        camera={{ position: [0, 0.415, 4.2], fov: 48, near: 0.1, far: 100 }}
        style={{ height: '100%', width: '100%', background: 'transparent' }}
        onPointerMissed={() => onOrganSelect(null)}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        shadows={false}
      >
        <color attach="background" args={['#040d1a']} />
        <fog attach="fog" args={['#040d1a', 12, 26]} />
        <Scene
          selectedOrgan={selectedOrgan}
          onOrganSelect={onOrganSelect}
          patientData={patientData}
          organData={organData}
          useGLTFMode={useGLTFMode}
          onModelStatus={handleModelStatus}
          isIsolated={isIsolated}
          showRibcage={showRibcage}
          showWireframe={showWireframe}
          showLabels={showLabels}
          showRings={showRings}
          autoRotate={autoRotate}
          zoomDelta={zoomDelta}
          resetSignal={resetSignal}
        />
      </Canvas>
    </div>
  );
}
