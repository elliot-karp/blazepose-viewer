# Why angle calculations can look wrong (especially past 90°)

## What we were doing

We compute the **3D angle** at the joint: angle between the two limb segments using **x, y, and z** from BlazePose:

- **Straight arm** → vectors opposite → **~180°** ✓  
- **Bent 90° in the plane of the camera** → **~90°** ✓  
- **Bent further (e.g. forearm toward shoulder)** → in 3D the angle can **disagree** with what you see on screen

## Why “past 90” gets weird

1. **3D vs what you see**  
   The number is the angle in **3D space**. Your eye (and the overlay) see a **2D projection**. As soon as the arm rotates in depth (e.g. elbow bend going “into” or “out of” the camera), the 3D angle and the 2D angle diverge. So you can get values that feel wrong (e.g. still ~120° when it looks like 45° on screen).

2. **Depth (z) is relative and noisier**  
   BlazePose’s **z** is relative depth (not in the same units as x/y). When the forearm moves toward/away from the camera, z changes a lot and can be noisier. Including z in the angle mixes that into one number, so the angle can jump or behave oddly when you go “past 90” in a way that involves depth.

3. **One number can’t capture “bend in depth”**  
   For a single angle we only get one value. If the bend is partly in the screen plane and partly in depth, 3D angle is a mix of both, so it won’t match the obvious “bend” you see in 2D.

## Fix: use 2D angle (x, y only)

If we **ignore z** and compute the angle using only **x and y** (the same coordinates we use to draw the overlay):

- The angle is exactly the angle **in the image plane**.
- **180°** = straight on screen, **90°** = right angle on screen, **0°** = fully bent on screen.
- “Past 90” then behaves as expected: the number keeps decreasing as you bend more in the picture.

So the app now uses **2D angles** (x, y only) for the displayed joint angles. That way the value matches the green skeleton you see; 3D is no longer used for the on-screen numbers.
