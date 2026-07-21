---
name: groom
description: Turn raw one-line Notion Task Board tickets into agent-ready specs. Reads the seed app-map, forms a hunch about where each task lives, checks that hunch with you, investigates the codebase, validates its assumptions with you, then drafts a rewritten title + body + fields (Priority/Type/Epic/Assignee) for the whole batch and applies them on your approval — moving each to Ready (pair) or Queued (auto). May propose creating or merging tickets. Trigger on `/groom`, "groom the backlog", "groom tickets".
allowed-tools: Read, Grep, Glob, Bash, Agent, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page, mcp__notion__notion-create-pages, mcp__notion__notion-search
argument-hint: '[--p0|--p1|--p2|--p3] [--count N] [<ID> <ID> …]'
arguments:
  - name: --p0|--p1|--p2|--p3
    description: Only groom Backlog tickets of this priority.
  - name: --count N
    description: Cap the batch at N tickets (default 10). Ordered Priority → ID.
  - name: <ID>
    description: One or more numeric ticket IDs to groom specifically (overrides filters).
lastUpdated: 2026-07-20T00:00:00Z
---

## What this skill does

Grooming = converting a raw ticket (a one-line idea) into something an agent can execute
without guessing. It is a **batched, checkpointed** flow: ~3 interruptions total, not one per
ticket. You stay in control of scope and never get surprised by a bad hunch.

The output of a groomed ticket:

- a **descriptive title** (replaces the raw one-liner),
- a **body** filled from the per-Type template (§ Body templates),
- suggested **Priority / Type / Epic / Assignee**,
- moved to **`Ready`** (pair) or **`Queued`** (autonomous batch).

Do **not** touch tests. Do **not** write code. This skill only reads code and writes Notion.

## Board constants

- **Task Board** data source: `collection://3630953c-224c-8065-8864-000bb9fe7bad`
- **Epic Board** data source: `collection://2510953c-224c-80b7-9bb0-000b5384a47d`
- **Fields & vocab:**
  - `Status`: `Needs More Info` · `Backlog` · `Ready` · `Queued` · `In Progress` · `Blocked` · `Review` · `Done` · `Duplicate`
  - `Priority`: `⇞P0` · `↑P1` · `↓P2` · `⇟P3`
  - `Type`: `Bug` · `Task` · `Story`
  - `Assignee`: `Me` · `Fable` · `Opus` · `Sonnet`
  - `Epic`: relation to Epic Board (single). `ID`: read-only auto-increment.

## Procedure

### 0. LOAD seed

Read `.claude/context/app-map.md` in full. It is the grounding for every hunch — the
keyword→path hunch guide and the Epic→code map are the two tables you lean on hardest.

### 1. FETCH

Query the Task Board for the input set:

```sql
SELECT "userDefined:ID" AS id, "Name", "Type", "Priority", "Epic", url
FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
WHERE "Status" = 'Backlog'          -- skips Needs More Info
ORDER BY "Priority" ASC, "userDefined:ID" ASC
```

Apply args: `--pN` adds `AND "Priority" = '<glyph>'`; explicit `<ID>`s replace the WHERE with
`"userDefined:ID" IN (…)` (ignoring the Backlog filter — but warn if a named ticket isn't in
Backlog). `--count N` caps the batch (default 10). If the batch would exceed the cap, take the
top N by Priority→ID and tell the user how many were left.

### 2. SELECT

Echo the batch as a compact numbered list (ID · Priority · raw name). If args fully determined
it, proceed. If ambiguous or oversized, ask which to include before spending investigation time.

--- batched checkpoints below: do all tickets at each stage, then one interruption ---

### 3. HUNCH-ALL ▸ CHECKPOINT 1

For each ticket, from the raw name + app-map alone (no code reads yet), state a one-liner:

> `#141` spinbox step bug → likely `src/components/ui-kit/spinbox/` + review-pacing callers
> Present all hunches together. **Stop and let the user course-correct the search direction**
> before you spend time investigating. Cheap to redirect here, expensive later.

### 4. INVESTIGATE

