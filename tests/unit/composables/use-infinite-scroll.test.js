import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { defineComponent, h, ref, shallowRef } from 'vue'
import { mount } from '@vue/test-utils'

import { useInfiniteScroll } from '@/composables/ui/infinite-scroll'

// Captured per-test so we can synthesize intersection events ourselves.
let capturedCallback
let capturedOptions
let observeMock
let disconnectMock

beforeEach(() => {
  capturedCallback = undefined
  capturedOptions = undefined
  observeMock = vi.fn()
  disconnectMock = vi.fn()
  // Class form so `new IntersectionObserver(...)` works.
  global.IntersectionObserver = class {
    constructor(cb, opts) {
      capturedCallback = cb
      capturedOptions = opts
      this.observe = observeMock
      this.disconnect = disconnectMock
    }
  }
})

function makeHost(options, onIntersect) {
  return defineComponent({
    setup(_props, { expose }) {
      const sentinel = shallowRef(null)
      useInfiniteScroll(sentinel, onIntersect, options)
      expose({ sentinel })
      return () => h('div', { ref: sentinel, 'data-testid': 'sentinel' })
    }
  })
}

function fireIntersection(isIntersecting) {
  capturedCallback?.([{ isIntersecting }])
}

describe('useInfiniteScroll', () => {
  test('observes the sentinel element on mount', () => {
    const onIntersect = vi.fn()
    const wrapper = mount(makeHost({}, onIntersect))
    expect(observeMock).toHaveBeenCalledOnce()
    expect(observeMock.mock.calls[0][0]).toBe(wrapper.find('[data-testid="sentinel"]').element)
  })

  test('passes the configured rootMargin to the observer', () => {
    mount(makeHost({ root_margin: '500px' }, vi.fn()))
    expect(capturedOptions.rootMargin).toBe('500px')
  })

  test('defaults rootMargin to 200px', () => {
    mount(makeHost({}, vi.fn()))
    expect(capturedOptions.rootMargin).toBe('200px')
  })

  test('calls on_intersect when the sentinel intersects', () => {
    const onIntersect = vi.fn()
    mount(makeHost({}, onIntersect))
    fireIntersection(true)
    expect(onIntersect).toHaveBeenCalledOnce()
  })

  test('skips on_intersect when the entry is not intersecting', () => {
    const onIntersect = vi.fn()
    mount(makeHost({}, onIntersect))
    fireIntersection(false)
    expect(onIntersect).not.toHaveBeenCalled()
  })

  test('respects a reactive enabled flag — false suppresses calls', async () => {
    const enabled = ref(false)
    const onIntersect = vi.fn()
    mount(makeHost({ enabled }, onIntersect))
    fireIntersection(true)
    expect(onIntersect).not.toHaveBeenCalled()
    enabled.value = true
    fireIntersection(true)
    expect(onIntersect).toHaveBeenCalledOnce()
  })

  test('disconnects the observer on unmount', () => {
    const wrapper = mount(makeHost({}, vi.fn()))
    wrapper.unmount()
    expect(disconnectMock).toHaveBeenCalledOnce()
  })
})
