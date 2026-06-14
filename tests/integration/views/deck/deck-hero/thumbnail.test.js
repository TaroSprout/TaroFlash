import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { mockOpenSettings } = vi.hoisted(() => ({
  mockOpenSettings: vi.fn(() => ({ response: Promise.resolve(false) }))
}))

vi.mock('@/composables/deck/settings-modal', () => ({
  useDeckSettingsModal: () => ({ open: mockOpenSettings })
}))

const DeckThumbnailStub = defineComponent({
  name: 'DeckThumbnail',
  inheritAttrs: false,
  setup(_p, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        { ...attrs, 'data-testid': 'deck-thumbnail-stub', onClick: () => emit('click') },
        slots.actions?.()
      )
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs }, slots.default?.())
  }
})

import Thumbnail from '@/views/deck/deck-hero/thumbnail.vue'

function mount(deck = {}) {
  return shallowMount(Thumbnail, {
    props: { deck: { id: 42, title: 'd', card_count: 0, ...deck } },
    global: { stubs: { DeckThumbnail: DeckThumbnailStub, UiButton: UiButtonStub } }
  })
}

describe('deck-hero/thumbnail', () => {
  beforeEach(() => {
    mockOpenSettings.mockClear()
  })

  test('renders the settings button in the thumbnail actions slot', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="deck-hero__settings-button"]').exists()).toBe(true)
  })

  test('clicking the thumbnail opens the settings modal with the deck', async () => {
    const wrapper = mount({ id: 7 })
    await wrapper.find('[data-testid="deck-thumbnail-stub"]').trigger('click')
    expect(mockOpenSettings).toHaveBeenCalledOnce()
    expect(mockOpenSettings).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }))
  })
})
