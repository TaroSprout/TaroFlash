# Self-heal

**Every session, not just skill runs.** When the user corrects you, the artifact in front of you is
the symptom — the defect is in the rules, skill, or memory that let you get it wrong. Fix the
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
3. **Gap, or adherence?** Grep first — CLAUDE.md, `.claude/rules/*`, memory. A clear rule that
   already existed means you didn't follow it, and that's **not** a heal — _unless_ it's been
   violated repeatedly, which means the rule is weak, misplaced, or not loading. That is.

## Routing — one lesson, one home

| The correction is about               | It lands in                                       |
| ------------------------------------- | ------------------------------------------------- |
| how a skill runs                      | that skill's `SKILL.md`                           |
| a domain that already has a rule file | extend the nearest one                            |
| a domain with no rule file            | a new path-triggered `.claude/rules/*.md`         |
| repo-wide and non-negotiable          | a CLAUDE.md guideline                             |
| the user's personal taste             | a memory `feedback_*.md`                          |
| something mechanically checkable      | a hook in `.claude/settings.json`, or a lint rule |
| domain knowledge that went stale      | `corpus/` — the archivist owns it                 |

Bias toward **extending the nearest existing file**. A new rule file is for a lesson that would be
off-topic in every one of them.

## Two lanes

- **Fast lane — memory.** Personal preference and taste: write the `feedback_*.md` immediately, index
  it in `MEMORY.md`, done. No branch, no PR, no ceremony.
- **Durable lane — the living PR.** Anything that binds the repo (rules, skills, CLAUDE.md, hooks)
  ships for review below.

A memory that turns out to be repo-truth rather than preference **graduates**: write the rule, delete
the memory. It now lives in one place.

## One living PR

All durable-lane healing lands in a **single open PR**, on branch `self-heal` — one stream the user
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
- **Delete-test the prose you add**, same as a ticket AC: if removing the sentence changes no future
  decision, cut it. Rule files are tight references, not essays.
- **Never restate a rule that already exists elsewhere** — sharpen or relocate the original instead.
- **Never heal silently on a taste call** the user hasn't actually made. A single offhand remark is
  an instance; wait for the pattern.
