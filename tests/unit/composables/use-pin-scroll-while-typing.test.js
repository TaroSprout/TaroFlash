import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import { usePinScrollWhileTyping } from '@/composables/ui/pin-scroll-while-typing'

// ── Host-app helper ────────────────────────────────────────────────────────────
// Mounts a minimal Vue app so onMounted / onUnmounted lifecycle hooks run.

function withSetup(composable) {
  const app = createApp({
    setup() {
      composable()
      return () => null
    }
  })

  const el = document.createElement('div')
  document.body.appendChild(el)
  app.mount(el)

  return {
    unmount: () => {
      app.unmount()
      el.remove()
    }
  }
}

// ── Event helpers ──────────────────────────────────────────────────────────────

function makeContentEditable() {
  const el = document.createElement('div')
  el.contentEditable = 'true'
  // jsdom doesn't compute isContentEditable from contentEditable, so stub it —
  // the composable gates on target.isContentEditable.
  Object.defineProperty(el, 'isContentEditable', { value: true, configurable: true })
  document.body.appendChild(el)
  return el
}

function fireBeforeInput(target) {
  const e = new Event('beforeinput', { bubbles: true })
  Object.defineProperty(e, 'target', { value: target, configurable: true })
  document.dispatchEvent(e)
}

function fireScroll() {
  window.dispatchEvent(new Event('scroll', { bubbles: true }))
}

function fireWheel() {
  window.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
}

function fireTouchMove() {
  window.dispatchEvent(new TouchEvent('touchmove', { bubbles: true }))
}

function makeInput() {
  const el = document.createElement('input')
  document.body.appendChild(el)
  return el
}

function fireFocusOut(target) {
  const e = new FocusEvent('focusout', { bubbles: true })
  Object.defineProperty(e, 'target', { value: target, configurable: true })
  document.dispatchEvent(e)
}

// ── Setup ──────────────────────────────────────────────────────────────────────

