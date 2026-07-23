---
id: data-flow
domain: architecture
status: current
hazard: true
related: [permissions, cards]
updated: 2026-07-23
---

# Data flow

How data from the server gets onto the screen, how a change gets back to the
server, and who is responsible for keeping the two in sync.

Almost everything on screen is a copy. The real decks, cards, and reviews live on
the server; the app keeps a local copy so it doesn't have to re-ask for the same
thing on every render.

That local copy is a **cache**. Two jobs run against it, and only two:

1. **Reading** fills the cache — ask for the dashboard's decks, and the answer is
   remembered under a name so the next screen that wants the same thing gets it
   for free.
2. **Writing** changes the server — save a review, move a card — and then has to
   admit that some of what's in the cache is now out of date.

The cache doesn't refresh itself. Something has to say "the decks I remembered are
stale now." Getting that _something_ right — always, and in exactly one place — is
what this topic is about.

> [!HAZARD] **A write that succeeds but forgets to mark the right thing stale leaves the screen showing old data — and nothing anywhere reports an error.**
> The convenience below is that a caller never thinks about the cache. The flip
> side is that when the cache _does_ drift, there's no error to chase and no clue
> at the call site: the save worked, the server is correct, and the screen quietly
> keeps the pre-save copy. A wrong or missing staleness mark fails silent.
> [See who owns the mark ↓](#a-write-owns-its-aftermath)

## Two kinds of state, kept apart

Not everything on screen is a copy of the server.

- **Server data** — decks, cards, reviews, members, the shop — is fetched and
  cached. It can go stale, so it's the thing that needs refreshing.
- **Local-only state** — who's signed in, the current theme, which modal is open —
  is never on the server to begin with. It can't go stale; it just _is_.

These live in separate stores and never mix. The rest of this topic is only about
the first kind. Local state has none of these hazards because there's no server
copy to fall out of sync with.

## Reading fills the cache by name

Every read is asked for under a stable name — "the dashboard's decks," "this
deck's cards." The answer is filed under that name.

Ask twice and the second ask is instant: the cache already has it. That's the
whole point of the copy.

The name is also the handle a write uses later to say "throw that one out." So the
names aren't decoration — they're the vocabulary the two jobs use to talk about
the same data.

## A write owns its aftermath

Here's the rule that makes the whole thing hang together: **a write is responsible
for marking stale whatever it just changed.** Not the button that triggered it.
Not the screen. The write itself.

Save a review, and the save is what says "the decks are stale now" — because the
save is the only thing that knows a review just landed. The screen that called it
stays dumb: it asks for the save and moves on, trusting that anything affected will
refresh on its own.

> [!RULE]
> The caller never refreshes the cache after a write. It calls the write and
> stops. If a screen finds itself invalidating something a mutation already
> changed, that's a bug — the responsibility got split, and now two places have to
> stay in agreement or the cache drifts.

Why put it there and nowhere else? Because a single write can touch data three
unrelated screens are showing. If each caller had to remember which names to
refresh, they'd disagree — one refreshes the deck list, another forgets the card
count — and the copies drift apart. Keeping it with the write means the answer is
written down once, next to the thing that knows it.

> [!WATCH]
> This cuts the other way too. A brand-new write that _forgets_ to mark anything
> stale looks completely fine in review — it saves, it returns, no error. The
> staleness is invisible until someone notices the screen didn't move. There's no
> compiler and no test failure standing guard here; the discipline is the only
> thing holding it.

## Refreshing narrowly, never wholesale

Marking stale is always aimed. A write names the specific things it disturbed —
this deck, these cards — and leaves the rest of the cache untouched.

Clearing the whole cache would "work" in that nothing stays stale, but it throws
away every other screen's remembered data for no reason, and the next render
re-fetches all of it. Aim is what keeps the copy worth keeping.

## Permission checks refresh themselves

One kind of question runs constantly against this data: _is this person allowed to
do this?_ Those checks read live state — the member's plan, their role, how many
decks they own — and that state is itself cached server data.

So the checks are wired to re-answer on their own the moment their inputs change.
Buy a subscription, and every "is this a paid feature?" question flips without
anyone re-asking it. The check isn't a one-time verdict; it's a standing
subscription to the answer. The [[permissions]] topic covers what those checks
protect and why the screen's answer is only ever a hint.

## What this isn't

- **Not access control.** Whether an answer is _allowed_ to reach you is
  [[permissions]]'s job. This is about how the answer travels and stays fresh once
  it's permitted.
- **Not the write rules.** _What_ a given write is allowed to do — cards only
  written through the server so ranks stay correct — is its own topic; this is
  only about what happens to the cache afterward.
- **Not the cache mechanics.** Query-key shapes, the invalidation contract table,
  and how a mutation is wired are code detail — the reference docs cover those.

## Related

[[permissions]] · [[cards]]
