---
name: triage
description: First pass over raw Notion Task Board tickets. Pulls a batch off Backlog, rewrites each title + description so the groomer can pick it up cold, fills Epic and Type when unset (Priority too if missing), and moves each to Needs More Info for /groom to settle. Batched (default 10, --N to change). Does not spec, resolve decisions, or write acceptance criteria — that is /groom. Trigger on `/triage`, "triage the backlog", "triage tickets".
allowed-tools: Read, Grep, Glob, Bash, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page
argument-hint: '[--N]'
arguments:
  - name: --N
    description: Batch size (default 10). e.g. `--20`.
lastUpdated: 2026-08-01T20:00:00Z
---

Triage is the **first** of two grooming passes. It clarifies and files — it does **not** resolve
design decisions, write acceptance criteria, or investigate implementation. That is `/groom`'s job.
Every triaged ticket lands in **`Needs More Info`**.

The Backlog it pulls from is normally already classified and priority-sorted by
[`/backlog`](../backlog/SKILL.md), the portfolio pass that runs before triage — so the
Priority → ID fetch below surfaces the most important tickets first. Triage no longer owns the
classification fields; it only fills **stragglers** a `/backlog` sweep hasn't reached yet (see step 4).

The board **schema** (data sources, field option lists) lives in
[`task-board-schema.md`](../../rules/task-board-schema.md); **body sections** and **voice** live in
[`ticket-authoring.md`](../../rules/ticket-authoring.md). Read both before writing anything.

## Steps

1. **Fetch** the Backlog batch, ordered Priority → ID, capped at `--N` (default 10):

   ```sql
   SELECT "userDefined:ID" AS id, "Name", "Type", "Priority", "Target", "Epic", url
   FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
   WHERE "Status" = 'Backlog'
     AND ("Assignee" IS NULL OR "Assignee" <> 'Me')   -- Me = hands off
   ORDER BY CASE "Target"                              -- quarter first: MVP / current quarter lead
              WHEN 'MVP'     THEN 0
              WHEN 'Q3 ''26' THEN 1
              WHEN 'Q4 ''26' THEN 2
              WHEN 'Q1 ''27' THEN 3
              ELSE 9                                   -- unset Target sorts last → propose one
            END ASC,
            CASE "Priority"                            -- then urgency — rank, NOT the raw glyph string
              WHEN '⇞P0' THEN 0
              WHEN '↑P1' THEN 1
              WHEN '↓P2' THEN 2
              WHEN '⇟P3' THEN 3
              ELSE 4                                   -- unset Priority sorts last → propose one
            END ASC,
            "userDefined:ID" ASC
   ```

   The `Target` `CASE` lists the **live quarter options** — refresh it from
   [`task-board-schema.md`](../../rules/task-board-schema.md) when the roadmap rolls forward and a new
   quarter is added.

   **`Target` leads, then `Priority`** — an `MVP` ticket outranks a later-quarter one whatever their
   priorities, and inside a quarter urgency breaks the tie. **Never `ORDER BY` either field directly.**
   The priority arrows sort by codepoint, not urgency — `↑`(P1, U+2191) `↓`(P2, U+2193) `⇞`(P0, U+21DE)
   `⇟`(P3, U+21DF) — so a raw string sort buries every `P0` below `P1`/`P2`, and a null leaps to the
   top; `Target`'s quarter options aren't ordered alphabetically either. Rank both with the `CASE`s
   above.

2. **Read** each ticket's page body via `notion-fetch` — the query returns properties only, and the
   user often writes real context into the raw ticket. Carry it through; don't re-derive from the name.

3. **Clarify.** Rewrite the title and description so the groomer can pick the ticket up cold — clear
   product intent, plain language, no fluff. Peek at code only if the raw ticket is too cryptic to
   clarify from its text. Don't spec it, don't add acceptance criteria — leave the design for `/groom`.

4. **Fields (straggler fallback only).** `Type`, `Epic`, `Target`, and `Priority` are
   [`/backlog`](../backlog/SKILL.md)'s to own — normally they're already set when a ticket reaches
   triage. Fill them here **only when a ticket slipped in after the last `/backlog` sweep and one is
   still unset**, and even then don't invent a Priority in isolation — a lone straggler can't be
   distributed against the board, so leave `Priority` empty and let the next sweep place it unless the
   user dictates one. Propose values — never apply unasked. If no epic fits, propose a new one
   (→[K:ticket-new-epic-proposal]) rather than force-fitting.

5. **Checkpoint.** One summary for the whole batch. Per ticket, in product terms: new title, one-line
   intent, proposed fields. Stop for approval.

6. **Write** approved changes via `notion-update-page` — title, body, any proposed fields, and
   `Status = Needs More Info`. Sequential; if a write fails, report which and stop rather than
   half-applying.

## Self-heal

Run every pushback through [`self-heal.md`](../../rules/self-heal.md). Routing specific to this
skill: a **process** miss (how this pass runs) → this skill; a **"what a ticket looks like"** miss →
the single source, [`ticket-authoring.md`](../../rules/ticket-authoring.md).

## Guardrails

- Only ever touch the Task Board named in the rule — never a backup or duplicate.
- Every ticket ends in `Needs More Info`. Never route to `Ready`/`On Hold` or set
  `In Progress`/`Review`/`Done`.
- Propose `Epic`/`Type`/`Priority`/`Target`, never apply unasked.
- Don't touch tests. Don't write code — this skill reads Notion (and lightly, code) and writes
  Notion. A lesson about this skill is dispatched, not written here; see § Self-heal.
