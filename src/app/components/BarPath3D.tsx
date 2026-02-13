"use client";

import { Canvas } from "@react-three/fiber";
import { Line } from "@react-three/drei";

export default function BarPath3D({
  motion,
}: {
  motion: number[];
}) {
  const points = motion.map((y, i) => [i * 0.05, y * 0.05, 0]);

  return (
    <div className="h-96 mt-6">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight />
        <Line points={points} color="cyan" lineWidth={2} />
      </Canvas>
    </div>
  );
}
