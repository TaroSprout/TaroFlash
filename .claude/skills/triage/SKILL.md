---
name: triage
description: First pass over raw Notion Task Board tickets. Investigates where each ticket lives in the code, fills in every field (Priority/Type/Epic/Assignee), writes a body from the per-Type template, and routes each ticket to its next lane — `Ready`/`Queued` when it is executable as-is, or `Needs More Info` when it carries unresolved design decisions for `/groom` to settle. Batched and checkpointed; reports in product terms only. May propose creating epics, merging tickets, or parking them. Trigger on `/triage`, "triage the backlog", "triage tickets".
allowed-tools: Read, Grep, Glob, Bash, Agent, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page, mcp__notion__notion-create-pages, mcp__notion__notion-search
argument-hint: '[--p0|--p1|--p2|--p3] [--count N] [<ID> <ID> …]'
arguments:
  - name: --p0|--p1|--p2|--p3
    description: Only triage Backlog tickets of this priority.
  - name: --count N
    description: Cap the batch at N tickets (default 10). Ordered Priority → ID.
  - name: <ID>
    description: One or more numeric ticket IDs to triage specifically (overrides filters).
lastUpdated: 2026-07-29T00:00:00Z
---

## What this skill does

Triage is the **first** of two grooming passes. It sorts, locates, and frames — it does **not**
resolve design decisions. That is `/groom`'s job.

```
Backlog ──/triage──┬──► Ready / Queued        (executable as-is)
                   ├──► Needs More Info       (has unresolved decisions → /groom)
                   └──► On Hold               (parked)
```

Output per ticket: a descriptive **title**, a **body** from the per-Type template, all four
**fields** (Priority/Type/Epic/Assignee), and a **lane** with the routing reason stated.

Batched and checkpointed: ~2 interruptions for the whole batch, not one per ticket.

Do **not** touch tests. Do **not** write code. This skill reads code and writes Notion.

## Board constants

- **Task Board** data source: `collection://3630953c-224c-8065-8864-000bb9fe7bad`
- **Epic Board** data source: `collection://2510953c-224c-80b7-9bb0-000b5384a47d`
- **Fields & vocab:**
  - `Status`: `On Hold` · `Backlog` · `Needs More Info` · `Ready` · `Queued` · `In Progress` · `Blocked` · `Review` · `Duplicate` · `Won't Do` · `Done`
  - `Priority`: `⇞P0` · `↑P1` · `↓P2` · `⇟P3`
  - `Type`: `Bug` · `Task` · `Story` · `Spike`
  - `Assignee`: `Me` · `Fable` · `Opus` · `Sonnet`

> **The board is the source of truth for these lists, not this file.** A hardcoded vocabulary here
> once went stale and `Spike` was invisible for months — tickets encoded it in their titles instead.
> `notion-fetch` on the data-source URL returns the live option lists; check them when a value seems
> not to fit, and fix this file rather than working around it.

- `Epic`: relation to Epic Board (single). `ID`: read-only auto-increment.

Two parked lanes, distinguished by what is missing:

- **`On Hold`** — parked for the user's own reasons. Triage never routes here unasked.
- **`Needs More Info`** — the _what_ is clear, the _how_ is not. Unresolved technical decisions.
  `/groom` picks these up.

## Reporting voice

**Product terms only. Concise. No walls of text.**

Describe where a thing sits in the **UI** and what the user experiences — "the number steppers in
deck review-pacing settings", "the popup after Google sign-up". Never surface filepaths,
component/composable names, function names, or symbols in a report to the user. Those belong in
the ticket **body** (agent-facing), never in the chat.

One line per ticket at checkpoints. If something genuinely needs depth, it goes in the body.

## Procedure

### 0. LOAD seed

Read `.claude/context/app-map.md` in full — the keyword→path guide and Epic→code map ground
every investigation.

### 1. FETCH

```sql
SELECT "userDefined:ID" AS id, "Name", "Type", "Priority", "Epic", "Assignee", url
FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
WHERE "Status" = 'Backlog'
  AND ("Assignee" IS NULL OR "Assignee" <> 'Me')   -- Me on Backlog = hands off
ORDER BY "Priority" ASC, "userDefined:ID" ASC
```

