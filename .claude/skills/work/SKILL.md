---
name: work
description: Execute groomed Notion Task Board tickets autonomously, in parallel. `/work [<ID> …]` claims each ticket to In Progress, then fans out one worktree-isolated `ticket-builder` per ticket — each pinned to that ticket's `Assignee` model (Fable/Opus/Sonnet), each implementing to the acceptance criteria. With no IDs it pulls the top unblocked `Ready` tickets by priority (`--count N`, default 1). This session is the orchestrator, on its own worktree; it runs the test pass over each branch the builders hand back, organizes them into non-conflicting PRs, watches CI to green, then stays live for your review feedback — dispatching main-workspace fix subagents per PR. It never merges and never sets Done. Trigger on `/work`, "work the board", "work several tickets".
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, Agent, Skill, EnterWorktree, ExitWorktree, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page
argument-hint: '[<ID> <ID> …] [--count N]'
arguments:
  - name: <ID>
    description: One or more numeric ticket IDs to work. Each gets its own `ticket-builder`. Omit to auto-pull the top unblocked `Ready` tickets by priority.
  - name: --count N
    description: When no IDs are given, how many `Ready` tickets to pull and work in parallel (default 1). Ignored when IDs are named.
lastUpdated: 2026-08-01T20:00:00Z
---

## What this skill does

Pulls groomed tickets off the board, works them **autonomously in parallel**, and
lands each at an **open PR** for your review. It never merges and never marks a ticket `Done` — you
close the loop.

**One mode, always orchestrated.** This session is the **orchestrator**: it claims the tickets, fans
out one worktree-isolated [`ticket-builder`](../../agents/ticket-builder.md) per ticket, then tests
and organizes the branches they hand back into clean, CI-green PRs. The orchestrator never edits
ticket code itself — builders do. After the PRs open it stays live for your review feedback
(§ Review & feedback loop).

- **Source lane** — `Ready` (`/groom` lands tickets there itself, after its review loop).
- **Model** — each ticket's `Assignee` (`Fable` / `Opus` / `Sonnet`), one builder pinned to it.
- **Tests** — the golden "no tests" rule is **suspended here**, for the orchestrator only: it runs
  `update-tests` once per branch after the builds hand back (§ 3b). Builders never touch tests.

## Board constants

- **Task Board** data source: `collection://3630953c-224c-8065-8864-000bb9fe7bad`. Full board
  constants (fields, options, relations) live in
  [`task-board-schema.md`](../../rules/task-board-schema.md).
- `Status` lanes this skill uses: pulls from `Ready`; claims to `In Progress`; lands at `Review`;
  parks stuck work at `Blocked`. Never sets `Done` / `Duplicate`.
- `Assignee`: `Fable` · `Opus` · `Sonnet` — the model each builder is pinned to. **`Assignee = Me`
  and `Status = On Hold` are both hands-off** (user-owned) and never eligible.
- Status and field writes are plain `notion-update-page` property writes — no transition step.

## Blockers — a ticket is not takeable just because it's in the lane

`/groom` wires ordering between split siblings on the Task Board's **`Blocked By`** self-relation
(→[K:ticket-dependencies]). A ticket with an
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

**The gate protects one thing: never land work against code that is about to change.** Two other
things satisfy it, and a `Status` outside the complete group doesn't override either:

- **The blocker's PR is merged**, while its ticket still reads `Review` — this skill never sets
  `Done`, so the board lags every merge by design. Judge on whether the code has landed, not on the
  `Status` field alone.
- **The dependent branch is stacked on the blocker's branch** (§ 4c) — it branches off the blocker,
  not `master`, so the blocker's code is already underneath it.

The `Status`-only check is the default when **auto-pulling by priority with no direction from the
user**. Once the user has chosen to stack an epic rather than wait for merges, **never re-gate a
later wave on their merges** — name the stack order and keep going.

If a run finds every candidate blocked, say so and stop rather than reaching further down the queue
for something unrelated. Under the default check two siblings of one split are never both takeable —
the `Blocked By` relation means one waits, and a chain is worked a link at a time.

