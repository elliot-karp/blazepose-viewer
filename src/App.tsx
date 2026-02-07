import { useEffect, useRef, useState } from "react";
import type { Landmark } from "./types/mediapipe";
import {
  JOINT_ANGLES,
  angleAtJoint,
} from "./poseConstants";
import { drawPoseOverlay } from "./drawOverlay";
import "./App.css";

export interface JointAngleRow {
  name: string;
  value: number | null;
}

type Mode = "camera" | "image";
type DisplaySize = "compact" | "default" | "large";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("camera");
  const [displaySize, setDisplaySize] = useState<DisplaySize>("default");
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
      const val =
        lm[i] && lm[j] && lm[k]
          ? angleAtJoint(lm[i], lm[j], lm[k])
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
    const lines = angles
      .filter((a) => a.value != null)
      .map((a) => `${a.name}: ${a.value!.toFixed(1)}°`);
    const anglesText = lines.join("\n");
    let targetCanvas: HTMLCanvasElement = canvas;
    if (anglesText) {
      const padding = 12;
      const lineHeight = 14;
      const font = "12px system-ui, sans-serif";
      const textHeight = lines.length * lineHeight + padding * 2;
      const totalHeight = canvas.height + textHeight;
      const composite = document.createElement("canvas");
      composite.width = canvas.width;
      composite.height = totalHeight;
      const compCtx = composite.getContext("2d");
      if (compCtx) {
        compCtx.font = font;
        compCtx.fillStyle = "#18181b";
        compCtx.fillRect(0, 0, composite.width, composite.height);
        compCtx.drawImage(canvas, 0, 0);
        compCtx.fillStyle = "#00ff88";
        compCtx.fillRect(0, canvas.height, composite.width, textHeight);
        compCtx.fillStyle = "#0f0f12";
        lines.forEach((line, i) => {
          compCtx.fillText(line, padding, canvas.height + padding + (i + 1) * lineHeight);
        });
      }
      targetCanvas = composite;
    }
    const link = document.createElement("a");
    link.download = `blazepose-${Date.now()}.png`;
    link.href = targetCanvas.toDataURL("image/png");
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
            {(["compact", "default", "large"] as const).map((size) => (
              <button
                key={size}
                type="button"
                className={displaySize === size ? "active" : ""}
                onClick={() => setDisplaySize(size)}
              >
                {size === "compact" ? "Small" : size === "default" ? "Medium" : "Large"}
              </button>
            ))}
          </div>
          <div className={`video-wrap display-size-${displaySize}`}>
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
                    Click or drop to upload an image
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
          <h2>Joint angles (°)</h2>
          <ul className="angles-list">
            {angles.map(({ name, value }) => (
              <li key={name} className="angle-row">
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
                  Each angle is the <strong>3D angle at the joint</strong> between the two body segments (e.g. upper arm and forearm at the elbow). Formula: angle at B between points A and C = arccos((BA·BC) / (|BA||BC|)) in degrees. 180° = straight, smaller = more bent.
                </p>
                <p className="angle-help-note">Angles use BlazePose’s x,y,z (normalized + depth). They can look different from a 2D view because we measure in 3D. See <code>ANGLE_CALCULATION.md</code> in the repo for full details.</p>
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
