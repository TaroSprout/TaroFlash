---
name: review-work
description: The code-review swarm `/work` runs before opening any PR — one review pass over a diff for a single concern (`--concern <name>`, e.g. `comment-authoring`, `code-style`, `test-authoring`, `test-integrity`) held against that concern's review lens with strong prejudice. A concern is a rule-family lens (every changed line held against a rule file) or a semantic lens (the changed set reasoned about relationally). Report-only: it names every violation with the gate it fails and the exact change, and never edits or commits; the caller routes the fixes. `/work` § 4e fans out one `swarm-reviewer` per concern in the roster below over the integration branch; standalone it runs every concern over the current branch. Trigger on `/review-work`, "review the work", "harness review", "check comment/code-style/test conformance". `/code-review` stays the separate, general correctness/bug-hunt tool — this swarm's lenses stay bounded to the roster below.
allowed-tools: Read, Grep, Glob, Bash
arguments:
  - name: --concern <name>
    description: The single concern to enforce — a row in the Concern roster (`comment-authoring`, `code-style`, `test-authoring`, `test-integrity`). Omit to run every roster row in sequence, for standalone human use.
  - name: --base <ref>
    description: The ref to diff against for scope (default `master`). Everything the tree changed since `<ref>` is in scope.
argument-hint: '[--concern <name>] [--base <ref>]'
lastUpdated: 2026-09-11T00:00:00Z
---

## What this skill does

One review pass over a diff for **one concern** — a review lens named by `--concern` — holding the
changed set against that lens's rule family with strong prejudice. A **rule-family lens**
(`comment-authoring`, `code-style`, `test-authoring`) holds every changed line against a rule file,
per-line. A **semantic lens** (`test-integrity`) reasons about the changed set relationally instead —
it's how this swarm catches a conflict that only exists once two branches merge, which no per-line
pass over either branch alone could see. **Report-only** — each finding names its location, the rule
and gate it fails, and the concrete change; the skill never edits, never commits, never opens a PR.
The caller routes the fixes.

`/work` § 4e fans out one [`swarm-reviewer`](../../agents/swarm-reviewer.md) per concern in the roster
below, all over the **integration branch** — one diff carrying every landed branch — after the
live-review round closes and before any PR opens. Each reviewer runs this skill with one `--concern`,
so the swarm scales with the roster, not the branch count. The orchestrator attributes each finding
to the branch that owns it and routes the fix (§ 4d). Standalone, with no `--concern`, this runs
**every** roster row in sequence over the current branch against `master` and prints the same report
for a human to act on.

**This swarm stays bounded.** `/code-review` is the separate, general tool for correctness and reuse
bugs; this swarm only ever runs the lenses in the roster below, one of which (`test-integrity`) now
reasons semantically rather than line-by-line, but it never grows into a general bug hunt. A finding
outside every roster lens is still out of scope — note it in one line and move on.

## Concern roster

Each row is one concern: a review lens, the rule family it loads, the paths it's in scope for, and
the model it runs on. `--concern <name>` picks one row. Adding a concern is one row here pointing at
a rule file — no new agent, no change to `/work` § 4e.

| `--concern`         | Lens        | Rule family — read in full before judging                                                                                                 | In-scope changed paths                                                                                     | Model  |
| ------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| `comment-authoring` | rule-family | [`comment-authoring`](../../rules/comment-authoring.md) + its [`examples`](../../rules/comment-authoring/examples.md) spoke               | `src/**`, `supabase/**/*.{ts,sql}`, `scripts/**`, `tests/**` — **including** `.css`/`.scss` under `src/**` | sonnet |
| `code-style`        | rule-family | [`code-style`](../../rules/code-style.md) + all six spokes: `phases`, `nesting`, `responsibility`, `variants`, `reactivity`, `signatures` | `src/**/*.{ts,vue}`                                                                                        | sonnet |
| `test-authoring`    | rule-family | [`test-authoring`](../../rules/test-authoring.md)                                                                                         | `tests/**`, `supabase/functions/**/*.test.ts`                                                              | sonnet |
| `test-integrity`    | semantic    | [`test-authoring/integrity`](../../rules/test-authoring/integrity.md)                                                                     | `tests/**`, `supabase/functions/**/*.test.ts`                                                              | opus   |

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

