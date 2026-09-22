# Luster

[简体中文](README.zh-CN.md)

Art-directed spectral foil rendering in WebGL. Give Luster an image, a fixed wrinkle normal field and a viewing angle; it renders continuous iridescent highlights without a rainbow texture or endpoint crossfade.

![Luster spectral foil material](docs/social-preview.png)

“Luster” means surface sheen: a name for a reusable material capability, independent of its host or example artwork. [Naming rationale](docs/handoff.md).

## Try it

Requires Python 3 and a browser with WebGL 1 and `OES_standard_derivatives`.

```sh
python -m http.server 8798 --bind 127.0.0.1
```

Open [localhost:8798](http://127.0.0.1:8798). No frontend install, build or runtime network service is required. Use HTTP; opening `index.html` with `file://` will not work.

Move across the book to tilt it; leave to return to center. The first three samples also respond to hover and keyboard focus. Switch between B14/B11, book/single-material views and eight normal fields; adjust the optical controls or inspect reflections and normals.

![Luster book demo with spectral highlights](docs/screenshots/book-b14.png)

## Use the material

Serve `src/` alongside your application. Supply your own decoded image and packed normal bytes; the renderer does not load demo artwork or own your animation loop.

```js
import { FoilRenderer } from './src/index.js';

const material = await FoilRenderer.create(canvas, {
  variant: 'B14',
  normal: { data: packedRGBABytes, width: 512, height: 512 },
  background: decodedImage,
});
material.render({ angle: -4 }); // degrees
material.setParameters({ strength: 0.3 });
material.render({ angle: 1.25 });
material.dispose();
```

`canvas`, `packedRGBABytes` (`Uint8Array`) and `decodedImage` are supplied by the host. `PoseTween` is an optional interruptible 0.38-second pose interpolator. `FoilRenderer` retains its existing API name.

- **Fixed structure, changing light:** wrinkle normals stay fixed while the angle changes the spectrum.
- **Two art-directed variants:** B14 by default, with B11 for comparison and complete preset restore.
- **Explicit lifecycle:** replace inputs, resize, render and release GPU resources independently of UI frameworks.

[Integration and equations](docs/guide.md) · [Normal encoding](docs/textures.md) · [Architecture](docs/architecture.md)

## Development

`src/` is the reusable library; `demo/` owns presentation and replaceable art; `tests/fixtures/approved/` contains material-only references. No originating game project or local private directory is needed.

Requires Node.js for contract tests, Pillow for asset tests, and Playwright plus Chrome for browser tests. Install test-only dependencies if needed:

```sh
python -m pip install Pillow
npm install --no-save --package-lock=false playwright
node --test tests/core.test.js tests/privacy.test.js
python tests/assets.py
# Keep the static server above running for these:
node tests/browser.cjs
node tests/material.cjs
```

Browser tests use installed Chrome. Set `CHROME_PATH` for another executable or `PLAYWRIGHT_PATH` for an existing Playwright module. Results go to ignored `.test-output/`. [Verification and limits](docs/verification.md).

## Scope and licensing

Version 0.1.0 is a visual material study: an art-directed first-order diffraction approximation, not a measured, energy-conserving BSDF or complete thin-film simulation. Output is an opaque composite. Mobile GPU performance and broad browser compatibility are not certified; context loss requires recreation.

The book, sample images and interactions demonstrate a general rendering capability. They do not include game rules, progression, account state or persistence. [Assets and privacy boundary](docs/assets.md).

No open-source license is currently included in this repository. Permission to show the sample art here is not a general redistribution license.
