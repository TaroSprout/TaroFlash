import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

vi.mock('@/utils/animations/deck-view/card-overlay', () => ({
  fadeScaleEnter: vi.fn((_el, done) => done?.()),
  fadeScaleLeave: vi.fn((_el, done) => done?.()),
  primeOverlayBelow: vi.fn(),
  slideOverlayUp: vi.fn((_el, done) => done?.()),
  settleOverlay: vi.fn(),
  slideOverlayDown: vi.fn((_el, done) => done?.())
}))

async function stubModule(name, testid) {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({ name, setup: () => () => h('div', { 'data-testid': testid }) })
  }
}

vi.mock('@/views/deck/card-grid/scroll-grid.vue', () => stubModule('CardGrid', 'card-grid-stub'))
vi.mock('@/views/deck/card-editor/index.vue', () => stubModule('CardEditor', 'card-editor-stub'))
vi.mock('@/views/deck/card-importer.vue', () => stubModule('CardImporter', 'card-importer-stub'))

import ModeStack from '@/views/deck/mode-stack.vue'

function makeEditor(mode = 'view') {
  return { mode: ref(mode) }
}

function mount(editor = makeEditor()) {
  return shallowMount(ModeStack, {
    global: {
      provide: { 'card-editor': editor },
      // use the real <Transition> so v-show actually toggles display; the
      // card-overlay hooks are mocked to complete synchronously
      stubs: { transition: false }
    }
  })
}

describe('ModeStack', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders the mode-stack root as a positioned container', () => {
    const wrapper = mount()
    expect(wrapper.attributes('data-testid')).toBe('deck-view__mode-stack')
    expect(wrapper.classes()).toContain('relative')
  })

  // The grid is kept mounted (v-show) so it never pays a re-mount cost; only
  // the overlay panes (editor / importer) mount per mode. v-show drives its
  // visibility, so assert on the display style rather than presence.
  const gridDisplay = (wrapper) => wrapper.findComponent({ name: 'CardGrid' }).element.style.display

  test('shows the card-grid in view mode, with no overlay mounted', () => {
    const wrapper = mount(makeEditor('view'))
    expect(gridDisplay(wrapper)).not.toBe('none')
    expect(wrapper.findComponent({ name: 'CardEditor' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'CardImporter' }).exists()).toBe(false)
  })

  test('mounts the card-editor and hides (not unmounts) the grid in edit mode', () => {
    const wrapper = mount(makeEditor('edit'))
    expect(wrapper.findComponent({ name: 'CardEditor' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CardGrid' }).exists()).toBe(true)
    expect(gridDisplay(wrapper)).toBe('none')
    expect(wrapper.findComponent({ name: 'CardImporter' }).exists()).toBe(false)
  })

  test('mounts the card-importer and hides the grid in import-export mode', () => {
    const wrapper = mount(makeEditor('import-export'))
    expect(wrapper.findComponent({ name: 'CardImporter' }).exists()).toBe(true)
    expect(gridDisplay(wrapper)).toBe('none')
    expect(wrapper.findComponent({ name: 'CardEditor' }).exists()).toBe(false)
  })

  test('swaps grid for editor when mode flips view → edit (grid stays mounted)', async () => {
    const editor = makeEditor('view')
    const wrapper = mount(editor)
    expect(gridDisplay(wrapper)).not.toBe('none')

    editor.mode.value = 'edit'
    await nextTick()
    await nextTick()

    expect(wrapper.findComponent({ name: 'CardGrid' }).exists()).toBe(true)
    expect(gridDisplay(wrapper)).toBe('none')
    expect(wrapper.findComponent({ name: 'CardEditor' }).exists()).toBe(true)
  })

  test('forwards w-full to the active pane', () => {
    const wrapper = mount(makeEditor('edit'))
    expect(wrapper.findComponent({ name: 'CardEditor' }).classes()).toContain('w-full')
  })
})
