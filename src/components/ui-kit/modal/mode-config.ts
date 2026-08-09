import type { ModalMode } from '@/composables/modal'
import {
  slideUpFadeIn,
  slideDownFadeOut,
  slideUpFromEdge,
  slideDownToEdge,
  springScaleIn,
  scaleFadeOut
} from '@/utils/animations/modal'

type ModeConfig = {
  containerClass: string
  enter(el: Element, is_mobile: boolean, done: () => void): void
  leave(el: Element, is_mobile: boolean, done: () => void): void
}

export const MODAL_MODE_CONFIG: Record<ModalMode, ModeConfig> = {
  dialog: {
    containerClass: 'items-center',
    enter: (el, _, done) => slideUpFadeIn(el, done),
    leave: (el, _, done) => slideDownFadeOut(el, done)
  },

  // Static string, not a computed class — a reactive one triggers Safari's
  // touch-disrupting setAttribute mid-scroll.
  'mobile-sheet': {
    containerClass:
      'items-center mobile-modal:flex-col mobile-modal:overflow-y-auto mobile-modal:overscroll-y-contain mobile-modal:justify-start mobile-modal:pt-4 mobile-modal:pointer-events-auto',
    enter: (el, is_mobile, done) =>
      is_mobile ? slideUpFromEdge(el, done) : slideUpFadeIn(el, done),
    leave: (el, is_mobile, done) =>
      is_mobile ? slideDownToEdge(el, done) : slideDownFadeOut(el, done)
  },

  popup: {
    containerClass: 'items-center',
    enter: (el, _, done) => springScaleIn(el, done),
    leave: (el, _, done) => scaleFadeOut(el, done)
  }
}
