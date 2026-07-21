import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))

import OptionsPanel from '@/components/ui-kit/options-panel/index.vue'

const IconStub = defineComponent({
  name: 'UiIcon',
  props: { src: { type: String, required: true } },
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

const ENTRIES = [
  { value: 'profile', icon: 'user-sticker-square', label: 'Profile' },
  { value: 'subscription', icon: 'piggy-bank', label: 'Subscription' }
]

function makePanel(props = {}, options = {}) {
  return mount(OptionsPanel, {
    props: { entries: ENTRIES, ...props },
    global: { stubs: { UiIcon: IconStub }, directives: { sfx: {} } },
    ...options
  })
}

describe('OptionsPanel', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  // ── Default rendering (no leading/trailing slots supplied) ─────────────────

  test('renders one row per entry with the default icon and a trailing chevron when no slots are provided [obligation]', () => {
    const wrapper = makePanel()
    const cards = wrapper.findAll('[data-testid="options-panel__card"]')
    expect(cards).toHaveLength(2)

    cards.forEach((card, i) => {
      expect(card.attributes('data-value')).toBe(ENTRIES[i].value)
      expect(card.text()).toContain(ENTRIES[i].label)

      const icons = card.findAll('[data-testid="ui-icon"]')
      expect(icons[0].attributes('data-src')).toBe(ENTRIES[i].icon)
      expect(icons[1].attributes('data-src')).toBe('line-arrow-right')
    })
  })

  // ── select emission ──────────────────────────────────────────────────────

  test('emits select with the tapped entry value, not the whole entry object', async () => {
    const wrapper = makePanel()
    await wrapper
      .find('[data-testid="options-panel__card"][data-value="subscription"]')
      .trigger('click')
    expect(wrapper.emitted('select')).toEqual([['subscription']])
  })

  // ── disabled entries ─────────────────────────────────────────────────────

  test('a disabled entry does not emit select when tapped [obligation]', async () => {
    const wrapper = makePanel({
      entries: [...ENTRIES, { value: 'locked', label: 'Locked', disabled: true }]
    })
    await wrapper.find('[data-testid="options-panel__card"][data-value="locked"]').trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  // ── interactive: false ───────────────────────────────────────────────────

  test('interactive=false renders plain rows with no UiTappable [obligation]', () => {
    const wrapper = makePanel({ interactive: false })
    expect(wrapper.findComponent({ name: 'UiTappable' }).exists()).toBe(false)
  })

  test('interactive=false never emits select even when a row is clicked [obligation]', async () => {
    const wrapper = makePanel({ interactive: false })
    await wrapper.find('[data-testid="options-panel__card"][data-value="profile"]').trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  // ── scrollable ────────────────────────────────────────────────────────────

  test('content div clips overflow by default (scrollable unset) [obligation]', () => {
    const wrapper = makePanel()
    const content = wrapper.find('[data-testid="options-panel__content"]')
    expect(content.classes()).toContain('overflow-hidden')
    expect(content.classes()).not.toContain('overflow-y-auto')
  })

  test('scrollable=true scrolls internally instead of clipping [obligation]', () => {
    const wrapper = makePanel({ scrollable: true })
    const content = wrapper.find('[data-testid="options-panel__content"]')
    expect(content.classes()).toContain('overflow-y-auto')
    expect(content.classes()).not.toContain('overflow-hidden')
  })

  // ── overlay slot ──────────────────────────────────────────────────────────

  test('does not render the overlay wrapper when no overlay slot is provided', () => {
    const wrapper = makePanel()
    expect(wrapper.find('[data-testid="options-panel__overlay"]').exists()).toBe(false)
  })

  test('renders the overlay slot content absolutely positioned over the panel [obligation]', () => {
    const wrapper = makePanel(
      {},
      { slots: { overlay: () => h('div', { 'data-testid': 'overlay-content' }, 'overlay') } }
    )
    const overlay = wrapper.find('[data-testid="options-panel__overlay"]')
    expect(overlay.exists()).toBe(true)
    expect(overlay.classes()).toContain('absolute')
    expect(overlay.find('[data-testid="overlay-content"]').exists()).toBe(true)
  })

  // ── caller-supplied leading/trailing slots ───────────────────────────────

  test('renders caller-supplied leading/trailing slot content instead of the defaults', () => {
    const wrapper = makePanel(
      {},
      {
        slots: {
          leading: ({ entry }) => h('span', { 'data-testid': 'custom-leading' }, entry.value),
          trailing: ({ entry }) => h('span', { 'data-testid': 'custom-trailing' }, entry.value)
        }
      }
    )
    const cards = wrapper.findAll('[data-testid="options-panel__card"]')
    cards.forEach((card, i) => {
      expect(card.find('[data-testid="custom-leading"]').text()).toBe(ENTRIES[i].value)
      expect(card.find('[data-testid="custom-trailing"]').text()).toBe(ENTRIES[i].value)
      expect(card.find('[data-testid="ui-icon"]').exists()).toBe(false)
    })
  })

  // ── selected state [obligation] ──────────────────────────────────────────

  test('a selected entry gets data-active=true and data-palette from selectedPalette', () => {
    const wrapper = makePanel({
      entries: [
        ...ENTRIES,
        { value: 'edit-decks', label: 'Edit Decks', selected: true, selectedPalette: 'yellow' }
      ]
    })
    const card = wrapper.find('[data-testid="options-panel__card"][data-value="edit-decks"]')
    expect(card.attributes('data-active')).toBe('true')
    expect(card.attributes('data-palette')).toBe('yellow')
  })

  test('an unselected entry has no data-active attribute', () => {
    const wrapper = makePanel({
      entries: [...ENTRIES, { value: 'edit-decks', label: 'Edit Decks', selected: false }]
    })
    const card = wrapper.find('[data-testid="options-panel__card"][data-value="edit-decks"]')
    expect(card.attributes('data-active')).toBeUndefined()
  })

  test('falls back to no explicit data-palette when selected but selectedPalette is omitted', () => {
    const wrapper = makePanel({
      entries: [...ENTRIES, { value: 'edit-decks', label: 'Edit Decks', selected: true }]
    })
    const card = wrapper.find('[data-testid="options-panel__card"][data-value="edit-decks"]')
    expect(card.attributes('data-palette')).toBeUndefined()
  })

  test('a danger entry always carries data-palette="danger", regardless of selection', () => {
    const wrapper = makePanel({
      entries: [...ENTRIES, { value: 'delete', label: 'Delete', danger: true }]
    })
    const card = wrapper.find('[data-testid="options-panel__card"][data-value="delete"]')
    expect(card.attributes('data-palette')).toBe('danger')
  })

  // ── content testid derivation ────────────────────────────────────────────

  test('content div falls back to options-panel__content when caller passes no data-testid', () => {
    const wrapper = makePanel()
    expect(wrapper.find('[data-testid="options-panel__content"]').exists()).toBe(true)
  })

  test('content div is derived as `${data-testid}__content` when caller passes a data-testid', () => {
    const wrapper = mount(OptionsPanel, {
      props: { entries: ENTRIES },
      attrs: { 'data-testid': 'move-cards__deck-list' },
      global: { stubs: { UiIcon: IconStub }, directives: { sfx: {} } }
    })
    expect(wrapper.find('[data-testid="move-cards__deck-list__content"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="options-panel__content"]').exists()).toBe(false)
  })
})
