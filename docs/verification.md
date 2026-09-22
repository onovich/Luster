# Verification — 2026-09-22

Evidence mode: **runtime-tested**. Tested with Windows, installed Chrome headless using SwiftShader, and Node.js. This is a same-machine regression result, not a cross-browser certification.

| Check | Result |
| --- | --- |
| Node contracts and publication boundary | 6/6: presets, tween, validation, machine-path/private-key/embedded-HTML-image scan, core import boundaries |
| Asset integrity | 9 public fixture hashes, 8 atlas tiles/orientations, 3 notification-dot removal patches |
| Public optical regression | B11/B14 × reflection/normal × five angles × eight samples = 160 exact PNG comparisons |
| Original local optical regression | Same 160 comparisons against untouched original reference HTML passed; original HTML is not published |
| Controls and layout | 11 material controls, preset restore, inspection, pointer/focus, reversal, pause/rest, eight material views; 320/768/1024/1440 px without horizontal overflow |
| Browser / GPU errors | No page/console errors; all eight WebGL error values zero |
| Continuity | Every 0→0.01° sample changed by a small nonzero amount, below 5% of its −4→+4° difference |
| Resource lifecycle | Custom normal dimensions, replacement image, resize, invalid parameter rejection, repeated disposal and GPU resource release |
| README | English/Chinese deterministic check passed with zero warnings |
| Cover | 1280×640 PNG below 1 MB; editable SVG; full-size and 320×160 review on light/dark backgrounds |

Reports: [browser](validation/browser-report.json), [material](validation/material-report.json). Commands and prerequisites are in the root README. Generated outputs remain in ignored `.test-output/`; selected captures are published in `docs/screenshots/`. `node tools/capture.cjs` captures cover source material from the public demo while the static server runs.

The public reference harness was extracted from the original WebGL routines and separated from unrelated UI and embedded screenshots. Shader, preset and normal-atlas files remain byte-identical to their source. The public manifest describes this sanitized fixture set, not the old HTML. During the separate original-reference run the optics passed, but a later interaction wait timed out; the full public browser suite was then run alone and passed. Original-page interaction is not part of the published test contract.

## Limits

Exact equality applies to the same browser/GPU and 488×548 render size; floating-point results and derivatives can differ across devices. Safari, Firefox, physical mobile GPUs and screen readers were not validated. Eight contexts and five light samples × 64 wavelengths are a study configuration, not a large-instance performance guarantee. Context loss requires recreation.

Normals are image estimates, not measurements. The spectral response is an art-directed approximation, not a calibrated or energy-conserving BSDF. The automated publication scan catches specific textual hazards; it does not prove the absence of every possible secret. Public images were also visually inspected, and the initial public history excludes the earlier local evidence commits.
