# Integration guide

[简体中文](guide.zh-CN.md)

Luster renders angle-dependent reflections over an image using WebGL. Supply an image, a surface normal map and lighting parameters, then render at the desired angle. Your application controls the layout, interaction and animation.

There are two renderers:

- `FoilRenderer` adds a reflective film to a static image and produces an opaque canvas.
- `LayeredRenderer` gives the card beneath the film its own dynamic material. It combines both responses in one draw and supports a card sliding out of its sleeve. See [card materials](card-materials.md) for its surface maps and API.

The album in the demo is one possible presentation; neither renderer depends on the album layout.

## Render your first image

Serve the repository over HTTP, as described in the [README](../README.md). The browser must support WebGL 1, high-precision fragment floats and `OES_standard_derivatives`.

Save this example as an HTML file at the repository root and open it through the local server. It uses the included artwork and normal map; replace their URLs to use your own assets.

```html
<canvas id="material" style="width:244px;height:274px"></canvas>
<script type="module">
  import {FoilRenderer} from './src/index.js';

  const background = new Image();
  background.src = './demo/assets/images/art-orbit.webp';
  await background.decode();

  const response = await fetch('./demo/assets/normals/normal-0.rgba');
  if (!response.ok) throw new Error(`Normal map: HTTP ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());

  const renderer = await FoilRenderer.create(
    document.querySelector('#material'),
    {
      variant: 'B14',
      background,
      normal: {data, width: 512, height: 512},
      width: 488,
      height: 548,
    },
  );

  renderer.render({angle: 0});

  // After an input changes, update the parameters and draw again.
  renderer.setParameters({light: 25, strength: 0.3});
  renderer.render({angle: 2});

  // Call renderer.dispose() when removing this view.
