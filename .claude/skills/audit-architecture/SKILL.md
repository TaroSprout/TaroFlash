---
name: audit-architecture
description: Run an architecture audit that starts from what the feature IS, not what the current code shape says it is. First reconstructs the feature in domain terms as if no code existed, has a dedicated blind subagent design the ideal shape from that description alone, then diffs ideal vs actual — that reframe is the primary output. A dense smell punch list (separation of concerns, reusability, naming, theming tokens, locale paths, defaults, prop drilling, ui-kit neutrality, dead code) gathered by parallel finder subagents follows, filtered to whichever shape won. Default scope is the feature(s) touched by the current branch's diff vs master. Use `--global` to expand to the entire `src/` tree. Optional `--context "<note>"` feeds extra heuristics. Trigger on `/audit-architecture`, "audit architecture", "audit this branch", "review for smells", or after a multi-step refactor when the user wants a structural sanity check.
allowed-tools: Read, Bash, Glob, Grep, Agent, SendMessage
argument-hint: '[--global] [--context "<note>"]'
arguments:
  - name: --global
    description: Audit the entire `src/` tree instead of the feature(s) touched by the branch diff.
  - name: --context "<note>"
    description: Free-form note appended to the audit heuristics (e.g. "focus on theming tokens").
lastUpdated: 2026-07-18T00:00:00Z
---

## What this skill produces

Two things, in order:

1. **The reframe.** The #1 thing this skill exists to produce. Reconstruct the feature from its requirements — not its files — have a blind subagent design the ideal architecture from that description, then diff that ideal against what's implemented. A run that takes the current decomposition as given and only proposes rewirings of it (prop-drill → provide/inject, composable → store) is an incomplete run.
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

**Scope rule:** the diff decides _which feature(s)_ to audit; the reframe always covers the feature's **full tree**, not just changed lines. `git diff --name-only master...HEAD` → map changed files to their feature directories (view dir + its composables, api domain, related components) → that whole surface is in scope. The punch list may still weight changed files more heavily. If the branch hasn't diverged, fall back to staged + unstaged changes.

## Orchestration

The invoking agent is the **orchestrator**. It never writes the blind design itself and never walks the smell areas itself — it delegates both and owns everything around them: scope, the domain statement, the diff, the verdict, filtering, and the final report.

| Role          | Who                                         | Reads the implementation?                    |
| ------------- | ------------------------------------------- | -------------------------------------------- |
| Orchestrator  | main agent                                  | Only after dispatching the blind agent       |
| Blind reframe | one `general-purpose` agent, `model: fable` | No — by framing, not enforcement (see below) |
| Smell finders | 4 parallel `general-purpose` agents         | Yes — full scope tree                        |

Launch the blind agent and all four finders **in the same message** so they run concurrently. The verdict-scoping of findings ("don't flag prop-drilling in code the verdict deletes") happens as an orchestrator **post-filter** after the verdict exists — finders don't wait for the reframe.

## Phase 1 — The reframe (mandatory, always first)

### 1. State what the feature IS (orchestrator, before deep-reading)

Reconstruct the feature in domain terms as if no code existed: its essential entities, invariants, states, and user-facing behavior. Sources are the _outside_ of the code — the rendered UI, DB schema/migrations, PR history, `project_*` memories — not the current module boundaries. Write 1–2 paragraphs, thorough on behavior: the blind agent designs from this alone, so under-description produces a toy design. Err on the side of more behavioral detail, not more structural detail.

**Launder it.** The description must not leak the current decomposition: no file names, component names, composable names, prop names, or locale keys (locale keys encode component structure in this repo). `project_*` memories often describe the _implementation_ — extract the domain facts, drop the shape. If you can't state the feature without naming current files, step back further.

### 2. Design the ideal shape blind (subagent, `model: fable`)

Dispatch a subagent with a prompt containing:

- **The framing, explicitly:** it is performing a _blind reframe_ for an architecture audit — the value of its output depends entirely on it never reading the audited feature's implementation, because a design anchored to the current file layout is worthless as a comparison. Reading those files is possible but self-defeating. Give it the scope paths so it knows what to stay out of.
- **The laundered domain statement** from step 1.
- **Codebase-flavor access:** it should freely read `.claude/rules/`, `docs/`, `src/components/ui-kit/` + `layout-kit/`, and 1–2 named sibling features _outside_ the audited scope (pick exemplars for it) to absorb how this codebase does things — file granularity, state ownership idioms, api-layer shape, provide/inject patterns.
- **Output contract:** the greenfield design in this codebase's idioms — which concepts get a file, who owns which state, where the seams are, what talks to the server — plus an **assumptions** list and an **open questions** list. If the domain statement is missing something it needs, it lists the gap as an open question or a stated assumption instead of going to look.

If the open questions are material, answer them via `SendMessage` (laundered, same rules as step 1) and let it revise — one round, not a dialogue. This is the derived alternative — it must not invent a token second option to compare against; the blind design _is_ the comparison.

### 3. Diff ideal vs actual (orchestrator)

