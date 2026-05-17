# Study session — composables, config, FSRS

The study-session composables live in `src/composables/study-session/` and are split into two layers.

## Core (`study-session-core.ts`) — mode-agnostic

`useStudySessionCore(config?)` owns everything that is the same regardless of how the user interacts with cards:

- Queue management: `_raw_cards`, `_cards_in_deck`, `_retry_cards`
- Session lifecycle: `mode: 'studying' | 'completed'`, `active_card`
- FSRS scheduling: `_FSRS_INSTANCE`, `_setupCard`, per-card `preview` (all four rating outcomes)
- Stats: `num_correct`, `reviewed_count`, `remaining_due_count`, `current_index`
- Persistence: `reviewCard` → `useSaveReviewMutation`
- Config: `setCards`, `updateConfig`

`_processCards()` — called by `setCards` and `updateConfig`. Applies due filter → shuffle → `card_limit`, maps to `StudyCard` (adds FSRS `preview`), resets retry queue, resets `mode` to `'studying'`, picks first card.

`reviewCard(item?)` — updates card state (passed/failed), optionally retries, advances `active_card`, sets `mode = 'completed'` when none remain, fires `useSaveReviewMutation`.

## Flashcard mode (`flashcard-session.ts`)

`useFlashcardSession(config?)` builds on top of the core by adding the concept of card sides:

- `current_card_side: 'front' | 'back' | 'cover'` — drives what face the active card shows
- `is_starting_side` — true when on the configured starting face
- `next_card` — the next unreviewed card (used by the preview animation)
- `is_cover` — true when still on the cover screen
- `startSession()` — sets `current_card_side` to `starting_side` (cover → front/back)
- `flipCurrentCard()` — toggles front ↔ back
- `reviewCard(item?)` — wraps core's `reviewCard`, then resets `current_card_side` to `starting_side` for the incoming card

**Adding a new mode:** create `<mode>-session.ts` that calls `useStudySessionCore` and adds its own interaction state (e.g. `matched_ids` for matching-pairs). Create `session-<mode>.vue` as the body component with `defineExpose({ requestClose })` and `useModalRequestClose(requestClose)`. Wire it into `index.vue`'s body slot (swap the hard-coded `<session-flashcard>` for a `<component :is>` driven by `deck.study_config?.study_mode`).

## DeckConfig

```ts
type DeckStudyMode = 'flashcard' // extend as new modes are added

type DeckConfig = {
  study_mode?: DeckStudyMode // which interaction model to use
  study_all_cards: boolean // bypass due filter
  shuffle?: boolean
  card_limit?: number | null // slice after filter; null = no limit
  flip_cards?: boolean // swap front/back starting side (flashcard mode)
}
```

`config_override` is merged into the initial config object passed to `useFlashcardSession` at construction — no second `_processCards` pass.

## FSRS

`ts-fsrs` used for scheduling. Parameters: `enable_fuzz: true`, no learning/relearning steps. Each card gets a `preview: RecordLog` (all four rating outcomes pre-computed via `FSRS.repeat`). `reviewCard` writes the chosen `RecordLogItem` back to the card and persists via `useSaveReviewMutation`. Due date check: `review.due <= now` (ISO string from Supabase or `Date` from `createEmptyCard`).
