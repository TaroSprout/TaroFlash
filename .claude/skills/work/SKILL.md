---
name: work
description: The main entrypoint for writing code — a Task Board ticket, a whole epic, or a freeform instruction, executed autonomously and in parallel. `/work <ID> …` claims and works named tickets. `/work` (no args) pulls the top unblocked `Ready` tickets by priority (`--count N`, default 1). `/work --epic <name|url>` works an entire epic in topological waves over `Blocked By`. `/work "<instruction>"` runs one freeform build with no board interaction at all. This session is the orchestrator: it runs from wherever it was spawned, delegates every Notion read/write to the `board-agent`, fans out one worktree-isolated `ticket-builder` per unit of work pinned to its `Assignee` model, dispatches the test pass and PR prep per branch, and stays live for review feedback — every fix dispatched, never edited inline by the orchestrator. It never opens a source file, never reads Notion JSON, never merges, never sets `Done`. Trigger on `/work`, "work the board", "work this epic", "work several tickets".
allowed-tools: Read, Write, Bash, Agent
argument-hint: '[<ID> <ID> …] [--count N] [--epic <name|url>] ["<instruction>"]'
arguments:
  - name: <ID>
    description: One or more numeric ticket IDs to work. Each gets its own `ticket-builder`. Omit to auto-pull the top unblocked `Ready` tickets by priority.
  - name: --count N
    description: When no IDs are given, how many `Ready` tickets to pull and work in parallel (default 1). Ignored when IDs or `--epic` are given.
  - name: --epic <name|url>
    description: Work every `Ready`, unblocked ticket on the named epic in one run, as topological waves over `Blocked By`.
  - name: '"<instruction>"'
    description: Freeform mode — one build from a plain-text instruction, no board claim, no ticket status writes, one PR. Any argument that isn't a bare ID or a recognized flag is treated as the instruction.
lastUpdated: 2026-08-15T00:00:00Z
---

## What this skill does

Pulls work — named tickets, an auto-pulled batch, a whole epic, or a freeform instruction — and lands
each unit at an **open PR** for your review. It never merges and never marks a ticket `Done` — you
close the loop.

**One session, always orchestrated, one invariant above everything else: the orchestrator never opens
a source file and never reads Notion JSON.** It holds one row per ticket in a run ledger and delegates
everything that would cost it context:

- **Board I/O** — SELECT, blocker resolution, claim, and handoff writes — is the
  [`board-agent`](../../agents/board-agent.md)'s job. It writes each ticket's body and acceptance
  criteria to a payload file and hands the orchestrator a path, never the body itself.
- **The build** is [`ticket-builder`](../../agents/ticket-builder.md)'s, one per ticket/instruction, in
  its own worktree, pinned to the `Assignee` model (`sonnet` for freeform, which has no `Assignee`).
- **The test pass, PR prep, and every review fix** are each their own dispatch (§ Procedure,
  § Review & feedback loop) — the orchestrator receives a verdict, never a diff.

The orchestrator runs from the **home tree** — wherever it was spawned, the main checkout or a
worktree you made before starting. It never enters, creates, or removes a worktree of its own.

## Board constants

Full board constants (data sources, fields, options, relations) live in
[`task-board-schema.md`](../../rules/task-board-schema.md) — the `board-agent` reads it, not this
skill. What the orchestrator itself needs to judge a plan:

- `Status` lanes this skill uses: pulls from `Ready`; claims to `In Progress`; lands at `Review`;
  parks stuck work at `Blocked`. Never sets `Done` / `Duplicate`.
- `Assignee`: `Fable` · `Opus` · `Sonnet` — the model each builder is pinned to. **`Assignee = Me`
  and `Status = On Hold` are both hands-off** (user-owned) and never eligible.
- Freeform and mid-run out-of-scope work carries no ticket, so no `Status`/`Assignee` write ever
  touches the board for it.

## Blockers — a ticket is not takeable just because it's in the lane

`/groom` wires ordering between split siblings on the Task Board's **`Blocked By`** self-relation
(→[K:ticket-dependencies]). The `board-agent` resolves it at SELECT and returns each candidate's
blocked state; the doctrine for reading that state is the orchestrator's:

**The gate protects one thing: never land work against code that is about to change.** A blocker's
`Status` outside the `complete` group (`Done` / `Won't Do` / `Duplicate`) makes the ticket blocked —
unless one of two things is already true, and neither is overridden by `Status` alone:

- **The blocker's PR is merged**, while its ticket still reads `Review` — this skill never sets
  `Done`, so the board lags every merge by design. Judge on whether the code has landed.
