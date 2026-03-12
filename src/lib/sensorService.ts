// src/lib/sensorService.ts
// SensorFrame type is defined and exported HERE.
// All other files that need SensorFrame import it from this file.

export interface SensorFrame {
  time: number;   // Unix ms timestamp
  ax: number;     // Accelerometer X  (m/s²)
  ay: number;     // Accelerometer Y  (m/s²)
  az: number;     // Accelerometer Z  (m/s²)
  gx: number;     // Gyroscope alpha  (deg/s)
  gy: number;     // Gyroscope beta   (deg/s)
  gz: number;     // Gyroscope gamma  (deg/s)
}

type SensorCallback = (frame: SensorFrame) => void;
type ErrorCallback  = (error: string) => void;

const MAX_FRAMES   = 6000;
const LOG_INTERVAL = 50;

export class SensorService {
  private frames:        SensorFrame[] = [];
  private isRecording    = false;
  private frameCount     = 0;
  private onFrame:       SensorCallback | null = null;
  private onError:       ErrorCallback  | null = null;
  private motionHandler: ((e: DeviceMotionEvent) => void) | null = null;
  private startTime      = 0;

  async requestPermissionAndStart(
    onFrame: SensorCallback,
    onError: ErrorCallback,
  ): Promise<boolean> {
    this.onFrame = onFrame;
    this.onError = onError;

    const DME = DeviceMotionEvent as typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DME.requestPermission === 'function') {
      try {
        const result = await DME.requestPermission();
        if (result !== 'granted') {
          onError('Motion sensor permission denied.');
          return false;
        }
        console.log('[Sensor] iOS permission granted');
      } catch (err) {
        onError('Permission request failed: ' + String(err));
        return false;
      }
    }

    if (!('DeviceMotionEvent' in window)) {
      onError('DeviceMotionEvent not available on this browser/device.');
      return false;
    }

    this._startListening();
    return true;
  }

  stop(): SensorFrame[] {
    this.isRecording = false;
    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler);
      this.motionHandler = null;
    }
    const captured = [...this.frames];
    console.log('[Sensor] Stopped. Captured ' + captured.length + ' frames over ' + ((Date.now() - this.startTime) / 1000).toFixed(1) + 's');
    return captured;
  }

  getFrameCount():    number        { return this.frames.length; }
  getCurrentFrames(): SensorFrame[] { return [...this.frames];   }
  getIsRecording():   boolean       { return this.isRecording;    }

  private _startListening(): void {
    this.frames      = [];
    this.frameCount  = 0;
    this.isRecording = true;
    this.startTime   = Date.now();

    this.motionHandler = (event: DeviceMotionEvent) => {
      if (!this.isRecording) return;

      const acc  = event.acceleration;
      const accG = event.accelerationIncludingGravity;
      const rot  = event.rotationRate;

      const ax = acc?.x  ?? accG?.x  ?? 0;
      const ay = acc?.y  ?? accG?.y  ?? 0;
      const az = acc?.z  ?? accG?.z  ?? 0;
      const gx = rot?.alpha ?? 0;
      const gy = rot?.beta  ?? 0;
      const gz = rot?.gamma ?? 0;

      const frame: SensorFrame = {
        time: Date.now(),
        ax: ax ?? 0,
        ay: ay ?? 0,
        az: az ?? 0,
        gx: gx ?? 0,
        gy: gy ?? 0,
        gz: gz ?? 0,
      };

      if (this.frames.length >= MAX_FRAMES) this.frames.shift();
      this.frames.push(frame);
      this.frameCount++;

      if (this.frameCount % LOG_INTERVAL === 0) {
        console.log(
          '[Sensor] #' + this.frameCount +
          ' | ax=' + frame.ax.toFixed(2) +
          ' ay=' + frame.ay.toFixed(2) +
          ' az=' + frame.az.toFixed(2) +
          ' | gx=' + frame.gx.toFixed(1) +
          ' gy=' + frame.gy.toFixed(1) +
          ' gz=' + frame.gz.toFixed(1) +
          ' | t=' + ((Date.now() - this.startTime) / 1000).toFixed(1) + 's'
        );
      }

      this.onFrame?.(frame);
    };

    window.addEventListener('devicemotion', this.motionHandler);
    console.log('[Sensor] Listening for DeviceMotion events...');
  }

  static generateTestData(exerciseKey: string, numReps = 5): SensorFrame[] {
    const frames: SensorFrame[] = [];
    const sampleRate   = 50;
    const repDuration  = 2.4;
    const totalSamples = Math.floor(sampleRate * repDuration * numReps);
    const t0           = Date.now() - totalSamples * (1000 / sampleRate);

    type Params = { ayAmp: number; azAmp: number; gAmp: number; freq: number };
    const table: Record<string, Params> = {
      squats:           { ayAmp:  3.0, azAmp: 0.4, gAmp: 30, freq: 0.42 },
      chestPress:       { ayAmp:  2.2, azAmp: 0.3, gAmp: 20, freq: 0.42 },
      shoulderPress:    { ayAmp:  2.5, azAmp: 0.3, gAmp: 25, freq: 0.42 },
      latPulldown:      { ayAmp: -2.0, azAmp: 0.4, gAmp: 18, freq: 0.42 },
      deadlift:         { ayAmp:  2.8, azAmp: 0.5, gAmp: 22, freq: 0.33 },
      rowing:           { ayAmp:  1.5, azAmp: 2.0, gAmp: 20, freq: 0.42 },
      bicepCurls:       { ayAmp:  2.0, azAmp: 0.3, gAmp: 35, freq: 0.50 },
      tricepsExtension: { ayAmp: -1.8, azAmp: 0.3, gAmp: 30, freq: 0.50 },
    };
    const p = table[exerciseKey] ?? { ayAmp: 2.0, azAmp: 0.3, gAmp: 20, freq: 0.42 };

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const theta = 2 * Math.PI * p.freq * t;
      const n = () => (Math.random() - 0.5) * 0.1;
      frames.push({
        time: t0 + i * (1000 / sampleRate),
        ax: 0.2  * Math.sin(theta * 2) + n(),
        ay: p.ayAmp * Math.sin(theta) + p.ayAmp * 0.25 * Math.sin(theta * 2) + n(),
        az: p.azAmp * Math.cos(theta) + n(),
        gx: p.gAmp  * Math.sin(theta + 0.3) + n() * 5,
        gy: p.gAmp  * 0.6 * Math.cos(theta) + n() * 5,
        gz: p.gAmp  * 0.3 * Math.sin(theta * 2) + n() * 3,
      });
    }
    return frames;
  }
}

export const sensorService = new SensorService();