---
name: work
description: Execute groomed Notion Task Board tickets. Two modes. `/work pair [ID]` works one Ready ticket interactively in this session — backend teaching on, you approve every change; tests stay untouched per the CLAUDE.md golden rule — then opens a PR. `/work batch [--count N] [--p0…]` pulls up to N Queued tickets routed to a model (Fable/Opus/Sonnet) and works them in parallel — one worktree-isolated subagent per ticket, each pinned to that ticket's model, each writing its own tests and cleaning up its worktree when done. Subagents report back to this session (the orchestrator), which organizes the branches into non-conflicting, CI-passing PRs. Both claim the ticket to In Progress first, open a PR (Review), then iterate on your review feedback via a main-workspace subagent that checks out the PR branch — never merge. The golden "no tests" rule is suspended only in batch mode; pair mode leaves tests alone. Trigger on `/work`, "work the board", "work a ticket".
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, Agent, Skill, EnterWorktree, ExitWorktree, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page
argument-hint: 'pair [<ID>] | batch [--count N] [--p0|--p1|--p2|--p3]'
arguments:
  - name: pair
    description: Interactive mode — work one Ready ticket with you in this session. Explores the code, then pauses for a bird's-eye plan review before implementing. Optional ID; else top by priority (oldest first).
  - name: batch
    description: Autonomous mode — work Queued tickets routed to a model, sequentially, each ending in a PR.
  - name: --count N
    description: batch only — how many tickets to work in parallel this run, one worktree-isolated subagent each (default 1).
  - name: --p0|--p1|--p2|--p3
    description: batch only — restrict to this priority.
  - name: <ID>
    description: pair only — the specific ticket to work.
lastUpdated: 2026-08-01T20:00:00Z
---

## What this skill does

Pulls a groomed ticket off the board, does the work, and lands it at an **open PR** for your
review. It never merges and never marks a ticket `Done` — you close the loop.

Two modes, chosen by the first arg. They differ deliberately:

|                 | `pair`                              | `batch`                               |
| --------------- | ----------------------------------- | ------------------------------------- |
| Source lane     | `Status = Ready`                    | `Status = Queued`                     |
| Model           | **this session's** model            | each ticket's **`Assignee`**          |
| Execution       | interactive, in-session             | parallel subagents, one worktree each |
| Backend persona | **on** (teaching)                   | **off**                               |
| Your approval   | **every change**                    | none — you review the PR              |
| Tests           | **not touched** (golden rule holds) | each subagent writes its own          |
| Ends at         | open PR → `Review` + feedback loop  | open PR → `Review` + feedback loop    |

**The golden "never touch tests" rule is suspended only in `batch` mode.** Batch subagents (and
batch feedback-fix subagents) write their own coverage for what they changed and repair any test
their change broke, inline — they do **not** invoke the `update-tests` skill. **`pair` mode does not
touch tests at all** — the CLAUDE.md golden rule holds in full: no checking, running, writing, or
updating tests, even when a change clearly should have them. At most note in one line that tests may
need attention, then leave them; the user will invoke test work explicitly (e.g. `/update-tests`).

## Board constants

- **Task Board** data source: `collection://3630953c-224c-8065-8864-000bb9fe7bad`. Full board
  constants live in [`ticket-authoring.md`](../../rules/ticket-authoring.md).
- `Status` lanes this skill uses: pulls from `Ready`/`Queued`; claims to `In Progress`; lands at
  `Review`; parks stuck work at `Blocked`. Never sets `Done`/`Duplicate`.
- `Assignee`: `Fable` · `Opus` · `Sonnet` — which agent model works the ticket in batch.
  **`Assignee = Me` and `Status = On Hold` are both hands-off** (user-owned) and never batch-eligible.
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
say so and stop rather than reaching further down the queue for something unrelated.

## Claim protocol (both modes, per ticket)

Before touching any code, **claim atomically**: write `Status = In Progress` via
`notion-update-page`. Re-query the source lane first — if the ticket is no longer there
(someone/another run grabbed it), skip it. This is what stops two runs
colliding on the same ticket.

---

## Mode: `pair [ID]`

