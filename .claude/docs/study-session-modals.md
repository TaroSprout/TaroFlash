# Study session — entry point & modal orchestration

`src/composables/modals/use-study-modal.ts` — `useStudyModal().start(deck, config_override?)` is the only public entry point. It:

1. Opens `StudySession` modal (mobile-sheet). Awaits `StudySessionResponse`.
2. If a response was returned, computes the `SecondaryAction` and opens `SessionComplete` modal. Awaits `SecondaryAction | undefined`.
3. On secondary action response, recursively calls `start()` with the correct `config_override` (`{ study_all_cards: true }` for study-all/study-again, nothing for study-more).

`SecondaryAction` logic:

- `study_all_used === true` → `'study-again'`
- `remaining_due > 0` → `'study-more'`
- else → `'study-all'`

## Modal components

`src/components/modals/study-session/index.vue` — wrapper. Accepts `deck`, `config_override?`, and `close`. Exports `StudySessionResponse { score, total, remaining_due, study_all_used }`. Renders a `mobile-sheet` with the deck title in the `header-content` slot and the mode component (`<session-flashcard>` for now; swap to `<component :is>` when additional modes are added) in the `body` slot. The mobile-sheet's built-in close button emits `@close`, which calls `requestClose()` on the active mode component via template ref — falling back to `close()` if the mode hasn't exposed one. Wires the mode's events to the `close` prop: `'closed'` → `close()`, `'finished'(score, total, remaining_due, study_all_used)` → `close({ score, total, remaining_due, study_all_used })`.

`src/components/modals/study-session/session-flashcard.vue` — flashcard mode body. Fetches cards via `useCardsInDeckQuery`, merges `deck.config + config_override` at construction (single `_processCards` pass). Exposes `requestClose()` via `defineExpose` and registers it with `useModalRequestClose` so backdrop/Esc also routes through it. `requestClose` decides whether to emit `'closed'` or `'finished'` based on session state. Emits:

- `'closed'` — user closed before studying any card (cover not dismissed, or 0 reviewed)
- `'finished'(score, total, remaining_due, study_all_used)` — session completed naturally (via `finish-animation @done`) OR user closed early after ≥1 reviewed card. Early-close passes `reviewed_count` as `total`.

`src/components/modals/study-session/session-complete.vue` — score summary. Accepts `score`, `total`, `secondary_action: SecondaryAction`, and `close(action?: SecondaryAction)`. Renders inside a `mobile-sheet` with the dynamic heading ("Perfect!" / "Great job!" / "Nice work!" / "Keep it up!") in the `header-content` slot, the score display in `body`, and two buttons in `footer`: Close (`close()`) and secondary (`close(secondary_action)`).

## Card flow in session-flashcard.vue

Cover card shown on mount → user clicks Start → `startSession()` → `current_card_side` flips to `starting_side` → user reveals back → `onRated(grade)` triggers the fling animation on the `study-card` ref → `onCardReviewed(item)` pre-flips the preview card (awaits `flip-complete`), then calls `reviewCard(item)` → composable advances `active_card` or sets `mode = 'completed'` → `finish-animation` plays → `@done` fires `emit('finished', ...)`.

The preview-card animation uses a `resolveFlip` one-shot promise resolver. `onUnmounted` resolves it as a safety fallback so the promise never leaks if the component tears down mid-animation.
