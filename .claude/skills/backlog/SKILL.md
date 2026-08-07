---
name: backlog
description: Portfolio pass over the whole Notion Task Board Backlog, before /triage. Sees every raw ticket at once and assigns the comparative classification fields — Type, Epic, Priority (a board-wide urgency call), then Target (which quarter, theme-grouped by epic with priority driving cross-quarter overflow). Does not rewrite bodies, resolve design, or change Status — tickets stay in Backlog, now sorted, for /triage to pull the most important first. Trigger on `/backlog`, "prioritize the backlog", "organize the board".
allowed-tools: Read, Grep, Glob, Bash, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page
argument-hint: '[--full] [--epic <name>]'
arguments:
  - name: --full
    description: Re-read and re-classify every ticket from scratch, not just the unclassified ones. Use periodically when priorities have drifted and you want a from-scratch re-rank. Default is incremental — trust existing fields, only new tickets cost body reads.
  - name: --epic <name>
    description: Scope the sweep to one epic's Backlog tickets instead of the whole board. The epic still gets a home quarter and its tickets overflow across quarters by priority within that scope.
lastUpdated: 2026-08-05T00:00:00Z
---

`/backlog` is the **portfolio pass** — it runs **before** `/triage`. Prioritization is comparative:
you can't rank a ticket without seeing the others, so this pass takes the **whole Backlog at once**
and assigns the four classification fields — **Type, Epic, Priority, Target**. It does **not** rewrite
titles or bodies, resolve any design decision, write acceptance criteria, or change `Status`. Tickets
stay in **`Backlog`**, now fully classified and sorted, so `/triage` always pulls the most important
ones first.

The board **schema** (data sources, field option lists — including the live `Target` quarters) lives
in [`task-board-schema.md`](../../rules/task-board-schema.md); **authoring** shape and the
Priority/Target doctrine live in [`ticket-authoring.md`](../../rules/ticket-authoring.md). Read both
before writing — this skill **owns** the classification fields those rules attribute to it.

## Assign in order: Type → Epic → Priority → Target

`Target` is now **theme-grouped and priority-aware** (below), so it needs each ticket's `Priority`
already set to decide cross-quarter overflow. Set Priority before Target.

**Incremental by default — the board is the cache.** Every classification this pass makes is persisted
as the ticket's own fields, so a re-run reads them back for free and trusts them. Only tickets that
are still **unclassified** (missing a field, i.e. added since the last sweep) get their bodies read
and their fields set from scratch. The **placement**, though, is always re-judged over the _whole_
Backlog — a new high-priority ticket can shift an epic's home quarter, or push an epic's tail into the
next one — but that's cheap reasoning over field values already in hand, not more body reads. First
run: everything is unclassified, so it reads the whole board once. Every run after: only the new
tickets cost anything.

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
   codepoint not urgency anyway (see [`task-board-schema.md`](../../rules/task-board-schema.md)). Order
   by `ID` and rank in judgment.

2. **Read bodies — unclassified tickets only** (or all, under `--full`). A ticket that already
   carries its fields is trusted; skip its body entirely. For the rest, `notion-fetch` anything too
   cryptic to classify from its name. Read to **understand**, never to rewrite — clarification is
   `/triage`'s job. Peek at code only when a ticket is so opaque you can't even pick a Type.

3. **Type** — `Bug` broken · `Task` defined change · `Story` user-facing capability · `Spike` the
   deliverable is a decision. Fill every ticket.

4. **Epic** — match the Epic Board. If nothing fits, **propose a new epic** per
   [`ticket-authoring.md` § Epics](../../rules/ticket-authoring.md) rather than force-fit — never
   create one silently. The epic is the unit `Target` groups by, so every ticket needs one.