- **The dependent branch is stacked on the blocker's branch** (§ Fan out) — the blocker's code is
  already underneath it.

Auto-pull (no IDs, no `--epic`) uses the `Status`-only check. **Epic mode never re-gates a later wave
on a merge** — the wave order already sequences the stack, so once the user has chosen to work the
epic, keep going rather than waiting for each blocker's PR.

If a run finds every candidate blocked, say so and stop rather than reaching further down the queue
for something unrelated. Two siblings of one split are never both takeable under the default check —
the `Blocked By` relation means one waits, and a chain is worked a link at a time.

### A prose `## Blocked on` section is a different blocker

`Blocked By` (above) is Notion's structured ticket-to-ticket relation. Separately, a groomed
ticket's **body** can carry a free-text `## Blocked on` section recording an **external** blocker —
an account to provision, a domain to add, a secret to set — something no builder can resolve. The
`board-agent` fetches bodies at SELECT, so this surfaces in the same pass as everything else: named
at the single gate (§ The gate) rather than judged around or asked about mid-run. The orchestrator
never guesses "doable anyway" — only the user knows whether it's actually cleared.

## Run ledger

The orchestrator's only state, written to a file in the session's scratchpad (never the repo),
rewritten as state changes: one row per unit of work — ticket/instruction → branch → worktree path →
PR number → status (building / testing / open / green / blocked / merged) → files touched (names
only, from `--name-only`, never content) — plus a **decision log**, one line per judgment call a
builder, a test/PR agent, or the orchestrator itself made. A long epic run is expected to hit context
compaction; the ledger, not the conversation, is what survives it. It is also the index review-fix
routing reads (§ Fix routing).

## Procedure

### 0. HOME TREE

`pwd` and `git worktree list` once, at the start, and record the result as the run's home tree.
Every git command for the rest of the run is checked against that path
([`git-workflow`](../../rules/git-workflow.md)). A single-ticket or freeform run stays on whatever
branch the home tree already has checked out (or `master`, cutting a feature branch per
[`git-workflow`](../../rules/git-workflow.md)); a multi-PR run checks out its integration branch here
(§ Integration branch) and never anything else for the rest of the run.

### 1. SELECT

Dispatch `board-agent` with `SELECT` and the run's mode:

- **Named IDs** — `ids: [...]`. Warn, don't silently skip, if one isn't `Ready` or is `Assignee = Me`.
- **No IDs, no `--epic`** — `auto: { count: N }` (default 1).
- **`--epic <name|url>`** — `epic: "<name|url>"`. Returns every `Ready`, unblocked ticket on that
  epic plus each one's `Blocked By` ids **within the epic**, so the orchestrator can compute waves
  (§ Fan out) — the epic's non-`Ready` tickets come back named, not selected; grooming them is
  interactive and out of scope for this run.
- **Freeform** — skip SELECT and the board agent entirely; there is no ticket.

`board-agent` returns a compact table (id, title, priority, assignee, blocked + reason,
`## Blocked on` + summary, payload path) and writes each candidate's body/AC to its own payload file.
The orchestrator never opens that file.

### 2. THE GATE — one interactive pause, and the only one

Echo the plan from the SELECT table: what will be worked, in what order (waves, for `--epic`). Then
echo **everything it will not work**: ungroomed epic tickets, blocked rows, `Assignee = Me`, and any
ticket carrying a prose `## Blocked on` section. The user decides once, here, whether to work a
`## Blocked on` ticket anyway.

Every echoed row — worked or not — carries its title alongside the id, since the SELECT table already
returned one. An id-plus-reason row makes the user ask for the title before they can judge the row;
don't make them ask for data you already have.

**After the user's OK, the run is uninterrupted until every PR is green** — no mid-run questions.
Everything that used to pause becomes a decision plus a ledger line (§ Run ledger) instead.

### 3. CLAIM ALL

Dispatch `board-agent` with `CLAIM` and the user-approved id list. It re-checks each is still `Ready`
and unblocked, writes `Status = In Progress`, and reports which were dropped (another run already
grabbed it). Claim before dispatching so parallel runs don't collide. Freeform work has nothing to
claim.

### 4. FAN OUT — one `ticket-builder` per unit of work

Dispatch all builders for the current wave in a single message (multiple `Agent` calls) so they run
concurrently. Each `Agent` takes `subagent_type: ticket-builder`, `isolation: worktree`, and
`model:` = the ticket's `Assignee` lowercased (`fable`/`opus`/`sonnet`), or `sonnet` for freeform.

