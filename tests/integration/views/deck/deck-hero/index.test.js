import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const ChildStub = (name) =>
  defineComponent({
    name,
    inheritAttrs: false,
    setup() {
      return () => h('div', { 'data-testid': `${name.toLowerCase()}-stub` })
    }
  })

import DeckHero from '@/views/deck/deck-hero/index.vue'
import { cardEditorKey } from '@/views/deck/composables/list-controller'

function makeEditor({ is_selecting = false } = {}) {
  return { selection: { is_selecting: ref(is_selecting) } }
}

function mount({ editor, hideActions } = {}) {
  const props = { deck: { id: 1, title: 'd', card_count: 10 } }
  if (hideActions !== undefined) props.hideActions = hideActions
  return shallowMount(DeckHero, {
    props,
    global: {
      provide: editor === undefined ? {} : { [cardEditorKey]: editor },
      stubs: {
        Thumbnail: ChildStub('Thumbnail'),
        DeckDetails: ChildStub('DeckDetails'),
        Actions: ChildStub('Actions'),
        BulkActions: ChildStub('BulkActions')
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

  // ── hideActions prop [obligation] ──────────────────────────────────────────

  test('hides deck-hero__actions-wrap when hideActions=true [obligation]', () => {
    const wrapper = mount({ hideActions: true })
    expect(wrapper.find('[data-testid="deck-hero__actions-wrap"]').exists()).toBe(false)
  })

  test('shows deck-hero__actions-wrap when hideActions=false (explicit) [obligation]', () => {
    const wrapper = mount({ editor: makeEditor(), hideActions: false })
    expect(wrapper.find('[data-testid="deck-hero__actions-wrap"]').exists()).toBe(true)
  })

  test('shows deck-hero__actions-wrap when hideActions is omitted (default false) [obligation]', () => {
    const wrapper = mount({ editor: makeEditor() })
    expect(wrapper.find('[data-testid="deck-hero__actions-wrap"]').exists()).toBe(true)
  })

  test('hides both actions and bulk-actions when hideActions=true [obligation]', () => {
    const wrapper = mount({ editor: makeEditor({ is_selecting: true }), hideActions: true })
    expect(wrapper.find('[data-testid="deck-hero__actions-wrap"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(false)
  })
})
