# Shipping a heal [K:heal-shipping-sequence]

How every healing persona lands its change. `harness-author` always follows this; `corpus-author`
follows it for a corpus edit that stands alone — the mechanics are shared, so they live here rather
than in either agent.

**A corpus edit that cites or is cited by code never comes here.** It rides the PR that produced the
code, in the same commit as the source echo — see
[`corpus-authoring → Authority`](../corpus-authoring.md#authority). This sequence is for everything
else: a corpus edit with no accompanying code change, and every `harness-author` heal.

**Every heal lands on the one living `self-heal` PR**, in a worktree you create and remove inside
this run. You hold no state afterwards — the next heal is a fresh run that repeats this from scratch.

Several heals run concurrently, so **never check out the `self-heal` branch**: git refuses a branch
already held by a sibling's worktree, and that is the failure this sequence avoids.

**The main checkout is never yours to write to, before the worktree exists or after.** Reading a
file there to decide what to change is fine; editing it — even a first draft you mean to redo in the
worktree once it exists — leaves a stray diff that only the orchestrator can notice and clear. If one
lands anyway, revert it yourself before you finish and say so in the report; don't leave it
uncommitted for someone else to find.

1. `git fetch origin`, then add a worktree at a path unique to this run —
   `.claude/worktrees/heal-$(date +%s)-$$` — **detached** at `origin/self-heal`, or at
   `origin/master` when that ref doesn't exist yet.
2. Write the change there. `node scripts/knowledge-lint.mjs` must pass before you commit.
3. `mkdir -p .claude/heals` and add an empty, extensionless marker at `.claude/heals/<unique-name>` —
   how the pending count in [`self-heal`](../self-heal.md) is kept, since git history alone can't
   reconstruct it (a corpus edit riding a feature-branch commit never touches `self-heal` at all).
   **Skip this add when the lesson you're landing is a `harness-maintainer` finding, not a
   correction** — `harness-maintainer` already deletes the markers that triggered its sweep in its
   own loop, and a fresh marker from the finding it just dispatched would reinflate the count the
   sweep exists to reset, making a maintenance pass look like it introduced new heals. Stage explicit
   pathspecs, never `git add -A`. **One commit per lesson**, conventional —
   `docs(<rule-or-skill>): …` from `harness-author`, `docs(corpus): …` from `corpus-author`.
4. `git push origin HEAD:self-heal`. On rejection, `git fetch origin` and rebase onto
   `origin/self-heal`, then push again — a sibling landed first, which is expected.
5. Open the PR if `gh pr list --head self-heal --state open` is empty, and only then put it in front
   of the user with `open "<pr-url>"` (macOS `open`; fall back to `gh pr view <n> --web`) — a failure
   there is skipped silently, the URL still goes in the report. An already-open PR means the push was
   enough and nothing opens. **Never merge it** — the user closes that stream.
6. `git worktree remove` your path (checked first per [`git-workflow`](../git-workflow.md)), then
   report the PR link. **This step runs even when an earlier one failed** — a lesson you can't land
   is still a worktree you must not strand; remove it before reporting the failure, the same as you
   would before reporting success.