## Step 1 — Scope the diff to the concern

Capture both committed and uncommitted changes against the base (`--base`, default `master`):

- `git diff <base>...HEAD --name-only`
- `git status --short`

Keep only the files in the named concern's **In-scope changed paths** (Concern roster) — the other
concern's paths are another reviewer's job this run. Only **added or modified** lines are in scope — a
pre-existing violation the diff never touched is not this run's job. The one exception: a comment the
diff made stale (its subject line changed underneath it) is in scope even if the comment line itself
didn't change. **`test-integrity`, a relational concern, reads the full changed test files** (not
just the changed lines) to compare them against each other — still only files the diff touched, never
the pre-existing suite.

Running every concern (no `--concern`): repeat Steps 1–4 once per roster row, and print one report
section per concern.

## Step 2 — Load the gate list, don't review from memory

Read the named concern's rule family in full before judging anything — it is the checklist, and it
changes. The roster names exactly what to read: the rule and every spoke listed in its row.

## Step 3 — Review each changed hunk

For each in-scope file, read the diff plus enough surrounding code to judge each line at its own
altitude. Hold every changed line against the concern's rule family:

- **`comment-authoring`** — the position→shape table (including `<template>` = no comment ever, and
  the `tests/` single-row collapse), the six gates each failed on its own, the whole `## Never`
  list, the regex rule, and the pointer rules (readable sentence mandatory; `→[K:<slug>]` is the
  last token, never a comment on its own).
- **`code-style`** — each of the six spokes against the shape of every changed function.
- **`test-authoring`** — the decidable per-line gates: blackbox querying (`data-testid` only, never
  tag/class/role/text), the awaiting rules, the whole `## Reject` list, and hand-assigning upstream
  state instead of triggering it. Not the "accuses the source first" procedure — that's a workflow,
  not a per-line gate.
- **`test-integrity`** — read the full changed test files together, not line by line: a contradictory
  expected value for the same behavior/path across two changed tests, an assertion that contradicts
  the source's actual contract, or overlapping/duplicate coverage the batch introduced across files.

A single line can fail more than one gate in a concern; report each failure, not just the first.

## Step 4 — Report

Lead with the verdict, then the findings grouped by file. Every finding is self-contained — a builder
receives it with no other context, and reports stay **branch-agnostic**: name the file (or, for a
`test-integrity` cross-test conflict, **both files**, the contradiction, and the required edit) and
the quoted offender, never a branch. The orchestrator maps each finding to its owning branch.

```markdown
## review-work (comment-authoring) — <N> findings across <M> files

<!-- or: ## review-work (comment-authoring) — clean -->

### src/components/deck/deck-hero.vue

- **L42 · comment-authoring / gate: prescribes, not narrates** — `// increments the counter`
  restates the next line. Required: delete the comment.
- **L58 · comment-authoring / `<template>` = no comment ever** — comment inside `<template>`.
  Required: delete it; encode the intent in the `data-testid` / component name instead.
```

- **Head the report with the concern**, so a swarm's reports don't blur together.
- **`clean` is an explicit verdict**, not silence — the caller keys off it to proceed to PRs.
- One line per finding: `L<line> · <rule> / <gate>` — the quoted offender — **Required:** the exact
  edit. No prose paragraphs, no rationale beyond naming the gate.
- Order findings within a file top-to-bottom by line.
- A correctness bug noticed in passing goes under a final `### Out of scope (not enforced here)`
  section, one line each — never mixed into the findings the caller will route as conformance fixes.
