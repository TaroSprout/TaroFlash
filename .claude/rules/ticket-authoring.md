---
lastUpdated: 2026-08-08T00:00:00Z
# Board vocabulary is dead weight in a code session — scoped so it loads only for board work.
# The board skills and the ticket-author agent name this file in their own body and read it; a
# glob on their paths would not fire, since invoking a skill never reads its file.
paths:
  - '.claude/rules/task-board-schema.md'
---

# Ticket authoring

**Owns what a ticket looks like** — body shape, brevity, voice, and which stage fills each field.
`/triage` and `/groom` declare their own routing and lanes, never their own templates or voice
rules. If a body rule isn't here, it doesn't exist. The five shared writing principles live in
[`authoring`](./authoring.md) and are not restated below.

Applies whenever the user says "cut a ticket", "file that", "add that to the board", or when
out-of-scope work is found mid-task.

## Board constants

The board **schema** — data sources, the MCP server + default template, and every field with its
option list and semantics — lives in [`task-board-schema.md`](./task-board-schema.md). Read it for any
data-source URL, field name, or option value. This file owns only how those fields are **filled** when
authoring: what a cut sets, what each stage owns, and the two-axis Priority/Target doctrine below.

## Fields when cutting

| Field      | Value when cutting                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `Status`   | **`Backlog`**, always — a new ticket is un-triaged by definition                                                           |
| `Assignee` | **empty** — triage/groom set it (`Opus`/`Sonnet`) at `Ready`, never at cut                                                 |
| `Type`     | `Bug` broken · `Task` defined change · `Story` user-facing capability · `Spike` the deliverable is a decision, not shipped |
| `Priority` | **empty** at cut time — a `/backlog` decision. Set only when the user explicitly dictates one                              |
| `Target`   | **empty** at cut time — a `/backlog` decision, not a capture one                                                           |
| `Epic`     | match the Epic Board; if nothing fits, propose a new epic rather than force-fit                                            |

Never write `Ready` — it asserts the ticket is executable, which is never true at capture time. Never
write `On Hold` or `Assignee = Me` on a fresh ticket — that's the user's own hands-off marker. Leave
`Priority` and `Assignee` untouched unless the user explicitly asks for a value.

**The classification fields have an owner: `/backlog`.** `Type`, `Epic`, `Target`, and `Priority` are
the portfolio pass's to set — it sees the whole Backlog at once and distributes them comparatively.
Capture leaves them empty (bar an obvious `Type`/`Epic` or a user-dictated value); `/backlog` fills
them; `/triage` and `/groom` fill only stragglers a sweep hasn't reached yet. Priority especially is
never a per-ticket call — it's a comparative call across the whole board, which only `/backlog` can see.

## Priority vs Target — two axes, don't collapse them [K:ticket-priority-vs-target]

`Priority` answers **in what order** (urgency). `Target` answers **which quarter** it ships in. They
are orthogonal — every quarter spans `P0`→`P3`, so a quarter never collapses into a single priority
tier.

- `MVP` — launch scope: everything gating first ship. The current quarter's committed set, kept as its
  own value.
- `Q3 '26` / `Q4 '26` / `Q1 '27` — rolling quarter buckets (the live set lives in
  [`task-board-schema.md`](./task-board-schema.md)). `Q3 '26` is current and holds `MVP` plus a few
  high-value pull-ins.

A ticket stays in its epic regardless of `Target` — the epic is the resurfacing anchor, not a
graveyard. `/backlog` fills `Target` **theme-grouped**: an epic's tickets stay together in one home
quarter, with **priority driving cross-quarter overflow** (P0/P1 in the home quarter, P2/P3 spilling
to the next), whole secondary/deferred epics pushed to the furthest planned quarter, and On-Hold
tickets defaulting there too. Leave `Target` empty at capture; `/backlog` sets it (see
[`backlog`](../skills/backlog/SKILL.md)).

## Body

The body is the Notion **page content**. Prefer `replace_content` for a full rewrite over a chain of
`update_content` edits. Use **bullets, not numbered lists**, for anything ordered — Notion renumbers
ordered lists and the churn shows up as noise in the page history.

**One section list. Each stage fills more of it — no stage invents sections.**

| Section                  | Owner      | Notes                                                        |
| ------------------------ | ---------- | ------------------------------------------------------------ |
| `## Product description` | cut        | 1–3 lines, product terms                                     |
| `## Repro`               | cut        | bugs only                                                    |
| `## Acceptance criteria` | triage     | product-observable, one pass/fail each — see below           |
| `## Tech details`        | groom      | terse companion criteria — the encoding the ACs can't carry  |
| `## Open questions`      | cut/triage | unresolved forks; groom settles each into an AC + deletes it |
| `## Blocked on`          | groom      | external facts only; omit if none                            |

