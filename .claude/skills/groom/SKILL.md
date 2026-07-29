---
name: groom
description: Deep second pass over a single Notion Task Board ticket sitting in `Needs More Info`. Resolves every open design decision with the user through conversation — surfacing assumptions as explicit questions, pushing back on the spec, verifying claims against real source rather than recall — then writes the decisions and their rationale into the ticket and moves it to `Ready`/`Queued`. Owns splitting oversized tickets and recording external blockers. Technical and concise. Trigger on `/groom`, "groom this ticket", "resolve the design on X".
allowed-tools: Read, Grep, Glob, Bash, Agent, WebFetch, WebSearch, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page, mcp__notion__notion-create-pages, mcp__notion__notion-search
argument-hint: '[<ID>]'
arguments:
  - name: <ID>
    description: Numeric ticket ID to groom. Omit to take the top `Needs More Info` ticket by Priority → ID.
lastUpdated: 2026-07-29T00:00:00Z
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

If a decision genuinely cannot be made now, it is **explicitly marked as deferred with a reason** —
never left as an unmarked menu.

## Board constants

- **Task Board** data source: `collection://3630953c-224c-8065-8864-000bb9fe7bad`
- **Epic Board** data source: `collection://2510953c-224c-80b7-9bb0-000b5384a47d`
- Lanes: pulls from `Needs More Info`; lands at `Ready` / `Queued`; may park at `On Hold`.
  Never sets `In Progress` / `Review` / `Done` / `Blocked`.

## Reporting voice

**Technical, but concise.** Unlike `/triage`, filepaths, symbols, SQL, and API surface belong in
the conversation — resolving the decision requires them.

But no walls of text:

- A decision is **one line of what + one line of why**, not an essay.
- Options go in short lists or a table, never prose comparison.
- Long detail belongs in the ticket body, not the chat.
- Lead with the recommendation, then the trade-off.

## Procedure

### 1. SELECT

```sql
SELECT "userDefined:ID" AS id, "Name", "Priority", "Type", "Epic", "Assignee", url
FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
WHERE "Status" = 'Needs More Info'
ORDER BY "Priority" ASC, "userDefined:ID" ASC
```

Take the given `<ID>`, else the top row. Fetch its full page — `/triage` already wrote a body with
the open forks recorded; build on it, don't restart. Echo which ticket you're grooming in one line.

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

This is the heart of the skill. Present, in one concise pass:

- **The plan in brief** — the handful of changes intended, at altitude. Name the key files, not
  line-by-line edits.
- **Open decisions, as explicit questions.** Every design or feature detail you would otherwise
  silently assume: naming, UX choices, edge-case handling, scope boundaries, which pattern to
  follow. One line each, with a recommendation. **Surface them — never bake them in.**
- **Pushback surface** — anything in the spec that looks like a hole, is ambiguous, seems
  unnecessary, or that you would do differently. Make it easy to cut or redirect scope.

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
  scope each. Groom owns this because size is only knowable after the design is settled.
- **External blockers** — facts only the user can supply (a dashboard setting, a vendor account
  detail, a product call). Record under `## Blocked on` with what it blocks. If the ticket cannot
  land without one, it stays in `Needs More Info` and the report says why.
- **Wrong lane** — if it turns out to need product input rather than technical decisions, or is
  premature, propose `On Hold`.

### 5. WRITE

Rewrite the ticket body. Sections, in order:

```
## Product description        <what the user experiences and why — product terms>
## Design decisions           <the point of this pass — see shape below>
## Files                      <schema / edge functions / frontend, grouped>
## Acceptance criteria        <observable, no "or", one per resolved behaviour>
## Implementation steps       <ordered, each naming the decision section it implements>
## Blocked on                 <external facts, omit if none>
## Notes                      <branch, tests owed, overlaps, risks>
```

**Design decisions shape** — one subsection per decision:

- **What was decided**, concretely.
- **Why**, in a line or two.
- **What was rejected and why** — this is what stops a future session re-proposing it.
- **`CONFIRMED` / `ASSUMED`**, with the source for anything confirmed.

Two formatting notes, learned the hard way:

- Use **bullets, not numbered lists**, for implementation steps — Notion renumbers ordered lists,
  which silently breaks any cross-reference and any later `update_content` anchored on them.
- Prefer `replace_content` for a full rewrite over a chain of `update_content` edits. Batched
  search-and-replace against a page you just restructured fails quietly.

Then set `Status`:

- **`Queued`** — only when _zero_ decisions are unresolved. No human is in the loop.
- **`Ready`** — executable, may carry an explicitly-marked deferred decision for `/work pair`
  to settle at its align step.
- **Refuse to write `Queued` with `Assignee` = `Me` or empty**, or with any unresolved fork.
  `Queued` needs a model (`/work batch` pins each subagent to it). **`Ready` tickets stay
  unassigned** — leave the field empty.

Also sweep for **copy that the change makes false** — existing `src/locales/en-us.json` strings
asserting the old behaviour ("this cannot be undone"). List them in the body as required edits.
Behaviour changes routinely leave lying microcopy behind.

### 6. REPORT

Three lines maximum: ticket → lane, decisions resolved (count), anything blocked or split. No prose.

## Quality bar

A groomed ticket is done when a fresh session with **no memory of this conversation** could execute
it without guessing. Test it by asking:

- Does any acceptance criterion contain "or", "either", or a parenthetical alternative?
- Would an implementer hit a fork the body doesn't settle?
- Is any load-bearing fact `ASSUMED` that should be `CONFIRMED`?
- Does the body say why the rejected alternatives were rejected — or will someone re-propose them?
- Is the prior art named, so the implementer uses the existing primitive rather than reinventing it?

## Guardrails

- Only ever touch the Task Board / Epic Board data sources above — never a backup or duplicate.
- Never write code, never touch tests, never open a PR. This pass ends at a ticket.
- Never set `In Progress` / `Review` / `Done`.
- Never resolve a decision the user should make — product calls, pricing, policy, and anything
  affecting users' money or data go to them as questions.
- Never mark a fact `CONFIRMED` without having actually read the source.
- Don't guess a destructive board edit (split, merge, park) — propose it.
