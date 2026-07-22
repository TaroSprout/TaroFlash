---
name: work
description: Execute groomed Notion Task Board tickets. Two modes. `/work pair [ID]` works one Ready ticket interactively in this session — backend teaching on, you approve every change, tests written as part of the work — then opens a PR. `/work batch [--count N] [--p0…]` pulls up to N Queued tickets assigned to a model (Fable/Opus/Sonnet) and works them in parallel — one worktree-isolated subagent per ticket, each pinned to that ticket's model, each writing its own tests and cleaning up its worktree when done. Subagents report back to this session (the orchestrator), which organizes the branches into non-conflicting, CI-passing PRs. Both claim the ticket to In Progress first, open a PR (Review), then iterate on your review feedback via a main-workspace subagent that checks out the PR branch — never merge. The golden "no tests" rule is suspended inside `/work` — tests are always in scope. Trigger on `/work`, "work the board", "work a ticket".
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, Agent, Skill, EnterWorktree, ExitWorktree, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page
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
lastUpdated: 2026-07-21T16:00:00Z
---

## What this skill does

Pulls a groomed ticket off the board, does the work, and lands it at an **open PR** for your
review. It never merges and never marks a ticket `Done` — you close the loop.

Two modes, chosen by the first arg. They differ deliberately:

|                 | `pair`                             | `batch`                               |
| --------------- | ---------------------------------- | ------------------------------------- |
| Source lane     | `Status = Ready`                   | `Status = Queued`                     |
| Model           | **this session's** model           | each ticket's **`Assignee`** model    |
| Execution       | interactive, in-session            | parallel subagents, one worktree each |
| Backend persona | **on** (teaching)                  | **off**                               |
| Your approval   | **every change**                   | none — you review the PR              |
| Tests           | **written as part of the work**    | each subagent writes its own          |
| Ends at         | open PR → `Review` + feedback loop | open PR → `Review` + feedback loop    |

**Tests are always in scope inside `/work`.** The CLAUDE.md golden "never touch tests" rule is
**suspended** for the entire lifetime of this skill — both modes, initial implementation and every
follow-up fix. Each agent (the pair session, each batch subagent, each feedback-fix subagent)
writes its own coverage for what it changed and repairs any test its change broke. Agents do **not**
invoke the `update-tests` skill — they write tests inline as part of the work.

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
   functions), the backend teaching persona is **on** — teach as you write per CLAUDE.md. **Write
   and update tests as part of the work** — the golden "no tests" rule is suspended inside `/work`
   (see the callout above). Follow all `.claude/rules/*`.
5. **PR** — invoke the **`prepare-pr`** skill with `--ticket <ID> --ticket-url <url>` (the ticket's
   `TARO-<ID>` number and its Notion page URL) so the PR title is prefixed `TARO-<ID>:` and the body
   opens with a `[TARO-<ID>](<url>)` link (commits, conventional messages, lint+type gate, opens one
   PR, watches CI to green).
6. **HANDOFF** — set the ticket's `Status = Review` and write the PR URL into its body. Then enter
   the **Review & feedback loop** (below) and wait for the user's feedback.

## Mode: `batch [--count N] [--p0…]`

Autonomous. **Parallel** — up to `N` tickets are worked at once, each by its own subagent in its
own git worktree. This session is the **orchestrator**: it claims the tickets, fans out the
subagents, then organizes the branches they hand back into clean, passing PRs. The orchestrator
never edits ticket code itself.

