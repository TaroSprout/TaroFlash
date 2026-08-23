---
id: deck-card-editor
domain: decks
status: current
hazard: true
related: [decks, cards]
updated: 2026-08-23
---

# Deck card editor

How the deck editor's card list stays responsive while cards are still saving, and how a freshly
added row ends up focused without a race.

A card you just added isn't real yet. Typing a fresh card into existence takes a network
round-trip, but the editor doesn't make you wait for it — it drops a placeholder row in immediately
and saves it behind the scenes.

> [!HAZARD] [K:deck-focus-microtask-ordering] **The new row's autofocus target has to be set in the
> same tick as the placeholder, not after.**
> Staging a card queues Vue's own render of the new row, and that render flushes before any
> `await` further down the same function gets a chance to run. Set the focus target after one more
> `await`, and the row has already mounted and asked "is this me?" before the answer exists — it
> comes back false and nothing gets focused. The rule in code: assign in the same tick as insert,
> the row mounts before any later microtask.

## A new card starts as a placeholder, not a row in the database

The moment you ask for a new card, it gets a local id and a spot in the list — before any request
has gone out. That placeholder card saves itself in the background the instant it's created, so by
the time you've typed your first letter it's usually already a real, saved card.

The list only cares whether a card is a placeholder or a real one for one thing: whether the next
edit should create the row or update it. Everything else about rendering it is identical.

## The placeholder and the real row are the same row on screen

When the placeholder's save finishes, the server hands back the row's real id — but the on-screen
card doesn't remount to show it. It keeps the same identity it had as a placeholder, so the editor
you were typing into stays exactly where it was.

> [K:deck-temp-card-handoff] The placeholder is assigned a stable identity when it's first staged.
> That identity carries over once the save resolves and gets reused again when the card's real data
> arrives from the server — so on screen it reads as one continuous row, never a swap.

Losing that continuity would mean every fresh card blinks and drops focus the instant its first
save lands — mid-keystroke, for the fastest typists.

The placeholder is retired the moment the server's own copy shows up in the persisted list — from
then on that copy renders the row, and the placeholder has no job left. Keeping it past that point
is what resurrects a deleted card: the card leaves the persisted list, but the retired placeholder
is still sitting there believing it's real, so it renders the row right back.

## Only one card can be waiting for focus at a time

Several "add a card" actions across the editor — the toolbar button, a per-row insert, the
empty-state button — all funnel through one seam that can mark a single card as "this is the one
that should focus itself and animate in." A card claims that mark once, the first time it renders,
and then it's gone — nobody else can claim it after.

> [K:deck-editor-focus-claim] One pending target at a time, claimed exactly once on mount. This is
> what stops two cards added in quick succession from fighting over the same autofocus — the first
> to render wins it, the second finds nothing left to claim.

## What this isn't

- **Not what a card is.** Front/back text, ordering, duplicates — [[cards]].
- **Not who can see the deck.** Ownership and the public/private switch — [[decks]].
- **Not the SQL or the insert RPC.** Table shape and the mutation call are code detail.

## Related

[[decks]] · [[cards]]
