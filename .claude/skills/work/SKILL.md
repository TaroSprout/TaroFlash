---
name: work
description: Execute groomed Notion Task Board tickets. Two modes. `/work pair [ID]` works one Ready ticket interactively in this session — backend teaching on, you approve every change, tests left untouched — then opens a PR. `/work batch [--count N] [--p0…]` pulls Queued tickets assigned to a model (Fable/Opus/Sonnet), works each sequentially via a subagent pinned to that model, runs the update-tests skill, and opens a PR via prepare-pr. Both claim the ticket to In Progress first and stop at an open PR (Review) — never merge. Trigger on `/work`, "work the board", "work a ticket".
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, Agent, Skill, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page
argument-hint: 'pair [<ID>] | batch [--count N] [--p0|--p1|--p2|--p3]'
arguments:
  - name: pair
    description: Interactive mode — work one Ready ticket with you in this session. Optional ID; else top Priority→ID.
  - name: batch
    description: Autonomous mode — work Queued tickets assigned to a model, sequentially, each ending in a PR.
  - name: --count N
    description: batch only — max tickets to work this run (default 1).
  - name: --p0|--p1|--p2|--p3
    description: batch only — restrict to this priority.
  - name: <ID>
    description: pair only — the specific ticket to work.
lastUpdated: 2026-07-20T00:00:00Z
---

## What this skill does

Pulls a groomed ticket off the board, does the work, and lands it at an **open PR** for your
review. It never merges and never marks a ticket `Done` — you close the loop.

Two modes, chosen by the first arg. They differ deliberately:

|                 | `pair`                           | `batch`                            |
| --------------- | -------------------------------- | ---------------------------------- |
| Source lane     | `Status = Ready`                 | `Status = Queued`                  |
| Model           | **this session's** model         | each ticket's **`Assignee`** model |
| Execution       | interactive, in-session          | sequential subagent per ticket     |
| Backend persona | **on** (teaching)                | **off**                            |
| Your approval   | **every change**                 | none — you review the PR           |
| Tests           | **left untouched** (golden rule) | **`update-tests` skill runs**      |
| Ends at         | open PR → `Review`               | open PR → `Review`                 |

## Board constants

- **Task Board** data source: `collection://3630953c-224c-8065-8864-000bb9fe7bad`
- `Status` lanes this skill uses: pulls from `Ready`/`Queued`; claims to `In Progress`; lands at
  `Review`; parks stuck work at `Blocked`. Never sets `Done`/`Duplicate`.
- `Assignee`: `Me` · `Fable` · `Opus` · `Sonnet`. `Me` is **never** batch-eligible.

## Claim protocol (both modes, per ticket)

Before touching any code, **claim atomically**: `notion-update-page` set `Status = In Progress`.
Re-query first — if the ticket is no longer in its source lane (someone/another run grabbed it),
skip it. This is what stops two runs colliding on the same ticket.

---

## Mode: `pair [ID]`

Interactive, in **this** session, using **whatever model the session is running** (ignore the
ticket's `Assignee`).

1. **SELECT** — `Status = Ready`. If an ID is given, take it; else the top `Priority → ID`.
   Fetch its full page (title + body). Echo what you're about to work.
2. **CLAIM** → `In Progress`.
3. **BRANCH** — conventional branch off `master` matching the ticket (`fix/…`, `feat/…`).
4. **IMPLEMENT — together.** Work through the acceptance criteria in small steps. **Pause for
   approval on every change.** If the `Area` touches `supabase/**` (migrations, RPCs, RLS, edge
   functions), the backend teaching persona is **on** — teach as you write per CLAUDE.md. **Do
   not touch tests** — the golden rule holds in pair mode. Follow all `.claude/rules/*`.
5. **PR** — invoke the **`prepare-pr`** skill with `--ticket <ID>` (the ticket's Notion ID)
   so the PR title is prefixed `TARO-<ID>:` (commits, conventional messages, lint+type gate,
   opens one PR, watches CI to green).
6. **HANDOFF** — set the ticket's `Status = Review` and write the PR URL into its body. Stop.

## Mode: `batch [--count N] [--p0…]`

Autonomous. Sequential (one ticket fully done before the next — no parallel worktrees for now).

1. **SELECT**

   ```sql
   SELECT "userDefined:ID" AS id, "Name", "Priority", "Assignee", url
   FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
   WHERE "Status" = 'Queued' AND "Assignee" IN ('Fable','Opus','Sonnet')
   ORDER BY "Priority" ASC, "userDefined:ID" ASC
   ```

   `--pN` adds a priority filter; `--count N` caps (default 1). Tickets with `Assignee = Me` are
   skipped by the query — never batch them. Echo the plan (ID · priority · assignee) before starting.

2. **Per ticket, sequentially:**
   a. **CLAIM** → `In Progress` (re-check it's still `Queued` first; skip if not).
   b. **IMPLEMENT via a model-pinned subagent.** Dispatch one `Agent` (`agentType: general-purpose`,
   `model:` = the ticket's `Assignee` lowercased → `fable`/`opus`/`sonnet`) with the ticket's
   title + body + acceptance criteria. The subagent: branches off `master`, implements to the
   acceptance criteria, follows `.claude/rules/*`. **No backend teaching persona** in batch.
   It reports back what it changed + the branch name.
   c. **TESTS** — invoke the **`update-tests`** skill for the changes (this is the explicit ask
   that overrides the golden rule — batch mode owns its tests).
   d. **PR** — invoke the **`prepare-pr`** skill with `--ticket <ID>` (the ticket's Notion ID)
   → one PR titled `TARO-<ID>: …`, CI watched to green.
   e. **HANDOFF** — set `Status = Review`, write the PR URL into the ticket body.
   f. **If stuck** — subagent can't satisfy acceptance, the gate won't pass after real effort, or
   a blocking unknown surfaces: set `Status = Blocked`, write a one-line reason + what's needed
   into the body, and move to the next ticket. Don't silently fail or leave it `In Progress`.

3. **REPORT** — tally: worked → `Review` (with PR links), `Blocked` (with reasons), skipped.

## Guardrails

- Only ever touch the Task Board data source above — never a backup/duplicate database.
- **Always stop at an open PR.** Never merge, never set `Done`. That's the user's call in `Review`.
- Claim before coding; re-check the lane to avoid double-work.
- Batch never runs the backend teaching persona and never works a `Me` ticket. Pair never touches
  tests. These are the mode contracts — don't cross them.
- One PR per ticket (via `prepare-pr`). Don't batch multiple tickets into a single PR.
