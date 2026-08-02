---
name: work
description: Execute groomed Notion Task Board tickets autonomously. `/work [<ID> …]` claims each ticket to In Progress, then fans out one worktree-isolated subagent per ticket — each pinned to that ticket's `Assignee` model (Fable/Opus/Sonnet), each implementing to the acceptance criteria, running `update-tests` for its change, and cleaning up its worktree when done. With no IDs it pulls the top unblocked `Ready` tickets by priority (`--count N`, default 1). This session is the orchestrator, on its own worktree; it organizes the subagents' branches into non-conflicting PRs, watches CI to green, then stays live for your review feedback — dispatching main-workspace fix subagents per PR. It never merges and never sets Done. Trigger on `/work`, "work the board", "work a ticket".
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, Agent, Skill, EnterWorktree, ExitWorktree, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page
argument-hint: '[<ID> <ID> …] [--count N]'
arguments:
  - name: <ID>
    description: One or more numeric ticket IDs to work. Each gets its own subagent. Omit to auto-pull the top unblocked `Ready` tickets by priority.
  - name: --count N
    description: When no IDs are given, how many `Ready` tickets to pull and work in parallel (default 1). Ignored when IDs are named.
lastUpdated: 2026-08-01T20:00:00Z
---

## What this skill does

Pulls groomed, user-promoted tickets off the board, works them **autonomously in parallel**, and
lands each at an **open PR** for your review. It never merges and never marks a ticket `Done` — you
close the loop.

**One mode, always orchestrated.** This session is the **orchestrator**: it claims the tickets, fans
out one worktree-isolated subagent per ticket, then organizes the branches they hand back into clean,
CI-green PRs. The orchestrator never edits ticket code itself — subagents do. After the PRs open it
stays live for your review feedback (§ Review & feedback loop).

- **Source lane** — `Ready` (you promote `Groomed` → `Ready` yourself; that promotion is the human
  gate this skill trusts).
- **Model** — each ticket's `Assignee` (`Fable` / `Opus` / `Sonnet`), one subagent pinned to it.
- **Tests** — the golden "no tests" rule is **suspended here**: each subagent runs the `update-tests`
  skill to cover its own change. The orchestrator never authors ticket code or tests.
- **No backend teaching persona** — `/work` is autonomous, no one is in the loop to teach. Supabase
  teaching happens when you work those tickets by hand, not here.

## Board constants

- **Task Board** data source: `collection://3630953c-224c-8065-8864-000bb9fe7bad`. Full board
  constants live in [`ticket-authoring.md`](../../rules/ticket-authoring.md).
- `Status` lanes this skill uses: pulls from `Ready`; claims to `In Progress`; lands at `Review`;
  parks stuck work at `Blocked`. Never sets `Done` / `Duplicate` / `Groomed`.
- `Assignee`: `Fable` · `Opus` · `Sonnet` — the model each subagent is pinned to. **`Assignee = Me`
  and `Status = On Hold` are both hands-off** (user-owned) and never eligible.
- Status and field writes are plain `notion-update-page` property writes — no transition step.

## Blockers — a ticket is not takeable just because it's in the lane

`/groom` wires ordering between split siblings on the Task Board's **`Blocked By`** self-relation
(see [`ticket-authoring.md`](../../rules/ticket-authoring.md) § Dependencies). A ticket with an
**open blocker** is not work — its foundation hasn't landed, and working it produces a PR against
code that's about to change.

`Blocked By` holds a **JSON array of page URLs**, not statuses, so the takeability check is two
steps:

1. Select `"Blocked By"` alongside the usual properties. Rows with an empty array are unblocked —
   done, no second query needed.
2. For the rest, collect the union of their `Blocked By` urls and resolve them in **one** follow-up
   query (`WHERE url IN (…)`), then read each blocker's `Status`.

A blocker is cleared when its `Status` is in the **`complete` group** — `Done`, `Won't Do`, or
`Duplicate`. Any blocker outside that group makes the ticket **blocked**, and blocked tickets are not
takeable.

Because this skill never sets `Done` — the user merges and closes — a blocker only clears when the
user does. That's intended: it's the same gate as the merge. If a run finds every candidate blocked,
say so and stop rather than reaching further down the queue for something unrelated. Two siblings of
one split are never both takeable — the `Blocked By` relation means one waits; `/work` runs
**independent** tickets, and a chain is worked a link at a time.

## Procedure

### 0. ORCHESTRATOR WORKTREE — always

