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

export const translations: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    camera: string;
    uploadImage: string;
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
  }
> = {
  en: {
    title: "BlazePose Viewer",
    subtitle: "Full-body pose + joint angles · Camera or upload image",
    camera: "Camera",
    uploadImage: "Upload image",
    displaySize: "Display size:",
    savePng: "Save PNG (overlay + angles)",
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
  },
  es: {
    title: "BlazePose Viewer",
    subtitle: "Pose corporal + ángulos · Cámara o subir imagen",
    camera: "Cámara",
    uploadImage: "Subir imagen",
    displaySize: "Tamaño:",
    savePng: "Guardar PNG (superposición + ángulos)",
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
  },
};
