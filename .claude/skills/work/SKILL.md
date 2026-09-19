---
name: work
description: The main entrypoint for writing code — a Task Board ticket, a whole epic, or a freeform instruction, executed autonomously and in parallel. `/work <ID> …` claims and works named tickets. `/work` (no args) pulls the top unblocked `Ready` tickets by priority (`--count N`, default 1). `/work --epic <name|url>` works an entire epic in topological waves over `Blocked By`. `/work "<instruction>"` runs one freeform build with no board interaction at all. This session is the orchestrator: it runs from wherever it was spawned, delegates every Notion read/write to the `board-agent`, fans out one worktree-isolated `ticket-builder` per unit of work pinned to its `Assignee` model, then checkpoints with you for a live review round on the branch it just built before any PR opens, dispatching your fixes the same way — never edited inline by the orchestrator — until you close the round. A pre-PR review pipeline (`swarm-reviewer` running `review-work`, one agent per concern, each on the model its roster row names) then reviews the integration branch — rule-family lenses (code-style, test-authoring) and the semantic `test-integrity` lens run first, then the placement lens (`comment-placement`) briefs a `comment-author` sweep, then `comment-authoring` reviews that sweep's own commits — before any PR opens. PRs open after that, and a lighter PR-feedback round follows the same way. It never opens a source file, never reads Notion JSON, never merges. It sets `Done` only at Full
cleanup (§ Full cleanup), gated on every PR the run produced already being merged — everywhere else
in the run, closing the loop is yours. Trigger on `/work`, "work the board", "work this epic", "work
several tickets".
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

Pulls work — named tickets, an auto-pulled batch, a whole epic, or a freeform instruction — lands and tests
every unit on a branch you can run live, **checkpoints with you for a live-review round on that branch**,
dispatches your fixes, and only once you close the round does it open a **PR** per unit for a lighter post-PR
round. It never merges, and moves each of the run's own tickets to `Done` only at Full cleanup (§ Full cleanup)
— once every PR the run produced has merged, and nowhere earlier; until then, you close the loop.

**One invariant above everything else: the orchestrator never opens a source file and never reads Notion JSON.**
It holds one row per ticket in a run ledger and delegates everything that would cost it context:

- **Board I/O** — SELECT, blocker resolution, claim, and handoff writes — is the
  [`board-agent`](../../agents/board-agent.md)'s job. It writes each ticket's body and acceptance criteria to a
  payload file and hands the orchestrator a path, never the body itself.
- **The build** is [`ticket-builder`](../../agents/ticket-builder.md)'s, one per ticket/instruction, in its own
  worktree, pinned to the `Assignee` model (`sonnet` for freeform, which has no `Assignee`).
- **PR prep and every review fix** are each their own dispatch (§ Procedure, § 4d, § PR feedback loop) — the
  orchestrator receives a verdict, never a diff.
- **Tests** are one consolidated dispatch per round, at § 4d's round close, before § 4e's review pipeline runs —
  never decided by the review lenses themselves.

The orchestrator runs from the **home tree** — wherever it was spawned — and never enters, creates, or removes a
worktree of its own, except an explicit user cleanup request once the run is fully merged (§ Full cleanup).

## Board constants

Full board constants (data sources, fields, options, relations) live in
[`task-board-schema.md`](../../rules/task-board-schema.md) — the `board-agent` reads it, not this skill. What
the orchestrator needs to judge a plan:

- **Only the Task Board named in `task-board-schema.md`** — never a backup or duplicate board.
- `Status` lanes this skill uses: pulls from `Ready`; claims to `In Progress`; lands at `Review`; parks stuck
  work at `Blocked`. Never sets `Duplicate`. Sets `Done` only at Full cleanup (§ Full cleanup).
- `Assignee`: `Fable` · `Opus` · `Sonnet` — the model each builder is pinned to. **`Assignee = Me` and `Status =
On Hold` are both hands-off** (user-owned) and never eligible.
- Freeform and mid-run out-of-scope work carries no ticket, so no `Status`/`Assignee` write ever touches the
  board for it.

## Blockers — a ticket is not takeable just because it's in the lane

