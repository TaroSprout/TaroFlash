import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

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

function mountToast(notice) {
  return shallowMount(ToastNotice, {
    props: { notice },
    global: { stubs: { UiIcon: UiIconStub, UiButton: UiButtonStub } }
  })
}

describe('ToastNotice', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  test('close button is present when notice.closable is true', () => {
    const wrapper = mountToast(makeNotice({ closable: true }))
    expect(wrapper.find('[data-testid="ui-kit-notice-toast__close"]').exists()).toBe(true)
  })

  test('close button is entirely omitted when notice.closable is false [obligation]', () => {
    const wrapper = mountToast(makeNotice({ closable: false }))
    expect(wrapper.find('[data-testid="ui-kit-notice-toast__close"]').exists()).toBe(false)
  })

  test('clicking close emits the close event and calls onDismiss', async () => {
    const onDismiss = vi.fn()
    const notice = makeNotice({ onDismiss })
    const wrapper = mountToast(notice)

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
    const wrapper = mountToast(notice)

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
    const wrapper = mountToast(notice)

    const action_button = wrapper.findAll('[data-testid="ui-kit-notice-toast__actions"] button')[0]
    await action_button.trigger('click')

    expect(onClick).toHaveBeenCalledOnce()
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')[0]).toEqual([notice])
  })
})
