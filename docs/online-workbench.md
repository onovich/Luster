# Browser workbench status

Trial and Pro are browser pages. Users select artwork, generate maps, preview a material and download files without installing a desktop application. Image processing happens in the browser; Trial saves local looks in IndexedDB. The browser loads its own static code and shader resources from the site. Exports may contain the user's artwork.

## Reproduce the current build

```sh
npm ci
npm test
npm run test:online
```

`npm run build:online` creates two standalone site roots:

| Directory | Contents | Release rule |
| --- | --- | --- |
| `dist-online/trial/` | Trial page, PNG and handoff export, shared renderer | Local testing only: free PNG, longest edge 512px, no watermark |
| `dist-online/pro/` | Trial resources plus Pro editor, project, Web and Unity exports | Must be served behind server-enforced entitlement |

The build uses an explicit source list and rejects stale files, desktop paths and Pro resources in the Trial artifact. `npm run test:online` runs a real browser against both built roots, verifies downloads and exported Web preview parity, checks for external requests and script errors, and exercises layouts from 320 to 1920 CSS pixels. The same command runs in CI for pull requests targeting `main`. Daily development is on `dev`; pushes without an open PR do not trigger browser CI. Updating an open PR reruns it, cancelling superseded runs. Merging to `main` deploys only the gallery (`npm run build:public`, `dist-public/`). Product, pricing, Trial routes and workbench resources are excluded. `npm run build` still creates the complete local preview in `dist/`. `npm run test:published` checks the publication boundary, bilingual gallery and 404 responses for unpublished routes. See [Git workflow](codex-git-workflow.md).

For local compatibility checks, install the desired Playwright browser, then run `npm run test:online -- --browser=webkit` or `npm run test:stress -- --browser=webkit`. The stress check uses 4096 × 3072 artwork, rapid template and parameter changes, local recovery storage, and keyboard operation of the export dialog. Chromium and WebKit passed these checks locally on 2026-09-28, and WebKit passed again on 2026-10-01. On 2026-10-01, Windows Chrome reported NVIDIA GeForce RTX 5070 Ti and AMD Radeon Graphics through ANGLE/D3D11 in separate runs; the full online suite passed on both physical GPUs, and the large-artwork stress check passed on AMD. Both GPUs are in one computer, so this does not cover a second device.

The Playwright-bundled Firefox could not launch on this Windows host: the Windows SideBySide event reports a missing `mozglue` assembly, even after a forced reinstall. The separately installed official Firefox 157 did run locally on 2026-10-01. A Selenium smoke check imported artwork in both Trial and Pro, reached six candidate previews in about two seconds each, downloaded valid PNGs, and confirmed that the Pro PNG matched the preview byte for byte. This is narrower than the full online suite. On the Linux CI runner, Firefox launched but could not create a WebGL context.

CI runs Chromium on Linux and Firefox/WebKit on macOS. All three passed the full suite on 2026-10-01 in [run 36756802289](https://github.com/onovich/Luster/actions/runs/36756802289). Firefox CI explicitly enables ANGLE with the test-launch preference `webgl.disable-angle=false`; Trial and Pro candidate generation took 231 ms and 155 ms. The default macOS native OpenGL path on this runner blocked the first candidate canvas readback for about 78 seconds and later timed out exporting PNG. The ANGLE comparison establishes a backend-dependent failure. Default macOS Firefox on a physical device still needs performance acceptance. The browser test keeps its existing 60-second candidate and 30-second download limits.

B14 now caches its 64 fixed CIE samples in a nearest-filtered float texture when `OES_texture_float` is available, with the analytical shader as the compatibility fallback. `npm run test:spectrum` compares both paths for four templates at three angles, checks a maximum RGB difference of 1/255, and verifies texture disposal. It also runs in browser CI. Fresh Web captures still match the existing Unity acceptance captures within 1/255. One macOS WebKit run emitted a Blob access error after downloads; two subsequent CI runs passed. Script-error assertions remain enabled and print stacks if it recurs.

Playwright WebKit is not branded Safari, and viewport emulation is not a physical mobile test; CI and local timings are not a device performance budget.

## Public Trial and next work

The public build publishes the gallery at `/`, product information at `/product/`, pricing at `/pricing/`, and the Trial workbench at `/trial/` with original poster/card examples. All four public pages share a persistent navigation shell, Home / Product / Pricing / Editor entries (localized in Chinese), an active-page indicator, and the typography/color rules in `src/site.css`. Content fades between routes while the navigation stays fixed. The global selector defaults to browser language and persists manual Chinese/English choices. The product page explains the workflow; pricing contains the Trial/Pro comparison. The editor export action is in the preview toolbar; site navigation contains only global links and language selection. Editor artwork and material parameters remain intact when navigating between views. Legacy showcase and workbench links redirect to their new routes, retaining example parameters. Trial PNGs are free to use in users' projects with artwork they own or have permission to use. Generated examples are original canvas artwork; no third-party images are added. Pro is clearly described as in development and is excluded from the public artifact. `npm run test:public` checks the actual deployment tree, example download dimensions, responsive landing, recovery and Pro exclusion. GitHub Pages host logging is disclosed separately from local artwork processing.

Remaining work is Pro access, accounts and payment, export licensing, and acceptance on physical Safari/mobile and another computer. The Trial size/watermark/PNG-use decisions are complete.

- Trial policy is set: free PNG up to 512px, without watermark; PNG use is described on the landing.
- Confirm source and artwork distribution rights and write user-facing terms for project and export packages. [Asset notes](assets.md) cover the existing demo artwork, not a customer license.
- Choose hosting and implement Pro login, entitlement checks, and resource delivery. Hiding a static link or button is not access control.
- Review the privacy notice against the chosen host. Local artwork processing is covered by the current browser tests; hosting logs, account data and payment data depend on the eventual service.
- Validate the deployed Trial and Pro flows on the target browsers, a second GPU and representative devices. Set and measure a performance budget on those devices.
- Decide whether browser or service-based AI integration is part of this release. The retired desktop MCP integration is not included in either site build.

The supported Unity export target is Unity 6000.4 Built-in Render Pipeline, Gamma color, uGUI. URP and other pipelines are not part of the verified target.
The fixed-target comparison procedure and fresh four-template result are in [Unity acceptance](unity-acceptance.md); Unity rendering is a separate manual gate and is not run by browser CI.
