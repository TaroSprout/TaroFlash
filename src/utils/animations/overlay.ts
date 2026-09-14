import { defineMotion } from '@/utils/motion/driver'
import type { MotionHandle } from '@/utils/motion/types'

const ENTER_SETTLE_DELAY = 0.033

const DIALOG_RISE = '200px' // structural geometry, not a vocabulary travel token
const SHEET_TRAVEL = '100%' // structural geometry, not a vocabulary travel token
const POPUP_SCALE = 0.8 // structural geometry, not a vocabulary travel token

type OverlayMode = 'dialog' | 'popup'

/** `data-overlay-mode` stamped by the surface; anything but `popup` is a dialog. */
function readMode(el: HTMLElement): OverlayMode {
  return el.dataset.overlayMode === 'popup' ? 'popup' : 'dialog'
}

/**
 * True when the CSS downgrade variant has painted the sheet marker onto this
 * element. Read from computed style so the timeline choice tracks the exact
 * same `--breakpoint-*` tokens the `overlay-downgrade` variant keys off.
 */
function isDowngraded(el: HTMLElement): boolean {
  return getComputedStyle(el).getPropertyValue('--overlay-downgraded').trim() === '1'
}

const dialogEnterMotion = defineMotion({
  from: { translateY: DIALOG_RISE, opacity: 0 },
  to: { translateY: 0, opacity: 1 },
  duration: 200,
  ease: 'out-strong',
  delay: ENTER_SETTLE_DELAY,
  clearOnComplete: true
})

const dialogLeaveMotion = defineMotion({
  to: { translateY: DIALOG_RISE, opacity: 0 },
  duration: 200,
  ease: 'out-strong',
  interrupt: 'snap-complete'
})

const sheetEnterMotion = defineMotion({
  from: { translateY: SHEET_TRAVEL },
  to: { translateY: 0 },
  duration: 200,
  ease: 'out-strong',
  delay: ENTER_SETTLE_DELAY,
  clearOnComplete: true
})

const sheetLeaveMotion = defineMotion({
  to: { translateY: SHEET_TRAVEL },
  duration: 200,
  ease: 'out-strong',
  interrupt: 'snap-complete'
})

const popupEnterMotion = defineMotion({
  from: { scale: POPUP_SCALE, opacity: 0 },
  to: { scale: 1, opacity: 1 },
  duration: 100,
  ease: 'spring',
  delay: ENTER_SETTLE_DELAY,
  clearOnComplete: true
})

const popupLeaveMotion = defineMotion({
  to: { scale: POPUP_SCALE, opacity: 0 },
  duration: 200,
  ease: 'out-strong',
  interrupt: 'snap-complete'
})

/**
 * Play an overlay's enter animation, dispatching on `data-overlay-mode`.
 * Dialogs slide-and-fade, or rise from the bottom edge when the downgrade
 * marker is set (sheet layout); popups spring-scale in.
 */
export function playEnter(el: HTMLElement): MotionHandle {
  if (readMode(el) === 'popup') return popupEnterMotion(el)
  if (isDowngraded(el)) return sheetEnterMotion(el)
  return dialogEnterMotion(el)
}

/**
 * Play an overlay's leave animation — the inverse of `playEnter`, dispatched
 * the same way.
 */
export function playLeave(el: HTMLElement): MotionHandle {
  if (readMode(el) === 'popup') return popupLeaveMotion(el)
  if (isDowngraded(el)) return sheetLeaveMotion(el)
  return dialogLeaveMotion(el)
}