**There is no `## Decisions` section.** A resolved decision is an acceptance criterion — product-observable, with any technical encoding on a companion `## Tech details` line.

A ticket carries only the sections that have content. Length tracks how much of the work is
**decision** rather than typing — a mechanical change gets six lines, a cross-cutting refactor earns
its ownership table and execution order.

### `## Acceptance criteria` — product-observable, one per line

Every AC is something you could watch pass or fail in the running product, in product terms — no
filepaths, symbols, or SQL. This is the list the reviewer checks off and the implementer builds to,
so keep it skimmable. The technical encoding each one rides on — the seam, mechanism, or reuse
pointer — lives on a companion line in `## Tech details`, not here.

Six gates on every AC, on top of [`authoring`](./authoring.md):

- **Readable without decoding.** No unexplained breakpoint values, code names, or shorthand a
  reader has to reverse-engineer to know what's being watched — say what changes, in words.
  - Bad: `Between 916px and its two-column breakpoint, the scrollbar sits beside the narrower column.`
  - Good: `Before the dashboard drops to two columns, the scrollbar sits beside the content column, not the full page.`
- **An enumerated failure set names its catch-all.** When ACs list the specific ways something can
  fail (parse errors, validation, rejected input), add one AC for the case that fits none of the
  named ones, with its own signed-off copy.
- **Independently failable.** "The menu shows the new option" can't fail separately from the feature
  existing — that's Product description as a checkbox. "Never-reviewed cards sort last" can. A
  rejected path counts too, as a negative: "no cross-session outbox is added".
