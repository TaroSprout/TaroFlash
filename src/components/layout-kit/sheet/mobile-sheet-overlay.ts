import { inject, type InjectionKey, type Ref } from 'vue'

export const mobileSheetOverlayKey: InjectionKey<Ref<HTMLElement | undefined>> =
  Symbol('mobile-sheet-overlay')

/**
 * Inject the mobile-sheet's overlay-target ref. Use as a Teleport `to` to
 * render content outside the sheet's overflow-hidden body but still scoped
 * to the same sheet instance.
 */
export function useMobileSheetOverlay() {
  return inject(mobileSheetOverlayKey)
}
