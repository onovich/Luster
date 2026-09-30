# Demo deployment

The demo is hosted by GitHub Pages at `https://luster.onovich.com/`.

`.github/workflows/deploy.yml` runs on pushes to `main` and through **Actions → Deploy demo to Pages → Run workflow**. It checks the Node contracts and publication boundary, builds the static artifact, and deploys through the `github-pages` environment.

`npm run build` creates `dist/` from an explicit allowlist: `index.html`, `src/` and `demo/`, plus `.nojekyll` and `CNAME`. Tests, documentation, local evidence and Git history are excluded. No frontend dependencies or bundler are needed. Preview the artifact with `python -m http.server 8798 --bind 127.0.0.1 --directory dist`.

GitHub Pages must use **GitHub Actions** as its source, with custom domain `luster.onovich.com`. For Actions deployments the repository Pages setting is authoritative; the artifact's `CNAME` records the intended host.

## Browser workbench release boundary

`npm run build:online` creates `dist-online/trial/` and `dist-online/pro/` from explicit file lists. `dist-online/build-audit.json` records the file counts and entry points. The Trial artifact excludes Pro pages, project archives, exporters and Unity assets. `npm run test:online` builds both artifacts and runs browser download and layout checks from a local static server. `.github/workflows/verify-online.yml` repeats these checks in CI with Chromium on Linux and Firefox/WebKit on macOS.
`npm run test:layout` runs the layout subset. Unity fixed-target acceptance is documented separately in [Unity acceptance](unity-acceptance.md).

The Pages workflow above still publishes only `dist/`, the demo. It does not upload either online workbench artifact. The Pro artifact is static and **has no access control**: do not put `dist-online/pro/` on a public static host. Choose a host that enforces Pro entitlement before wiring either artifact into a public release. See [online workbench status](online-workbench.md) for the other release decisions.

Cloudflare DNS: CNAME `luster` → `onovich.github.io`, **DNS only**. Enable GitHub Pages **Enforce HTTPS** after its certificate is ready. DNS configuration and certificate issuance are separate from a successful Actions deployment.
