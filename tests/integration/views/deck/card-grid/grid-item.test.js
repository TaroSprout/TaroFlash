import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))

const CardStub = defineComponent({
  name: 'Card',
  inheritAttrs: false,
  props: ['side', 'size'],
  setup(props, { slots }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          'data-testid': 'card-stub',
          'data-side': props.side,
          'data-size': props.size,
          'data-card-class': attrs.class,
          'data-card-scale': attrs.style?.['--card-scale'],
          onClick: attrs.onClick
        },
        slots.default?.()
      )
  }
})

const UiRadioStub = defineComponent({
  name: 'UiRadio',
  props: ['checked'],
  setup(props) {
    return () =>
      h('button', {
        'data-testid': 'ui-radio-stub',
        'data-checked': String(props.checked)
      })
  }
})

const GridItemMenuStub = defineComponent({
  name: 'GridItemMenu',
  setup() {
    return () => h('div', { 'data-testid': 'grid-item-menu-stub' })
  }
})

import GridItem from '@/views/deck/card-grid/grid-item.vue'
import { cardEditorKey } from '@/composables/card-editor/card-list-controller'

function makeEditor({ is_selecting = false } = {}) {
  return {
    actions: {
      onSelectCard: vi.fn(),
      onMoveCards: vi.fn(),
      onDeleteCards: vi.fn()
    },
    selection: {
      is_selecting: ref(is_selecting)
    }
  }
}

function mountGridItem({ props = {}, editor } = {}) {
  const ed = editor ?? makeEditor()
  return {
    wrapper: mount(GridItem, {
      props: {
        card: { id: 1, front_text: 'q', back_text: 'a' },
        side: 'front',
        selected: false,
        ...props
      },
      attachTo: document.body,
      global: {
        provide: { [cardEditorKey]: ed },
        stubs: { Card: CardStub, UiRadio: UiRadioStub, GridItemMenu: GridItemMenuStub }
      }
    }),
    editor: ed
  }
}

describe('GridItem (card-grid/grid-item.vue)', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  test('renders root with data-testid="grid-item"', () => {
    const { wrapper } = mountGridItem()
    expect(wrapper.find('[data-testid="grid-item"]').exists()).toBe(true)
  })

  test('initial side comes from the side prop', () => {
    const { wrapper } = mountGridItem({ props: { side: 'back' } })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('back')
  })

  test('clicking the card flips front → back and emits transition_up sfx when not selecting', async () => {
    const { wrapper } = mountGridItem({ props: { side: 'front' } })
    await wrapper.find('[data-testid="card-stub"]').trigger('click')

    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('back')
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.transition_up')
  })

  test('clicking again flips back → front and emits transition_down sfx', async () => {
    const { wrapper } = mountGridItem({ props: { side: 'front' } })
    const card = wrapper.find('[data-testid="card-stub"]')

    await card.trigger('click')
    mockEmitSfx.mockClear()

    await card.trigger('click')
    expect(card.attributes('data-side')).toBe('front')
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.transition_down')
  })

  test('clicking the card during selection calls onSelectCard with the card id and does not flip', async () => {
    const editor = makeEditor({ is_selecting: true })
    const { wrapper } = mountGridItem({ props: { side: 'front' }, editor })
    await wrapper.find('[data-testid="card-stub"]').trigger('click')

    expect(editor.actions.onSelectCard).toHaveBeenCalledWith(1)
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('front')
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('renders the radio while selecting, with the selected prop forwarded', () => {
    const editor = makeEditor({ is_selecting: true })
    const { wrapper } = mountGridItem({ props: { selected: true }, editor })
    const radio = wrapper.find('[data-testid="ui-radio-stub"]')
    expect(radio.exists()).toBe(true)
    expect(radio.attributes('data-checked')).toBe('true')
  })

  test('omits the radio when not selecting', () => {
    const { wrapper } = mountGridItem()
    expect(wrapper.find('[data-testid="ui-radio-stub"]').exists()).toBe(false)
  })

  test('renders the grid-item-menu when not selecting', () => {
    const { wrapper } = mountGridItem()
    expect(wrapper.find('[data-testid="grid-item-menu-stub"]').exists()).toBe(true)
  })

  test('hides the grid-item-menu while selecting', () => {
    const editor = makeEditor({ is_selecting: true })
    const { wrapper } = mountGridItem({ editor })
    expect(wrapper.find('[data-testid="grid-item-menu-stub"]').exists()).toBe(false)
  })

  test('grid-item-menu select emit calls onSelectCard with the card id', async () => {
    const editor = makeEditor({ is_selecting: false })
    const { wrapper } = mountGridItem({ editor })
    await wrapper.findComponent(GridItemMenuStub).vm.$emit('select')
    expect(editor.actions.onSelectCard).toHaveBeenCalledWith(1)
  })

  test('grid-item-menu move emit calls onMoveCards with the card id', async () => {
    const editor = makeEditor({ is_selecting: false })
    const { wrapper } = mountGridItem({ editor })
    await wrapper.findComponent(GridItemMenuStub).vm.$emit('move')
    expect(editor.actions.onMoveCards).toHaveBeenCalledWith(1)
  })

  test('grid-item-menu delete emit calls onDeleteCards with the card id', async () => {
    const editor = makeEditor({ is_selecting: false })
    const { wrapper } = mountGridItem({ editor })
    await wrapper.findComponent(GridItemMenuStub).vm.$emit('delete')
    expect(editor.actions.onDeleteCards).toHaveBeenCalledWith(1)
  })

  // ── fill / scale props ──────────────────────────────────────────────────────

  test('renders Card at size="xl" regardless of fill [obligation]', () => {
    const filled = mountGridItem({ props: { fill: true } })
    const scaled = mountGridItem({ props: { fill: false } })
    expect(filled.wrapper.find('[data-testid="card-stub"]').attributes('data-size')).toBe('xl')
    expect(scaled.wrapper.find('[data-testid="card-stub"]').attributes('data-size')).toBe('xl')
  })

  test('fill=false applies the scale prop as --card-scale on Card [obligation]', () => {
    const { wrapper } = mountGridItem({ props: { fill: false, scale: 0.6 } })
    const card = wrapper.find('[data-testid="card-stub"]')
    expect(card.attributes('data-card-class')).toContain('grid-item__card--scaled')
    expect(card.attributes('data-card-scale')).toBe('0.6')
  })

  test('fill=true uses the fill class and no --card-scale [obligation]', () => {
    const { wrapper } = mountGridItem({ props: { fill: true, scale: 0.6 } })
    const card = wrapper.find('[data-testid="card-stub"]')
    expect(card.attributes('data-card-class')).toContain('grid-item__card')
    expect(card.attributes('data-card-class')).not.toContain('grid-item__card--scaled')
    expect(card.attributes('data-card-scale')).toBeUndefined()
  })

  test('fill defaults to true when prop is omitted', () => {
    const { wrapper } = mountGridItem()
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-size')).toBe('xl')
  })
})