The prompt carries **only the payload**: the payload file's path (or, for freeform, the instruction
text itself), the worktree's absolute path, and the conventional branch name to rename to. How a
build behaves is [`ticket-builder`](../../agents/ticket-builder.md)'s own definition — restating any
of it here puts a second copy in play that drifts from the role.

- **`ticket-builder` has no `Agent` and no `Skill` tool** — a depth-two agent reports to nobody the
  orchestrator can hear, and nothing here reintroduces the ask.
- **Irreversible or cross-ticket-critical work goes first** — the one build-order fact only this
  ticket knows, so name it in the payload.

**Epic mode fans out in waves**, not all at once. Wave 1 is every selected ticket with no in-epic
blocker, branching off `master`. Wave N is the tickets whose blockers all **landed** in wave N-1 —
landed means the blocker's own test pass (§ 4b) has committed, not merely that its build reported
back (§ 4a) or merged forward into the integration branch. Cutting a wave-N worktree off a blocker
branch that has reported but not yet finished § 4b bases it on a tip missing its own parent's test
coverage, which a later merge-forward can't retroactively fix without a real conflict. Each wave-N
builder's worktree is based on its blocker's branch, not `master` — its PR will stack on that
branch (§ 5c reuses this same stacking rule; don't invent a second mechanism). **Cap a wave at ~4
concurrent builders** — split a larger wave into batches. The test pass (§ 4b) stays sequential across
every wave, and gates the next wave's fan-out the same way it gates § 5's PR step.

### 4a. LAND — the home tree updates the moment a builder reports back

**A finished branch reaches the tree the user is looking at before anything else happens to it** —
before the test pass, before PR prep, before CI runs at all. The instant a `ticket-builder` reports
its branch done, merge it forward into the integration branch on the home tree (single-ticket or
freeform run: `git checkout <branch>` directly, once the branch exists) — the same merge-forward the
feedback loop already runs per fix (§ Review & feedback loop step 1), just starting here instead of
at teardown. Never wait for the test pass to finish, CI to go green, or the PR to open before doing
this.

### 4b. TEST PASS — one dispatch per branch, sequential

Builders never touch tests, and the orchestrator never mines a conversation it wasn't part of. Once a
branch's build is in, dispatch a `general-purpose` agent per branch to run the [`update-tests`
skill](../../skills/update-tests/SKILL.md) inside that builder's worktree, passing the builder's own
"what a test should cover" lines as `$ARGUMENTS` — `update-tests` already treats that argument as
mandatory obligations and needs no conversation to mine. The dispatched agent owns `update-tests`'s
own review-and-commit step end to end (it has the worktree open; the orchestrator never does) and
reports back pass/fail. **Sequential, not parallel** — several coverage runs at once swamp the
machine.

The full `vp test` suite is never run locally; **CI is the gate**, watched in step 5.

**The orchestrator dispatches `corpus-author` for every `[K:gap: …]` tag a builder left**, one
background `Agent` call per gap per [`self-heal`](../../rules/self-heal.md), before step 5. The tag
fails the knowledge check until the topic lands and the site cites it. A `COPY-TBD` a builder left is
**not** dispatched — no agent can settle wording — but it does not hold the ticket either
(§ Copy never blocks the build).

### 5. ORCHESTRATE PRs

Once every branch's test pass is done, turn them into PRs. One PR per ticket/instruction:

