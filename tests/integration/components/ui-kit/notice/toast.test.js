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

import ToastNotice from '@/components/ui-kit/notice/toast.vue'

function makeNotice(overrides = {}) {
  return {
    id: '1',
    message: 'Hello',
    state: 'info',
    delay: 2000,
    closable: true,
    ...overrides
  }
}

async function mountToast(notice) {
  const wrapper = shallowMount(ToastNotice, {
    props: { notice },
    global: { stubs: { UiIcon: UiIconStub, UiButton: UiButtonStub } }
  })
  await flushPromises()
  return wrapper
}

function getCallbacks() {
  const call = mockRegister.mock.calls[0]
  if (!call) return null
  return { el: call[0], callbacks: call[1] }
}

describe('ToastNotice', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockRegister.mockClear()
    coarseRef.value = false
  })

  afterEach(() => vi.useRealTimers())

  test('close button is present when notice.closable is true', async () => {
    const wrapper = await mountToast(makeNotice({ closable: true }))
    expect(wrapper.find('[data-testid="ui-kit-notice-toast__close"]').exists()).toBe(true)
  })

  test('close button is entirely omitted when notice.closable is false [obligation]', async () => {
    const wrapper = await mountToast(makeNotice({ closable: false }))
    expect(wrapper.find('[data-testid="ui-kit-notice-toast__close"]').exists()).toBe(false)
  })

  test('close button is hidden entirely on a coarse pointer, even when closable is true [obligation]', async () => {
    coarseRef.value = true
    const wrapper = await mountToast(makeNotice({ closable: true }))
    expect(wrapper.find('[data-testid="ui-kit-notice-toast__close"]').exists()).toBe(false)
  })

  test('clicking close emits the close event and calls onDismiss', async () => {
    const onDismiss = vi.fn()
    const notice = makeNotice({ onDismiss })
    const wrapper = await mountToast(notice)

    await wrapper.find('[data-testid="ui-kit-notice-toast__close"]').trigger('click')

    expect(onDismiss).toHaveBeenCalledOnce()
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')[0]).toEqual([notice])
  })

  test('an action without closesOnClick runs onClick but leaves the notice open [obligation]', async () => {
    const onClick = vi.fn()
    const onDismiss = vi.fn()
    const notice = makeNotice({
      onDismiss,
      actions: [{ label: 'Undo', onClick, closesOnClick: false }]
    })
    const wrapper = await mountToast(notice)

    const action_button = wrapper.findAll('[data-testid="ui-kit-notice-toast__actions"] button')[0]
    await action_button.trigger('click')

    expect(onClick).toHaveBeenCalledOnce()
    expect(onDismiss).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  test('an action with closesOnClick runs onClick then closes through the same path as the close button [obligation]', async () => {
    const onClick = vi.fn()
    const onDismiss = vi.fn()
    const notice = makeNotice({
      onDismiss,
      actions: [{ label: 'Undo', onClick, closesOnClick: true }]
    })
    const wrapper = await mountToast(notice)

    const action_button = wrapper.findAll('[data-testid="ui-kit-notice-toast__actions"] button')[0]
    await action_button.trigger('click')

    expect(onClick).toHaveBeenCalledOnce()
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')[0]).toEqual([notice])
  })

  describe('swipe to dismiss', () => {
    test('does not register the drag handler on a fine pointer [obligation]', async () => {
      coarseRef.value = false
      await mountToast(makeNotice())
      expect(mockRegister).not.toHaveBeenCalled()
    })

    test('swiping up past the threshold on a coarse pointer dismisses [obligation]', async () => {
      coarseRef.value = true
      const onDismiss = vi.fn()
      const wrapper = await mountToast(makeNotice({ onDismiss }))

      const { callbacks } = getCallbacks()
      callbacks.onEnd({ dy: -61 })
      await wrapper.vm.$nextTick()

      expect(onDismiss).toHaveBeenCalledOnce()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    test('swiping down past the threshold does not dismiss (toast only swipes up) [obligation]', async () => {
      coarseRef.value = true
      const onDismiss = vi.fn()
      const wrapper = await mountToast(makeNotice({ onDismiss }))

      const { callbacks } = getCallbacks()
      callbacks.onEnd({ dy: 61 })
      await wrapper.vm.$nextTick()

      expect(onDismiss).not.toHaveBeenCalled()
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('hover pauses auto-dismiss', () => {
    test('pointerenter pauses the timer so the delay elapsing does not dismiss [obligation]', async () => {
      vi.useFakeTimers()
      const onDismiss = vi.fn()
      const wrapper = await mountToast(makeNotice({ onDismiss, delay: 1000, persist: false }))

      await wrapper.trigger('pointerenter')
      vi.advanceTimersByTime(1000)

      expect(onDismiss).not.toHaveBeenCalled()
    })

    test('pointerleave resumes with the remaining time and eventually dismisses [obligation]', async () => {
      vi.useFakeTimers()
      const onDismiss = vi.fn()
      const wrapper = await mountToast(makeNotice({ onDismiss, delay: 1000, persist: false }))

      await wrapper.trigger('pointerenter')
      vi.advanceTimersByTime(1000)
      await wrapper.trigger('pointerleave')
      vi.advanceTimersByTime(1000)

      expect(onDismiss).toHaveBeenCalledOnce()
    })
  })
})
