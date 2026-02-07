# BlazePose Viewer

React app that runs **full-body BlazePose** from your camera: overlay on the feed + live joint angles in a sidebar.

- **MediaPipe Pose** (BlazePose) runs in the browser via CDN scripts.
- Skeleton and landmarks are drawn over the video.
- Joint angles (elbow, knee, shoulder, hip, neck, torso) are computed from the 33 landmarks and shown in degrees.

## Run

```bash
npm install
npm run dev
```

Allow camera access when prompted. Move into frame to see the pose overlay and angle list.

## Build

```bash
npm run build
npm run preview
```

Live: [GitHub Pages](https://elliot-karp.github.io/blazepose-viewer/)
