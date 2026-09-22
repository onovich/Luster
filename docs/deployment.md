# Demo deployment

The demo is hosted by GitHub Pages at `https://luster.onovich.com/`.

`.github/workflows/deploy.yml` runs on pushes to `main` and through **Actions → Deploy demo to Pages → Run workflow**. It checks the Node contracts and publication boundary, builds the static artifact, and deploys through the `github-pages` environment.

`npm run build` creates `dist/` from an explicit allowlist: `index.html`, `src/` and `demo/`, plus `.nojekyll` and `CNAME`. Tests, documentation, local evidence and Git history are excluded. No frontend dependencies or bundler are needed. Preview the artifact with `python -m http.server 8798 --bind 127.0.0.1 --directory dist`.

GitHub Pages must use **GitHub Actions** as its source, with custom domain `luster.onovich.com`. For Actions deployments the repository Pages setting is authoritative; the artifact's `CNAME` records the intended host.

Cloudflare DNS: CNAME `luster` → `onovich.github.io`, **DNS only**. Enable GitHub Pages **Enforce HTTPS** after its certificate is ready. DNS configuration and certificate issuance are separate from a successful Actions deployment.