Interactive, in **this** session, using **whatever model the session is running** (ignore the
ticket's `Assignee`).

1. **SELECT** — query the Task Board `WHERE "Status" = 'Ready' ORDER BY "Priority" ASC,
"userDefined:ID" ASC`, selecting `"Blocked By"` alongside the usual properties (or take the given
   `<ID>`). Auto-picking takes the **first unblocked** row. Fetch its page body via `notion-fetch`.
   Echo what you're about to work.

   **If the ticket is blocked** (§ Blockers): when the user named it explicitly, say which open
   blocker stands in the way and ask before claiming — their call, they may know it's fine. When
   auto-picking, skip it silently and take the next.

2. **CLAIM** → `In Progress`.
3. **BRANCH** — conventional branch off `master` matching the ticket (`fix/…`, `feat/…`).
4. **EXPLORE & ALIGN — before any code.** Read the relevant code to ground the ticket in reality
   (no edits yet). Then **stop and present a bird's-eye plan for approval** — this checkpoint is
   mandatory; do **not** start implementing until the user has responded. Keep it high-level and
   concise (the user wants the shape, not a wall of text):
   - **The plan in brief** — the handful of steps/changes you intend to make, at altitude. Name the
     key files/components involved, not line-by-line edits.
   - **Assumptions & open decisions** — call out every design or feature detail you'd otherwise
     just assume: UX/interaction choices, edge-case handling, scope boundaries, naming, which
     variant/pattern to follow. Surface them **explicitly as questions**, don't bake them in
     silently. This is where the user talks through decisions before they're made.
   - **Pushback surface** — flag anything in the groomer's spec that looks like a hole, is
     ambiguous, seems unnecessary, or that you'd propose doing differently. Make it easy for the
     user to cut or redirect scope here.

   Wait for the user to react — they may trim scope, correct an assumption, or reshape the
   approach. Fold their answers in, then proceed. If they redirect materially, re-summarize the
   adjusted plan before coding.

5. **IMPLEMENT — together.** Work through the acceptance criteria (as adjusted in step 4) in small
   steps. **Pause for approval on every change.** If the `Area` touches `supabase/**` (migrations,
   RPCs, RLS, edge functions), the backend teaching persona is **on** — teach as you write per
   CLAUDE.md. **Do not touch tests** — the golden rule holds in pair mode (see the callout above);
   at most note in one line that tests may need attention, then leave them. Follow all
   `.claude/rules/*`.
6. **PR** — invoke the **`prepare-pr`** skill with `--ticket <ID> --ticket-url <url>` (the ticket's
   ticket's `<ID>` and its Notion page URL) so the PR title is prefixed `TARO-<ID>:` and the body
   opens with a `[TARO-<ID>](<url>)` link (commits,
   conventional messages, lint+type gate, opens one PR, watches CI to green).
7. **HANDOFF** — set the ticket to `Review` and append the PR URL into its body via
   `notion-update-page` (append, don't clobber the body). Then enter the **Review & feedback loop** (below)
   and wait for the user's feedback.

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

1. **SELECT** — `notion-query-data-sources`:

   ```sql
   SELECT "userDefined:ID" AS id, "Name", "Priority", "Assignee", "Blocked By", url
   FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
   WHERE "Status" = 'Queued' AND "Assignee" IN ('Sonnet', 'Opus', 'Fable')
   ORDER BY "Priority" ASC, "userDefined:ID" ASC
   ```

   `--pN` adds `AND priority = Highest|High|Medium|Low`; `--count N` sets **how many tickets to work
   in parallel** (default 1). **Drop every blocked row** (§ Blockers) before taking the top `N`
   (highest priority first, lowest ID as stable tie-break). `On Hold` and `Assignee = Me` tickets are
   naturally excluded by the WHERE. Echo the plan (ID · priority · assignee) before starting, and
   name any ticket skipped for an open blocker so the queue's shape is visible.

   Two siblings of one split are never both takeable — the `Blocked By` relation means one waits.
   Batch is for **independent** tickets; a chain is worked a link at a time.

2. **CLAIM ALL** — for each selected ticket, re-check it's still `Queued` **and still unblocked**,
   then write `Status = In Progress`. Drop any that another run already grabbed. Claim before dispatching so parallel runs don't collide.

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
   PR on the other (base its branch on the peer's branch) so it merges cleanly. If the two tickets
   carry a `Blocked By` relation, **that decides the stack direction** — the blocker is the base;
   never invert it, and never guess a direction when the relation already states it. When a conflict needs
   **genuine human judgment** (semantic overlap, incompatible approaches), do **not** guess:
   **raise it** in the final report and set that ticket to `Blocked`.
   d. **OPEN** — for each non-blocked ticket, invoke the **`prepare-pr`** skill with `--ticket
<ID> --ticket-url <url>` (the ticket's `<ID>` and its Notion page URL) → one PR titled
   `TARO-<ID>: …` whose body opens
   with a `[TARO-<ID>](<url>)` link. Pass the stack base when the PR is stacked. `prepare-pr` watches
   CI; **a PR isn't done until it's green.** If CI fails, route it through the **Review & feedback
   loop** (below) — a main-workspace fix subagent on the PR branch; if it still can't pass after real
   effort, treat the ticket as stuck.
   e. **HANDOFF** — for each opened, green PR: set the ticket to `Review`, append the PR URL into
   the ticket body via `notion-update-page` (append, don't clobber the body).
   f. **TEAR DOWN** — once a ticket is handed off (PR open + green, branch pushed to origin),
   **remove its worktree**: `git worktree remove <path>`. The branch lives on origin and its local
   ref survives worktree removal, so the human can `git checkout <branch>` in the **main** working
   copy to review it against their local dev server — which a worktree checkout can't feed. Then
   delete any leftover `worktree-agent-<id>` placeholder branch (`git branch -D`) if a subagent left
   one behind. Only tear down **successful** tickets here; blocked ones keep their worktree (step 5).

5. **STUCK / BLOCKED** — a ticket is stuck when its subagent can't satisfy acceptance, its gate or
   CI won't pass after real effort, or a conflict needs human resolution. Set it to `Blocked`,
   append a one-line reason + what's needed into the body, and leave its branch/worktree in
   place for the human. Never silently fail or leave a ticket stranded in `In Progress`.

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
2. **Fix — plus a test pass in batch only.** The subagent makes the code change. In **batch**, it
   also does a fresh test pass alongside — new coverage for the new behaviour plus repairs to any
   test the change breaks (golden "no tests" rule stays suspended for batch). In **pair**, it does
   **not** touch tests — code change only, with at most a one-line note that tests may need
   attention.
3. **Gate, push, watch green.** Run `vp check` + `vp test`, push to the PR branch, and watch CI to
   green (via `prepare-pr` or directly). A PR isn't done until it's green again.
4. **Answer the thread.** Reply to the feedback on the PR prefixed `🤖 Claude:` so the user can tell
   your replies from their own. Leave the ticket in `Review`.

Repeat per PR until the user merges. **Never merge and never set `Done` yourself** — that stays the
user's call, exactly as at first handoff.

## Self-heal

Review feedback is this skill's richest signal — the user reviews each PR and says, in effect, "we
don't do it this way." Run every correction (PR-review comments, and live pushback in `pair`) through
four gates; what survives is a **defect in the codebase's rules**, healed per
[`self-heal.md`](../../rules/self-heal.md) — the shared living-PR mechanics — separate from the ticket
PR.

1. **Execution, not spec.** If the feedback shows the _ticket / AC_ was wrong or ambiguous, that's a
   `/triage`–`/groom` miss, not this skill's — note "needs regroom", fix the PR, don't heal here.
   Only a **correct-ticket / wrong-code** miss continues.
2. **Generalizes.** Restate the correction as a standing rule: true on the _next_ ticket, or only
   this one? Instance-only ("the count should be 5") → fix the PR, no heal.
3. **Code, or the pass.** About prep depth, claim, PR handoff, or review mechanics → heal **this
   skill**. About the code itself → gate 4.
4. **Gap, not adherence.** Grep the corpus first — CLAUDE.md, `.claude/rules/*`, memory feedback:
   - **No rule** → write one, routed by scope: repo-wide → a CLAUDE.md guideline; a domain that has a
     rule file → extend it; a domain with none → a new path-triggered `.claude/rules/*.md`. Bias
     toward extending the nearest file; create a new one only when the lesson would be off-topic in
     every existing one.
   - **Rule exists but vague or misplaced** → sharpen or relocate it. This is a heal.
   - **A clear rule already existed** → an _adherence_ miss, not a corpus gap; leave it — **unless**
     the same clear rule is violated repeatedly (across PRs this batch, or across sessions), which
     means it's weak, misplaced, or not loading, and that _is_ a heal (strengthen, relocate, or make
     it path-load).

Batch multiplies the signal: the **same correction on multiple PRs in one run** is a high-confidence
gap — weight it up at gate 2. The healing PR is autonomous; the user's review of it confirms or kills
the generalization, so there is no inline confirm mid-run.

## Guardrails

- Only ever touch the Task Board named in the rule — never a backup/duplicate board.
- **Never merge, never set `Done`.** Opening the PR is a handoff into `Review`, not the end — the
  run stays live through the feedback loop until the user merges. Merging is always the user's call.
- Claim before coding; re-check the lane to avoid double-work.
- **Never work a ticket with an open `Blocked By` row** (§ Blockers) — batch skips it silently, pair
  asks first when the user named it explicitly. Lane membership alone doesn't make a ticket takeable.
- Batch never runs the backend teaching persona and never works an `On Hold` or `Assignee = Me`
  ticket (those are the user's hands-off, and aren't `Queued` anyway). These are mode contracts — don't cross them.
- **Tests: batch only.** The golden "no tests" rule is suspended **only in batch** — batch
  subagents write/repair their own tests inline (never via `update-tests`). **Pair never touches
  tests** (golden rule holds); it only notes, in one line, that tests may need attention and leaves
  them for the user to pick up explicitly.
- One PR per ticket (via `prepare-pr`). Don't batch multiple tickets into a single PR.
- Self-heal ships to the shared `self-heal` PR (§ Self-heal), never merged and separate from ticket
  PRs — a rule fix rides its own stream, never a ticket branch.
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
