---
name: groom
description: Deep second pass over a single Notion Task Board ticket sitting in `Needs More Info`. Resolves every open design decision with the user through conversation — surfacing assumptions as explicit questions, pushing back on the spec, verifying claims against real source rather than recall — then writes the decisions and their rationale into the ticket, assigns a model, and lands it in `Ready`, then waits for the user's review comments. Owns splitting work into the smallest independently-verifiable tickets (wiring the `Blocked By` relation between the siblings), recording external blockers, and keeping the epic's decision log and fog current. Technical and concise. Trigger on `/groom`, "groom this ticket", "resolve the design on X".
allowed-tools: Read, Grep, Glob, Bash, Agent, WebFetch, WebSearch, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page, mcp__notion__notion-create-pages, mcp__notion__notion-search
argument-hint: '[<ID>]'
arguments:
  - name: <ID>
    description: Numeric ticket ID to groom. Omit to take the top `Needs More Info` ticket by Priority → ID.
lastUpdated: 2026-08-02T00:00:00Z
---

## What this skill does

Groom is the **second** of two grooming passes. `/triage` located the work and routed it here
because it carries unresolved design decisions. Groom **resolves them with the user**, records
what was decided and why, and lands the ticket executable.

```
Needs More Info ──/groom──┬──► Ready              (decisions resolved, model assigned)
                          ├──► split into N tickets
                          ├──► On Hold            (turned out to need product input, or premature)
                          └──► stays put          (blocked on an external fact)
```

Landing `Ready` is the finish line, but it opens the user's review first. Expect the user to leave
inline comments on the ticket and ping you to read them; folding those into the ticket is part of
every grooming session (§7). If the user leaves no review, the session is done — `Ready` is where
`/work` pulls from.

One ticket at a time, conversationally. This is the opposite of `/triage`'s batching — depth is
the whole point.

Do **not** touch tests. Do **not** write code. This skill reads code and writes Notion.

## The core rule

> **Resolve. Do not enumerate.**

A groomed ticket must not contain "options to evaluate", "e.g. X or Y", or an acceptance criterion
hedged with a parenthetical alternative. Every one of those is a decision handed to an
implementation agent that has less context than this session does.

"Decide during pairing" is not a resolution — it is the thing this pass exists to remove. That
includes **taste calls**: which icon, what an animation feels like, what the copy says, how a layout
should look. Those are resolved _with the user, here_, not deferred into implementation.

The sole exception is a decision blocked on an **external fact** nobody in the session has (§4) —
recorded under `## Blocked on`, never left as an unmarked menu.

### Resolve to buildable, not to gist

A decision is resolved only when an implementer can build it **without one design or taste choice of
their own**. Every answer spawns finer ones — a "header toggle" needs a _side_; a "floating bar"
needs a _host_ (which primitive, which slot). After each answer ask **"what would someone still have
to invent to build exactly this?"** and resolve that too, recursively.

Pin every **design** dimension of a UI element (UX decisions, not implementation): **placement**
(side, order) · **host** (component / primitive / slot) · **trigger** (how invoked; what it swaps or
coexists with) · **label + icon** (signed-off copy) · **states** (default, disabled, empty, count) ·
**sound** (which of its interactions get a cue, and which `src/sfx/` key — or explicitly none).

Three traps this closes:

- **"Mirror/match X" is itself a gist.** Walk each mirrored element and confirm it fits the new
  context — parity that reads wrong (a "Move Deck" button on a cross-deck surface) is not resolved.
- **Survey the seam.** Before placing new content at an existing seam (slot, store, registry, layout
  region), inspect how its sibling content is _owned_, not just whether the seam is empty. "Is the
  slot empty?" is the wrong question; "how is its neighbour owned?" is the right one.
- **Resolve within the user's stated mechanism — never substitute your own.** When the user has said
  _how_ something works ("keep the first 10, curate by reordering"), pin the dimensions of _that_
  design; do not invent a richer mechanism they didn't ask for (a keep-toggle, a counter, a
  block-at-cap rule) and then resolve _its_ finer questions. That is the exact assumption this pass
  exists to prevent — inventing a mechanism is worse than leaving a gist, because it manufactures
  fake decisions and buries the real design under them. If a stated mechanism seems to leave a gap,
  surface the gap as a question against their design; don't paper over it with a design of your own.

Gist is the first question, never the last — but a mechanism the user already named is an answer, not
an invitation to redesign.

### Copy is signed off, not settled silently

For every new or changed user-facing string, **pause** and present **at least 3 reasonably-varied
options per line**; only the user's chosen wording lands, verbatim, in the AC. Reused copy is stated
as reused. Undecided copy keeps the ticket out of `Ready`.

## Board constants

