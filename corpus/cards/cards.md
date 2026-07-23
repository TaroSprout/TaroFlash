---
id: cards
domain: cards
status: current
hazard: true
related: [media, permissions]
updated: 2026-07-23
---

# Cards

The question-and-answer units people study — how a card comes to exist, how its
deck keeps every card in order, and when two of them count as the same.

A card is two pieces of text: a **front** and a **back**, sitting inside a deck.

Every deck keeps its cards in a deliberate order. That order isn't stored as
"card #1, card #2" — it's a single **number** carried by each card, and cards
sort from smallest number to largest.

The trick that makes reordering cheap: to slip a new card _between_ two others,
the deck picks a number halfway between its neighbours'. There's always room for
one more in the gap — until the gap grows too small to split, at which point the
whole deck is quietly renumbered with fresh spacing and the insert retries.

A card comes into being in one of two ways:

1. **Placed** — dropped in _before_ or _after_ a card you point at.
2. **Bulk-added** — a stack of cards appended to the end of the deck at once.

Either way, the number that fixes its place is chosen by the **server**, never
the app.

> [!HAZARD] **A card's ordering number is trustworthy only because every create goes through one door — the table itself will accept any number you hand it.**
> Cards are owned rows, and the database happily lets a signed-in person insert
> their own. That openness is the convenience — it's also the flip side: nothing
> in the table forces the ordering number to be server-picked, so a card created
> by a raw insert can carry a made-up number that collides with a neighbour or
> lands in the wrong spot, silently corrupting the deck's order and skipping the
> per-deck cap along the way. The guarantee lives in the discipline of routing
> every create through the two functions, not in the schema.
> [See why there's only one door ↓](#every-card-comes-in-through-one-door)

## Order is a number, not a position

The ordering number is fractional on purpose. Insert between two cards and the
deck takes the midpoint of their numbers; insert at the end and it takes the
last number plus a step; the first card in an empty deck starts at a round base.

Because the number is fractional, an insert almost never has to touch any other
card — it just claims the space in the gap.

Almost never. Repeatedly inserting into the _same_ gap eventually leaves no room
between two neighbours. When that happens the deck **renumbers** every card with
wide, even spacing and the insert tries again. The order the reader sees never
changes — only the underlying numbers do.

> [!NOTE]
> Rank assignment is serialized per deck: two people adding to the same deck at
> the same instant take turns, so they can't both claim the same gap and land on
> the same number.

## Every card comes in through one door

Placing a card and bulk-adding cards are the _only_ two ways to create one. Both
run on the server, and both do three things the app can't safely do itself:
compute the ordering number, take the per-deck turn-taking lock, and check the
deck hasn't hit its card ceiling.

> [!RULE]
> A card is never created by writing straight to the cards table from the app.
> Creation always goes through the placing or bulk-adding path — that's the only
> place the ordering number is computed correctly. Editing an _existing_ card's
> text is a different matter and writes directly; the one-door rule is about
> _bringing a card into being_, where the number has to be earned.

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
