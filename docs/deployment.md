# Public Trial deployment

The interactive gallery is the home page at `https://luster.onovich.com/`. Product information lives at `/product/`, pricing at `/pricing/`, and the free workbench at `/trial/`. All four pages use Home / Product / Pricing / Editor navigation with the current page indicated. Pricing separates the available free Trial from the planned Pro edition; no checkout or paid price is advertised. `/showcase/` redirects to the home page. The previous `/trial/app/workbench/trial.html` redirects to `/trial/`, preserving query parameters such as `sample=poster` and fragments. GitHub Pages serves client redirects with a plain link and meta refresh fallback. HTTPS is enforced.

`.github/workflows/deploy.yml` runs on pushes to `main` and through **Actions → Deploy public Trial to Pages → Run workflow**. It checks the Node contracts and publication boundary, builds the static artifact, and deploys through the `github-pages` environment.

`npm run build` first creates audited online artifacts, then creates `dist/` with the gallery home, `product/`, `pricing/`, `trial/`, a `showcase/` redirect, `src/`, `demo/`, `.nojekyll` and `CNAME`. Only the audited Trial tree is copied from the online artifacts. Tests, documentation, Pro resources, local evidence and Git history are excluded. Preview with `python -m http.server 8798 --bind 127.0.0.1 --directory dist`. `npm run test:public` verifies gallery, product and pricing layouts at 320/768/1440 px, example onboarding, the 512px PNG limit, error recovery, missing Pro resources and legacy redirects with example parameters.

GitHub Pages must use **GitHub Actions** as its source, with custom domain `luster.onovich.com`. For Actions deployments the repository Pages setting is authoritative; the artifact's `CNAME` records the intended host.

## Browser workbench release boundary

`npm run build:online` creates `dist-online/trial/` and `dist-online/pro/` from explicit file lists. `dist-online/build-audit.json` records the file counts and entry points. The Trial artifact excludes Pro pages, project archives, exporters and Unity assets. `npm run test:online` builds both artifacts and runs browser download and layout checks from a local static server. `.github/workflows/verify-online.yml` repeats these checks in CI with Chromium on Linux and Firefox/WebKit on macOS.
`npm run test:layout` runs the layout subset. Unity fixed-target acceptance is documented separately in [Unity acceptance](unity-acceptance.md).

The Pages workflow publishes `dist/`, including the gallery home, product page and Trial. Pro remains private to development: its static artifact has no access control and must be served behind server-enforced entitlement before release. No accounts or payment service are connected. The landing describes local storage, host logging, image limits and permitted Trial PNG use. See [online workbench status](online-workbench.md).

Cloudflare DNS: CNAME `luster` → `onovich.github.io`, **DNS only**. Enable GitHub Pages **Enforce HTTPS** after its certificate is ready. DNS configuration and certificate issuance are separate from a successful Actions deployment.

## Global shell and languages

Published entry routes render one shared navigation shell. `src/site-app.js` changes routes through history and fades only the content region. Same-origin content documents in `content/` isolate styles and WebGL lifecycles, retaining each view after its first load so editor artwork and parameters survive navigation. Inactive views stop auto rotation. Direct URLs and legacy redirects remain supported; navigation honors reduced-motion preferences. No Pro resources are published.

`src/site-i18n.js` centralizes English/Chinese UI strings and dynamic status formats. The initial language follows the browser (`zh*` → Simplified Chinese, otherwise English). A manual choice is stored as `luster.locale` in localStorage and overrides browser detection. The global language selector updates all loaded views without rebuilding artwork. Artwork text and downloaded artwork are not translated. Browser checks verify the persistent header, editor retention, history, locale detection/persistence, reduced motion, Chinese errors and PNG downloads.
