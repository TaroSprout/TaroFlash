import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

const { mockRegister } = vi.hoisted(() => ({ mockRegister: vi.fn() }))
vi.mock('@/composables/ui/gestures', () => ({ useGestures: () => ({ register: mockRegister }) }))

// `mockCoarse` is a plain container so it can be assigned inside vi.hoisted
// (where Vue's `ref` is not yet importable). The real ref is created below.
const { mockCoarse } = vi.hoisted(() => ({ mockCoarse: { ref: null } }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => mockCoarse.ref }))

const coarseRef = ref(false)
mockCoarse.ref = coarseRef

vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup() {
    return () => h('div', { 'data-testid': 'ui-icon-stub' })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_props, { emit, slots }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          ...attrs,
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

import { gsap } from 'gsap'
import NoticePanel from '@/components/ui-kit/notice/panel.vue'

function makeNotice(overrides = {}) {
  return {
    id: '1',
    message: 'Hello',
    state: 'info',
    delay: 2000,
    closable: true,
    backdrop: true,
    ...overrides
  }
}

async function mountPanel(notice) {
  const wrapper = shallowMount(NoticePanel, {
    props: { notice },
    global: {
      stubs: {
        UiIcon: UiIconStub,
        UiButton: UiButtonStub,
        Transition: false,
        transition: false
      }
    }
  })
  await flushPromises()
  return wrapper
}

function getCallbacks() {
  const call = mockRegister.mock.calls[0]
  if (!call) return null
  return { el: call[0], callbacks: call[1] }
}

describe('NoticePanel', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockRegister.mockClear()
    coarseRef.value = false
  })

  afterEach(() => vi.useRealTimers())

  test('close button is present when notice.closable is true', async () => {
    const wrapper = await mountPanel(makeNotice({ closable: true }))
    expect(wrapper.find('[data-testid="ui-kit-notice-panel__close"]').exists()).toBe(true)
  })

  test('close button still renders on a coarse pointer (regression guard)', async () => {
    coarseRef.value = true
    const wrapper = await mountPanel(makeNotice({ closable: true }))
    expect(wrapper.find('[data-testid="ui-kit-notice-panel__close"]').exists()).toBe(true)
  })

  test('close button is entirely omitted when notice.closable is false [obligation]', async () => {
    const wrapper = await mountPanel(makeNotice({ closable: false }))
    expect(wrapper.find('[data-testid="ui-kit-notice-panel__close"]').exists()).toBe(false)
  })

  test('clicking close calls onDismiss', async () => {
    const onDismiss = vi.fn()
    const wrapper = await mountPanel(makeNotice({ onDismiss }))

    await wrapper.find('[data-testid="ui-kit-notice-panel__close"]').trigger('click')

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  test('closing runs the leave transition and emits close with the notice [obligation]', async () => {
    const notice = makeNotice()
    const wrapper = await mountPanel(notice)

    await wrapper.find('[data-testid="ui-kit-notice-panel__close"]').trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')[0]).toEqual([notice])
  })

  test('auto-dismisses via the delay timeout when the notice is not persisted [obligation]', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const notice = makeNotice({ onDismiss, delay: 1000, persist: false })
    const wrapper = await mountPanel(notice)

    vi.advanceTimersByTime(1000)
    await flushPromises()

    expect(onDismiss).toHaveBeenCalledOnce()
    vi.useRealTimers()
    wrapper.unmount()
  })

  test('does not auto-dismiss when the notice is persisted', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const notice = makeNotice({ onDismiss, delay: 1000, persist: true })
    const wrapper = await mountPanel(notice)

    vi.advanceTimersByTime(5000)
    await flushPromises()

    expect(onDismiss).not.toHaveBeenCalled()
    vi.useRealTimers()
    wrapper.unmount()
  })

  test('an action without closesOnClick runs onClick but leaves the notice open [obligation]', async () => {
    const onClick = vi.fn()
    const onDismiss = vi.fn()
    const notice = makeNotice({
      onDismiss,
      actions: [{ label: 'Undo', onClick, closesOnClick: false }]
    })
    const wrapper = await mountPanel(notice)

    const action_button = wrapper.findAll('[data-testid="ui-kit-notice-panel__actions"] button')[0]
    await action_button.trigger('click')

    expect(onClick).toHaveBeenCalledOnce()
    expect(onDismiss).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="ui-kit-notice-panel"]').exists()).toBe(true)
  })

  test('an action with closesOnClick runs onClick then closes through the same path as the close button [obligation]', async () => {
    const onClick = vi.fn()
    const onDismiss = vi.fn()
    const notice = makeNotice({
      onDismiss,
      actions: [{ label: 'Undo', onClick, closesOnClick: true }]
    })
    const wrapper = await mountPanel(notice)

    const action_button = wrapper.findAll('[data-testid="ui-kit-notice-panel__actions"] button')[0]
    await action_button.trigger('click')
    await flushPromises()

    expect(onClick).toHaveBeenCalledOnce()
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  describe('swipe to dismiss', () => {
    test('does not register the drag handler on a fine pointer [obligation]', async () => {
      coarseRef.value = false
      await mountPanel(makeNotice())
      expect(mockRegister).not.toHaveBeenCalled()
    })

    test('swiping up past the threshold dismisses [obligation]', async () => {
      coarseRef.value = true
      const onDismiss = vi.fn()
      await mountPanel(makeNotice({ onDismiss }))

      const { callbacks } = getCallbacks()
      callbacks.onEnd({ dy: -61 })
      await flushPromises()

      expect(onDismiss).toHaveBeenCalledOnce()
    })

    test('swiping down past the threshold dismisses [obligation]', async () => {
      coarseRef.value = true
      const onDismiss = vi.fn()
      await mountPanel(makeNotice({ onDismiss }))

      const { callbacks } = getCallbacks()
      callbacks.onEnd({ dy: 61 })
      await flushPromises()

      expect(onDismiss).toHaveBeenCalledOnce()
    })

    test('a drag below the threshold snaps back without dismissing [obligation]', async () => {
      coarseRef.value = true
      const onDismiss = vi.fn()
      await mountPanel(makeNotice({ onDismiss }))
      gsap.to.mockClear()

      const { callbacks, el } = getCallbacks()
      callbacks.onEnd({ dy: -20 })

      expect(onDismiss).not.toHaveBeenCalled()
      expect(gsap.to).toHaveBeenCalledWith(el, expect.objectContaining({ y: 0 }))
    })
  })

  describe('hover pauses auto-dismiss', () => {
    test('pointerenter pauses the timer so the delay elapsing does not dismiss [obligation]', async () => {
      vi.useFakeTimers()
      const onDismiss = vi.fn()
      const wrapper = await mountPanel(makeNotice({ onDismiss, delay: 1000, persist: false }))

      await wrapper.find('[data-testid="ui-kit-notice-panel"]').trigger('pointerenter')
      vi.advanceTimersByTime(1000)

      expect(onDismiss).not.toHaveBeenCalled()
    })

    test('pointerleave resumes with the remaining time and eventually dismisses [obligation]', async () => {
      vi.useFakeTimers()
      const onDismiss = vi.fn()
      const wrapper = await mountPanel(makeNotice({ onDismiss, delay: 1000, persist: false }))
      const panel = wrapper.find('[data-testid="ui-kit-notice-panel"]')

      await panel.trigger('pointerenter')
      vi.advanceTimersByTime(1000)
      await panel.trigger('pointerleave')
      vi.advanceTimersByTime(1000)

      expect(onDismiss).toHaveBeenCalledOnce()
    })
  })
})
