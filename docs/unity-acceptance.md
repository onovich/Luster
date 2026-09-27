# Unity fixed-target verification

The Unity export target is **Unity 6000.4.8f1, Built-in Render Pipeline, Gamma color space, uGUI RawImage**. The Web and Unity outputs must use the same recipe and angle. This check is separate from the browser download test because it requires a Unity Editor installation and an actual render from the imported material.

## Prepare repeatable cases

Run `npm run test:unity:prepare`. It generates a 320 × 200 synthetic artwork and four cases under `.test-output/unity-case-<template>/`, one for each template. Each case contains a Web runtime, Web captures for original/substrate/combined layers, an extracted Unity package, and `case.json` with the recipe and angle. No private artwork fixture is required.

## Verify each case in Unity

1. Create or reuse a Unity 6000.4.8f1 project configured for Built-in rendering, Gamma color and uGUI. Do not run the batch check while the same project is open in the Editor.
2. Copy the case's `unity/Assets/LusterExport/` into the project's `Assets/LusterExport/`. Copy [`LusterExportVerify.cs`](../tests/online/unity/LusterExportVerify.cs) into the project's `Assets/Editor/`.
3. In batch mode, run `-executeMethod Luster.LusterImport.Build`, then run a second Editor invocation with `-executeMethod LusterExportVerify.Run`. Both invocations must exit successfully and the logs must contain `LUSTER_IMPORT_OK` and `LUSTER_EXPORT_VERIFY_OK`, respectively. The verifier checks material settings, map filtering, scene links, uGUI blending and RectMask2D clipping.
4. Copy the project's `Logs/export-original.png`, `Logs/export-substrate.png` and `Logs/export-combined.png` into the case directory as `unity-original.png`, `unity-substrate.png` and `unity-combined.png`.
5. Run `python tools/compare-online-unity.py .test-output/unity-case-<template>`. The script writes `comparison.json` and fails if any RGB channel differs by more than 1/255. Pillow is required for this comparison.

Earlier local checks on 2026-09-27 used this Unity target and reported a maximum channel delta of 0–1/255 across four templates. Those reports used a local fixture and are retained only as local evidence. The committed preparation script supplies a shareable synthetic fixture; a new Unity render and comparison are still required for a fresh acceptance run. Other Unity versions, URP and other pipelines are outside this target.
