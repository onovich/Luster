# Luster

[简体中文](README.zh-CN.md)

Interactive WebGL card and foil materials, with reflections that respond to angle and light.

![Luster — interactive foil materials](docs/social-preview.png)

[Material gallery](https://luster.onovich.com/) · [Integration](docs/guide.md) · [Card materials](docs/card-materials.md)

The live website currently publishes only the material gallery. Product, pricing and editor pages are available for local testing. Trial supports artwork upload, examples and free 512px PNG previews. See [online workbench status](docs/online-workbench.md).

Explore eight card surfaces in Album or Material view. Toggle the foil layer and adjust angle, light and intensity.

## Run locally

Requires Node.js, Python 3 and a browser supporting WebGL 1 with `OES_standard_derivatives`.

```sh
npm ci
npm run build
npm start
```

Open [local full preview](http://127.0.0.1:8798/dist/) for all four pages. `npm run build:public` creates the gallery-only deployment in `dist-public/`; `npm run test:published` verifies that unpublished routes and editor resources are absent.

Experimental, art-directed rendering. No open-source license is included; see [asset permissions](docs/assets.md) before reusing the artwork.
