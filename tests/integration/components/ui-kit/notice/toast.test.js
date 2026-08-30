import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
// The reserved-room tests measure real padding rather than a utility class, so
// the app stylesheet has to be live in the Chromium test page.
import '@/styles/main.css'

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

// Mounted into the document so `getComputedStyle` resolves real layout values;
// `mounted_wrappers` is drained in `afterEach` to keep the page clean.
const mounted_wrappers = []

async function mountToast(notice) {
  const wrapper = shallowMount(ToastNotice, {
    props: { notice },
    attachTo: document.body,
    global: { stubs: { UiIcon: UiIconStub, UiButton: UiButtonStub } }
  })
  mounted_wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

function reservedRoomBesideMessage(wrapper) {
  const body = wrapper.find('[data-testid="ui-kit-notice-toast__body"]').element
  return parseFloat(getComputedStyle(body).paddingRight)
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

  afterEach(() => {
    vi.useRealTimers()
    while (mounted_wrappers.length) mounted_wrappers.pop().unmount()
  })

  test('close button is present when notice.closable is true', async () => {
    const wrapper = await mountToast(makeNotice({ closable: true }))
    expect(wrapper.find('[data-testid="ui-kit-notice-toast__close"]').exists()).toBe(true)
  })

  test('stamps the constant data-station="float"', async () => {
    const wrapper = await mountToast(makeNotice({}))
    expect(wrapper.find('[data-testid="ui-kit-notice-toast"]').attributes('data-station')).toBe(
      'float'
    )
  })

  test('close button is entirely omitted when notice.closable is false', async () => {
    const wrapper = await mountToast(makeNotice({ closable: false }))
    expect(wrapper.find('[data-testid="ui-kit-notice-toast__close"]').exists()).toBe(false)
  })

  test('close button is hidden entirely on a coarse pointer, even when closable is true', async () => {
    coarseRef.value = true
    const wrapper = await mountToast(makeNotice({ closable: true }))
    expect(wrapper.find('[data-testid="ui-kit-notice-toast__close"]').exists()).toBe(false)
  })

  test('keeps room beside the message when closable on a fine pointer, so a long message never runs under the close button', async () => {
    coarseRef.value = false
    const wrapper = await mountToast(
      makeNotice({ closable: true, message: 'A message long enough to reach the far edge' })
    )
    expect(reservedRoomBesideMessage(wrapper)).toBeGreaterThan(0)
  })

  test('gives the message the full width when there is no close button, so the room does not leak into the common case', async () => {
    coarseRef.value = false
    const wrapper = await mountToast(makeNotice({ closable: false }))
    expect(reservedRoomBesideMessage(wrapper)).toBe(0)
  })

  test('gives the message the full width on a coarse pointer even when closable, since the close button is suppressed there', async () => {
    coarseRef.value = true
    const wrapper = await mountToast(makeNotice({ closable: true }))
    expect(reservedRoomBesideMessage(wrapper)).toBe(0)
  })

  test('holds the room while the close button is still invisible, so the message cannot shift when it fades in', async () => {
    coarseRef.value = false
    const wrapper = await mountToast(makeNotice({ closable: true }))
    const close_button = wrapper.find('[data-testid="ui-kit-notice-toast__close"]').element

    // Nothing is hovered here, so the button is fully transparent — the room
    // beside the message is already held, and only opacity changes on reveal.
    expect(getComputedStyle(close_button).opacity).toBe('0')
    expect(reservedRoomBesideMessage(wrapper)).toBeGreaterThan(0)
    expect(getComputedStyle(close_button).transitionProperty).toBe('opacity')
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

  test('an action without closesOnClick runs onClick but leaves the notice open', async () => {
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

  test('an action with closesOnClick runs onClick then closes through the same path as the close button', async () => {
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
    test('does not register the drag handler on a fine pointer', async () => {
      coarseRef.value = false
      await mountToast(makeNotice())
      expect(mockRegister).not.toHaveBeenCalled()
    })

    test('swiping up past the threshold on a coarse pointer dismisses', async () => {
      coarseRef.value = true
      const onDismiss = vi.fn()
      const wrapper = await mountToast(makeNotice({ onDismiss }))

      const { callbacks } = getCallbacks()
      callbacks.onEnd({ dy: -61 })
      await wrapper.vm.$nextTick()

      expect(onDismiss).toHaveBeenCalledOnce()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    test('swiping down past the threshold does not dismiss (toast only swipes up)', async () => {
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
    test('pointerenter pauses the timer so the delay elapsing does not dismiss', async () => {
      vi.useFakeTimers()
      const onDismiss = vi.fn()
      const wrapper = await mountToast(makeNotice({ onDismiss, delay: 1000, persist: false }))

      await wrapper.trigger('pointerenter')
      vi.advanceTimersByTime(1000)

      expect(onDismiss).not.toHaveBeenCalled()
    })

    test('pointerleave resumes with the remaining time and eventually dismisses', async () => {
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