a. **READINESS CHECK** — if a builder reported it couldn't satisfy acceptance, or left `vp check` red
it couldn't fix, don't open its PR; treat the ticket as stuck (§ Stuck / blocked).
b. **CONFLICT CHECK**, exit codes only — never dump merge output into this session. For each finished
branch, verify it merges cleanly into current `master` (`git merge-tree` / dry-run merge, check the
exit code). Then test-merge **every pair** of finished branches against each other
(`--name-only` for which files collide, never their content) to catch cross-PR conflicts.
c. **RESOLVE** — a branch clean vs `master` and vs its peers gets a PR **based off `master`**. When
two branches conflict but the overlap is mechanical, **stack** the dependent PR on the other. A
`Blocked By` relation **decides the stack direction** — the blocker is the base; never invert it, and
never guess a direction the relation already states. A conflict needing **genuine human judgment**
(semantic overlap, incompatible approaches) is not guessed at: **raise it** in the final report and
park that ticket `Blocked`.
d. **OPEN**, dispatched — for each non-blocked branch, a `general-purpose` agent runs the
**`prepare-pr`** skill with `--branch <branch> --base <master|peer-branch> --ticket <ID>
--ticket-url <url> --acceptance <payload-path>` (freeform: no `--ticket`/`--ticket-url`/`--acceptance`)
→ one PR titled `TARO-<ID>: …` whose body answers every acceptance criterion, watched to green. The
dispatched agent reads the diff and writes the PR body; the orchestrator receives only the PR URL and
green/red. `prepare-pr` never checks a branch out, so PR prep can't move a tree out from under the
user.
e. **HANDOFF**, dispatched — for each opened, green PR, `board-agent` with `HANDOFF` (`id`, `pr_url`):
sets the ticket to `Review`, appends the PR URL into the ticket body.
f. **TEAR DOWN** — once a ticket is handed off (PR open + green, branch pushed to origin), check the
builder's worktree first (`git status --short` inside it, per
[`git-workflow`](../../rules/git-workflow.md); anything uncommitted stops the removal and gets
reported, never forced away with `--force`), then `git worktree remove <path>` from the home tree,
once you've confirmed via `pwd`/`git worktree list` you're not removing the one you're standing in.
The branch lives on origin and its local ref survives removal. Only tear down **successful** tickets
here; a stuck one keeps its worktree (§ Stuck / blocked). The home tree itself was already updated at
step 4a, right after the build landed — teardown just reclaims the worktree, it doesn't gate what the
user sees. **This isn't gated on handoff succeeding** — removal is an obligation of how the run ends,
not a line that only runs once every earlier step succeeds, so a run that fails or is interrupted
before handoff still checks and removes every worktree it made (a stuck ticket's excepted, per
above) before it stops.

**Copy never blocks the build.** A PR whose only red check is the knowledge check's `COPY-TBD` marker
still opens, still counts as this run's output — it is not stuck, and the run does not wait on it.
List it in the final report instead, with three varied wording options per unsettled string; the PR
goes green once the user picks.

### 6. STUCK / BLOCKED

