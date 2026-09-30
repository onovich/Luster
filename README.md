# Luster

[简体中文](README.zh-CN.md)

Interactive WebGL card and foil materials, with reflections that respond to angle and light.

![Luster — interactive foil materials](docs/social-preview.png)

[Material gallery](https://luster.onovich.com/) · [About Luster](https://luster.onovich.com/product/) · [Pricing](https://luster.onovich.com/pricing/) · [Try Luster](https://luster.onovich.com/trial/) · [Integration](docs/guide.md) · [Card materials](docs/card-materials.md)

The browser-only Trial is publicly available: upload artwork or use an example, explore finishes, and download a free 512px PNG without a watermark. Pro is in development and is excluded from the public site. See [online workbench status](docs/online-workbench.md).

Explore eight card surfaces in Album or Material view. Toggle the foil layer and adjust angle, light and intensity.

## Run locally

Requires Python 3 and a browser supporting WebGL 1 with `OES_standard_derivatives`.

```sh
python -m http.server 8798 --bind 127.0.0.1
```

Open [localhost:8798](http://127.0.0.1:8798).

Experimental, art-directed rendering. No open-source license is included; see [asset permissions](docs/assets.md) before reusing the artwork.
