"use client";

import { useState } from "react";
import {
  startSensors,
  stopSensors,
} from "@/lib/sensorService";
import {
  analyzeMotion,
  resetEngine,
  computeAccuracy,
} from "@/lib/motionEngine";
import BarPath3D from "../components/BarPath3D";

export default function Workout() {
  const [exercise, setExercise] = useState("");
  const [sessionActive, setSessionActive] =
    useState(false);
  const [reps, setReps] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [path, setPath] = useState<any[]>([]);

  const handleStart = async () => {
    if (!exercise) {
      alert("Please select an exercise");
      return;
    }

    resetEngine();
    setSessionActive(true);

    await startSensors((data) => {
      const result = analyzeMotion(
        data.ax,
        data.ay,
        data.az
      );

      setReps(result.reps);
      setPath([...result.path]);
      setAccuracy(
        computeAccuracy(result.path)
      );
    });
  };

  const handleStop = () => {
    stopSensors();
    setSessionActive(false);
  };

  return (
    <div className="space-y-8">

      <h2 className="text-3xl font-bold">
        Workout Session
      </h2>

      {/* Exercise Selection */}
      <div className="bg-white/5 p-6 rounded-2xl">
        <label className="block mb-3">
          Select Exercise
        </label>

        <select
          className="bg-slate-800 p-3 rounded-lg w-full"
          value={exercise}
          onChange={(e) =>
            setExercise(e.target.value)
          }
          disabled={sessionActive}
        >
          <option value="">
            Choose exercise...
          </option>
          <option value="bench">
            Bench Press
          </option>
          <option value="squat">
            Squat
          </option>
          <option value="deadlift">
            Deadlift
          </option>
          <option value="shoulder">
            Shoulder Press
          </option>
        </select>
      </div>

      {/* Controls */}
      {!sessionActive ? (
        <button
          onClick={handleStart}
          className="px-8 py-3 bg-cyan-500 rounded-xl text-black font-semibold"
        >
          Start Session
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="px-8 py-3 bg-red-500 rounded-xl font-semibold"
        >
          Stop Session
        </button>
      )}

      {/* Live Stats */}
      {sessionActive && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-6 rounded-2xl">
              <h3>Reps</h3>
              <p className="text-4xl text-cyan-400">
                {reps}
              </p>
            </div>

            <div className="bg-white/5 p-6 rounded-2xl">
              <h3>Accuracy</h3>
              <p className="text-4xl text-green-400">
                {accuracy.toFixed(1)}%
              </p>
            </div>
          </div>

          <BarPath3D motion={path} />
        </>
      )}
    </div>
  );
}
