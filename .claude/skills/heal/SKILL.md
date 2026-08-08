---
name: heal
description: Capture a correction as a durable rule change. `/heal [<what the user said>]` runs one correction through the self-heal ladder and lands it in the right file; bare `/heal` sweeps the whole session for lessons that were never captured. Ships to the single living `self-heal` PR. Trigger on `/heal`, "capture that", "remember that for next time", "make that a rule", or at session end before shipping.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, EnterWorktree, ExitWorktree
argument-hint: '[<what the user said>]'
arguments:
  - name: <what the user said>
    description: The correction to capture, in the user's words. Omit to sweep the whole session for uncaptured lessons.
lastUpdated: 2026-08-07T00:00:00Z
---

The mechanics — the ladder, the routing table, the two lanes, the living PR, anti-noise — all live in
[`self-heal.md`](../../rules/self-heal.md). This skill is the explicit verb for running them.

## Steps

1. **Collect.** With an argument, that's the one correction. Bare `/heal` re-reads the session for
   every correction the user made — including the quiet ones (a revert, a hand-rewrite of your code,
   the same fix twice) — and lists them.
2. **Ladder each one** (`self-heal.md` § The ladder). Say out loud which gate kills the ones you drop;
   a silent drop looks like you missed it.
3. **Grep before writing.** CLAUDE.md, `.claude/rules/*`, `.claude/skills/*`, `.claude/docs/*`. Existing
   coverage means sharpen or relocate, never add a second copy.
4. **Route** by the table in `self-heal.md`. Every lesson lands in the repo — there is no memory
   store — so every route continues to step 5.
5. **Ship durable lessons** to the living `self-heal` PR from its own worktree — find-or-open, one
   commit per lesson, never merge (`self-heal.md` § One living PR, § Hygiene).
6. **Report**: what was captured and where, what was dropped and at which gate, and the PR link.

## Guardrails

- **Never heal on the branch carrying the primary task.** Always the `self-heal` worktree.
- **Never merge the healing PR** — the user closes that stream.
- Don't touch tests, don't touch product code. This skill edits docs, rules, skills, and
  hooks only.
- Propose, don't apply, when a lesson would rewrite a rule the user authored deliberately — sharpen
  the wording yourself, but a reversal is theirs to make.
