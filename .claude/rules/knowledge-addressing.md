---
lastUpdated: 2026-08-08T00:00:00Z
paths:
  - 'CLAUDE.md'
  - 'AGENTS.md'
  - '.claude/**/*.md'
  - 'corpus/**/*.md'
---

# Knowledge addressing

Every citable fact, rule, or trap gets a permanent slug, so anything can point at it and one grep
says whether it is still referenced. Headings get reworded and files get split — a slug survives
both, so renaming or splitting a knowledge file breaks no citation.

## Slugs [K:knowledge-slug-format]

- **Declare** with a bare `[K:<kebab-slug>]`, exactly once across the whole knowledge layer, on the
  line the fact lives on — usually trailing a heading or a bullet.
- **Cite** with `→[K:<slug>]`, from anywhere: source, tests, another knowledge file.
- Kebab-case only (`[a-z0-9-]`). Name the fact, not the file it currently sits in.
- **Resolve** a citation with one grep, no judgement — the declaration is the hit without the arrow:
  `grep -rn '\[K:<slug>\]' .`
- **Inbound reference count** is that same grep: hits minus the one declaration.

## Where a slug may be declared [K:knowledge-declaration-sites]

Only in the knowledge files listed under `slugs.declare_in` in
[`.claude/knowledge-lint.json`](../knowledge-lint.json) — `CLAUDE.md`, `AGENTS.md`, `.claude/**`,
`corpus/**`. A bare token anywhere else is a stray citation missing its arrow, and fails the check.

## Retirement [K:knowledge-slug-retirement]

A slug is **never reused**. When the fact goes, move the slug to
[`retired-slugs.md`](../knowledge/retired-slugs.md) as `- [K:<slug>] — <one-line epitaph>` and
delete every citation. Re-declaring or citing a retired slug fails the check.

## The check [K:knowledge-lint]

`pnpm knowledge:check` (`scripts/knowledge-lint.mjs`) runs on every PR as its own CI job — always,
never behind a paths filter, so a run that never happened is visible rather than silent. It fails on
an unresolvable citation, a slug declared twice, a stray declaration, a malformed ledger entry, a
slug declared but never cited from anywhere, and a breached line cap.