Before anything else, move into your **own** worktree (`EnterWorktree`, e.g. `work-orchestrator`) and
run the entire skill from there — claims, conflict checks, PR orchestration, teardown, the feedback
loop, and any self-heal. This keeps the shared/main checkout free for the user to work in during the
run. **Any side request the user makes mid-run that is outside ticket scope** (a tweak to this skill,
tooling, docs) is also done on the orchestrator worktree — branch and commit freely there; it's
yours. The only work that leaves it is a **feedback-loop fix**, which lands on the main checkout so
the user's dev server sees it (§ Review & feedback loop).

### 1. SELECT

```sql
SELECT "userDefined:ID" AS id, "Name", "Priority", "Assignee", "Blocked By", url
FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
WHERE "Status" = 'Ready' AND "Assignee" IN ('Sonnet', 'Opus', 'Fable')
ORDER BY "Priority" ASC, "userDefined:ID" ASC
```

When **IDs are named**, replace the `Status` filter with `"userDefined:ID" IN (…)` and work exactly
those (warn, don't silently skip, if one isn't in `Ready` or is `Assignee = Me`). With **no IDs**,
take the top `--count` (default 1) rows. **Drop every blocked row** (§ Blockers) before taking the
top N — highest priority first, lowest ID as the stable tie-break. `On Hold` and `Assignee = Me`
tickets are excluded by the WHERE. Echo the plan (ID · priority · assignee) before starting, and name
any ticket skipped for an open blocker so the queue's shape is visible.

### 2. CLAIM ALL

For each selected ticket, re-check it's still `Ready` **and still unblocked**, then write
`Status = In Progress` via `notion-update-page`. Drop any that another run already grabbed. Claim
before dispatching so parallel runs don't collide.

### 3. FAN OUT — one subagent per ticket, in parallel

Dispatch all subagents in a single message (multiple `Agent` calls) so they run concurrently. Each
`Agent`:

- `agentType: general-purpose`, `isolation: worktree` (its own worktree — they edit files in parallel
  and must not collide), `model:` = the ticket's `Assignee` lowercased → `fable`/`opus`/`sonnet`.
- Prompt carries the ticket's title + body + acceptance criteria and instructs the subagent to:
  **rename** the worktree's existing branch to a conventional name (`git branch -m <fix/…|feat/…>`) —
  **not** `git checkout -b`, which orphans the auto-created `worktree-agent-<id>` branch as junk —
  implement to the acceptance criteria, and follow `.claude/rules/*` — call out `code-style` and
  `vue-templates` explicitly in the prompt: comments are terse one-liners for the non-obvious _why_,
  never multi-line prose, and never inside `<template>` markup. Verbose subagent comments are a
  recurring review complaint.
- **Tests via `update-tests`, not the full suite.** After implementing, the subagent invokes the
  **`update-tests`** skill to cover its own change, then runs **`vp check`** (format + lint +
  type-check) green. It does **not** run the full `vp test` suite — parallel subagents each running
  the whole suite would swamp the machine, and `update-tests` already runs the scoped tests for what
  it touched. **CI is the gate**, watched by the orchestrator (step 4).
- **Confine every action to its own worktree — never touch the shared checkout.** The prompt must
  give the subagent its worktree's **absolute path** and tell it to: run `pwd` first and confirm it's
  inside `.claude/worktrees/agent-<id>`; do **all** reads, writes, `cd`s, and git commands there; and
  build **every file path from that worktree root** — never a bare `/…/TaroFlash/src/…` or any path
  outside its worktree, which is the shared/main checkout a human may be editing live. If it ever
  notices a change landed on the shared checkout, it must **stop and report it — never
  `git checkout` / `git restore` / revert the file**, since a blind revert-to-HEAD can wipe the
  human's uncommitted work.
- It **reports back** to the orchestrator: branch name, a summary of what changed, the file paths it
  touched, whether `update-tests` + `vp check` passed, and any unresolved failure or unmet acceptance
  criterion.
- **Clean up when done.** After it has pushed/handed back its branch and reported, the subagent
  removes its own worktree (`git worktree remove`) so no orphaned worktrees pile up. Exception: a
  **stuck/blocked** ticket leaves its worktree in place for human inspection (step 5).

### 4. ORCHESTRATE PRs

Once subagents report, turn their branches into PRs. One PR per ticket:

a. **READINESS CHECK** — if a subagent reported it couldn't satisfy acceptance, or left `vp check`
red it couldn't fix, don't open its PR; treat the ticket as stuck (step 5).
b. **CONFLICT CHECK** — for each finished branch, verify it merges cleanly into current `master`
(`git merge-tree` / dry-run merge). Then test-merge **every pair** of finished branches against
each other to catch cross-PR conflicts (two subagents touching the same code).
c. **RESOLVE** — a branch that's clean vs master and vs its peers gets a PR **based off `master`**.
When two branches conflict but the overlap is mechanical, **stack** the dependent PR on the other
(base its branch on the peer's branch) so it merges cleanly. If the two tickets carry a
`Blocked By` relation, **that decides the stack direction** — the blocker is the base; never invert
it, and never guess a direction when the relation already states it. When a conflict needs
**genuine human judgment** (semantic overlap, incompatible approaches), do **not** guess: **raise
it** in the final report and set that ticket to `Blocked`.
d. **OPEN** — for each non-blocked ticket, invoke the **`prepare-pr`** skill with `--ticket <ID>
   --ticket-url <url>` (the ticket's `<ID>` and its Notion page URL) → one PR titled `TARO-<ID>: …`
whose body opens with a `[TARO-<ID>](<url>)` link. Pass the stack base when the PR is stacked.
`prepare-pr` watches CI; **a PR isn't done until it's green.** If CI fails, route it through the
**Review & feedback loop** (below) — an inline main-checkout fix on the PR branch; if it still
can't pass after real effort, treat the ticket as stuck.
e. **HANDOFF** — for each opened, green PR: set the ticket to `Review`, append the PR URL into the
ticket body via `notion-update-page` (append, don't clobber the body).
f. **TEAR DOWN** — once a ticket is handed off (PR open + green, branch pushed to origin), **remove
its worktree**: `git worktree remove <path>`. The branch lives on origin and its local ref
survives worktree removal, so the human can `git checkout <branch>` in the **main** working copy to
review it against their local dev server — which a worktree checkout can't feed. Then delete any
leftover `worktree-agent-<id>` placeholder branch (`git branch -D`) if a subagent left one behind.
Only tear down **successful** tickets here; blocked ones keep their worktree (step 5).

### 5. STUCK / BLOCKED

A ticket is stuck when its subagent can't satisfy acceptance, its CI won't pass after real effort, or
a conflict needs human resolution. Set it to `Blocked`, append a one-line reason + what's needed into
the body, and leave its branch/worktree in place for the human. Never silently fail or leave a ticket
stranded in `In Progress`.

### 6. REPORT

Tally: worked → `Review` (with PR links, noting any stacked pairs), `Blocked` (with reasons + which
need human conflict resolution), skipped. Then enter the **Review & feedback loop** below.

## Review & feedback loop

Opening the PRs is not the end of the run — it's the handoff into review. After PRs are open the run
**stays live and waits for the user's feedback**. The user reviews the PRs themselves and will
usually come back **one PR at a time**, leaving comments on that PR.

Every follow-up change — user review feedback, a red CI run, or any other fix the PR needs — is
handled the same way:

1. **Fix inline, in the orchestrator session — no subagent by default.** Once the PRs are open the
   parallel build is over; dispatching a subagent per one-line review tweak is heavyweight and
   serializes badly. The orchestrator edits the PR branch **directly in the main checkout** — the user
   runs a dev server against it and verifies each fix **live**, so the fix must land on the branch
   they're looking at. Check the PR branch out in the main checkout, edit, commit per logical fix. Work
   **one PR at a time** (the user goes in order). Fall back to a fix subagent (still on the main
   checkout, never a fresh worktree) only when an initial-build subagent is still live on that checkout
   — editing the same tree concurrently would collide — or when the fix is large enough to warrant its
   own agent.
2. **Leave tests alone until the user asks.** Default to **not touching tests** during the feedback
   loop — the golden "no tests" rule is back in force here; the user very commonly wants tests left
   untouched while they reshape the code. Do **not** run `update-tests` per fix. When the user says
   they're ready for tests, run **one** consolidated `update-tests` pass over everything the review
   changed. (A user "put tests on hold" mid-review just confirms this default; honour it immediately.)
3. **Check, push, watch green.** Run `vp check`, push to the PR branch, and let CI run (via
   `prepare-pr` or directly). A PR isn't done until CI is green again — no local full-suite run.
4. **Answer the thread.** If the feedback came on the PR, reply prefixed `🤖 Claude:` so the user can
   tell your replies from their own; feedback given in chat is answered in chat. Leave the ticket in
   `Review`.

Repeat per PR until the user merges. **Never merge and never set `Done` yourself** — that stays the
user's call, exactly as at first handoff.

## Self-heal

The **orchestrator** performs self-heal (the per-ticket subagents are gone and their worktrees torn
down by the time feedback lands). Review feedback is this skill's richest signal — the user reviews
each PR and says, in effect, "we don't do it this way." Run every correction through four gates; what
survives is a **defect in the codebase's rules**, healed per
[`self-heal.md`](../../rules/self-heal.md) — the shared living-PR mechanics — separate from the ticket
PR.

1. **Execution, not spec.** If the feedback shows the _ticket / AC_ was wrong or ambiguous, that's a
   `/triage`–`/groom` miss, not this skill's — note "needs regroom", fix the PR, don't heal here.
   Only a **correct-ticket / wrong-code** miss continues.
2. **Generalizes.** Restate the correction as a standing rule: true on the _next_ ticket, or only
   this one? Instance-only ("the count should be 5") → fix the PR, no heal.
3. **Code, or the pass.** About claim, PR handoff, or review mechanics → heal **this skill**. About
   the code itself → gate 4.
4. **Gap, not adherence.** Grep the corpus first — CLAUDE.md, `.claude/rules/*`, memory feedback:
   - **No rule** → write one, routed by scope: repo-wide → a CLAUDE.md guideline; a domain that has a
     rule file → extend it; a domain with none → a new path-triggered `.claude/rules/*.md`. Bias
     toward extending the nearest file; create a new one only when the lesson would be off-topic in
     every existing one.
   - **Rule exists but vague or misplaced** → sharpen or relocate it. This is a heal.
   - **A clear rule already existed** → an _adherence_ miss, not a corpus gap; leave it — **unless**
     the same clear rule is violated repeatedly (across PRs this run, or across sessions), which means
     it's weak, misplaced, or not loading, and that _is_ a heal (strengthen, relocate, or make it
     path-load).

Working several tickets at once multiplies the signal: the **same correction on multiple PRs in one
run** is a high-confidence gap — weight it up at gate 2. The healing PR is autonomous; the user's
review of it confirms or kills the generalization, so there is no inline confirm mid-run.

## Guardrails

- Only ever touch the Task Board named in the rule — never a backup/duplicate board.
- **Never merge, never set `Done`.** Opening the PR is a handoff into `Review`, not the end — the run
  stays live through the feedback loop until the user merges. Merging is always the user's call.
- Claim before coding; re-check the lane to avoid double-work.
- **Never work a ticket with an open `Blocked By` row** (§ Blockers) — skip it silently when
  auto-pulling; warn when the user named it explicitly. Lane membership alone doesn't make a ticket
  takeable.
- Never work an `On Hold` or `Assignee = Me` ticket (the user's hands-off, and not in `Ready`
  anyway), and never run a backend teaching persona — `/work` is autonomous.
- **Tests: suspended only for the initial build.** Each initial-build subagent invokes `update-tests`
  for its change (golden "no tests" rule suspended there); no subagent runs the full `vp test` suite —
  CI is the gate the orchestrator watches. In the **Review & feedback loop the rule is back on**: don't
  touch tests until the user asks, then one consolidated `update-tests` pass over all the review edits.
- One PR per ticket (via `prepare-pr`). Don't batch multiple tickets into a single PR.
- Self-heal ships to the shared `self-heal` PR (§ Self-heal), never merged and separate from ticket
  PRs — a rule fix rides its own stream, never a ticket branch.
- The orchestrator runs from its **own worktree** (step 0). During the **initial build** it never
  edits ticket code — subagents do, in per-ticket **worktrees**, which the subagent **removes when
  done** (except a stuck ticket, whose worktree is left for inspection). Out-of-scope side requests
  during the run are done on the orchestrator worktree. **Post-open review fixes are edited inline by
  the orchestrator** on the checked-out PR branch in the **main checkout**, one PR at a time, so the
  user's live dev server reflects them — a fix subagent is the fallback, not the default (§ Review &
  feedback loop).
- **Subagents stay inside their own worktree.** Each works only under its `.claude/worktrees/agent-<id>`
  path — never edits the shared/main checkout, and never reverts a shared-checkout file (that can
  destroy the user's uncommitted work); it stops and reports instead.
- Every PR must merge cleanly (vs `master` and vs the other in-flight PRs) and be CI-green before
  handoff. A conflict needing human judgment → raise it + `Blocked`; never guess a resolution.
- Successful tickets leave **no worktree and no `worktree-agent-*` branch** behind — subagents rename
  their worktree branch (never `checkout -b`), and the orchestrator removes each worktree after
  handoff. Only blocked tickets keep their worktree.