0. **ORCHESTRATOR WORKTREE — always.** Before anything else, the orchestrator moves into its **own**
   worktree (`EnterWorktree`, e.g. `batch-orchestrator`) and runs the entire batch from there —
   claims, conflict checks, PR orchestration, teardown, and the feedback loop. This keeps the
   shared/main checkout free for the user to work in during the run. **Any side request the user
   makes mid-run that is outside the ticket scope** (e.g. a tweak to this skill, tooling, or docs) is
   also done on the orchestrator worktree — create branches and commit freely there; it's yours. The
   only work that leaves the orchestrator worktree is a **feedback-loop fix**, which must land on the
   main checkout so the user's dev server sees it (see that section for the coordination it needs).

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
     **rename** the worktree's existing branch to a conventional name (`git branch -m <fix/…|feat/…>`)
     — **not** `git checkout -b`, which orphans the auto-created `worktree-agent-<id>` branch as junk —
     implement to the acceptance criteria, follow `.claude/rules/*`, **write its own tests** — new
     coverage for what it added and fixes for any tests its change broke (it does **not** invoke
     `update-tests`), and run the gate (`vp check` + `vp test`) green in its worktree.
   - **Confine every action to its own worktree — never touch the shared checkout.** The prompt must
     give the subagent its worktree's **absolute path** and tell it to: run `pwd` first and confirm
     it is inside `.claude/worktrees/agent-<id>`; do **all** reads, writes, `cd`s, and git commands
     there; and build **every file path from that worktree root** — never a bare `/…/TaroFlash/src/…`
     or any path outside its worktree, which is the shared/main checkout a human may be editing live.
     If it ever notices a change landed on the shared checkout, it must **stop and report it — never
     `git checkout` / `git restore` / revert the file**, since a blind revert-to-HEAD can wipe the
     human's uncommitted work.
   - **Confine every action to its own worktree — never touch the shared checkout.** The prompt must
     tell the subagent: run `pwd` first and confirm it's inside `.claude/worktrees/agent-<id>`; do
     **all** reads, writes, `cd`s, and git commands there; and make **every edited path resolve under
     that worktree root**. It must **never** edit a bare `/…/TaroFlash/src/…` (or any path outside its
     worktree) — that is the shared/main checkout a human may be editing live. Pass the subagent its
     worktree's absolute path and tell it to build file paths from that, not from the repo root. If it
     ever notices a change landed on the shared checkout, it must **stop and report it — never
     `git checkout`/`git restore`/revert the file**, since a blind revert-to-HEAD can wipe the human's
     uncommitted work.
   - **No backend teaching persona** in batch.
   - It **reports back** to the orchestrator: branch name, a summary of what changed, the file
     paths it touched, and gate status (pass/fail + any unresolved failure).
   - **Clean up when done.** After it has pushed/handed back its branch and reported, the subagent
     removes its own worktree (`git worktree remove`) so no orphaned worktrees pile up. Exception:
     a **stuck/blocked** ticket leaves its worktree in place for human inspection (step 5).

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
<ID> --ticket-url <url>` (the `TARO-<ID>` number and the ticket's Notion page URL) → one PR titled
   `TARO-<ID>: …` whose body opens with a `[TARO-<ID>](<url>)` link. Pass the stack base when the PR
   is stacked. `prepare-pr` watches CI; **a PR isn't done until it's green.** If CI fails, route it
   through the **Review & feedback loop** (below) — a main-workspace fix subagent on the PR branch;
   if it still can't pass after real effort, treat the ticket as stuck.
   e. **HANDOFF** — for each opened, green PR: set `Status = Review`, write the PR URL into the
   ticket body.
   f. **TEAR DOWN** — once a ticket is handed off (PR open + green, branch pushed to origin),
   **remove its worktree**: `git worktree remove <path>`. The branch lives on origin and its local
   ref survives worktree removal, so the human can `git checkout <branch>` in the **main** working
   copy to review it against their local dev server — which a worktree checkout can't feed. Then
   delete any leftover `worktree-agent-<id>` placeholder branch (`git branch -D`) if a subagent left
   one behind. Only tear down **successful** tickets here; blocked ones keep their worktree (step 5).

5. **STUCK / BLOCKED** — a ticket is stuck when its subagent can't satisfy acceptance, its gate or
   CI won't pass after real effort, or a conflict needs human resolution. Set `Status = Blocked`,
   write a one-line reason + what's needed into the body, and leave its branch/worktree in place
   for the human. Never silently fail or leave a ticket stranded in `In Progress`.

6. **REPORT** — tally: worked → `Review` (with PR links, noting any stacked pairs), `Blocked`
   (with reasons + which need human conflict resolution), skipped. Then enter the **Review &
   feedback loop** below.

## Review & feedback loop (both modes)

Opening the PRs is not the end of the run — it's the handoff into review. After PRs are open the run
**stays live and waits for the user's feedback**. The user reviews the PRs themselves and will
usually come back **one PR at a time**, leaving comments on that PR.

Every follow-up change — whether it's user review feedback, a red CI run, or any other fix the PR
needs — is handled the same way:

1. **Dispatch a fix subagent on the MAIN workspace** (not a worktree). It **checks out the PR
   branch** in the main checkout. The user keeps a dev server running against the main workspace and
   verifies each fix **live**, so the fix must land on the branch they're looking at. Model: the
   ticket's `Assignee` in batch, this session's model in pair. Work one PR at a time (the user goes
   in order), so only one fix subagent touches the main checkout at once.
2. **Fix + a fresh test pass, together.** The subagent makes the code change **and** does a new test
   pass alongside it — new coverage for the new behaviour plus repairs to any test the change breaks.
   A fix is never code-only; tests ride with it every time. (Golden "no tests" rule stays suspended.)
3. **Gate, push, watch green.** Run `vp check` + `vp test`, push to the PR branch, and watch CI to
   green (via `prepare-pr` or directly). A PR isn't done until it's green again.
4. **Answer the thread.** Reply to the feedback on the PR prefixed `🤖 Claude:` so the user can tell
   your replies from their own. Leave the ticket in `Review`.

Repeat per PR until the user merges. **Never merge and never set `Done` yourself** — that stays the
user's call, exactly as at first handoff.

## Guardrails

- Only ever touch the Task Board data source above — never a backup/duplicate database.
- **Never merge, never set `Done`.** Opening the PR is a handoff into `Review`, not the end — the
  run stays live through the feedback loop until the user merges. Merging is always the user's call.
- Claim before coding; re-check the lane to avoid double-work.
- Batch never runs the backend teaching persona and never works a `Me` ticket. These are mode
  contracts — don't cross them.
- **Tests are always in scope** — the golden "no tests" rule is suspended for this whole skill,
  both modes, implementation and every fix. Each agent writes/repairs its own tests inline; nobody
  invokes the `update-tests` skill.
- One PR per ticket (via `prepare-pr`). Don't batch multiple tickets into a single PR.
- In batch, the orchestrator runs from its **own worktree** (step 0) and never edits ticket code —
  subagents do. Out-of-scope side requests during the run are done on that orchestrator worktree.
  Initial ticket implementation happens in per-ticket **worktrees**, which the subagent **removes
  when done** (except a stuck ticket, whose worktree is left for inspection). Post-open **fixes
  happen on the main workspace** on the checked-out PR branch, one PR at a time, so the user's live
  dev server reflects them.
- **Subagents stay inside their own worktree.** Each works only under its `.claude/worktrees/agent-<id>`
  path — never edits the shared/main checkout, and never reverts a shared-checkout file (that can
  destroy the user's uncommitted work); it stops and reports instead.
- Every batch PR must merge cleanly (vs `master` and vs the other batch PRs) and be CI-green before
  handoff. A conflict needing human judgment → raise it + `Blocked`; never guess a resolution.
- Successful batch tickets leave **no worktree and no `worktree-agent-*` branch** behind — subagents
  rename their worktree branch (never `checkout -b`), and the orchestrator removes each worktree after
  handoff. Only blocked tickets keep their worktree.