The board **schema** — data sources, every field and its option list — lives in
[`task-board-schema.md`](../../rules/task-board-schema.md); the **body section list, brevity rules, and
voice** live in [`ticket-authoring.md`](../../rules/ticket-authoring.md). Read both before writing
anything to the board. This skill declares only its lanes and its own passes.

- Lanes: pulls from `Needs More Info`; lands at `Ready`; may park at `On Hold`. Never sets
  `In Progress` / `Review` / `Done` / `Blocked`.
- **Retype to `Spike`** when grooming reveals the deliverable is a decision or recommendation rather
  than shipped behaviour — and drop the now-redundant `"Spike:"` title prefix.

## Reporting voice

This governs the **chat**; ticket bodies follow
[`ticket-authoring.md`](../../rules/ticket-authoring.md).

**Open at altitude, in product terms; drop to detail on demand.** The first present — the
checkpoint — is a bird's-eye view: what the ticket changes for the user and the decisions that need
settling, phrased the way a user would experience them. **No filepaths, symbols, or SQL in that
opening** — it should be scannable in seconds, never a wall of text.

**Grooming is expensive for the user's attention — spend it only on decisions.** The checkpoint has
a hard ceiling: a one-line framing plus the open decisions, nothing else. If a draft runs longer,
it's carrying something the user didn't need — cut it before sending. Two things routinely bloat it:

- **Don't re-narrate what the user already knows.** They read the ticket. On a re-groom they wrote
  it. Skip the "what this changes" recap unless a decision hinges on it — go straight to the forks.
- **A settled point is not a talking point.** State it in one clause and move on; don't walk the
  reasoning that settled it unless asked.

The technical depth isn't gone, it's deferred. As the user drills into a decision, that's where
filepaths, symbols, SQL, and API surface come out — resolving the decision requires them. Pull them
in **per decision, on demand**, not all up front. (A purely internal decision with no product
framing — e.g. a composable's return shape — stays one plain line; hold the mechanism until it's
opened.)

Either way, no walls of text:

- A decision is **one line of what + one line of why**, not an essay.
- Options go in short lists or a table, never prose comparison.
- Long detail belongs in the ticket body, not the chat.
- Lead with the recommendation, then the trade-off.

## Procedure

### 1. SELECT

```sql
SELECT "userDefined:ID" AS id, "Name", "Type", "Priority", "Epic", "Assignee", url
FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
WHERE "Status" = 'Needs More Info'
ORDER BY "Priority" ASC, "userDefined:ID" ASC
```

Take the given `<ID>`, else the top row. Fetch its page body with `notion-fetch` — the query returns
properties only, and `/triage` already wrote a body with the open forks recorded; build on it, don't
restart. Echo which ticket you're grooming in one line.

Leave `Status` alone. Grooming doesn't claim.

### 2. INVESTIGATE — and verify

Read the code the ticket touches. Then go further than `/triage` did, because decisions rest on
facts:

- **Verify every claim against source, not recall — including the mundane ones.** Library API
  surface and version history are the obvious traps; "does this trigger still exist", "what does
  this column read/write", "what does this component do at this breakpoint" are the ones that
  actually get skipped. Read the installed types (`node_modules/`, the Deno cache), the lockfile,
  `git log -S`/`-L`, the actual policy or migration. Cheap to check, expensive to get wrong.
- **A subagent's report is not source.** Open the file an Explore agent's finding points to yourself
  before asserting it as fact.
- **Supporting markup or CSS is not evidence the state it handles occurs** — see
  [`authoring.md` → Label a guess](../../rules/authoring.md). Never write an AC premised on a
  rendering state (overflow, clipping, a scrollbar showing) without confirming it against the real
  content and container first.
- **Label every fact spoken to the user, not just what lands in the body**, as
  `CONFIRMED (verified against <source>)` or `ASSUMED` — a claim in the checkpoint or the
  back-and-forth steers a decision before any AC is written.
- **Trace the failure modes.** For anything spanning two systems with no shared transaction, work
  out what breaks if one side succeeds and the other doesn't — the ordering is usually the decision.

Dispatch parallel `Agent` (Explore) subagents when the surface is wide.

### 3. PRESENT the decisions ▸ CONVERSE

This is the heart of the skill — but the **opening present is a bird's-eye checkpoint, in product
terms**, not a technical brief. Keep it scannable; the detail arrives as the user drills in
(§Reporting voice). Present, in one concise pass:

- **What this changes, at altitude** — a line or two on what the ticket does for the user, in the
  terms they'd experience it. Not a file-by-file plan.
- **Open decisions, as explicit questions.** Every design or feature detail you would otherwise
  silently assume: naming, UX choices, edge-case handling, scope boundaries, which pattern to
  follow. Phrase each as the choice a user would recognise where it has one; one line, with a
  recommendation. **Surface them — never bake them in.** Hold the filepaths and symbols until the
  decision is actually opened. **A checkpoint built entirely of mechanism questions is incomplete
  for a user-facing ticket** — include at least one on what it looks like, not just how it works.
