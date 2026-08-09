---
lastUpdated: 2026-08-08T00:00:00Z
paths:
  - 'corpus/**/*.md'
  - '.claude/agents/corpus-author.md'
---

# Corpus authoring

**Owns how a `corpus/` topic is written and when it may be edited.** Reading the corpus is routed by
[`corpus`](./corpus.md); the five shared principles live in [`authoring`](./authoring.md). The
`corpus-author` agent is the only writer — don't rewrite a topic in passing.

The corpus holds durable domain truths in plain language: _what is true about the system_, in words
a non-engineer follows. A rule file's spokes sit an altitude below, documenting how the code works.
The two never overlap — a topic needing a code detail links to it rather than restating it. Its real
job is to make the non-obvious obvious: the hazards, the silent assumptions, the traps a reader
otherwise finds by getting burned.

## The altitude gate

Edit only when a change crosses the domain line — a new invariant, a changed behaviour, a retired
concept, or a newly-exposed hazard. The altitude _is_ the churn control; there is no line budget.

- A refactor, bugfix, rename, or component tweak earns **zero** corpus edits. That is the expected
  outcome, not a failure.
- A changed invariant or a new hazard earns **one** focused edit.

## Authority

- **Correct** — fix what a change made false, with the smallest edit that does it: the stale line,
  not the section.
- **Add** — a new topic only for a genuinely new domain area with no existing home.
- **Clarify** — sharpen accurate-but-muddy text only when you can name what got clearer. A topic
  conflating two things gets split; a vague invariant gets stated precisely. Rewording is not
  clarification.
- **Elevate** — surface a hazard a change exposed. The one place to be aggressive.
- **Never** — reword correct prose for taste, restructure for its own sake, add examples, or
  document implementation detail.

A large real change (a new domain area, a topic splitting in two) lands **isolated**: its own commit,
scoped to `corpus/`, never mixed into a code commit, so the user takes or drops it as one unit.

## Shape

One **topic** per file — a subsystem you would sit down to understand (Media, Permissions), not a
single atomic fact, carrying enough context that any one idea in it is graspable without hunting.
`map.md` is the root index; `hazards.md` is the trap roll-call — see below.

Frontmatter is `id`, `domain`, `status` (`current`/`deprecated`), `hazard`, `related`, `updated`.
**`id` is permanent** — rename the file freely, never change a shipped `id`; it is the address deep
links and agents depend on. `[[id]]` cross-links a topic, and a link to an id that doesn't exist yet
is fine — it marks a topic worth writing.

The order that reads well: standfirst (one plain sentence), lead (the mental model), hazard blocks,
plain-heading sections ordered by importance, "What this isn't" to stop topics bleeding, related
links. No numbered headings — numbers imply a rank that isn't real.

## Voice

Write for a reader deciding whether to keep reading.

- **Open cold.** The top lands for someone who knows nothing — plain words, concrete nouns. Earn a
  technical term by grounding it first.
  - Bad: `Media reference indices are reconciled against the orphan sweep.`
  - Good: `A little note that says "this card uses that file" — that's the reference index.`
- **One idea per beat, space between beats.** Whitespace is the primary tool and bullets the backup;
  a wall of prose at a decision point loses the reader.
- **Declarative, present tense.** "Media moves through three states", not "we decided to make
  media…". Fact first, context second or omitted.
- **Show, don't lecture.** A concrete walkthrough beats an abstract statement of the rule.

## Callouts and diagrams

A callout earns its box only by adding what the prose doesn't; one that restates is noise. They
interrupt one at a time where they bite and never stack. Zero per section is common. The palette is
fixed so colour means one thing: `> [!RULE]` (green) a hard constraint you'd otherwise get wrong ·
`> [!WATCH]` (amber) a footgun in normal use · `> [!NOTE]` (teal) a non-obvious aside.

Diagram only what a picture beats a sentence at — flow, structure, blast radius, before/after — and
author it as text (Mermaid, or an HTML table) so it stays diffable. One load-bearing diagram beats
three decorative ones; zero is the common case.

## Hazards

A hazard is a place where the obvious assumption is quietly wrong and it costs you — a different
class of thing than a fact, given elevated treatment so nobody misses it. It gets a **hazard block**
(`> [!HAZARD]`) high in the topic, right after the lead, stating the trap in one strong line plus
the flip-side framing and a link to the deep walkthrough, and the topic's frontmatter sets
`hazard: true`.

**The block is the trap's only text.** It declares the trap's permanent `[K:<slug>]`
([`knowledge-addressing`](./knowledge-addressing.md)), and nothing else restates it:

- `hazards.md` lists the slug, its topic, and where it's echoed — one line each, no prose to drift.
- Every trap is **echoed** in the directory it bites, as a one-line `→[K:<slug>]` comment carrying a
  label and nothing more, so it reaches whoever is standing on it without being read every session.
  A trap with no directory to echo into is listed in `CLAUDE.md` instead.
- **Anchor a schema fact in `supabase/schemas/`, never in `supabase/migrations/`** — a migration is
  append-only, so a pointer written into one can never be corrected.

Three tells, hunted actively on any domain-level change:

- **A benefit whose flip-side is dangerous.** The property making something convenient is usually
  the one making it a trap — widening a capability "in one place" ripples into every query leaning
  on it. Whenever you write a benefit down, ask what its flip-side breaks.
- **A silent assumption.** Code that works only because something elsewhere stays a certain way,
  without saying so, and breaks quietly when it moves.
- **"Works in testing, wrong in production."** A shortcut passing today because conditions line up.
