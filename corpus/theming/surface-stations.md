---
id: surface-stations
domain: theming
status: current
hazard: true
related: [theming]
updated: 2026-08-13
---

# Surface stations

What kind of surface a piece of chrome is sitting on, and why that answer is never computed.

A surface carries a station name — `page`, `panel`, `window`, or `float` — and everything resting
on it reads its neutral colors off that name. There's no ladder between the four; a thing doesn't
get darker because it's "more raised" than another. It just belongs to a station, and that station
owns its own look.

> [!HAZARD] [K:fixed-roles-skip-the-station] **A station role assumes the thing wearing it is
> resting on a station. Something that isn't — a badge sitting on an accent fill, not on the page,
> panel, window, or float behind it — can borrow a station role that looks fine in the mode you're
> testing and disappears in the other.**
> A selected-swatch tick tried `well`, the natural-sounding pick — and `well` happens to be the
> darkest shade in the `window` station's dark rendition, so the badge inverted into the fill it was
> supposed to stand out from. The roles that opt out fix only the station axis — each still swaps
> light/dark with the mode. Read "fixed" as mode-invariant and a badge tuned for light survives
> unchanged into dark, which is the opposite of this trap.
> [See the fixed roles ↓](#a-few-roles-never-re-author)

## The four stations

- **page** — the app background behind everything.
- **panel** — a structural band or column inside the page: a sidebar, a section.
- **window** — something laid over the page: a dialog, an app-window, a sheet.
- **float** — chrome that floats over anything: a menu, a popover, a tooltip, a toast.

## Nothing is derived [K:surface-stations-hand-authored]

Each station is tuned by hand, in both light and dark, with no formula linking it to the others. The
payoff: retuning one station — making panels a shade darker, say — never nudges page, window, or
float along with it, because none of them were computed from it in the first place. The cost is the
mirror image — there's no shared source keeping the four in step, so staying visually coherent across
stations is a judgment call made anew each time one is touched, not a guarantee the system enforces.

## The roles a station fills

A station answers the same ten questions every time, and a component asks for the role it needs —
never the station, never a shade:

- **surface** — the station's own fill
- **well** — a recess cut into it: inputs, tracks, list wells
- **raised** — a neutral thing resting on it: buttons, chips, tiles
- **raised-tint** / **raised-shade** — the lighter and darker companions in a two-tone control
- **line** — dividers, hairlines, seams
- **ink** / **ink-muted** — body text and secondary text
- **skeleton** / **skeleton-sheen** — a loading placeholder bar and the highlight sweeping across it

## A few roles never re-author — by station, not by mode

`card`/`on-card`, `mat`, and `knockout`/`on-knockout` are fixed on the station axis only: the same
color regardless of which station they sit in, never picked up from a station's own set. Each opts
out for the same reason — it isn't actually resting on a station's surface. A flashcard carries its
own identity everywhere it appears; an avatar's mat is color-tuned once per mode, so an avatar image
reads the same wherever it's mounted; a knockout badge or ring — the tick on a selected swatch, the
outline around it — sits directly on an accent fill, not on the station behind it, so following the
station would sink it into whatever's behind the swatch.

They are **not** fixed on the mode axis. All three pairs still swap to a dark rendition when the
page goes dark — `stations.css` carries a `[data-mode='dark']` value for each of them, same as any
station-derived role would. "Fixed" here means "the station switch doesn't move it," not "no switch
moves it."

## What this isn't

- **Not the palette dial.** A station's neutral roles and a member's accent color are answered by
  different switches — see [[theming]] for how the two stay disjoint.
- **Not the shade list.** Which exact hex value fills each role, and which file wires up the
  selectors, is styling detail, not a domain truth.

## Related

- [[theming]] — the three switches a station's role sits alongside.
