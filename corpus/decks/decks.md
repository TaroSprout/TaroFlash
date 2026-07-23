---
id: decks
domain: decks
status: current
hazard: true
related: [permissions, scheduling, cards]
updated: 2026-07-23
---

# Decks

A deck is one person's box of cards — who it belongs to, who's allowed to see it,
and how the dashboard counts what's due in it today.

Every deck belongs to exactly one member. That owner is stamped on the deck the
moment it's created, and never changes hands.

A deck is private by default. The owner can flip a single switch to make it
public.

1. **Private** — only the owner can see it.
2. **Public** — anyone can see it.

There is no third thing. No "members of a deck," no per-deck roles, no invites to
a private deck. A deck has one owner and one public/private switch — that is the
entire sharing model.

The dashboard asks for _your_ decks and shows each one with a count of the cards
due today.

> [!HAZARD] **Making a deck public lets other people _read_ it — never _study_ it.**
> "Public" sounds like "shared, and everyone builds their own progress on it." It
> isn't. Recording a review is gated to the card's owner, and the progress table
> holds exactly **one** row per card for the whole platform — not one per viewer.
> So a public deck is a browse-only copy: there is nowhere to put a second
> person's study state, and the system quietly assumes every card is studied by
> exactly one person. The day someone wants shared study, the data model can't
> hold it.
> [See why below ↓](#public-means-look-not-study)

## Every deck has exactly one owner

Ownership isn't something the client sends — it's stamped by the database on
insert, always to the person making the request. A caller can't hand a deck to
someone else, or forge one under another member's name.

That owner is the deck's whole identity for access: create, rename, delete,
change cards, study it — all of it is the owner's alone.

> [!RULE]
> Owning the deck is what unlocks studying it. Recording a review requires that
> the card belongs to you, so a deck you don't own is never one you can build
> progress on — public or not.

## Public means look, not study

Flipping a deck public widens exactly one thing: who can _see_ it. It does not
create members, grant roles, or let anyone else record progress.

Two facts lock this in:

- Writing a review is refused unless the card is yours.
- There is room for only one progress row per card, ever — the table is unique on
  the card alone, not on card-plus-person.

So a public deck is a read-only exhibit. A visitor can page through the cards;
they cannot turn it into a studyable deck of their own. If they want that, they'd
need their own copy.

> [!NOTE]
> This is why the dashboard's due count is only ever meaningful for decks you
> own — they're the only decks you can actually study down to zero.

## The dashboard lists your decks with a due count

The dashboard shows the decks you own, each with a live count of cards due today.

Under the hood it asks for a broader set than that — everything the access rules
let you see — and then narrows the list to your own decks itself. Why it must do
that narrowing, rather than trusting the rules to do it, is [[permissions]]'s
story, not this one.

The due count isn't stored; it's computed fresh on every read. For each deck the
server tallies the brand-new cards and the cards whose next review has come due,
then trims that by the deck's daily pacing caps — the same math the study session
itself uses, so the number on the card matches the session you're about to start.
The caps and the scheduling behind "due" belong to [[scheduling]].

> [!WATCH]
> The count depends on _when your day starts_ — the client passes its own local
> day boundary. Two people in different time zones can open the same deck and see
> different due counts, and neither is wrong.

## How many decks you can make

A deck isn't free to create without limit. Each member's plan sets a ceiling, and
a new deck is refused once that ceiling is reached. Raising the ceiling is a
billing matter — the deck itself doesn't know or care which plan paid for it.

## What this isn't

- **Not the cards.** What's _inside_ a deck — the card records, their order, how
  they're written — is [[cards]]'s topic.
- **Not scheduling.** What "due" means, how the daily caps work, and how a review
  reschedules a card live in [[scheduling]].
- **Not the access plumbing.** How the see-it rule is enforced, and why the
  dashboard scopes itself, is [[permissions]].
- **Not the SQL.** Table columns, the read RPC, rank ordering, and the pacing
  resolver are code detail — the reference docs cover those.

## Related

[[permissions]] · [[scheduling]] · [[cards]]
