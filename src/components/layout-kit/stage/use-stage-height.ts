import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { motion } from '@/utils/motion/driver'
import type { MotionHandle } from '@/utils/motion/types'
import { reserveHeightTween } from './height-budget'

const HEIGHT_DURATION = 200

const NOOP = () => {}

/**
 * Grows or shrinks the measured box to follow its content's natural height,
 * tweening through the motion driver and clipping the box only while it moves.
 *
 * One height tween runs per box at a time. An outside owner takes the height
 * with `claimHeight()`, releasing through the returned callback; while any claim
 * is open the box's own resize tween stands down so the two never compete.
 * →[K:dock-height-single-owner]
 *
 * @param box - the measured element whose height is animated; must tolerate `overflow: hidden`.
 * @param content - the in-flow element whose natural height drives the target.
 */
export function useStageHeight(box: Ref<HTMLElement | null>, content: Ref<HTMLElement | null>) {
  const claims = ref(0)

  let observer: ResizeObserver | null = null
  let last = 0
  let generation = 0
  let handle: MotionHandle | null = null
  let release: () => void = NOOP

  function handBack() {
    const el = box.value
    if (!el) return

    el.style.removeProperty('overflow')
    el.style.removeProperty('height')
  }

  function stopCurrent() {
    release()
    release = NOOP

    handle?.cancel()
    handle = null

    generation++
  }

  // Reads the height the box wants with its current content, without leaving that value
  // pinned — the caller decides whether to snap or tween toward it from where it is now.
  function measureNatural(el: HTMLElement, restore: string): number {
    el.style.removeProperty('height')
    const natural = el.offsetHeight
    el.style.height = restore

    return natural
  }

  function tweenTo(el: HTMLElement, from: number, target: number) {
    const gen = generation

    el.style.overflow = 'hidden'
    handle = motion(
      (node, ctx) => {
        ctx.tl.fromTo(
          node,
          { height: from },
          { height: target, duration: ctx.duration(HEIGHT_DURATION), ease: ctx.ease('out') }
        )
      },
      { promote: false }
    )(el)

    void handle.done.then(() => {
      release()
      if (gen !== generation) return

      handBack()
      handle = null
    })
  }

  function changeHeight() {
    const el = box.value
    if (!el || claims.value > 0) return

    stopCurrent()

    const from = el.offsetHeight
    const target = measureNatural(el, `${from}px`)
    if (target === from) return handBack()

    const reserved = reserveHeightTween()
    if (!reserved) {
      handBack()
      return
    }

    release = reserved
    tweenTo(el, from, target)
  }

  function onResize() {
    const target = content.value?.offsetHeight ?? 0
    if (target === last) return

    last = target
    changeHeight()
  }

  /**
   * Takes the box's height for an outside animation; the box's own resize tween
   * stands down until the returned release runs. Idempotent, so a double release
   * can't drop another owner's claim early.
   */
  function claimHeight() {
    claims.value++
    let released = false

    return () => {
      if (released) return
      released = true
      claims.value = Math.max(0, claims.value - 1)
    }
  }

  onBeforeUnmount(() => stopCurrent())

  watch(
    content,
    (el) => {
      observer?.disconnect()
      observer = null
      last = el?.offsetHeight ?? 0
      if (!el) return

      observer = new ResizeObserver(onResize)
      observer.observe(el)
    },
    { immediate: true, flush: 'post' }
  )

  // An outside owner just claimed the height — drop our own tween so it drives alone.
  watch(claims, (count) => {
    if (count === 0) return

    stopCurrent()
    handBack()
  })

  return { claimHeight }
}
