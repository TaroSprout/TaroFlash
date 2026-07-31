# Ticket Authoring

**The single source of truth for what a TARO ticket looks like.** Board constants, body shape,
brevity, and voice. `/triage` and `/groom` declare their own routing and lanes — never their own
templates or voice rules. If a body rule isn't here, it doesn't exist.

Applies whenever the user says "cut a ticket", "file that", "add that to the board", or when
out-of-scope work is found mid-task.

## Jira connection

- **Project**: `TARO` (TaroFlash) — team-managed, on Atlassian Cloud.
- **MCP server**: `atlassian` (official remote). Every tool takes a `cloudId` — use the site URL
  **`taroflash.atlassian.net`** (UUID `44337aa0-a241-46a1-bc42-e7b4aa1d560b` also works).
- **Create** with `createJiraIssue` (`projectKey: TARO`, `issueTypeName`, `summary`, markdown
  `description`, `additional_fields` for priority / parent / custom fields). **Read/search** with
  `searchJiraIssuesUsingJql` + `getJiraIssue`. **Update** with `editJiraIssue`. **Move status** with
  `getTransitionsForJiraIssue` → `transitionJiraIssue`. **Link** with `createIssueLink`.
- The key `TARO-<n>` is Jira's own auto-assigned sequence — never set it. URL:
  `https://taroflash.atlassian.net/browse/TARO-<n>`.

## Fields & vocab

- **Type** (`issueTypeName`): `Bug` · `Task` · `Story` · `Spike` (epics are type `Epic`).
- **Priority**: `Highest` · `High` · `Medium` · `Low` (urgency; Jira defaults new issues to
  `Medium`).
- **Status**: `Backlog` · `Needs More Info` · `Ready` · `Queued` · `In Progress` · `In Review` ·
  `Blocked` · `On Hold` · `Done` · `Duplicate` · `Won't Do`. New issues are born in `To Do` and must
  be **transitioned** to the target status.
- **Target** (`customfield_10042`): `MVP` · `Fast Follow` · `Later` — which release the ticket ships
  in (orthogonal to Priority).