`Assignee = Me` on a Backlog ticket is the user's "don't triage this" signal. Apply args:
`--pN` adds `AND "Priority" = '<glyph>'`; explicit `<ID>`s replace the WHERE with
`"userDefined:ID" IN (…)` (overriding both filters, since naming a ticket is deliberate — but
warn if it isn't in Backlog or is assigned `Me`). `--count N` caps the batch (default 10); if it
would exceed the cap, take the top N and say how many were left.

### 2. SELECT

Echo the batch as a compact numbered list (ID · Priority · raw name). If args fully determined it,
proceed. If ambiguous or oversized, ask before spending investigation time.

### 3. READ existing descriptions

Fetch each ticket's **page body** via `notion-fetch` — §1 pulls properties only. The user often
writes real context into a raw ticket. Read every in-scope body and carry it through. If a
description already dictates the approach, honour it rather than re-deriving from the name.

### 4. INVESTIGATE

Dig into the codebase for the whole batch — grep, read the relevant files, confirm where the
change lives. For a large batch, dispatch parallel `Agent` (Explore) subagents, one per ticket or
cluster.

Gather per ticket:

- **What / where** — the surface, the files, the root cause for bugs.
- **Prior art** — _what already exists here that encodes the answer?_ The ui-kit primitive,
  directive, utility, or rule file that governs this surface. See § Prior art below — this is the
  single highest-value output of investigation.
- **Constraints** — `.claude/rules/*` that govern the area, i18n key paths.
- **Forks** — any point where two viable approaches exist. These drive routing (§ Routing).

### 5. CHECKPOINT ▸ findings + routing

One interruption for the whole batch. Per ticket, **in product terms**, ≤2 lines:

- what it turned out to be (and anything surprising),
- proposed lane + **which routing trigger fired**, in a short phrase.

> `#141` the number steppers in review-pacing settings — styling only, kit already handles it
> → Ready
>
> `#264` deleting your account — needs decisions on the grace period and what a deleted user sees
> → Needs More Info (new stored state + billing)

Separate the clean tickets from the ones needing a decision. **Stop for confirmation or redirect**
before drafting. A ticket too thin to spec even after investigation is an `On Hold` candidate —
flag it here.

### 6. DRAFT ▸ APPROVE

Draft every body in one pass, but **present a compact summary** — never dump bodies into the
review. Per ticket:

- **Title** — descriptive rewrite.
- **Summary** — one line of product intent.
- **Fields** — `Priority`, `Type`, `Epic`, and `Assignee` **only when the lane is `Queued`**
  (see § Assignee). Tickets now arrive with only name +
  description, so **propose all four**; never apply them unasked.
- **Lane** — with the trigger that decided it.
- **Proposals** — CREATE a new ticket, MERGE into another (name the survivor), or CREATE a new
  epic. Never silently.

**New epics.** If no existing epic fits, propose one rather than forcing a bad match. Set its icon
to a Notion built-in via external URL — `https://www.notion.so/icons/<name>_<color>.svg` (colors:
`gray|brown|orange|yellow|green|blue|purple|pink|red`). Not an emoji. The bare `icons/<name>_<color>`
path is accepted by the API but renders blank — always use the full `.svg` URL.

**Consolidate for the `Ready` lane.** A pairing ticket is worked in one interactive session and can
hold several related small tasks. When two `Ready`-bound tickets share the **same surface** or
**same root cause**, propose MERGE. Two guardrails: merge only by shared surface or root cause,
**never by shared epic alone**; and fold every absorbed ticket's scope into the survivor's body so
nothing is lost. `Queued` tickets stay one-task-per-ticket — batch agents work them independently.

### 7. WRITE

Apply only what was approved, via `notion-update-page` (and `notion-create-pages` for CREATEs):

- title, body, `Priority`/`Type`/`Epic`/`Assignee`, `Status`.
- **Refuse to write `Status = Queued` when `Assignee` is `Me` or empty** — stop and ask. `Ready`
  tickets are left unassigned; do not set an Assignee on them.
- **Refuse to write `Status = Queued` when any fork is unresolved** — it routes to
  `Needs More Info` instead (§ Routing).
- **Merges:** move the merged-away ticket to `Duplicate`, prepend a body line pointing to the
  survivor, and fold its full scope into the survivor's body.

Write sequentially; if a write fails, report which and stop rather than half-applying.

### 8. REPORT

Tally, one line each: `→ Ready/Queued (assignee)`, `→ Needs More Info`, `created`, `merged`,
`→ On Hold`, `skipped`. No prose.

## Routing

The headline test:

> **If you cannot write the acceptance criteria without "or", "either", "e.g.", or a parenthetical
> alternative — it goes to `Needs More Info`.**

A hedge in an AC _is_ an unresolved decision. Enumerating options is not specifying.

**Hard routes** — these fire when the ticket hits the area **and** carries an unresolved fork or an
unverified load-bearing claim. They raise the evidence bar; they are not unconditional. A ticket
that touches `supabase/` but has explicitly recorded its decisions is _resolved_ and goes straight
to `Ready`/`Queued`.

1. Touches `supabase/`, auth, billing/Stripe, RLS, or personal data.
2. Introduces or changes **persistent state** — schema, stored shape, bucket, cache key.
3. Changes a **contract between layers** — DB↔API↔FE shape, edge-function payload, third-party API.
4. Bound for `Queued` **and** carries any unresolved question. This one _is_ unconditional — no
   human is in the loop there, so an unresolved fork means a batch agent guesses.

**Soft triggers — any one routes:**

5. The AC hedge test above.
6. Investigation surfaced **two or more viable approaches** with real trade-offs.
7. **The taste test — the one most often missed.** Would implementing this require inventing
   something to the user's taste that they haven't stated? Which icon to pick, what an animation
   should feel like, what the microcopy actually says, how a "looks bad" layout should instead look,
   what a hover treatment is. **This fires independently of how well-specified the code is.** A
   ticket can name the exact file, the exact seam, and every constraint, and still need the user —
   swapping 11 icons is mechanical as code and pure taste as a decision. An agent guessing at taste
   produces work the user rejects, which is more expensive than routing.
8. Touches more than one subsystem, or roughly >5 files, **and the approach across them isn't
   settled**. Breadth alone doesn't route — a large ticket that has already recorded its execution
   plan is resolved.
9. Adds a dependency.

**Skip to `Ready`/`Queued`** only when none fire _and_ the change is localized to one surface with
one obvious implementation.

**Decide the cheap forks yourself.** Naming, obvious defaults, one-way-to-do-it choices — settle
them in the body. The bar for routing is a _genuine trade-off_, not _any choice_. If every minor
fork routed, everything would take two passes.

**"To be decided during pairing" is not a resolution — it is the definition of `Needs More Info`.**
Naming an unmade decision documents it; it does not make it. A ticket saying "exact styling TBD live"
or "pair to land the approach" routes to `Needs More Info`, however well-specified the rest is. Do
not treat the marking as a reason to leave it in `Ready`.

## Prior art

The most common implementation failure is not a wrong decision — it is an agent reinventing
something the codebase already encodes. A stepper that hand-rolls press styling when `ui-tappable`
already defines it; a CSS hack where a component prop exists.

So investigation always answers: **what already governs this surface?** Record it in the body:

```
**Prior art:** this surface uses `ui-tappable` — press/tap styling is already encoded there, use
it rather than hand-rolling. Backgrounds follow the `bgx` accent utilities (`.claude/rules/theming.md`).
```

This catches governing primitives, not every detail — but it converts "the agent should have known"
into "the ticket said so."

## Body templates

Every body carries **Product description** (what the user experiences and why — no filepaths) and
**Technical notes** (agent-facing: paths, root cause, approach, prior art, constraints, rules,
i18n key paths).

**Bug**

```
## Product description
<1–3 lines: what the user sees and why it's wrong, product terms>
## Repro
1. …
## Expected / Actual
- Expected: …
- Actual: …
## Acceptance
<observable condition proving it's fixed — no "or">
## Technical notes
- Area: <path(s)> — <root cause if known>
- Approach: <where the fix lives / how>
- Prior art: <the primitive/utility/rule that already governs this surface>
- Constraints & rules: <.claude/rules/*, i18n key path, gotchas>
```

**Task / Story**

```
## Product description
<what & why for the user, product terms>
## Acceptance criteria
- [ ] …
## Technical notes
- Area: <path(s)>
- Approach: <how / where>
- Prior art: <the primitive/utility/rule that already governs this surface>
- Constraints & out of scope: <…, rules, i18n key path>
```

**Spike** — use when the deliverable is a **decision or recommendation, not shipped behaviour**.
The acceptance criteria describe what the written output must cover, not a behaviour change.

```
## Product description
<the question to answer and why it's open, product terms>
## Acceptance criteria (spike deliverable)
- [ ] A written recommendation covering: <the specific questions>
- [ ] Follow-up implementation tickets proposed with rough scope
## Technical notes
- Current behaviour: <what happens today — the baseline the decision moves from>
- Area: <path(s)>
- Constraints: <…, rules>
```

`Type = Spike` carries the meaning, so the **title must not be prefixed `"Spike: …"`** — that
prefix only ever existed because the Type was unavailable. Strip it when retyping an old ticket.

Keep bodies tight — enough to act on, no padding. Any new user-facing copy the ticket implies gets
its locale key path noted (`src/locales/en-us.json`).

A ticket routed to `Needs More Info` still gets a full body — `/groom` builds on it rather than
starting over. Record the open forks explicitly under Technical notes so `/groom` knows what to
resolve.

## Assignee — `Queued` only

**`Ready` tickets stay unassigned.** A pairing ticket is worked in whatever session the user starts,
on whatever model that session runs — an Assignee there is noise. Leave the field empty.

**`Queued` tickets must have a model**, since `/work batch` pins each subagent to its ticket's
Assignee and skips anything unassigned or `Me`.

**Only ever suggest a model — `Fable`, `Opus`, or `Sonnet`. Never suggest `Me`.** `Me` is the
user's own opt-out signal, not a value triage proposes.

- **`Opus`** — architectural, cross-cutting, ambiguous, or security/backend-sensitive.
- **`Sonnet`** — well-scoped feature/bug work with a clear spec.
- **`Fable`** — mechanical/localized changes (copy, single-component tweaks, icon swaps).

## Guardrails

- Only ever touch the Task Board / Epic Board data sources above — never a backup or duplicate.
- Never set `In Progress`/`Review`/`Done` here. Triage lands tickets in `Ready`, `Queued`,
  `Needs More Info`, `On Hold`, or `Duplicate` only.
- Propose `Priority`/`Type` changes, never apply them unasked.
- If unsure whether to merge, create, or park — ask. Never guess a destructive board edit.
- Never resolve a genuine design fork here. Route it to `Needs More Info` and let `/groom` do it
  properly with the user.
