/* MediaPipe Pose + Camera loaded via script tags */

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseResults {
  poseLandmarks?: Landmark[];
}

interface PoseOptions {
  locateFile?: (file: string) => string;
}

interface PoseInstance {
  setOptions: (options: Partial<{
    modelComplexity: number;
    smoothLandmarks: boolean;
    enableSegmentation: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }>) => void;
  onResults: (callback: (results: PoseResults) => void) => void;
  send: (input: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }) => Promise<void>;
}

declare global {
  interface Window {
    Pose: new (config: PoseOptions) => PoseInstance;
    Camera: new (
      video: HTMLVideoElement,
      config: { onFrame: () => Promise<void>; width: number; height: number }
    ) => { start: () => void };
  }
}

export {};
