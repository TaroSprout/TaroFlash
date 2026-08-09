---
id: keyboard-detection
domain: ui
status: current
hazard: false
related: []
updated: 2026-08-08
---

# Detecting the on-screen keyboard

There's no browser event for "the on-screen keyboard opened". `useKeyboardOpen`
(`src/composables/ui/keyboard.ts`) infers it from how much the visual viewport
has shrunk, and getting that inference right took ruling out several
false positives.

## The baseline is a high-water mark, not the current viewport height [K:keyboard-detection-high-water-mark]

Comparing the visual viewport straight against `window.innerHeight` doesn't
work — mobile Safari also resizes `innerHeight` as its own toolbar hides and
shows while the page scrolls, which flickered the keyboard flag mid-keystroke.
Instead the composable remembers the _largest_ visual-viewport height it has
seen and compares the current height against that. Safari's toolbar hiding
only ever grows the viewport (raising the baseline); only a real keyboard
shrinks it below that high mark.

That high-water mark logic only holds on a touch device — a real keyboard
can't open without one — so it's gated on `pointer: coarse`. Without that
gate, a plain desktop window resize would read as the baseline shrinking
rather than tracking the live height.

## Chrome's URL bar needs a second signal beyond viewport shrink [K:keyboard-detection-needs-editable-focus]

Mobile Chrome's URL bar hides and reveals as the page scrolls, and unlike
Safari's toolbar it shrinks the visual viewport the same way a keyboard does —
so height comparison alone can't tell the two apart on Chrome. The composable
also requires a focused editable element (`contenteditable`, `input`,
`textarea`); a real keyboard is never open without one.