- **Model** (`customfield_10043`): `Sonnet` · `Opus` · `Fable` — which agent model works the ticket
  in `/work batch`. This is the routing field (it replaced the old board's Assignee); it is **not**
  Jira's native Assignee (a person), which stays unused.
- **Parent**: the epic a ticket belongs to (`additional_fields.parent` = epic key, e.g. `TARO-7`).
- `On Hold` means **hands-off** — the user works it themselves. `/triage` and `/work` leave it alone.

> **The project is the source of truth for these option lists, not this file.**
> `getJiraProjectIssueTypesMetadata` / `getJiraIssueTypeMetaWithFields` return the live issue types,
> statuses, and custom-field ids; check when a value seems not to fit, and fix this file.

## Fields when cutting

| Field                    | Value when cutting                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `Status`                 | **`Backlog`**, always — a new ticket is un-triaged by definition. Create in `To Do`, then transition to `Backlog`.         |
| `Model`                  | **empty** — only set when a ticket reaches `Queued`                                                                        |
| `Type` (`issueTypeName`) | `Bug` broken · `Task` defined change · `Story` user-facing capability · `Spike` the deliverable is a decision, not shipped |
| `Priority`               | `Highest` data loss/security/broken core flow · `High` real pain · `Medium`/`Low` rest                                     |
| `Target`                 | **empty** at cut time — a triage/groom decision, not a capture one                                                         |
| `Parent` (epic)          | match an existing epic; if nothing fits, propose a new epic rather than force-fit                                          |

Never write `Ready` or `Queued` — those assert an agent can execute the ticket, which is never true
at capture time. Never write `On Hold` on a fresh ticket — that's the user's own hands-off marker.

## Body

Pass the body as the issue **`description`** with `contentFormat: markdown` — Markdown headings,
lists, and checkboxes render natively in Jira; no ADF needed.

**One section list. Each stage fills more of it — no stage invents sections.**

| Section                  | Owner  | Notes                                            |
| ------------------------ | ------ | ------------------------------------------------ |
| `## Product description` | cut    | 1–3 lines, product terms                         |
| `## Repro`               | cut    | bugs only; numbered steps                        |
| `## Acceptance criteria` | triage | **never at cut time** — see below                |
| `## Decisions`           | triage | seeds prior art + rejected paths; groom resolves |
| `## Blocked on`          | groom  | external facts only; omit if none                |

A ticket carries only the sections that have content. Length tracks how much of the work is
**decision** rather than typing — a mechanical change gets six lines, a cross-cutting refactor
earns its ownership table and execution order.

### `## Acceptance criteria` — only what can fail independently

An AC earns its place when it can fail on its own. "The menu shows the new option" cannot fail
separately from the feature existing — that's the Product description restated as a checkbox. "Never
reviewed cards sort last" and "survives infinite-scroll pagination" can fail on their own; those are
the ACs.

No `or`, `either`, `e.g.`, or parenthetical alternatives — a hedge in an AC is an unresolved
decision, and it routes to `Needs More Info`.

**Not written at cut time.** Writing them before investigation invites inventing scope nobody agreed
to. Exception: acceptance the user dictates, recorded verbatim.

### `## Decisions` — the only technical section

There is no "Technical notes" section. Investigation findings are not recorded; **decisions are.**
The claiming agent does its own exploration.

The test for every line:

> **Will the claiming agent rediscover this on its own?**

| Cut — rediscovered in seconds     | Keep — won't be found, or found too late                       |
| --------------------------------- | -------------------------------------------------------------- |
| Which files to edit, line numbers | **Prior art** — the primitive/util/rule already governing this |
| How the current code works        | The path deliberately **rejected**, and why                    |
| The plumbing trace                | **Negative facts** — "no join change", "single UI surface"     |
| Framework/API mechanics           | Confirmed root cause of a bug                                  |

Prior art is the highest-value line in any ticket. An agent finds the file it needs in seconds; it
never finds "`ui-tappable` already encodes press styling" unless pointed, because you can't grep for
a thing you don't know exists. Negative facts are second — they delete exploration that would
otherwise happen.

Name a filepath when it's the _answer_ (the primitive to use, the seam to extend), not when it's
merely _where the work happens_. Never cite line numbers — they go stale and grep is faster.

Groom-resolved decisions carry: **what** was decided · **why**, in a line · **what was rejected and
why** (this is what stops a future session re-proposing it) · `CONFIRMED (verified against

<source>)` or `ASSUMED`. Anything touching money, auth, or a system boundary must be `CONFIRMED`.

### Never restate a rule that auto-loads

`.claude/rules/*` load by path; CLAUDE.md is always on. Writing "use `data-testid`", "theming
tokens", "declarative schema then `db diff`", or "do not touch tests" into a body is pure noise.

Name a rule file **only** when the ticket departs from it, or when the ticket's area wouldn't
trigger it.

## Voice

- **Product description is product terms** — screens, flows, what the user experiences. No
  filepaths, symbols, function names, or SQL. Those live in `## Decisions`.
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

## Epics

An epic is the resurfacing anchor for an effort, and the only place effort-level state lives.

```markdown
<one-line scope>

## Decisions so far

<!-- one line per resolved ticket: gist + link. The index — detail lives in the ticket. -->

- [<ticket summary>](url) — <one-line gist of what was decided>

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
here. One line + why. If an existing ticket turns out to sit here, close it (`Won't Do`) and leave
the line.

### New epics

Propose first, never create silently. Create with `createJiraIssue` (`issueTypeName: "Epic"`,
`summary` = the epic name); optionally set an issue colour via `additional_fields.customfield_10017`.
Give a one-line scope, not a full spec.

## Dependencies

When a ticket must land before another can start — most often after `/groom` splits one ticket into
several — wire it with Jira's native **`Blocks`** link, not a line in the body:

```
createIssueLink  type: "Blocks"  inwardIssue: <blocker>  outwardIssue: <blocked>
```

(`inward` = blocker, `outward` = blocked; reads "blocked _is blocked by_ blocker".) Native links
render in the Jira UI, so what's actually takeable is visible without opening a ticket.

A split that emits siblings with no edges and no `## Decisions so far` entry on the epic produces
orphans: `/work batch` picks up step 3 of 5 with no way to know step 1 must land first.

## Batch work

For more than a couple of tickets at once, delegate to the `ticket-author` agent.
