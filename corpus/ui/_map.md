# ui

Shared interface mechanics — chrome, gestures, and viewport detection used across views.

- [[mobile-dock]] — the floating bar owns its own height tween; a second one nested inside fights it ⚠️
- [[layout-kit]] — `app-window`'s root is full-width; every caller sets its own cap on non-mobile screens ⚠️
- [[keyboard-detection]] — no browser event says the keyboard opened; `useKeyboardOpen` infers it from the visual viewport shrinking
- [[media-query]] — `useMatchMedia` turns a short token string like `w>=md` into a live CSS media query
- [[pin-scroll-while-typing]] — `usePinScrollWhileTyping` stops the page jumping while typing inside a window-scrolled virtualized list
- [[reorder-drag]] — the pointer-driven drag-to-reorder engine; applies a computed offset as a translate, never moves or clones DOM
- [[safe-area-chrome-detection]] — `installSafeAreaPadding` decides live whether browser chrome already covers the safe-area strip
- [[scroll-lock]] — `useScrollLock` keeps the background from scrolling without the usual overflow/position toggle
- [[window-refocus-guard]] — `useWindowRefocusGuard` tells a real blur apart from focus round-tripping through an OS app-switch
