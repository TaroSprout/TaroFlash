import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
const { mockUseMatchMedia } = vi.hoisted(() => ({ mockUseMatchMedia: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: mockUseMatchMedia }))

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
          onClick: attrs.onClick,
          onMousedown: attrs.onMousedown
        },
        slots.default?.()
      )
  }
})

const UiRadioStub = defineComponent({
  name: 'UiRadio',
  props: ['checked', 'active'],
  setup(props) {
    return () =>
      h('button', {
        'data-testid': 'ui-radio-stub',
        'data-checked': String(props.checked),
        'data-active': String(!!props.active)
      })
  }
})

const UiDropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  props: ['options', 'triggerOnly', 'triggerIcon'],
  emits: ['select'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'grid-item-menu-stub' }, [
        h('button', {
          'data-testid': 'grid-item-menu-stub__select',
          onClick: () =>
            emit(
              'select',
              (props.options ?? []).find((o) => o.value === 'select') ?? { value: 'select' }
            )
        }),
        h('button', {
          'data-testid': 'grid-item-menu-stub__move',
          onClick: () =>
            emit(
              'select',
              (props.options ?? []).find((o) => o.value === 'move') ?? { value: 'move' }
            )
        }),
        h('button', {
          'data-testid': 'grid-item-menu-stub__delete',
          onClick: () =>
            emit(
              'select',
              (props.options ?? []).find((o) => o.value === 'delete') ?? { value: 'delete' }
            )
        })
      ])
  }
})

import GridItem from '@/views/deck/card-grid/grid-item.vue'
import { cardEditorKey } from '@/views/deck/composables/list-controller'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'

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

function makeMobileEditor() {
  return { open_at: vi.fn() }
}

function mountGridItem({ props = {}, editor, mobile_editor, is_mobile = false } = {}) {
  const ed = editor ?? makeEditor()
  const is_mobile_ref = ref(is_mobile)
  mockUseMatchMedia.mockReturnValue(is_mobile_ref)
  const provide = { [cardEditorKey]: ed }
  if (mobile_editor !== undefined) provide[mobileCardEditorKey] = mobile_editor
  return {
    wrapper: mount(GridItem, {
      props: {
        card: { id: 1, client_id: 'c1', front_text: 'q', back_text: 'a' },
        side: 'front',
        selected: false,
        ...props
      },
      attachTo: document.body,
      global: {
        provide,
        stubs: { Card: CardStub, UiRadio: UiRadioStub, UiDropdownButton: UiDropdownButtonStub }
      }
    }),
    editor: ed,
    is_mobile_ref
  }
}

