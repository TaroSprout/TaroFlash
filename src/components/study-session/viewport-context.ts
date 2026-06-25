import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'

// Width drives the responsive layout across the study session on a single
// boundary: `mobile` below `sm`, `desktop` at/above. Consumers compare against
// `'mobile'` to collapse chrome on phone widths.
export type StudyViewport = 'mobile' | 'desktop'

export const studyViewportKey: InjectionKey<ComputedRef<StudyViewport>> =
  Symbol('study-session.viewport')

/**
 * Compute and provide the study session's viewport mode. Call once at the
 * study-session root; descendants inject via `useStudyViewport()` to stay in
 * sync on a single shared breakpoint.
 */
export function provideStudyViewport() {
  const below_sm = useMatchMedia('w<sm')

  const viewport = computed<StudyViewport>(() => (below_sm.value ? 'mobile' : 'desktop'))

  provide(studyViewportKey, viewport)

  return viewport
}

/** Inject the viewport mode. Must run under a `provideStudyViewport()` ancestor. */
export function useStudyViewport() {
  return inject(studyViewportKey)!
}
