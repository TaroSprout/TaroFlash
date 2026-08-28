---
id: mobile-dock
domain: ui
status: current
hazard: true
related: []
updated: 2026-08-28
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

> [!HAZARD] [K:dock-edge-inset-follows-flush] **The device's bottom-edge inset is earned by sitting flush on the screen edge, not by being on a touch device — and the allowance is floored above that inset on purpose, because a reported `0px` doesn't tell you whether the strip is covered or just uninsettable.**
> Below the `sm` breakpoint the bar spans the full width and sits on the
> bottom edge, so it needs `env(safe-area-inset-bottom)` to clear the home
> indicator or gesture bar. Above it the bar is a card inset from the corner
> — already clear of the edge — so adding the inset there just pads it for
> nothing. A desktop window narrowed to phone width is flush the same as a
> phone is, and docked browser chrome (an installed PWA's own bottom bar)
> covers the inset strip on its own, so the inset is skipped there too even
> though the bar is flush. Keying the inset off "is this a phone" instead of
> off the geometry gets both wrong. `env(safe-area-inset-bottom)` resolves to
> `0px` on every desktop browser, so a flush-state allowance written as
> `calc(0.5rem + env(safe-area-inset-bottom))` computes to exactly the
> `0.5rem` the dock already gets as a floating card at that width — correct
> about when it applies, worth nothing where it applies. So the allowance
> carries a floor — `max(1rem, calc(0.5rem + env(safe-area-inset-bottom)))`,
> reusing the dock's own `--dock-pt` value as the floor — and a real device
> inset still wins wherever one is reported.
>
> The floor also fires on mobile Safari, and that is the accepted cost of
> having it. Safari reports `env(safe-area-inset-bottom)` as `0px`
> for as long as its bottom toolbar is up, because that toolbar is what sits
> over the home-indicator strip; the inset only grows to the device's real
> value once the toolbar collapses on scroll. The viewport-gap signal doesn't
> catch that toolbar either — Safari shrinks `window.innerHeight` in step
> with the visual viewport, so the gap stays zero and the dock still counts
> as uncovered (see [[safe-area-chrome-detection]]). A desktop window at
> phone width and a phone with its toolbar up therefore report exactly the
> same thing, and no floor can be scoped to only the first of them. Given the
> choice, the visible allowance at small desktop width was kept and the
> padding above Safari's toolbar accepted. Removing the floor makes Safari
> flush again and takes the desktop allowance back down to nothing — that is
> the same trade re-decided, not a bug fixed.

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

## Claim the height before you animate it

Some content genuinely needs its own resize tween inside the dock — a
crossfade between two panes, for instance, where the swap itself is the
animation. `useMobileDock()` exposes a `height_claims` counter plus
`claimHeight()` / `releaseHeight()` for exactly that: call `claimHeight()`
before your own tween starts and `releaseHeight()` once it settles, and the
dock's own `useAnimatedHeight` gate stands down for as long as any claim is
open. It's a counter, not a flag, so overlapping claims from more than one
source can't release each other early.

The deck view's mobile footer and the audio-reader lesson view both wire
their `crossfade-resize`'s `swap-start` / `swap-end` events straight to
`claimHeight` / `releaseHeight` — the swap owns the height for its own
duration, the dock catches up to the settled result once the claim releases.

> [!WATCH] A `swap-start` with no matching `swap-end` strands the claim open.
> The counter never returns to zero, the dock's own tween gate never
> re-arms, and the bar stops resizing to its content for the rest of the
> session. Every claim needs a release on every path out, including ones
> that abort a swap early.

## Visible and flush are different questions

`useMobileDock()` exposes both, and they don't move together. `is_visible`
answers whether the bar shows at all — below the claimed breakpoint and the
on-screen keyboard closed. `is_flush` answers only whether the bar is
currently the full-width, edge-pinned shape, which happens below the `sm`
breakpoint regardless of what claimed the wider one. The host reads
`is_flush` — combined with whether docked browser chrome is already covering
that strip — to decide whether the bar's own bottom padding needs the
device's safe-area inset added on top.

## What this isn't

Not a rule about height animation in general — a panel animating its own
height outside the dock is unremarkable. This only bites content that lives
_inside_ the dock, because the dock is the one place a second, independent
height owner is already guaranteed to exist.
