import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import TabBar from '@/components/layout-kit/tab-bar.vue'

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn(), emitHoverSfx: vi.fn() }))
// Break the config→player→config circular dep that causes AUDIO_VOLUME_DEFAULTS TDZ error.
vi.mock('@/sfx/config', () => ({
  TYPE_SFX: [],
  HOVER_SFX_SET: new Set(),
  AUDIO_VOLUME_DEFAULTS: { study_sounds: 5, interface_sounds: 5, hover_sounds: 5 }
}))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => ({ value: false }) }))

// Renders slot content, forwards attrs, emits tap on click so tab-bar's
// @tap="emit('update:active', value)" fires correctly.
const UiTappableStub = defineComponent({
  name: 'UiTappable',
  inheritAttrs: false,
  emits: ['tap'],
  setup(_props, { slots, emit, attrs }) {
    return () =>
      h('button', { type: 'button', ...attrs, onClick: () => emit('tap') }, slots.default?.())
  }
})

const TABS = [
  { value: 'cover', label: 'Cover' },
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' }
]

function makeTabBar(props = {}) {
  return mount(TabBar, {
    props: { tabs: TABS, active: 'cover', ...props },
    global: { stubs: { UiTappable: UiTappableStub }, directives: { sfx: {} } }
  })
}

describe('TabBar', () => {
  test('renders the container', () => {
    const wrapper = makeTabBar()
    expect(wrapper.find('[data-testid="tab-bar"]').exists()).toBe(true)
  })

  test('renders one button per tab', () => {
    const wrapper = makeTabBar()
    expect(wrapper.findAll('[data-testid="tab-bar__tab"]')).toHaveLength(3)
  })

  test('renders each tab label', () => {
    const wrapper = makeTabBar()
    const tabs = wrapper.findAll('[data-testid="tab-bar__tab"]')
    expect(tabs[0].text()).toBe('Cover')
    expect(tabs[1].text()).toBe('Front')
    expect(tabs[2].text()).toBe('Back')
  })

  test('marks the active tab via data-active', () => {
    const wrapper = makeTabBar({ active: 'front' })
    const tabs = wrapper.findAll('[data-testid="tab-bar__tab"]')
    expect(tabs[0].attributes('data-active')).toBe('false')
    expect(tabs[1].attributes('data-active')).toBe('true')
    expect(tabs[2].attributes('data-active')).toBe('false')
  })

  test('emits update:active with tab value when clicked', async () => {
    const wrapper = makeTabBar({ active: 'cover' })
    const tabs = wrapper.findAll('[data-testid="tab-bar__tab"]')
    await tabs[2].trigger('click')
    expect(wrapper.emitted('update:active')).toEqual([['back']])
  })

  test('emits update:active even when clicking the already-active tab', async () => {
    const wrapper = makeTabBar({ active: 'cover' })
    const tabs = wrapper.findAll('[data-testid="tab-bar__tab"]')
    await tabs[0].trigger('click')
    expect(wrapper.emitted('update:active')).toEqual([['cover']])
  })

  test('supports numeric tab values', async () => {
    const numericTabs = [
      { value: 1, label: 'One' },
      { value: 2, label: 'Two' }
    ]
    const wrapper = mount(TabBar, {
      props: { tabs: numericTabs, active: 2 },
      global: { stubs: { UiTappable: UiTappableStub }, directives: { sfx: {} } }
    })
    const tabs = wrapper.findAll('[data-testid="tab-bar__tab"]')
    expect(tabs[1].attributes('data-active')).toBe('true')
    await tabs[0].trigger('click')
    expect(wrapper.emitted('update:active')).toEqual([[1]])
  })

  // hover_sfx prop was removed; the component now hardcodes TYPE_SFX internally.
  // Passing it as a prop should not cause an error and should not affect rendering.
  test('does not accept hover_sfx prop — hardcodes TYPE_SFX for all tab hover sounds', () => {
    // No hover_sfx in TabBarProps; verify mounting without it still works
    // and that the tabs are rendered (the sfx is handled via the mocked TYPE_SFX=[])
    const wrapper = makeTabBar()
    expect(wrapper.findAll('[data-testid="tab-bar__tab"]')).toHaveLength(3)
    // $props must not contain hover_sfx
    expect(Object.keys(wrapper.props())).not.toContain('hover_sfx')
  })
})
