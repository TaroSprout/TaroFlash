import { gsap } from 'gsap'

type IdleCallback = (cb: () => void) => void

const scheduleIdle: IdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 2000 })
    : (cb) => setTimeout(cb, 500)

export function warmupAnimations() {
  gsap.to({ _: 0 }, { _: 1, duration: 0, ease: 'expo.out' })
  gsap.to({ _: 0 }, { _: 1, duration: 0, ease: 'back.out(1.7)' })

  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:1px',
    'height:1px',
    'pointer-events:none',
    'opacity:0',
    'backdrop-filter:blur(4px)',
    '-webkit-backdrop-filter:blur(4px)',
    'contain:strict'
  ].join(';')
  document.body.appendChild(el)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.remove())
  })

  scheduleIdle(() => {
    void import('@/components/study-session/index.vue')
    void import('@/components/study-session/session-complete.vue')
    void import('@/components/modals/deck-settings/index.vue')
  })
}