- **One sentence.** A second sentence means it's two ACs, or padding.
- **No smuggled design; no implementation.** Undecided behaviour is an `## Open questions` fork, not
  an AC. And an AC pins the _design_ decision (placement, host, copy, states, behaviour), never the
  _implementation_ (which composable, how it's wired) — that rides a companion line in
  `## Tech details`.
- **A hedge routes, it never writes.** The ticket goes to `Needs More Info`; the fork never lands in
  the criterion.

The delete-test applies **per clause** here, not per line — a clause whose removal leaves no
criterion ambiguous or unfailable is cut.

> **Bloated** (a "Decisions" bullet restating an AC): _Optimistic advance stays; only the commit is
> gated — the card flies away instantly, tracked by a per-card pending/saved/failed status. Rejected:
> blocking the UI._
> **Lean** (the AC alone): _A rated card advances instantly and is recorded `pending`, with no saving
> state; it becomes durably reviewed only once its save confirms._

Written concrete as decisions resolve (mostly groom). At cut time, only acceptance the user dictates,
verbatim.

**The ticket's PR answers this list line for line** — every criterion ticked or crossed, in this
order, only a crossed one carrying a reason (`prepare-pr`'s `--acceptance`). Write each one so that
answer is possible: a criterion a reviewer can't mark pass or fail from the running product is the
one that comes back as prose.

### `## Tech details` — the companion encoding

A terse companion to the ACs: one checkbox line per AC that needs the technical detail its product
term can't carry — the seam, slot, composable, mechanism, reuse pointer, or the single file that _is_
the answer. Same delete-test. This is where implementation encoding lives, so the ACs stay pure
product language and skimmable. Omit the section when there's nothing technical to record.

- **Prior art** as a "built from X" clause, a bug's confirmed **root cause**, **negative facts**
  ("does not reuse Y").
- Money / auth / boundary claims: `CONFIRMED (verified against <source>)`, else `ASSUMED`.
- A filepath only when it's the _answer_ (a new file's home, a confirmed root-cause location), never
  a line number.
- **Never here** — grep finds it in seconds: exhaustive file lists, how the current code works,
  framework mechanics.

### `## Open questions` — unresolved forks awaiting groom

The forks a ticket hands to `/groom` — a taste call left open at cut, a design fork triage won't
settle — one line each, phrased as the question. Groom settles each into a concrete AC and **deletes
the section**; it never reaches a takeable ticket.

### Never restate a rule that auto-loads

`.claude/rules/*` load by path; CLAUDE.md is always on. Writing "use `data-testid`", "theming
tokens", "declarative schema then `db diff`", or "do not touch tests" into a body is pure noise.

Name a rule file **only** when the ticket departs from it, or when the ticket's area wouldn't
trigger it.

A restated rule is still noise when it wears a section heading: an `## Out of scope: tests stay
untouched` line is the "do not touch tests" rule in costume — delete it.

## Voice

- **Product description is product terms** — screens, flows, what the user experiences. No
  filepaths, symbols, function names, or SQL. Those live in the acceptance criteria.
- **Point, don't narrate.** `Reuse: UiDropdownButton, UiRadio; mirror grid-item.vue` — not a
  parenthetical explaining what each one is for. The implementer opens the file.
- **Plain, not flowery.** Short microcopy stays plain — avoid AI-flavoured flourishes and bare
  keyword lists alike.
- **Never resolve a taste decision at cut time.** Which icon, what an animation feels like, what the
  copy says, how a layout should look — record as open. `/groom` settles them with the user.
- New user-facing text → note that locale keys are needed (`src/locales/en-us.json`), see
  [`i18n`](./i18n.md).
- **Copy carries its signed-off wording.** →[K:user-copy-signoff] — any new or changed
  user-facing string appears in the AC as its exact final wording. Reused copy is stated as reused
  (same wording, its own key — keys aren't shared across features). A ticket with undecided copy does
  not reach `Ready`.
- **Grooming asks for every string the ticket will need**, one question per line, three varied
  options each, before the ticket leaves `Needs More Info`. The build that picks the ticket up is
  unattended and cannot ask — a string the ticket didn't settle reaches the branch as a `COPY-TBD`
  that fails CI (→[K:build-unfinished-markers]), so the cost of skipping the question is a red PR,
  not a guess.

## Epics

An epic is the resurfacing anchor for an effort, and the only place effort-level state lives. These
sections live in the epic's Notion **page body**.

```markdown
<one-line scope>

## Decisions so far

<!-- one line per resolved ticket: gist + link. The index — detail lives in the ticket. -->

- [#<n> <ticket name>](url) — <one-line gist of what was decided>

## Not yet specified

<!-- in-scope fog: questions you can tell are coming but can't phrase sharply yet -->

## Out of scope

<!-- ruled beyond this epic's goal; never graduates back -->
```

**`## Decisions so far`** is an index, never a store — gist and link, never restate. `/groom`
appends a line when it lands a ticket that resolved something an adjacent ticket will need.

**`## Not yet specified`** — one bullet per fog patch, deliberately **coarser than a ticket**.
Question-shaped, not task-shaped ("moderation of board posts", not "add a hide button"). Say why
it's still fog where you know — that's the half that tells the next session what would sharpen it.

- **Ticket when** you can state the question precisely now — even if blocked, even if unanswerable.
- **Fog when** you can't phrase it that sharply. Don't pre-slice fog into ticket-sized pieces; one
  patch may graduate into three tickets, or none.
- **Graduating a patch deletes its bullet.** It now lives in exactly one place — its ticket. Skip
  this and the section becomes a stale second index that contradicts the board.
- Excludes what's already ticketed, already decided, or out of scope.

**`## Out of scope`** — work consciously ruled past this epic's goal. Scope, not sharpness, lands it
here. One line + why. If an existing ticket turns out to sit here, move it to `Won't Do` and leave
the line.

### New epics [K:ticket-new-epic-proposal]

Propose first, never create silently. Give a one-line scope, not a full spec. Set the icon to a
Notion built-in via its hosted SVG — `https://www.notion.so/icons/<name>_<color>.svg` (colours:
`gray|brown|orange|yellow|green|blue|purple|pink|red`). Not an emoji. The bare
`icons/<name>_<color>` path is accepted by the API but **renders blank** — always the full `.svg`
URL. **Validate the name resolves first** — `curl -s -o /dev/null -w '%{http_code}'
https://www.notion.so/icons/<name>_<color>.svg` must be `200`; an unknown name is accepted silently
and renders blank (`gear_gray` ✓, `settings_gray` ✗).

## Dependencies [K:ticket-dependencies]

When a ticket must land before another can start — most often after `/groom` splits one ticket into
several — record it on the Task Board's **`Blocked By`** self-relation, not as a line in the body. A
relation renders in Notion as a linked row, so what's actually takeable is visible without opening a
ticket.

`Blocked By` and **`Blocks`** are the two halves of one reciprocal pair: setting `Blocked By` on the
dependent ticket fills `Blocks` on the blocker automatically. **Write only `Blocked By`** — setting
both by hand duplicates the edge.

Each column holds a **JSON array of page URLs**, not statuses, so judging takeability is two steps:
read the `Blocked By` urls, then query the Task Board for those rows' `Status`. A blocker is cleared
when its `Status` is in the **`complete` group** — `Done`, `Won't Do`, or `Duplicate`.

A split that emits siblings with no dependency and no `## Decisions so far` entry on the epic
produces orphans: `/work` picks up step 3 of 5 with no way to know step 1 must land first.

## Batch work

For more than a couple of tickets at once, delegate to the `ticket-author` agent.
