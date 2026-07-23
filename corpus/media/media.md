---
id: media
domain: media
status: current
hazard: true
related: [permissions, cards]
updated: 2026-07-23
---

# Media

The images and audio people attach to cards, decks, and lessons — how they're
stored, reused, and eventually cleaned up.

Add an image to a card and two things happen:

1. **The file is saved** to storage.
2. **A note is written** that says _"this card uses that file."_

The file and the note are kept separate on purpose.

Because the same image can be reused on many cards, one shared file can have
several notes pointing at it.

So a file is never thrown away the moment a card stops using it. It stays until
_nothing_ — no card, deck, or lesson — points to it. Then a background cleanup
job quietly removes it.

> [!HAZARD] **A file lives or dies by its notes — not by the bucket it sits in.**
> The cleanup job decides a file is garbage the instant no live note points at
> it. That makes the note the file's lifeline, with a blade on each side: delete
> a _shared_ file directly and you yank it out from under every other card still
> using it; drop a file into a media bucket _without_ writing a note and the next
> hourly sweep quietly eats it. Anything that touches these buckets goes through
> the notes, never around them.
> [See how cleanup decides ↓](#cleanup-happens-later)

## The record

Each note ties one file to one thing that uses it — a card slot, a deck, or a
lesson — and remembers who owns it. Ownership matters: a person can only ever
reach their own files, never anyone else's.

> [!RULE]
> A card slot holds **one** image at a time. Drop a new image on a slot that
> already has one and the old note is quietly retired — you never end up with two
> live images fighting over the same spot.

## One file, many uses

Reuse the same image on ten cards and there's still just _one_ file — with ten
separate notes, one per card.

That's the whole reason cleanup can't be instant. When one card lets go of an
image, all that changed is that card's note. Nine other cards may still be using
the same file.

So a file is only safe to remove once **every** note pointing at it is gone — a
judgment made across all the notes at once, never from one on its own.

## Cleanup happens later

Deleting a card, deck, lesson, or member retires its notes right away. A separate
cleanup job runs once an hour, finds files that no note points to anymore, and
removes them in batches.

> [!WATCH]
> Deleting a card doesn't free its image on the spot. The file sits untouched
> until the next hourly sweep — so don't write code that assumes the storage is
> reclaimed the instant something is deleted.

The job leaves brand-new files alone for a short grace window, so an image that's
mid-upload isn't swept away before its note is written. This job is the _only_
thing that ever deletes a file.

## What this isn't

- **Not access control.** Who may _read_ a file is [[permissions]]'s job, not the
  lifecycle's.
- **Not generation.** How audio gets transcribed into a lesson lives in its own
  topic — [[audio-generation]].
- **Not the SQL.** Bucket provisioning, indexes, triggers, and cron wiring are
  code detail — the reference docs cover those.

## Related

[[permissions]] · [[cards]]
