import type { Landmark } from "./types/mediapipe";
import { JOINT_ANGLES, angleAtJoint, angleAtJoint2D } from "./poseConstants";

export interface JointAngleRow {
  name: string;
  value: number | null;
}

const VISIBILITY_THRESHOLD = 0.5;

export function computeAngles(
  lm: Landmark[],
  angleMode: "2d" | "3d"
): JointAngleRow[] {
  return JOINT_ANGLES.map(({ name, indices }) => {
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
}

export function emptyAngles(): JointAngleRow[] {
  return JOINT_ANGLES.map(({ name }) => ({ name, value: null }));
}
