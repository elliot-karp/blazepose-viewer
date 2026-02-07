import type { Landmark, PoseResults } from "./types/mediapipe";
import { drawPoseOverlay } from "./drawOverlay";

/**
 * Run BlazePose on an HTMLImageElement and draw overlay on a canvas.
 * Returns the landmarks (or null if no pose detected).
 */
export function runPoseOnImage(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Promise<Landmark[] | null> {
  return new Promise((resolve) => {
    if (typeof window.Pose === "undefined") {
      resolve(null);
      return;
    }

    const pose = new window.Pose({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: false,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results: PoseResults) => {
      const lm = results.poseLandmarks ?? null;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        if (lm) drawPoseOverlay(ctx, lm, img.naturalWidth, img.naturalHeight);
      }
      resolve(lm);
    });

    pose.send({ image: img });
  });
}