- **Pushback surface** — anything in the spec that looks like a hole, is ambiguous, seems
  unnecessary, or that you would do differently. One line each; make it easy to cut or redirect
  scope.

Then **converse**. Expect the user to drill into individual decisions, and expect that drilling to
break some of your assumptions — that is the skill working, not failing. Rules for the exchange:

- **Answer the question actually asked**, at the depth asked. Don't re-present the whole plan.
- **Correct yourself plainly when wrong**, state that the recommendation changed, and move on. A
  reversal caught here is the cheapest it will ever be.
- **Check before asserting.** If a question turns on a fact, go read it rather than answering from
  memory.
- Iterate until the user is satisfied. There is no interruption budget here.

### 4. RESHAPE — split, park, or block

Only answerable once the design has resolved:

- **Split — bias toward it.** Once the design resolves, prefer breaking the work into the **smallest
  slices that each stand alone** over one large ticket. Smaller independently-landing tickets are
  what make autonomous `/work` agents manageable — each PR is reviewable and confirmable in
  isolation. Propose the split with a one-line scope each; groom owns this because size is only
  knowable after the design is settled.
  - **The floor is independent verifiability.** Every sibling must be something the user can confirm
    _works on its own_ once it lands — via a concrete check named in its ACs: exercising it in the
    running product, a query, an API / edge-function call, a script. Split as small as this allows,
    no smaller. A "step" whose only proof is that the _next_ step compiles is **not** a ticket — it
    has no standalone verification.
  - **Slice vertically, not by layer.** A migration-only or UI-only piece that is only demonstrably
    working once its sibling also lands fails the gate. Prefer thin end-to-end slices (a real, however
    small, observable capability) over horizontal layers. A chunk that genuinely can't stand alone
    folds **up** into the sibling whose landing makes it verifiable — it does not become its own
    ticket.
  - **Coordinate the order — a relation, never prose.** Say which siblings must **land in order**;
    that ordering becomes a `Blocked By` relation in §5. This matters more the more you split: an
    unwired sibling lets `/work` pick up a mid-chain piece with no way to know its blocker hasn't
    landed yet.
- **External blockers** — facts only the user can supply (a dashboard setting, a vendor account
  detail, a product call). Record under `## Blocked on` with what it blocks. If the ticket cannot
  land without one, it stays in `Needs More Info` and the report says why.
- **Wrong lane** — if it turns out to need product input rather than technical decisions, or is
  premature, propose `On Hold`.
- **Past the goal** — if resolving the design reveals this ticket (or a sibling) sits beyond its
  epic's scope, propose `Won't Do` plus a line on the epic's `## Out of scope`. Don't resolve work
  that shouldn't happen.
