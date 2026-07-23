---
id: scheduling
domain: scheduling
status: current
hazard: true
related: [pacing, study, cards]
updated: 2026-07-23
---

# Scheduling

How the app decides when each card comes back — the spaced-repetition engine at
the heart of studying.

Every card remembers two things:

1. **How well you know it** — a couple of numbers the algorithm keeps.
2. **When it's next due** — the date it should come back.

When you rate a card — _Again, Hard, Good, Easy_ — the scheduling algorithm
(FSRS) updates both: it nudges the "how well you know it" numbers and picks a new
due date, pushed further out the better you did.

Each deck tunes the algorithm with its own pacing — how much you want to
remember, how gently new cards ramp up, how far out reviews may land. So the very
same rating can schedule two decks differently.

> [!HAZARD] **The schedule is computed on your device — the database only stores what your device tells it.**
> The algorithm runs in the browser during a session; the server just records the
> due date and stats the client already worked out. It never recomputes or checks
> them. The upside is real — there's no second copy of the algorithm to keep in
> sync. The trap: the stored schedule is only ever as correct as the client that
> wrote it. An out-of-date app, a different algorithm version, or two devices
> reviewing the same card can quietly write schedules under _different_ math — and
> the database, not being the authority, can't tell. The client is the source of
> scheduling truth; version it carefully.
> [See what the server actually does ↓](#what-the-server-actually-does)

## What a card remembers

Behind each card sit a few numbers: roughly, how _durable_ the memory is (how
long it'll survive before you'd likely forget) and how _hard_ the card is for
you. From those, the algorithm derives the one thing you actually see — the next
due date — plus a running tally of how many times you've reviewed it and how many
times you've lapsed.

> [!NOTE]
> A brand-new card has no memory yet — it starts empty and picks up its numbers
> the first time you rate it. Until then it's simply "new," and pacing treats new
> and due cards under separate daily limits.

## Rating moves the schedule

_Again_ means you forgot — the card drops back to short, minutes-apart learning
steps so you see it again this session. _Hard, Good, Easy_ all pass, each pushing
the next due date further out than the last.

How far "further out" actually lands depends on the deck's pacing — a deck that
wants higher retention schedules tighter; one that allows longer intervals lets
cards drift much further.

> [!WATCH]
> Changing a deck's pacing does **not** reschedule the cards already out there.
> New pacing only affects each card the _next_ time it's rated. Lower your
> retention expecting everything to come due sooner and nothing budges — the old
> due dates stand until each card is reviewed again.

## What the server actually does

The server never schedules anything. Its whole job around reviews is two-fold:
**store** the state the client computed, and **count** what's due.

| Job                                            | Who does it                    |
| ---------------------------------------------- | ------------------------------ |
| Work out the new due date & memory numbers     | ⚠️ your device (the algorithm) |
| Save that result + a log of the review         | the server (just records it)   |
| Count how many cards are due, under daily caps | ✅ the server                  |

The due-count you see on a deck is the server counting stored due dates and
trimming them by the deck's daily limits (so many new, so many reviews). It reads
the schedule; it never writes it.

## What this isn't

- **Not pacing.** The knobs themselves — retention, learning steps, daily caps —
  and how they resolve are their own topic ([[pacing]]).
- **Not the study session.** The queue, card flipping, and session flow are
  separate from the scheduling math ([[study]]).
- **Not the algorithm internals.** How FSRS turns a rating into numbers is library
  detail — the reference docs and ts-fsrs cover that.

## Related

[[pacing]] · [[study]] · [[cards]]
