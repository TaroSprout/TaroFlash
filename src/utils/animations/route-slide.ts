import { gsap } from 'gsap'
import type { Ref } from 'vue'

const DURATION = 0.2
const EASE = 'power2.inOut'

// Leave and enter are always paired on a real navigation; a Suspense resolve
// triggers enter with no corresponding leave. This flag lets enter skip itself
// when it wasn't preceded by a leave.
let leave_pending = false

export function routeSlideLeave(going_to_dashboard: Ref<boolean>) {
  return (el: Element, done: () => void) => {
    leave_pending = true
    const html = el as HTMLElement
    const parent = html.parentElement
    const x = going_to_dashboard.value ? '100%' : '-100%'

    if (parent) parent.style.minHeight = `${html.offsetHeight}px`

    html.style.position = 'absolute'
    html.style.top = '0'
    html.style.left = '0'
    html.style.width = '100%'

    gsap.to(html, {
      x,
      duration: DURATION,
      ease: EASE,
      onComplete: () => {
        if (parent) parent.style.minHeight = ''
        done()
      }
    })
  }
}

export function routeSlideEnter(
  going_to_dashboard: Ref<boolean>,
  is_initial: Ref<boolean>,
  animation_done: Ref<boolean>
) {
  return (el: Element, done: () => void) => {
    if (is_initial.value || !leave_pending) {
      animation_done.value = true
      done()
      return
    }
    leave_pending = false
    const from_x = going_to_dashboard.value ? '-100%' : '100%'
    gsap.fromTo(
      el,
      { x: from_x },
      {
        x: '0%',
        duration: DURATION,
        ease: EASE,
        clearProps: 'transform',
        onComplete: () => {
          animation_done.value = true
          done()
        }
      }
    )
  }
}
