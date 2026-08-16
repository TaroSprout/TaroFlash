---
lastUpdated: 2026-08-14T00:00:00Z
paths:
  - 'src/**'
  - 'supabase/**/*.ts'
  - 'scripts/**'
---

# Comment examples

One or more pairs per gate. The rules they encode live in
[`comment-authoring`](../comment-authoring.md).

## Everything past the first idea is load-bearing

`welcome/section-header.vue`

```typescript
// Bad
// Set when the header sits on an accent-filled section (e.g. pricing): text
// reads as on-accent and the rule as accent-muted. Otherwise the header sits
// on a neutral surface and reads as ink.
onAccent?: boolean

// Good
// True when this header sits on an accent-coloured section, so the text and
// rule switch to colours that read against it.
onAccent?: boolean
```

`composables/account/new-account.ts`

```typescript
// Bad — justifies the value instead of just naming it
// 30s is roomy next to typical onboarding flows, so treat accounts newer
// than this as still finishing setup.
const NEW_ACCOUNT_WINDOW_MS = 30_000

// Good
const NEW_ACCOUNT_WINDOW_MS = 30_000 // 30 seconds
```

## The opener completes the symbol's name

`composables/card/selection.ts`

```typescript
// Bad — opens on a downstream call's parameters, and justifies itself
/** Select-all is stored as exclusions — the delete RPC takes `except_ids`, so a
 *  10k-card deck never materialises an id array client-side. */

// Good
/**
 * Which cards are picked in the deck editor.
 *
 * Normally a list of the ones ticked. Under "select all" it flips — everything
 * is selected except the ones since unticked.
 *
 * @param total_card_count - Persisted card count for the deck, passed in so
 *   this stays independent of the decks query.
 */
```

`deck-hero.vue`

```typescript
// Bad — opens on the caller's name, not what the function does
/** Deck-hero "Export cards": the whole deck, ignoring any selection. */
async function onExportCards() { … }

// Good
/** Exports the whole deck, whatever happens to be selected. */
async function onExportCards() { … }
```

## Name the operation, not a consequence at one call site

`views/deck/composables/virtual-list.ts`

```typescript
// Bad
/** Keeps the same v-for key across the temp→persisted swap, so Vue reuses the DOM. */

// Good
/**
 * Syncs a local temp card to the real id the insert returned.
 *
 * The row keeps its identity through the swap, so it doesn't remount and the
 * user can carry on typing in it. →[K:deck-temp-card-handoff]
 */
```

## A complex mechanism can still have a simple meaning

`study-session/composables/session-engine.ts`

```typescript
// Bad — a compressed abstraction the reader has to unpack
/** Durability, not grade — a card can be rated and still not saved. */

// Good
/** A card's save state, separate from whether the user got it right. →[K:study-review-durability] */
```

## A declaration-block comment is body position, not a symbol doc

`layout-kit/scroll-region/index.vue`

```css
/* Bad — JSDoc-length paragraph over one custom property inside a rule block */
.scroll-region {
  /* How far in from this box's end edge the consumer wants its content to
     stop. A consumer that names nothing gets the handle's full band and
     nothing beyond it. */
  --scroll-content-end: var(--consumer-inset, var(--full-band));
}

/* Good */
.scroll-region {
  --scroll-content-end: var(--consumer-inset, var(--full-band)); /* falls back to the full band */
}
```

## Open on the situation, not the principle

`ui-kit/button.vue`

```css
/* Bad */
/* Identity is opt-in, attribute-on-self, leak-proof by construction. */

/* Good */
/* A button only takes on a palette's colours if `data-palette` is on the button
   itself. Attributes don't inherit, so a plain button sitting inside a coloured
   region stays neutral — deliberately, so palettes can't leak into everything
   nested under them. →[K:theming-palette-identity] */
```
