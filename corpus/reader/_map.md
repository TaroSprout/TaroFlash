# reader

The reader's off-screen layout pass and its word-selection gesture engine.

- [[reader-layout]] — pages are laid out by measuring an invisible, unmounted copy first; a resize freeze gates the reflow, not the frames' live height ⚠️
- [[reader-selection]] — one gesture engine drives hover, drag, and long-press word selection; its trailing-click swallower is viewport-wide, not scoped to words ⚠️
