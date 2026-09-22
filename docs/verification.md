# Verification — 2026-09-22

Evidence mode: **runtime-tested**. Tested with Windows, installed Chrome headless using SwiftShader, and Node.js. This is a same-machine regression result, not a cross-browser certification.

| Check | Result |
| --- | --- |
| Node contracts and publication boundary | 6/6: presets, tween, validation, machine-path/private-key/embedded-HTML-image scan, core import boundaries |
| Asset integrity | 9 public fixture hashes, 8 atlas tiles/orientations, 3 notification-dot removal patches |
| Public optical regression | B11/B14 × reflection/normal × five angles × eight samples = 160 exact PNG comparisons |
| Original local optical regression | Same 160 comparisons against untouched original reference HTML passed; original HTML is not published |
| Controls and layout | 11 material controls, preset restore, inspection, pointer tilt and card-only hover (stationary sleeve), reduced motion, reversal, pause/rest, eight material views; 320/768/1024/1440 px without horizontal overflow |
| Browser / GPU errors | No page/console errors; all eight WebGL error values zero |
| Continuity | Every 0→0.01° sample changed by a small nonzero amount, below 5% of its −4→+4° difference |
| Resource lifecycle | Custom normal dimensions, replacement image, resize, invalid parameter rejection, repeated disposal and GPU resource release |
| README | English/Chinese deterministic check passed with zero warnings |
| Cover | 1280×640 PNG below 1 MB; editable SVG; full-size and 320×160 review on light/dark backgrounds |

Reports: [browser](validation/browser-report.json), [material](validation/material-report.json). Commands and prerequisites are below. Generated outputs remain in ignored `.test-output/`; selected captures are published in `docs/screenshots/`. `node tools/capture.cjs` captures cover source material from the public demo while the static server runs.

The public reference harness was extracted from the original WebGL routines and separated from unrelated UI and embedded screenshots. Shader, preset and normal-atlas files remain byte-identical to their source. The public manifest describes this sanitized fixture set, not the old HTML. During the separate original-reference run the optics passed, but a later interaction wait timed out; the full public browser suite was then run alone and passed. Original-page interaction is not part of the published test contract.

## Limits

Exact equality applies to the same browser/GPU and 488×548 render size; floating-point results and derivatives can differ across devices. Safari, Firefox, physical mobile GPUs and screen readers were not validated. Eight contexts and five light samples × 64 wavelengths are a study configuration, not a large-instance performance guarantee. Context loss requires recreation.

Normals are image estimates, not measurements. The spectral response is an art-directed approximation, not a calibrated or energy-conserving BSDF. The automated publication scan catches specific textual hazards; it does not prove the absence of every possible secret. Public images were also visually inspected, and the initial public history excludes the earlier local evidence commits.

## Run the checks

Requires Node.js for contract tests, Python 3 with Pillow for asset checks, and Playwright with installed Chrome for browser tests.

```sh
python -m pip install Pillow
npm install --no-save --package-lock=false playwright
npm test
python tests/assets.py
```

Start the demo server in a separate terminal, then run the browser checks:

```sh
python -m http.server 8798 --bind 127.0.0.1
```

```sh
node tests/browser.cjs
node tests/material.cjs
```

Set `CHROME_PATH` to use another browser executable or `PLAYWRIGHT_PATH` to use an existing Playwright module. Reports are written to `.test-output/`.

## Progressive loading check — 2026-09-22

The demo now starts image loading for all slots immediately, fetches normal fields concurrently, and shows each rendered material as soon as it is ready. Base artwork stays visible until the first material draw; failed slots retain that artwork with an explicit incomplete-load status. Preset switching is enabled once initialization completes. Shader requests are shared and cached, with failed requests evicted for retry.

`node tests/loading.cjs` checks a deliberately delayed final normal, switching views during loading, one failed asset, a single B14 shader request, and the raw-byte fallback. The 160 same-GPU optical comparisons, material lifecycle tests and exact packed-byte checks also pass.

A single local Chrome/SwiftShader comparison under emulated **10 Mbps download, 150 ms latency and disabled cache** measured:

| Milestone | Previous | Updated |
| --- | --- | --- |
| Base artwork visible | Waited for final draw | 1.1 s |
| First material visible | Waited for final draw | 3.4 s |
| All materials ready | 13.0 s | 4.6 s |

These are controlled local measurements of the old and new loading paths, not a promise of public-network timing. Artwork and final shader output are unchanged.

## Lossless artwork and preload check — 2026-09-22

Five active PNGs now have pixel-exact lossless WebP delivery copies (2,276,263 → 1,531,698 bytes). The entry module, first sample image and B14 shader are requested early; shader preloading still results in one network request. The book is prioritized explicitly.

`node tests/artwork.cjs` compares 48 complete rendered outputs using PNG versus WebP backgrounds: both variants, three angles and eight samples. All are exactly equal. Decoded image byte checks, the existing 160 optical comparisons, interaction/layout checks and delayed/failed loading checks also pass.

A single comparison against the preceding progressive-loader version, using the same local Chrome/SwiftShader setup and cold-cache **10 Mbps / 150 ms latency**, measured:

| Milestone | Previous progressive loader | With WebP and early requests |
| --- | --- | --- |
| First base artwork | 1.08 s | 0.72 s |
| First material | 3.44 s | 2.54 s |
| All materials ready | 4.56 s | 4.18 s |

This measures the additional improvement after the earlier 13.0 → 4.6 s change. Public network and GPU timing vary.
