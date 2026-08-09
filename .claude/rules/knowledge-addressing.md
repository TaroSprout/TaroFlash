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
an unresolvable citation, a slug declared twice, a stray declaration, a malformed ledger entry, and
a breached line cap.

`.claude/knowledge-lint.json` is the **single declared place** for the always-on file list, the
caps, and the scan scope. Always-on = the `always_on.include` globs minus any file carrying `paths:`
frontmatter, since a `paths:` rule is path-triggered rather than loaded every session.

- `slugs.exempt` skips the citation scan. `supabase/migrations/**` is exempt because migrations are
  append-only, so a pointer written into one can never be corrected; `tests/unit/scripts/**` is
  exempt because the checker's own fixtures contain literal tokens. Nothing else earns a place there.
- Caps are `line_caps` — 80 lines for `CLAUDE.md`, 250 for the always-on total. A starting
  calibration, not a measured figure.
- `line_caps.enforced` is `true` — a breach fails CI. Set it to `false` only to land a deliberate,
  temporary overshoot, and restore it in the change that gets back under.

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

`scripts/knowledge-report.mjs` posts one comment, updated in place, and never blocks: the slugs the
changed code cites, the slugs this change dropped to zero citations, and the knowledge files it left
unroutable. It compares against the merge base, so it names only what this change caused.

`reachability.roots` in the config lists the files a reader arrives at unaided; everything else is
reachable only by being linked, `[[id]]`-referenced, or cited from a file that is.

## Mechanising a prose rule [K:knowledge-mechanisation]

- A PR landing a lint rule, hook, or CI check **deletes the prose rule it supersedes**, in the same
  PR.
- That check states the rationale and its `→[K:<slug>]` in its own failure message. A silent check
  plus deleted prose loses the knowledge outright.
