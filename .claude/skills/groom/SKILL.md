---
name: groom
description: Deep second pass over a single Notion Task Board ticket sitting in `Needs More Info`. Resolves every open design decision with the user through conversation — surfacing assumptions as explicit questions, pushing back on the spec, verifying claims against real source rather than recall — then writes the decisions and their rationale into the ticket and moves it to `Ready`/`Queued`. Owns splitting oversized tickets (wiring the `Blocked by` relation between the siblings), recording external blockers, and keeping the epic's decision log and fog current. Technical and concise. Trigger on `/groom`, "groom this ticket", "resolve the design on X".
allowed-tools: Read, Grep, Glob, Bash, Agent, WebFetch, WebSearch, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page, mcp__notion__notion-create-pages, mcp__notion__notion-search
argument-hint: '[<ID>]'
arguments:
  - name: <ID>
    description: Numeric ticket ID to groom. Omit to take the top `Needs More Info` ticket by Priority → ID.
lastUpdated: 2026-07-31T12:00:00Z
---

## What this skill does

Groom is the **second** of two grooming passes. `/triage` located the work and routed it here
because it carries unresolved design decisions. Groom **resolves them with the user**, records
what was decided and why, and lands the ticket executable.

```
Needs More Info ──/groom──┬──► Ready / Queued     (decisions resolved)
                          ├──► split into N tickets
                          ├──► On Hold            (turned out to need product input, or premature)
                          └──► stays put          (blocked on an external fact)
```

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

## Board constants

**[`ticket-authoring.md`](../../rules/ticket-authoring.md) is the single source** for the board data
sources, every field and its option list, the body section list, brevity rules, and voice. Read it
before writing anything to the board. This skill declares only its lanes and its own passes.

- Lanes: pulls from `Needs More Info`; lands at `Ready` / `Queued`; may park at `On Hold`.
  Never sets `In Progress` / `Review` / `Done` / `Blocked`.
- **Retype to `Spike`** when grooming reveals the deliverable is a decision or recommendation rather
  than shipped behaviour — and drop the now-redundant `"Spike:"` title prefix.

## Reporting voice

This governs the **chat**; ticket bodies follow
[`ticket-authoring.md`](../../rules/ticket-authoring.md).

**Open at altitude, in product terms; drop to detail on demand.** The first present — the
checkpoint — is a bird's-eye view: what the ticket changes for the user and the decisions that need
settling, phrased the way a user would experience them. **No filepaths, symbols, or SQL in that
opening** — it should be scannable in seconds, never a wall of text.

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

- **Verify claims against source, not recall.** Library API surface, version behaviour, and history
  are the three things most often misremembered. Read the installed types (`node_modules/`, the Deno
  cache), the lockfile, `git log -S`/`-L`, the actual policy or migration. Cheap to check, expensive
  to get wrong.
- **Label every fact** as `CONFIRMED (verified against <source>)` or `ASSUMED`. Anything that moves
  money, touches auth, or crosses a system boundary must be `CONFIRMED` before it lands in the body.
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
  decision is actually opened.
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
- **Teach the backend.** If the ticket touches `supabase/**`, the CLAUDE.md teaching persona is on:
  check `.claude/logs/learning-log.md` first, compress what's well-scored, walk through SQL syntax
  for what isn't. Stop after each chunk.
- Iterate until the user is satisfied. There is no interruption budget here.

### 4. RESHAPE — split, park, or block

Only answerable once the design has resolved:

- **Split** — if the resolved shape is clearly several tickets, propose the split with a one-line
  scope each. Groom owns this because size is only knowable after the design is settled. Say which
  siblings must **land in order** — that ordering becomes a `Blocked by` relation in §5, not prose.
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

### 5. WRITE

Rewrite the ticket's **page body** via `notion-update-page` — prefer `replace_content` for a full
rewrite over a chain of `update_content` edits. Any splits become new tickets via
`notion-create-pages`.

Sections and their shape live in [`ticket-authoring.md`](../../rules/ticket-authoring.md); groom
owns `## Decisions` and `## Blocked on`, and may revise `## Acceptance criteria`. It writes no
`Files` or `Implementation steps` section — the claiming agent explores for itself, and a decision
that only makes sense as an ordered plan belongs in `## Decisions` as the decision it is.

**The resolution is the deliverable, not the investigation.** Grooming reads far more than it
records: most of what you learned settling a decision is rediscoverable in seconds and does not
reach the body. Prefer **bullets over numbered lists** — Notion renumbers ordered lists and
the churn shows up as page-history noise.

**Wire the ordering.** Where a split named siblings that must land in sequence, set the `Blocked by`
relation on each dependent sibling (see [`ticket-authoring.md`](../../rules/ticket-authoring.md) § Dependencies — check the property
exists before relying on it, and fall back to a `Blocked by: #<n>` body line if it doesn't).
Siblings emitted with no dependency are orphans — `/work batch` will pick up step 3 of 5 with no way
to know step 1 must land first.

**Update the epic** page: append the resolved ticket to `## Decisions so far` (gist + link, never a
restatement), add any approved fog to `## Not yet specified`, delete the fog bullet that this
session **graduated** into a ticket, and add any approved `## Out of scope` ruling.

Then set `Status`:

- **`Queued`** — only when _zero_ decisions are unresolved. No human is in the loop.
- **`Ready`** — executable. A ticket still carrying an unmade design or taste call does **not**
  qualify, even labelled "decide during pairing" — that is what `Needs More Info` is for, and this
  pass exists to settle it. The only thing that may ride into `Ready` is a decision genuinely blocked
  on an external fact (§4), recorded under `## Blocked on`.
- **Refuse to write `Queued` with `Assignee` empty or `Me`** (or any unresolved fork). `Queued` needs
  an `Assignee` — Sonnet / Opus / Fable — because `/work batch` pins each subagent to it. **`Ready`
  tickets carry no `Assignee`** — leave the field empty.

Also sweep for **copy that the change makes false** — existing `src/locales/en-us.json` strings
asserting the old behaviour ("this cannot be undone"). List them in the body as required edits.
Behaviour changes routinely leave lying microcopy behind.

### 6. REPORT

Three lines maximum: ticket → lane, decisions resolved (count), anything blocked, split, or parked
on the epic. No prose.

## Quality bar

A groomed ticket is done when a fresh session with **no memory of this conversation** could execute
it without guessing. Test it by asking:

- Does any acceptance criterion contain "or", "either", or a parenthetical alternative?
- Would an implementer hit a fork the body doesn't settle?
- Is any load-bearing fact `ASSUMED` that should be `CONFIRMED`?
- Does the body say why the rejected alternatives were rejected — or will someone re-propose them?
- Is the prior art named, so the implementer uses the existing primitive rather than reinventing it?
- Is anything in the body something the claiming agent would rediscover in seconds? Cut it.
- If this was a split: can `/work` tell which sibling must land first without reading all of them?

## Guardrails

- Only ever touch the Task Board and Epic Board named in the rule — never a backup or duplicate.
- Never write code, never touch tests, never open a PR. This pass ends at a ticket.
- Never set `In Progress` / `Review` / `Done`.
- Never resolve a decision the user should make — product calls, pricing, policy, and anything
  affecting users' money or data go to them as questions.
- Never mark a fact `CONFIRMED` without having actually read the source.
- Don't guess a destructive board edit (split, merge, park) — propose it.