describe('usePinScrollWhileTyping', () => {
  let container
  let editable
  let scrollToSpy
  let unmount

  beforeEach(() => {
    // Create a container div and a contenteditable inside it
    container = document.createElement('div')
    editable = makeContentEditable()
    container.appendChild(editable)
    document.body.appendChild(container)

    // Spy on window.scrollTo
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    // Seed scrollY via defineProperty so we can control it per test
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })
    Object.defineProperty(window, 'scrollX', { value: 0, writable: true, configurable: true })
  })

  afterEach(() => {
    unmount?.()
    unmount = undefined
    container.remove()
    editable.remove()
    scrollToSpy.mockRestore()
  })

  // ── Anchor capture [obligation] ────────────────────────────────────────────

  test('beforeinput from a contenteditable inside the container captures scrollY [obligation]', () => {
    window.scrollY = 200
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    fireBeforeInput(editable)

    // A subsequent scroll should be intercepted and restored to 200
    window.scrollY = 250
    fireScroll()

    expect(scrollToSpy).toHaveBeenCalledWith(0, 200)
  })

  test('subsequent beforeinputs in the same burst do NOT re-capture scrollY [obligation]', () => {
    window.scrollY = 100
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    fireBeforeInput(editable)

    // scrollY drifts (simulating the pinned scroll restoration)
    window.scrollY = 120
    fireBeforeInput(editable)

    // Scroll event should restore to the FIRST capture (100), not the drifted 120
    window.scrollY = 150
    fireScroll()

    expect(scrollToSpy).toHaveBeenCalledWith(0, 100)
  })

  test('beforeinput from outside the container does not arm the anchor [obligation]', () => {
    window.scrollY = 300
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    // Fire beforeinput from an element NOT inside container
    const outside = document.createElement('div')
    outside.contentEditable = 'true'
    Object.defineProperty(outside, 'isContentEditable', { value: true, configurable: true })
    document.body.appendChild(outside)
    fireBeforeInput(outside)
    outside.remove()

    // Scroll should NOT be intercepted (anchor never set)
    window.scrollY = 350
    fireScroll()

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  test('beforeinput from a plain <input> inside the container arms the anchor [obligation]', () => {
    window.scrollY = 220
    const input = makeInput()
    container.appendChild(input)
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    fireBeforeInput(input)

    window.scrollY = 260
    fireScroll()

    expect(scrollToSpy).toHaveBeenCalledWith(0, 220)
    input.remove()
  })

  test('beforeinput from a non-contenteditable element does not arm the anchor [obligation]', () => {
    window.scrollY = 300
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    const plainDiv = document.createElement('div')
    container.appendChild(plainDiv)
    fireBeforeInput(plainDiv)

    window.scrollY = 350
    fireScroll()

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  // ── Scroll restoration [obligation] ───────────────────────────────────────

  test('scroll event while armed restores scrollY to the captured value [obligation]', () => {
    window.scrollY = 500
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    fireBeforeInput(editable)

    window.scrollY = 550
    fireScroll()

    expect(scrollToSpy).toHaveBeenCalledWith(0, 500)
  })

  test('scroll event while not armed (no anchor) does nothing [obligation]', () => {
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    window.scrollY = 100
    fireScroll()

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  // ── Release via wheel / touchmove / focusout [obligation] ─────────────────

  test('wheel event releases the anchor so next scroll is not intercepted [obligation]', () => {
    window.scrollY = 400
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    fireBeforeInput(editable)
    fireWheel()

    // Now scrolling must NOT be restored
    window.scrollY = 450
    fireScroll()

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  test('touchmove event releases the anchor so next scroll is not intercepted [obligation]', () => {
    window.scrollY = 400
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    fireBeforeInput(editable)
    fireTouchMove()

    window.scrollY = 450
    fireScroll()

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  test('focusout event releases the anchor [obligation]', () => {
    window.scrollY = 400
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    fireBeforeInput(editable)
    fireFocusOut(editable)

    window.scrollY = 450
    fireScroll()

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  test('after wheel release, the next beforeinput re-anchors at the new scrollY [obligation]', () => {
    window.scrollY = 100
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    fireBeforeInput(editable)
    fireWheel()

    // User scrolled deliberately — new position
    window.scrollY = 300
    fireBeforeInput(editable)

    // Scroll from the new anchor
    window.scrollY = 350
    fireScroll()

    expect(scrollToSpy).toHaveBeenCalledWith(0, 300)
  })

  // ── Unmount cleanup [obligation] ───────────────────────────────────────────

  test('all listeners are removed on unmount [obligation]', () => {
    window.scrollY = 200
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    // Arm the anchor
    fireBeforeInput(editable)

    // Unmount removes listeners
    unmount()
    unmount = undefined

    // A scroll after unmount must not call scrollTo
    window.scrollY = 300
    fireScroll()

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  test('beforeinput after unmount does not re-arm [obligation]', () => {
    window.scrollY = 200
    const containerRef = ref(container)
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(containerRef)))

    unmount()
    unmount = undefined

    window.scrollY = 250
    fireBeforeInput(editable)

    window.scrollY = 300
    fireScroll()

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  // ── MaybeRefOrGetter support ───────────────────────────────────────────────

  test('accepts a getter function instead of a ref [obligation]', () => {
    window.scrollY = 150
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(() => container)))

    fireBeforeInput(editable)

    window.scrollY = 200
    fireScroll()

    expect(scrollToSpy).toHaveBeenCalledWith(0, 150)
  })

  test('resolves a null getter gracefully — beforeinput does not arm [obligation]', () => {
    ;({ unmount } = withSetup(() => usePinScrollWhileTyping(() => null)))

    fireBeforeInput(editable)

    window.scrollY = 100
    fireScroll()

    expect(scrollToSpy).not.toHaveBeenCalled()
  })
})
