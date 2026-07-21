---
name: work
description: Execute groomed Notion Task Board tickets. Two modes. `/work pair [ID]` works one Ready ticket interactively in this session — backend teaching on, you approve every change, tests left untouched — then opens a PR. `/work batch [--count N] [--p0…]` pulls up to N Queued tickets assigned to a model (Fable/Opus/Sonnet) and works them in parallel — one worktree-isolated subagent per ticket, each pinned to that ticket's model, each writing its own tests. Subagents report back to this session (the orchestrator), which organizes the branches into non-conflicting, CI-passing PRs. Both claim the ticket to In Progress first and stop at an open PR (Review) — never merge. Trigger on `/work`, "work the board", "work a ticket".
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, Agent, Skill, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page
argument-hint: 'pair [<ID>] | batch [--count N] [--p0|--p1|--p2|--p3]'
arguments:
  - name: pair
    description: Interactive mode — work one Ready ticket with you in this session. Optional ID; else top Priority→ID.
  - name: batch
    description: Autonomous mode — work Queued tickets assigned to a model, sequentially, each ending in a PR.
  - name: --count N
    description: batch only — how many tickets to work in parallel this run, one worktree-isolated subagent each (default 1).
  - name: --p0|--p1|--p2|--p3
    description: batch only — restrict to this priority.
  - name: <ID>
    description: pair only — the specific ticket to work.
lastUpdated: 2026-07-21T00:00:00Z
---

## What this skill does

Pulls a groomed ticket off the board, does the work, and lands it at an **open PR** for your
review. It never merges and never marks a ticket `Done` — you close the loop.

Two modes, chosen by the first arg. They differ deliberately:

|                 | `pair`                           | `batch`                               |
| --------------- | -------------------------------- | ------------------------------------- |
| Source lane     | `Status = Ready`                 | `Status = Queued`                     |
| Model           | **this session's** model         | each ticket's **`Assignee`** model    |
| Execution       | interactive, in-session          | parallel subagents, one worktree each |
| Backend persona | **on** (teaching)                | **off**                               |
| Your approval   | **every change**                 | none — you review the PR              |
| Tests           | **left untouched** (golden rule) | each subagent writes its own          |
| Ends at         | open PR → `Review`               | open PR → `Review`                    |

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

Autonomous. **Parallel** — up to `N` tickets are worked at once, each by its own subagent in its
own git worktree. This session is the **orchestrator**: it claims the tickets, fans out the
subagents, then organizes the branches they hand back into clean, passing PRs. The orchestrator
never edits ticket code itself.

1. **SELECT**

   ```sql
   SELECT "userDefined:ID" AS id, "Name", "Priority", "Assignee", url
   FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
   WHERE "Status" = 'Queued' AND "Assignee" IN ('Fable','Opus','Sonnet')
   ORDER BY "Priority" ASC, "userDefined:ID" ASC
   ```

   `--pN` adds a priority filter; `--count N` sets **how many tickets to work in parallel** (default
   1). Take the top `N` rows. Tickets with `Assignee = Me` are skipped by the query — never batch
   them. Echo the plan (ID · priority · assignee) before starting.

2. **CLAIM ALL** — for each selected ticket, re-check it's still `Queued` and set `Status = In
Progress`. Drop any that another run already grabbed. Claim before dispatching so parallel runs
   don't collide.

3. **FAN OUT — one subagent per ticket, in parallel.** Dispatch all subagents in a single message
   (multiple `Agent` calls) so they run concurrently. Each `Agent`:
   - `agentType: general-purpose`, `isolation: worktree` (its own worktree — they edit files in
     parallel and must not collide), `model:` = the ticket's `Assignee` lowercased →
     `fable`/`opus`/`sonnet`.
   - Prompt carries the ticket's title + body + acceptance criteria and instructs the subagent to:
     branch off `master` with a conventional name, implement to the acceptance criteria, follow
     `.claude/rules/*`, **write its own tests** — new coverage for what it added and fixes for any
     tests its change broke (it does **not** invoke `update-tests`), and run the gate
     (`vp check` + `vp test`) green in its worktree.
   - **No backend teaching persona** in batch.
   - It **reports back** to the orchestrator: branch name, a summary of what changed, the file
     paths it touched, and gate status (pass/fail + any unresolved failure).

4. **ORCHESTRATE PRs** — once subagents report, turn their branches into PRs. One PR per ticket:
   a. **GATE CHECK** — if a subagent reported a failing/unfinished gate, don't open its PR; treat
   the ticket as stuck (step 5).
   b. **CONFLICT CHECK** — for each finished branch, verify it merges cleanly into current
   `master` (`git merge-tree` / dry-run merge). Then test-merge **every pair** of finished batch
   branches against each other to catch cross-PR conflicts (two subagents touching the same code).
   c. **RESOLVE** — a branch that's clean vs master and vs its peers gets a PR **based off
   `master`**. When two branches conflict but the overlap is mechanical, **stack** the dependent
   PR on the other (base its branch on the peer's branch) so it merges cleanly. When a conflict
   needs **genuine human judgment** (semantic overlap, incompatible approaches), do **not** guess:
   **raise it** in the final report and set that ticket's `Status = Blocked`.
   d. **OPEN** — for each non-blocked ticket, invoke the **`prepare-pr`** skill with `--ticket
<ID>` (the Notion ID) → one PR titled `TARO-<ID>: …`. Pass the stack base when the PR is
   stacked. `prepare-pr` watches CI; **a PR isn't done until it's green.** If CI fails, hand the
   failure back to that ticket's subagent (re-dispatch with the failure) to fix in its worktree;
   if it still can't pass after real effort, treat the ticket as stuck.
   e. **HANDOFF** — for each opened, green PR: set `Status = Review`, write the PR URL into the
   ticket body.

5. **STUCK / BLOCKED** — a ticket is stuck when its subagent can't satisfy acceptance, its gate or
   CI won't pass after real effort, or a conflict needs human resolution. Set `Status = Blocked`,
   write a one-line reason + what's needed into the body, and leave its branch/worktree in place
   for the human. Never silently fail or leave a ticket stranded in `In Progress`.

6. **REPORT** — tally: worked → `Review` (with PR links, noting any stacked pairs), `Blocked`
   (with reasons + which need human conflict resolution), skipped.

## Guardrails

- Only ever touch the Task Board data source above — never a backup/duplicate database.
- **Always stop at an open PR.** Never merge, never set `Done`. That's the user's call in `Review`.
- Claim before coding; re-check the lane to avoid double-work.
- Batch never runs the backend teaching persona and never works a `Me` ticket. Pair never touches
  tests. These are the mode contracts — don't cross them.
- One PR per ticket (via `prepare-pr`). Don't batch multiple tickets into a single PR.
- In batch, the orchestrator (this session) never edits ticket code — subagents do, each in its
  own worktree. Batch subagents write their own tests; batch does **not** invoke `update-tests`.
- Every batch PR must merge cleanly (vs `master` and vs the other batch PRs) and be CI-green before
  handoff. A conflict needing human judgment → raise it + `Blocked`; never guess a resolution.
