# Branch & PR workflow

**Scope: every branch, commit, and PR in this repo.** Always in context — commits have no file path
to trigger on.

1. **Only cut a new branch off `master`, or when I ask for one.** Already on a feature branch?
   **Stay on it** — and if the scope widens past its name, rename in place (`git branch -m <old> <new>`)
   rather than branching again. Small unrelated prior commits riding along is fine; a proliferation
   of branches is not.
2. **Check staleness.** At session start, verify the current branch isn't already merged (e.g.
   `gh pr view --json state,mergedAt` or `git log master..HEAD`). If merged, branch fresh off `master`.
3. **Commit in logical chunks.** Group related changes into separate commits with clear messages —
   don't batch unrelated work into one commit. Commit freely as work progresses.
4. **Conventional Commits, always.** `<type>(<scope>): <summary>` — `type` is one of `feat`, `fix`,
   `perf`, `refactor`, `style`, `test`, `docs`, `chore`; `scope` is the touched area. `feat`/`fix`/`perf`
   drive semantic-release version bumps (`release.config.cjs`) — get the type right, not just the
   vibe. A breaking change gets a `BREAKING CHANGE:` footer or `!` after the type/scope (capped to a
   minor bump pre-launch, see `release.config.cjs`).
5. **Don't open PRs automatically.** Open or push a PR only when explicitly asked. Committing locally
   is fine; surfacing the work as a PR is the user's call.
6. **Squash iterative fixes.** Several attempts at the _same_ logical change collapse into one commit
   before review. Don't ship `fix attempt 1` / `2` / `3`.
   - **Not yet pushed:** `git reset --soft HEAD~N` then re-commit, or `git commit --amend --no-edit`.
   - **Already pushed to a feature branch:** `git reset --soft HEAD~N && git commit`, then
     `git push --force-with-lease`. Force-push is allowed on a feature branch you own; never on `master`.
   - Logical chunks (a `feat(...)` and the test commit covering it) stay separate.
7. **No Claude attribution.** Never add `Co-Authored-By: Claude` trailers, and never add the
   "Generated with Claude Code" footer to PR bodies.
8. **Stage specific paths, never `git add -A`.** I often have my own uncommitted edits in the tree; a
   blanket add sweeps them into your commit, and a later `reset` then destroys them. Before any
   `git reset --hard` or `reset --soft HEAD~N`, run `git status` and confirm every pending change is
   yours — if the tree, or the commit being dropped, touches files you didn't author this session,
   stop and stash mine first. (Lost work is recoverable via `git reflog` + `git checkout <hash> -- <paths>`.)
9. **Check the PR isn't already merged before pushing follow-ups.** `gh pr view <num> --json state,mergedAt`
   first — pushing to a merged branch strands the commit where it will never reach `master`.
10. **Prefix PR comments with `🤖 Claude:`.** Comments post under my account, so without it I can't
    tell your replies from my own.
