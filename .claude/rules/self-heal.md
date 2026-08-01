# Self-heal

The interactive skills — `/triage`, `/groom`, `/work` — treat user pushback as a **defect in the
skill or the rules it embodies**, not just in the artifact in front of them. The lesson is captured
as a doc edit and shipped for review. _What_ each skill heals and _where_ the lesson routes is
declared in that skill's `## Self-heal`; the mechanics below are shared.

## One living PR

All healing lands in a **single open PR**, on branch `self-heal` — one stream the user watches,
whichever skill surfaced the lesson.

- **Find or open.** Before starting, `gh pr list --head self-heal --state open`. If a PR is open,
  **add to it** — check the branch out and commit onto it. Otherwise open it.
- **One commit per lesson**, conventional — `docs(<skill-or-rule>): …` — so the PR reads as a clean
  log of every healing change.
- **Never merge it.** The user merges when satisfied; that closes the stream, and the next lesson
  opens a fresh `self-heal` PR. Keep pushing to the open one as feedback continues until then.

## Hygiene

Never heal on the branch carrying the primary task — it pollutes that PR. Work the `self-heal` branch
in its **own worktree** (`.claude/worktrees/self-heal`): cut it off clean `master` when the branch is
new, or check the existing branch out into the worktree when a healing PR is already open. The user
works the main checkout in parallel, so nothing there moves. Report the PR link; never merge.
