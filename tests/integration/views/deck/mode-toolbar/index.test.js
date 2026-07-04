import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const { mockUseMatchMedia } = vi.hoisted(() => ({
  mockUseMatchMedia: vi.fn()
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: mockUseMatchMedia
}))

const ModeViewStub = defineComponent({
  name: 'ModeView',
  setup: () => () => h('div', { 'data-testid': 'mode-view-stub' })
})

const ModeSelectStub = defineComponent({
  name: 'ModeSelect',
  setup: () => () => h('div', { 'data-testid': 'mode-select-stub' })
})

import ModeToolbar from '@/views/deck/mode-toolbar/index.vue'
import { cardEditorKey } from '@/views/deck/composables'

function mount({ is_selecting = false, is_desktop = false } = {}) {
  mockUseMatchMedia.mockReturnValue(ref(is_desktop))
  return shallowMount(ModeToolbar, {
    global: {
      provide: { [cardEditorKey]: { selection: { is_selecting: ref(is_selecting) } } },
      stubs: { ModeView: ModeViewStub, ModeSelect: ModeSelectStub }
    }
  })
}

describe('mode-toolbar/index', () => {
  test('renders ModeView when not selecting, regardless of viewport', () => {
    const wrapper = mount({ is_selecting: false, is_desktop: false })
    expect(wrapper.find('[data-testid="mode-view-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-select-stub"]').exists()).toBe(false)
  })

  test('renders ModeSelect when selecting below xl (tablet range) [obligation]', () => {
    const wrapper = mount({ is_selecting: true, is_desktop: false })
    expect(wrapper.find('[data-testid="mode-select-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-view-stub"]').exists()).toBe(false)
  })

  test('renders ModeView when selecting at true desktop (xl and above) [obligation]', () => {
    const wrapper = mount({ is_selecting: true, is_desktop: true })
    expect(wrapper.find('[data-testid="mode-view-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-select-stub"]').exists()).toBe(false)
  })

  test('renders ModeView when not selecting at desktop', () => {
    const wrapper = mount({ is_selecting: false, is_desktop: true })
    expect(wrapper.find('[data-testid="mode-view-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-select-stub"]').exists()).toBe(false)
  })
})
