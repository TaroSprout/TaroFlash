---
name: triage
description: First pass over raw Notion Task Board tickets. Investigates where each ticket lives in the code, fills in every field (Priority/Type/Epic/Assignee), writes a slim body per `.claude/rules/ticket-authoring.md`, parks adjacent fog on the epic, and routes each ticket to its next lane — `Ready`/`Queued` when it is executable as-is, or `Needs More Info` when it carries unresolved design decisions for `/groom` to settle. Batched and checkpointed; reports in product terms only. May propose creating epics, merging tickets, or parking them. Trigger on `/triage`, "triage the backlog", "triage tickets".
allowed-tools: Read, Grep, Glob, Bash, Agent, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page, mcp__notion__notion-create-pages, mcp__notion__notion-search
argument-hint: '[--p0|--p1|--p2|--p3] [--count N] [<ID> <ID> …]'
arguments:
  - name: --p0|--p1|--p2|--p3
    description: Only triage Backlog tickets of this priority.
  - name: --count N
    description: Cap the batch at N tickets (default 10). Ordered Priority → ID.
  - name: <ID>
    description: One or more numeric ticket IDs to triage specifically (overrides filters).
lastUpdated: 2026-07-31T12:00:00Z
---

## What this skill does

Triage is the **first** of two grooming passes. It sorts, locates, and frames — it does **not**
resolve design decisions. That is `/groom`'s job.

```
Backlog ──/triage──┬──► Ready / Queued        (executable as-is)
                   ├──► Needs More Info       (has unresolved decisions → /groom)
                   └──► On Hold               (parked)
```

Output per ticket: a descriptive **title**, a **slim body** per
[`ticket-authoring.md`](../../rules/ticket-authoring.md), all four **fields**
(Priority/Type/Epic/Assignee), and a **lane** with the routing reason stated. Anything the
investigation surfaced that isn't this ticket lands on its **epic**, not in a premature ticket.

Batched and checkpointed: ~2 interruptions for the whole batch, not one per ticket.

Do **not** touch tests. Do **not** write code. This skill reads code and writes Notion.

## Board constants

**[`ticket-authoring.md`](../../rules/ticket-authoring.md) is the single source** for the board data
sources, every field and its option list, the body section list, brevity rules, and voice. Read it
before writing anything to the board. This skill declares only its routing and lanes.

Two parked lanes, distinguished by what is missing:

- **`On Hold`** — parked for the user's own reasons; this is the user's own hands-off marker,
  alongside `Assignee = Me`. Triage never routes here unasked.
- **`Needs More Info`** — the _what_ is clear, the _how_ is not. Unresolved technical decisions.
  `/groom` picks these up.

## Reporting voice

This governs the **chat**; ticket bodies follow
[`ticket-authoring.md`](../../rules/ticket-authoring.md).

**Product terms only. Concise. No walls of text.**

