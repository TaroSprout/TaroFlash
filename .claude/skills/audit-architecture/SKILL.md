---
name: audit-architecture
description: Run an architecture audit that starts from what the feature IS, not what the current code shape says it is. First reconstructs the feature in domain terms as if no code existed, designs the ideal shape blind, then diffs ideal vs actual — that reframe is the primary output. A dense smell punch list (separation of concerns, reusability, naming, theming tokens, locale paths, defaults, prop drilling, ui-kit neutrality, dead code) follows, scoped to whichever shape won. Default scope is the feature(s) touched by the current branch's diff vs master. Use `--global` to expand to the entire `src/` tree. Optional `--context "<note>"` feeds extra heuristics. Trigger on `/audit-architecture`, "audit architecture", "audit this branch", "review for smells", or after a multi-step refactor when the user wants a structural sanity check.
allowed-tools: Read, Bash, Glob, Grep
argument-hint: '[--global] [--context "<note>"]'
arguments:
  - name: --global
    description: Audit the entire `src/` tree instead of the feature(s) touched by the branch diff.
  - name: --context "<note>"
    description: Free-form note appended to the audit heuristics (e.g. "focus on theming tokens").
lastUpdated: 2026-07-17T00:00:00Z
---

## What this skill produces

Two things, in order:

1. **The reframe.** The #1 thing this skill exists to produce. Reconstruct the feature from its requirements — not its files — design the ideal architecture blind, then diff that ideal against what's implemented. A run that takes the current decomposition as given and only proposes rewirings of it (prop-drill → provide/inject, composable → store) is an incomplete run.
2. A **dense, scannable** punch list of smells within whichever shape the reframe endorsed. Readable in under a minute.

The reframe is prose and is **exempt from the density rules** — give it the space it needs (a few tight paragraphs, not an essay). The punch list stays one line per finding. Do **not** apply fixes — wait for the user to pick.

Each finding line:

```
- {severity} {path:line} — {problem}. {why it matters in one phrase}. → {fix in one phrase}
```

Severity tags: `H` (real bug or architectural break), `M` (clear smell, easy fix), `L` (nit, taste).

No "Suggested fix:" / "Reason:" labels — the structure carries them. If a finding needs more than one sentence, it's two findings.

## Inputs

