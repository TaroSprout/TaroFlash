import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'

// Width drives the stacked → split layout, uniform across the welcome page on
// the `lg` boundary. `mobile` is reserved for a future finer breakpoint.
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
  const below_lg = useMatchMedia('w<lg')
  const short_height = useMatchMedia('h<md')

  const width = computed<WelcomeWidth>(() => (below_lg.value ? 'tablet' : 'desktop'))
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
