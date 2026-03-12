// src/app/components/BarPath3D.tsx
// ──────────────────────────────────────────────────────────────────────────────
// 3D Motion Path visualization with golden rep overlay support.
// Uses React Three Fiber + Three.js + Drei.
// ──────────────────────────────────────────────────────────────────────────────
'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Float } from '@react-three/drei';
import * as THREE from 'three';
import { SensorFrame } from '@/lib/sensorService';

// ─── Bar Path Line ────────────────────────────────────────────────────────────

interface BarPathLineProps {
  frames: SensorFrame[];
  isRecording: boolean;
  color1?: string;
  color2?: string;
  lineWidth?: number;
  opacity?: number;
}

function BarPathLine({
  frames, isRecording,
  color1 = '#3D8EFF', color2 = '#00FFB2',
  opacity = 1,
}: BarPathLineProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lineObjRef = useRef<THREE.Line | null>(null);
  const glowObjRef = useRef<THREE.Line | null>(null);

  const { geometry, glowMat } = useMemo(() => {
    if (frames.length < 2) return { geometry: null, glowMat: null };

    const step = Math.max(1, Math.floor(frames.length / 200));
    const sampled = frames.filter((_, i) => i % step === 0);
    const scale = 0.15;
    const pts: THREE.Vector3[] = [];
    const cols: THREE.Color[] = [];

    for (let i = 0; i < sampled.length; i++) {
      const f = sampled[i];
      pts.push(new THREE.Vector3(f.ax * scale * 3, f.ay * scale, f.az * scale * 3));
      const t = i / sampled.length;
      const c = new THREE.Color();
      c.lerpColors(new THREE.Color(color1), new THREE.Color(color2), t);
      cols.push(c);
    }

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const colorArray = new Float32Array(cols.length * 3);
    cols.forEach((c, i) => {
      colorArray[i * 3] = c.r;
      colorArray[i * 3 + 1] = c.g;
      colorArray[i * 3 + 2] = c.b;
    });
    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const gm = new THREE.LineBasicMaterial({ color: color2, transparent: true, opacity: 0.15 * opacity });
    return { geometry: geo, glowMat: gm };
  }, [frames, color1, color2, opacity]);

  useEffect(() => {
    if (!groupRef.current || !geometry) return;
    // Clear old children
    while (groupRef.current.children.length) groupRef.current.remove(groupRef.current.children[0]);

    const mainMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity });
    const mainLine = new THREE.Line(geometry, mainMat);
    const glowLine = new THREE.Line(geometry, glowMat!);
    groupRef.current.add(mainLine);
    groupRef.current.add(glowLine);
    lineObjRef.current = mainLine;
    glowObjRef.current = glowLine;
  }, [geometry, glowMat, opacity]);

  useFrame((state) => {
    if (glowObjRef.current && isRecording) {
      (glowObjRef.current.material as THREE.LineBasicMaterial).opacity =
        0.15 + 0.1 * Math.sin(state.clock.elapsedTime * 3);
    }
  });

  if (frames.length < 2) return null;

  return <group ref={groupRef} />;
}

// ─── Current Position Marker ──────────────────────────────────────────────────

interface PositionMarkerProps {
  frame: SensorFrame | null;
  isRecording: boolean;
}

