import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'

export type DialogCardViewport = 'mobile' | 'desktop'

export const dialogCardViewportKey: InjectionKey<ComputedRef<DialogCardViewport>> =
  Symbol('dialog-card.viewport')

/** Compute and provide the dialog-card's viewport mode from a full-bleed match-media query string. */
export function provideDialogCardViewport(query: string) {
  const is_mobile = useMatchMedia(query)
  const viewport = computed<DialogCardViewport>(() => (is_mobile.value ? 'mobile' : 'desktop'))

  provide(dialogCardViewportKey, viewport)

  return viewport
}

/** Inject the viewport mode. Must run under a `dialog-card.vue` ancestor. */
export function useDialogCardViewport() {
  return inject(dialogCardViewportKey)!
}
