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
lastUpdated: 2026-07-23T00:00:00Z
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
SELECT "userDefined:ID" AS id, "Name", "Type", "Priority", "Epic", "Assignee", url
FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
WHERE "Status" = 'Backlog'                         -- skips every other lane (Needs More Info, Icebox, …)
  AND ("Assignee" IS NULL OR "Assignee" <> 'Me')   -- Me on a backlog ticket = hands off, don't groom
ORDER BY "Priority" ASC, "userDefined:ID" ASC
```

`Assignee = Me` on a Backlog ticket is the user's "I'll handle this myself — don't groom" signal;
never auto-pull it. Apply args: `--pN` adds `AND "Priority" = '<glyph>'`; explicit `<ID>`s replace
the WHERE with `"userDefined:ID" IN (…)` (overriding both the Backlog and the `Me` filter, since
naming a ticket is deliberate — but warn if a named ticket isn't in Backlog or is assigned `Me`).
`--count N` caps the batch (default 10). If the batch would exceed the cap, take the top N by
Priority→ID and tell the user how many were left.

### 2. SELECT

Echo the batch as a compact numbered list (ID · Priority · raw name). If args fully determined
it, proceed. If ambiguous or oversized, ask which to include before spending investigation time.

### 3. READ existing descriptions

Before hunching, fetch each selected ticket's **page body** (not just properties) via
`notion-fetch` — the FETCH query in §1 pulls properties only. The user sometimes writes extra
context, constraints, or a half-formed direction into a raw ticket's description; that is the
single best grounding you have and must not be discarded. Read every in-scope body, note anything
the user already said, and carry it into HUNCH, INVESTIGATE, and DRAFT — a hunch that ignores a
description the user wrote is a wasted checkpoint. If a description already dictates the approach,
honour it rather than re-deriving from the name alone.

--- batched checkpoints below: do all tickets at each stage, then one interruption ---

> **Checkpoint reporting voice (CHECKPOINT 1 & 2).** Report to the user in **product terms** —
> describe where a thing sits in the **UI** and what the user experiences ("the edit-decks
> control on the dashboard", "the popup after Google sign-up", "the red error under the name
> field"). Do **not** surface filepaths, component/composable names, function names, or symbols
> in the checkpoint report — the user thinks in screens and flows, not the file tree. Filepaths
> still belong in the drafted ticket **body** (§ 7, agent-facing), just never in the
> user-facing checkpoint summaries. When a hunch is fundamentally about a location in code,
> translate it to the screen/flow the user would recognise.

### 4. HUNCH-ALL ▸ CHECKPOINT 1

For each ticket, from the raw name + app-map alone (no code reads yet), state a one-liner in
product terms — the screen/flow it lives in and what the user sees, not the path:

> `#141` spinbox step bug → likely the number steppers in deck review-pacing settings
> Present all hunches together. **Stop and let the user course-correct the search direction**
> before you spend time investigating. Cheap to redirect here, expensive later.

### 5. INVESTIGATE

With hunches confirmed, dig into the codebase for the whole batch — grep, read the relevant
files, confirm where the change lives, note affected files, adjacent patterns, and any rules
(`.claude/rules/*`) that govern the area. For a large batch, dispatch parallel `Agent` (Explore)
subagents, one per ticket or per cluster, to keep it fast. Gather: what/where, root cause (bugs),
affected paths, constraints, open unknowns.

### 6. VALIDATE-ALL ▸ CHECKPOINT 2

Report per ticket, **in product terms** (see reporting-voice note above — screens and flows, no
filepaths or symbol names): assumptions **confirmed** vs **wrong/surprising**, and any unknowns
that need your input. Separate the "clean, ready to spec" tickets from the ones that need a
decision, and for each decision state the user-facing choice plainly (what changes on screen,
what the trade-off is) rather than the implementation fork. **Stop for confirmation or redirect**
before drafting. If a ticket is still too thin to spec even after investigation, flag it as a →
`Needs More Info` candidate here.

### 7. DRAFT-ALL ▸ APPROVE-BATCH

For every ticket, draft the full body in one pass (per-Type template § below), but **present a
compact summary** — do not dump full bodies into the review. Per ticket show:

- **Title** — descriptive rewrite.
- **Description summary** — a **single line** (≤1 line) capturing the product intent. The full
  **Product description** and **Technical notes** live in the drafted body, not the review.
- **Fields** — suggested `Priority`, `Type`, `Epic` (from the Epic→code map), `Assignee` (§ heuristic
  — always a model, **never `Me`**).
- **Lane** — `Ready` (pair) or `Queued` (auto). Default `Queued` when the spec is complete and
  the work is mechanical/low-risk; default `Ready` (pair) when it touches `supabase/`, auth,
  billing, RLS/security, or is genuinely ambiguous. State which and why in one phrase.
  **Every ticket — `Ready` or `Queued` — gets a suggested `Assignee` ∈ {`Fable`,`Opus`,`Sonnet`}.**
  Grooming never suggests `Me`; on `Queued` especially a `Me` ticket would sit unworked forever
  (`/work batch` skips it). The user can always switch a suggestion to `Me` themselves.
