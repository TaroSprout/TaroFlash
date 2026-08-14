# Branch & PR workflow

**Owns the branch and the PR — not the commit**, which belongs to
[`commit-authoring`](./commit-authoring.md). Always in context; a branch has no file path to trigger
on.

1. **Only cut a new branch off `master`, or when I ask for one.** Already on a feature branch?
   **Stay on it** — and if the scope widens past its name, rename in place (`git branch -m <old> <new>`)
   rather than branching again. Small unrelated prior commits riding along is fine; a proliferation
   of branches is not.
2. **Check staleness.** At session start, verify the current branch isn't already merged (e.g.
   `gh pr view --json state,mergedAt` or `git log master..HEAD`). If merged, branch fresh off `master`.
3. **Don't open PRs automatically.** Open or push a PR only when explicitly asked. Committing locally
   is fine; surfacing the work as a PR is the user's call.
4. **Check the PR isn't already merged before pushing follow-ups.** `gh pr view <num> --json state,mergedAt`
   first — pushing to a merged branch strands the commit where it will never reach `master`.
5. **Force-push only your own feature branch**, and only with `--force-with-lease`. Never `master`.
   **Once I've left a review comment on the PR, stop force-pushing to it** — it wipes the review
   history and I can no longer diff just the new changes. Land review fixes as new commits instead;
   squashing (see [`commit-authoring`](./commit-authoring.md)) waits until after the PR merges, or
   until I ask for it.
6. **Prefix PR comments with `🤖 Claude:`.** Comments post under my account, so without it I can't
   tell your replies from my own.
7. **Never bare `git stash` / `git stash pop`.** The stack is shared across every worktree and
   session, so a pop can take another session's entry. Prefer a temporary WIP commit; if you must
   stash, tag it uniquely (`git stash push -u -m "<tag>"`) and restore by SHA
   (`git stash apply <sha>`, never `pop`).
