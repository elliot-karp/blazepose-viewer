import { useEffect, useRef, useState } from "react";
import type { Landmark } from "./types/mediapipe";
import { JOINT_ANGLES } from "./poseConstants";
import { drawPoseOverlay } from "./drawOverlay";
import { computeAngles, emptyAngles, type JointAngleRow } from "./computeAngles";
import { translations, type Locale } from "./translations";

const LOCALE_STORAGE_KEY = "blazepose-viewer-locale";

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
  } catch {
    /* ignore */
  }
  return "en";
}
import { saveImage } from "./galleryDb";
import Gallery from "./Gallery";
import Compare, { emptySide, type PoseSide } from "./Compare";
import "./App.css";

type Mode = "camera" | "gallery" | "compare";
type AngleMode = "2d" | "3d";

const DISPLAY_SIZE_PX = [400, 500, 600, 720, 880, 1024, 1200, 1440, 1680];
const DEFAULT_DISPLAY_SIZE_INDEX = 2; // 600px

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<Mode>("camera");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [displaySizeIndex, setDisplaySizeIndex] = useState(DEFAULT_DISPLAY_SIZE_INDEX);
  const [angleMode, setAngleMode] = useState<AngleMode>("2d");
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [angles, setAngles] = useState<JointAngleRow[]>(emptyAngles());
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [showAngleHelp, setShowAngleHelp] = useState(false);
  const [compareSideA, setCompareSideA] = useState<PoseSide>(emptySide());
  const [compareSideB, setCompareSideB] = useState<PoseSide>(emptySide());
  const [galleryCaptureName, setGalleryCaptureName] = useState("");

  useEffect(() => {
    if (landmarks) setAngles(computeAngles(landmarks, angleMode));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only recompute when user toggles 2D/3D
  }, [angleMode]);

  function switchMode(m: Mode) {
    setMode(m);
  }

  function createPose(smoothLandmarks = false) {
    if (typeof window.Pose === "undefined") return null;
    const pose = new window.Pose({
      locateFile: (file: string) =>
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

  // Camera mode
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
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
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
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      pose.onResults((results) => {
        if (cancelled) return;
        const lm = results.poseLandmarks;
        if (lm) {
          setLandmarks(lm);
          setAngles(computeAngles(lm, angleMode));
        } else {
          setLandmarks(null);
          setAngles(emptyAngles());
        }
        if (video.videoWidth && video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          if (lm) drawPoseOverlay(ctx, lm, video.videoWidth, video.videoHeight);
        }
      });

      let rafId: number | undefined;
      if (typeof window.Camera !== "undefined") {
        const camera = new window.Camera(video, {
          onFrame: async () => { if (!cancelled) await pose.send({ image: video }); },
          width: 640, height: 480,
        });
        camera.start();
      } else {
        const onFrame = async () => { if (cancelled) return; await pose.send({ image: video }); rafId = requestAnimationFrame(onFrame); };
        rafId = requestAnimationFrame(onFrame);
      }

      return () => {
        cancelled = true;
        if (rafId != null) cancelAnimationFrame(rafId);
        if (video.srcObject) (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      };
    };

    run().then((fn) => { cleanup = fn ?? null; if (cancelled) cleanup?.(); });
    return () => { cancelled = true; cleanup?.(); };
  }, [mode]);

  const defaultGalleryCaptureName = () =>
    `Camera ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;

  const handleSaveToGallery = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    const name = galleryCaptureName.trim() || defaultGalleryCaptureName();
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        saveImage(blob, name.endsWith(".png") ? name : `${name}.png`);
        setGalleryCaptureName("");
      },
      "image/png",
      0.95
    );
  };

  // Save PNG
  const handleSavePng = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    const t = translations[locale];
    const scale = 1.35;
    const lines = angles
      .map((a, idx) => a.value != null ? `${t.jointNames[idx] ?? a.name}: ${a.value!.toFixed(1)}°` : null)
      .filter((s): s is string => s != null);
    const anglesText = lines.join("\n");
    const padding = 18; const lineHeight = 20; const font = "15px system-ui, sans-serif";
    const textHeight = anglesText ? lines.length * lineHeight + padding * 2 : 0;
    const composite = document.createElement("canvas");
    composite.width = Math.round(canvas.width * scale);
    composite.height = Math.round(canvas.height * scale) + textHeight;
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

  const canSavePng = mode === "camera" && cameraReady && landmarks;
  const t = translations[locale];

  return (
    <div className="app">
      <header className="header">
        <div className="header-main">
          <div>
            <h1>{t.title}</h1>
            <p className="subtitle">{t.subtitle}</p>
          </div>
          <div className="locale-switcher">
            <button type="button" className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} title="English" aria-label="English">🇺🇸</button>
            <button type="button" className={locale === "es" ? "active" : ""} onClick={() => setLocale("es")} title="Español" aria-label="Español">🇦🇷</button>
          </div>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="app-layout">
        <aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? t.sidebarExpand : t.sidebarCollapse}
            aria-label={sidebarCollapsed ? t.sidebarExpand : t.sidebarCollapse}
          >
            {sidebarCollapsed ? "☰" : "◀"}
          </button>
          {!sidebarCollapsed && (
            <nav className="mode-tabs-vertical" role="tablist" aria-label="Modes">
              {(["camera", "gallery", "compare"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  className={mode === m ? "active" : ""}
                  onClick={() => switchMode(m)}
                >
                  {m === "camera" ? t.camera : m === "gallery" ? t.gallery : t.compare}
                </button>
              ))}
            </nav>
          )}
        </aside>

        <div className="main-content">
      {/* Camera mode */}
      {mode === "camera" && (
        <div className="main">
          <section className="camera-section">
            <div className="display-size-tabs">
              <span className="display-size-label">{t.displaySize}</span>
              <button type="button" className="display-size-btn" onClick={() => setDisplaySizeIndex((i) => Math.max(0, i - 1))} disabled={displaySizeIndex === 0} aria-label={t.smaller}>−</button>
              <button type="button" className="display-size-btn" onClick={() => setDisplaySizeIndex((i) => Math.min(DISPLAY_SIZE_PX.length - 1, i + 1))} disabled={displaySizeIndex === DISPLAY_SIZE_PX.length - 1} aria-label={t.larger}>+</button>
            </div>
            <div className="video-wrap" style={{ maxWidth: DISPLAY_SIZE_PX[displaySizeIndex] }}>
              <video ref={videoRef} autoPlay muted playsInline style={{ display: "none" }} />
              <canvas ref={canvasRef} className="canvas" style={{ display: cameraReady ? "block" : "none" }} />
              {!cameraReady && !error && <div className="placeholder">{t.startingCamera}</div>}
            </div>
            {canSavePng && (
              <div className="camera-save-row">
                <input
                  type="text"
                  className="camera-capture-name"
                  placeholder={t.saveToGalleryNamePlaceholder}
                  value={galleryCaptureName}
                  onChange={(e) => setGalleryCaptureName(e.target.value)}
                />
                <button type="button" className="save-png-btn" onClick={handleSaveToGallery}>
                  {t.saveToGallery}
                </button>
                <button type="button" className="save-png-btn" onClick={handleSavePng}>
                  {t.savePng}
                </button>
              </div>
            )}
          </section>

          <aside className="angles-panel">
            <div className="angles-panel-header">
              <h2>{t.jointAngles}</h2>
              <div className="angle-mode-tabs">
                <button type="button" className={angleMode === "2d" ? "active" : ""} onClick={() => setAngleMode("2d")} title="2D (x,y)">2D</button>
                <button type="button" className={angleMode === "3d" ? "active" : ""} onClick={() => setAngleMode("3d")} title="3D (x,y,z)">3D</button>
              </div>
            </div>
            <ul className="angles-list">
              {angles.map((row, idx) => (
                <li key={row.name} className={`angle-row ${row.value == null ? "angle-row-unavailable" : ""}`}>
                  <span className="angle-name">{t.jointNames[idx] ?? row.name}</span>
                  <span className="angle-value">{row.value != null ? `${row.value.toFixed(1)}°` : "—"}</span>
                </li>
              ))}
            </ul>
            {!landmarks && cameraReady && <p className="hint">{t.noPoseHint}</p>}
            <div className="angle-help">
              <button type="button" className="angle-help-toggle" onClick={() => setShowAngleHelp(!showAngleHelp)}>
                {showAngleHelp ? t.angleHelpHide : t.angleHelpShow}
              </button>
              {showAngleHelp && (
                <div className="angle-help-content">
                  <p>{t.angleHelpContent}</p>
                  <p className="angle-help-note">{t.angleHelpNote}</p>
                  <ul className="angle-help-list">
                    {JOINT_ANGLES.map(({ name, description }, i) => (
                      <li key={name}><strong>{t.jointNames[i] ?? name}</strong>: {description}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Gallery mode */}
      {mode === "gallery" && (
        <div className="main">
          <Gallery locale={locale} angleMode={angleMode} />
        </div>
      )}

      {/* Compare mode */}
      {mode === "compare" && (
        <div className="main">
          <Compare
            locale={locale}
            angleMode={angleMode}
            sideA={compareSideA}
            setSideA={setCompareSideA}
            sideB={compareSideB}
            setSideB={setCompareSideB}
          />
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

export default App;