`/groom` wires ordering between split siblings on the Task Board's **`Blocked By`** self-relation
(→[K:ticket-dependencies]). `board-agent` resolves it at SELECT and returns each candidate's blocked state;
reading it is the orchestrator's doctrine:

**The gate protects one thing: never land work against code that is about to change.** A blocker's `Status`
outside the `complete` group (`Done` / `Won't Do` / `Duplicate`) blocks the ticket — unless one of two things is
already true, neither overridden by `Status` alone:

- **The blocker's PR is merged**, while its ticket still reads `Review` — a ticket's `Status` only reaches
  `Done` at its own run's Full cleanup (§ Full cleanup), so the board lags every merge by design. Judge on
  whether the blocker's PR is actually merged, not its `Status` field (a stronger bar than "landed" in § 4's
  wave-gating sense, which only requires the branch merged forward, § 4a).
- **The dependent branch is stacked on the blocker's branch** (§ Fan out) — the blocker's code is already
  underneath it.

Auto-pull (no IDs, no `--epic`) uses the `Status`-only check. **Epic mode never re-gates a later wave on a
merge** — the wave order already sequences the stack, so once the user has chosen to work the epic, keep going
rather than waiting for each blocker's PR.

If a run finds every candidate blocked, say so and stop rather than reaching further down the queue for
something unrelated. Two siblings of one split are never both takeable under the default check — the `Blocked
By` relation means one waits, a chain worked a link at a time.

### A prose `## Blocked on` section is a different blocker

`Blocked By` (above) is Notion's structured ticket-to-ticket relation. Separately, a groomed ticket's **body**
can carry a free-text `## Blocked on` section recording an **external** blocker — an account to provision, a
domain to add, a secret to set — something no builder can resolve. `board-agent` fetches bodies at SELECT, so
this surfaces in the same pass as everything else, named at the first gate (§ The gate) rather than judged
mid-run. The orchestrator never guesses "doable anyway" — only the user knows whether it's actually cleared.

## Run ledger

The orchestrator's only state, written to a file in the session's scratchpad (never the repo), rewritten as
state changes: one row per unit of work — ticket/instruction → branch → worktree path → PR number → status
(building / testing / open / green / blocked / merged) → files touched (names only, from `--name-only`, never
content) — plus a **decision log**, one line per judgment call a builder, a test/PR agent, or the orchestrator
made. A long epic run is expected to hit context compaction; the ledger survives it, and is the index every
review-fix route in this file reads against.

## Procedure

### 0. HOME TREE

`pwd` and `git worktree list` once, at the start, and record the result as the run's home tree. Every git
command for the rest of the run is checked against that path ([`git-workflow`](../../rules/git-workflow.md)). A
single-ticket or freeform run stays on whatever branch the home tree already has checked out (or `master`,
cutting a feature branch per `git-workflow`); a multi-PR run checks out its integration branch here (§
Integration branch) and never anything else.

### 1. SELECT

Dispatch `board-agent` with `SELECT` and the run's mode:

- **Named IDs** — `ids: [...]`. Warn, don't silently skip, if one isn't `Ready` or is `Assignee = Me`.
- **No IDs, no `--epic`** — `auto: { count: N }` (default 1).
- **`--epic <name|url>`** — `epic: "<name|url>"`. Returns every `Ready`, unblocked ticket on that epic plus each
  one's `Blocked By` ids **within the epic**, so the orchestrator can compute waves (§ Fan out) — the epic's
  non-`Ready` tickets come back named, not selected; grooming them is interactive and out of scope for this run.
- **Freeform** — skip SELECT and the board agent entirely; there is no ticket.

`board-agent` returns a compact table (id, title, priority, assignee, blocked + reason, `## Blocked on` +
summary, payload path) and writes each candidate's body/AC to its own payload file. The orchestrator never opens
that file.

### 2. THE GATE — the first of two interactive pauses

Echo the plan from the SELECT table: what will be worked, in what order (waves, for `--epic`). Then echo
**everything it will not work**: ungroomed epic tickets, blocked rows, `Assignee = Me`, and any ticket carrying
a prose `## Blocked on` section. The user decides once, here, whether to work a `## Blocked on` ticket anyway.

Every echoed row — worked or not — carries its title alongside the id, since the SELECT table already returned
one; an id-plus-reason row makes the user ask for data you already have.

