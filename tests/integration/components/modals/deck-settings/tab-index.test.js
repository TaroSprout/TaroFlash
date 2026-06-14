import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, computed, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => ({ value: false }) }))

import TabIndex from '@/components/modals/deck-settings/tab-index/index.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckDangerActionsKey } from '@/composables/deck/danger-actions'
import { deckSettingsLayoutKey } from '@/components/modals/deck-settings/layout'

const ButtonStub = defineComponent({
  name: 'UiButton',
  props: { loading: { type: Boolean, default: false } },
  emits: ['click'],
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
          onClick: (e) => emit('click', e)
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

// Renders slot content + forwards attrs; emits tap on click so nav card
// @tap="onNavigate(entry.value)" fires correctly.
const UiTappableStub = defineComponent({
  name: 'UiTappable',
  inheritAttrs: false,
  emits: ['tap'],
  setup(_props, { slots, emit, attrs }) {
    return () =>
      h('button', { type: 'button', ...attrs, onClick: () => emit('tap') }, slots.default?.())
  }
})

function makeTab() {
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
        [deckSettingsLayoutKey]: computed(() => 'desktop')
      },
      stubs: { UiButton: ButtonStub, UiIcon: IconStub, UiTappable: UiTappableStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, onDelete, onResetReviews }
}

describe('TabIndex', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  test('renders both nav groups with all three nav cards', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-index"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-index__nav-group--appearance"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-index__nav-group--study"]').exists()).toBe(true)

    const cards = wrapper.findAll('[data-testid="tab-index__nav-card"]')
    expect(cards).toHaveLength(2)
    expect(cards.map((c) => c.attributes('data-value'))).toEqual(['design', 'study'])
  })

  test('emits navigate with the clicked entry value', async () => {
    const { wrapper } = makeTab()
    const designCard = wrapper.find('[data-testid="tab-index__nav-card"][data-value="design"]')
    await designCard.trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['design']])
  })

  test('plays snappy_button_5 sfx as a blocking sound on nav click', async () => {
    const { wrapper } = makeTab()
    await wrapper.find('[data-testid="tab-index__nav-card"][data-value="design"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.snappy_button_5', { blocking: true })
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
