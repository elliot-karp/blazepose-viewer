import { useEffect, useRef, useState } from "react";
import type { Landmark } from "./types/mediapipe";
import {
  JOINT_ANGLES,
  angleAtJoint,
  angleAtJoint2D,
} from "./poseConstants";
import { drawPoseOverlay } from "./drawOverlay";
import "./App.css";

export interface JointAngleRow {
  name: string;
  value: number | null;
}

type Mode = "camera" | "image";
type AngleMode = "2d" | "3d";

const DISPLAY_SIZE_PX = [400, 500, 600, 720, 880, 1024];
const DEFAULT_DISPLAY_SIZE_INDEX = 2; // 600px
const VISIBILITY_THRESHOLD = 0.5;

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("camera");
  const [displaySizeIndex, setDisplaySizeIndex] = useState(DEFAULT_DISPLAY_SIZE_INDEX);
  const [angleMode, setAngleMode] = useState<AngleMode>("2d");
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [angles, setAngles] = useState<JointAngleRow[]>(() =>
    JOINT_ANGLES.map(({ name }) => ({ name, value: null }))
  );
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [showAngleHelp, setShowAngleHelp] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const poseRef = useRef<ReturnType<typeof createPose> | null>(null);

  useEffect(() => {
    if (landmarks) updateAnglesFromLandmarks(landmarks);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only recompute when user toggles 2D/3D
  }, [angleMode]);

  function switchToCamera() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setImageReady(false);
    setMode("camera");
  }

  function createPose(smoothLandmarks = false) {
    if (typeof window.Pose === "undefined") return null;
    const pose = new window.Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    return pose;
  }

  function updateAnglesFromLandmarks(lm: Landmark[]) {
    const rows: JointAngleRow[] = JOINT_ANGLES.map(({ name, indices }) => {
      const [i, j, k] = indices;
      const a = lm[i];
      const b = lm[j];
      const c = lm[k];
      const visible =
        a && b && c &&
        (a.visibility == null || a.visibility >= VISIBILITY_THRESHOLD) &&
        (b.visibility == null || b.visibility >= VISIBILITY_THRESHOLD) &&
        (c.visibility == null || c.visibility >= VISIBILITY_THRESHOLD);
      const val = visible
        ? (angleMode === "2d" ? angleAtJoint2D(a, b, c) : angleAtJoint(a, b, c))
        : null;
      return { name, value: val };
    });
    setAngles(rows);
  }

  function drawFrame(
    source: HTMLVideoElement | HTMLImageElement,
    lm: Landmark[] | undefined
  ) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
    const h = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(source, 0, 0, w, h);
    if (lm) drawPoseOverlay(ctx, lm, w, h);
  }

  // Camera mode: start stream and pose loop
  useEffect(() => {
    if (mode !== "camera") return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || typeof window.Pose === "undefined") return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const run = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        setCameraReady(true);
        setError(null);
      } catch {
        setError("Camera access denied or unavailable.");
        return;
      }

      const pose = createPose(true);
      if (!pose) return;
      poseRef.current = pose;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      pose.onResults((results) => {
        if (cancelled) return;
        const lm = results.poseLandmarks;
        if (lm) {
          setLandmarks(lm);
          updateAnglesFromLandmarks(lm);
        } else {
          setLandmarks(null);
          setAngles(JOINT_ANGLES.map(({ name }) => ({ name, value: null })));
        }
        if (video.videoWidth && video.videoHeight) {
          drawFrame(video, lm ?? undefined);
        }
      });

      let rafId: number | undefined;
      if (typeof window.Camera !== "undefined") {
        const camera = new window.Camera(video, {
          onFrame: async () => {
            if (cancelled) return;
            await pose.send({ image: video });
          },
          width: 640,
          height: 480,
        });
        camera.start();
      } else {
        const onFrame = async () => {
          if (cancelled) return;
          await pose.send({ image: video });
          rafId = requestAnimationFrame(onFrame);
        };
        rafId = requestAnimationFrame(onFrame);
      }

      return () => {
        cancelled = true;
        if (rafId != null) cancelAnimationFrame(rafId);
        if (video.srcObject) {
          (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        }
      };
    };

    run().then((fn) => {
      cleanup = fn ?? null;
      if (cancelled) cleanup?.();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [mode]);

  // Image mode: when user selects a file, load image and run pose once
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    setImageReady(false);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      imageRef.current = img;
      if (typeof window.Pose === "undefined") {
        setError("Pose not loaded.");
        return;
      }
      const pose = createPose(false);
      if (!pose) return;
      poseRef.current = pose;
      pose.onResults((results) => {
        const lm = results.poseLandmarks;
        if (lm) {
          setLandmarks(lm);
          updateAnglesFromLandmarks(lm);
        } else {
          setLandmarks(null);
          setAngles(JOINT_ANGLES.map(({ name }) => ({ name, value: null })));
        }
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          if (lm) drawPoseOverlay(ctx, lm, img.naturalWidth, img.naturalHeight);
        }
      });
      await pose.send({ image: img });
      setImageReady(true);
    };
    img.onerror = () => setError("Failed to load image.");
    img.src = url;
    e.target.value = "";
  };

  const handleSavePng = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    const scale = 1.35;
    const lines = angles
      .filter((a) => a.value != null)
      .map((a) => `${a.name}: ${a.value!.toFixed(1)}°`);
    const anglesText = lines.join("\n");
    const padding = 18;
    const lineHeight = 20;
    const font = "15px system-ui, sans-serif";
    const textHeight = anglesText ? lines.length * lineHeight + padding * 2 : 0;
    const totalHeight = Math.round(canvas.height * scale) + textHeight;
    const composite = document.createElement("canvas");
    composite.width = Math.round(canvas.width * scale);
    composite.height = totalHeight;
    const compCtx = composite.getContext("2d");
    if (compCtx) {
      compCtx.fillStyle = "#18181b";
      compCtx.fillRect(0, 0, composite.width, composite.height);
      compCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, composite.width, Math.round(canvas.height * scale));
      if (anglesText) {
        compCtx.fillStyle = "#00ff88";
        compCtx.fillRect(0, Math.round(canvas.height * scale), composite.width, textHeight);
        compCtx.fillStyle = "#0f0f12";
        compCtx.font = font;
        lines.forEach((line, i) => {
          compCtx.fillText(line, padding, Math.round(canvas.height * scale) + padding + (i + 1) * lineHeight);
        });
      }
    }
    const link = document.createElement("a");
    link.download = `blazepose-${Date.now()}.png`;
    link.href = composite.toDataURL("image/png");
    link.click();
  };

  const canSavePng = (mode === "camera" && cameraReady && landmarks) || (mode === "image" && imageReady);

  return (
    <div className="app">
      <header className="header">
        <h1>BlazePose Viewer</h1>
        <p className="subtitle">Full-body pose + joint angles · Camera or upload image</p>
        <div className="mode-tabs">
          <button
            type="button"
            className={mode === "camera" ? "active" : ""}
            onClick={switchToCamera}
          >
            Camera
          </button>
          <button
            type="button"
            className={mode === "image" ? "active" : ""}
            onClick={() => setMode("image")}
          >
            Upload image
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="main">
        <section className="camera-section">
          <div className="display-size-tabs">
            <span className="display-size-label">Display size:</span>
            <button
              type="button"
              className="display-size-btn"
              onClick={() => setDisplaySizeIndex((i) => Math.max(0, i - 1))}
              disabled={displaySizeIndex === 0}
              aria-label="Smaller"
            >
              −
            </button>
            <button
              type="button"
              className="display-size-btn"
              onClick={() => setDisplaySizeIndex((i) => Math.min(DISPLAY_SIZE_PX.length - 1, i + 1))}
              disabled={displaySizeIndex === DISPLAY_SIZE_PX.length - 1}
              aria-label="Larger"
            >
              +
            </button>
          </div>
          <div
            className="video-wrap"
            style={{ maxWidth: DISPLAY_SIZE_PX[displaySizeIndex] }}
          >
            {mode === "camera" && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ display: "none" }}
                />
                <canvas
                  ref={canvasRef}
                  className="canvas"
                  style={{ display: cameraReady ? "block" : "none" }}
                />
                {!cameraReady && !error && (
                  <div className="placeholder">Starting camera…</div>
                )}
              </>
            )}
            {mode === "image" && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="file-input"
                />
                <canvas
                  ref={canvasRef}
                  className="canvas"
                  style={{ display: imageReady ? "block" : "none" }}
                />
                {!imageReady && !error && (
                  <div
                    className="placeholder clickable"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                  >
                    Click to upload an image
                  </div>
                )}
              </>
            )}
          </div>
          {canSavePng && (
            <button type="button" className="save-png-btn" onClick={handleSavePng}>
              Save PNG (overlay + angles)
            </button>
          )}
        </section>

        <aside className="angles-panel">
          <div className="angles-panel-header">
            <h2>Joint angles (°)</h2>
            <div className="angle-mode-tabs">
              <button
                type="button"
                className={angleMode === "2d" ? "active" : ""}
                onClick={() => setAngleMode("2d")}
                title="Matches the angle you see on screen (x, y only)"
              >
                2D
              </button>
              <button
                type="button"
                className={angleMode === "3d" ? "active" : ""}
                onClick={() => setAngleMode("3d")}
                title="Uses x, y, z; can differ from screen when joint bends in depth"
              >
                3D
              </button>
            </div>
          </div>
          <ul className="angles-list">
            {angles.map(({ name, value }) => (
              <li
                key={name}
                className={`angle-row ${value == null ? "angle-row-unavailable" : ""}`}
              >
                <span className="angle-name">{name}</span>
                <span className="angle-value">
                  {value != null ? `${value.toFixed(1)}°` : "—"}
                </span>
              </li>
            ))}
          </ul>
          {!landmarks && (cameraReady || imageReady) && (
            <p className="hint">No pose detected. Try a clearer full-body image.</p>
          )}

          <div className="angle-help">
            <button
              type="button"
              className="angle-help-toggle"
              onClick={() => setShowAngleHelp(!showAngleHelp)}
            >
              {showAngleHelp ? "Hide" : "How are angles calculated?"}
            </button>
            {showAngleHelp && (
              <div className="angle-help-content">
                <p>
                  Each angle is the angle at the joint between the two segments. <strong>2D</strong> uses only x,y (matches the overlay). <strong>3D</strong> uses x,y,z and can look wrong when the bend is in depth. Formula: angle at B = arccos((BA·BC) / (|BA||BC|)). 180° = straight, smaller = more bent.
                </p>
                <p className="angle-help-note">Toggle 2D/3D above. See <code>ANGLE_CALCULATION.md</code> and <code>ANGLE_EXPLORATION.md</code> in the repo.</p>
                <ul className="angle-help-list">
                  {JOINT_ANGLES.map(({ name, description }) => (
                    <li key={name}>
                      <strong>{name}</strong>: {description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
