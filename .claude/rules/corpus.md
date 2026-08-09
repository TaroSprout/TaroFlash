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

Pull the topic for the area you're in:

| Working in                                                     | Topic                              |
| -------------------------------------------------------------- | ---------------------------------- |
| `src/api/**`, cache invalidation, anything reading server data | `corpus/architecture/data-flow.md` |
| `src/composables/can.ts`, RLS policies, any `can_` check       | `corpus/authz/permissions.md`      |
| `src/api/cards/**`, `src/components/card/**`, card ordering    | `corpus/cards/cards.md`            |
| `src/api/decks/**`, deck sharing / visibility                  | `corpus/decks/decks.md`            |
| `src/api/feedback/**`, the public wall & moderation            | `corpus/feedback/feedback.md`      |
| `src/api/media/**`, `supabase/functions/cleanup-media`         | `corpus/media/media.md`            |
| `supabase/functions/transcribe-lesson`, lesson audio chains    | `corpus/media/audio-generation.md` |
| `src/api/members/**`, `src/stores/member.ts`, signup           | `corpus/members/members.md`        |
| `src/api/review-pacing/**`, per-deck dials & presets           | `corpus/pacing/pacing.md`          |
| `src/composables/fsrs.ts`, `src/api/reviews/**`, FSRS          | `corpus/scheduling/scheduling.md`  |
| `src/views/study-session/**`, a run through a pile             | `corpus/study/study.md`            |
| `src/styles/**`, `src/stores/theme.ts`, palettes               | `corpus/theming/theming.md`        |

[`corpus/map.md`](../../corpus/map.md) is the full index; [`corpus-authoring`](./corpus-authoring.md)
covers how topics are written. The `corpus-author` agent owns edits — don't rewrite a topic in passing.

**A diff that contradicts a stated invariant is a bug.** A diff that changes one, or exposes a new
hazard, is what wakes `corpus-author`.