5. **Priority — a board-wide urgency call.** `⇞P0` · `↑P1` · `↓P2` · `⇟P3`, judged comparatively
   across the **whole** active set (not per quarter). Keep it honest against P0/P1 inflation — as a
   rough board-wide shape, ~10% P0 (the true must-be-first), ~25% P1, ~40% P2, ~25% P3. This is a
   guard, not a quota to satisfy exactly; a ticket's priority also feeds its epic's overflow in
   step 6, so rank within each epic deliberately.

6. **Target — which quarter, theme-grouped.** Options are `MVP` and the rolling quarters (`Q3 '26`,
   `Q4 '26`, `Q1 '27` — read the live set from
   [`task-board-schema.md`](../../rules/task-board-schema.md)). Assign by **epic**, not per ticket:
   - **`MVP` stays `MVP`.** It's the launch-scope set; don't reband an MVP ticket unless it's clearly
     not launch-gating. The current quarter (`Q3 '26`) is mostly consumed by MVP — keep it **lean**,
     pulling in only a few genuinely high-value or already-in-flight (`Ready`/`Groomed`/`In Progress`)
     tickets alongside it.
   - **Give each epic a home quarter** by its strategic weight: launch-adjacent epics land in the
     current/next quarter, secondary or deferred epics in the furthest planned one. An epic's tickets
     **stay together** in that quarter…
   - **…except priority-driven overflow.** Within an epic, `P0`/`P1` sit in the home quarter and
     `P2`/`P3` spill to the next — so a big epic splits across two quarters by urgency, but never
     scatters across all of them.
   - **On-Hold and paused work defaults to the furthest planned quarter** (it isn't scheduled).
   - Don't invent a quarter beyond the live option set. If work is further out than the furthest
     option, park it there and note that a new quarter option may be warranted — adding one is a
     schema edit (`notion-update-data-source`), the user's call.

## Checkpoint & write

7. **Checkpoint.** One table for the whole sweep, **grouped by quarter and by epic within it**, so the
   theme grouping and any cross-quarter overflow are visible at a glance:

   | Quarter | Epic | ID | Ticket | Type | Priority | Δ (old → new) |

   Show every field's before → after where it changed. Call out any epic that overflows two quarters
   and anything pulled into the current quarter. Stop for approval. If the shape looks off to the user
   — an epic in the wrong quarter, too much pulled into the current one — re-balance and re-present;
   don't write a plan they haven't seen.

8. **Write** approved fields via `notion-update-page` — `Type`, `Epic`, `Priority`, `Target` only.
   **Never** `Status`, title, or body. Sequential; if a write fails, report which and stop rather than
   half-applying. After a large `Target` migration, verify with a row-level `WHERE id IN (…)` query,
   not an aggregate count — Notion's `COUNT/GROUP BY` reads lag row writes.

## Self-heal

Run every pushback through [`self-heal.md`](../../rules/self-heal.md) — a mis-ranked ticket, an epic
in the wrong quarter, too much pulled into the current one, a Type or Epic call that's off. Routing
specific to this skill: a **process** miss (how this pass ranks, groups by quarter, or sequences the
four fields) → this skill; a **field-semantics** miss (what a `Target` quarter means, when a new epic
is warranted, the theme-grouping doctrine) → the single sources,
[`task-board-schema.md`](../../rules/task-board-schema.md) (schema) or
[`ticket-authoring.md`](../../rules/ticket-authoring.md) (doctrine).

## Guardrails

- Only ever touch the Task Board named in the schema — never a backup or duplicate.
- **Fields only, never `Status`.** Every ticket stays in `Backlog`. This is a pre-triage enrichment,
  not a stage gate.
- **Never rewrite title or body.** If a ticket is too cryptic to classify, leave its unresolvable
  fields unset and flag it at checkpoint for `/triage` to clarify — don't guess.
- Skip `Assignee = Me` and `On Hold` tickets — the user's hands-off markers.
- Propose the whole sweep at the checkpoint; apply nothing unasked.
- Don't touch tests. Don't write code — this skill reads Notion (and lightly, code) and writes Notion
  fields. Self-healing _this skill_ is the sole exception; see § Self-heal.
