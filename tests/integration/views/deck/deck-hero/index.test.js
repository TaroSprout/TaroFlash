import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const { mockUseMatchMedia } = vi.hoisted(() => ({
  mockUseMatchMedia: vi.fn()
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: mockUseMatchMedia
}))

const ChildStub = (name) =>
  defineComponent({
    name,
    props: ['isSelecting'],
    inheritAttrs: false,
    setup(_p, { attrs }) {
      return () => h('div', { ...attrs, 'data-testid': `${name.toLowerCase()}-stub` })
    }
  })

import DeckHero from '@/views/deck/deck-hero/index.vue'
import { cardEditorKey } from '@/views/deck/composables/list-controller'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'

function makeEditor({ is_selecting = false } = {}) {
  return { selection: { is_selecting: ref(is_selecting) } }
}

function makeShell(mode = 'view') {
  return { mode: ref(mode) }
}

function mount({ editor, shell, hideActions, is_desktop = true } = {}) {
  mockUseMatchMedia.mockReturnValue(ref(is_desktop))
  const props = { deck: { id: 1, title: 'd', card_count: 10 } }
  if (hideActions !== undefined) props.hideActions = hideActions
  const provide = {}
  if (editor !== undefined) provide[cardEditorKey] = editor
  if (shell !== undefined) provide[deckViewShellKey] = shell
  return shallowMount(DeckHero, {
    props,
    global: {
      provide,
      stubs: {
        Thumbnail: ChildStub('Thumbnail'),
        DeckDetails: ChildStub('DeckDetails'),
        Actions: ChildStub('Actions'),
        BulkActions: ChildStub('BulkActions'),
        ImportPanel: ChildStub('ImportPanel'),
        ModeImport: ChildStub('ModeImport')
      }
    }
  })
}

describe('deck-hero/index', () => {
  test('renders the deck-hero root', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="deck-hero"]').exists()).toBe(true)
  })

  test('always renders thumbnail + details', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="thumbnail-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deckdetails-stub"]').exists()).toBe(true)
  })

  test('details and actions-wrap are grouped inside deck-hero__details-wrap', () => {
    const wrapper = mount({ editor: makeEditor() })
    const detailsWrap = wrapper.find('[data-testid="deck-hero__details-wrap"]')
    expect(detailsWrap.exists()).toBe(true)
    expect(detailsWrap.find('[data-testid="deckdetails-stub"]').exists()).toBe(true)
    expect(detailsWrap.find('[data-testid="deck-hero__actions-wrap"]').exists()).toBe(true)
  })

  test('renders default actions and hides bulk-actions when not selecting', () => {
    const wrapper = mount({ editor: makeEditor({ is_selecting: false }) })
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(false)
  })

  test('renders bulk-actions and hides default actions when selecting', () => {
    const wrapper = mount({ editor: makeEditor({ is_selecting: true }) })
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(false)
  })

  test('shows default actions when no editor is provided (no selection state)', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(false)
  })

  // ── bulk-actions overlay gated to true desktop ─────────────────

  test('keeps default actions mounted (not swapped) below xl while selecting', () => {
    const wrapper = mount({ editor: makeEditor({ is_selecting: true }), is_desktop: false })
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(false)
  })

  test('passes isSelecting through to actions below xl while selecting', () => {
    const wrapper = mount({ editor: makeEditor({ is_selecting: true }), is_desktop: false })
    const actions = wrapper.findComponent({ name: 'Actions' })
    expect(actions.props('isSelecting')).toBe(true)
  })

  test('mounts bulk-actions overlay only at true desktop while selecting', () => {
    const wrapper = mount({ editor: makeEditor({ is_selecting: true }), is_desktop: true })
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(false)
  })

  // ── hideActions prop ──────────────────────────────────────────

  test('hides deck-hero__actions-wrap when hideActions=true', () => {
    const wrapper = mount({ hideActions: true })
    expect(wrapper.find('[data-testid="deck-hero__actions-wrap"]').exists()).toBe(false)
  })

  test('shows deck-hero__actions-wrap when hideActions=false (explicit)', () => {
    const wrapper = mount({ editor: makeEditor(), hideActions: false })
    expect(wrapper.find('[data-testid="deck-hero__actions-wrap"]').exists()).toBe(true)
  })

  test('shows deck-hero__actions-wrap when hideActions is omitted (default false)', () => {
    const wrapper = mount({ editor: makeEditor() })
    expect(wrapper.find('[data-testid="deck-hero__actions-wrap"]').exists()).toBe(true)
  })

  test('hides both actions and bulk-actions when hideActions=true', () => {
    const wrapper = mount({ editor: makeEditor({ is_selecting: true }), hideActions: true })
    expect(wrapper.find('[data-testid="deck-hero__actions-wrap"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(false)
  })

  // ── panel selection: exactly one of actions / bulk-actions / import-panel ──

  test('renders the import panel and hides actions when shell.mode is import', () => {
    const wrapper = mount({ shell: makeShell('import') })
    expect(wrapper.find('[data-testid="importpanel-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(false)
  })

  test('import mode wins over bulk-select: import panel shown, bulk-actions hidden', () => {
    const wrapper = mount({
      editor: makeEditor({ is_selecting: true }),
      shell: makeShell('import'),
      is_desktop: true
    })
    expect(wrapper.find('[data-testid="importpanel-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(false)
  })

  test('falls back to default actions when shell.mode is view (no import panel)', () => {
    const wrapper = mount({ shell: makeShell('view') })
    expect(wrapper.find('[data-testid="importpanel-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(true)
  })

  test('the import panel is hidden below md', () => {
    const wrapper = mount({ shell: makeShell('import') })
    expect(wrapper.find('[data-testid="importpanel-stub"]').classes()).toContain('max-md:hidden')
  })

  test('renders the import toolbar (mode-import) above the actions panel, hidden below md', () => {
    const wrapper = mount({ shell: makeShell('import') })
    expect(wrapper.find('[data-testid="modeimport-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="modeimport-stub"]').classes()).toContain('max-md:hidden')
  })

  test('does not render the import toolbar when shell.mode is view', () => {
    const wrapper = mount({ shell: makeShell('view') })
    expect(wrapper.find('[data-testid="modeimport-stub"]').exists()).toBe(false)
  })
})