- **Proposals** — where warranted: **CREATE** a new ticket (e.g. work discovered that's out of
  scope), or **MERGE** this ticket into another (name the survivor) — especially for `Ready`, see
  the consolidation note below. Never silently.

> **Consolidate aggressively for the `Ready` (pair) lane.** A pairing ticket is worked in one
> interactive session, and one ticket can — and should — encapsulate several related small tasks.
> When two or more `Ready`-bound tickets share the **same surface** (same screen / flow /
> component) or the **same root cause**, propose **MERGE**ing them into a single pairing ticket
> rather than leaving a scatter of one-liners. Lean toward merging here — a session comfortably
> covers a cluster, and fewer-but-richer pairing tickets beat many thin ones. Two guardrails:
> (1) merge only by shared surface or shared root cause, **never by shared epic alone** — a ticket
> bundling unrelated surfaces is a grab-bag that won't spec cleanly for one sitting (e.g. an
> in-session card animation does **not** belong with an end-of-session summary layout change just
> because both live under the same epic); (2) fold every absorbed ticket's scope into the
> survivor's body — acceptance criteria **and** technical notes — so nothing is lost. `Queued`
> (auto) tickets stay one-task-per-ticket: batch agents work them independently, so merging there
> only couples unrelated work.

Present as an editable batch. The user approves / edits / skips per ticket in one review.

### 8. WRITE

Apply only what was approved, via `notion-update-page` per ticket (and `notion-create-pages` for
CREATEs):

- set the title, write the body (page content), set `Priority`/`Type`/`Epic`/`Assignee`,
- set `Status` = `Ready` or `Queued` (or `Needs More Info` for the thin ones).
- **Refuse to write `Status = Queued` when `Assignee` is `Me` or empty.** Stop and ask the user
  to pick a model or send it to `Ready` — never write a self-stranding ticket.
- **Merges:** move the merged-away ticket to `Status = Duplicate`, prepend a body line pointing to
  the survivor (the Notion MCP can't trash rows — `Duplicate` + the pointer lets the user delete it
  in the UI), and fold its full scope (acceptance + technical notes) into the survivor's body.
  Write sequentially; if a write fails, report which and stop rather than half-applying silently.

### 9. REPORT

Concise tally: `groomed → Ready/Queued (with assignee)`, `created`, `merged → Duplicate`,
`parked → Needs More Info`, `skipped`. One line each. No prose.

## Body templates

Every body carries two named sections: **Product description** (what the user experiences and
why, in plain product terms — no filepaths) and **Technical notes** (the agent-facing detail:
paths, root cause, approach, constraints/out-of-scope, rules, i18n key paths). The description
summary shown at CHECKPOINT/DRAFT review is a one-line distillation of Product description.

**Bug**

```
## Product description
<1–3 lines: what the user sees/experiences and why it's wrong, product terms>
## Repro
1. …
## Expected / Actual
- Expected: …
- Actual: …
## Acceptance
<observable condition proving it's fixed>
## Technical notes
- Area: <path(s)> — <root cause if known>
- Approach: <where the fix lives / how>
- Constraints & rules: <.claude/rules/*, i18n key path, gotchas>
```

**Task / Story**

```
## Product description
<what & why for the user, product terms>
## Acceptance criteria
- [ ] …
## Technical notes
- Area: <path(s)>
- Approach: <how / where>
- Constraints & out of scope: <…, rules, i18n key path>
```

Keep bodies tight — enough for an agent to act, no padding. Follow project i18n rule: any new
user-facing copy the ticket implies should note the locale key path (`src/locales/en-us.json`).

## Assignee heuristic (suggest, user overrides)

**Only ever suggest a model — `Fable`, `Opus`, or `Sonnet`. Never suggest `Me`.** `Me` is the
user's own signal ("I'll drive this myself"), not a value grooming proposes; always suggest the
model best suited to the work — including for `Ready`/pair-lane tickets — and let the user switch it
to `Me` if they want to. This holds for every ticket, in every lane.

- **`Opus`** — architectural, cross-cutting, ambiguous, or security/backend-sensitive work.
- **`Sonnet`** — well-scoped feature/bug work with a clear spec.
- **`Fable`** — mechanical/localized changes (copy, single-component tweaks, icon swaps).

(For context only, never suggested: a **`Me`** ticket is the user's opt-out — never picked by
`/work batch`, and skipped by grooming's own Backlog query.)

## Guardrails

- Only ever touch the Task Board data source above — never any backup/duplicate database.
- Never change `Status` to an `In Progress`/`Review`/`Done` value here — grooming lands tickets
  in `Ready`/`Queued`/`Needs More Info`/`Duplicate` only.
- Priority/Type are the user's inputs: propose changes, never apply them unasked.
- If unsure whether to merge/create, ask — don't guess destructive board edits.
