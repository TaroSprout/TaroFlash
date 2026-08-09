---
id: window-refocus-guard
domain: ui
status: current
hazard: false
related: []
updated: 2026-08-08
---

# Telling a real blur apart from a window round-trip

When the OS takes focus away from the browser window entirely (switching
apps, alt-tabbing) and later gives it back, the element that was focused
blurs and then refocuses on its own — with no user action inside the page.
`useWindowRefocusGuard` (`src/composables/ui/window-refocus-guard.ts`) lets a
focus handler recognize that round-trip and skip whatever it would normally
do on a real blur (playing a sound, closing a panel).

## The flag is shared, not per-instance [K:window-refocus-guard-shared-flag]

The card whose editor loses focus to a window blur isn't necessarily the same
card the browser restores focus to — so a "was that a window round-trip"
flag can't live on the instance that flagged it. It's tracked at module scope
instead, and the whole app shares one in-flight flag.

## A stray flag self-clears one frame after the window regains focus [K:window-refocus-guard-self-clear]

The real "focus is coming back" signal is the focusin event the browser fires
synchronously when the window regains focus — that always runs first and
consumes the flag before anything else sees it. The `requestAnimationFrame`
cleanup exists only to sweep up a flag left dangling in the case that never
happens on its own: the user returns to the tab without any editor ending up
refocused at all.
