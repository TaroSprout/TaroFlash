---
lastUpdated: 2026-08-08T00:00:00Z
# Board vocabulary is dead weight in a code session — scoped so it loads only for board work.
# The board skills and the ticket-author agent name this file in their own body and read it; a
# glob on their paths would not fire, since invoking a skill never reads its file.
paths:
  - '.claude/rules/ticket-authoring.md'
---

# Task Board Schema

**The single source of truth for the board's shape** — data sources, the MCP server, and every field
with its option list. Skills and the authoring rule reference this file instead of re-listing
constants; change a field here once and every consumer follows.

- This file owns the **schema** (what fields exist, their options, their semantics).
- [`ticket-authoring.md`](./ticket-authoring.md) owns **authoring** (body sections, brevity, voice,
  which fields a stage fills).

> **The live board is the ultimate source of truth, not this file.** Option lists drift — a hardcoded
> vocabulary here once went stale and `Spike` was invisible for months. `notion-fetch` on a data-source
> URL returns the live options; check when a value seems not to fit, and fix this file. This is doubly
> true for **`Target`**, whose quarter options roll forward over time (see below).

## Data sources

- **MCP server**: `notion`.
- **Task Board** data source: `collection://3630953c-224c-8065-8864-000bb9fe7bad`
- **Epic Board** data source: `collection://2510953c-224c-80b7-9bb0-000b5384a47d`
- **Default page template** (pass on every `notion-create-pages` so the ticket inherits its default
  icon + field defaults): `template_id: 3af0953c224c800d984cf0b443d67d20`

**Three hard limits of the Notion MCP.** `status`-type fields are special-cased: `notion-update-data-source`
**cannot** add, rename or recolor `Status` options — only the user can, in the Notion UI (renaming
preserves row mappings). `select`/`multi_select` options _are_ editable. There is **no archive or
delete tool** — `notion-move-pages` only re-parents, so retiring a row means the user deletes it in the
UI. Page titles, properties and body content are all editable via `notion-update-page`.

**Read** with `notion-query-data-sources` (SQL over the data source) + `notion-fetch` (page body — the
query returns properties only). **Create** with `notion-create-pages`. **Update** with
`notion-update-page`. Status and all field writes are plain property writes — no transition step.
Add/remove/rename a field's **options** with `notion-update-data-source`
(`ALTER COLUMN "<field>" SET SELECT(...)`); dropping an option nulls any page still on it, so migrate
first and verify with a row-level `WHERE id IN (…)` query — Notion's aggregate `COUNT/GROUP BY` reads
lag row writes.

## Fields

### `Status` — a `status`-type field (grouped)

`On Hold` · `Backlog` · `Needs More Info` · `Groomed` · `Ready` · `In Progress` · `Blocked` ·
`Review` · `Duplicate` · `Won't Do` · `Done`. A plain property write — set it directly.

- **`complete` group** = `Done` · `Won't Do` · `Duplicate`. A `Blocked By` blocker is cleared only
  when its status is in this group.
- **`On Hold` = hands-off** (user-owned), same as `Assignee = Me`.
- Lane ownership by stage: `/triage` → `Needs More Info`; `/groom` → `Groomed`; the user promotes
  `Groomed` → `Ready`; `/work` claims `Ready` → `In Progress` → `Review`. New tickets
  are `Backlog`.

### `Priority` — `select` (a ticket's urgency)

`⇞P0` · `↑P1` · `↓P2` · `⇟P3`. **The glyphs sort by codepoint, not urgency** —
`↑`(P1, U+2191) `↓`(P2, U+2193) `⇞`(P0, U+21DE) `⇟`(P3, U+21DF) — so a raw `ORDER BY "Priority"`
buries every P0 below P1/P2 and a null leaps to the top. Always rank with a `CASE`:

```sql
CASE "Priority" WHEN '⇞P0' THEN 0 WHEN '↑P1' THEN 1 WHEN '↓P2' THEN 2 WHEN '⇟P3' THEN 3 ELSE 4 END
```

### `Type` — `select`

`Bug` (broken) · `Task` (defined change) · `Story` (user-facing capability) · `Spike` (the deliverable
is a decision, not shipped code).

### `Target` — `select` (which release/quarter it ships in)

`MVP` · `Q3 '26` · `Q4 '26` · `Q1 '27` · `side`.

- **`MVP`** — launch scope: everything gating the first ship. Occupies the current quarter alongside a
  few pulled-in tickets; kept as its own value rather than folded into the current quarter.
- **`Q3 '26` / `Q4 '26` / `Q1 '27`** — **rolling quarter buckets**. `Q3 '26` is the current quarter.
  As the horizon advances, **add the next quarter's option** (`Q2 '27`, …) and retire quarters once
  empty — the option set here is a snapshot, the live board is authoritative.
- **`side`** — side / experimental work, orthogonal to the roadmap.

`Target`'s options are **not** alphabetical and won't sort by urgency; rank with a `CASE` that lists
`MVP` first, then quarters chronologically, unset last:

```sql
CASE "Target" WHEN 'MVP' THEN 0 WHEN 'Q3 ''26' THEN 1 WHEN 'Q4 ''26' THEN 2 WHEN 'Q1 ''27' THEN 3 ELSE 9 END
```

Priority and Target are **orthogonal axes** — Priority answers _in what order_, Target answers _which
quarter_. Every quarter spans P0→P3. How `/backlog` fills Target (theme-grouped, priority-driven
overflow) lives at →[K:ticket-priority-vs-target] and in the
[`backlog`](../skills/backlog/SKILL.md) skill.

### `Assignee` — `select` (which model works the ticket in `/work`)

`Me` · `Fable` · `Opus` · `Sonnet`.

- **`Me` = hands-off** — the user works it themselves; `/triage`, `/backlog`, and `/work` leave it
  alone (same meaning as `Status = On Hold`).
- **`Fable` is the user's to assign**, never an agent's pick. `/groom` sets `Opus` or `Sonnet` when a
  ticket reaches `Groomed`.

### Relations & system fields

- **`Epic`** — relation to the Epic Board, **single** (limit 1).
- **`Blocked By`** / **`Blocks`** — a self-relation **reciprocal pair**: setting `Blocked By` on the
  dependent ticket fills `Blocks` on the blocker automatically. **Write only `Blocked By`.** Each holds
  a JSON array of page URLs, not statuses — judge takeability by reading the blockers' `Status` (see
  `complete` group above). Usage doctrine: →[K:ticket-dependencies].
- **`Finished Date`** — `date`, set when work completes.
- **`ID`** — read-only `auto_increment`. **Never set it.** Tickets are referred to as `#<n>` /
  `TARO-<n>`.
