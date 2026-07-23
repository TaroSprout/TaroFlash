---
id: theming
domain: theming
status: current
hazard: true
related: []
updated: 2026-07-23
---

# Theming

Where every color on the screen comes from — and why nothing in the app ever
names a specific shade.

Nothing in the app says "be blue." It says _be the accent_, _be the surface_,
_be the ink_ — a role, not a color.

A role is a named slot. What actually fills it is decided by three switches, set
high on the page and inherited all the way down to every element.

Flip a switch and every role reslots at once — the whole screen re-themes, and
not one component had to know a color's name to follow along.

The three switches:

1. **mode** — light or dark.
2. **palette** — which accent color this member picked.
3. **depth** — how raised a thing is: the flat page, a panel lifted off it, a
   dialog floating above.

> [!HAZARD] **The set of colors is closed — and a color that isn't in it resolves to nothing at all, with no error.**
> The app deliberately wipes every stock color its styling toolkit ships with,
> keeping only its own curated set. The upside is that every color on screen is
> on-theme and dark-mode-correct by construction. The flip side: reach for a
> color the set never registered — a leftover default class, a typo in a token
> name — and it doesn't fall back to some near shade and it doesn't warn. The
> style is simply inert: no color, no complaint, an element that renders bare.
> [See what the reset does ↓](#colors-are-roles-not-shades)

## Colors are roles, not shades

Only a small, hand-picked set of shades exists at all. Everything else is a
**role** — a named slot like _the surface_, _the accent_, _the ink_ — and every
component fills its color by asking for a role, never by writing a shade.

This is enforced at the root. The styling layer normally hands you hundreds of
default colors; the app throws all of them out in one line and re-adds only the
shades it curated. So the palette is a walled garden: inside it, everything is
deliberate; step outside it and there's nothing there.

> [!RULE]
> Style by role, never by shade — ask for _the accent_, not _blue-500_. A
> component that names a raw shade freezes one look into a slot the switches are
> supposed to move, and re-themes wrong the moment a switch changes.

## Three switches, set independently

The switches are three separate dials, and they don't overlap. Each owns a
different family of roles, so any combination composes cleanly with no "which
one wins" rules:

- **mode** shifts the _rendition_ of every role — the same slot, a light color
  or a dark one. It's set once at the top of the page.
- **palette** owns the **accent** roles only — the identity color and the few
  slots that ride on it.
- **depth** owns the **neutral chrome** roles — the surfaces, panels, and the
  raised neutral elements resting on them. A thing's depth is how lifted it is,
  and the neutral tones step to match.

Because accent and neutral roles are disjoint, palette and depth never contend:
a member's chosen accent and a panel's lift are answered by different slots.

## The palette a member picks

A member picks an accent, and that choice rides on the element as a single
label — `blue`, `green`, `pink`. Everything beneath it inherits that accent, so
one label re-colors a whole subtree.

Some labels are **meanings, not colors**: a destructive control asks for
_danger_, an informational one for _info_. Each meaning points at a real
palette today, but the call site only ever says the meaning — so the color
behind _danger_ can change without touching a single button.

## Textured backgrounds

Some surfaces carry a faint pattern — stripes, clouds, a dot grid — laid over
their fill. This is the **bgx** layer, and its tint is just another themed role:
_the accent's texture_ on an accent surface, _a neutral surface's texture_ on a
plain one. Both follow the same switches, so a textured surface stays on-theme
in every mode and palette without naming a color.

The two go opposite ways on purpose. An accent surface is already colored, so
its texture is a soft lighter **sheen**. A neutral surface is already pale, so
its texture reads the other way — darker in light, lighter in dark — to stay
visible.

> [!NOTE]
> The texture's strength is meant to live _in_ its role token, not in how each
> use-site dials it. The direction is to bake the final blend into one opaque
> color so a pattern's intensity is a property of the theme, not a knob every
> caller reaches for — tune the token per surface, never the opacity at the
> call.

## What this isn't

- **Not the shade list.** Which exact hues exist, and how the root reset and the
  per-mode / per-depth selectors are wired, is styling detail — the reference
  docs cover the mechanics.
- **Not mode persistence.** How a member's light/dark choice is remembered and
  applied to the page is app plumbing, not a theming truth.
- **Not deck covers.** A cover happens to be where a member picks a palette, but
  what a cover _is_ belongs to its own topic.

## Related

No sibling topics yet.
