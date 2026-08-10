---
id: mobile-dock
domain: ui
status: current
hazard: true
related: []
updated: 2026-08-10
---

# The mobile dock

The floating bar pinned to the bottom of the screen on small viewports — and
why it can only ever have one thing driving its height at a time.

Nothing renders inside the dock directly. A view drops a `<mobile-dock>`
filler wherever it needs one, and that filler teleports its slot content into
the dock's own DOM node. The dock itself — `mobile-dock-host.vue` — owns the
bar, watches whatever landed inside it, and grows or shrinks the bar to fit.

> [!HAZARD] [K:dock-height-single-owner] **The dock already animates its own height. Anything teleported in that also animates its own height is fighting it, not cooperating with it.**
> Two tweens end up running on the same resize at once, at whatever duration
> and easing each happened to pick, and the outer one is chasing a target
> that's still moving because its own resize watcher fires on every frame of
> the inner one. The visible result is exactly what it sounds like — two
> things animating at different speeds. See below.

## The dock watches, it doesn't get told

`useAnimatedHeight` sits between the dock's wrapper and whatever content is
teleported in, watching that content with a `ResizeObserver`. The moment the
content's natural height changes — a panel swaps in, a row gets added — the
wrapper tweens to match, 0.2s `power2.out`. Cheap, GSAP-driven, and it fires
on _any_ size change, however that change happened.

That's the whole mechanism, and it's also the trap: the dock doesn't care
_why_ its content resized. It only sees the end state and chases it.

## Change the DOM in one step; let the dock do the animating

A collapsible panel added into the deck's import footer used its own
accordion transition inside the dock. The two tweens visibly desynced — the
accordion opening at its own pace while the dock's bar chased a height that
kept moving under it. The fix was to drop the inner transition — swap the DOM
with a plain `v-if`, no animation of its own — and let the dock's own tween
carry the resize, the same way it already carries every other content swap.

The rule this generalizes to: content teleported into the dock never owns a
height or size tween of its own. If it needs to look animated, that has to
happen through the one tween the dock already runs, not beside it.

## The same collision is live today, just invisible

The deck view's mobile footer wraps its dock content in a crossfade-resize
wrapper, which tweens its own wrapper height for every swap between the
footer's panels — inside the dock, which is tweening its own height for the
same swap. Both currently run at the same duration and easing, so they track
closely enough to look like one animation. Change either duration and they'll
visibly split, the same way the accordion did.

`useAnimatedHeight` takes an `active` gate meant for exactly this: pause the
dock's own tween while something inside is already driving the resize, so
only one of them is ever animating the height at a time. The deck footer
doesn't wire that gate to its crossfade wrapper's swap events yet — the two
tweens are racing by coincidence, not by design.

## What this isn't

Not a rule about height animation in general — a panel animating its own
height outside the dock is unremarkable. This only bites content that lives
_inside_ the dock, because the dock is the one place a second, independent
height owner is already guaranteed to exist.