### A prose `## Blocked on` section is a different blocker — ask, don't judge around it

`Blocked By` (above) is Notion's structured ticket-to-ticket relation. Separately, a groomed
ticket's **body** can carry a free-text `## Blocked on` section recording an **external** blocker —
an account to provision, a domain to add, a secret to set in Doppler — something no builder can
resolve. Finding one at SELECT or CLAIM time means **stop and ask the user before dispatching that
ticket's builder**, even when the code work looks doable around it (e.g. behind an env gate). The
orchestrator judging "doable anyway" is a guess about a blocker it can't see the state of; only the
user knows whether it's actually cleared.

## Procedure

### 0. ORCHESTRATOR WORKTREE — always

Before anything else, move into your **own** worktree (`EnterWorktree`, e.g. `batch-orchestrator`) and
run the entire skill from there — claims, conflict checks, PR orchestration, teardown, and the
feedback loop. (Self-heal is the exception: it dispatches to a subagent that makes its own worktree.)
This keeps the shared/main checkout free for the user to work in during the
run. **Any side request the user makes mid-run that is outside ticket scope** (a tweak to this skill,
tooling, docs) is also done on the orchestrator worktree — branch and commit freely there; it's
yours. The only work that leaves it is a **feedback-loop fix**, which lands on the main checkout so
the user's dev server sees it (§ Review & feedback loop).

`EnterWorktree` succeeding is not evidence your shell followed it — the tool can enter while `Bash`
still runs in the main checkout, and a `git checkout` from there moves the **user's** tree off
`master`.

- **Run `pwd` before every git command**, not once at entry, and confirm it's your worktree path.
- **`git worktree list` is the check** when anything looks off — it names which tree is on which
  branch, the main checkout included.
- **Never tell the user their main checkout is untouched** without having run that check.

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

### 3. FAN OUT — one `ticket-builder` per ticket, in parallel

Dispatch all builders in a single message (multiple `Agent` calls) so they run concurrently. Each
`Agent` takes `subagent_type: ticket-builder`, `isolation: worktree` (its own worktree — they edit
files in parallel and must not collide), and `model:` = the ticket's `Assignee` lowercased →
`fable`/`opus`/`sonnet`.

The prompt carries **only the payload**: the ticket's title, body and acceptance criteria, its
worktree's absolute path, and the conventional branch name to rename to. How a build behaves — the
worktree confinement, the commit batching, the comment shape, what it does with a gap it can't file
or a string nobody signed off, and the shape of its report — is
[`ticket-builder`](../../agents/ticket-builder.md)'s own definition. Restating any of it in the
prompt puts a second copy in play that drifts from the role.

- **`ticket-builder` has no `Agent` and no `Skill` tool**, so it cannot spawn and nothing asks it to.
  A depth-two agent reports to nobody the orchestrator can hear.
- **Irreversible or cross-ticket-critical work goes first** — the one build-order fact only this
  ticket knows, so name it in the payload.

### 3b. TEST PASS — once per branch, here, after the builds hand back

Builders never touch tests. Once every report for this fan-out is in, the orchestrator runs the test
pass itself, **one branch at a time**: enter that builder's worktree, invoke the **`update-tests`**
skill for its diff, and commit what it writes onto the branch. Sequential, not parallel — each pass
runs the scoped suite, and several at once swamp the machine.

The full `vp test` suite is never run locally; **CI is the gate**, watched in step 4.

**The orchestrator dispatches `corpus-author` for every `[K:gap: …]` tag a builder left**, one
background `Agent` call per gap per [`self-heal`](../../rules/self-heal.md), before step 4. The tag
fails the knowledge check until the topic lands and the site cites it, so a PR can't go green
carrying one. A `COPY-TBD` a builder left is **not** dispatched — it's a string only the user can
settle, so raise it and hold that ticket at step 5.

### 4. ORCHESTRATE PRs

Once the test pass is done, turn the builders' branches into PRs. One PR per ticket:

