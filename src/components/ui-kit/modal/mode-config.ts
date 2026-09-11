import type { ModalMode } from '@/composables/modal'
import type { Motion } from '@/utils/motion/types'
import {
  dialogEnterMotion,
  dialogLeaveMotion,
  sheetEnterMotion,
  sheetLeaveMotion,
  popupEnterMotion,
  popupLeaveMotion
} from '@/utils/animations/modal'

type ModeConfig = {
  containerClass: string
  enter(is_mobile: boolean): Motion
  leave(is_mobile: boolean): Motion
}

export const MODAL_MODE_CONFIG: Record<ModalMode, ModeConfig> = {
  dialog: {
    containerClass: 'items-center',
    enter: () => dialogEnterMotion,
    leave: () => dialogLeaveMotion
  },

  // Static string, not a computed class — a reactive one triggers Safari's
  // touch-disrupting setAttribute mid-scroll.
  'mobile-sheet': {
    containerClass:
      'items-center mobile-modal:flex-col mobile-modal:overflow-y-auto mobile-modal:overscroll-y-contain mobile-modal:justify-start mobile-modal:pt-4 mobile-modal:pointer-events-auto',
    enter: (is_mobile) => (is_mobile ? sheetEnterMotion : dialogEnterMotion),
    leave: (is_mobile) => (is_mobile ? sheetLeaveMotion : dialogLeaveMotion)
  },

  popup: {
    containerClass: 'items-center',
    enter: () => popupEnterMotion,
    leave: () => popupLeaveMotion
  }
}
