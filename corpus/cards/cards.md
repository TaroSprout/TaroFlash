---
id: cards
domain: cards
status: current
hazard: true
related: [media, permissions]
updated: 2026-08-08
---

# Cards

The question-and-answer units people study — how a card comes to exist, how its
deck keeps every card in order, and when two of them count as the same.

A card is two pieces of text: a **front** and a **back**, sitting inside a deck.

Every deck keeps its cards in a deliberate order. That order isn't stored as
"card #1, card #2" — it's a short **sort key** carried by each card, and cards
sort by comparing those keys character by character.

The trick that makes reordering cheap: to slip a new card _between_ two others,
the app mints a key that falls between its neighbours' keys. There is always a
key available between any two, no matter how close together they already are, so
inserting never has to renumber the rest of the deck.

A card comes into being in one of two ways:

1. **Placed** — dropped in _before_ or _after_ a card you point at.
2. **Bulk-added** — a stack of cards appended to the end of the deck at once.

Either way the key is minted by the **app**, not the server, and travels with the
card as an ordinary write.

## The app picks the key, and that's deliberate

This is a reversal. Ordering keys used to be computed on the server, so every
create had to go through a dedicated function. They're now minted in the app,
and creating a card is a plain write carrying its own key; reordering is a
one-field update.

The reason is **working offline**. A key computed on the server can't be produced
when there's no server to ask — an offline insert would have nothing to call, and
a placeholder key can't be reconciled on reconnect without reshuffling whatever
arrived first. A key the app mints itself makes a queued write self-contained: it
already knows where it belongs. What makes this safe is that a deck has exactly
one owner, so there is never a second person minting keys into the same deck at
the same moment.

> [!HAZARD] **The keys are text, and only sort correctly because the column overrides the database's default sorting rules.**
> Sort keys are compared as plain text. The database's default text collation is
> locale-aware — it reorders letters by case, so `a` and `A` don't land where a
> character-by-character comparison would put them. Under that default the server
> would sort keys differently from the app that generated them, and a deck would
> silently read back in the wrong order. The column pins a plain byte-order
> collation to prevent it. Nothing announces this: the schema looks ordinary, and
> a new ordering column or index added without the same collation inherits the
> broken default and reintroduces the bug.

## Order is a key, not a position

Because the key is text rather than a number, there is always room between two
neighbours — appending a character is enough to land between them. The deck never
needs a wholesale renumber, which is what the old server-side scheme had to do
when a gap ran out.

The neighbours a new key sits between are read from the list **as it is on screen
at the moment of writing**, not from whatever the order was when the card was
staged. Staging a card and writing it are separate moments, and the deck can move
in between.

> [!NOTE]
> Deck ordering is a different mechanism — decks still use plain numbers. The two
> aren't interchangeable.

## One write path survives on the server

Moving a batch of cards to another deck is the single card-write that still runs
as a server function, and only because the underlying protocol can't give each
row of a bulk update its own distinct value. It still takes keys the app computed.

## The per-deck ceiling is enforced by the table, not the write path

A free plan caps how many cards a deck may hold. That ceiling isn't checked by
whichever code writes the card — it's enforced by the table itself, evaluated
**once per statement** rather than once per row.

The per-row alternative doesn't work: a check running per row can't see the other
rows its own statement is adding, so a bulk move would test every row against the
same stale count and let the whole batch through.

The ceiling is set by the owner's plan. A free plan caps how many cards a deck
may hold; adding past the cap fails fast, before anything is written, and the
app surfaces it as an upgrade prompt rather than a generic error.

## Duplicates are flagged, never blocked

A deck can hold two identical cards. Nothing stops it — instead, each card
_knows_ whether it has a twin, and the deck can quietly mark the ones that do.

A card counts as a duplicate only when **both** its sides are filled in **and**
both sides match another card in the same deck.

> [!RULE]
> Both conditions are required together, not either one. Two cards that share
> only a front — or only a back — are _not_ duplicates. Two cards that are both
> blank are _not_ duplicates. Only a full front-and-back match, both sides
> non-empty, counts. The check is per deck; the same pair in two decks is fine.

## What this isn't

- **Not the study schedule.** When a card is next due and how well it's known is
  its review state, driven by the spaced-repetition algorithm — its own concern.
- **Not the images.** Pictures attached to a card's front or back live and die by
  their own rules — [[media]].
- **Not access control.** Who may read or change a card is [[permissions]]'s job.
- **Not the SQL.** The ordering functions, indexes, and the duplicate-flag view
  are code detail — the reference docs cover those.

## Related

[[media]] · [[permissions]]
