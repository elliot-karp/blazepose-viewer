import type { Landmark } from "./types/mediapipe";

/** BlazePose 33-landmark skeleton connections: [fromIndex, toIndex] */
export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // shoulders, arms
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], // torso, legs
  [27, 29], [29, 31], [28, 30], [30, 32], // feet
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22], // hands
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10], // face
];

/** Joint angle: name, [proximal, joint, distal] indices, short description */
export const JOINT_ANGLES: {
  name: string;
  indices: [number, number, number];
  description: string;
}[] = [
  { name: "Left elbow", indices: [11, 13, 15], description: "Bend at elbow (shoulder–elbow–wrist). 180° straight." },
  { name: "Right elbow", indices: [12, 14, 16], description: "Same for right arm." },
  { name: "Left knee", indices: [23, 25, 27], description: "Bend at knee (hip–knee–ankle). 180° straight." },
  { name: "Right knee", indices: [24, 26, 28], description: "Same for right leg." },
  { name: "Left shoulder", indices: [23, 11, 13], description: "Angle between torso (hip→shoulder) and upper arm." },
  { name: "Right shoulder", indices: [24, 12, 14], description: "Same for right." },
  { name: "Left hip", indices: [11, 23, 25], description: "Angle at hip between torso and thigh." },
  { name: "Right hip", indices: [12, 24, 26], description: "Same for right." },
  { name: "Neck (L)", indices: [11, 0, 12], description: "Head tilt: angle at nose between shoulders." },
  { name: "Torso lean", indices: [23, 11, 24], description: "Angle at left shoulder between the two hips (torso orientation)." },
];

/**
 * 3D angle at landmark B between vectors BA and BC, in degrees.
 * Uses x, y, z — can disagree with what you see on screen when the bend is in depth.
 */
export function angleAtJoint(
  a: Landmark,
  b: Landmark,
  c: Landmark
): number | null {
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magBa = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
  const magBc = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);
  if (magBa < 1e-6 || magBc < 1e-6) return null;
  const cos = Math.max(-1, Math.min(1, dot / (magBa * magBc)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * 2D angle at landmark B between vectors BA and BC using only x, y (image plane).
 * Matches the angle you see on the overlay: 180° straight, 90° right angle, 0° fully bent.
 * Use this so displayed angles don’t “get weird” when the joint bends in depth.
 */
export function angleAtJoint2D(
  a: Landmark,
  b: Landmark,
  c: Landmark
): number | null {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const dot = bax * bcx + bay * bcy;
  const magBa = Math.sqrt(bax * bax + bay * bay);
  const magBc = Math.sqrt(bcx * bcx + bcy * bcy);
  if (magBa < 1e-6 || magBc < 1e-6) return null;
  const cos = Math.max(-1, Math.min(1, dot / (magBa * magBc)));
  return (Math.acos(cos) * 180) / Math.PI;
}
