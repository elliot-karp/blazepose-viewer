import { useEffect, useRef, useState } from "react";
import {
  saveImage,
  listImages,
  deleteImage,
  type GalleryEntry,
} from "./galleryDb";
import { runPoseOnImage } from "./runPose";
import { computeAngles, emptyAngles, type JointAngleRow } from "./computeAngles";
import type { Landmark } from "./types/mediapipe";
import type { Locale } from "./translations";
import { translations } from "./translations";

interface GalleryProps {
  locale: Locale;
  angleMode: "2d" | "3d";
  onSelectForCompare?: (entry: GalleryEntry) => void;
  compareMode?: boolean;
}

export default function Gallery({ locale, angleMode, onSelectForCompare, compareMode }: GalleryProps) {
  const t = translations[locale];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbnailUrlsRef = useRef<Record<string, string>>({});

  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [angles, setAngles] = useState<JointAngleRow[]>(emptyAngles());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listImages().then(setEntries);
  }, []);

  // Generate thumbnails from blobs (revoke only on unmount so Strict Mode doesn't break previews)
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
    return () => {};
  }, [entries]);

  useEffect(() => {
    return () => {
      Object.values(thumbnailUrlsRef.current).forEach(URL.revokeObjectURL);
      thumbnailUrlsRef.current = {};
    };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const newEntries = await Promise.all(
      imageFiles.map((file) => saveImage(file, file.name))
    );
    setEntries((prev) => [...newEntries, ...prev]);
    e.target.value = "";
  };

  const handleDelete = async (id: string) => {
    await deleteImage(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setLandmarks(null);
      setAngles(emptyAngles());
    }
  };

  const handleSelect = async (entry: GalleryEntry) => {
    if (compareMode && onSelectForCompare) {
      onSelectForCompare(entry);
      return;
    }
    setSelectedId(entry.id);
    setLoading(true);
    setLandmarks(null);
    setAngles(emptyAngles());
    const url = URL.createObjectURL(entry.blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const lm = await runPoseOnImage(img, canvas);
      setLandmarks(lm);
      setAngles(lm ? computeAngles(lm, angleMode) : emptyAngles());
      setLoading(false);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Recompute angles if angleMode changes while we have landmarks
  useEffect(() => {
    if (landmarks) setAngles(computeAngles(landmarks, angleMode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angleMode]);

  return (
    <div className="gallery">
      <div className="gallery-toolbar">
        <button
          type="button"
          className="gallery-upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          + {t.galleryAdd}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="file-input"
        />
      </div>

      <p className="gallery-storage-note" role="status">
        {t.galleryStorageNote}
      </p>

      {entries.length === 0 && (
        <p className="hint">{t.galleryEmpty}</p>
      )}

      <div className="gallery-grid">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`gallery-thumb ${selectedId === entry.id ? "selected" : ""}`}
          >
            <img
              src={thumbnails[entry.id] ?? ""}
              alt={entry.name}
              onClick={() => handleSelect(entry)}
            />
            <div className="gallery-thumb-info">
              <span className="gallery-thumb-name" title={entry.name}>
                {entry.name}
              </span>
              <button
                type="button"
                className="gallery-thumb-delete"
                onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                title={t.galleryDelete}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedId && (
        <div className="gallery-viewer">
          <div className="gallery-viewer-canvas-wrap">
            {loading && <div className="placeholder">{t.galleryLoading}</div>}
            <canvas
              ref={canvasRef}
              className="canvas"
              style={{ display: loading ? "none" : "block" }}
            />
          </div>
          <div className="gallery-viewer-angles">
            <h3>{t.jointAngles}</h3>
            <ul className="angles-list">
              {angles.map((row, idx) => (
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
          </div>
        </div>
      )}
    </div>
  );
}
