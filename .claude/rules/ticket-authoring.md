# Ticket Authoring

**The single source of truth for what a ticket looks like.** Board constants, body shape, brevity,
and voice. `/triage` and `/groom` declare their own routing and lanes — never their own templates or
voice rules. If a body rule isn't here, it doesn't exist.

Applies whenever the user says "cut a ticket", "file that", "add that to the board", or when
out-of-scope work is found mid-task.

## Board constants

- **Task Board** data source: `collection://3630953c-224c-8065-8864-000bb9fe7bad`
- **Epic Board** data source: `collection://2510953c-224c-80b7-9bb0-000b5384a47d`
- **MCP server**: `notion`. **Read** with `notion-query-data-sources` (SQL over the data source) +
  `notion-fetch` (page body — the query returns properties only). **Create** with
  `notion-create-pages`. **Update** with `notion-update-page`.
- `Status`: `On Hold` · `Backlog` · `Needs More Info` · `Ready` · `Queued` · `In Progress` ·
  `Blocked` · `Review` · `Duplicate` · `Won't Do` · `Done`. Status is a plain property write — set
  it directly, no transition step.
- `Priority`: `⇞P0` · `↑P1` · `↓P2` · `⇟P3` (a ticket's urgency).
- `Type`: `Bug` · `Task` · `Story` · `Spike`.
- `Target`: `MVP` · `Fast-follow` · `Later` — which release the ticket ships in (orthogonal to
  Priority).
- `Assignee`: `Me` · `Fable` · `Opus` · `Sonnet` — which agent model works the ticket in
  `/work batch`. **`Me` means hands-off** — the user works it themselves; `/triage` and `/work`
  leave it alone. `Status = On Hold` carries the same meaning.
- `Epic`: relation to the Epic Board (single).
- `ID` is a **read-only auto-increment** — never set it. Tickets are referred to as `#<n>`.

> **The board is the source of truth for these option lists, not this file.** A hardcoded vocabulary
> here once went stale and `Spike` was invisible for months — tickets encoded it in their titles
> instead. `notion-fetch` on the data-source URL returns the live options; check when a value seems
> not to fit, and fix this file.

## Fields when cutting

| Field      | Value when cutting                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `Status`   | **`Backlog`**, always — a new ticket is un-triaged by definition                                                           |
| `Assignee` | **empty** — only set when a ticket reaches `Queued`                                                                        |
| `Type`     | `Bug` broken · `Task` defined change · `Story` user-facing capability · `Spike` the deliverable is a decision, not shipped |
| `Priority` | `⇞P0` data loss/security/broken core flow · `↑P1` real pain · `↓P2`/`⇟P3` rest                                             |
| `Target`   | **empty** at cut time — a triage/groom decision, not a capture one                                                         |
| `Epic`     | match the Epic Board; if nothing fits, propose a new epic rather than force-fit                                            |

Never write `Ready` or `Queued` — those assert an agent can execute the ticket, which is never true
at capture time. Never write `On Hold` or `Assignee = Me` on a fresh ticket — that's the user's own
hands-off marker.

## Priority vs Target — two axes, don't collapse them

`Priority` answers **in what order** (urgency/sequencing). `Target` answers **which release**
(scope). They are orthogonal — a pre-launch `MVP` ticket still ranges `P0`→`P3`, so all four
priority tiers stay meaningful inside the launch set instead of two being spent marking the cut-line.

- `MVP` — ships before launch.
- `Fast-follow` — committed to the first post-launch cycle. Has a home; gets swept.
- `Later` — genuinely deferred, allowed to be quiet.

A ticket stays in its epic regardless of `Target` — the epic is the resurfacing anchor, not a
graveyard. `Fast-follow` items surface in the **Fast-follow** board view (all epics, sorted by
priority) for the post-launch sweep. Leave `Target` empty at capture; `/triage` and `/groom` set it.

## Body

The body is the Notion **page content**. Prefer `replace_content` for a full rewrite over a chain of
`update_content` edits. Use **bullets, not numbered lists**, for anything ordered — Notion renumbers
ordered lists and the churn shows up as noise in the page history.

**One section list. Each stage fills more of it — no stage invents sections.**

| Section                  | Owner      | Notes                                                        |
| ------------------------ | ---------- | ------------------------------------------------------------ |
| `## Product description` | cut        | 1–3 lines, product terms                                     |
| `## Repro`               | cut        | bugs only                                                    |
| `## Acceptance criteria` | triage     | the only technical section — see below                       |
| `## Open questions`      | cut/triage | unresolved forks; groom settles each into an AC + deletes it |
| `## Blocked on`          | groom      | external facts only; omit if none                            |

**There is no `## Decisions` section.** A resolved decision is an acceptance criterion.

A ticket carries only the sections that have content. Length tracks how much of the work is
**decision** rather than typing — a mechanical change gets six lines, a cross-cutting refactor earns
its ownership table and execution order.

### `## Acceptance criteria` — the only technical section

Every resolved decision, chosen value, named mechanism, reuse pointer, and rejected path is an
acceptance criterion. There is no "Decisions" or "Technical notes" section — worth recording means
worth phrasing as pass-or-fail.

Five gates on every AC:

- **Independently failable.** "The menu shows the new option" can't fail separately from the feature
  existing — that's Product description as a checkbox. "Never-reviewed cards sort last" can. A
  rejected path counts too, as a negative: "no cross-session outbox is added".
- **Concrete.** Values, mechanisms, exact copy — _in_ the criterion. Not "retries the save";
  "retries 3× at 0.5s / 1s / 2s, then marks it failed".
- **One sentence.** A second sentence means it's two ACs, or padding.
- **No `or` / `either` / `e.g.` / parenthetical alternatives** — a hedge is an unresolved decision;
  route it to `Needs More Info`.
- **No smuggled design; no implementation.** A competence claim ("handles X correctly", "works
  across Y") isn't concrete unless X's behaviour is spelled out — undecided behaviour is an
  `## Open questions` fork, not an AC. And an AC pins the _design_ decision (placement, host, copy,
  states, behaviour), never the _implementation_ (which composable, how it's wired) — that's a "built
  from X" clause at most.

**Delete-test, per clause:** if removing it leaves no criterion ambiguous or unfailable, cut it.
Rationale, plumbing traces, and restatements of another AC all fail it.

> **Bloated** (a "Decisions" bullet restating an AC): _Optimistic advance stays; only the commit is
> gated — the card flies away instantly, tracked by a per-card pending/saved/failed status. Rejected:
> blocking the UI._
> **Lean** (the AC alone): _A rated card advances instantly and is recorded `pending`, with no saving
> state; it becomes durably reviewed only once its save confirms._

**Still earns space** — won't be rediscovered: **prior art** (the primitive/rule already governing
the surface, as a "built from X" clause), a bug's confirmed **root cause**, **negative facts**.
Money / auth / boundary claims: `CONFIRMED (verified against <source>)`, else `ASSUMED`. A filepath
only when it's the _answer_, never a line number.

**Never earns space** — grep finds it in seconds: which files to edit, how the current code works,
framework mechanics.

Written concrete as decisions resolve (mostly groom). At cut time, only acceptance the user dictates,
verbatim.

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
- **Say it once.** If Product description already carries a fact, no other section repeats it.
- **Plain, not flowery.** Short microcopy stays plain — avoid AI-flavoured flourishes and bare
  keyword lists alike.
- **Record only what you know.** A confirmed root cause is stated; a guess is labelled
  `⚠️ Hunch-level — not code-confirmed`.
- **Never resolve a taste decision at cut time.** Which icon, what an animation feels like, what the
  copy says, how a layout should look — record as open. `/groom` settles them with the user.
- New user-facing text → note that locale keys are needed (`src/locales/en-us.json`), see
  [`i18n`](./i18n.md).
- **Copy is the user's to sign off.** Any new or changed user-facing string carries its exact final
  wording in the AC, signed off by the user — never chosen for them, never deferred. Reused copy is
  stated as reused (same wording, its own key — keys aren't shared across features). A ticket with
  undecided copy is not `Ready`.

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

### New epics

Propose first, never create silently. Give a one-line scope, not a full spec. Set the icon to a
Notion built-in via its hosted SVG — `https://www.notion.so/icons/<name>_<color>.svg` (colours:
`gray|brown|orange|yellow|green|blue|purple|pink|red`). Not an emoji. The bare
`icons/<name>_<color>` path is accepted by the API but **renders blank** — always the full `.svg`
URL.

## Dependencies

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
produces orphans: `/work batch` picks up step 3 of 5 with no way to know step 1 must land first.

## Batch work

For more than a couple of tickets at once, delegate to the `ticket-author` agent.