`.claude/knowledge-lint.json` is the **single declared place** for the always-on file list, the
caps, and the scan scope. Always-on = the `always_on.include` globs minus any file carrying `paths:`
frontmatter, since a `paths:` rule is path-triggered rather than loaded every session. A spoke's
`paths:` — see [`rule-authoring → Spokes`](./rule-authoring.md#spokes) — is scanned the same way: a
spoke that inherited its hub's `paths:` is path-triggered like the hub, not always-on.

- `slugs.exempt` skips the citation scan. `supabase/migrations/**` is exempt because migrations are
  append-only, so a pointer written into one can never be corrected; `tests/unit/scripts/**` is
  exempt because the checker's own fixtures contain literal tokens. Nothing else earns a place there.
- `slugs.citation_exempt` names specific slugs allowed to carry zero inbound references — a heading
  anchor in a document a reader arrives at directly (a `reachability.roots` entry), not a fact meant
  to be pointed at from elsewhere. Minting a slug and never citing it is otherwise a failure: a slug
  nobody points at cost nothing to declare and gives the next reader nothing to find, so it earns its
  keep or it's dropped — grep the file, delete the declaration.
- Caps are `line_caps` — 80 lines for `CLAUDE.md`, 1000 for the always-on total. 1000 is measured
  load with headroom, not a target — `node scripts/knowledge-lint.mjs` reports the current always-on
  line count on every run. `aspiration` is the number the payload is being shrunk toward — 400 — and
  the check warns on every run until it's met. Shrinking it — merging, retiring, or re-scoping a rule
  off the always-on payload — is [`harness-maintainer`](../agents/harness-maintainer.md)'s to find,
  dispatched to `harness-author` per [`self-heal → Dispatch`](./self-heal.md#dispatch).
- `line_caps.enforced` is `true` — a breach fails CI. Set it to `false` only to land a deliberate,
  temporary overshoot, and restore it in the change that gets back under.

## Unfinished work is tagged, never narrated [K:build-unfinished-markers]

An unattended build can hit two things it is not allowed to settle on its own. Each gets a marker at
the site, and the same check fails the branch until someone who can settle it does.

- **A knowledge gap** — the fact belongs in `corpus/` and the build can't put it there. Write
  `[K:gap: <the fact, in one line>]` riding the comment at the site, and leave the comment itself at
  its position's shape ([`comment-authoring`](./comment-authoring.md)). Never inline the depth
  instead.
- **Wording nobody signed off** — write the literal `COPY-TBD` as the string's value. Never invent
  one, and never bury the question in a report the reviewer has to read to find it.

Both are cleared by doing the work, never by deleting the marker: the gap becomes a `corpus/` topic
plus a `→[K:<slug>]` citation, the placeholder becomes the string the user chose.
`unfinished.scan` in the config is where the check looks; `unfinished.exempt` is for files that
contain the markers as literals rather than as work.

## Migrations answer for the record [K:knowledge-migration-gate]

`scripts/migration-knowledge-gate.mjs` fails a PR whose added migration leaves recorded knowledge
unanswered. Answer in the migration's own header, one line per group of schema objects:

```sql
-- knowledge: members, member_streaks — corpus/members/members.md
-- knowledge: purge_downgraded_decks — unrecorded
```

- Name **every** table, view, function, type, index target, policy target and trigger target the
  migration touches. The gate parses them itself and says how many you missed, never which.
- The right side is the knowledge file you checked the change against — amended where this migration
  made it false — or `unrecorded`. `unrecorded` fails when any knowledge file already describes that
  object.
- A migration that changes no schema object says `-- knowledge: no schema objects`.

## The pull-request digest [K:knowledge-pr-digest]

`scripts/knowledge-report.mjs` posts one comment, updated in place, and never blocks. **Silence is
the expected output** — it speaks only where the diff met recorded knowledge, which is a minority of
pull requests. Three sections, each a flat list of one-line entries:

- **Facts your changes sit on** — a corpus fact cited from a line this diff actually rewrote. A
  citation elsewhere in a file the diff merely touched is not a signal and is never listed.
- **Knowledge you changed** — a declaration whose own block this diff edited, still cited from code
  the diff never opened. [`corpus-authoring → Authority`](./corpus-authoring.md#authority) already
  makes the topic and its source echo ride one commit, so this is the backstop for the sibling site
  that got missed, not the common path.
- **Housekeeping** — a slug this change dropped to zero citations, and a knowledge file it left
  unroutable. Both compare against the merge base, so they name only what this change caused.

**Every entry is the declaration's own sentence, quoted.** The digest never paraphrases a fact and
never describes one — it prints what the corpus says, so it can be read without opening a topic.
Links ride footnotes as `topic — site, site`, keeping the line itself free of anything but the fact.

`reachability.roots` in the config lists the files a reader arrives at unaided; everything else is
reachable only by being linked, `[[id]]`-referenced, or cited from a file that is.

## A declaration states its fact on its line [K:knowledge-declaration-statement]

The digest quotes that line and nothing else, so the line has to carry the fact alone. Two shapes
yield one: a heading, `## <the fact> [K:<slug>]`, or a callout whose lead sentence states it,
`> [!HAZARD] [K:<slug>] **<the fact>**`. A callout is read to the end of its block and cut to whole
sentences; a slug buried mid-paragraph yields nothing at all.

Write the fact, not the section it lives in — `Nothing is derived` names a topic's argument, and
reaches the reviewer as a line that says nothing. `slugs.statement` in the config sets the floor;
`enforced` is `true` — a thin declaration fails CI the moment it lands.

## Mechanising a prose rule [K:knowledge-mechanisation]

- A PR landing a lint rule, hook, or CI check **deletes the prose rule it supersedes**, in the same
  PR.
- That check states the rationale and its `→[K:<slug>]` in its own failure message. A silent check
  plus deleted prose loses the knowledge outright.