**After the user's OK, the run is uninterrupted until every branch is landed and tested** — no mid-run questions
until the all-work-done checkpoint (§ 4c), the second and last pause. Everything that used to pause in between
becomes a decision plus a ledger line (§ Run ledger) instead.

### 3. CLAIM — the wave about to be dispatched

`Ready` moves to `In Progress` only for the unit about to be dispatched, never for the whole run's approved plan
upfront — an epic ticket several waves out sits in `Ready` while an earlier wave is still off in `Review`, and
claiming it early only to leave it untouched misreports what's actually being worked. Named ids and auto-pull
are a single wave, so this step covers all of it; freeform has nothing to claim.

Dispatch `board-agent` with `CLAIM`, the ids due now, and `override_blockers` for any id whose blocker doctrine
(§ Blockers) already cleared it under the merged-PR or stacked-branch exception despite `Status` — that judgment
is the orchestrator's to make and hand down, never `board-agent`'s to re-derive. It re-checks each
non-overridden id is still `Ready` and unblocked, writes `Status = In Progress`, and reports which were dropped
(another run already grabbed it). Claim before dispatching so parallel runs don't collide.

**For `--epic`, this step claims only wave 1** — the tickets with no in-epic blocker, which need no
`override_blockers`. Every later wave claims itself at its own fan-out point instead (§ 4).

### 4. FAN OUT — one `ticket-builder` per unit of work

Dispatch all builders for the current wave in a single message (multiple `Agent` calls) so they run
concurrently. Each `Agent` takes `subagent_type: ticket-builder`, `isolation: worktree`, and `model:` = the
ticket's `Assignee` lowercased (`fable`/`opus`/`sonnet`), or `sonnet` for freeform.

The prompt carries **only the payload**: the payload file's path (or, for freeform, the instruction text
itself), the worktree's absolute path, and the conventional branch name to rename to. How a build behaves is
[`ticket-builder`](../../agents/ticket-builder.md)'s own definition — never restated here.

- **`ticket-builder` has no `Agent` and no `Skill` tool** — a depth-two agent reports to nobody the orchestrator
  can hear, and nothing here reintroduces the ask.
- **Irreversible or cross-ticket-critical work goes first** — the one build-order fact only this ticket knows,
  so name it in the payload.

**Epic mode fans out in waves**, not all at once. Wave 1 is every selected ticket with no in-epic blocker,
branching off `master`. Wave N is the tickets whose blockers each **landed** in wave N-1 (§ 4a) — wave gating
never waits on tests; those are written once, for every landed branch together, at § 4d's round-close dispatch.
**A ticket's `Blocked By` can name more than one in-epic blocker** — a wave-N builder's worktree merges every
one of that ticket's in-epic blocker branches into its base, never just the first or just `master`, before the
builder starts; how its PR reaches `master` is § 5c's call, not automatic stacking. **Cap a wave at ~4
concurrent builders** — split a larger wave into batches.

**Wave N ≥ 2 claims itself right here, before its builders dispatch** — § 3 only claimed wave 1. Dispatch
`board-agent` with `CLAIM` and this wave's ids, `override_blockers` on every one of them: each blocker's
`Status` still reads `Review`, not `Done`, at this point, and it's the epic-mode doctrine (§ Blockers, "never
re-gates a later wave on a merge") that already cleared it, the same override § 3 hands down for wave 1's
exceptions.

### 4a. LAND — the home tree updates the moment a builder reports back

**A finished branch reaches the tree the user is looking at before anything else happens to it** — before PR
prep, before CI runs at all, before any review. The instant a `ticket-builder` reports its branch done, merge it
forward into the integration branch on the home tree (single-ticket or freeform run: `git checkout <branch>`
directly, once the branch exists) — the merge-forward half of § 4d's dispatch-and-merge-forward mechanic, just
starting here instead of at teardown.

**Ticket-based work also gets a status-only board move here** — dispatch `board-agent` with `LAND` (`id`),
`run_in_background`, so the board tracks build status as it happens rather than only once a PR opens. This is
decoupled from § 5e's `HANDOFF`, which still carries the PR URL once one exists; don't wait on this dispatch's
result, it gates nothing. Freeform work has no ticket, so nothing to dispatch.

