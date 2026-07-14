import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/components/member/avatars', () => ({
  AVATAR_KEYS: ['panda', 'otter', 'owl'],
  loadAvatarUrl: () => null
}))

const DialogCardStub = defineComponent({
  name: 'DialogCard',
  inheritAttrs: false,
  props: { close_sfx: { type: Object, default: undefined } },
  emits: ['close'],
  setup(props, { slots, attrs }) {
    return () =>
      h(
        'div',
        { ...attrs, 'data-close-sfx': JSON.stringify(props.close_sfx ?? null) },
        slots.default?.({ viewport: 'desktop' })
      )
  }
})

import AvatarPickerModal from '@/components/member/avatar-picker-modal.vue'

function mountModal(props = {}) {
  return shallowMount(AvatarPickerModal, {
    props: { close: vi.fn(), ...props },
    global: {
      stubs: { DialogCard: DialogCardStub },
      directives: { sfx: {} }
    }
  })
}

beforeEach(() => {
  mockEmitSfx.mockClear()
})

describe('AvatarPickerModal', () => {
  test('plays wooden_chime_ring on mount', () => {
    mountModal()
    expect(mockEmitSfx).toHaveBeenCalledWith('wooden_chime_ring')
  })

  test('passes close_sfx: { press: "snappy_button_5" } to dialog-card', () => {
    const wrapper = mountModal()
    expect(wrapper.find('[data-testid="avatar-picker-modal"]').attributes('data-close-sfx')).toBe(
      JSON.stringify({ press: 'snappy_button_5' })
    )
  })

  test('renders one option per AVATAR_KEYS entry', () => {
    const wrapper = mountModal()
    expect(wrapper.find('[data-testid="avatar-picker-modal__option-panda"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="avatar-picker-modal__option-otter"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="avatar-picker-modal__option-owl"]').exists()).toBe(true)
  })

  test('clicking an avatar that is not selected calls close with that key and plays toggle_on', async () => {
    const close = vi.fn()
    const wrapper = mountModal({ close, selected: 'owl' })

    await wrapper.find('[data-testid="avatar-picker-modal__option-panda"]').trigger('click')

    expect(close).toHaveBeenCalledWith('panda')
    expect(mockEmitSfx).toHaveBeenCalledWith('toggle_on')
  })

  test('clicking the already-selected avatar is a no-op and plays digi_powerdown', async () => {
    const close = vi.fn()
    const wrapper = mountModal({ close, selected: 'owl' })
    mockEmitSfx.mockClear()

    await wrapper.find('[data-testid="avatar-picker-modal__option-owl"]').trigger('click')

    expect(close).not.toHaveBeenCalled()
    expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
  })

  test('marks the selected avatar with data-selected', () => {
    const wrapper = mountModal({ selected: 'otter' })
    expect(
      wrapper.find('[data-testid="avatar-picker-modal__option-otter"]').attributes('data-selected')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="avatar-picker-modal__option-panda"]').attributes('data-selected')
    ).toBeUndefined()
  })

  test('dialog-card close emits calls close() with no argument (dismiss)', () => {
    const close = vi.fn()
    const wrapper = mountModal({ close })
    wrapper.findComponent(DialogCardStub).vm.$emit('close')
    expect(close).toHaveBeenCalledWith()
  })
})
