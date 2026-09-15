---
lastUpdated: 2026-09-15T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Animations

**Owns how an animation is sequenced, transitioned, and where its code lives.** Reaches you editing
any `.ts`/`.vue` file that animates something.

## Sequencing

- **Prefer animation-completion hooks over wall-clock waits** — emit from the hook's `onComplete` so
  timing stays in sync if the animation changes.

```ts
await new Promise((resolve) => {
  gsap.to(el, { duration: 0.4, opacity: 0, onComplete: resolve })
})
```

- **Extract a duration into a named constant** when it's referenced in more than one place, rather
  than repeating the magic number.

## Co-animated properties

- **Give a property gated by a second, concurrently-animated property a diverging easing curve**
  (blur gated by opacity, a shadow gated by scale, …) — sharing a curve makes the gated property peak
  exactly when the gate suppresses it, so it renders without ever being seen.

## Transform cleanup

- **Add `clearProps: 'transform'`** to any tween that animates a transform-family property (`x`, `y`,
  `rotation`, `scale`, …) on an element that also carries a class-driven transform (`rotate-6
scale-75`) — a GSAP tween writes the whole inline `transform` style and leaves it in place after
  completing, permanently outranking the resting CSS transform even though the classes stay applied.

## File structure

- **Put animation functions in `src/utils/animations/`**, named after the element or effect they
  animate (`modal.ts`, `phone.ts`, `blur.ts`).

## Transitions

- **Wire `<Transition>` with `:css="false"` and JS hooks** (`@enter`, `@leave`) that delegate to the
  helpers above.
- **Never write `*-enter-active` / `*-leave-to` class rules in a `<style>` block**, even though Vue
  supports it — mixing CSS-class transitions with GSAP gives inconsistent feel and hides the timing.
- **Prefer a simultaneous swap over `out-in`** — entering and leaving panes overlapping, not the
  sequential two-step `out-in` reads as.
- **Adapt the existing util rather than deleting it** when a transition needs reworking.
- **Size a simultaneous swap's container to the entering pane's own content**, not a fixed/
  `min-height` wrapper — stack the two panes on the same `grid-area` inside a `display: grid`
  container instead of absolutely positioning either one; a `min-height` wrapper with an
  absolutely-positioned pane inside it clips content taller than the guessed minimum.

## Sequencing dependent work

- **Make the state-transition function `async` and resolve it from the real GSAP completion, then
  `await` it**, when something must happen after a transition — keep the synchronous effect
  synchronous; only the returned promise is deferred, so non-awaiting callers are unaffected.
- **Don't suppress native browser behaviour to dodge a mid-animation glitch** (e.g.
  `focus({ preventScroll: true })` to avoid a scroll jump) — sequence the work after the animation
  settles so it reads final positions instead.
  </content>
