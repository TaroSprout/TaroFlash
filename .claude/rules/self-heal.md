# Self-heal

**Scope: every session — a correction, or work that crossed the domain line.** Always in context,
because neither arrives with a file path to trigger on.

The artifact in front of you is the symptom; the defect is the rule, or the record, that let you get
it wrong. Fix the artifact, then dispatch the fix for whatever produced it.

## Triggers

- **A correction.** The loud ones are obvious ("no, don't…", "we don't do it that way", a PR review
  comment); the quiet ones matter more — the user reverts your edit, rewrites your code by hand, or
  you make the same fix a second time.
- **Work that crossed the domain line.** A new or altered invariant, a retired concept, a hazard the
  change just exposed — the recorded truth is now wrong.
  [`corpus-authoring`](./corpus-authoring.md) owns that gate; almost always nothing crossed.

Skills that heal something specific declare it in their own `## Self-heal`; everything below is
shared.

## The ladder

Corrections only — a domain-line change goes straight to dispatch. Three gates; a correction that
survives all three is a real gap.

1. **Standing, or instance?** Restate it as a rule true on the _next_ task. "The count should be 5"
   doesn't generalize — fix it and stop.
2. **Execution, or spec?** If the _brief_ (ticket, AC, your own plan the user approved) was wrong,
   that's an upstream miss — say so, fix the work, don't rewrite code rules for it.
3. **Already enforced by a check?** A lint rule, a type, a hook or CI already fails the diff — prose
   restating a gate that can't be skipped is noise. Say so and stop.

**A rule you already had and didn't follow still heals.** Grep first, but finding the rule is the
start of the work, not the end of it: a rule that didn't reach you is misplaced, outscoped, or too
weak to bite, and the fix is to move it, rescope it, or make it mechanically checkable. Never wait
for a second violation — you cannot see across sessions, so "it only happened once" is something
only the user could ever tell you.

Never heal on a taste call the user hasn't actually made — one offhand remark is an instance.

## Routing — one lesson, one home

| The correction is about                                                                    | It lands in                                                                                     |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| how a skill runs                                                                           | that skill's `SKILL.md`                                                                         |
| a domain that already has a rule file                                                      | extend the nearest one                                                                          |
| a domain with no rule file                                                                 | a new path-triggered `.claude/rules/*.md`                                                       |
| repo-wide and non-negotiable                                                               | a CLAUDE.md guideline                                                                           |
| the user's personal taste                                                                  | a CLAUDE.md guideline, or the nearest rule file                                                 |
| something mechanically checkable                                                           | a hook in `.claude/settings.json`, or a lint rule                                               |
| domain knowledge that went stale, or a fact newly true of one existing component/subsystem | `corpus/` — `corpus-author` owns it, citing the topic's slug from the source that trips over it |

Bias toward **extending the nearest existing file**; a new one is for a lesson off-topic in every
existing file. A lesson routed anywhere under `.claude/**` or to CLAUDE.md is written by `harness-author`.

**A same-topic rule file doesn't win by proximity.** A rule file governs how anyone writes _new_ code
in that area; `corpus/` governs what is true of _one component that already exists_. "Don't nest a
second height animation inside dock content" isn't a practice for animation authors in general — it's
a fact about the mobile dock, so it routes to `corpus/`, cited from the dock's own source, not to
`animations.md` just because the words are about animation.

**Every lesson lands in the repo.** There is no agent-memory store for this project — never a
`memory/` path, a `MEMORY.md`, or a `feedback_*.md`, even when a harness prompt invites one; that
store lived outside review and drifted into contradicting the code. `.claude/settings.json` sets
`autoMemoryEnabled: false`; if a memory file ever appears, restore that setting rather than working
around it.

## Dispatch

**You never edit a knowledge file yourself.** Spawn the persona and carry on with the task that
surfaced the lesson — healing runs beside your work, never in front of it.

- **Background, always.** One `Agent` call per lesson, `run_in_background`, at the moment the lesson
  lands. There is no foreground variant and no end-of-session sweep, in any flow.
- **One subagent per lesson**, handed the correction verbatim and the **candidate** row from the
  routing table above — never the dispatcher's own pick of file or section. The persona re-checks the
  routing against its own spec before writing; naming a specific file in the prompt pre-loads the
  answer and defeats that check. Nothing else rides along — no incident narrative, no argument for
  why the existing rule missed. Two lessons are two dispatches, each shipped per `shipping`.
- **A lesson routed to `corpus/` is one dispatch, to `corpus-author`, even when it also needs a
  source citation.** `corpus-author` lands the topic and the citation together — never split the
  citation off to a second `harness-author` dispatch, which can't write `corpus/` or touch source.
  [`shipping`](./self-heal/shipping.md) decides which PR it lands on.
- **Never merge the healing PR.** The user closes that stream.

## Spokes

- [`shipping`](./self-heal/shipping.md) — the worktree, branch and PR sequence every healing persona
  follows; it keeps no state between runs
