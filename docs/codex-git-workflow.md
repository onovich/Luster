<!-- codex-project-git-workflow: initialized -->
# Luster Git workflow

- Work in this repository's current checkout. Check `git status --short --branch` before changing Git state.
- Run `npm test` and `npm run build` before committing or pushing. Run the online browser checks when the workbench changes.
- Stage selected files only, after reviewing their diff. Use a concise conventional commit message.
- Push only the current `main` branch to `origin` with a normal push. Never force-push or push local archive branches.
- Keep generated output in the shared `.gitignore`; keep machine-specific configuration and local strategy notes in `.git/info/exclude`.
- No unrelated documentation or TODO change is required for a commit.

The machine-local wrapper configuration is `.codex/project-git-workflow.json` and is excluded from Git.
