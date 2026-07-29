---
name: cut-ticket
description: Create a new ticket on the TaroFlash Notion Task Board from whatever is being discussed — a bug just found, work discovered but out of scope, an idea worth not losing. Captures the session's hard-won context (root cause, file paths, prior art) into the body so it isn't rediscovered later, then lands it in `Backlog` for `/triage` to pick up. Use whenever the user says "cut a ticket", "make a ticket", "file that", "add that to the board", or when substantial out-of-scope work is discovered mid-task.
allowed-tools: Read, Grep, Glob, Bash, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-create-pages, mcp__notion__notion-update-page
argument-hint: '[what the ticket is about]'
arguments:
  - name: description
    description: Free-text description of the ticket. Omit to use the current conversation's context.
lastUpdated: 2026-07-29T00:00:00Z
---

## What this skill does

Files a new ticket on the Task Board and **stops there**. It does not groom, spec, or schedule —
`/triage` does that later.

The one thing it must get right: **capture the context this session already paid for.** A ticket cut
mid-investigation knows the root cause, the file paths, and the governing primitive. Losing that
means someone re-derives it in a week.

## Board constants

- **Task Board** data source: `collection://3630953c-224c-8065-8864-000bb9fe7bad`
- **Epic Board** data source: `collection://2510953c-224c-80b7-9bb0-000b5384a47d`
- `Status`: `Backlog` · `Needs More Info` · `On Hold` · `Ready` · `Queued` · `In Progress` · `Blocked` · `Review` · `Done` · `Duplicate`
- `Priority`: `⇞P0` · `↑P1` · `↓P2` · `⇟P3`
- `Type`: `Bug` · `Task` · `Story`
- `Assignee`: `Me` · `Fable` · `Opus` · `Sonnet`
- `Epic`: relation to Epic Board (single). `ID` is read-only auto-increment — never set it.

## Procedure

### 1. Check for a duplicate

Query the board for obvious overlap before creating. A near-duplicate is worth mentioning to the
user rather than silently adding a second ticket.

```sql
SELECT "userDefined:ID" AS id, "Name", "Status", url
FROM "collection://3630953c-224c-8065-8864-000bb9fe7bad"
WHERE "Status" NOT IN ('Done', 'Duplicate')
```

Filter by keyword in your head — SQL `LIKE` across the whole board is fine too. If something close
exists, say so and ask: new ticket, or add a note to the existing one?

### 2. Pick the fields

- **Status** — **`Backlog`**. Always. A freshly-cut ticket has not been triaged, and `Ready`/`Queued`
  mean "an agent can execute this", which is never true yet. Only override if the user says so.
- **Type** — `Bug` (something is broken), `Task` (a defined change), `Story` (user-facing capability).
- **Priority** — propose one, don't agonize. `⇞P0` data loss / security / broken core flow ·
  `↑P1` real user pain · `↓P2` worth doing · `⇟P3` someday.
- **Epic** — match against the Epic Board. If nothing fits, say so and propose a new epic rather than
  forcing a bad match (see § New epics).
- **Assignee** — **leave empty.** Assignee is only set when a ticket reaches `Queued`.

### 3. Write the body

Use the matching template. Keep it tight — this is a capture, not a spec.

**Bug**

```
## Product description
<1–3 lines: what the user sees and why it's wrong, product terms>
## Repro
1. …
## Expected / Actual
- Expected: …
- Actual: …
## Technical notes
- Area: <path(s)> — <root cause if known>
- Prior art: <the primitive/utility/rule that already governs this surface>
- Found during: <what was being worked on, + ticket/PR if any>
```

**Task / Story**

```
## Product description
<what & why for the user, product terms>
## Technical notes
- Area: <path(s)>
- Prior art: <the primitive/utility/rule that already governs this surface>
- Found during: <what was being worked on, + ticket/PR if any>
```

Rules for the body:

- **Product description is in product terms** — screens and flows, no filepaths. Technical notes is
  where paths and symbols go.
- **Record what you actually know, and only that.** If the root cause was confirmed this session,
  state it. If it's a hunch, label it `⚠️ Hunch-level — not code-confirmed`. Never present a guess as
  a finding; `/triage` will trust what's written.
- **No acceptance criteria.** Writing ACs invites inventing scope that hasn't been agreed. `/triage`
  writes them after investigating. The exception is when the user dictates the acceptance
  themselves — then record it verbatim.
- **Never resolve a design decision.** If the work needs a taste call — which icon, what an animation
  feels like, what the copy says, how a layout should look — write the decision down as open. Do not
  pick for the user.
- **Note new copy.** If the ticket implies user-facing text, note that locale keys are needed
  (`src/locales/en-us.json`) per the i18n rule.

### 4. Create it

`notion-create-pages` against the Task Board. Set an icon only if one is obviously apt; otherwise
leave it.

### 5. Report

One line: `TARO-<ID> · <title> · <Priority> · <Type> → Backlog` plus the URL. Nothing else.

## New epics

Only when nothing on the Epic Board fits. Propose it to the user first — never create one silently.

Set the icon to a Notion built-in via its hosted SVG:

```
https://www.notion.so/icons/<name>_<color>.svg
```

Colors: `gray|brown|orange|yellow|green|blue|purple|pink|red`. Not an emoji. The bare
`icons/<name>_<color>` path is accepted by the API but **renders blank** — always the full `.svg` URL.

## Guardrails

- Only ever write to the Task Board / Epic Board above — never a backup or duplicate database.
- **Never `Ready` or `Queued`.** Cut tickets are un-triaged by definition.
- **Never set `Assignee`**, and never set `ID` (auto-increment).
- Don't invent scope. Capture what was said and what was found; leave the rest to `/triage`.
- One ticket per idea. If the user describes three things, propose three tickets.
