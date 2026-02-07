# How joint angles are calculated

## Formula

Every angle is the **angle at the middle point (the joint)** between the two segments that meet there.

We use three landmarks: **A** (proximal), **B** (joint), **C** (distal). The angle at **B** is the angle between the vectors **B→A** and **B→C** in 3D (x, y, z from BlazePose).

- Vector **BA** = (A.x − B.x, A.y − B.y, A.z − B.z)  
- Vector **BC** = (C.x − B.x, C.y − B.y, C.z − B.z)  
- **Angle** = arccos( (BA · BC) / (|BA| × |BC|) ) × 180/π degrees  

So we’re measuring the **3D angle** between the two segments. Straight = 180°, fully bent (segments in line pointing opposite) = 0°.

## Why angles can look “wrong”

1. **3D vs 2D** – The value is the angle in 3D space. If the joint bends mainly “into” or “out of” the camera (e.g. elbow going toward the camera), the number can look different from what you’d read off the screen in 2D.
2. **Normalized coordinates** – BlazePose gives x, y in normalized [0, 1] and z relative to the hip. Small landmark errors can change the angle a bit.
3. **Which bend** – For joints like the shoulder, several directions of movement (flexion, abduction, rotation) are mixed into one number; we’re only measuring the angle between the two segments, not “flexion” in a specific anatomical plane.

## What each angle is

| Angle name       | Proximal (A) | Joint (B) | Distal (C) | Meaning |
|------------------|--------------|-----------|------------|--------|
| **Left elbow**   | Left shoulder (11) | Left elbow (13) | Left wrist (15) | Bend at left elbow. ~180° straight arm, smaller when bent. |
| **Right elbow**  | Right shoulder (12) | Right elbow (14) | Right wrist (16) | Same for right arm. |
| **Left knee**    | Left hip (23) | Left knee (25) | Left ankle (27) | Bend at left knee. ~180° straight leg, ~90° when seated. |
| **Right knee**   | Right hip (24) | Right knee (26) | Right ankle (28) | Same for right leg. |
| **Left shoulder** | Left hip (23) | Left shoulder (11) | Left elbow (13) | Angle between torso (hip→shoulder) and upper arm (shoulder→elbow). Combines arm raise and forward/back. |
| **Right shoulder** | Right hip (24) | Right shoulder (12) | Right elbow (14) | Same for right. |
| **Left hip**     | Left shoulder (11) | Left hip (23) | Left knee (25) | Angle at left hip between torso and thigh. |
| **Right hip**    | Right shoulder (12) | Right hip (24) | Right knee (26) | Same for right. |
| **Neck (L)**     | Left shoulder (11) | Nose (0) | Right shoulder (12) | Angle at the nose between the two shoulders. Indicates head tilt left/right relative to shoulders. |
| **Torso lean**   | Left hip (23) | Left shoulder (11) | Right hip (24) | Angle at left shoulder between “to left hip” and “to right hip”. Rough idea of torso twist / lean, not a classic anatomical angle. |

Landmark indices (BlazePose): 0 nose, 11 left shoulder, 12 right shoulder, 13 left elbow, 14 right elbow, 15 left wrist, 16 right wrist, 23 left hip, 24 right hip, 25 left knee, 26 right knee, 27 left ankle, 28 right ankle.

## Summary

- **Elbow / knee**: “Bend” of that limb; 180° = straight, smaller = more bent.  
- **Shoulder / hip**: Angle between torso segment and limb segment; depends on both body and limb orientation.  
- **Neck (L)**: Head tilt relative to the shoulder line.  
- **Torso lean**: Rough torso orientation between the two hips, from the left shoulder.

All angles are in **degrees** and use the **same 3D dot-product formula** at the joint.
