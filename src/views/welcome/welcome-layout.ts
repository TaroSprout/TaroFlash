import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'

// Width drives the responsive layout across the welcome page on two boundaries:
// `desktop` at/above `xl`, `tablet` between `sm` and `xl`, `mobile` below `sm`.
// `desktop` starts at `xl` so the four-card feature row only unwraps once it
// actually fits. Consumers that only split desktop vs not compare against
// `'desktop'`.
export type WelcomeWidth = 'mobile' | 'tablet' | 'desktop'

// Height is orthogonal to width — right now it only governs vertical chrome
// (splash-nav visibility + which actions variant shows). `medium` is reserved.
export type WelcomeHeight = 'short' | 'medium' | 'tall'

export const welcomeWidthKey: InjectionKey<ComputedRef<WelcomeWidth>> = Symbol('welcome-width')
export const welcomeHeightKey: InjectionKey<ComputedRef<WelcomeHeight>> = Symbol('welcome-height')

/**
 * Compute and provide the welcome page's two responsive axes. Call once at the
 * welcome root; sections inject only the axis they care about via
 * `useWelcomeWidth()` / `useWelcomeHeight()`.
 */
export function provideWelcomeLayout() {
  const below_xl = useMatchMedia('w<xl')
  const below_sm = useMatchMedia('w<sm')
  const short_height = useMatchMedia('h<md')

  const width = computed<WelcomeWidth>(() => {
    if (!below_xl.value) return 'desktop'
    return below_sm.value ? 'mobile' : 'tablet'
  })
  const height = computed<WelcomeHeight>(() => (short_height.value ? 'short' : 'tall'))

  provide(welcomeWidthKey, width)
  provide(welcomeHeightKey, height)

  return { width, height }
}

/** Inject the width axis. Must run under a `provideWelcomeLayout()` ancestor. */
export function useWelcomeWidth() {
  return inject(welcomeWidthKey)!
}

/** Inject the height axis. Must run under a `provideWelcomeLayout()` ancestor. */
export function useWelcomeHeight() {
  return inject(welcomeHeightKey)!
}
