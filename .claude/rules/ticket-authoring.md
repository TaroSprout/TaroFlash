# Ticket Authoring

How to cut a ticket on the Notion Task Board. Applies whenever the user says "cut a ticket", "file
that", "add that to the board", or when out-of-scope work is found mid-task.

Cutting a ticket **captures**; it does not spec. `/triage` specs it later.

## Board constants

- **Task Board**: `collection://3630953c-224c-8065-8864-000bb9fe7bad`
- **Epic Board**: `collection://2510953c-224c-80b7-9bb0-000b5384a47d`
- `Priority`: `⇞P0` · `↑P1` · `↓P2` · `⇟P3` — `Type`: `Bug` · `Task` · `Story` · `Spike`
- `ID` is read-only auto-increment. Never set it.
- **The board is the source of truth for these lists, not this file.** `notion-fetch` on the
  data-source URL returns the live options; check when a value seems not to fit, and fix this file.

## Fields

| Field      | Value when cutting                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Status`   | **`Backlog`**, always — a new ticket is un-triaged by definition                                                                     |
| `Assignee` | **empty** — only set when a ticket reaches `Queued`                                                                                  |
| `Type`     | `Bug` broken · `Task` defined change · `Story` user-facing capability · `Spike` the deliverable is a decision, not shipped behaviour |
| `Priority` | `⇞P0` data loss/security/broken core flow · `↑P1` real pain · `↓P2`/`⇟P3` rest                                                       |
| `Epic`     | match the Epic Board; if nothing fits, propose a new epic rather than force-fit                                                      |

Never write `Ready` or `Queued` — those assert an agent can execute the ticket, which is never true
at capture time.

## Body

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

Propose first, never create silently. Icon is a Notion built-in via its hosted SVG —
`https://www.notion.so/icons/<name>_<color>.svg` (`gray|brown|orange|yellow|green|blue|purple|pink|red`).
Not an emoji. The bare `icons/<name>_<color>` path is accepted by the API but **renders blank**.

## Batch work

For more than a couple of tickets at once, delegate to the `ticket-author` agent.
