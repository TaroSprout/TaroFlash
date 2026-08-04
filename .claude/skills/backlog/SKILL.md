---
name: backlog
description: Portfolio pass over the whole Notion Task Board Backlog, before /triage. Sees every raw ticket at once and assigns the comparative classification fields — Type, Epic, Target, then Priority under a forced distribution within each Target band. Does not rewrite bodies, resolve design, or change Status — tickets stay in Backlog, now sorted, for /triage to pull the most important first. Trigger on `/backlog`, "prioritize the backlog", "organize the board".
allowed-tools: Read, Grep, Glob, Bash, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page
argument-hint: '[--full] [--epic <name>]'
arguments:
  - name: --full
    description: Re-read and re-classify every ticket from scratch, not just the unclassified ones. Use periodically when priorities have drifted and you want a from-scratch re-rank. Default is incremental — trust existing fields, only new tickets cost body reads.
  - name: --epic <name>
    description: Scope the sweep to one epic's Backlog tickets instead of the whole board. Priority is still distributed per Target band within that scope.
lastUpdated: 2026-08-01T00:00:00Z
---

`/backlog` is the **portfolio pass** — it runs **before** `/triage`. Prioritization is comparative:
you can't rank a ticket without seeing the others, so this pass takes the **whole Backlog at once**
and assigns the four classification fields — **Type, Epic, Target, Priority**. It does **not** rewrite
titles or bodies, resolve any design decision, write acceptance criteria, or change `Status`. Tickets
stay in **`Backlog`**, now fully classified and sorted, so `/triage` always pulls the most important
ones first.

Board data source, field option lists, and voice all live in
[`ticket-authoring.md`](../../rules/ticket-authoring.md). Read it before writing anything — this skill
**owns** the classification fields that rule now attributes to it.

## Assign in order: Type → Epic → Target → Priority

Priority is distributed **within** each Target band, so it can't be set until Target is. Work the four
fields in that sequence.

**Incremental by default — the board is the cache.** Every classification this pass makes is persisted
as the ticket's own fields, so a re-run reads them back for free and trusts them. Only tickets that
are still **unclassified** (missing a field, i.e. added since the last sweep) get their bodies read
and their fields set from scratch. The **distribution**, though, is always re-judged over the _whole_
Backlog — a new ticket can crowd a band and nudge an existing ticket across a boundary — but that's
cheap reasoning over field values already in hand, not more body reads. First run: everything is
unclassified, so it reads the whole board once. Every run after: only the new tickets cost anything.

Pass **`--full`** to override — re-read and re-classify every ticket from scratch, trusting no
existing field. Reach for it periodically when priorities have drifted enough that the trusted
classifications are stale, not on the routine "I added a few tickets" run.

1. **Fetch** the whole Backlog (or one epic with `--epic`), properties only:

   ```sql
   SELECT "userDefined:ID" AS id, "Name", "Type", "Priority", "Target", "Epic", url
   FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
   WHERE "Status" = 'Backlog'
     AND ("Assignee" IS NULL OR "Assignee" <> 'Me')   -- Me = hands off, never touch
   ORDER BY "userDefined:ID" ASC
   ```

   No `ORDER BY` on `Priority`/`Target` here — this pass **sets** those, and their glyphs sort by
   codepoint not urgency anyway (see triage). Order by `ID` and rank in judgment.

2. **Read bodies — unclassified tickets only** (or all, under `--full`). A ticket that already
   carries its fields is trusted; skip its body entirely. For the rest, `notion-fetch` anything too
   cryptic to classify from its name. Read to **understand**, never to rewrite — clarification is
   `/triage`'s job. Peek at code only when a ticket is so opaque you can't even pick a Type.

3. **Type** — `Bug` broken · `Task` defined change · `Story` user-facing capability · `Spike` the
   deliverable is a decision. Fill every ticket.

4. **Epic** — match the Epic Board. If nothing fits, **propose a new epic** per
   [`ticket-authoring.md` § Epics](../../rules/ticket-authoring.md) rather than force-fit — never
   create one silently.

5. **Target** — `MVP` ships before launch · `Fast-follow` first post-launch cycle · `Later` genuinely
   deferred. This decides the band each ticket's Priority is distributed inside.

6. **Priority — forced distribution, per Target band.** Priority and Target are **orthogonal**
   ([two axes, don't collapse them](../../rules/ticket-authoring.md)): every band spans `P0`→`P3`, so
   MVP does **not** become all-P0 and Later all-P3. Within each band, aim for this shape:

   | Tier | Share of the band             |
   | ---- | ----------------------------- |
   | ⇞P0  | ~10% — the true must-be-first |
   | ↑P1  | ~25%                          |
   | ↓P2  | ~40%                          |
   | ⇟P3  | ~25%                          |

   **Relax below ~6 tickets:** a small band gets judgment, not a contorted quota. The distribution is
   a guard against everything-is-P1 inflation, not a spreadsheet to satisfy exactly.

## Checkpoint & write

7. **Checkpoint.** One table for the whole sweep, grouped by Target band and sorted by proposed
   Priority within it, so the distribution is visible at a glance:

   | ID | Ticket | Type | Epic | Target | Priority | Δ (old → new) |

   Show every field's before → after where it changed. Stop for approval. If a band's shape looks off
   to the user, re-balance and re-present — don't write a distribution they haven't seen.

8. **Write** approved fields via `notion-update-page` — `Type`, `Epic`, `Target`, `Priority` only.
   **Never** `Status`, title, or body. Sequential; if a write fails, report which and stop rather than
   half-applying.

## Self-heal

This skill is in the `/triage`–`/groom`–`/work` class and heals the same way. The user will push back
— a mis-ranked ticket, a band shape that's wrong for this board, a Type or Epic call that's off. Treat
it as a **defect in this skill or the rules it embodies**, not just in the sweep. Route the lesson: a
**process** miss (how this pass ranks, distributes, or sequences the four fields) → this skill; a
**"what a ticket looks like" / field-semantics** miss (what a Target means, when a new epic is
warranted, the distribution doctrine) → the single source,
[`ticket-authoring.md`](../../rules/ticket-authoring.md). Ship it per
[`self-heal.md`](../../rules/self-heal.md) — the shared living-PR mechanics, its own `self-heal`
worktree — separate from the backlog work itself.

## Guardrails

- Only ever touch the Task Board named in the rule — never a backup or duplicate.
- **Fields only, never `Status`.** Every ticket stays in `Backlog`. This is a pre-triage enrichment,
  not a stage gate.
- **Never rewrite title or body.** If a ticket is too cryptic to classify, leave its unresolvable
  fields unset and flag it at checkpoint for `/triage` to clarify — don't guess.
- Skip `Assignee = Me` and `On Hold` tickets — the user's hands-off markers.
- Propose the whole sweep at the checkpoint; apply nothing unasked.
- Don't touch tests. Don't write code — this skill reads Notion (and lightly, code) and writes Notion
  fields. Self-healing _this skill_ is the sole exception; see § Self-heal.
