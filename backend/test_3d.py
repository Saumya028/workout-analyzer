"""Quick verification of the 3D rep detection pipeline."""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.rep_detection.signal_utils import generate_test_data
from backend.rep_detection.detector import analyze_workout

frames = generate_test_data("squats", 3)
result = analyze_workout(frames, "squats")

print(f"Reps: {result['reps']}, Accuracy: {result['accuracy']}%")
print(f"Per-rep scores: {result['rep_scores']}")
gs = result["golden_signal"]
print(f"Golden signal shape: {len(gs)}x{len(gs[0]) if gs else 0}")
us = result["user_signals"]
if us:
    print(f"User signals count: {len(us)}")
    print(f"User signal[0] shape: {len(us[0])}x{len(us[0][0])}")
else:
    print("No user signals")

print("\nAll checks passed!" if result["reps"] > 0 else "\nWARNING: No reps detected")