function PositionMarker({ frame, isRecording }: PositionMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const scale = 0.15;
  const pos = frame
    ? new THREE.Vector3(frame.ax * scale * 3, frame.ay * scale, frame.az * scale * 3)
    : new THREE.Vector3(0, 0, 0);

  useFrame((state) => {
    if (!meshRef.current || !ringRef.current) return;
    meshRef.current.position.lerp(pos, 0.15);
    ringRef.current.position.copy(meshRef.current.position);

    if (isRecording) {
      const s = 1 + 0.3 * Math.sin(state.clock.elapsedTime * 4);
      ringRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color="#00FFB2"
          emissive="#00FFB2"
          emissiveIntensity={isRecording ? 2 : 0.5}
        />
      </mesh>
      <mesh ref={ringRef}>
        <torusGeometry args={[0.12, 0.015, 8, 24]} />
        <meshStandardMaterial
          color="#00FFB2"
          emissive="#00FFB2"
          emissiveIntensity={1}
          transparent
          opacity={isRecording ? 0.6 : 0.2}
        />
      </mesh>
    </group>
  );
}

// ─── Axis Labels ─────────────────────────────────────────────────────────────

function AxisLabels() {
  return (
    <group>
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.5, '#FF4060', 0.2, 0.12]} />
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.5, '#00FFB2', 0.2, 0.12]} />
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 1.5, '#3D8EFF', 0.2, 0.12]} />
    </group>
  );
}

// ─── Idle Animation ───────────────────────────────────────────────────────────

function IdleAnimation() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
  });

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={groupRef}>
        <mesh>
          <octahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial
            color="#00FFB2"
            emissive="#00FFB2"
            emissiveIntensity={0.3}
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>
    </Float>
  );
}

// ─── Scene Component ─────────────────────────────────────────────────────────

interface SceneProps {
  frames: SensorFrame[];
  goldenFrames?: SensorFrame[];
  isRecording: boolean;
  isEmpty: boolean;
}

function Scene({ frames, goldenFrames, isRecording, isEmpty }: SceneProps) {
  const lastFrame = frames.length > 0 ? frames[frames.length - 1] : null;
  const hasGolden = goldenFrames && goldenFrames.length > 1;

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 5, 3]} intensity={1} color="#00FFB2" />
      <pointLight position={[-3, -2, -3]} intensity={0.5} color="#3D8EFF" />

      <Grid
        args={[10, 10]}
        cellSize={0.5}
        cellThickness={0.3}
        cellColor="#2A3441"
        sectionSize={2}
        sectionThickness={0.5}
        sectionColor="#3D4F63"
        fadeDistance={8}
        position={[0, -1.5, 0]}
      />

      {isEmpty && !hasGolden ? (
        <IdleAnimation />
      ) : (
        <>
          {/* Golden rep path (rendered first, behind) */}
          {hasGolden && (
            <BarPathLine
              frames={goldenFrames!}
              isRecording={false}
              color1="#FF8C00"
              color2="#FFB830"
              opacity={0.6}
            />
          )}

          {/* User path */}
          {frames.length > 1 && (
            <>
              <BarPathLine frames={frames} isRecording={isRecording} />
              <PositionMarker frame={lastFrame} isRecording={isRecording} />
            </>
          )}
        </>
      )}

      <AxisLabels />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={12}
        autoRotate={isEmpty && !hasGolden}
        autoRotateSpeed={1}
        makeDefault
      />
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BarPath3DProps {
  frames: SensorFrame[];
  goldenFrames?: SensorFrame[];
  isRecording: boolean;
}

export default function BarPath3D({ frames, goldenFrames, isRecording }: BarPath3DProps) {
  const isEmpty = frames.length < 2;

  return (
    <div className="w-full h-full relative">
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-crimson rounded" />
          <span className="text-dim">X</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-neon rounded" />
          <span className="text-dim">Y</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-azure rounded" />
          <span className="text-dim">Z</span>
        </div>
        {goldenFrames && goldenFrames.length > 1 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber rounded" />
            <span className="text-dim">Golden</span>
          </div>
        )}
      </div>

      {isEmpty && (!goldenFrames || goldenFrames.length < 2) && (
        <div className="absolute bottom-3 left-0 right-0 z-10 text-center">
          <span className="text-dim text-xs font-mono">
            Start a workout to see 3D motion path
          </span>
        </div>
      )}

      <Canvas
        camera={{ position: [4, 3, 4], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene frames={frames} goldenFrames={goldenFrames} isRecording={isRecording} isEmpty={isEmpty} />
      </Canvas>
    </div>
  );
}