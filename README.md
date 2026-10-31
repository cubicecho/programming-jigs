# Pogo-pin programming jig generator

Parametric OpenSCAD model and a static web app for printing pogo-pin
programming jigs: a block that holds spring pins over a chip's leads, a
module's castellated pads, or a row of test points.

Pick a package (or preset), set the pin pitch and spacing, and download an
STL to print, or the `.scad` file to keep tweaking in OpenSCAD. Everything,
including the OpenSCAD render, runs in the browser.

## Layout

- `scad/jig.scad` is the model, and the single source of truth. It works on
  its own in desktop OpenSCAD with the Customizer. The web app reads its
  defaults from this file and sets the same variables with `-D`.
- `src/lib/presets.ts` holds the package presets.
- `src/lib/pogo-pins.ts` is the pin catalogue (P11-J for now).
- `src/lib/analysis.ts` checks wall thickness, the pin stop, and how much
  barrel is left to solder to.
- Rendering uses [`openscad-wasm-prebuilt`](https://www.npmjs.com/package/openscad-wasm-prebuilt)
  (OpenSCAD 2025.01, Manifold backend) in a web worker. three.js draws the preview.

## How the jig works

Pins point down out of the bottom face. With **Pin stop** on, the bottom of
each hole narrows so every barrel seats at the same depth, which keeps the
tips level. Wires solder to the barrel tails sticking out of the top.
Coordinates are a top view: pin 1 is top-left and numbering runs
counter-clockwise. **Probe from the underside** mirrors the layout for
through-hole parts probed from the back of the board.

For hands-free programming, turn on **Sit flat on the board**. This raises the
pin seats so the bottom face rests on the board, with the pins pushed in by a
set amount. Then add a **Clamp tab** off any side (or two opposite sides). The
tab is level with the bottom face, so a binder clip or small clamp holds the
jig down. The header and test-pad presets turn both on.

Printed holes come out undersized, so tune **Hole fit** for your printer. With
P11 pins (1 mm barrel), 2 mm pitch and wider prints fine on FDM. Finer
pitches (SOIC, QFP) need thinner pins, and the app flags them.

## Development

```sh
npm install
npm run dev      # http://localhost:3000
npm test         # renders every preset through the WASM OpenSCAD
npm run check    # biome + tsc
npm run build
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