a. **READINESS CHECK** — if a builder reported it couldn't satisfy acceptance, or left `vp check`
red it couldn't fix, don't open its PR; treat the ticket as stuck (step 5).
b. **CONFLICT CHECK** — for each finished branch, verify it merges cleanly into current `master`
(`git merge-tree` / dry-run merge). Then test-merge **every pair** of finished branches against
each other to catch cross-PR conflicts (two builders touching the same code).
c. **RESOLVE** — a branch that's clean vs master and vs its peers gets a PR **based off `master`**.
When two branches conflict but the overlap is mechanical, **stack** the dependent PR on the other
(base its branch on the peer's branch) so it merges cleanly. If the two tickets carry a
`Blocked By` relation, **that decides the stack direction** — the blocker is the base; never invert
it, and never guess a direction when the relation already states it. When a conflict needs
**genuine human judgment** (semantic overlap, incompatible approaches), do **not** guess: **raise
it** in the final report and set that ticket to `Blocked`.
d. **OPEN** — for each non-blocked ticket, invoke the **`prepare-pr`** skill with
`--branch <branch> --base <master|peer-branch> --ticket <ID> --ticket-url <url> --acceptance <path>`
→ one PR titled `TARO-<ID>: …` whose body opens with a `[TARO-<ID>](<url>)` link and answers every
acceptance criterion. Write the ticket's criteria, one per line, to a file first and pass its path —
the orchestrator is the only actor holding the ticket body. `--base` is the stack base when the PR
is stacked (§ 4c), `master` otherwise. `prepare-pr` never checks a branch out, so PR orchestration
can't move a tree out from under the user. It watches CI; **a PR isn't done until it's green.** If
CI fails, route it through the **Review & feedback loop** (below); if it still can't pass after real
effort, treat the ticket as stuck.
e. **HANDOFF** — for each opened, green PR: set the ticket to `Review`, append the PR URL into the
ticket body via `notion-update-page` (append, don't clobber the body).
f. **TEAR DOWN** — once a ticket is handed off (PR open + green, branch pushed to origin), **remove
its builder's worktree**: `git worktree remove <path>`. Builders never remove their own, because the
test pass (§ 3b) runs in them after they finish. The branch lives on origin and its local ref
survives worktree removal, so the human can `git checkout <branch>` in the **main** working copy to
review it against their local dev server — which a worktree checkout can't feed. Then delete any
leftover `worktree-agent-<id>` placeholder branch (`git branch -D`) if a builder left one behind.
Only tear down **successful** tickets here; blocked ones keep their worktree (step 5).

### 5. STUCK / BLOCKED

A ticket is stuck when its builder can't satisfy acceptance, it left a `COPY-TBD` only the user can settle, its CI won't pass after real effort, or
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
3. **Batch the gate and the push — don't run either per item.** A review round is commonly many
   small pieces of feedback in a row; apply and commit each as it comes, but hold `vp check` and the
   push until the user signals the round is done (they stop, or say so explicitly), then run
   `vp check` once and push once for the whole batch. A PR isn't done until CI is green again — no
   local full-suite run.
4. **Answer the thread.** If the feedback came on the PR, reply prefixed `🤖 Claude:` so the user can
   tell your replies from their own; feedback given in chat is answered in chat. Leave the ticket in
   `Review`.
5. **Dispatch self-heal for this round before starting the next PR** (§ Self-heal) — every standing
   preference the user stated this round, not only ones about claim/handoff/review mechanics.

Repeat per PR until the user merges. **Never merge and never set `Done` yourself** — that stays the
user's call, exactly as at first handoff.

When the user closes the loop — every PR merged, or they say the run is over — **remove the
orchestrator's own worktree** (`ExitWorktree`, then `git worktree remove <path>`) and delete its
branch if nothing on it is wanted. A run that ends without this leaves a worktree behind on every
invocation.

## Self-heal

Run every review correction through [`self-heal.md`](../../rules/self-heal.md), separate from the
ticket PR. Specific to this skill:

- The **orchestrator** dispatches — the builders are gone and their worktrees torn down
  by the time feedback lands. It dispatches in the background and returns to the feedback loop; it
  never pauses the run to write a rule itself.
- Review feedback is this skill's richest signal. A miss about **claim, PR handoff, or review
  mechanics** heals this skill; a miss about the **code** routes by the table in the rule.
- Gate 2 (execution, not spec): feedback showing the _ticket / AC_ was wrong is a `/triage`–`/groom`
  miss — note "needs regroom", fix the PR, don't heal here.
- Working several tickets at once multiplies the signal: the **same correction on multiple PRs in one
  run** is a high-confidence gap — weight it up at gate 1.
- The healing PR is autonomous; the user's review of it confirms or kills the generalization, so
  there's no inline confirm mid-run. Several dispatches across a run stack onto that one PR.
- The maintainer-sweep condition in `self-heal.md` (§ Dispatch) is checked at the round boundary, not
  per correction — `/work` is the session that would dispatch it, so it defers its own check until
  the round closes rather than sweeping mid-round while builders are running.

## Guardrails

- Only ever touch the Task Board named in the rule — never a backup/duplicate board.
- **Never merge, never set `Done`.** Opening the PR is a handoff into `Review`, not the end — the run
  stays live through the feedback loop until the user merges. Merging is always the user's call.
- Claim before coding; re-check the lane to avoid double-work.
- **Never work a ticket whose blocker's code hasn't landed** (§ Blockers) — skip it silently when
  auto-pulling; warn when the user named it explicitly. Landed means the blocker is complete, its PR
  is merged, or this ticket's branch is stacked on it — not `Status = Done` alone. Lane membership
  alone doesn't make a ticket takeable either.
- Never work an `On Hold` or `Assignee = Me` ticket (the user's hands-off, and not in `Ready`
  anyway).
- **A ticket body carrying a prose `## Blocked on` section pauses for the user's go-ahead before
  dispatch** — never judged as workable around (e.g. "doable behind an env gate") on the
  orchestrator's own read.
- **Tests run once per branch, from here, and only for the initial build** (§ 3b) — the golden "no
  tests" rule is suspended for that one pass. Builders never touch tests, and the full `vp test`
  suite is never run locally; CI is the gate the orchestrator watches. In the **Review & feedback
  loop the rule is back on**: don't touch tests until the user asks, then one consolidated
  `update-tests` pass over all the review edits.
- **Never ask any subagent to spawn another.** A depth-two agent reports to nobody you can hear, and
  the call silently succeeds — `ticket-builder`'s tool list has no `Agent` or `Skill` so it can't,
  and no prompt from here reintroduces the ask.
- One PR per ticket (via `prepare-pr`). Don't batch multiple tickets into a single PR.
- Self-heal is **dispatched, never written inline** (§ Self-heal). The subagent ships to the shared
  `self-heal` PR, never merged — a rule fix rides its own stream, never a ticket branch.
- The orchestrator runs from its **own worktree** (step 0) and **removes it when the run ends**
  (§ Review & feedback loop). During the **initial build** it never edits ticket code — builders do,
  in per-ticket **worktrees**, which the orchestrator removes at handoff (except a stuck ticket,
  whose worktree is left for inspection). Out-of-scope side requests during the run are done on the
  orchestrator worktree. **Post-open review fixes are edited inline by the orchestrator** on the
  checked-out PR branch in the **main checkout**, one PR at a time, so the user's live dev server
  reflects them — a fix subagent is the fallback, not the default (§ Review & feedback loop).
- Every PR must merge cleanly (vs `master` and vs the other in-flight PRs) and be CI-green before
  handoff. A conflict needing human judgment → raise it + `Blocked`; never guess a resolution.
- Successful tickets leave **no worktree and no `worktree-agent-*` branch** behind — builders rename
  their worktree branch (never `checkout -b`), and the orchestrator removes each worktree after
  handoff. Only blocked tickets keep their worktree.
