---
id: pacing
domain: pacing
status: current
hazard: true
related: [scheduling]
updated: 2026-07-23
---

# Pacing

The per-deck dials that shape how hard a deck pushes you — how much you aim to
remember, how gently new cards ramp up, how far out reviews may land.

A deck studies at its own pace. Seven dials set that pace: your target
retention, the little warm-up steps a new (or lapsed) card walks through, how
many reviews and how many new cards a day, when a card counts as a "leech", and
the furthest a review may ever be pushed.

Setting all seven by hand on every deck would be tedious. So a deck usually
**follows a preset** — a named bundle of all seven values you can point many
decks at once.

Where does a single dial's number actually come from? Walk down a ladder:

1. **Did this deck pin that one dial itself?** Use the pin.
2. **Otherwise, does the deck follow a preset?** Use the preset's value.
3. **Otherwise**, fall back to the built-in default.

The first rung that answers wins — dial by dial, not deck by deck. A deck can
pin two dials and let a preset drive the other five.

> [!HAZARD] **A pin that matches the preset is still a pin — and it quietly stops following the preset from then on.**
> A dial is "pinned" purely because it's _present_ in the deck's override bag —
> nothing compares its value to the preset. So dialing a control to the exact
> number the preset already shows still pins it. It looks identical today, but
> it has detached: edit that preset later and every following deck moves _except_
> this one, which silently stays behind.
> [See how a pin is tracked ↓](#a-pin-is-presence-not-difference)

## Follow a preset, or pin a dial

Left alone, every dial on a deck reads straight through its preset. Change one
control and you **pin** just that dial — the deck now holds its own value there
and ignores the preset for that one dial only. Every other dial keeps following.

Pinning is per-dial and reversible. Un-pin a dial ("pull") and it drops back to
whatever the preset says — the very next value, not the one it had when you
pinned it.

> [!NOTE]
> For the daily caps and the maximum interval, `0` in the UI means "no limit".
> A pin can hold that no-limit value on purpose — which is a different state from
> having no pin at all. That's why the system tracks a pin by whether the dial is
> _present_, not by whether it has a number: "pinned to unlimited" and "not
> pinned" would otherwise look the same.

## A pin is presence, not difference

The deck keeps its pins as a small bag keyed by dial name. A dial is overridden
when its key is _in the bag_, full stop — the value sitting there is never
weighed against the preset.

That's the trap in the hazard above. Editing a control always drops its key into
the bag, even when you land on the preset's own number. Now the deck carries a
pin that agrees with the preset by coincidence. The day someone edits the
preset, the deck won't budge on that dial — the pin outranks it. Only pulling the
dial removes the key and lets it follow again.

## Pull one, push all

Two directions move values between a deck and its preset, and they aren't
symmetric:

- **Pull** is deck-local and per-dial. Un-pinning a dial (or all of them at once)
  changes only this deck.
- **Push** is global and all-or-nothing. It writes _every_ current dial value
  back into the preset — so every deck following that preset shifts with it. It's
  confirmed, never per-dial, and it clears the deck's pins afterward (they'd
  otherwise sit there agreeing with the preset — exactly the detached-pin trap).

**Fork** is the escape hatch: it saves the deck's current dials as a brand-new
preset and points the deck at it, pins cleared. Reach for it when you want your
tweaks kept without disturbing the decks already on the old preset.

> [!RULE]
> There's one built-in **Default** preset shared across the whole app. You can
> follow it and pin against it, but you can't rename, edit, delete, or push to it
> — the only way to turn your tweaks into a preset off the Default is to fork.

## When a change lands

Pinning and pulling dials are staged in the deck's editor draft — nothing is
written until you Save the deck. The preset actions are the exception: fork,
push, rename, and delete hit the server the moment you confirm them, and they
flush the deck's pacing side (its preset link and pin bag) along with the change
so the two halves never disagree. The rest of your unsaved edits still wait for
Save.

## What this isn't

- **Not the scheduler.** Pacing only supplies the dials; how a rating turns into
  a due date is [[scheduling]]'s job.
- **Not retroactive.** Changing a deck's pacing doesn't re-time the cards already
  scheduled under the old values — it applies from the next review on. Why the
  server never recomputes is [[scheduling]]'s hazard.
- **Not the SQL.** The resolver, the sidecar table, and the override-bag shape
  are code detail — the reference docs cover those.

## Related

[[scheduling]]