describe('GridItem (card-grid/grid-item.vue)', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockUseMatchMedia.mockReturnValue(ref(false))
  })

  test('renders root with data-testid="grid-item"', () => {
    const { wrapper } = mountGridItem()
    expect(wrapper.find('[data-testid="grid-item"]').exists()).toBe(true)
  })

  test('initial side comes from the side prop', () => {
    const { wrapper } = mountGridItem({ props: { side: 'back' } })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('back')
  })

  test('active_side re-syncs when the side prop changes [obligation]', async () => {
    // Regression: active_side was only seeded once via ref(side), so changing
    // the deck default in Page Settings required a full page refresh to show.
    const { wrapper } = mountGridItem({ props: { side: 'front' } })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('front')

    await wrapper.setProps({ side: 'back' })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('back')
  })

  test('active_side re-syncs to the new side prop even after a manual flip [obligation]', async () => {
    const { wrapper } = mountGridItem({ props: { side: 'front' } })
    const card = wrapper.find('[data-testid="card-stub"]')

    // Manually flip back to 'front' so local state (front) matches the OLD
    // prop value — this is what forces the assertion below through the watch
    // rather than a coincidental match from the flip itself.
    await card.trigger('click')
    await card.trigger('click')
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('front')

    // Deck default changes to 'back' — without the watch, active_side (a ref
    // seeded once) would stay 'front' regardless of this prop update.
    await wrapper.setProps({ side: 'back' })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('back')
  })

  test('clicking the card flips front → back and emits transition_up sfx when not selecting', async () => {
    const { wrapper } = mountGridItem({ props: { side: 'front' } })
    await wrapper.find('[data-testid="card-stub"]').trigger('click')

    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('back')
    expect(mockEmitSfx).toHaveBeenCalledWith('transition_up')
  })

  test('clicking again flips back → front and emits transition_down sfx', async () => {
    const { wrapper } = mountGridItem({ props: { side: 'front' } })
    const card = wrapper.find('[data-testid="card-stub"]')

    await card.trigger('click')
    mockEmitSfx.mockClear()

    await card.trigger('click')
    expect(card.attributes('data-side')).toBe('front')
    expect(mockEmitSfx).toHaveBeenCalledWith('transition_down')
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

  test('mirrors hover onto the radio active prop [obligation]', async () => {
    const editor = makeEditor({ is_selecting: true })
    const { wrapper } = mountGridItem({ editor })
    const root = wrapper.find('[data-testid="grid-item"]')

    expect(wrapper.find('[data-testid="ui-radio-stub"]').attributes('data-active')).toBe('false')

    await root.trigger('mouseenter')
    expect(wrapper.find('[data-testid="ui-radio-stub"]').attributes('data-active')).toBe('true')

    await root.trigger('mouseleave')
    expect(wrapper.find('[data-testid="ui-radio-stub"]').attributes('data-active')).toBe('false')
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

  test('onMenuSelect: select option routes to onSelectCard with the card id [obligation]', async () => {
    const editor = makeEditor({ is_selecting: false })
    const { wrapper } = mountGridItem({ editor })
    await wrapper.find('[data-testid="grid-item-menu-stub__select"]').trigger('click')
    expect(editor.actions.onSelectCard).toHaveBeenCalledWith(1)
  })

  test('onMenuSelect: move option routes to onMoveCards with the card id [obligation]', async () => {
    const editor = makeEditor({ is_selecting: false })
    const { wrapper } = mountGridItem({ editor })
    await wrapper.find('[data-testid="grid-item-menu-stub__move"]').trigger('click')
    expect(editor.actions.onMoveCards).toHaveBeenCalledWith(1)
  })

  test('onMenuSelect: delete option routes to onDeleteCards with the card id [obligation]', async () => {
    const editor = makeEditor({ is_selecting: false })
    const { wrapper } = mountGridItem({ editor })
    await wrapper.find('[data-testid="grid-item-menu-stub__delete"]').trigger('click')
    expect(editor.actions.onDeleteCards).toHaveBeenCalledWith(1)
  })

  test('onMenuSelect: unknown value is a no-op [obligation]', async () => {
    const editor = makeEditor({ is_selecting: false })
    const { wrapper } = mountGridItem({ editor })
    // Emit an unknown option value directly on the UiDropdownButton stub
    await wrapper.findComponent(UiDropdownButtonStub).vm.$emit('select', { value: 'unknown' })
    expect(editor.actions.onSelectCard).not.toHaveBeenCalled()
    expect(editor.actions.onMoveCards).not.toHaveBeenCalled()
    expect(editor.actions.onDeleteCards).not.toHaveBeenCalled()
  })

  // ── scale prop ───────────────────────────────────────────────────────────────

  test('renders Card at size="lg" [obligation]', () => {
    const { wrapper } = mountGridItem()
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-size')).toBe('lg')
  })

  test('applies the scale prop as --card-scale on the scaled Card [obligation]', () => {
    const { wrapper } = mountGridItem({ props: { scale: 0.6 } })
    const card = wrapper.find('[data-testid="card-stub"]')
    expect(card.attributes('data-card-class')).toContain('grid-item__card--scaled')
    expect(card.attributes('data-card-scale')).toBe('0.6')
  })

  // ── selection guard (non-collapsed selection) [obligation] ─────────────────

  test('onCardClick does NOT flip when window.getSelection() is non-collapsed [obligation]', async () => {
    // A click that ends a text-drag should not also flip the card.
    const origGetSelection = window.getSelection
    window.getSelection = () => ({ isCollapsed: false })

    const { wrapper } = mountGridItem({ props: { side: 'front' } })
    await wrapper.find('[data-testid="card-stub"]').trigger('click')

    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('front')
    expect(mockEmitSfx).not.toHaveBeenCalled()

    window.getSelection = origGetSelection
  })

  test('onCardClick DOES flip when window.getSelection() is collapsed [obligation]', async () => {
    const origGetSelection = window.getSelection
    window.getSelection = () => ({ isCollapsed: true })

    const { wrapper } = mountGridItem({ props: { side: 'front' } })
    await wrapper.find('[data-testid="card-stub"]').trigger('click')

    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('back')
    expect(mockEmitSfx).toHaveBeenCalledWith('transition_up')

    window.getSelection = origGetSelection
  })

  test('onCardClick DOES flip when window.getSelection() returns null [obligation]', async () => {
    const origGetSelection = window.getSelection
    window.getSelection = () => null

    const { wrapper } = mountGridItem({ props: { side: 'front' } })
    await wrapper.find('[data-testid="card-stub"]').trigger('click')

    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('back')

    window.getSelection = origGetSelection
  })

  // ── onCardMouseDown / multi-click prevention [obligation] ──────────────────

  test('onCardMouseDown calls preventDefault when detail > 1 [obligation]', async () => {
    const { wrapper } = mountGridItem()
    const card = wrapper.find('[data-testid="card-stub"]')
    let prevented = false
    // Dispatch a real mousedown with detail=2 (double-click counter)
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 2 })
    vi.spyOn(event, 'preventDefault').mockImplementation(() => {
      prevented = true
    })
    card.element.dispatchEvent(event)
    expect(prevented).toBe(true)
  })

  test('onCardMouseDown does NOT call preventDefault when detail === 1 [obligation]', () => {
    const { wrapper } = mountGridItem()
    const card = wrapper.find('[data-testid="card-stub"]')
    let prevented = false
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 1 })
    vi.spyOn(event, 'preventDefault').mockImplementation(() => {
      prevented = true
    })
    card.element.dispatchEvent(event)
    expect(prevented).toBe(false)
  })

  // ── mobile tap behavior [obligation] ──────────────────────────────────────

  test('below md a tap calls mobile_editor.open_at(card.client_id) instead of flipping [obligation]', async () => {
    const mobile_editor = makeMobileEditor()
    const { wrapper } = mountGridItem({ is_mobile: true, mobile_editor })
    const card = wrapper.find('[data-testid="card-stub"]')
    const side_before = card.attributes('data-side')

    await card.trigger('click')

    expect(mobile_editor.open_at).toHaveBeenCalledWith('c1')
    // Side must not change — the editor opened instead of flipping
    expect(card.attributes('data-side')).toBe(side_before)
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('below md a tap is a no-op when no mobile_editor is provided [obligation]', async () => {
    const { wrapper } = mountGridItem({ is_mobile: true })
    const card = wrapper.find('[data-testid="card-stub"]')
    const side_before = card.attributes('data-side')

    await card.trigger('click')

    // No crash, no flip
    expect(card.attributes('data-side')).toBe(side_before)
  })

  test('below md a tap while selecting still calls onSelectCard [obligation]', async () => {
    const editor = makeEditor({ is_selecting: true })
    const mobile_editor = makeMobileEditor()
    const { wrapper } = mountGridItem({ is_mobile: true, editor, mobile_editor })

    await wrapper.find('[data-testid="card-stub"]').trigger('click')

    // Selection takes priority over mobile editor
    expect(editor.actions.onSelectCard).toHaveBeenCalledWith(1)
    expect(mobile_editor.open_at).not.toHaveBeenCalled()
  })

  test('at md+ a click flips the card (not the mobile editor) [obligation]', async () => {
    const mobile_editor = makeMobileEditor()
    const { wrapper } = mountGridItem({ is_mobile: false, mobile_editor })
    const card = wrapper.find('[data-testid="card-stub"]')

    await card.trigger('click')

    expect(mobile_editor.open_at).not.toHaveBeenCalled()
    expect(card.attributes('data-side')).toBe('back')
  })
})
