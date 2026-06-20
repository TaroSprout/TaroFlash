import { gsap } from 'gsap'

const ENTER_DURATION = 0.35
const LEAVE_DURATION = 0.2

// The prev/next nav buttons only render when there's more than one page of due
// cards, so the NodeList is often empty — guard every tween, since GSAP warns
// when handed a target that matches nothing.
function navButtons(inbox: HTMLElement) {
  return inbox.querySelectorAll<HTMLElement>(
    '[data-testid="review-inbox__prev-btn"], [data-testid="review-inbox__next-btn"]'
  )
}

function setNavButtons(inbox: HTMLElement, vars: gsap.TweenVars) {
  const buttons = navButtons(inbox)
  if (buttons.length) gsap.set(buttons, vars)
}

export function inboxSwingBeforeEnter(el: Element) {
  const wrapper = el as HTMLElement
  const inbox = wrapper.firstElementChild as HTMLElement
  gsap.set(wrapper, { height: 0, overflow: 'hidden' })
  gsap.set(inbox, { rotateX: -90, opacity: 0, transformOrigin: 'top center' })
  setNavButtons(inbox, { opacity: 0 })
}

export function inboxSwingEnter(el: Element, done: () => void) {
  const wrapper = el as HTMLElement
  const inbox = wrapper.firstElementChild as HTMLElement
  const h = inbox.offsetHeight

  gsap.to(wrapper, { height: h, duration: ENTER_DURATION * 0.75, ease: 'power3.out' })
  gsap.to(inbox, {
    rotateX: 0,
    opacity: 1,
    duration: ENTER_DURATION,
    ease: 'back.out(1.6)',
    onComplete: () => {
      gsap.set(wrapper, { height: 'auto', overflow: '' })
      const buttons = navButtons(inbox)
      if (buttons.length) {
        gsap.to(buttons, { opacity: 1, duration: 0.15, ease: 'power2.out' })
      }
      done()
    }
  })
}

export function inboxSwingLeave(el: Element, done: () => void) {
  const wrapper = el as HTMLElement
  const inbox = wrapper.firstElementChild as HTMLElement

  gsap.set(wrapper, { height: wrapper.offsetHeight, overflow: 'hidden' })
  setNavButtons(inbox, { opacity: 0 })
  gsap.to(inbox, {
    rotateX: -90,
    opacity: 0,
    transformOrigin: 'top center',
    duration: LEAVE_DURATION * 0.65,
    ease: 'power2.in'
  })
  gsap.to(wrapper, {
    height: 0,
    duration: LEAVE_DURATION,
    ease: 'power3.in',
    onComplete: done
  })
}
