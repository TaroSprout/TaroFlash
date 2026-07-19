---
name: audit-architecture
description: Run an architecture audit that starts from what the feature IS, not what the current code shape says it is. First reconstructs the feature in domain terms as if no code existed, has a dedicated blind subagent design the ideal shape from that description alone, then diffs ideal vs actual — that reframe is the primary output. Pauses for user sign-off on the domain statement before dispatching any subagent. Reports extremely concisely: a bird's-eye view of the architecture now and what the verdict changes, then one ranked list of high/medium fixes and refactors gathered by parallel finder subagents (separation of concerns, reusability, naming, theming tokens, locale paths, defaults, prop drilling, ui-kit neutrality, dead code). Default scope is the feature(s) touched by the current branch's diff vs master. Use `--global` to expand to the entire `src/` tree. `--fable` / `--opus` / `--sonnet` picks the blind agent's model (default fable). Optional `--context "<note>"` feeds extra heuristics. Trigger on `/audit-architecture`, "audit architecture", "audit this branch", "review for smells", or after a multi-step refactor when the user wants a structural sanity check.
allowed-tools: Read, Bash, Glob, Grep, Agent, SendMessage
argument-hint: '[--global] [--fable|--opus|--sonnet] [--context "<note>"]'
arguments:
  - name: --global
    description: Audit the entire `src/` tree instead of the feature(s) touched by the branch diff.
  - name: --fable|--opus|--sonnet
    description: Model for the blind-reframe agent. Defaults to `--fable`. Finders are unaffected.
  - name: --context "<note>"
    description: Free-form note appended to the audit heuristics (e.g. "focus on theming tokens").
lastUpdated: 2026-07-19T00:00:00Z
---

## What this skill produces

Two things, in order — **both extremely concise**. The whole report is readable in under a minute.

1. **The reframe.** The #1 thing this skill exists to produce. Reconstruct the feature from its requirements — not its files — have a blind subagent design the ideal architecture from that description, then diff that ideal against what's implemented. A run that takes the current decomposition as given and only proposes rewirings of it (prop-drill → provide/inject, composable → store) is an incomplete run. **Report it as a bird's-eye view: what the architecture is today, and what the verdict changes about it** — a compact current-shape sketch plus the deltas. Not a walkthrough of the reasoning, not the blind design in full, not the assumptions list.
2. A **single ranked list of H/M fixes and refactors.** Drop `L` findings entirely — they don't reach the report.

Density is the point. If a section can be a diagram or a bullet, it isn't a paragraph. Do **not** apply fixes — wait for the user to pick.

Each finding line:

```
- {severity} {path:line} — {problem}. {why it matters in one phrase}. → {fix in one phrase}
```

Severity tags: `H` (real bug or architectural break), `M` (clear smell, easy fix), `L` (nit, taste).

No "Suggested fix:" / "Reason:" labels — the structure carries them. If a finding needs more than one sentence, it's two findings.

## Inputs