Describe where a thing sits in the **UI** and what the user experiences — "the number steppers in
deck review-pacing settings", "the popup after Google sign-up". Never surface filepaths,
component/composable names, function names, or symbols in a report to the user.

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
`"userDefined:ID" IN (…)` (overriding both filters, since naming a ticket is deliberate — but warn
if it isn't in `Backlog` or is assigned `Me`). `--count N` caps the batch (default 10); if it would
exceed the cap, take the top N and say how many were left.

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

- **What / where** — the surface, the root cause for bugs.
- **Prior art** — _what already exists here that encodes the answer?_ The ui-kit primitive,
  directive, utility, or rule file that governs this surface. **The single highest-value output of
  investigation** — an agent finds the file it needs in seconds, but never finds the primitive it
  should have used unless pointed.
- **Negative facts** — what turns out _not_ to need changing. These delete exploration the claiming
  agent would otherwise do; they are worth as much as the positive ones.
- **Forks** — any point where two viable approaches exist. These drive routing (§ Routing).
- **Adjacent fog** — unclear work the investigation tripped over that isn't this ticket. Do not cut
  a premature ticket for it; it goes to the epic (§ 7).

Investigate deep, record shallow. Most of what you learn is **not** written down — the claiming
agent re-explores. Only what survives the rediscovery test in
[`ticket-authoring.md`](../../rules/ticket-authoring.md) reaches a body.

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
- **Fields** — `Priority`, `Type`, `Epic`, and `Assignee` **only when the lane is `Queued`** (see
  § Assignee). Tickets now arrive with only name + description, so **propose all four**; never apply
  them unasked.
- **Lane** — with the trigger that decided it.
- **Proposals** — CREATE a new ticket, MERGE into another (name the survivor), or CREATE a new
  epic. Never silently.
- **Epic writes** — adjacent fog to add under the epic's `## Not yet specified`, or work ruled past
  the epic's goal to add under `## Out of scope`. One line each; propose, never apply unasked.

**New epics.** If no existing epic fits, propose one rather than forcing a bad match — an epic is a
resurfacing anchor, not a full spec. Shape per
[`ticket-authoring.md` § Epics](../../rules/ticket-authoring.md).

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
- **Epic writes:** append approved fog bullets to the epic page's `## Not yet specified` and
  approved rulings to `## Out of scope`. A ticket ruled past the epic's goal is moved to `Won't Do`
  and gets its `## Out of scope` line — never left open.

Write sequentially; if a write fails, report which and stop rather than half-applying.

### 8. REPORT

Tally, one line each: `→ Ready/Queued (model)`, `→ Needs More Info`, `created`, `merged`,
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

## Bodies

Section list, brevity, and voice all live in
[`ticket-authoring.md`](../../rules/ticket-authoring.md). Triage owns two of its sections —
`## Acceptance criteria` and `## Open questions` — and adds neither a template nor a rule of its own.

Three things this skill is on the hook for:

- **Prior art as an acceptance criterion.** The most common implementation failure isn't a wrong
  decision, it's an agent reinventing what the codebase already encodes — a stepper hand-rolling
  press styling when `ui-tappable` defines it, a CSS hack where a prop exists. Answer _what already
  governs this surface?_ and write it as a concrete AC clause ("built from `ui-tappable`"). It
  converts "the agent should have known" into "the ticket said so."
- **Open forks, for a `Needs More Info` ticket.** It still gets a body — `/groom` builds on it rather
  than starting over — with the unresolved forks listed under `## Open questions` so `/groom` knows
  what it is there to settle.
- **`Type = Spike` carries its own meaning**, so the title must not be prefixed `"Spike: …"` — that
  prefix only existed because the Type was unavailable. Strip it when retyping an old ticket. A
  Spike's acceptance criteria describe what the written recommendation must cover, not a behaviour
  change.

## Assignee — `Queued` only

**`Ready` tickets stay unassigned.** A pairing ticket is worked in whatever session the user starts,
on whatever model that session runs — an `Assignee` there is noise. Leave the field empty.

**`Queued` tickets must have an `Assignee`**, since `/work batch` pins each subagent to its ticket's
`Assignee` and skips anything with the field empty.

**Only ever suggest `Fable`, `Opus`, or `Sonnet`** — those are the only values the field takes.

- **`Opus`** — architectural, cross-cutting, ambiguous, or security/backend-sensitive.
- **`Sonnet`** — well-scoped feature/bug work with a clear spec.
- **`Fable`** — mechanical/localized changes (copy, single-component tweaks, icon swaps).

## Guardrails

- Only ever touch the Task Board and Epic Board named in the rule — never a backup or duplicate.
- Never set `In Progress`/`Review`/`Done` here. Triage lands tickets in `Ready`, `Queued`,
  `Needs More Info`, `On Hold`, or `Duplicate` only.
- Propose `Priority`/`Type` changes, never apply them unasked.
- Never route a ticket to `On Hold` unasked — it is the user's own hands-off lane.
- If unsure whether to merge, create, or park — ask. Never guess a destructive board edit.
- Never resolve a genuine design fork here. Route it to `Needs More Info` and let `/groom` do it
  properly with the user.
