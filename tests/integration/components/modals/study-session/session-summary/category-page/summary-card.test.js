import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import SummaryCard from '@/views/study-session/session-summary/category-page/summary-card.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx, mockAppearanceFor } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockAppearanceFor: vi.fn(() => ({ card_attributes: { some: 'attrs' } }))
}))

const { pressHoldArmMock, pressHoldCancelMock } = vi.hoisted(() => ({
  pressHoldArmMock: vi.fn(),
  pressHoldCancelMock: vi.fn()
}))

const { capturedController } = vi.hoisted(() => ({ capturedController: { current: null } }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/composables/ui/press-hold', () => ({
  usePressHold: () => ({ arm: pressHoldArmMock, cancel: pressHoldCancelMock })
}))

vi.mock('@/views/study-session/deck-resolution', () => ({
  useDeckResolution: () => ({ appearanceFor: mockAppearanceFor })
}))

vi.mock('@/views/study-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => capturedController.current
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const CardStub = defineComponent({
  name: 'Card',
  inheritAttrs: false,
  props: [
    'side',
    'front_text',
    'back_text',
    'front_image_path',
    'back_image_path',
    'card_attributes'
  ],
  setup(props) {
    const attrs = useAttrs()
    return () =>
      h('div', {
        'data-testid': 'card-stub',
        'data-side': props.side,
        'data-front-text': props.front_text,
        'data-back-text': props.back_text,
        'data-front-image': props.front_image_path,
        'data-back-image': props.back_image_path,
        onClick: attrs.onClick
      })
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
  setup(props, { emit, expose }) {
    expose({ show: vi.fn(), open: ref(false) })
    return () =>
      h('div', { 'data-testid': 'summary-card-menu-stub' }, [
        h('button', {
          'data-testid': 'summary-card-menu-stub__select',
          onClick: () =>
            emit(
              'select',
              (props.options ?? []).find((o) => o.value === 'select') ?? { value: 'select' }
            )
        }),
        h('button', {
          'data-testid': 'summary-card-menu-stub__move',
          onClick: () =>
            emit(
              'select',
              (props.options ?? []).find((o) => o.value === 'move') ?? { value: 'move' }
            )
        }),
        h('button', {
          'data-testid': 'summary-card-menu-stub__edit',
          onClick: () =>
            emit(
              'select',
              (props.options ?? []).find((o) => o.value === 'edit') ?? { value: 'edit' }
            )
        }),
        h('button', {
          'data-testid': 'summary-card-menu-stub__delete',
          onClick: () =>
            emit(
              'select',
              (props.options ?? []).find((o) => o.value === 'delete') ?? { value: 'delete' }
            )
        })
      ])
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return {
    id: 1,
    deck_id: 7,
    front_text: 'Front',
    back_text: 'Back',
    front_image_path: null,
    back_image_path: null,
    state: 'passed',
    ...overrides
  }
}

function makeController({ is_selecting = false, selected = false } = {}) {
  return {
    summary_selection: {
      is_selecting: ref(is_selecting),
      isCardSelected: vi.fn(() => selected),
      toggleSelectCard: vi.fn(),
      enterSelection: vi.fn(),
      selectCard: vi.fn()
    },
    startSummaryEdit: vi.fn(),
    onDeleteSummaryCard: vi.fn(),
    onMoveSummaryCard: vi.fn(),
    onSelectSummaryCard: vi.fn()
  }
}

function mount_({ props = {}, controller } = {}) {
  const ctrl = controller ?? makeController()
  capturedController.current = ctrl

  const wrapper = mount(SummaryCard, {
    props: { card: makeCard(), ...props },
    attachTo: document.body,
    global: {
      stubs: { Card: CardStub, UiRadio: UiRadioStub, UiDropdownButton: UiDropdownButtonStub }
    }
  })

  return { wrapper, controller: ctrl }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SummaryCard', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockAppearanceFor.mockClear().mockReturnValue({ card_attributes: { some: 'attrs' } })
    pressHoldArmMock.mockClear()
    pressHoldCancelMock.mockClear()
  })

  // ── basic rendering / flip (unchanged behaviour) ───────────────────────────

  test('renders the card content', () => {
    const { wrapper } = mount_()
    expect(wrapper.find('[data-testid="session-summary__card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-stub"]').exists()).toBe(true)
  })

  test('starts showing the front side', () => {
    const { wrapper } = mount_()
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('front')
  })

  test('clicking the card flips to the back side and plays a transition sfx', async () => {
    const { wrapper } = mount_()
    await wrapper.find('[data-testid="card-stub"]').trigger('click')

    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('back')
    expect(mockEmitSfx).toHaveBeenCalledWith('card.flip-away')
  })

  test('clicking twice flips back to the front and plays the opposite sfx', async () => {
    const { wrapper } = mount_()
    const card = wrapper.find('[data-testid="card-stub"]')

    await card.trigger('click')
    await card.trigger('click')

    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('front')
    expect(mockEmitSfx).toHaveBeenLastCalledWith('card.flip-back')
  })

  test('resolves card_attributes via appearanceFor(card.deck_id)', () => {
    const { wrapper } = mount_({ props: { card: makeCard({ deck_id: 42 }) } })

    expect(mockAppearanceFor).toHaveBeenCalledWith(42)
    expect(wrapper.find('[data-testid="card-stub"]').exists()).toBe(true)
  })

  test('forwards front/back text and image paths to the card', () => {
    const card = makeCard({
      front_text: 'Q text',
      back_text: 'A text',
      front_image_path: 'front.png',
      back_image_path: 'back.png'
    })
    const { wrapper } = mount_({ props: { card } })
    const rendered = wrapper.find('[data-testid="card-stub"]')

    expect(rendered.attributes('data-front-text')).toBe('Q text')
    expect(rendered.attributes('data-back-text')).toBe('A text')
    expect(rendered.attributes('data-front-image')).toBe('front.png')
    expect(rendered.attributes('data-back-image')).toBe('back.png')
  })

  // ── selection mode ──────────────────────────────────────────────────────────

  describe('selection mode', () => {
    test('clicking the card while selecting toggles selection and does not flip', async () => {
      const controller = makeController({ is_selecting: true })
      const { wrapper } = mount_({ controller })

      await wrapper.find('[data-testid="card-stub"]').trigger('click')

      expect(controller.onSelectSummaryCard).toHaveBeenCalledWith(1)
      expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('front')
      expect(mockEmitSfx).not.toHaveBeenCalled()
    })

    test('renders the checkbox while selecting, reflecting isCardSelected', () => {
      const controller = makeController({ is_selecting: true, selected: true })
      const { wrapper } = mount_({ controller })

      const radio = wrapper.find('[data-testid="session-summary__card-checkbox"]')
      expect(radio.exists()).toBe(true)
      expect(radio.attributes('data-checked')).toBe('true')
    })

    test('omits the checkbox when not selecting', () => {
      const { wrapper } = mount_()
      expect(wrapper.find('[data-testid="session-summary__card-checkbox"]').exists()).toBe(false)
    })

    test('mirrors hover onto the checkbox active prop', async () => {
      const controller = makeController({ is_selecting: true })
      const { wrapper } = mount_({ controller })
      const root = wrapper.find('[data-testid="session-summary__card"]')

      expect(
        wrapper.find('[data-testid="session-summary__card-checkbox"]').attributes('data-active')
      ).toBe('false')

      await root.trigger('mouseenter')
      expect(
        wrapper.find('[data-testid="session-summary__card-checkbox"]').attributes('data-active')
      ).toBe('true')

      await root.trigger('mouseleave')
      expect(
        wrapper.find('[data-testid="session-summary__card-checkbox"]').attributes('data-active')
      ).toBe('false')
    })

    test('hides the ⋯ menu while selecting', () => {
      const controller = makeController({ is_selecting: true })
      const { wrapper } = mount_({ controller })
      expect(wrapper.find('[data-testid="session-summary__card-menu"]').exists()).toBe(false)
    })

    test('a touch pointerdown does NOT arm the long-press hold while selecting', async () => {
      const controller = makeController({ is_selecting: true })
      const { wrapper } = mount_({ controller })
      await wrapper
        .find('[data-testid="session-summary__card"]')
        .trigger('pointerdown', { pointerType: 'touch' })

      expect(pressHoldArmMock).not.toHaveBeenCalled()
    })
  })

  // ── ⋯ options menu ────────────────────────────────────────────────────────

  describe('⋯ options menu', () => {
    test('renders the menu when not selecting', () => {
      const { wrapper } = mount_()
      expect(wrapper.find('[data-testid="session-summary__card-menu"]').exists()).toBe(true)
    })

    test('select option enters selection and selects this card', async () => {
      const { wrapper, controller } = mount_()
      await wrapper.find('[data-testid="summary-card-menu-stub__select"]').trigger('click')

      expect(controller.onSelectSummaryCard).toHaveBeenCalledWith(1)
    })

    test('move option calls onMoveSummaryCard with the card id', async () => {
      const { wrapper, controller } = mount_()
      await wrapper.find('[data-testid="summary-card-menu-stub__move"]').trigger('click')

      expect(controller.onMoveSummaryCard).toHaveBeenCalledWith(1)
    })

    test('edit option calls startSummaryEdit with the card id', async () => {
      const { wrapper, controller } = mount_()
      await wrapper.find('[data-testid="summary-card-menu-stub__edit"]').trigger('click')

      expect(controller.startSummaryEdit).toHaveBeenCalledWith(1)
    })

    test('delete option calls onDeleteSummaryCard with the card id', async () => {
      const { wrapper, controller } = mount_()
      await wrapper.find('[data-testid="summary-card-menu-stub__delete"]').trigger('click')

      expect(controller.onDeleteSummaryCard).toHaveBeenCalledWith(1)
    })

    test('a touch pointerdown when not selecting arms a hold that opens the menu', async () => {
      const { wrapper } = mount_()
      await wrapper
        .find('[data-testid="session-summary__card"]')
        .trigger('pointerdown', { pointerType: 'touch' })

      expect(pressHoldArmMock).toHaveBeenCalledTimes(1)
    })

    test('a mouse pointerdown does NOT arm the hold — desktop hovers the menu', async () => {
      const { wrapper } = mount_()
      await wrapper
        .find('[data-testid="session-summary__card"]')
        .trigger('pointerdown', { pointerType: 'mouse' })

      expect(pressHoldArmMock).not.toHaveBeenCalled()
    })
  })
})
