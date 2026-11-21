# VITAL Marine — Immersive WebGL Experience

An original, fictional Three.js product story inspired by premium botanical art direction. The project uses procedural geometry and textures only; it does not reproduce Organimo assets or brand material.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Creative implementation

- Continuous lathed bottle geometry with clean cylindrical UVs, a separate mineral-paper label, micro-roughness, clearcoat and brushed-metal closure details
- Underwater depth built from exponential fog, layered particle scales, moving light shafts, a shadowed seafloor, rocks and animated kelp
- A clearly visible Three.js TSL caustic material on the seafloor, running through the WebGPU renderer's WebGL2 backend
- One scrubbed GSAP ScrollTrigger timeline synchronising the camera descent, bottle staging, light intensity, fog density and HTML chapters
- Responsive rendering quality, mobile compositions, reduced-motion handling and an explicit WebGL2 fallback message

This is a technical concept, not a commissioned product site, and makes no supplement health claims.

## Ocean journey integration

The existing VITAL sequence now hands off to a pinned Kelp Forest journey. `src/OceanCameraRig.js` reads editable waypoints from `src/data/ocean-camera-path.json`, builds arc-length-mapped Catmull-Rom position and target curves, interpolates FOV, clamps the camera above the seafloor and supports fully reversible ScrollTrigger progress. Kelp, particles, water lighting and fish continue animating from elapsed time even while scrolling is stationary.

The ocean runtime in `src/kelp17/` is a direct source baseline of Day 17 rather than a visual approximation. `src/kelp17-mount.jsx` supplies the VITAL-specific R3F mount, post stack, reduced quality counts and scroll camera while intentionally replacing the original Orbit/WASD/grab layer with no-op adapters. The adapted source remains in the runtime tree; its license and asset attribution are retained in `THIRD_PARTY_NOTICES.md` and `public/assets/17-kelp/CREDITS.txt`.

The ocean architecture and motion approach were adapted from Adam Chernick's **Day 17: Kelp** in `acher249/codevember-2026`, used under the MIT License (Copyright © 2026 Adam Chernick). The original R3F controls, WASD flight, wheel zoom, navigation UI, settings and interaction layer were intentionally not ported.
