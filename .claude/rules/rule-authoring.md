---
lastUpdated: 2026-08-08T00:00:00Z
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

## Forbidden constructs

- **Rationale paragraphs.** One clause of why, riding the rule, or none.
- **Narration of how the current code works.** Grep answers it, and the prose goes stale.
- **Exhaustive file lists.** Name the one path that is the answer; never enumerate a directory.
- **Line numbers.** They are wrong by the next commit.
- **A code block longer than the rule it illustrates.** Trim the example to the contrast.
- **A bare "see also".** A link earns its place by carrying the rule you are not restating.

## Spokes

A rule needing a long walkthrough nests it at `.claude/rules/<rule-name>/<spoke>.md` and links it
from `## Spokes`. The hub holds the decision; the spoke holds the detail. A spoke carries no
frontmatter and **loads on every run, hub or no hub** — so nesting detail out of a hub buys
readability, never budget. Give a spoke its own `paths:` when the detail is genuinely path-scoped.
