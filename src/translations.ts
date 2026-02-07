export type Locale = "en" | "es";

const jointNames: [string, string][] = [
  ["Left elbow", "Codo izquierdo"],
  ["Right elbow", "Codo derecho"],
  ["Left knee", "Rodilla izquierda"],
  ["Right knee", "Rodilla derecha"],
  ["Left shoulder", "Hombro izquierdo"],
  ["Right shoulder", "Hombro derecho"],
  ["Left hip", "Cadera izquierda"],
  ["Right hip", "Cadera derecha"],
  ["Neck (L)", "Cuello (L)"],
  ["Torso lean", "Inclinación torso"],
];

export interface TranslationStrings {
  title: string;
  subtitle: string;
  camera: string;
  uploadImage: string;
  gallery: string;
  compare: string;
  displaySize: string;
  savePng: string;
  jointAngles: string;
  smaller: string;
  larger: string;
  startingCamera: string;
  clickToUpload: string;
  noPoseHint: string;
  errorCamera: string;
  angleHelpShow: string;
  angleHelpHide: string;
  angleHelpContent: string;
  angleHelpNote: string;
  jointNames: string[];
  galleryAdd: string;
  galleryEmpty: string;
  galleryDelete: string;
  galleryLoading: string;
  comparePickGallery: string;
  compareUpload: string;
  compareChoose: string;
  comparePickTitle: string;
  compareDiff: string;
  sidebarExpand: string;
  sidebarCollapse: string;
  galleryStorageNote: string;
  saveToGallery: string;
  saveToGalleryNamePlaceholder: string;
}

export const translations: Record<Locale, TranslationStrings> = {
  en: {
    title: "BlazePose Viewer",
    subtitle: "Full-body pose + joint angles",
    camera: "Camera",
    uploadImage: "Upload",
    gallery: "Gallery",
    compare: "Compare",
    displaySize: "Display size:",
    savePng: "Save PNG",
    jointAngles: "Joint angles (°)",
    smaller: "Smaller",
    larger: "Larger",
    startingCamera: "Starting camera…",
    clickToUpload: "Click to upload an image",
    noPoseHint: "No pose detected. Try a clearer full-body image.",
    errorCamera: "Camera access denied or unavailable.",
    angleHelpShow: "How are angles calculated?",
    angleHelpHide: "Hide",
    angleHelpContent:
      "Each angle is the angle at the joint between the two segments. 2D uses only x,y (matches the overlay). 3D uses x,y,z and can look wrong when the bend is in depth. Formula: angle at B = arccos((BA·BC) / (|BA||BC|)). 180° = straight, smaller = more bent.",
    angleHelpNote: "Toggle 2D/3D above. See ANGLE_CALCULATION.md and ANGLE_EXPLORATION.md in the repo.",
    jointNames: jointNames.map(([en]) => en),
    galleryAdd: "Add image",
    galleryEmpty: "No images yet. Add one to get started.",
    galleryDelete: "Delete",
    galleryLoading: "Analyzing…",
    comparePickGallery: "From gallery",
    compareUpload: "Upload",
    compareChoose: "Choose an image",
    comparePickTitle: "Pick an image from gallery",
    compareDiff: "Angle difference (A − B)",
    sidebarExpand: "Show tabs",
    sidebarCollapse: "Hide tabs",
    galleryStorageNote: "Images are stored in this browser only. Clearing site data will remove them. Moving or deleting the original files on your device does not affect the gallery.",
    saveToGallery: "Save to gallery",
    saveToGalleryNamePlaceholder: "Name for this capture",
  },
  es: {
    title: "BlazePose Viewer",
    subtitle: "Pose corporal + ángulos",
    camera: "Cámara",
    uploadImage: "Subir",
    gallery: "Galería",
    compare: "Comparar",
    displaySize: "Tamaño:",
    savePng: "Guardar PNG",
    jointAngles: "Ángulos (°)",
    smaller: "Menor",
    larger: "Mayor",
    startingCamera: "Iniciando cámara…",
    clickToUpload: "Clic para subir una imagen",
    noPoseHint: "No se detectó pose. Prueba con una imagen más clara.",
    errorCamera: "Acceso a la cámara denegado o no disponible.",
    angleHelpShow: "¿Cómo se calculan los ángulos?",
    angleHelpHide: "Ocultar",
    angleHelpContent:
      "Cada ángulo es el ángulo en la articulación entre los dos segmentos. 2D usa solo x,y (coincide con la superposición). 3D usa x,y,z y puede verse mal cuando el doblez es en profundidad. Fórmula: ángulo en B = arccos((BA·BC) / (|BA||BC|)). 180° = recto, menor = más doblado.",
    angleHelpNote: "Alterna 2D/3D arriba. Ver ANGLE_CALCULATION.md y ANGLE_EXPLORATION.md en el repo.",
    jointNames: jointNames.map(([, es]) => es),
    galleryAdd: "Agregar imagen",
    galleryEmpty: "No hay imágenes. Agrega una para empezar.",
    galleryDelete: "Eliminar",
    galleryLoading: "Analizando…",
    comparePickGallery: "De galería",
    compareUpload: "Subir",
    compareChoose: "Elige una imagen",
    comparePickTitle: "Elige una imagen de la galería",
    compareDiff: "Diferencia de ángulos (A − B)",
    sidebarExpand: "Mostrar pestañas",
    sidebarCollapse: "Ocultar pestañas",
    galleryStorageNote: "Las imágenes se guardan solo en este navegador. Borrar los datos del sitio las eliminará. Mover o borrar los archivos originales en tu dispositivo no afecta la galería.",
    saveToGallery: "Guardar en galería",
    saveToGalleryNamePlaceholder: "Nombre de esta captura",
  },
};