- **Newly exposed fog** — a resolved decision routinely exposes adjacent questions. Sharp enough to
  phrase → a new ticket. Not sharp enough → the epic's `## Not yet specified`. Never invented into
  a ticket to look thorough.
  - **Before proposing a new ticket, search the board by more than topic words.** A ticket is
    routinely named for the surface it lives on ("Update Welcome Page Footer"), not the topic
    buried inside it ("privacy policy"). A keyword search that misses a ticket by that name and
    then tells the user none exists is a false negative, not a clean board — broaden the search
    (surface/page names, the epic's sibling tickets) or ask the user before proposing a new one.

### 5. WRITE

Rewrite the ticket's **page body** via `notion-update-page` — prefer `replace_content` for a full
rewrite over a chain of `update_content` edits. Any splits become new tickets via
`notion-create-pages`.

Sections and their shape live in [`ticket-authoring.md`](../../rules/ticket-authoring.md). Groom
turns each resolved decision into a **product-observable acceptance criterion**, plus a terse
companion line in `## Tech details` for the seam / mechanism / reuse pointer it rides on — so the ACs
stay pure product language — and **deletes `## Open questions`** as it goes. **There is no
`## Decisions` section**; a decision that only reads as an ordered plan still lands as ACs, not a
plan. Groom also owns `## Blocked on`, and writes no `Files` / `Implementation steps` narration —
`## Tech details` is terse pointers, not a file-by-file plan.

**The resolution is the deliverable, not the investigation.** Grooming reads far more than it
records: most of what you learned settling a decision is rediscoverable in seconds and does not
reach the body. Prefer **bullets over numbered lists** — Notion renumbers ordered lists and
the churn shows up as page-history noise.

**Wire the ordering.** Where a split named siblings that must land in sequence, set **`Blocked By`**
on each dependent sibling — never `Blocks`, which Notion fills reciprocally on its own
(→[K:ticket-dependencies]). Siblings emitted with no
dependency are orphans — `/work` will pick up step 3 of 5 with no way to know step 1 must land
first.

**Update the epic** page: append the resolved ticket to `## Decisions so far` (gist + link, never a
restatement), add any approved fog to `## Not yet specified`, delete the fog bullet that this
session **graduated** into a ticket, and add any approved `## Out of scope` ruling.

Then set `Status = Ready` **and an `Assignee`** — the ticket is fully resolved and lands directly in
the lane `/work` pulls from.

- **`Assignee` is mandatory and is `Opus` or `Sonnet` only** — pick by fit: `Opus` for
  architectural, cross-cutting, ambiguous, or security/backend-sensitive work; `Sonnet` for
  well-scoped feature/bug work with a clear spec. **Never set `Fable`** — the user downgrades to
  Fable himself when he wants it. Never leave `Assignee` empty or `Me`. `/work` pins each subagent to
  this model.
- A ticket still carrying an unmade design or taste call does **not** reach `Ready`, even labelled
  "decide during pairing" — that is what `Needs More Info` is for, and this pass exists to settle it.
  The only thing that may ride into `Ready` is a decision genuinely blocked on an external fact
  (§4), recorded under `## Blocked on`; if the ticket cannot land without that fact, it stays in
  `Needs More Info`.

Also sweep for **copy that the change makes false** — existing `src/locales/en-us.json` strings
asserting the old behaviour ("this cannot be undone"). List them in the body as required edits.
Behaviour changes routinely leave lying microcopy behind.

### 6. REPORT

Three lines maximum: ticket → lane, decisions resolved (count), anything blocked, split, or parked
on the epic. No prose.

### 7. RESOLVE COMMENTS — the review loop

Landing `Ready` opens the user's review, but the session isn't waiting on it — if the user leaves no
comments, grooming is done. When the user does leave inline comments and pings you to read them:

- Read every open discussion with `notion-get-comments` (`include_all_blocks: true`, unresolved
  only) so you see comments anchored to specific ACs, not just page-level ones.
- Treat each comment as a reopened `/groom` question: answer at altitude, verify against source, and
  resolve to **buildable** — the same bar as §3. A comment may reopen a settled decision, expose a
  new one, or add an AC; a taste/design fork still goes back to the user, never baked.
- Fold each resolution into the body (ACs + companion `## Tech details`) and update the epic if the
  decision shifted a `## Decisions so far` gist or exposed fresh fog.
- Loop until the user is satisfied, or stops commenting — either ends the session; the ticket stays
  in `Ready` throughout.

The self-heal reflex still applies here: a comment that reveals a miss in how this pass runs heals
the skill (§ Self-heal), separate from the ticket edit.

## Quality bar

A groomed ticket is done when a fresh session with **no memory of this conversation** could execute
it without guessing. Test it by asking:

- Is every AC concrete — specific values, mechanisms, copy in the criterion, not "retries the save"?
- Does any AC contain "or", "either", a parenthetical alternative, or a second sentence?
- Does any clause survive the delete-test — rationale, plumbing, or a restatement of another AC? Cut it.
- Is `## Open questions` gone, and every fork it held now a concrete AC?
- Is a rejected path recorded as a negative AC, so no one re-proposes it?
- Is the prior art a `## Tech details` clause ("built from X"), and is every factual claim in the body `CONFIRMED`, not `ASSUMED`?
- If this was a split: is **every** sibling independently verifiable — a concrete standalone check
  named in its ACs — and can `/work` tell which must land first without reading all of them?
- For every UI element: are placement, host/slot, trigger, label/icon, states, and sound decided —
  or would an implementer still choose?
- Is every new or changed string the user-signed-off exact wording (≥3 options offered), and is
  reused copy marked as reused?
- Does any AC smuggle undecided design behind a competence claim, or grow into implementation mechanics (which belong on `## Tech details` lines)?
- Was each seam this ticket touches surveyed for how its existing content is owned?
- Do the ACs read as pure product language, with the technical encoding on companion `## Tech details` lines?

## Self-heal

Run every pushback through [`self-heal.md`](../../rules/self-heal.md). Routing specific to this
skill: a **process** miss (how this pass runs) → this skill; a **"what a ticket looks like"** miss →
the single source, [`ticket-authoring.md`](../../rules/ticket-authoring.md).

## Guardrails

- Only ever touch the Task Board and Epic Board named in the rule — never a backup or duplicate.
- Never write code, never touch tests, and never open a PR **for the ticket** — this pass ends at a
  ticket. (A lesson about this skill is dispatched, not written here; see § Self-heal.)
- Never set `In Progress` / `Review` / `Done`.
- Never resolve a decision the user should make — product calls, pricing, policy, and anything
  affecting users' money or data go to them as questions.
- Never mark a fact `CONFIRMED` without having actually read the source.
- Don't guess a destructive board edit (split, merge, park) — propose it.
