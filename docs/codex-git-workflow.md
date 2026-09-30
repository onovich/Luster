<!-- codex-project-git-workflow: initialized -->
# Luster Git workflow

- Develop on the long-lived `dev` branch. Check `git status --short --branch` before changing Git state.
- Run `npm test` and `npm run build` before committing or pushing. Run the online browser checks when the workbench changes.
- Stage selected files only, after reviewing their diff. Use a concise conventional commit message.
- Push the current `dev` branch normally to `origin/dev`. Do not push directly to `main`, force-push, or push local archive branches.
- When a batch of work is ready for acceptance, open a `dev` → `main` pull request. Browser CI runs when that PR opens, receives commits, or reopens. Pushing `dev` without an open PR does not run CI; an open PR means subsequent `dev` pushes rerun CI. Superseded PR runs are cancelled.
- Merge after CI passes, using a merge commit to preserve the long-lived branch history. Keep `dev` and fast-forward it from `origin/main` after the merge. Do not delete `dev`.
- Merging to `main` deploys the demo to Pages. The full browser CI does not run again on the merge push; the deployment workflow still runs its contract checks and build.
- Keep generated output in the shared `.gitignore`; keep machine-specific configuration and local strategy notes in `.git/info/exclude`.
- No unrelated documentation or TODO change is required for a commit.

The machine-local wrapper configuration is `.codex/project-git-workflow.json` and is excluded from Git.
