import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, computed, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => ({ value: false }) }))
vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: vi.fn(), success: vi.fn(), warn: vi.fn() })
}))

import TabIndex from '@/views/deck/deck-settings/tab-index/index.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckDangerActionsKey } from '@/composables/deck/danger-actions'
import { deckSettingsLayoutKey } from '@/views/deck/deck-settings/layout'

const ButtonStub = defineComponent({
  name: 'UiButton',
  props: { loading: { type: Boolean, default: false } },
  emits: ['press'],
  inheritAttrs: false,
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          type: 'button',
          ...attrs,
          'data-loading': String(!!props.loading),
          disabled: props.loading,
          onClick: (e) => emit('press', e)
        },
        slots.default?.()
      )
  }
})

const IconStub = defineComponent({
  name: 'UiIcon',
  props: { src: { type: String, required: true } },
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

function makeTab(layout = 'desktop') {
  const onDelete = vi.fn()
  const onResetReviews = vi.fn()
  const danger = {
    onDelete,
    onResetReviews,
    deleting: ref(false),
    resetting_reviews: ref(false)
  }
  const editor = {
    settings: reactive({ title: 'My Deck', description: '' }),
    is_dirty: ref(false)
  }
  const wrapper = mount(TabIndex, {
    global: {
      provide: {
        [deckDangerActionsKey]: danger,
        [deckEditorKey]: editor,
        [deckSettingsLayoutKey]: computed(() => layout)
      },
      stubs: { UiButton: ButtonStub, UiIcon: IconStub },
      mocks: { $t: (k) => k },
      directives: { sfx: {} }
    }
  })
  return { wrapper, onDelete, onResetReviews }
}

describe('TabIndex', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  test('renders both nav groups with two nav cards on desktop (design + review-pacing), labeled from deck.settings-modal.tab.*', () => {
    const { wrapper } = makeTab('desktop')
    expect(wrapper.find('[data-testid="tab-index"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-index__nav-group--appearance"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-index__nav-group--review-pacing"]').exists()).toBe(true)

    const cards = wrapper.findAll('[data-testid="options-panel__card"]')
    expect(cards).toHaveLength(2)
    expect(cards.map((c) => c.attributes('data-value'))).toEqual(['design', 'review-pacing'])
    expect(cards[0].text()).toContain('Appearance')
    expect(cards[1].text()).toContain('Study Settings')
  })

  test('review-pacing nav entry renders the card-deck icon (matches member-settings review-pacing icon) [obligation]', () => {
    const { wrapper } = makeTab('desktop')
    const pacingCard = wrapper.find(
      '[data-testid="options-panel__card"][data-value="review-pacing"]'
    )
    expect(pacingCard.find('[data-testid="ui-icon"]').attributes('data-src')).toBe('card-deck')
  })

  test('appearance group lists only "design" in tablet mode', () => {
    const { wrapper } = makeTab('tablet')
    const appearanceCards = wrapper
      .find('[data-testid="tab-index__nav-group--appearance"]')
      .findAll('[data-testid="options-panel__card"]')
    expect(appearanceCards).toHaveLength(1)
    expect(appearanceCards[0].attributes('data-value')).toBe('design')
  })

  test('appearance group lists "details" and "design" in sheet mode [obligation]', () => {
    const { wrapper } = makeTab('sheet')
    const appearanceCards = wrapper
      .find('[data-testid="tab-index__nav-group--appearance"]')
      .findAll('[data-testid="options-panel__card"]')
    expect(appearanceCards).toHaveLength(2)
    expect(appearanceCards[0].attributes('data-value')).toBe('details')
    expect(appearanceCards[1].attributes('data-value')).toBe('design')
  })

  test('"details" nav entry absent in tablet/desktop (sheet-only) [obligation]', () => {
    const { wrapper: tabletWrapper } = makeTab('tablet')
    expect(
      tabletWrapper.find('[data-testid="options-panel__card"][data-value="details"]').exists()
    ).toBe(false)
    const { wrapper: desktopWrapper } = makeTab('desktop')
    expect(
      desktopWrapper.find('[data-testid="options-panel__card"][data-value="details"]').exists()
    ).toBe(false)
  })

  test('emits navigate with the clicked entry value', async () => {
    const { wrapper } = makeTab('desktop')
    const designCard = wrapper.find('[data-testid="options-panel__card"][data-value="design"]')
    await designCard.trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['design']])
  })

  test('emits navigate("details") when details card clicked in sheet mode [obligation]', async () => {
    const { wrapper } = makeTab('sheet')
    await wrapper.find('[data-testid="options-panel__card"][data-value="details"]').trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['details']])
  })

  test('renders inlined danger reset + delete buttons', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-index__danger-zone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="danger-reset-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="danger-delete-button"]').exists()).toBe(true)
  })

  test('forwards delete click to injected danger.onDelete', async () => {
    const { wrapper, onDelete } = makeTab()
    await wrapper.find('[data-testid="danger-delete-button"]').trigger('click')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  test('forwards reset click to injected danger.onResetReviews', async () => {
    const { wrapper, onResetReviews } = makeTab()
    await wrapper.find('[data-testid="danger-reset-button"]').trigger('click')
    expect(onResetReviews).toHaveBeenCalledTimes(1)
  })
})
