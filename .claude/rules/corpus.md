---
lastUpdated: 2026-08-08T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
  - 'supabase/**/*'
---

# Corpus — domain knowledge for the area you're touching

**Scope: any change to app or backend code.** `corpus/` holds the durable domain truths — what is
true about the system, in plain language — one altitude above `docs/` implementation reference. It
cannot path-scope itself, so this file routes it.

**Read the trap register first: [`corpus/hazards.md`](../../corpus/hazards.md).** Every known place
the obvious assumption is quietly wrong, gathered across all domains. Generated — never hand-edit it;
tag the topic instead.

Then pull the topic for the area you're in:

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

[`corpus/map.md`](../../corpus/map.md) is the full index; [`corpus/CONTRIBUTING.md`](../../corpus/CONTRIBUTING.md)
covers how topics are written. The `archivist` agent owns edits — don't rewrite a topic in passing.

**A diff that contradicts a stated invariant is a bug.** A diff that changes one, or exposes a new
hazard, is the archivist's trigger.
