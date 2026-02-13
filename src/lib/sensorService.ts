type MotionCallback = (data: {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}) => void;

let listener: any = null;

export async function startSensors(callback: MotionCallback) {
  if (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof (DeviceMotionEvent as any).requestPermission === "function"
  ) {
    await (DeviceMotionEvent as any).requestPermission();
  }

  listener = (event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    const rot = event.rotationRate;

    callback({
      ax: acc?.x || 0,
      ay: acc?.y || 0,
      az: acc?.z || 0,
      gx: rot?.alpha || 0,
      gy: rot?.beta || 0,
      gz: rot?.gamma || 0,
    });
  };

  window.addEventListener("devicemotion", listener);
}

export function stopSensors() {
  if (listener) {
    window.removeEventListener("devicemotion", listener);
  }
}
