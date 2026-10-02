# Pages deployment

The public site at `https://luster.onovich.com/` publishes only the material gallery. Product, pricing and workbench pages remain available in the full local preview, not the Pages artifact.

Develop on `dev` and merge a reviewed PR into `main` when ready to release. `.github/workflows/deploy.yml` starts on a `main` push and checks that its head commit is the merge commit of a merged PR targeting `main`. Only matching commits proceed to browser checks and deployment; direct pushes without that association skip both. Manual releases use **Actions → Deploy material gallery to Pages → Run workflow** on `main`. Development pushes and PR updates do not run automatic CI.

Release first calls `.github/workflows/verify-online.yml` for Chromium, Firefox and WebKit checks. Only a successful result permits the public build and Pages deployment. A failed check leaves the previous site online. **Verify browser workbench** also supports manual checks on a chosen branch.

`npm run build` first creates audited online artifacts, then creates `dist/` with the gallery home, `product/`, `pricing/`, `trial/`, a `showcase/` redirect, `src/`, `demo/`, `.nojekyll` and `CNAME`. Only the audited Trial tree is copied from the online artifacts. Tests, documentation, Pro resources, local evidence and Git history are excluded. Preview with `python -m http.server 8798 --bind 127.0.0.1 --directory dist`. `npm run test:public` verifies gallery, product and pricing layouts at 320/768/1440 px, example onboarding, the 512px PNG limit, error recovery, missing Pro resources and legacy redirects with example parameters.

GitHub Pages must use **GitHub Actions** as its source, with custom domain `luster.onovich.com`. For Actions deployments the repository Pages setting is authoritative; the artifact's `CNAME` records the intended host.

## Browser workbench release boundary

`npm run build:online` creates `dist-online/trial/` and `dist-online/pro/` from explicit file lists. `dist-online/build-audit.json` records the file counts and entry points. The Trial artifact excludes Pro pages, project archives, exporters and Unity assets. `npm run test:online` builds both artifacts and runs browser download and layout checks from a local static server. `.github/workflows/verify-online.yml` repeats these checks in CI with Chromium on Linux and Firefox/WebKit on macOS.
`npm run test:layout` runs the layout subset. Unity fixed-target acceptance is documented separately in [Unity acceptance](unity-acceptance.md).

The Pages workflow runs `npm run build:public` and publishes only `dist-public/`, with an automated publication-boundary check. Pro remains private to development: its static artifact has no access control and must be served behind server-enforced entitlement before release. No accounts or payment service are connected. The local product preview describes storage, host logging, image limits and permitted Trial PNG use; that page is not currently published. See [online workbench status](online-workbench.md).

Cloudflare DNS: CNAME `luster` → `onovich.github.io`, **DNS only**. Enable GitHub Pages **Enforce HTTPS** after its certificate is ready. DNS configuration and certificate issuance are separate from a successful Actions deployment.

## Global shell and languages

The public gallery and full local preview use the same navigation shell. Only the local preview enables product, pricing and editor routes. In that preview, `src/site-app.js` changes routes through history and fades only the content region. Same-origin documents in `content/` isolate styles and WebGL lifecycles, retaining each view after its first load so editor artwork and parameters survive navigation. Inactive views stop auto rotation. Navigation honors reduced-motion preferences. No Pro resources are published.

`src/site-i18n.js` centralizes English/Chinese UI strings and dynamic status formats. The initial language follows the browser (`zh*` → Simplified Chinese, otherwise English). A manual choice is stored as `luster.locale` in localStorage and overrides browser detection. The global language selector updates all loaded views without rebuilding artwork. Artwork text and downloaded artwork are not translated. Browser checks verify the persistent header, editor retention, history, locale detection/persistence, reduced motion, Chinese errors and PNG downloads.
