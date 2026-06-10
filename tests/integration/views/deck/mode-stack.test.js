import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

vi.mock('@/utils/animations/deck-view/card-overlay', () => ({
  captureModeSwitch: vi.fn(() => ({ from_y: 0, settle_y: 0, stack_top: 0 })),
  distanceToViewportBottom: vi.fn(() => 0),
  fadeScaleEnter: vi.fn((_el, done) => done?.()),
  fadeScaleLeave: vi.fn((_el, _vp, done) => done?.()),
  primeOverlayBelow: vi.fn(),
  slideOverlayUp: vi.fn((_el, done) => done?.()),
  settleOverlay: vi.fn(),
  slideOverlayDown: vi.fn((_el, _vp, done) => done?.())
}))

// Panes in DECK_MODES use defineAsyncComponent; mock the whole registry with
// synchronous stubs so shallowMount can find them by name immediately.
vi.mock('@/views/deck/modes.ts', async () => {
  const { defineComponent, h } = await import('vue')
  const makePane = (name, testid) =>
    defineComponent({ name, setup: () => () => h('div', { 'data-testid': testid }) })
  const CardGrid = makePane('CardGrid', 'card-grid-stub')
  const CardEditor = makePane('CardEditor', 'card-editor-stub')
  const CardImporter = makePane('CardImporter', 'card-importer-stub')
  return {
    DECK_MODES: {
      view: { pane: CardGrid, pagination: true },
      edit: { pane: CardEditor, pagination: false },
      'import-export': { pane: CardImporter, pagination: false }
    },
    preloadDeckModes: () => {},
    useModeConfig: () => {}
  }
})

import ModeStack from '@/views/deck/mode-stack.vue'
import { deckViewShellKey } from '@/composables/card-editor/deck-view-shell'

function makeShell(mode = 'view') {
  const mode_ref = ref(mode)
  const is_view = ref(mode === 'view')
  return { mode: mode_ref, is_view }
}

function mount(shell = makeShell()) {
  return shallowMount(ModeStack, {
    global: {
      provide: { [deckViewShellKey]: shell },
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
    const wrapper = mount(makeShell('view'))
    expect(gridDisplay(wrapper)).not.toBe('none')
    expect(wrapper.findComponent({ name: 'CardEditor' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'CardImporter' }).exists()).toBe(false)
  })

  test('mounts the card-editor and hides (not unmounts) the grid in edit mode', () => {
    const wrapper = mount(makeShell('edit'))
    expect(wrapper.findComponent({ name: 'CardEditor' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CardGrid' }).exists()).toBe(true)
    expect(gridDisplay(wrapper)).toBe('none')
    expect(wrapper.findComponent({ name: 'CardImporter' }).exists()).toBe(false)
  })

  test('mounts the card-importer and hides the grid in import-export mode', () => {
    const wrapper = mount(makeShell('import-export'))
    expect(wrapper.findComponent({ name: 'CardImporter' }).exists()).toBe(true)
    expect(gridDisplay(wrapper)).toBe('none')
    expect(wrapper.findComponent({ name: 'CardEditor' }).exists()).toBe(false)
  })

  test('swaps grid for editor when mode flips view → edit (grid stays mounted)', async () => {
    const shell = makeShell('view')
    const wrapper = mount(shell)
    expect(gridDisplay(wrapper)).not.toBe('none')

    shell.mode.value = 'edit'
    shell.is_view.value = false
    await nextTick()
    await nextTick()

    expect(wrapper.findComponent({ name: 'CardGrid' }).exists()).toBe(true)
    expect(gridDisplay(wrapper)).toBe('none')
    expect(wrapper.findComponent({ name: 'CardEditor' }).exists()).toBe(true)
  })

  test('forwards w-full to the active pane', () => {
    const wrapper = mount(makeShell('edit'))
    expect(wrapper.findComponent({ name: 'CardEditor' }).classes()).toContain('w-full')
  })
})
