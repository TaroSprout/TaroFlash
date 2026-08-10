---
lastUpdated: 2026-04-25T19:03:21Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Animation Sequencing

Prefer animation-completion hooks over wall-clock waits. Emit from the hook's `onComplete` so timing stays in sync if the animation changes.

```ts
await new Promise((resolve) => {
  gsap.to(el, { duration: 0.4, opacity: 0, onComplete: resolve })
})
```

If a duration is referenced in more than one place, extract it as a named constant rather than repeating the magic number.

# File Structure

All animation functions should be in `src/utils/animations/` and named after the element or effect they animate (`modal.ts`, `phone.ts`, `blur.ts`).

# Transitions

Wire Vue `<Transition>` with `:css="false"` and JS hooks (`@enter`, `@leave`) that delegate to the helpers above. **Never write `*-enter-active` / `*-leave-to` class rules in a `<style>` block**, even though Vue supports it — mixing CSS-class transitions with GSAP gives inconsistent feel and hides the timing.

Prefer a **simultaneous** swap (entering and leaving panes overlapping) over `out-in`, which reads as a sequential two-step. When a transition needs reworking, adapt the existing util rather than deleting it.

# Sequencing dependent work

When something must happen _after_ a transition, make the state-transition function `async` and resolve it from the real GSAP completion, then `await` it. Keep the synchronous effect synchronous — only the returned promise is deferred, so non-awaiting callers are unaffected.

Don't suppress native browser behaviour to dodge a mid-animation glitch (e.g. `focus({ preventScroll: true })` to avoid a scroll jump). Sequence the work after the animation settles so it reads final positions instead.

# Nested height animations

A container already driven by its own height tween (e.g. `useAnimatedHeight`) owns that height
entirely. Don't nest a second height/size transition — an accordion `<Transition>`, another
`useAnimatedHeight` — inside it: the two run concurrently at different durations and easings and
visibly fight, and the outer tween keeps chasing a moving target because its `ResizeObserver` fires
on every frame of the inner one. Change the DOM in one step (`v-if`, no transition) and let the
container's own tween carry the resize. [K:no-nested-height-animation]
