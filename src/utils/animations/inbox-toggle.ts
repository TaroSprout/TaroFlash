import { gsap } from 'gsap'

const ENTER_DURATION = 0.6
const LEAVE_DURATION = 0.32

export function inboxSwingBeforeEnter(el: Element) {
  const wrapper = el as HTMLElement
  const inbox = wrapper.firstElementChild as HTMLElement
  gsap.set(wrapper, { height: 0, overflow: 'hidden' })
  gsap.set(inbox, { rotateX: -90, transformOrigin: 'top center' })
}

export function inboxSwingEnter(el: Element, done: () => void) {
  const wrapper = el as HTMLElement
  const inbox = wrapper.firstElementChild as HTMLElement
  const h = inbox.offsetHeight

  gsap.to(wrapper, { height: h, duration: ENTER_DURATION * 0.75, ease: 'power3.out' })
  gsap.to(inbox, {
    rotateX: 0,
    duration: ENTER_DURATION,
    ease: 'back.out(1.6)',
    onComplete: () => {
      gsap.set(wrapper, { height: 'auto', overflow: '' })
      done()
    }
  })
}

export function inboxSwingLeave(el: Element, done: () => void) {
  const wrapper = el as HTMLElement
  const inbox = wrapper.firstElementChild as HTMLElement

  gsap.set(wrapper, { height: wrapper.offsetHeight, overflow: 'hidden' })
  gsap.to(inbox, {
    rotateX: -90,
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