| Flag / param         | Purpose                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--global`           | Expand scope to the entire `src/` tree. Use sparingly — global scans are slow.                                                                                                                          |
| `--context "<note>"` | Free-text hint that biases the audit. Examples: `"focus on ui-kit primitives"`, `"ignore study-session/* — separate refactor"`. Surface the note in the report header so the user knows you applied it. |

**Scope rule:** the diff decides _which feature(s)_ to audit; the reframe always reads the feature's **full tree**, not just changed lines. `git diff --name-only master...HEAD` → map changed files to their feature directories (view dir + its composables, api domain, related components) → that whole surface is in scope. The punch list may still weight changed files more heavily. If the branch hasn't diverged, fall back to staged + unstaged changes.

## Phase 1 — The reframe (mandatory, always first)

Four steps, in order. Do NOT deep-read the implementation before step 2 is written down — the whole point is that the ideal design isn't anchored to the current file layout.

### 1. State what the feature IS

Reconstruct the feature in domain terms as if no code existed: its essential entities, invariants, states, and user-facing behavior. Sources for this are the _outside_ of the code — the rendered UI, locale strings, DB schema/migrations, PR history, `project_*` memories — not the current module boundaries. Write it as 3–6 sentences. If you can't state the feature without naming current files, you haven't stepped back far enough.

### 2. Design the ideal shape blind

From that domain statement alone, sketch how you'd architect it greenfield **in this codebase's idioms** (`.claude/rules/`, patterns used by sibling features): which concepts get a file, who owns which state, where the seams are, what talks to the server. This is the alternative — derived, not brainstormed. Don't invent a token second option to compare against; the blind design is the comparison.

### 3. Diff ideal vs actual

Now read the implementation in full and diff it against the blind design. The interesting findings live here:

- Concepts the code splits that the domain says are one thing (and vice versa — one file secretly hosting two features).
- Names that describe history or UI provenance ("study-modal", "clicked_row_id") rather than the domain role ("session", "additional_card_id").
- State owned by whoever happened to render first, instead of by the concept it belongs to.
- Abstractions that exist because of how the feature grew, not what it is (registries with one entry, flags that route between what should be two components).
- Boundaries drawn along old requirements that no longer exist.

### 4. Verdict

Conclude explicitly: **keep** the current shape, **reshape** toward the blind design (name the concrete moves), or **hybrid** (which parts of each). Weigh blast radius, existing conventions, and whether the current shape was a deliberate recorded choice (`project_*` memory, PR history) or default-path drift. "Current shape matches the ideal" is a valid verdict only after steps 1–2 were genuinely done blind.

## Phase 2 — Smell punch list

Walk these areas in order, scoped to the shape the verdict endorsed (don't flag prop-drilling in code the verdict says to delete). Bundle findings under one heading per area; skip empty areas.

1. **Separation of concerns** — components mixing networking/business logic/presentation; composables that own state but also format payloads or render markup; pure helpers in `src/api/<domain>/db/` that belong in `src/utils/<domain>/`; orchestrator + worker in one body (`code-style.md`).
2. **Reusability + duplication** — repeated factories/patterns across 2+ components; the same `bg-X dark:bg-Y` pair in ≥ 3 files → semantic `--color-*` token (`theming.md`); repeated `v-sfx` blocks → private subcomponent; defaults defined inline at multiple call sites → `src/utils/<domain>/defaults.ts`.
3. **Prop drilling vs provide/inject** — same reactive object passed 2+ levels; children mutating `props.foo[key]`; skip when the leaf takes a derived slice.
4. **ui-kit domain neutrality** — consumer semantics in prop/slot/emit names (`is_premium` → shape-describing names); `theme` props instead of `data-theme` forwarding; multi-file primitives not promoted to `ui-kit/<name>/`.
5. **Layout-kit usage** — layout primitives carrying visual treatment; inline `flex-col gap-X` containers that reimplement `section-list` / `labeled-section`.
6. **Theming tokens** — raw palette classes/hex on themeable surfaces; `--theme-*` on base chrome; `@apply` (forbidden).
7. **Locale paths** — top-level keys that belong under their feature path; hardcoded strings; shared keys across unrelated callsites (`i18n.md`).
8. **Naming + file structure** — single-file directories; cross-directory imports suggesting misplacement; inconsistent leaf placement; directory names repeating the parent.
9. **Defaults + dead code** — unused size/variant maps; config fields defaulted in 3+ places; orphaned locale keys; unused imports.
10. **Stale or thin tests** — tests referencing testids/shapes/paths that no longer exist; vacuous passes; class-name assertions (forbidden — `testing.md`); missing tests for new primitives. Report only — never touch tests.
11. **Cross-cutting consistency** — mixed state-attr conventions (`data-active` is canonical); kebab vs camel drift; mixed `defineModel` vs prop+emit (defineModel is the default).

## Workflow

1. **Resolve scope** per the scope rule above. Print the feature(s) and file count up-front so the user can re-scope.
2. **Read the rules.** Load every file under `.claude/rules/` — audit against project conventions, not generic Vue best practices.
3. **Reframe steps 1–2 blind.** Gather domain evidence (UI, locales, schema, PR history) and write the feature statement + ideal design _before_ deep-reading the implementation. Skimming file names to map scope is fine; reading bodies is not.
4. **Reframe steps 3–4.** Read the implementation in full, diff, write the verdict.
5. **Walk the punch-list areas** in order, buffering findings per area.
6. **Apply context bias.** If `--context` was passed, drop/down-weight what it says to ignore and surface the note in the header.
7. **Render the report.** Reframe first, then findings, then 3–5 priority items.
8. **Stop.** Do **not** edit code. Wait for the user to pick.

## Report shape

```markdown
# Audit — `refactor-foo` (feature: deck-settings)

Context: focus on ui-kit primitives
Files in scope: 18 (12 changed)

## Reframe

**What it is:** Deck settings is a draft-edit surface over a deck's config: the member opens a modal, edits a draft of general/design/study fields, and commits or discards atomically. The domain concepts are the draft, the field groups, and the commit boundary.

**Blind design:** One draft composable owning the reactive draft + dirty state, provided at the modal root; one dumb tab component per field group injecting it; commit/discard live on the composable, not the tabs.

**Diff:** The implementation splits the draft across three tab-local refs synced by watchers — the domain says one draft. `tab-study` also owns the commit call, so closing from another tab silently drops edits. Naming follows UI history (`settings-modal-state`) not the domain (`deck draft`).

**Verdict:** Reshape. Consolidate into one provided draft composable (pattern already used by `member-editor`); the tabs become pure field groups. Blast radius: 5 files, no API changes.

## SoC

- M `src/components/foo.vue:42` — payload built inline pre-save. Couples view to persistence shape. → move builder to `src/utils/foo/payload.ts`.

## Priority

1. H Reshape per verdict — single provided draft composable.
2. M Promote `bg-brown-100 dark:bg-grey-700` → `--color-input`.
```

## When NOT to invoke

- Single-file changes — overkill, just review the diff.
- Already mid-refactor with an open task list — the audit repeats what the user is tracking.
- No git history available (fresh worktree without master) — fall back to `--global` only if the user explicitly asks.

## Heuristics

- Audit is **non-destructive**. Read-only tools; no formatters, lints, or tests.
- Cite overlapping project rules by name in the fix ("see `architecture.md` — provide/inject section").
- Cap the punch list at ~20 findings; group similar ones on a single line and recommend a `--context` focus for the next pass.
- Brevity > completeness in the punch list; the reframe gets the space it needs.
- Be specific about locations: `src/components/foo.vue:42` beats "the foo component".

## Trigger phrases

`/audit-architecture`, "audit architecture", "audit this branch", "review for smells", "structural review", "architecture pass". Don't auto-trigger after every commit — user-invoked only.
