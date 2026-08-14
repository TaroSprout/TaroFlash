---
lastUpdated: 2026-08-08T00:00:00Z
---

# Commit authoring

**Owns the commit: what goes in one, its message, and how a series is squashed.** Always in
context — a commit has no file path to trigger on. Shared principles:
[`authoring`](./authoring.md); branches and PRs: [`git-workflow`](./git-workflow.md).

## Message — `<type>(<scope>): <summary>`

- **`type`** is `feat`, `fix`, `perf`, `refactor`, `style`, `test`, `docs`, or `chore`.
  `feat`/`fix`/`perf` drive semantic-release version bumps (`release.config.cjs`) — get the type
  right, not the vibe; a behaviour change dressed as `refactor` ships an unversioned feature. A
  breaking change gets a `BREAKING CHANGE:` footer or `!` (capped to a minor bump pre-launch).
- **`scope`** is the touched area — a component, a view, an api domain, `ci`. A commit needing two
  scopes is two commits.
- **`summary`** is imperative and names the change, not the fact that something changed.
  - Bad: `fix(deck): updated some stuff with the grid`
  - Good: `fix(deck): keep the due count in sync after a rating`
- **No attribution.** Never a `Co-Authored-By: Claude` trailer or a "Generated with Claude Code" footer.

## What goes in one

- **Logical chunks.** Related changes land together, unrelated changes get their own commit, and you
  commit as work progresses rather than batching at the end.
- **Stage specific paths, never `git add -A`.** The user keeps uncommitted edits in the tree; a
  blanket add sweeps them in, and a later reset destroys them.

## Squash discipline

Repeated attempts at the _same_ logical change collapse into one commit before review — never ship
`fix attempt 1` / `2` / `3`. A `feat` and the `test` commit covering it are different changes and
stay separate.

- **Unpushed:** `git reset --soft HEAD~N` then re-commit, or `git commit --amend --no-edit`.
- **Pushed to your own feature branch, before any review comment lands:** the same reset,
  then `git push --force-with-lease`. Once I've reviewed the PR, force-pushing to it is off —
  see [`git-workflow`](./git-workflow.md).
- Before any reset, `git status` and confirm every pending change is yours — if the tree or the
  dropped commit touches files you didn't author, stash the user's work first. (Recovery:
  `git reflog` + `git checkout <hash> -- <paths>`.)
