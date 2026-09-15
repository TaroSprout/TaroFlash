---
lastUpdated: 2026-09-15T00:00:00Z
paths:
  - 'src/**/*.{ts,vue,css}'
---

# Safari Gotchas

**Owns the WebKit-only workarounds this app carries.** Reaches you editing any `.ts`/`.vue`/`.css`
file — check it before chasing an iOS-only bug as if it were app logic. Chrome's mobile-mode uses
Blink, not WebKit, so none of these surface there — only on real Safari.

## Don't bind `:class` reactively on a scrolling container

- **Never drive a scrolling element's `class` off a reactive binding** — Vue's class patch calls
  `setAttribute('class', …)` on every re-render, even when the resulting string is identical, and iOS
  Safari treats those writes during a touch gesture as scroll-disrupting mutations that kill momentum
  scroll inside the element. Drive responsive layout via CSS keyed off a data attribute set once when
  the element mounts instead.

```vue
<!-- Bad — reactive class on the element you scroll inside -->
<div class="overflow-y-auto" :class="modeConfig.containerClass(isMobile.value)">

<!-- Good — static class on Vue side, drive responsive layout via CSS keyed off
     a data attribute that's set once when the element mounts -->
<div class="overflow-y-auto" :data-mobile-below-width="threshold">
```

```css
@media (...) {
  [data-mobile-below-width='md'] {
    …;
  }
}
```

- **Memoizing the class function doesn't help** — Vue still patches class on every re-render the
  moment any tracked dep (matchMedia, etc.) fires. Remove the reactive binding entirely from the
  scrolling element; a cheaper function that returns the same string reference still triggers the
  patch.

## Sticky elements lag during scroll

- **Pin a `position: sticky` bar to its own compositor layer with `transform: translateZ(0)`** — it
  otherwise lags behind scroll in iOS standalone (home-screen) mode.

## Audio

- **Defer a seek set on load to a pending value applied inside `play()`** — iOS ignores
  `audio.currentTime` when there's no user gesture and the media isn't seekable yet, so the element
  stays at 0 while a JS `current_time` ref optimistically jumps ahead and playback starts from the
  beginning with the UI stranded. Apply the pending seek within the tap gesture; a manual seek clears
  the pending value.
- **Animate a `window.scrollTo` tween only while playing; jump instantly when paused** — iOS suspends
  `requestAnimationFrame` mid programmatic scroll, so a rAF-driven scroll tween started while paused
  runs into the next play tap and freezes the page.
  </content>
