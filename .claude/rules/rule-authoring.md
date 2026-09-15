---
lastUpdated: 2026-08-30T00:00:00Z
paths:
  - '.claude/rules/**/*.md'
  - 'CLAUDE.md'
---

# Rule authoring

**Owns the shape of every file in `.claude/rules/`** — its frontmatter, its section list, and the
gates a single rule passes. Every sibling spec in this directory conforms to this file.

The five writing principles every artifact shares live in [`authoring`](./authoring.md). This file
adds only what is specific to a rule.

## The fixed section list

Nothing else. A rule file that wants an eighth section wants a spoke.

- **Frontmatter** — `lastUpdated`, then `paths:` naming the files the rule governs. Omit `paths:`
  only when the rule has no file trigger at all, and say so in the ownership line.
- **`# Title`** — the domain, not the verb: `Theming`, not `How to theme`.
- **Ownership line** — bold, one line, directly under the title: what this file is the sole source
  of truth for, and when it reaches the reader.
- **`##` rule clusters** — one bullet per rule.
- **`## Spokes`** — optional, last; see below.

## Gates on a rule

A bullet that fails any gate is not a rule. Cut it or rewrite it.

- **Actionable** — it tells the reader what to do, not what is true. A fact belongs in `corpus/`.
  - Bad: `The theme store persists the active palette to localStorage.`
  - Good: `Read the persisted palette through the theme store, never from localStorage directly.`
- **Decidable** — a reviewer can hold it against a diff and say pass or fail.
  - Bad: `Keep components reasonably small.`
  - Good: `A component that both renders and fetches gets split — the fetch moves to a composable.`
- **Standing** — true on the next task, not a record of one incident.
  - Bad: `The deck grid broke in #412 because the query key went stale.`
  - Good: `Every mutation invalidates its query key in the function that fires it.`
- **Sole owner** — the rule is stated in exactly one file; every other mention is a link to it.
  - Bad: in `code-style.md`, `Never comment inside a template (see also vue-templates).`
  - Good: `vue-templates.md` states it; `code-style.md` links that line and adds nothing.
- **Correctly scoped** — `paths:` matches the files the rule governs. Too broad burns the always-on
  budget; too narrow means the rule never arrives.
  - Bad: `paths: ['src/**/*.{ts,vue}']` on a rule about migration ordering.
  - Good: `paths: ['supabase/migrations/**']`.
- **One clause.** The bold lead is a label, not budget — the rule is the single sentence after it.
  A second sentence, or a second load-bearing clause stitched onto the first with a dash or
  semicolon, is a second rule: split it into its own bullet, never absorb it. Rationale is cut, not
  smuggled in as a clause; a trailing Bad/Good pair illustrates and doesn't count toward the
  sentence.
  - Bad: `**Extract the fetch.** Components that both fetch and render are hard to test and reuse,
so pull data access into a composable once the component grows past a couple of props.`
  - Good: `A component that both renders and fetches gets split — the fetch moves to a composable.`
- **Lossless.** A cut clause is rationale — restating what the reviewer already knows — never the
  discriminator that decides pass or fail. Losing the discriminator on compression isn't licence to
  lengthen the sentence to keep it; it's the signal to promote that clause to its own bullet, per
  One clause above. The sentence stays one clause either way — the discriminator survives as a rule,
  not as a longer rule.
  - Bad: `Never write a comment.` — short, but the discriminator (derivable from the code) is gone.
  - Good: `A comment survives only if you could not derive it from the code.`
- **Collapses back.** The dual of One clause: after splitting, check whether the resulting bullets
  are really one rule at two zoom levels. If an adjacent bullet's whole content could move onto
  another bullet as its example without losing a pass/fail clause of its own, it isn't a standing
  rule — fold it into the bullet it illustrates.
  - Bad: `Never let a component's root declare a property a caller overrides.` next to a separate
    bullet: `This holds whether the component declares it as a template utility or a
same-specificity style-block rule.`
  - Good: one bullet — `Never let a component's root declare a property a caller overrides — this
catches a template utility and a same-specificity style-block rule alike.`

## Examples earn their place

A bare bullet is the default — an inline Bad/Good pair is the actual bulk of a rule file, so it isn't
stapled on by habit. Add one only when the sentence alone leaves the failure mode ambiguous: a reader
could satisfy the words and still miss what the rule is really ruling out. A bullet whose violation
is obvious from the sentence ships bare.

## Forbidden constructs

- **Rationale paragraphs.** One clause of why, riding the rule, or none.
- **Narration of how the current code works.** Grep answers it, and the prose goes stale.
- **Exhaustive file lists.** Name the one path that is the answer; never enumerate a directory.
- **Line numbers.** They are wrong by the next commit.
- **A code block longer than the rule it illustrates.** Trim the example to the contrast.
- **A bare "see also".** A link earns its place by carrying the rule you are not restating.
- **A rule stated as a floating paragraph instead of a bullet.** Prose that isn't inside a `##`
  cluster's bullet list is unfailable — no bullet, nothing a diff review can hold the rule against.

## Spokes

A rule needing a long walkthrough nests it at `.claude/rules/<rule-name>/<spoke>.md` and links it
from `## Spokes`. The hub holds the decision; the spoke holds the detail. **A spoke inherits its
hub's `paths:` verbatim** — copy the hub's frontmatter into the spoke, don't invent a narrower or
wider one. A hub with no `paths:` (always-on) leaves its spokes always-on too; inheritance means
matching the hub, not gating everything. Give a spoke frontmatter of its own only when its content
is genuinely broader or narrower than the hub's globs, and say why next to the deviation.
