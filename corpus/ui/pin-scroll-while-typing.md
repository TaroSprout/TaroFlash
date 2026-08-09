---
id: pin-scroll-while-typing
domain: ui
status: current
hazard: false
related: []
updated: 2026-08-08
---

# Holding the page still while typing in a virtualized list

`usePinScrollWhileTyping` (`src/composables/ui/pin-scroll-while-typing.ts`)
stops the page from jumping while someone types in a card or a search field
that sits inside a window-scrolled, virtualized list.

## Two unrelated reflows both shift the same window scroller [K:pin-scroll-typing-reflow-sources]

The card editor is a window-scrolled virtualized list. Typing in a card can
reflow it — the text region grows, the image region shrinks — without
changing the card's overall height, but the browser still fires a caret
scroll-into-view on every keypress, which reaches the document scroller and
shifts the whole list. The deck search field hits the same symptom from a
different cause: its debounced query reflows the (also window-scrolled)
result grid asynchronously, which can clamp or shift `scrollY` once the
response lands.

Either way, the fix is the same: capture the scroll position at the first
keystroke and restore it on any scroll that follows, so the page holds still
through the reflow. A deliberate wheel or touch scroll releases the pin — the
next keystroke re-anchors wherever the user actually landed — and focus
leaving the field clears it outright.
