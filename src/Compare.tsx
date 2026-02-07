import { useEffect, useRef, useState } from "react";
import {
  listImages,
  type GalleryEntry,
} from "./galleryDb";
import { runPoseOnImage } from "./runPose";
import { computeAngles, emptyAngles, type JointAngleRow } from "./computeAngles";
import { drawPoseOverlay } from "./drawOverlay";
import type { Landmark } from "./types/mediapipe";
import type { Locale } from "./translations";
import { translations } from "./translations";

export interface PoseSide {
  entry: GalleryEntry | null;
  landmarks: Landmark[] | null;
  angles: JointAngleRow[];
  loading: boolean;
}

export const emptySide = (): PoseSide => ({
  entry: null,
  landmarks: null,
  angles: emptyAngles(),
  loading: false,
});

interface CompareProps {
  locale: Locale;
  angleMode: "2d" | "3d";
  sideA: PoseSide;
  setSideA: React.Dispatch<React.SetStateAction<PoseSide>>;
  sideB: PoseSide;
  setSideB: React.Dispatch<React.SetStateAction<PoseSide>>;
}

export default function Compare({ locale, angleMode, sideA, setSideA, sideB, setSideB }: CompareProps) {
  const t = translations[locale];

  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState<"a" | "b" | null>(null);

  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickingSideRef = useRef<"a" | "b" | null>(null);
  const thumbnailUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    listImages().then(setEntries);
  }, []);

  useEffect(() => {
    const newThumbs: Record<string, string> = {};
    entries.forEach((e) => {
      if (!thumbnailUrlsRef.current[e.id]) {
        const url = URL.createObjectURL(e.blob);
        newThumbs[e.id] = url;
        thumbnailUrlsRef.current[e.id] = url;
      }
    });
    if (Object.keys(newThumbs).length > 0) {
      setThumbnails((prev) => ({ ...prev, ...newThumbs }));
    }
    return () => {
      /* Don't revoke here: React Strict Mode runs cleanup then re-runs effect, which would leave broken URLs. Revoke on unmount only. */
    };
  }, [entries]);

  useEffect(() => {
    return () => {
      Object.values(thumbnailUrlsRef.current).forEach(URL.revokeObjectURL);
      thumbnailUrlsRef.current = {};
    };
  }, []);

  // Redraw canvas when we have persisted A/B data (e.g. after switching back to Compare tab)
  const redrawCanvas = (canvas: HTMLCanvasElement, blob: Blob, landmarks: Landmark[]) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        drawPoseOverlay(ctx, landmarks, img.naturalWidth, img.naturalHeight);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  useEffect(() => {
    if (!sideA.entry || !sideA.landmarks || !canvasARef.current || sideA.loading) return;
    redrawCanvas(canvasARef.current, sideA.entry.blob, sideA.landmarks);
  }, [sideA.entry?.id, sideA.landmarks?.length, sideA.loading]);

  useEffect(() => {
    if (!sideB.entry || !sideB.landmarks || !canvasBRef.current || sideB.loading) return;
    redrawCanvas(canvasBRef.current, sideB.entry.blob, sideB.landmarks);
  }, [sideB.entry?.id, sideB.landmarks?.length, sideB.loading]);

  const loadSide = async (
    entry: GalleryEntry,
    canvas: HTMLCanvasElement | null,
    setSide: React.Dispatch<React.SetStateAction<PoseSide>>
  ) => {
    if (!canvas) return;
    setSide((prev) => ({ ...prev, entry, loading: true, landmarks: null, angles: emptyAngles() }));
    const url = URL.createObjectURL(entry.blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const lm = await runPoseOnImage(img, canvas);
      setSide({
        entry,
        landmarks: lm,
        angles: lm ? computeAngles(lm, angleMode) : emptyAngles(),
        loading: false,
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handlePickFromGallery = (entry: GalleryEntry) => {
    if (picking === "a") {
      loadSide(entry, canvasARef.current, setSideA);
    } else if (picking === "b") {
      loadSide(entry, canvasBRef.current, setSideB);
    }
    setPicking(null);
  };

  const handleUploadForSide = (side: "a" | "b") => {
    pickingSideRef.current = side;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const side = pickingSideRef.current;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    const fakeEntry: GalleryEntry = {
      id: `tmp-${Date.now()}`,
      blob: file,
      name: file.name,
      addedAt: Date.now(),
    };
    img.onload = async () => {
      const canvas = side === "a" ? canvasARef.current : canvasBRef.current;
      const setSide = side === "a" ? setSideA : setSideB;
      if (!canvas) return;
      setSide((prev) => ({ ...prev, entry: fakeEntry, loading: true, landmarks: null, angles: emptyAngles() }));
      const lm = await runPoseOnImage(img, canvas);
      setSide({
        entry: fakeEntry,
        landmarks: lm,
        angles: lm ? computeAngles(lm, angleMode) : emptyAngles(),
        loading: false,
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
    e.target.value = "";
  };

  // Recompute when angleMode changes
  useEffect(() => {
    if (sideA.landmarks) setSideA((s) => ({ ...s, angles: computeAngles(s.landmarks!, angleMode) }));
    if (sideB.landmarks) setSideB((s) => ({ ...s, angles: computeAngles(s.landmarks!, angleMode) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angleMode]);

  const renderSide = (
    side: PoseSide,
    label: string,
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    sideKey: "a" | "b"
  ) => (
    <div className="compare-side">
      <h3>{label}</h3>
      <div className="compare-pick-row">
        <button type="button" className="compare-pick-btn" onClick={() => setPicking(sideKey)}>
          {t.comparePickGallery}
        </button>
        <button type="button" className="compare-pick-btn" onClick={() => handleUploadForSide(sideKey)}>
          {t.compareUpload}
        </button>
      </div>
      <div className="compare-canvas-wrap">
        {side.loading && <div className="placeholder">{t.galleryLoading}</div>}
        <canvas
          ref={canvasRef}
          className="canvas"
          style={{ display: side.entry && !side.loading ? "block" : "none" }}
        />
        {!side.entry && !side.loading && (
          <div className="placeholder">{t.compareChoose}</div>
        )}
      </div>
      {side.entry && !side.loading && (
        <ul className="angles-list compare-angles">
          {side.angles.map((row, idx) => (
            <li
              key={row.name}
              className={`angle-row ${row.value == null ? "angle-row-unavailable" : ""}`}
            >
              <span className="angle-name">{t.jointNames[idx] ?? row.name}</span>
              <span className="angle-value">
                {row.value != null ? `${row.value.toFixed(1)}°` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const hasBothAngles = sideA.landmarks && sideB.landmarks;

  return (
    <div className="compare">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="file-input"
      />

      {picking && (
        <div className="compare-gallery-picker">
          <div className="compare-picker-header">
            <span>{t.comparePickTitle}</span>
            <button type="button" onClick={() => setPicking(null)}>×</button>
          </div>
          {entries.length === 0 && <p className="hint">{t.galleryEmpty}</p>}
          <div className="gallery-grid">
            {entries.map((entry) => (
              <div key={entry.id} className="gallery-thumb" onClick={() => handlePickFromGallery(entry)}>
                <img src={thumbnails[entry.id] ?? ""} alt={entry.name} />
                <span className="gallery-thumb-name">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="compare-sides">
        {renderSide(sideA, "A", canvasARef, "a")}
        {renderSide(sideB, "B", canvasBRef, "b")}
      </div>

      {hasBothAngles && (
        <div className="compare-diff">
          <h3>{t.compareDiff}</h3>
          <ul className="angles-list">
            {sideA.angles.map((rowA, idx) => {
              const rowB = sideB.angles[idx];
              const diff =
                rowA.value != null && rowB?.value != null
                  ? rowA.value - rowB.value
                  : null;
              return (
                <li
                  key={rowA.name}
                  className={`angle-row ${diff == null ? "angle-row-unavailable" : ""}`}
                >
                  <span className="angle-name">{t.jointNames[idx] ?? rowA.name}</span>
                  <span className="angle-value">
                    {diff != null
                      ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)}°`
                      : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
