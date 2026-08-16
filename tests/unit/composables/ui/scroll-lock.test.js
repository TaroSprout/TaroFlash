import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { useScrollLock } from '@/composables/ui/scroll-lock'

let app = null
let root = null

function makeScroller(
  overflow = 'auto',
  { scrollTop = 50, scrollHeight = 200, clientHeight = 100 } = {}
) {
  const el = document.createElement('div')
  el.style.overflowY = overflow
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true })
  el.scrollTop = scrollTop
  return el
}

function wheelEvent(deltaY = 10) {
  return new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true })
}

function mountLock(container) {
  let api = null
  app = createApp({
    setup() {
      api = useScrollLock(() => container)
      return () => null
    }
  })
  root = document.createElement('div')
  document.body.appendChild(root)
  app.mount(root)
  return api
}

describe('useScrollLock', () => {
  afterEach(() => {
    app?.unmount()
    app = null
    root?.remove()
    root = null
    document.body.innerHTML = ''
  })

  test('a wheel event outside the locked container is prevented (background stays blocked)', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const outside = document.createElement('div')
    document.body.appendChild(outside)

    const { lock } = mountLock(container)
    lock()

    const event = wheelEvent()
    outside.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  test('data-scroll-live on an outside panel is honoured — an in-bounds scroll there is not blocked', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const live_panel = document.createElement('div')
    live_panel.setAttribute('data-scroll-live', '')
    const scroller = makeScroller('auto', { scrollTop: 50, scrollHeight: 200, clientHeight: 100 })
    live_panel.appendChild(scroller)
    document.body.appendChild(live_panel)

    const { lock } = mountLock(container)
    lock()

    const event = wheelEvent(10)
    scroller.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  test('data-scroll-live sitting on a scroll-region root whose scroller is a child element is still honoured', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    // The scroll-region root carries the opt-in attribute; the actual overflow node is a child of it.
    const region_root = document.createElement('div')
    region_root.setAttribute('data-scroll-live', '')
    const scroller = makeScroller('auto', { scrollTop: 50, scrollHeight: 200, clientHeight: 100 })
    const content = document.createElement('span')
    scroller.appendChild(content)
    region_root.appendChild(scroller)
    document.body.appendChild(region_root)

    const { lock } = mountLock(container)
    lock()

    const event = wheelEvent(10)
    content.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  test('an out-of-bounds scroll (already at the bottom) inside a data-scroll-live panel still blocks, so it does not fall through to the page', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const live_panel = document.createElement('div')
    live_panel.setAttribute('data-scroll-live', '')
    // At the bottom already — scrolling further down would fall through to the background.
    const scroller = makeScroller('auto', { scrollTop: 100, scrollHeight: 200, clientHeight: 100 })
    live_panel.appendChild(scroller)
    document.body.appendChild(live_panel)

    const { lock } = mountLock(container)
    lock()

    const event = wheelEvent(10)
    scroller.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  test('scrolling inside the locked container itself is never blocked', () => {
    const container = document.createElement('div')
    const scroller = makeScroller('auto', { scrollTop: 50, scrollHeight: 200, clientHeight: 100 })
    container.appendChild(scroller)
    document.body.appendChild(container)

    const { lock } = mountLock(container)
    lock()

    const event = wheelEvent(10)
    scroller.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  test('inside the locked container but with no scrollable ancestor at all still blocks (nothing to route the gesture to)', () => {
    const container = document.createElement('div')
    const plain_child = document.createElement('div')
    container.appendChild(plain_child)
    document.body.appendChild(container)

    const { lock } = mountLock(container)
    lock()

    const event = wheelEvent(10)
    plain_child.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  // ── touch gestures ──────────────────────────────────────────────────────

  // jsdom has no Touch/TouchEvent constructor — a plain Event with a `touches` array grafted on
  // is enough, since the composable only ever reads `e.touches[n].clientY` and `e.touches.length`.
  function touchEvent(type, y, extra_clientYs = []) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    event.touches = [{ clientY: y }, ...extra_clientYs.map((clientY) => ({ clientY }))]
    return event
  }

  test('a touchmove past an out-of-bounds scroller is prevented, scrolling down', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const outside = document.createElement('div')
    document.body.appendChild(outside)

    const { lock } = mountLock(container)
    lock()

    outside.dispatchEvent(touchEvent('touchstart', 100))
    const move = touchEvent('touchmove', 50) // finger moved up -> content scrolls down
    outside.dispatchEvent(move)

    expect(move.defaultPrevented).toBe(true)
  })

  test('a touchmove with a second touch (pinch) is never prevented', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const outside = document.createElement('div')
    document.body.appendChild(outside)

    const { lock } = mountLock(container)
    lock()

    outside.dispatchEvent(touchEvent('touchstart', 100))
    const move = touchEvent('touchmove', 50, [60])
    outside.dispatchEvent(move)

    expect(move.defaultPrevented).toBe(false)
  })

  test('unlock stops swallowing background scroll events', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const outside = document.createElement('div')
    document.body.appendChild(outside)

    const { lock, unlock } = mountLock(container)
    lock()
    unlock()

    const event = wheelEvent()
    outside.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })
})
