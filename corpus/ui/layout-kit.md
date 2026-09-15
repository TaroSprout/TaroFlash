---
id: layout-kit
domain: ui
status: current
hazard: true
related: [dialog-card]
updated: 2026-09-15
---

# The window family

`app-window` and `paged-window` (which wraps it) are the large-workflow window
primitives in `layout-kit` — settings, admin tools, the signup card, a modal
that's a whole screen rather than a small dialog.

> [!HAZARD] [K:app-window-fills-full-width] **`app-window`'s root carries `w-full` — nothing about the component itself puts a ceiling on it.**
> Drop one in without a width class and it stretches edge to edge on any
> screen wide enough to show it, which reads as a bug rather than a feature.
> Every existing caller sets its own width class from the outside.

## The width is always the caller's job

`app-window`'s root is `w-full shrink-0` — it fills whatever it's put in.
That's deliberate: the component has no opinion on how wide a settings panel
should be versus a signup card versus an admin console, so it doesn't force
one. What it does mean is every call site has to remember to cap it on
non-mobile screens, or the window fills the viewport and looks wrong.

Every caller falls into one of two shapes — the roster of who uses which
isn't tracked here, since a new caller joins either shape without this topic
needing to know:

- **A fixed width breakpoint class**, when the content doesn't need to react
  to `layout_mode` — a plain `sm:w-*` (or similar) on a bare `app-window`.
- **A `layout_mode`-driven width**, when the window also switches into
  `paged-window`'s desktop sidebar layout — a `desktop`-only width class
  alongside a `w-full! max-w-*` fallback for the other modes, `!` because
  `paged-window`'s own layout classes would otherwise win.

## Docking drops the body scroller

A viewport too short or too narrow to hold the window docks it into the
overlay's own sheet. Every window is wrapped in `overlay-surface`, and the
`overlay-downgrade` CSS variant that mounting applies fires on either axis —
running out of width or running out of height both trip it, with no
distinction between the two. Docking carries no JS flag: `overlay-downgrade`
is pure media queries plus attribute selectors
→[K:mid-gesture-mutation-kills-momentum-scroll].

> [!HAZARD] [K:docked-app-window-drops-body-scroll] **A docked window has exactly one scroller, the `overlay-surface` sheet it sits in — its own body collapses to content instead of fighting it for scroll.**
> A caller's height cap (feedback-board's `msm:h-196`, admin's `h-205`, settings'
> `h-187`) is a same-property variant utility whose cascade order against
> `overlay-downgrade:` isn't guaranteed, so the window root drops the cap with
> an important `overlay-downgrade:h-auto!` instead of a plain utility. With the
> cap gone, the window grows to fit whatever the current tab holds and changes
> height as the tab changes — the body's `ScrollRegion` never overflows, so it
> never needs to scroll. `overlay-surface` itself is what switches on:
> `overlay-downgrade:overflow-y-auto` there is the one scroller a docked
> window's content runs inside.
>
> Every window behaves this way on **either** dock axis; it is not something a
> caller opts into, and there is no longer a fixed-height window that docks
> while keeping its own cap and its own body scroller — that shape retired
> with the migration to `overlay-surface`.

With the cap gone, the body scroller's `scrollHeight` equals its
`clientHeight`, `use-scroll-metrics` reports not-overflowing, and the scroll handle needs no
hiding branch of its own — it's simply never rendered.

## What this isn't

Not a rule that the window should have a default width — the primitive's job
stops at "arrange the header, sidebar, and body"; sizing is presentation the
caller owns, the same way `ui-kit` primitives stay domain-neutral. This is
the trap in setting it: it's easy to forget because nothing fails, breaks, or
warns when you do — the window just renders too wide.

## Related

[[dialog-card]], [[scroll-region]]
