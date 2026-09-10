---
name: review-work
description: The harness-conformance gate `/work` dispatches before opening any PR — one enforcement pass over a branch's diff against `comment-authoring` and `code-style`, with strong prejudice. Report-only: it names every violation with the gate it fails and the exact change, and never edits or commits; the caller routes the fixes. `/work` dispatches one per branch at § 4e; also runs standalone on the current branch. Trigger on `/review-work`, "review the work", "harness review", "check comment/code-style conformance". Not a bug or correctness review — that's `/code-review`; this one only enforces the harness's authoring rules.
allowed-tools: Read, Grep, Glob, Bash
arguments:
  - name: --base <ref>
    description: The ref to diff against for scope (default `master`). Everything this branch changed since `<ref>` is in scope.
argument-hint: '[--base <ref>]'
lastUpdated: 2026-09-10T00:00:00Z
---

## What this skill does

One enforcement pass over the diff of **one** branch, holding every changed line against
[`comment-authoring`](../../rules/comment-authoring.md) and [`code-style`](../../rules/code-style.md)
with strong prejudice. **Report-only** — each finding names its location, the rule and gate it fails,
and the concrete change; the skill never edits, never commits, never opens a PR. The caller routes
the fixes.

`/work` dispatches one run per landed branch at **§ 4e**, after the live-review round closes and
before any PR opens, and routes each finding as a fix through its own dispatch-and-merge-forward
mechanic (§ 4d). Standalone, it reviews the current branch against `master` and prints the same
report for a human to act on. It grows into more enforcement later; today it is exactly these two
rule families.

**This is not `/code-review`.** That hunts correctness and reuse; this one only enforces the
harness's authoring rules. A logic bug is out of scope — note it in one line and move on.

## Strong prejudice

- **The burden is on the code to pass, not on the reviewer to prove a fail.** A line that isn't
  clearly conformant is a finding.
- **A comment survives only if it passes every `comment-authoring` gate.** When you're unsure whether
  it earns its place, flag it — the rule's own test is "given only the code, would you still get this
  wrong?", and the default answer that clears a comment is _no_.
- **No finding is softened into a suggestion.** Each is a required change with an exact edit, so a
  builder can apply it cold without re-deriving the rule.
- **Prior sign-off doesn't launder a violation.** `comment-authoring` already outranks any earlier
  feedback about a comment's shape; don't spare a finding because an earlier round touched that line.

## Step 1 — Scope the diff

Capture both committed and uncommitted changes against the base (`--base`, default `master`):

- `git diff <base>...HEAD --name-only`
- `git status --short`

The reviewable set, by rule family:

- **`code-style`** — every changed `src/**/*.{ts,vue}` (its `paths:`).
- **`comment-authoring`** — every changed file under `src/**`, `supabase/**/*.ts`, `scripts/**`, or
  `tests/**` (its `paths:`).

Drop everything else (`*.md`, `*.json`, `*.css`, lockfiles, fixtures, config). Only **added or
modified** lines are in scope — a pre-existing violation the diff never touched is not this run's
job. The one exception: a comment the diff made stale (its subject line changed underneath it) is in
scope even if the comment line itself didn't change.

## Step 2 — Load the gate list, don't review from memory

Read the rules in full before judging anything — they are the checklist, and they change:

- [`comment-authoring`](../../rules/comment-authoring.md) and its
  [`examples`](../../rules/comment-authoring/examples.md) spoke.
- [`code-style`](../../rules/code-style.md) and **all six** spokes: `phases`, `nesting`,
  `responsibility`, `variants`, `reactivity`, `signatures`.

## Step 3 — Review each changed hunk

For each reviewable file, read the diff plus enough surrounding code to judge each line at its own
altitude. Hold every changed line against:

- **`comment-authoring`** — the position→shape table (including `<template>` = no comment ever, and
  the `tests/` single-row collapse), the six gates each failed on its own, the whole `## Never`
  list, the regex rule, and the pointer rules (readable sentence mandatory; `→[K:<slug>]` is the
  last token, never a comment on its own).
- **`code-style`** — each of the six spokes against the shape of every changed function.

A single line can fail more than one gate; report each failure, not just the first.

## Step 4 — Report

Lead with the verdict, then the findings grouped by file. Every finding is self-contained — a builder
receives it with no other context:

```markdown
## review-work — <N> findings across <M> files

<!-- or: ## review-work — clean -->

### src/components/deck/deck-hero.vue

- **L42 · comment-authoring / gate: prescribes, not narrates** — `// increments the counter`
  restates the next line. Required: delete the comment.
- **L58 · comment-authoring / `<template>` = no comment ever** — comment inside `<template>`.
  Required: delete it; encode the intent in the `data-testid` / component name instead.

### src/composables/use-bulk-actions.ts

- **L20 · code-style / nesting** — three nested `if`s. Required: invert the guards and return early
  so the body sits at one level.
- **L33 · code-style / signatures** — param `d` named for its call site, not its role. Required:
  rename to what it is (`deck`).
```

- **`clean` is an explicit verdict**, not silence — the caller keys off it to proceed to PRs.
- One line per finding: `L<line> · <rule> / <gate>` — the quoted offender — **Required:** the exact
  edit. No prose paragraphs, no rationale beyond naming the gate.
- Order findings within a file top-to-bottom by line.
- A correctness bug noticed in passing goes under a final `### Out of scope (not enforced here)`
  section, one line each — never mixed into the findings the caller will route as conformance fixes.