A ticket is stuck when its builder can't satisfy acceptance, its CI won't pass after real effort (and
the failure isn't a lone `COPY-TBD`), or a conflict needs human resolution. Dispatch `board-agent`
with `BLOCK` (`id`, reason): sets `Status = Blocked`, appends a one-line reason + what's needed into
the body. Leave its branch/worktree in place for the human. Never silently fail or leave a ticket
stranded in `In Progress`.

### 7. REPORT

Tally: worked → `Review` (PR links, noting stacked pairs and epic waves), `Blocked` (reasons + which
need human conflict resolution), waiting on copy (the string options), skipped. Then enter the
**Review & feedback loop** below.

- **Decisions & assumptions** — one line per entry in the run ledger's decision log. No narrative.

## Mid-run intake

The user can hand the session more at any point — another ID, `--epic`, a freeform instruction, or an
out-of-scope side request. Each is appended to the run ledger as a new row and dispatched as its own
builder (§ 4) the moment it lands — an out-of-scope request is not done inline by the orchestrator
either, it gets a builder like everything else. Nothing already in flight is disturbed.

## Integration branch

**A run producing more than one PR builds `integration/<epic-or-run-slug>`**: `master` plus a merge of
every live ticket branch. The home tree checks it out at step 0 and **stays on it for the rest of the
run** — that is the tree the user's dev server points at, and it shows every wave at once. It is local
only, never a PR, and re-derivable at any moment (re-merge `master` plus the live branches), so a
merged PR or a new wave just rebuilds it. A merge that conflicts is a real cross-PR conflict, handled
exactly as § 5b/c already handles one. A single-ticket or freeform run has no integration branch — the home
tree tracks that one branch instead, checked out the moment the builder reports (§ 4a).

## Review & feedback loop

Opening the PRs is not the end of the run — it's the handoff into review. After PRs are open the run
**stays live and waits for the user's feedback**. The user reviews the PRs themselves and will
usually come back **one PR at a time**, leaving comments on that PR.

Every follow-up — user review feedback, a red CI run, or any other fix a PR needs — is handled the
same way:

1. **Every fix is dispatched, never edited inline.** A `ticket-builder` works the fix on the owning
   ticket branch, in a **throwaway worktree** ([`git-workflow`](../../rules/git-workflow.md),
   →[K:worktree-write-target]) — it commits there and reports back. The orchestrator then merges
   that branch forward into the
   **integration branch, in the home tree** (single-PR runs: the checked-out branch). The fix lands
   on the correct PR _and_ appears under the user without them moving anything. Fixes to different
   PRs no longer serialize — only the merge-forward does.
2. **Routing is the run ledger's job.** Feedback left on a PR carries its number and routes itself.
   Feedback given in chat routes by matching subject and touched files against the ledger's file
   index; genuinely ambiguous feedback asks — safe here because this is all post-handoff, past the one
   gate.
3. **Leave tests alone until the user asks.** Default to **not touching tests** during the feedback
   loop — the golden "no tests" rule is back in force. Do **not** run `update-tests` per fix. When the
   user says they're ready for tests, run **one** consolidated `update-tests` pass, dispatched the
   same way as § 4b, over everything the review changed.
4. **Batch the gate and the push per PR — don't run either per item.** Apply and commit each piece of
   feedback as it comes; hold `vp check` and the push until the user signals the round is done, then
   run it once and push once for that PR's batch. CI green again is what closes the round — no local
   full-suite run.
5. **Answer the thread.** PR feedback gets a reply prefixed `🤖 Claude:`; chat feedback is answered in
   chat. Leave the ticket in `Review`.
6. **Dispatch self-heal for this round before starting the next PR** (§ Self-heal) — every standing
   preference the user stated this round, not only claim/handoff/review mechanics.

Repeat per PR until the user merges. **Never merge and never set `Done` yourself.**

## Self-heal

Run every review correction through [`self-heal.md`](../../rules/self-heal.md), separate from the
ticket PR. Specific to this skill:

- The **orchestrator** dispatches — builders and fix worktrees are gone by the time feedback lands.
  It dispatches in the background and returns to the feedback loop; it never pauses the run to write a
  rule itself.
- Review feedback is this skill's richest signal. A miss about **claim, PR handoff, or review
  mechanics** heals this skill; a miss about the **code** routes by the table in the rule.
- Gate 2 (execution, not spec): feedback showing the _ticket / AC_ was wrong is a `/triage`–`/groom`
  miss — note "needs regroom", fix the PR, don't heal here.
- Several PRs in one run multiply the signal: the **same correction on multiple PRs in one run** is a
  high-confidence gap — weight it up at gate 1.
- The healing PR is autonomous; the user's review of it confirms or kills the generalization, so
  there's no inline confirm mid-run. Several dispatches across a run stack onto that one PR.
- The maintainer-sweep condition in `self-heal.md` (§ Dispatch) is checked at the round boundary, not
  per correction — `/work` defers its own check until a round closes rather than sweeping mid-round
  while builders are running.

## Guardrails

- Only ever touch the Task Board named in `task-board-schema.md` — never a backup/duplicate board.
- **Never merge, never set `Done`.** Opening the PR is a handoff into `Review`, not the end — the run
  stays live through the feedback loop until the user merges.
- Claim before coding; re-check the lane to avoid double-work.
- **Never work a ticket whose blocker's code hasn't landed** (§ Blockers) — skip it silently when
  auto-pulling; warn when the user named it explicitly; never re-gate a later epic wave on it.
- Never work an `On Hold` or `Assignee = Me` ticket.
- **A prose `## Blocked on` section is named at the single gate, not judged around mid-run.**
- **The orchestrator never opens a source file and never reads Notion JSON** — SELECT, blocker
  resolution, claim, and handoff are `board-agent`'s; the test pass, PR prep, and every fix are each
  their own dispatch. What reaches the orchestrator is a table, a path, a URL, or an exit code.
- **Exactly one interactive pause, at selection** (§ The gate). After the user's OK, nothing pauses
  the run again — a stuck ticket parks `Blocked` and the run continues.
- **Copy never blocks the build** (§ 5) — a `COPY-TBD` PR still opens; it waits on the user, the run
  doesn't wait on it.
- **Never ask any subagent to spawn another.** `ticket-builder` carries no `Agent`/`Skill` tool, so it
  can't, and no prompt from here reintroduces the ask.
- One PR per ticket/instruction (via `prepare-pr`, dispatched). Don't batch multiple into one PR.
- Self-heal is **dispatched, never written inline** (§ Self-heal), shipping to the shared `self-heal`
  PR, never merged.
- The orchestrator runs from the **home tree** (§ 0) — a multi-PR run stays on its **integration
  branch** for the whole run (§ Integration branch); it never edits ticket code itself, builders do,
  in their own worktrees, torn down at handoff (except a stuck ticket's, left for inspection).
  Post-open fixes follow the same dispatch-and-merge-forward shape (§ Review & feedback loop).
- Every PR must merge cleanly (vs `master` and vs the other in-flight PRs) and be CI-green (bar a lone
  `COPY-TBD`) before handoff. A conflict needing human judgment → raise it + `Blocked`; never guess.
- Successful tickets leave **no worktree and no `worktree-agent-*` branch** behind — builders rename
  their worktree branch (never `checkout -b`), and the orchestrator removes each worktree after
  handoff. Only blocked tickets keep their worktree.