While the subagents run, read the implementation in full. When the blind design lands, diff it against the actual. The interesting findings live here:

- Concepts the code splits that the domain says are one thing (and vice versa — one file secretly hosting two features).
- Names that describe history or UI provenance ("study-modal", "clicked_row_id") rather than the domain role ("session", "additional_card_id").
- State owned by whoever happened to render first, instead of by the concept it belongs to.
- Abstractions that exist because of how the feature grew, not what it is (registries with one entry, flags that route between what should be two components).
- Boundaries drawn along old requirements that no longer exist.

Where the blind design diverges because its assumptions were wrong (check its assumptions list), discount those divergences — don't report artifacts of under-description as findings.

### 4. Verdict (orchestrator)

Conclude explicitly: **keep** the current shape, **reshape** toward the blind design (name the concrete moves), or **hybrid** (which parts of each). Weigh blast radius, existing conventions, and whether the current shape was a deliberate recorded choice (`project_*` memory, PR history) or default-path drift. "Current shape matches the ideal" is a valid verdict only when the blind agent genuinely designed from the domain statement alone.

## Phase 2 — Smell finders (parallel subagents)

Four finder agents, each owning a lens, launched alongside the blind agent. Each gets: the scope file list, the changed-file list (weight these more heavily), its area definitions below, the pointer to read `.claude/rules/` + linked docs for its areas, the `--context` note if any, and the finding-line format + severity tags from above. Each returns raw finding lines only — no prose, no fixes applied.

- **Finder A — boundaries:** separation of concerns (components mixing networking/business logic/presentation; composables that own state but also format payloads or render markup; pure helpers in `src/api/<domain>/db/` that belong in `src/utils/<domain>/`; orchestrator + worker in one body — `code-style.md`) · reusability + duplication (repeated factories/patterns across 2+ components; same `bg-X dark:bg-Y` pair in ≥ 3 files → semantic `--color-*` token; repeated `v-sfx` blocks → private subcomponent; defaults inlined at multiple call sites → `src/utils/<domain>/defaults.ts`) · defaults + dead code (unused size/variant maps; config fields defaulted in 3+ places; orphaned locale keys; unused imports).
- **Finder B — data flow + kits:** prop drilling vs provide/inject (same reactive object passed 2+ levels; children mutating `props.foo[key]`; skip when the leaf takes a derived slice) · ui-kit domain neutrality (consumer semantics in prop/slot/emit names; `theme` props instead of `data-theme` forwarding; multi-file primitives not promoted to `ui-kit/<name>/`) · layout-kit usage (layout primitives carrying visual treatment; inline `flex-col gap-X` containers reimplementing `section-list` / `labeled-section`).
- **Finder C — surface conventions:** theming tokens (raw palette classes/hex on themeable surfaces; `--theme-*` on base chrome; `@apply` — forbidden) · locale paths (top-level keys that belong under their feature path; hardcoded strings; shared keys across unrelated callsites — `i18n.md`) · naming + file structure (single-file directories; cross-directory imports suggesting misplacement; inconsistent leaf placement; directory names repeating the parent).
- **Finder D — consistency + tests:** stale or thin tests (tests referencing testids/shapes/paths that no longer exist; vacuous passes; class-name assertions — forbidden; missing tests for new primitives; report only, never touch tests) · cross-cutting consistency (mixed state-attr conventions — `data-active` is canonical; kebab vs camel drift; mixed `defineModel` vs prop+emit — defineModel is the default).

**Orchestrator post-filter:** dedupe across finders, drop findings in code the verdict slates for deletion or reshaping-away, apply the `--context` bias, re-rank severities where a finder over- or under-called, cap at ~20.

## Workflow

1. **Resolve scope** per the scope rule. Print the feature(s) and file count up-front so the user can re-scope.
2. **Write the domain statement** (Phase 1 step 1) — before deep-reading the implementation; skimming file names to map scope is fine, reading bodies is not.
3. **Dispatch all subagents in one message:** the blind-reframe agent (`model: fable`) + the four finders.
4. **Read the implementation in full** while they run.
5. **Diff + verdict** when the blind design returns (answer material open questions via `SendMessage` first if needed).
6. **Collect finder output, post-filter** against the verdict + `--context`.
7. **Render the report.** Reframe first, then findings bundled under one heading per lens area (skip empty areas), then 3–5 priority items.
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

- Audit is **non-destructive**. Read-only tools + subagent dispatch; no formatters, lints, or tests, and no edits by any agent.
- Cite overlapping project rules by name in the fix ("see `architecture.md` — provide/inject section").
- Cap the punch list at ~20 findings; group similar ones on a single line and recommend a `--context` focus for the next pass.
- Brevity > completeness in the punch list; the reframe gets the space it needs.
- Be specific about locations: `src/components/foo.vue:42` beats "the foo component".
- If the blind design converges suspiciously hard on the current shape, check whether the domain statement leaked structure before accepting a "keep" verdict.

## Trigger phrases

`/audit-architecture`, "audit architecture", "audit this branch", "review for smells", "structural review", "architecture pass". Don't auto-trigger after every commit — user-invoked only.
