<!-- codex-project-git-workflow: initialized -->
# Luster Git workflow

- Develop on the long-lived `dev` branch. Check `git status --short --branch` before changing Git state.
- Run `npm test` and `npm run build` before committing or pushing. Run the online browser checks when the workbench changes.
- Stage selected files only, after reviewing their diff. Use a concise conventional commit message.
- Push the current `dev` branch normally to `origin/dev`. Do not push directly to `main`, force-push, or push local archive branches.
- When a batch of locally validated work is ready for release, open a `dev` → `main` pull request. Development pushes and PR updates do not automatically run CI.
- Review and merge using a merge commit to preserve the long-lived branch history. Keep `dev` and fast-forward it from `origin/main` after the merge. Do not delete `dev`.
- A merged PR targeting `main` runs Chromium, Firefox and WebKit checks once, then builds and deploys the public gallery only if all checks pass. Closing an unmerged PR skips release. Direct pushes do not trigger release. A failed release leaves the last successful Pages deployment online; fix on `dev` and merge another PR.
- For an explicit pre-release check, manually run **Verify browser workbench** on `dev`. For a release retry, manually run **Deploy material gallery to Pages** on `main`; it repeats verification before deploying.
- Keep generated output in the shared `.gitignore`; keep machine-specific configuration and local strategy notes in `.git/info/exclude`.
- No unrelated documentation or TODO change is required for a commit.

The machine-local wrapper configuration is `.codex/project-git-workflow.json` and is excluded from Git.
