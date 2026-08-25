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
   is fine; surfacing ad-hoc work as a PR is the user's call. Exempt: a flow whose own invocation
   _is_ the ask — `prepare-pr` and `/work` (see their own skills) — and the standing `self-heal` PR,
   pre-authorised in [`self-heal → shipping`](./self-heal/shipping.md), which the user reviews and
   closes himself.
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
   (`git stash apply <sha>`, never `pop`). **Drop your own entry (`git stash drop <sha>`) once you're
   done with it, before your run ends** — an entry you pushed doesn't become inert just because the
   worktree that made it is gone; the stack it sits on outlives every worktree, so "harmless, scoped
   to my worktree" is never true of anything sitting in it. Leaving it for a later session to trip
   over is the same failure as leaving an uncommitted worktree behind (rule 9).
8. **A disposable target doesn't make the working tree disposable.** Rebuilding a throwaway or
   re-derivable branch (`reset --hard`, `checkout --`, `clean -f`, `restore`) still runs against the
   one working tree, which is never yours to discard — stash anything uncommitted
   (`git stash push -u -m "<tag>"`) first, regardless of how disposable the branch itself is. A
   `PreToolUse` hook blocks these commands outright while the tree is dirty.
9. **Check a worktree before you remove it — yours or one you're merely tidying up.** `git status
--short` inside it first; anything uncommitted stops the removal and gets reported, never forced
   away with `--force`. This holds even for a worktree your own run created — a step that removes it
   is an obligation of how the run ends, not a line that only runs once every earlier step succeeded;
   a run that fails or is interrupted still checks and removes what it made before it stops.
10. **Verify which tree a write lands in, and never let one land on the shared checkout.**
    [K:worktree-write-target] Before the first edit or commit in a worktree you just created, check
    the creating command's own exit status directly — never through a `tail`/`head`/`grep` pipe,
    which swallows a failed `git worktree add` and lets a later command run against whatever tree the
    shell was already in — then confirm with `pwd` or `git rev-parse --show-toplevel` that you
    landed in the new worktree, not back in the main checkout. Reading a file in the shared checkout
    to decide what to change is fine; writing to it is not, before the worktree exists or after — a
    stray write there is reverted by you before you finish, reported, never left uncommitted for
    someone else to find.
