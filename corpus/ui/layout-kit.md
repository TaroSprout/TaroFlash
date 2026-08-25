---
id: layout-kit
domain: ui
status: current
hazard: true
related: [dialog-card]
updated: 2026-08-25
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

Docked to the bottom of a viewport too short or too narrow to hold it,
`app-window` drops whatever height its caller set and grows to fit its
content instead — the modal sheet around it is then the only thing that
scrolls. Docking is the `mobile-modal` variant in
`src/styles/mobile-modal-variant.css`: pure media queries plus attribute
selectors, no JS flag, so every part of this state is expressible as a CSS
variant →[K:mid-gesture-mutation-kills-momentum-scroll]. A caller can opt out
of the height half of that release — see the hazard below.

> [!HAZARD] [K:docked-app-window-drops-body-scroll] **A docked window has exactly one scroller, the sheet it sits in — its own body must stop scrolling or the two fight, unless the caller opted out.**
> Two things get in the way of switching the body off. A caller's height cap
> (feedback-board's `msm:h-196`, admin's `h-205`) is a same-property variant
> utility whose cascade order against `mobile-modal:` isn't guaranteed, so the
> window root drops the cap with an important `mobile-modal:h-auto!` instead of
> a plain utility. The body's `overflow-y` can't be switched off by a utility
> either — `scroll-region` owns it in a scoped stylesheet at a specificity a
> `:where`-wrapped variant utility loses to — so the window sets
> `--scroll-overflow: visible` for the region to read. That variable
> inherits, so a scroll region mounted deeper inside a docked window's body
> would stop scrolling too; there are none today, and "nothing inside a
> docked window scrolls" is arguably the rule anyway, but the reach is wider
> than the body scroller alone.
>
> `keep_docked_height` (default off) narrows the release to the width half of
> docking — `mobile-modal-flush:` instead of `mobile-modal:`. A window docked
> only because the viewport got _short_ then keeps its cap and keeps running
> its own body scroller inside the sheet; a window docked because it ran out
> of _width_ is unaffected either way. Settings is the one caller that sets it
> today, for its fixed-height `h-187` window.

With the cap gone, the scroller's `scrollHeight` equals its `clientHeight`,
`use-scroll-metrics` reports not-overflowing, and the scroll handle needs no
hiding branch of its own — it's simply never rendered.

## What this isn't

Not a rule that the window should have a default width — the primitive's job
stops at "arrange the header, sidebar, and body"; sizing is presentation the
caller owns, the same way `ui-kit` primitives stay domain-neutral. This is
the trap in setting it: it's easy to forget because nothing fails, breaks, or
warns when you do — the window just renders too wide.

## Related

[[dialog-card]], [[scroll-region]]
