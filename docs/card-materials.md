# Layered card materials

The eight card illustrations are treated as reference-lit artwork. Their dynamic materials are art-directed interpretations, not measured material scans or recovered PBR assets. Image-generated three-angle studies guide the material choices; these reference images are not downloaded by the demo.

| Sample | Substrate | Dynamic response |
| --- | --- | --- |
| Orbit | Satin silver with a pearlescent embossed disc | Broad base reflection, curved relief and colored disc highlights |
| Silk | Cobalt anisotropic satin | Directional streaks following the artwork-derived surface |
| Ribbon | Pearlescent lacquer over silver | Smooth broad color shifts along flowing ridges |
| Facet | Hard embossed prismatic metal | Sharper, quantized facet normals and narrow highlights |
| Diagonal | Brushed graphite with a polished ridge | Dark diffuse base, a smooth reflective diagonal region |
| Fold | Creased metallized foil | Continuous fold normals, softer metallic highlights |
| Grain | Mica flakes suspended in satin lacquer | Stable local flakes that brighten with the half-vector |
| Wave | Cobalt enamel with clearcoat | Smooth waves and a narrow secondary clearcoat highlight |

## Composition

`LayeredRenderer` augments the existing B11/B14 film shader. Card lighting is evaluated first, in linear color; the existing film transmission attenuation and reflected light are then applied over that substrate. The card and sleeve have separate texture coordinates. Hover translates and tilts a rigid card plane, using inverse ray/plane perspective projection for its texture coordinates. The same orientation rotates its lighting normals, while the sleeve normal map stays fixed. Cards start at rest; only the hovered card lifts, with leave, cancellation and window-blur cleanup. The exposed part of a lifted card receives no sleeve reflection.

The card response uses a separate RGBA surface map: encoded normal XY, optical phase, and material-region/flake mask. `demo/card-surfaces.js` authors a 256 × 256 map per card once at startup. Some structures are procedural, while flowing and faceted structures use smoothed artwork luminance as a shape guide. Luminance-derived normals are an artistic approximation: illumination already baked into the artwork is not physically inverted.

To preserve the illustration, the renderer adds the difference between current and reference material response (0° card angle, 24.39° light). This produces continuous relighting from normals and analytic lobes, not a crossfade between angle images. It does not claim energy-conserving multilayer optical simulation. Deep shadows retain the source design; a full physical reconstruction would require separately authored unlit albedo, calibrated normals and roughness maps.

## API

Import `LayeredRenderer` from `src/index.js`. It accepts the usual normal map, background and parameters plus `surface: {data, width, height, type}`. Surface data is RGBA `Uint8Array`; `type` is 1–8 in the table order. `setSurface()` replaces it. `setLayers({card, film})` sets response weights in [0, 1]; card = 0 retains the reference illustration. `setCardPose(lift, turn)` takes upward lift in card heights and in-plane rotation in radians. `resize(width, height)` specifies the unlifted card resolution; normal rendering reserves 32% additional transparent height for lift. The demo supplies the matching canvas layout. Diagnostics use the original dimensions and film equations.

Material view exposes a Foil layer switch to compare the dynamic card with and without its sleeve. It fades the film response over 260 ms, preserves the selection across samples and presets, and switches immediately for reduced motion. Card response stays enabled in the UI; `setLayers()` supports independent layer comparisons. Angle and light affect both layers; Intensity continues to control the outer film. Original `FoilRenderer` consumers remain unchanged.

## Cost and checks

- One draw and one WebGL context per visible card; no second spectral integration loop.
- One additional 256 × 256 RGBA surface texture per card: 2 MiB total for eight, excluding existing assets and framebuffer storage.
- No texture uploads during hover or angle animation. Empty lift space discards before film integration.
- Material view draws only the selected card; Album draws all eight.
- `npm run test:layers` checks both variants and all cards for continuous angle response, independent light response and contributions from both layers. It verifies no sleeve contribution above the sleeve, no per-frame texture uploads, hidden-card culling, resizing, disposal and WebGL errors.
- The original 160 optical diagnostic comparisons remain unchanged and pass. Frame time depends on GPU, resolution and browser; the extra response is not zero-cost.

A local Chrome/RTX 5070 Ti spot check (488 × 724 canvas, 3 × 12 frames, synchronous full-frame readback included) measured 0.39–0.43 ms/frame with the card response disabled and 0.41–0.43 ms enabled. The difference was within this short measurement’s noise; it is not a mobile benchmark or a display-FPS guarantee.

`npm run test:hover` verifies startup/reload rest, exclusive hover and return, unclipped converging projected edges, and proportional desktop UI at 1536 × 1024 and 2320 × 1343. Desktop composition fits the viewport at the reference artboard ratio; typography, gallery and switches scale with that artboard instead of independent pixel caps.
