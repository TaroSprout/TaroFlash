---
id: layout-kit
domain: ui
status: current
hazard: true
related: [dialog-card]
updated: 2026-08-14
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

Two shapes cover every current caller:

- **A fixed width breakpoint class**, when the content doesn't need to react
  to `layout_mode` — `feedback-board.vue` (`sm:w-170`), `signup/index.vue`
  (`sm:w-130`), `upload-lesson-modal/index.vue` (`sm:w-150`),
  `admin/index.vue` (`sm:w-170 lg:w-200`).
- **A `layout_mode`-driven width**, when the window also switches into
  `paged-window`'s desktop sidebar layout — `settings/index.vue` and
  `deck-settings/index.vue` both pick `w-248!` / `w-238!` on `desktop` and
  fall back to `w-full! max-w-*` otherwise, `!` because `paged-window`'s own
  layout classes would otherwise win.

## What this isn't

Not a rule that the window should have a default width — the primitive's job
stops at "arrange the header, sidebar, and body"; sizing is presentation the
caller owns, the same way `ui-kit` primitives stay domain-neutral. This is
the trap in setting it: it's easy to forget because nothing fails, breaks, or
warns when you do — the window just renders too wide.

## Related

[[dialog-card]]
