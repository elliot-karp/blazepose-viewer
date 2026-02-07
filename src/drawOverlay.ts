import type { Landmark } from "./types/mediapipe";
import { POSE_CONNECTIONS } from "./poseConstants";

const DEFAULT_LINE_WIDTH = 1.5;
const DEFAULT_RADIUS = 2;

/**
 * Draw BlazePose skeleton and landmarks on a 2D context.
 * Coordinates are normalized (0–1); pass width/height to scale to canvas.
 */
export function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  options: { lineWidth?: number; radius?: number } = {}
): void {
  const lineWidth = options.lineWidth ?? DEFAULT_LINE_WIDTH;
  const radius = options.radius ?? DEFAULT_RADIUS;
  const toX = (p: Landmark) => p.x * width;
  const toY = (p: Landmark) => p.y * height;

  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  for (const [i, j] of POSE_CONNECTIONS) {
    const a = landmarks[i];
    const b = landmarks[j];
    if (a?.visibility !== undefined && a.visibility < 0.5) continue;
    if (b?.visibility !== undefined && b.visibility < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(toX(a), toY(a));
    ctx.lineTo(toX(b), toY(b));
    ctx.stroke();
  }

  ctx.fillStyle = "#00ff88";
  for (const p of landmarks) {
    if (p.visibility !== undefined && p.visibility < 0.5) continue;
    ctx.beginPath();
    ctx.arc(toX(p), toY(p), radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}
