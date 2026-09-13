import { defineMotion } from '@/utils/motion/driver'

const TRANSLATE_AMOUNT = 100

const slideDownIn = defineMotion({
  from: { translateY: -TRANSLATE_AMOUNT, opacity: 0 },
  to: { translateY: 0, opacity: 1 },
  duration: 100,
  ease: 'out-strong',
  clearOnComplete: true
})

const slideUpIn = defineMotion({
  from: { translateY: TRANSLATE_AMOUNT, opacity: 0 },
  to: { translateY: 0, opacity: 1 },
  duration: 100,
  ease: 'out-strong',
  clearOnComplete: true
})

const slideUpOut = defineMotion({
  to: { translateY: -TRANSLATE_AMOUNT, opacity: 0 },
  duration: 100,
  ease: 'out-strong',
  interrupt: 'snap-complete'
})

const slideDownOut = defineMotion({
  to: { translateY: TRANSLATE_AMOUNT, opacity: 0 },
  duration: 100,
  ease: 'out-strong',
  interrupt: 'snap-complete'
})

function blurIn(el: HTMLElement) {
  el.dataset.phoneBlur = 'true'
  requestAnimationFrame(() => {
    el.dataset.phoneBlur = 'false'
  })
}

function blurOut(el: HTMLElement) {
  el.dataset.phoneBlur = 'true'
}

export function slideDownBlurIn(el: Element, done: () => void) {
  blurIn(el as HTMLElement)
  void slideDownIn(el as HTMLElement).done.then(done)
}

export function slideUpBlurOut(el: Element, done: () => void) {
  blurOut(el as HTMLElement)
  void slideUpOut(el as HTMLElement).done.then(done)
}

export function slideUpBlurIn(el: Element, done: () => void) {
  blurIn(el as HTMLElement)
  void slideUpIn(el as HTMLElement).done.then(done)
}

export function slideDownBlurOut(el: Element, done: () => void) {
  blurOut(el as HTMLElement)
  void slideDownOut(el as HTMLElement).done.then(done)
}