</script>
```

The normal map describes surface orientation at each pixel. Luster uses a packed XY16 format: four bytes store two 16-bit normal components. These bytes are data, not image colors; the alpha byte is part of the normal. The [texture specification](textures.md) explains encoding, orientation and filtering.

Backgrounds should be decoded image or canvas elements. Cross-origin images need CORS permission. Use an `HTMLImageElement` or `HTMLCanvasElement` rather than `ImageBitmap` so texture flipping and premultiplication follow the renderer's upload settings.

## Parameters and presets

`B11` and `B14` are two film shader variants. B11 uses a fixed grating spacing; B14 also varies local grating direction and spacing with the surface normal. A grating is the microscopic directional structure used here to produce colored reflections.

| Parameter | Meaning |
| --- | --- |
| `angle` | Surface rotation around its local Y axis, in degrees; passed to `render()` |
| `light` | World-space angle shared by the central light and viewing direction, in degrees |
| `period` | Base grating spacing, in micrometers (μm) |
| `spread` | Angular offset of the surrounding light samples, in degrees |
| `strength` | Film reflection gain; default `0.3` |
| `enabled` | Enables film reflection; `false` sets its gain to zero in normal composition |
| `flatFloor`, `localBoost` | Colored reflection gains for flatter and more wrinkled regions |
| `threshold`, `softness` | Boundary and transition width used to identify wrinkled regions from the normal map |
| `whiteGain` | White specular reflection gain |
| `richness` | B14's coupling between surface height and grating phase |
| `bend` | B14's angular acceptance width across the grating grooves; controls reflection response |

The shared preset values are `period=0.7`, `spread=0.4`, `strength=0.3`, `localBoost=4`, `softness=0.06`, `whiteGain=4` and `enabled=true`.

| Variant | `light` | `flatFloor` | `threshold` | `richness` | Cross-groove width |
| --- | --- | --- | --- | --- | --- |
| B11 | 23° | 0.03 | 0.035 | — | Fixed at 0.09 |
| B14 | 24.39° | 0.04 | 0.027 | 22 | `bend=0.45` |

[Preset definitions](../src/core/presets.js) contain the complete values; [parameter validation](../src/core/parameters.js) defines numeric ranges. Restore a preset with `renderer.setParameters(presets.B14)` after importing `presets`. This restores parameters without changing the angle or switching the shader variant.

## Updates, animation and cleanup

`create()` loads the shader and allocates a WebGL context and its resources. Parameter and texture updates take effect on the next `render()` call.

| Method | Purpose |
| --- | --- |
| `setParameters(patch)` | Merge material parameters; reject out-of-range or non-finite numeric parameters |
| `render({angle, inspect, kind})` | Draw immediately; defaults are `angle=0`, `inspect=0`, `kind=2` |
| `setNormal({data, width, height})` | Validate and upload a replacement XY16 map |
| `setBackground(image)` | Upload a decoded background image |
| `resize(width, height)` | Set the canvas resolution in positive integer pixels; CSS controls its display size |
| `setVariantSource(variant, source)` | Compile B11 or B14 shader source and restore its preset; retain the previous program if compilation fails |
| `dispose()` | Release GPU resources; safe to call more than once |

For runtime variant changes, `loadShader` in `src/webgl/resources.js` loads the shader text accepted by `setVariantSource()`. After switching, call `render()` again. If the WebGL context is lost, dispose of the instance and create a replacement.

The renderer has no animation loop. Draw when input changes, and request animation frames only while a transition is active. The optional `PoseTween` helper interpolates angles with a quintic easing curve. Its defaults are a starting angle of −4° and a duration of 0.38 seconds. Call `to(targetAngle)`, advance it with `advance(deltaSeconds)`, and pass the returned angle to `render()`. Retargeting preserves the current angle but restarts the easing curve, so velocity may change abruptly. The demo uses a ±4° range; the core accepts any finite angle.

For diagnostics, `inspect=1` shows reflection only and `inspect=3` shows the decoded normal. `kind=0` tests a flat surface; `kind=1` uses the normal map over a dark background. These two diagnostic kinds use a fixed gain of 0.8. Normal image composition uses `kind=2` and the configured strength.

## How the film reflection works

The normal map fixes the surface structure. Rotating the surface changes which wavelengths reflect toward the viewer, while the light and viewing directions remain fixed in world space.

1. Decode normal components X and Y, reconstruct Z as `sqrt(max(1-X²-Y², 0.001))`, and normalize the vector N.
2. Build a local grating direction T and its perpendicular tangent B. B11 projects the X axis onto the surface. B14 projects `G=(1,0,richness)` onto it, then sets local spacing to `period / max(length(G-N*dot(N,G)), 0.15)`.
3. Rotate N, T and B around Y by `angle`. With outward-facing light and view vectors L and V, calculate the first-order peak wavelength as `1000 * localPeriod * abs(dot(T,L+V))`, in nanometers.
4. Evaluate five light samples and 64 wavelengths spanning 380–780 nm per sample. An analytic CIE color-matching approximation converts the accumulated spectrum to linear RGB. Screen-space derivatives broaden the spectral peak to reduce aliasing.
5. Apply the wrinkle-dependent reflection gain and white specular reflection. Composite with the background in approximately linear color, then encode the result with a 1/2.2 gamma.

The film composition is `base*(1-0.08*gain*min(efficiency,1)) + reflected*gain`, clamped to the display range. `efficiency` is the wrinkle-dependent gain and `gain` is `strength` for normal composition. `LayeredRenderer` evaluates the dynamic card response before this film composition.

The equations are implemented in [B11.frag](../src/shaders/B11.frag) and [B14.frag](../src/shaders/B14.frag). With unchanged inputs, the material output remains unchanged.

## Porting and performance

Start by matching the decoded normals, then port the reflection calculation and color composition. Preserve the texture byte layout, outward-facing light/view convention and tangent orientation. Convert degrees to radians once. Check matrix row/column conventions when translating the CIE-to-RGB conversion.

`FoilRenderer` produces an opaque composite, not a reusable transparent overlay. To combine its film response with another renderer's surface, perform the composition in linear color. If the target renderer already encodes linear output for display, omit Luster's final gamma encoding.

Use the same inputs at −4°, 0°, +4° and intermediate angles to compare a port with the included shader. Reflection-only and normal diagnostics help isolate differences. The repository's regression fixtures preserve specific shader outputs; changing resolution, precision, gamma or sampling can change those outputs.

Reducing the number of wavelength or light samples can improve speed, but may change color and highlight smoothness. Evaluate that tradeoff on target devices and maintain separate visual references for each quality setting. Mobile GPU performance has not been validated.

The demo uses one WebGL context per card. For larger collections, profile a shared-context design with shared programs and texture atlases or viewports. Avoid uploading unchanged textures during animation, and draw only visible materials.

## Scope of the model

Luster is an art-directed spectral approximation. Its film model uses first-order diffraction, an orthographic view aligned with the central light, and empirical reflection gains. It does not simulate polarization, refraction or multilayer thin-film interference, and is not calibrated against measured materials. The supplied film normals consist of five image-based estimates and three transformed variants.

Use it for interactive visual effects. Applications requiring measured optical behavior need a calibrated material model and suitable source data.
