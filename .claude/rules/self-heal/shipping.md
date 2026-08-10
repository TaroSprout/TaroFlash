# Shipping a heal [K:heal-shipping-sequence]

How every healing persona lands its change. `harness-author` and `corpus-author` both follow this — the
mechanics are shared, so they live here rather than in either agent.

**Every heal lands on the one living `self-heal` PR**, in a worktree you create and remove inside
this run. You hold no state afterwards — the next heal is a fresh run that repeats this from scratch.

Several heals run concurrently, so **never check out the `self-heal` branch**: git refuses a branch
already held by a sibling's worktree, and that is the failure this sequence avoids.

1. `git fetch origin`, then add a worktree at a path unique to this run —
   `.claude/worktrees/heal-$(date +%s)-$$` — **detached** at `origin/self-heal`, or at
   `origin/master` when that ref doesn't exist yet.
2. Write the change there. `node scripts/knowledge-lint.mjs` must pass before you commit.
3. Stage explicit pathspecs, never `git add -A`. **One commit per lesson**, conventional —
   `docs(<rule-or-skill>): …` from `harness-author`, `docs(corpus): …` from `corpus-author`.
4. `git push origin HEAD:self-heal`. On rejection, `git fetch origin` and rebase onto
   `origin/self-heal`, then push again — a sibling landed first, which is expected.
5. Open the PR if `gh pr list --head self-heal --state open` is empty, and only then put it in front
   of the user with `open "<pr-url>"` (macOS `open`; fall back to `gh pr view <n> --web`) — a failure
   there is skipped silently, the URL still goes in the report. An already-open PR means the push was
   enough and nothing opens. **Never merge it** — the user closes that stream.
6. `git worktree remove` your path, then report the PR link.