**Epic mode also checks for a cutover the moment a wave lands.** When this wave's files-touched set (§ Run
ledger) removes or replaces what an already-landed earlier wave edited, that earlier wave's code is
transitionally red, not merely conflicted — surface it at the next checkpoint (§ 4c) and offer the user a
choice: collapse the cutover tail into one ticket, or accept the earlier wave as transitionally red until the
later wave lands.

### 4b. KNOWLEDGE GAPS — dispatched the moment a branch lands

**The orchestrator dispatches `corpus-author` for every `[K:gap: …]` tag a builder left**, one background
`Agent` call per gap per [`self-heal`](../../rules/self-heal.md), the moment that branch lands (§ 4a) — before
step 5. The tag fails the knowledge check until the topic lands and the site cites it. A `COPY-TBD` a builder
left is **not** dispatched — no agent can settle wording — but doesn't hold the ticket either (§ Copy never
blocks the build).

**Tests are never written per-wave.** Builders never touch tests (golden rule); one consolidated dispatch, at §
4d's round close, covers every branch the round landed in a single pass (§ 4d). The full `vp test` suite is
never run locally; **CI is the gate**, watched in step 5.

### 4c. ALL-WORK-DONE CHECKPOINT — the second interactive pause

Once every branch's build is in (§ 4a), stop. Report progress: the integration branch's state (or the single
home-tree branch's, for a single-ticket/freeform run) — which tickets/instructions are through, and any `[K:gap:
…]`/`COPY-TBD` markers still open. No PR exists yet. The user reviews the live branch through their own dev
server and gives feedback from actually using it. § 5 waits until the user says the round is closed.

### 4d. LIVE REVIEW — pre-PR feedback on the branch the user is running

While the checkpoint is open, every piece of feedback is dispatched, never edited inline: a `ticket-builder`
works it in a throwaway worktree ([`git-workflow`](../../rules/git-workflow.md), →[K:worktree-write-target]),
commits, and reports back — except a running-only symptom (visual, animation, CSS-timing, layout), which
CLAUDE.md's golden rule requires observing live before fixing; `ticket-builder` carries no browser tool, so that
fix dispatches to `general-purpose` instead (the same browser-capable target § 5d uses), worktree-isolated the
same way, capturing the real running behavior before it fixes and commits. The orchestrator merges that branch
forward into the integration branch on the home tree (single-ticket or freeform run: the one branch already
checked out there). **This is the dispatch-and-merge-forward mechanic** — dispatch the fix to a `ticket-builder`
(or `general-purpose` per above), merge its branch forward on report-back, **then tear down that dispatch's own
worktree and the branch it ran on**: `isolation: worktree` hands each dispatch a fresh worktree on a
harness-created branch of its own, distinct from the ticket branch it checked out or merged; once its commits
are merged forward, both are dead weight. Remove the worktree per § 5f's removal check
(→[K:worktree-removal-survives-failure]), then delete the harness branch (`git branch -d`) so it doesn't outlive
the dispatch. This is in addition to, never instead of, the ticket-builder's own original worktree/branch (§ 5f,
§ Full cleanup) — reused verbatim by § 4e, § PR feedback loop, and § 4a's initial merge. Tests stay untouched
for the whole round — no per-fix test dispatch, no mid-round ask. Repeat fixes until the user says the round is
done, then **dispatch the round's test-writing pass**: a `general-purpose` agent, `isolation: worktree`
([`git-workflow`](../../rules/git-workflow.md), →[K:agent-dispatch-worktree-isolation]), `git checkout`s the
integration branch (or the single home-tree branch) into its own fresh worktree and runs the [`update-tests`
skill](../../skills/update-tests/SKILL.md) there — **one** consolidated pass over everything the round landed,
merged forward on report-back. Only then dispatch self-heal for this round (§ Self-heal) and start § 4e.

### 4e. REVIEW PIPELINE — the pre-PR review pass

Once the live-review round (§ 4d) is closed, run the review pipeline over the **integration branch** — `git diff
master...HEAD` on the home tree already carries every landed branch (§ 4a merged each one forward). Builders
write no code comments (CLAUDE.md's golden rule), so `comment-authoring` can't review this diff yet — nothing on
it for that lens to hold a comment against. The pipeline runs the non-comment concerns and the placement lens
first, sweeps in the comments a dedicated agent writes, then closes with `comment-authoring` reviewing that
sweep.

**Round 1 — every concern but `comment-authoring`.** Dispatch one
[`swarm-reviewer`](../../agents/swarm-reviewer.md) per remaining roster row in
[`review-work`](../../skills/review-work/SKILL.md) — `comment-placement`, `code-style`, `test-authoring`,
`test-integrity` — in a single message so they run concurrently, **each `Agent` call's `model:` set from that
concern's roster row** (opus for `comment-placement` and `test-integrity`, sonnet for the others), each running
`review-work --concern <name>` over that diff. **The count is the roster's, not the branch count**: a
nine-branch run is still one `swarm-reviewer` per concern. They are **read-only**, never edit. `test-authoring`
and `test-integrity` review the tests § 4d's round-close dispatch already wrote, same as any other finding — the
lenses judge those tests, never decide whether a branch needs any.

A **rule-family finding** (`code-style`, `test-authoring`) and a **`test-integrity` finding** route the same
way: the run ledger's _files touched_ column (§ Run ledger) maps the file to its branch (`git blame` the
integration line to break a tie), and the fix dispatches through **§ 4d's dispatch-and-merge-forward mechanic**
on the owning branch — a two-branch `test-integrity` finding is the orchestrator's routing call, attributed to
whichever branch fits more naturally or split across both. **A fix belonging to no branch already in flight
opens a new PR for it directly.** Repeat until `code-style`, `test-authoring`, and `test-integrity` all come
back `clean`.

`comment-placement`'s report is not a violation to fix — it's a **brief**: every site the diff earns a comment
at, plus the constraint that comment must carry (see `review-work`'s report shape). A `clean` brief (no sites)
skips straight to Round 3.

**Round 2 — the `comment-author` sweep.** Route each briefed site to its owning branch the same way a
rule-family finding routes (files-touched map, `git blame` tie-break) and dispatch through § 4d's mechanic,
[`comment-author`](../../agents/comment-author.md) as the target in place of a `ticket-builder`, handed that
branch's briefed sites verbatim; its branch merges forward the same way. **A briefed site whose file touches no
branch already in flight** opens its own branch/PR (Round 1's escape hatch, above). One sweep dispatch per
owning branch, not per site.

**Round 3 — `comment-authoring` reviews the sweep.** Dispatch `swarm-reviewer` for `comment-authoring` with
`--base` set to the integration branch's tip **before** Round 2's sweep commits landed, so the diff it reviews
is exactly the sweep's own commits. A gate finding routes to the owning branch, fixed by dispatching
`comment-author` again (never a `ticket-builder` — a comment is never its edit to make) through § 4d's mechanic,
merged forward; repeats until `comment-authoring` comes back `clean`.

**§ 5 does not begin until every concern — `comment-placement` (consumed into Round 2), `comment-authoring`,
`code-style`, `test-authoring`, `test-integrity` — is clean.** A run with no landed branches (all stuck) skips
this step entirely.

A single-ticket or freeform run has no integration branch — the one home-tree branch is the diff, and
attribution is trivial (one branch owns every finding). The swarm and routing are otherwise identical.

### 5. ORCHESTRATE PRs

Once § 4e comes back clean on every concern, turn every landed branch into a PR. One PR per ticket/instruction:

a. **READINESS CHECK** — if a builder reported it couldn't satisfy acceptance, or left `vp check` red it
couldn't fix, don't open its PR; treat the ticket as stuck (§ Stuck / blocked).
b. **CONFLICT CHECK**, exit codes only — never dump merge output into this session. For each finished branch,
verify it merges cleanly into current `master` (`git merge-tree` / dry-run merge), then test-merge **every
pair** of finished branches against each other (`--name-only` for which files collide, never their content)
to catch cross-PR conflicts.
c. **RESOLVE** — a branch clean vs `master` and vs its peers gets a PR **based off `master`**. When two
branches conflict but the overlap is mechanical, **stack** the dependent PR on the other. A `Blocked By`
relation **decides the stack direction** — the blocker is the base; never invert it, never guess a direction
the relation already states. **A branch whose worktree base merged more than one in-epic blocker (§4) never
opens as a stack once those blockers' own PRs have already merged to `master`** — a PR still carrying a merged
sibling's commits conflicts across every shared file, so rebuild it first as only its own commits,
cherry-picked onto current `origin/master`, force-pushed, then run the conflict check against that. **That
rebuild verifies every intermediate branch in the stack, not just the tip** — `vp check`/`pnpm type-check`
each cherry-picked commit before any reaches a PR; a broken interior link with no CI run of its own is exactly
what turns into a CI-only failure later. **No PR opens on this stack until its rebuild finishes** — step (d)'s
OPEN dispatches never run concurrently with a rebuild still mutating the same branches, since `prepare-pr`
itself force-pushes/rebases the branch it's handed and would race the rebuild on the same commits. A conflict
needing **genuine human judgment** (semantic overlap, incompatible approaches) is not guessed at: **raise it**
in the final report and park that ticket `Blocked`.
d. **OPEN**, dispatched — for each non-blocked branch, a `general-purpose` agent runs the **`prepare-pr`**
skill with `--branch <branch> --base <master|peer-branch> --ticket <ID> --ticket-url <url> --acceptance
<payload-path>` (freeform: no `--ticket`/`--ticket-url`/`--acceptance`) → one PR titled `TARO-<ID>: …` whose
body answers every acceptance criterion, watched to green. The dispatched agent reads the diff and writes the
PR body; the orchestrator receives only the PR URL and green/red. `prepare-pr` never checks a branch out, so
PR prep can't move a tree out from under the user.
e. **HANDOFF**, dispatched — for each opened, green PR, `board-agent` with `HANDOFF` (`id`, `pr_url`): sets
the ticket to `Review`, appends the PR URL into the ticket body.
f. **TEAR DOWN** — once a ticket is handed off (PR open + green, branch pushed to origin), remove the
builder's worktree per [`git-workflow`](../../rules/git-workflow.md)'s removal check
(→[K:worktree-removal-survives-failure]) — every other teardown site in this file (§ 4d, § Full cleanup)
cites this one rather than restating it — then `git worktree remove <path>` from the home tree, once you've
confirmed via `pwd`/`git worktree list` you're not removing the one you're standing in. The branch lives on
origin and its local ref survives removal. Only tear down **successful** tickets here; a stuck one keeps its
worktree (§ Stuck / blocked); teardown never gates what the user sees, since the home tree updated at § 4a
already. **This isn't gated on handoff succeeding** (→[K:worktree-removal-survives-failure]) — removal is an
obligation of how the run ends, not a line that only runs once every earlier step succeeds, so a run that
fails or is interrupted before handoff still checks and removes every worktree it made (a stuck ticket's
excepted) before it stops.

**Copy never blocks the build.** A PR whose only red check is the knowledge check's `COPY-TBD` marker still
opens, still counts as this run's output — it is not stuck, and the run does not wait on it. List it in the
final report instead, with three varied wording options per unsettled string; the PR goes green once the user
picks.

### 6. STUCK / BLOCKED

A ticket is stuck when its builder can't satisfy acceptance, its CI won't pass after real effort (and the
failure isn't a lone `COPY-TBD`), or a conflict needs human resolution. Dispatch `board-agent` with `BLOCK`
(`id`, reason): sets `Status = Blocked`, appends a one-line reason + what's needed into the body. Leave its
branch/worktree in place for the human. Never silently fail or leave a ticket stranded in `In Progress`.

### 7. REPORT

Tally: worked → `Review` (PR links, noting stacked pairs and epic waves), `Blocked` (reasons + which need human
conflict resolution), waiting on copy (the string options), skipped. Then enter the **PR feedback loop** below.

- **Decisions & assumptions** — one line per entry in the run ledger's decision log. No narrative.

## Mid-run intake

The user can hand the session more at any point — another ID, `--epic`, a freeform instruction, or an
out-of-scope side request. Each is appended to the run ledger as a new row and dispatched as its own builder (§ 4) the moment it lands — an out-of-scope request gets a builder too, never done inline by the orchestrator.
Nothing already in flight is disturbed.

## Integration branch

**A run producing more than one PR builds `integration/<epic-or-run-slug>`**: `master` plus a merge of every
live ticket branch. The home tree checks it out at step 0 and **stays on it for the rest of the run** — that is
the tree the user's dev server points at, showing every wave at once. It is local only, never a PR, and
re-derivable at any moment (re-merge `master` plus the live branches), so a merged PR or a new wave just
rebuilds it. A merge that conflicts is a real cross-PR conflict, handled exactly as § 5b/c already handles one.
A single-ticket or freeform run has no integration branch — the home tree tracks that one branch instead,
checked out the moment the builder reports (§ 4a).

## PR feedback loop (post-PR)

Opening the PRs is not the end of the run — it's a second, lighter round after the live-review round (§ 4d)
already closed once. After PRs are open the run **stays live and waits for the user's feedback**. The user
reviews the PRs themselves and will usually come back **one PR at a time**, leaving comments.

Every follow-up — PR review feedback, a red CI run, or any other fix a PR needs — is dispatched by **§ 4d's
dispatch-and-merge-forward mechanic**, on the owning ticket branch: nothing new to learn here, only the round is
lighter and the target is a PR rather than a checkpoint. Fixes to different PRs no longer serialize — only the
merge-forward does.

1. **Routing is the run ledger's job.** Feedback left on a PR carries its number and routes itself. Feedback
   given in chat routes by matching subject and touched files against the ledger's file index; genuinely
   ambiguous feedback asks — safe here since this is all post-handoff, past both gates.
2. **Leave tests alone until the user asks.** Default to **not touching tests** during the feedback loop — the
   golden "no tests" rule is back in force. Do **not** run `update-tests` per fix. When the user says they're
   ready, dispatch the same test-writing pass § 4d's round close runs, scoped to `<branch>` instead of the
   round's integration branch.
3. **Batch the gate and the push per PR — don't run either per item.** Apply and commit each piece of feedback
   as it comes; hold `vp check` and the push until the user signals the round is done, then run it once and push
   once for that PR's batch. CI green again closes the round — no local full-suite run.
4. **Answer the thread.** PR feedback gets a reply prefixed `🤖 Claude:`; chat feedback is answered in chat.
   Leave the ticket in `Review`.
5. **Dispatch self-heal for this round before starting the next PR** (§ Self-heal) — every standing preference
   the user stated this round, not only claim/handoff/review mechanics.

Repeat per PR until the user merges (§ What this skill does).

## Full cleanup

"Cleanup" from the user means the run's own home-tree worktree and session branch too, not just the builder
worktrees § 5f already reclaims — do this only once every PR this run produced is merged.

**Every merged-PR ticket the run worked moves to `Done` here, and nowhere earlier** — dispatch `board-agent`
with `DONE` (`id`) for each; freeform work carries no ticket, so nothing to set. A ticket the run parked
`Blocked` stays `Blocked`; only a ticket whose PR actually merged reaches `Done`.

A worktree can't remove itself: run it from another checkout, per § 5f's removal check
(→[K:worktree-removal-survives-failure]), then `git worktree remove` it and delete its now-merged branch (local,
and `origin` if it was pushed).

## Self-heal

Run every review correction through [`self-heal.md`](../../rules/self-heal.md), separate from the ticket PR.
Specific to this skill:

- The **orchestrator** dispatches, in the background, and returns to whichever loop is active (§ 4d, § PR
  feedback loop) — builders and fix worktrees are gone by the time feedback lands, so it never pauses the run to
  write a rule itself.
- Review feedback is this skill's richest signal. A miss about **claim, PR handoff, or review mechanics** heals
  this skill; a miss about the **code** routes by the table in the rule.
- Gate 2 (execution, not spec): feedback showing the _ticket / AC_ was wrong is a `/triage`–`/groom` miss — note
  "needs regroom", fix the PR, don't heal here.
- Several PRs in one run multiply the signal: the **same correction on multiple PRs in one run** is a
  high-confidence gap — weight it up at gate 1.
- The healing PR is autonomous; the user's review confirms or kills the generalization, so there's no inline
  confirm mid-run. Several dispatches across a run stack onto that one PR.
- The maintainer-sweep condition in `self-heal.md` (§ Dispatch) is checked at the round boundary, not per
  correction — `/work` defers its check until a round closes rather than sweeping mid-round while builders are
  running.
