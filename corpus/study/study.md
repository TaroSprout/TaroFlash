---
id: study
domain: study
status: current
hazard: true
related: [scheduling, media]
updated: 2026-07-23
---

# Study session

Sitting down with a deck and going through its due cards one at a time — flip,
rate, next — until you're done. This is that experience: the run, not the math
behind when a card comes back.

You open a session over one deck, or several at once.

Whatever you picked, the cards arrive as **one flat pile** — shuffled together,
no seams between decks. You just work the pile.

But each card quietly remembers which deck it came from. That memory is what
lets one merged pile still treat every card by its own deck's rules.

A session walks through four stages, in order:

1. it **loads** the cards, then a cover card rises in;
2. you **study** the pile;
3. it shows a **summary** of how the run went.

> [!HAZARD] **A card is marked reviewed the instant you rate it — locally, before the server confirms the save.**
> Rating a card advances the pile and records the result on the spot; the actual
> save to the server fires _after_, on its own. That ordering is what makes each
> review land the moment you make it — but its flip side is a trap. If the save
> fails, the card is already logged as done in the session's saved progress. The
> error offers a **refresh** — and refreshing rebuilds that card as
> already-reviewed, so it's never shown again and never retried. The review is
> silently gone, and the card's schedule on the server stays stale.
> [See how a review is saved ↓](#reviews-save-as-you-go)

## One pile, whatever the decks

The session core is **deck-blind**. It owns the pile, the flip, the four stages
— and knows nothing about decks beyond the `deck_id` riding on each card.

Everything deck-specific is looked up _through_ that id at the moment it's
needed: which scheduler grades the card, which face it opens on, how far its next
review lands. So a single merged pile can hold cards from five decks and still
schedule each one by its own deck's pacing — the core never has to know it's
juggling more than one.

> [!NOTE]
> Shuffle is all-or-nothing across the merge. If _any_ deck in the session wants
> its cards shuffled, the whole combined pile shuffles — there's no shuffling one
> deck's cards while keeping another's in order.

## Four stages, one source of truth

The session is always in exactly one stage — loading, cover, studying, or
summary — and that single value drives everything the screen shows. There's no
second flag saying "are we on the cover" or "which face is up" that could drift
out of step; those are all read off the one stage.

The run ends the moment it reaches summary. That happens two ways: you rate the
last card, or you stop early. Either way, stopping mid-run still lands you on the
summary of what you _did_ review — it isn't thrown away.

## Reviews save as you go

Rating a card doesn't wait for the end. Each review is sent to the server the
instant you make it, one at a time, as you move through the pile.

So the summary at the end isn't the save — by the time you get there, every
review is already recorded. The end-of-session step only refreshes the deck
counts so the dashboard reflects your work.

> [!WATCH]
> Because reviews are already on the server card-by-card, closing the tab
> mid-run loses no _grades_ — everything you rated is saved. What's lost is only
> the in-tab progress marker that lets a session resume (see below); the reviews
> themselves survive.

## Refreshing drops you back in

A session keeps a running snapshot of itself — which cards are in the pile, which
you've already rated, whether you finished — so a page refresh mid-run reopens
the same session right where you left off.

The snapshot locks the pile by card id. On resume, the cards you hadn't reached
yet are re-fetched by those exact ids; the ones you'd already rated are rebuilt
straight from the saved results and never shown again.

Locking by id is deliberate. Without it, a resume would re-ask "what's due right
now?" — and any card that came due _during_ your session would leak into a run
that was supposed to be fixed the moment it started.

> [!WATCH]
> Resume is tab-scoped and refresh-scoped only. The snapshot lives in the tab's
> own session storage, so it survives a refresh but not closing the tab — and it
> never crosses to a second tab. Reopen in a fresh tab and you start a new
> session, not the old one.

## What this isn't

- **Not the scheduling.** When a card is due, how far the next review lands, what
  counts as a lapse — that's the FSRS math in [[scheduling]]. The session just
  asks each card's deck to grade it and moves on.
- **Not deck settings.** Pacing, starting side, shuffle, leech threshold are
  configured on the deck; the session only _reads_ the resolved values.
- **Not the card content.** Editing a card's text or image mid-run touches the
  card, not the session — the session just patches its local copy so the change
  shows without a reload.
- **Not the wiring.** The controller, the engine's callbacks, the storage keys —
  code detail the reference docs cover.

## Related

[[scheduling]] · [[media]]
