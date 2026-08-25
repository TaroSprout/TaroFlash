---
lastUpdated: 2026-08-08T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
  - 'supabase/**/*'
---

# Corpus — domain knowledge for the area you're touching

**Scope: any change to app or backend code.** `corpus/` holds the durable domain truths — what is
true about the system, in plain language — one altitude above the implementation detail in a rule's
spokes. It cannot path-scope itself, so this file routes it.

**Traps come to you, not the other way round.** A `→[K:<slug>]` comment in the file you're editing
names a place the obvious assumption is quietly wrong; resolve it with `grep -rn '\[K:<slug>\]'
corpus/` and read the topic before you change anything around it.
[`corpus/hazards.md`](../../corpus/hazards.md) is the roll-call of every one — a slug and a topic
per line, no prose to drift. Never hand-edit an entry's text; it lives in the topic.

Find the domain for the area you're in, then read that domain's `_map.md` for the topic:
`corpus/<domain>/_map.md` — e.g. `corpus/cards/_map.md`. [`corpus/map.md`](../../corpus/map.md) is
the root index across every domain.

A source path doesn't always name its domain — three exceptions worth knowing up front:

| Working in                                                       | Domain         |
| ------------------------------------------------------------------ | -------------- |
| `src/composables/can.ts`, RLS policies, any `can_` check           | `authz`        |
| `src/api/**`, cache invalidation, anything reading server data     | `architecture` |
| `src/composables/fsrs.ts`, `src/api/reviews/**`, FSRS              | `scheduling`   |

[`corpus-authoring`](./corpus-authoring.md) covers how topics are written. The `corpus-author` agent
owns edits — don't rewrite a topic in passing.

**A diff that contradicts a stated invariant is a bug.** A diff that changes one, or exposes a new
hazard, is what wakes `corpus-author` — and when you can't reach it, the fact stays at the site as a
`[K:gap: …]` tag that fails CI until someone does (→[K:build-unfinished-markers]).
