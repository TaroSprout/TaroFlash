---
name: triage
description: First pass over raw Notion Task Board tickets. Pulls a batch off Backlog, rewrites each title + description so the groomer can pick it up cold, fills Epic and Type when unset (Priority too if missing), and moves each to Needs More Info for /groom to settle. Batched (default 10, --N to change). Does not spec, resolve decisions, or write acceptance criteria — that is /groom. Trigger on `/triage`, "triage the backlog", "triage tickets".
allowed-tools: Read, Grep, Glob, Bash, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page
argument-hint: '[--N]'
arguments:
  - name: --N
    description: Batch size (default 10). e.g. `--20`.
lastUpdated: 2026-08-01T12:00:00Z
---

Triage is the **first** of two grooming passes. It clarifies and files — it does **not** resolve
design decisions, write acceptance criteria, or investigate implementation. That is `/groom`'s job.
Every triaged ticket lands in **`Needs More Info`**.

Board data source, field option lists, body sections, and voice all live in
[`ticket-authoring.md`](../../rules/ticket-authoring.md). Read it before writing anything.

## Steps

1. **Fetch** the Backlog batch, ordered Priority → ID, capped at `--N` (default 10):

   ```sql
   SELECT "userDefined:ID" AS id, "Name", "Type", "Priority", "Epic", url
   FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
   WHERE "Status" = 'Backlog'
     AND ("Assignee" IS NULL OR "Assignee" <> 'Me')   -- Me = hands off
   ORDER BY "Priority" ASC, "userDefined:ID" ASC
   ```

2. **Read** each ticket's page body via `notion-fetch` — the query returns properties only, and the
   user often writes real context into the raw ticket. Carry it through; don't re-derive from the name.

3. **Clarify.** Rewrite the title and description so the groomer can pick the ticket up cold — clear
   product intent, plain language, no fluff. Peek at code only if the raw ticket is too cryptic to
   clarify from its text. Don't spec it, don't add acceptance criteria — leave the design for `/groom`.

4. **Fields.** Fill `Epic` and `Type` **only when unset**; `Priority` **only when missing** (the user
   usually sets it at creation). Propose values — never apply unasked. If no epic fits, propose a new
   one per [`ticket-authoring.md` § Epics](../../rules/ticket-authoring.md) rather than force-fitting.

5. **Checkpoint.** One summary for the whole batch. Per ticket, in product terms: new title, one-line
   intent, proposed fields. Stop for approval.

6. **Write** approved changes via `notion-update-page` — title, body, any proposed fields, and
   `Status = Needs More Info`. Sequential; if a write fails, report which and stop rather than
   half-applying.

## Guardrails

- Only ever touch the Task Board named in the rule — never a backup or duplicate.
- Every ticket ends in `Needs More Info`. Never route to `Ready`/`Queued`/`On Hold` or set
  `In Progress`/`Review`/`Done`.
- Propose `Epic`/`Type`/`Priority`, never apply unasked.
- Don't touch tests. Don't write code. This skill reads Notion (and lightly, code) and writes Notion.
