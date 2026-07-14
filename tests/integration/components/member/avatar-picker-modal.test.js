import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const { mockEmitSfx, mockLoadAvatarUrl } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockLoadAvatarUrl: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/components/member/avatars', () => ({
  AVATAR_KEYS: ['panda', 'otter', 'owl', 'frog'],
  loadAvatarUrl: mockLoadAvatarUrl
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
import AvatarImage from '@/components/member/avatar-image.vue'

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
  mockLoadAvatarUrl.mockReset()
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

  test('marks the frog avatar as selected when selected is "frog" (default fallback value)', () => {
    const wrapper = mountModal({ selected: 'frog' })
    expect(
      wrapper.find('[data-testid="avatar-picker-modal__option-frog"]').attributes('data-selected')
    ).toBe('true')
  })

  test('dialog-card close emits calls close() with no argument (dismiss)', () => {
    const close = vi.fn()
    const wrapper = mountModal({ close })
    wrapper.findComponent(DialogCardStub).vm.$emit('close')
    expect(close).toHaveBeenCalledWith()
  })

  test('shows a skeleton and no avatar-image for an option before its load resolves', () => {
    mockLoadAvatarUrl.mockReturnValue(new Promise(() => {}))
    const wrapper = mountModal()

    const option = wrapper.find('[data-testid="avatar-picker-modal__option-panda"]')
    expect(option.find('[data-testid="avatar-picker-modal__skeleton"]').exists()).toBe(true)
    expect(option.findComponent(AvatarImage).exists()).toBe(false)
  })

  test('replaces the skeleton with avatar-image once loadAvatarUrl resolves', async () => {
    let resolvePanda
    mockLoadAvatarUrl.mockImplementation((key) =>
      key === 'panda' ? new Promise((resolve) => (resolvePanda = resolve)) : new Promise(() => {})
    )
    const wrapper = mountModal()
    const option = wrapper.find('[data-testid="avatar-picker-modal__option-panda"]')
    expect(option.find('[data-testid="avatar-picker-modal__skeleton"]').exists()).toBe(true)

    resolvePanda('/mock/panda.svg')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(option.find('[data-testid="avatar-picker-modal__skeleton"]').exists()).toBe(false)
    expect(option.findComponent(AvatarImage).exists()).toBe(true)
  })

  test('resolving one option does not reveal the skeleton on other options', async () => {
    let resolvePanda
    mockLoadAvatarUrl.mockImplementation((key) =>
      key === 'panda' ? new Promise((resolve) => (resolvePanda = resolve)) : new Promise(() => {})
    )
    const wrapper = mountModal()

    resolvePanda('/mock/panda.svg')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const otter = wrapper.find('[data-testid="avatar-picker-modal__option-otter"]')
    expect(otter.find('[data-testid="avatar-picker-modal__skeleton"]').exists()).toBe(true)
    expect(otter.findComponent(AvatarImage).exists()).toBe(false)
  })
})
