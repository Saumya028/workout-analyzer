let repCount = 0;
let direction: "up" | "down" | null = null;
let path: { x: number; y: number; z: number }[] = [];

export function resetEngine() {
  repCount = 0;
  direction = null;
  path = [];
}

export function analyzeMotion(
  ax: number,
  ay: number,
  az: number
) {
  const threshold = 7;

  if (ay > threshold && direction !== "up") {
    direction = "up";
  }

  if (ay < -threshold && direction === "up") {
    repCount++;
    direction = "down";
  }

  path.push({ x: ax, y: ay, z: az });

  return {
    reps: repCount,
    path,
  };
}

export function computeAccuracy(pathData: any[]) {
  if (pathData.length === 0) return 100;

  const avgMagnitude =
    pathData.reduce(
      (sum, p) =>
        sum + Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2),
      0
    ) / pathData.length;

  const ideal = 12;
  const diff = Math.abs(avgMagnitude - ideal);

  return Math.max(0, 100 - diff * 5);
}
