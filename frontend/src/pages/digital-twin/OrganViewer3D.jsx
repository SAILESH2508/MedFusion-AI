import React, { useRef, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// Organ configuration — all procedural geometry, no GLTF files
const ORGAN_CONFIGS = [
  {
    id: 'heart',
    label: 'Heart',
    type: 'single',
    color: '#e63946',
    position: [0, 0, 0],
    scale: [0.55, 0.55, 0.55],
    geometry: 'torusKnot',
    geoArgs: [0.3, 0.12, 100, 16, 2, 3],
  },
  {
    id: 'lungs',
    label: 'Lungs',
    type: 'pair',
    color: '#ffb3c1',
    opacity: 0.85,
    transparent: true,
    meshes: [
      { label: 'Left Lung', position: [-0.85, 0, 0], scale: [0.6, 0.85, 0.6] },
      { label: 'Right Lung', position: [0.85, 0, 0], scale: [0.6, 0.85, 0.6] },
    ],
    geometry: 'sphere',
    geoArgs: [0.5, 32, 32],
  },
  {
    id: 'liver',
    label: 'Liver',
    type: 'single',
    color: '#8B4513',
    position: [0.3, -0.9, 0],
    scale: [1.1, 0.5, 0.8],
    geometry: 'sphere',
    geoArgs: [0.6, 32, 32],
  },
  {
    id: 'kidneys',
    label: 'Kidneys',
    type: 'pair',
    color: '#9b2226',
    meshes: [
      { label: 'Left Kidney', position: [-0.95, -0.5, 0], scale: [1, 1, 1] },
      { label: 'Right Kidney', position: [0.95, -0.5, 0], scale: [1, 1, 1] },
    ],
    geometry: 'capsule',
    geoArgs: [0.22, 0.45, 8, 16],
  },
  {
    id: 'brain',
    label: 'Brain',
    type: 'single',
    color: '#adb5bd',
    position: [0, 1.1, 0],
    scale: [1, 0.75, 1.1],
    geometry: 'octahedron',
    geoArgs: [0.55, 2],
  },
];

function OrganGeometry({ organ }) {
  switch (organ.geometry) {
    case 'torusKnot':
      return <torusKnotGeometry args={organ.geoArgs} />;
    case 'sphere':
      return <sphereGeometry args={organ.geoArgs} />;
    case 'capsule':
      return <capsuleGeometry args={organ.geoArgs} />;
    case 'octahedron':
      return <octahedronGeometry args={organ.geoArgs} />;
    default:
      return <sphereGeometry args={[0.5, 32, 32]} />;
  }
}

function SingleOrgan({ organ, selectedOrgan, onOrganSelect }) {
  const isSelected = selectedOrgan === organ.id;
  const isHidden = selectedOrgan !== null && !isSelected;

  return (
    <group>
      <mesh
        position={organ.position}
        scale={organ.scale}
        onClick={(e) => { e.stopPropagation(); onOrganSelect(organ.id); }}
      >
        <OrganGeometry organ={organ} />
        <meshStandardMaterial
          color={organ.color}
          emissive="#ffffff"
          emissiveIntensity={isSelected ? 0.25 : 0}
          transparent={organ.transparent || false}
          opacity={organ.transparent ? (organ.opacity || 0.85) : 1}
        />
      </mesh>
      {!isHidden && (
        <Html position={[organ.position[0], organ.position[1] + organ.scale[1] * 0.8 + 0.3, organ.position[2]]} center>
          <span className="organ-label" style={{
            fontSize: '0.65rem',
            color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
            fontFamily: 'monospace',
            background: isSelected ? 'rgba(0,0,0,0.6)' : 'transparent',
            padding: '1px 4px',
            borderRadius: '3px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            {organ.label}
          </span>
        </Html>
      )}
    </group>
  );
}

function PairOrgan({ organ, selectedOrgan, onOrganSelect }) {
  const isSelected = selectedOrgan === organ.id;
  const isHidden = selectedOrgan !== null && !isSelected;

  return (
    <group onClick={(e) => { e.stopPropagation(); onOrganSelect(organ.id); }}>
      {organ.meshes.map((mesh, i) => (
        <mesh key={i} position={mesh.position} scale={mesh.scale}>
          <OrganGeometry organ={organ} />
          <meshStandardMaterial
            color={organ.color}
            emissive="#ffffff"
            emissiveIntensity={isSelected ? 0.25 : 0}
            transparent={organ.transparent || false}
            opacity={organ.transparent ? (organ.opacity || 0.85) : 1}
          />
        </mesh>
      ))}
      {!isHidden && (
        <Html
          position={[
            organ.meshes[0].position[0] + (organ.meshes[1].position[0] - organ.meshes[0].position[0]) / 2,
            organ.meshes[0].position[1] + 0.7,
            0,
          ]}
          center
        >
          <span className="organ-label" style={{
            fontSize: '0.65rem',
            color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
            fontFamily: 'monospace',
            background: isSelected ? 'rgba(0,0,0,0.6)' : 'transparent',
            padding: '1px 4px',
            borderRadius: '3px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            {organ.label}
          </span>
        </Html>
      )}
    </group>
  );
}

function Scene({ selectedOrgan, onOrganSelect }) {
  const controlsRef = useRef();

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={2}
        maxDistance={8}
      />
      {ORGAN_CONFIGS.map((organ) =>
        organ.type === 'pair' ? (
          <PairOrgan
            key={organ.id}
            organ={organ}
            selectedOrgan={selectedOrgan}
            onOrganSelect={onOrganSelect}
          />
        ) : (
          <SingleOrgan
            key={organ.id}
            organ={organ}
            selectedOrgan={selectedOrgan}
            onOrganSelect={onOrganSelect}
          />
        )
      )}
      {/* Reset button rendered as HTML overlay via drei Html */}
      <Html fullscreen>
        <button
          onClick={() => controlsRef.current?.reset()}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '0.72rem',
            fontFamily: 'monospace',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          Reset View
        </button>
      </Html>
    </>
  );
}

export default function OrganViewer3D({ selectedOrgan, onOrganSelect, patientData }) {
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        style={{ height: '100%', width: '100%' }}
        onPointerMissed={() => onOrganSelect(null)}
      >
        <Suspense fallback={null}>
          <Scene selectedOrgan={selectedOrgan} onOrganSelect={onOrganSelect} />
        </Suspense>
      </Canvas>
      <p style={{
        margin: '6px 0 0 0',
        fontSize: '0.68rem',
        fontFamily: 'monospace',
        color: 'rgba(255,255,255,0.45)',
        textAlign: 'center',
      }}>
        ⚠️ Illustrative anatomical models — not medically accurate representations. For educational purposes only.
      </p>
    </div>
  );
}
