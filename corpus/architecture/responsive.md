---
id: responsive
domain: architecture
status: current
hazard: false
related: [theming]
updated: 2026-08-08
---

# Responsive conditions

How the app asks "is this a small screen?" — and the short vocabulary every
screen uses to ask it.

A layout rarely wants to know the exact pixel width. It wants to know one thing
about the situation: is there room for the sidebar, is this a touch device, is
the window too short for the tall variant. Those questions are written as tiny
token queries — `w>=lg & fine`, `w<md | h<sm` — rather than as full CSS media
queries spelled out at every call site.

## Conditions are written as tiny token queries, not CSS media queries [K:media-query-token-language]

An **atom** is one condition. There are four kinds:

| Atom              | Asks                                    |
| ----------------- | --------------------------------------- |
| `w>=md` / `w<md`  | width at or above / below a breakpoint  |
| `h>=lg` / `h<sm`  | height at or above / below a breakpoint |
| `fine` / `coarse` | pointer — a mouse, or a finger          |
| `dark` / `light`  | the system's colour-scheme preference   |

Breakpoint names are the shared set: `sm`, `msm`, `md`, `mlg`, `lg`, `mxl`,
`xl`, `2xl`. Their actual widths are read from the stylesheet, so a token query
and a CSS rule can never disagree about where `md` starts.

A **combinator** joins atoms: `&` means every atom must hold, `|` means any one
of them. A query uses one or the other, never both — mixing them throws rather
than guessing at precedence.

> [!RULE]
> A `<` atom is legal only under `|`, never under `&`.
> "Too small" reads naturally as _any_ maximum exceeded — `w<md | h<sm`. Under
> `&` it can't be expressed at all without negating the whole conjunction and
> flipping every other atom with it, so a `<` atom under `&` throws on sight.
> `>=` atoms are the mirror image and read naturally under `&`: big enough
> means _every_ minimum met.

## The answer is shared and permanent

Asking the same question twice gets the same answer object back — one live
listener per distinct query, kept for the life of the page and never torn down.
Nothing is bound to a component, so a query can be read from anywhere: setup,
render, an animation hook.

That permanence is deliberate. Responsive conditions are page-wide facts, and
two independent listeners for "is this a phone" is how a sidebar ends up
visible while the column beside it has already fallen back to its narrow
layout.

> [!WATCH]
> On iPhone the very first reading can be wrong. The viewport is still settling
> — zoom and safe-area negotiation — at the instant a fresh page's first script
> runs, so the answer is re-checked once after the first paint and corrected if
> it drifted.

## What this isn't

Not theming. Whether the screen is dark is available here as an atom, but the
dark-mode switch that actually recolours the app is [[theming]]'s, and it is
driven by the member's saved choice rather than by the system preference alone.

Not a general expression language. There are no parentheses, no nesting, and no
negation — a condition too complicated to write as a flat list of atoms is a
sign the layout wants splitting, not that the vocabulary wants extending.
