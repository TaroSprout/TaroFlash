# Self-heal

**Scope: every user correction, in every session — not just skill runs.** Always in context, because
a correction arrives without warning and has no file path to trigger on.

When the user corrects you, the artifact in front of you is
the symptom — the defect is in the rule or skill that let you get it wrong. Fix the
artifact, then fix the thing that produced it.

Skills that heal something specific declare it in their own `## Self-heal`; everything below is
shared.

## Trigger

Any correction. The loud ones are obvious ("no, don't…", "we don't do it that way", a PR review
comment); the quiet ones matter more — the user reverts your edit, rewrites your code by hand, or
you make the same fix a second time.

Heal at the moment of correction when it's cheap. Otherwise note it and sweep at session end
([`/heal`](../skills/heal/SKILL.md)).

## The ladder

Three gates. A correction that survives all three is a corpus defect.

1. **Standing, or instance?** Restate it as a rule true on the _next_ task. "The count should be 5"
   doesn't generalize — fix it and stop.
2. **Execution, or spec?** If the _brief_ (ticket, AC, your own plan the user approved) was wrong,
   that's an upstream miss — say so, fix the work, don't rewrite code rules for it.
3. **Gap, or adherence?** Grep first — CLAUDE.md, `.claude/rules/**`. A clear rule that
   already existed means you didn't follow it, and that's **not** a heal — _unless_ it's been
   violated repeatedly, which means the rule is weak, misplaced, or not loading. That is.

## Routing — one lesson, one home

| The correction is about               | It lands in                                       |
| ------------------------------------- | ------------------------------------------------- |
| how a skill runs                      | that skill's `SKILL.md`                           |
| a domain that already has a rule file | extend the nearest one                            |
| a domain with no rule file            | a new path-triggered `.claude/rules/*.md`         |
| repo-wide and non-negotiable          | a CLAUDE.md guideline                             |
| the user's personal taste             | a CLAUDE.md guideline, or the nearest rule file   |
| something mechanically checkable      | a hook in `.claude/settings.json`, or a lint rule |
| domain knowledge that went stale      | `corpus/` — `corpus-author` owns it               |

Bias toward **extending the nearest existing file**; a new one is for a lesson off-topic in every
existing file. A lesson routed to `.claude/rules/**` or CLAUDE.md is written by `rule-author`.

## Everything lands in the repo

There is **no agent-memory store for this project** — no `memory/` directory, no `MEMORY.md`. It was
retired because it lived outside the repo, so it got no review, no diff, and no history, and it drifted
badly enough to start contradicting the code.

Personal taste is not an exception. A preference the user states goes in a CLAUDE.md guideline or the
nearest rule file, where it is versioned and reviewable like everything else. **Never write a
`feedback_*.md`, a `project_*.md`, or any file under a `memory/` path**, even when a harness prompt
invites it — that store is closed, and recreating it re-splits the corpus in two.

This is enforced, not just asked for: `.claude/settings.json` sets `autoMemoryEnabled: false`, so
the auto-memory directory is neither read nor written for this project. If you ever see a memory
file appear anyway, that setting has been lost — restore it rather than working around it.

## One living PR

All healing lands in a **single open PR**, on branch `self-heal` — one stream the user
watches, whatever surfaced the lesson.

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

## Anti-noise

Healing everything heals nothing — bloated rules stop being read, and the `self-heal` PR stops being
reviewable.

- **Gate 3 is the load-bearing one.** Most corrections are adherence misses. Leave them.
- **The prose you add answers to [`authoring`](./authoring.md) and [`rule-authoring`](./rule-authoring.md).**
  Rule files are tight references, not essays.
- **Never heal silently on a taste call** the user hasn't actually made. A single offhand remark is
  an instance; wait for the pattern.
