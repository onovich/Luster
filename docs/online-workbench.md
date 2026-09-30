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
| `dist-online/trial/` | Trial page, PNG and handoff export, shared renderer | Candidate public artifact after the Trial policy and release review |
| `dist-online/pro/` | Trial resources plus Pro editor, project, Web and Unity exports | Must be served behind server-enforced entitlement |

The build uses an explicit source list and rejects stale files, desktop paths and Pro resources in the Trial artifact. `npm run test:online` runs a real browser against both built roots, verifies downloads and exported Web preview parity, checks for external requests and script errors, and exercises layouts from 320 to 1920 CSS pixels. The same command runs in CI. The current GitHub Pages workflow still publishes only the separate demo build (`npm run build`).

For local compatibility checks, install the desired Playwright browser, then run `npm run test:online -- --browser=webkit` or `npm run test:stress -- --browser=webkit`. The stress check uses 4096 × 3072 artwork, rapid template and parameter changes, local recovery storage, and keyboard operation of the export dialog. Chromium and WebKit passed these checks locally on 2026-09-28, and WebKit passed again on 2026-10-01. On 2026-10-01, Windows Chrome reported NVIDIA GeForce RTX 5070 Ti and AMD Radeon Graphics through ANGLE/D3D11 in separate runs; the full online suite passed on both physical GPUs, and the large-artwork stress check passed on AMD. Both GPUs are in one computer, so this does not cover a second device.

The Playwright-bundled Firefox could not launch on this Windows host: the Windows SideBySide event reports a missing `mozglue` assembly, even after a forced reinstall. The separately installed official Firefox 157 did run locally on 2026-10-01. A Selenium smoke check imported artwork in both Trial and Pro, reached six candidate previews in about two seconds each, downloaded valid PNGs, and confirmed that the Pro PNG matched the preview byte for byte. This is narrower than the full online suite. On the Linux CI runner, Firefox launched but could not create a WebGL context. CI runs Chromium on Linux and Firefox/WebKit on macOS; Chromium and WebKit pass, while macOS Firefox remains a release blocker. The latest headed macOS Firefox run reached candidate 3/6 but did not finish within 60 seconds. This is a CI environment/performance finding, not evidence that every Firefox device works. Playwright WebKit is not branded Safari, and viewport emulation is not a physical mobile test; the local timings are not a device performance budget.

## Before a public workbench release

- Decide Trial PNG size, watermark and permitted use. The current Trial downloads an unwatermarked PNG preview.
- Confirm source and artwork distribution rights and write user-facing terms for project and export packages. [Asset notes](assets.md) cover the existing demo artwork, not a customer license.
- Choose hosting and implement Pro login, entitlement checks, and resource delivery. Hiding a static link or button is not access control.
- Review the privacy notice against the chosen host. Local artwork processing is covered by the current browser tests; hosting logs, account data and payment data depend on the eventual service.
- Validate the deployed Trial and Pro flows on the target browsers, a second GPU and representative devices. Set and measure a performance budget on those devices.
- Decide whether browser or service-based AI integration is part of this release. The retired desktop MCP integration is not included in either site build.

The supported Unity export target is Unity 6000.4 Built-in Render Pipeline, Gamma color, uGUI. URP and other pipelines are not part of the verified target.
The fixed-target comparison procedure and fresh four-template result are in [Unity acceptance](unity-acceptance.md); Unity rendering is a separate manual gate and is not run by browser CI.
