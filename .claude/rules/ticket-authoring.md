# Ticket Authoring

How to cut a ticket in Jira (project **TARO**). Applies whenever the user says "cut a ticket", "file
that", "add that to the board", or when out-of-scope work is found mid-task.

Cutting a ticket **captures**; it does not spec. `/triage` specs it later.

## Jira connection

- **Project**: `TARO` (TaroFlash) — team-managed, on Atlassian Cloud.
- **MCP server**: `atlassian` (official remote). Every tool takes a `cloudId` — use the site URL
  **`taroflash.atlassian.net`** (UUID `44337aa0-a241-46a1-bc42-e7b4aa1d560b` also works).
- **Create** with `createJiraIssue` (`projectKey: TARO`, `issueTypeName`, `summary`, markdown
  `description`, `additional_fields` for priority / parent / custom fields). **Read/search** with
  `searchJiraIssuesUsingJql` + `getJiraIssue`. **Update** with `editJiraIssue`. **Move status** with
  `getTransitionsForJiraIssue` → `transitionJiraIssue`.
- The key `TARO-<n>` is Jira's own auto-assigned sequence — never set it. URL:
  `https://taroflash.atlassian.net/browse/TARO-<n>`.

## Fields & vocab

- **Type** (`issueTypeName`): `Bug` · `Task` · `Story` · `Spike` (epics are type `Epic`).
- **Priority**: `Highest` · `High` · `Medium` · `Low` (a ticket's urgency; Jira defaults new issues
  to `Medium`).
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

## Priority vs Target — two axes, don't collapse them

`Priority` answers **in what order** (urgency/sequencing). `Target` answers **which release**
(scope). They are orthogonal — a pre-launch `MVP` ticket still ranges `Highest`→`Low`, so all four
priority tiers stay meaningful inside the launch set instead of two being spent marking the cut-line.

- `MVP` — ships before launch.
- `Fast Follow` — committed to the first post-launch cycle. Has a home; gets swept.
- `Later` — genuinely deferred, allowed to be quiet.

A ticket stays under its epic regardless of `Target` — the epic is the resurfacing anchor, not a
graveyard. `Fast Follow` items surface via a Jira board/filter view (`Target = "Fast Follow"`, all
epics, sorted by priority) for the post-launch sweep. Leave `Target` empty at capture; `/triage` and
`/groom` set it.

## Body

Pass the body as the issue **`description`** with `contentFormat: markdown` — Markdown headings,
lists, and checkboxes render natively in Jira; no ADF needed.

**Bug**

```
## Product description
<1–3 lines: what the user sees and why it's wrong, product terms>
## Repro
1. …
## Expected / Actual
- Expected: … / Actual: …
## Technical notes
- Area: <path(s)> — <root cause if known>
- Prior art: <the primitive/utility/rule already governing this surface>
- Found during: <what was being worked on>
```

**Task / Story** — same, minus Repro and Expected/Actual.

## Voice

- **Product description is product terms** — screens, flows, what the user experiences. No filepaths
  or symbols; those live in Technical notes.
- **Plain, not flowery.** Short microcopy stays plain — avoid AI-flavoured flourishes and bare
  keyword lists alike.
- **Record only what you know.** A confirmed root cause is stated; a guess is labelled
  `⚠️ Hunch-level — not code-confirmed`. `/triage` trusts what's written.
- **No acceptance criteria** — writing them invites inventing scope nobody agreed to. Exception:
  acceptance the user dictates, recorded verbatim.
- **Never resolve a taste decision.** Which icon, what an animation feels like, what the copy says,
  how a layout should look — record as open, never pick.
- **Prior art is the highest-value line.** The primitive that already governs the surface is what
  stops an implementer reinventing it.
- New user-facing text → note that locale keys are needed (`src/locales/en-us.json`), see
  [`i18n`](./i18n.md).

## New epics

Propose first, never create silently. Create with `createJiraIssue` (`issueTypeName: "Epic"`,
`summary` = the epic name); optionally set an issue colour via `additional_fields.customfield_10017`.
Give a one-line scope, not a full spec — an epic is a resurfacing anchor.

## Batch work

For more than a couple of tickets at once, delegate to the `ticket-author` agent.
