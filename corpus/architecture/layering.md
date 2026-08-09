---
id: layering
domain: architecture
status: current
hazard: true
related: [responsive]
updated: 2026-08-08
---

# Layering

Why a menu sometimes opens _underneath_ the thing it belongs to — and why the
cause is almost never the code that drew the menu.

Anything that floats above the page — a dropdown, a tooltip, a popover — is
positioned against the window rather than against its parent. That works right
up until some ancestor quietly changes the rules and makes itself the thing the
floating element is measured against instead. From then on it is trapped: it
can be clipped by that ancestor's edges, and it stacks with that ancestor
rather than above the page.

Nothing in the app asks for that. It is a side effect of animating.

> [!HAZARD] [K:settled-transform-traps-overlays] **An animation that has finished still changes layout — the browser cares that a transform exists, not that it does nothing.**
> Animation libraries leave their final values on the element as inline styles.
> A finished move settles on "shift by zero"; a finished pop settles on "scale
> by one"; a finished dim settles on "full brightness, no blur". Every one of
> those is visually invisible and every one of them still counts, because the
> browser's test is whether the property is set at all, not whether the value
> does anything. So the moment a panel finishes animating, floating things
> inside it get captured — and the bug surfaces later, somewhere else, in a
> menu that worked fine before anyone touched the animation.
> The cure is to clear the property when the animation lands, handing the
> resting state back to the stylesheet.

## Clear on the way in, not on the way out

Only the animations that _finish visible_ need clearing. A pane that has
animated out is being held off-screen by exactly the value you would be
tempted to strip, so removing it snaps the pane back into view.

The same asymmetry explains a subtler case. When one panel dims because
another opened on top, the dimming has to be cleared when it is undone —
otherwise a small alert opening and closing over a panel is enough to leave
that panel permanently capturing its own dropdowns, long after the alert is
gone.

## Animate the child, not the positioned parent

Where an element already carries a position of its own — a card sitting in a
grid that places it — animating that same element makes two things fight over
one property, and the composition is wrong in a way that looks like drift
rather than a bug: scaling a parent scales its offset too, so the card slides
as it grows.

The fix is to animate one level in. The outer element keeps its placement, the
inner one takes the animation, and neither has to know about the other.

## What this isn't

Not stacking order. Deciding which of two overlapping panels wins is a separate
question with a separate answer; this topic is only about an element being
captured into the wrong coordinate space in the first place, where stacking
order no longer helps because the two things are no longer being compared.