With hunches confirmed, dig into the codebase for the whole batch — grep, read the relevant
files, confirm where the change lives, note affected files, adjacent patterns, and any rules
(`.claude/rules/*`) that govern the area. For a large batch, dispatch parallel `Agent` (Explore)
subagents, one per ticket or per cluster, to keep it fast. Gather: what/where, root cause (bugs),
affected paths, constraints, open unknowns.

### 5. VALIDATE-ALL ▸ CHECKPOINT 2

Report per ticket: assumptions **confirmed** vs **wrong/surprising**, and any unknowns that need
your input. **Stop for confirmation or redirect** before drafting. If a ticket is still too thin
to spec even after investigation, flag it as a → `Needs More Info` candidate here.

### 6. DRAFT-ALL ▸ APPROVE-BATCH

For every ticket, draft in one pass and present together:

- **Title** — descriptive rewrite.
- **Body** — per-Type template (§ below), filled with what INVESTIGATE found.
- **Fields** — suggested `Priority`, `Type`, `Epic` (from the Epic→code map), `Assignee` (§ heuristic).
- **Lane** — `Ready` (pair) or `Queued` (auto). Default `Queued` when the spec is complete and
  the work is mechanical/low-risk; default `Ready` (pair) when it touches `supabase/`, auth,
  billing, RLS/security, or is genuinely ambiguous. State which and why in one phrase.
  **A `Queued` ticket MUST have `Assignee` ∈ {`Fable`,`Opus`,`Sonnet`}** — `/work batch` skips
  `Me`, so a `Queued` + `Me` ticket would sit unworked forever. If a ticket is heading to `Queued`
  but you'd assign `Me`, that's a contradiction: either give it a model, or route it to `Ready`.
- **Proposals** — where warranted: **CREATE** a new ticket (e.g. work discovered that's out of
  scope), or **MERGE** this ticket into another (name the survivor). Never silently.

Present as an editable batch. The user approves / edits / skips per ticket in one review.

### 7. WRITE

Apply only what was approved, via `notion-update-page` per ticket (and `notion-create-pages` for
CREATEs):

- set the title, write the body (page content), set `Priority`/`Type`/`Epic`/`Assignee`,
- set `Status` = `Ready` or `Queued` (or `Needs More Info` for the thin ones).
- **Refuse to write `Status = Queued` when `Assignee` is `Me` or empty.** Stop and ask the user
  to pick a model or send it to `Ready` — never write a self-stranding ticket.
- **Merges:** move the merged-away ticket to `Status = Duplicate`, add a body line linking the
  survivor, and fold any unique context into the survivor's body.
  Write sequentially; if a write fails, report which and stop rather than half-applying silently.

### 8. REPORT

Concise tally: `groomed → Ready/Queued (with assignee)`, `created`, `merged → Duplicate`,
`parked → Needs More Info`, `skipped`. One line each. No prose.

## Body templates

**Bug**

```
## Repro
1. …
## Expected / Actual
- Expected: …
- Actual: …
## Area
<path(s)> — <root cause if known>
## Acceptance
<observable condition proving it's fixed>
```

**Task / Story**

```
## Goal
<what & why, 1–2 lines>
## Acceptance criteria
- [ ] …
## Area
<path(s)>
## Constraints / out of scope
- …
```

Keep bodies tight — enough for an agent to act, no padding. Follow project i18n rule: any new
user-facing copy the ticket implies should note the locale key path (`src/locales/en-us.json`).

## Assignee heuristic (suggest, user overrides)

- **`Opus`** — architectural, cross-cutting, ambiguous, or security/backend-sensitive work.
- **`Sonnet`** — well-scoped feature/bug work with a clear spec.
- **`Fable`** — mechanical/localized changes (copy, single-component tweaks, icon swaps).
- **`Me`** — you want to drive it yourself; also the signal that it is **not** auto-eligible
  (a `Me` ticket is never picked by `/work batch`). Pair-lane tickets are typically `Me` or a
  model you'll sit with.

## Guardrails

- Only ever touch the Task Board data source above — never any backup/duplicate database.
- Never change `Status` to an `In Progress`/`Review`/`Done` value here — grooming lands tickets
  in `Ready`/`Queued`/`Needs More Info`/`Duplicate` only.
- Priority/Type are the user's inputs: propose changes, never apply them unasked.
- If unsure whether to merge/create, ask — don't guess destructive board edits.