| Flag / param                      | Purpose                                                                                                                                                                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--global`                        | Expand scope to the entire `src/` tree. Use sparingly — global scans are slow.                                                                                                                                                                 |
| `--fable` / `--opus` / `--sonnet` | Model for the **blind-reframe agent only**; default `--fable`. Pass as the `model` option on that `Agent` call. Finders always run on the default model. If more than one is given, the last wins. Name the chosen model in the report header. |
| `--context "<note>"`              | Free-text hint that biases the audit. Examples: `"focus on ui-kit primitives"`, `"ignore study-session/* — separate refactor"`. Surface the note in the report header so the user knows you applied it.                                        |

**Scope rule:** the diff decides _which feature(s)_ to audit; the reframe always covers the feature's **full tree**, not just changed lines. `git diff --name-only master...HEAD` → map changed files to their feature directories (view dir + its composables, api domain, related components) → that whole surface is in scope. The punch list may still weight changed files more heavily. If the branch hasn't diverged, fall back to staged + unstaged changes.

## Orchestration

The invoking agent is the **orchestrator**. It never writes the blind design itself and never walks the smell areas itself — it delegates both and owns everything around them: scope, the domain statement, the diff, the verdict, filtering, and the final report.

| Role          | Who                                                           | Reads the implementation?                    |
| ------------- | ------------------------------------------------------------- | -------------------------------------------- |
| Orchestrator  | main agent                                                    | Only after dispatching the blind agent       |
| Blind reframe | one `general-purpose` agent, model per flag (default `fable`) | No — by framing, not enforcement (see below) |
| Smell finders | 4 parallel `general-purpose` agents                           | Yes — full scope tree                        |

Launch the blind agent and all four finders **in the same message** so they run concurrently. The verdict-scoping of findings ("don't flag prop-drilling in code the verdict deletes") happens as an orchestrator **post-filter** after the verdict exists — finders don't wait for the reframe.

## Phase 1 — The reframe (mandatory, always first)

### 1. State what the feature IS (orchestrator, before deep-reading)

Reconstruct the feature in domain terms as if no code existed: its essential entities, invariants, states, and user-facing behavior. Sources are the _outside_ of the code — the rendered UI, DB schema/migrations, PR history, `project_*` memories — not the current module boundaries. Write 1–2 paragraphs, thorough on behavior: the blind agent designs from this alone, so under-description produces a toy design. Err on the side of more behavioral detail, not more structural detail.

**Launder it.** The description must not leak the current decomposition: no file names, component names, composable names, prop names, or locale keys (locale keys encode component structure in this repo). `project_*` memories often describe the _implementation_ — extract the domain facts, drop the shape. If you can't state the feature without naming current files, step back further.

**Sign-off gate (blocking).** Print the domain statement and stop. Nothing dispatches until the user approves it — everything downstream is derived from this statement, so a wrong one wastes the whole run. Print it as a short concise summary, not the full text: scope line + 3–6 bullets covering entities, invariants/states, and user-facing behavior. Then ask the user to approve or correct. Apply corrections and re-print if the change is material; otherwise proceed straight to dispatch.

### 2. Design the ideal shape blind (subagent, model per flag — default `fable`)

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
3. **Print the summary and wait for sign-off.** Blocking — no subagent runs before the user approves.
4. **Dispatch all subagents in one message:** the blind-reframe agent (model per flag, default `fable`) + the four finders.
5. **Read the implementation in full** while they run.
6. **Diff + verdict** when the blind design returns (answer material open questions via `SendMessage` first if needed).
7. **Collect finder output, post-filter** against the verdict + `--context`; drop all `L`.
8. **Render the report** per the shape below — bird's-eye now/after, then one ranked H/M list. No per-lens sections.
9. **Stop.** Do **not** edit code. Wait for the user to pick.

## Report shape

Two sections. Nothing else — no per-lens headings, no assumptions, no methodology.

```markdown
# Audit — `refactor-foo` (deck-settings) · 18 files (12 changed) · context: ui-kit primitives

## Architecture

**Now:** modal root → 3 tab components, each owning a local draft ref; watchers sync them; `tab-study` fires the commit. API via `src/api/decks/mutations`.

**Verdict — reshape:** one provided draft composable owns draft + dirty + commit; tabs become pure field groups. Blast radius 5 files, no API change.

**Changes:** 3 tab-local refs → 1 provided draft · commit moves out of `tab-study` (fixes silent edit loss) · `settings-modal-state` → `deck-draft`.

**Keeps:** api layer, modal shell, per-tab file split.

## Fixes

1. H Consolidate 3 draft refs → provided `useDeckDraft` (`tab-*.vue`) — see `architecture.md`.
2. H `tab-study.vue:88` — commit owned by one tab; closing elsewhere drops edits. → move to the draft composable.
3. M `foo.vue:42` — payload built inline pre-save. → `src/utils/foo/payload.ts`.
```

- **Architecture:** four labeled lines max. `Now` is a one-line shape sketch (arrows fine); `Verdict` names the call + blast radius; `Changes` is the delta list; `Keeps` names what survives so the user knows the scope is bounded. If the verdict is **keep**, `Changes`/`Keeps` collapse to one line.
- **Fixes:** one ranked list, H before M, each one line in the finding format. Cap ~12. If lens coverage found nothing above `L`, say so in one line.

## When NOT to invoke

- Single-file changes — overkill, just review the diff.
- Already mid-refactor with an open task list — the audit repeats what the user is tracking.
- No git history available (fresh worktree without master) — fall back to `--global` only if the user explicitly asks.

## Heuristics

- Audit is **non-destructive**. Read-only tools + subagent dispatch; no formatters, lints, or tests, and no edits by any agent.
- Cite overlapping project rules by name in the fix ("see `architecture.md` — provide/inject section").
- Cap the fix list at ~12 findings; group similar ones on a single line and recommend a `--context` focus for the next pass.
- Brevity > completeness, everywhere — including the reframe. The report is a bird's-eye view, not a record of the analysis; the depth went into producing the verdict, not into narrating it.
- Be specific about locations: `src/components/foo.vue:42` beats "the foo component".
- If the blind design converges suspiciously hard on the current shape, check whether the domain statement leaked structure before accepting a "keep" verdict.

## Trigger phrases

`/audit-architecture`, "audit architecture", "audit this branch", "review for smells", "structural review", "architecture pass". Don't auto-trigger after every commit — user-invoked only.
