import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import UiPinnedCard from '@/components/ui-kit/pinned-card.vue'

const { mockEmitHoverSfx } = vi.hoisted(() => ({ mockEmitHoverSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn(), emitHoverSfx: mockEmitHoverSfx }))

import { vSfx } from '@/sfx/directive'

function makeWrapper(props = {}, slots = {}) {
  return mount(UiPinnedCard, {
    props,
    slots,
    global: { stubs: { UiIcon: true }, directives: { sfx: vSfx } }
  })
}

function pointerEnter(el) {
  el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
}

describe('UiPinnedCard — structure', () => {
  test('renders the root container', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="ui-pinned-card"]').exists()).toBe(true)
  })

  test('renders the card slot wrapper', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="ui-pinned-card__card"]').exists()).toBe(true)
  })

  test('renders the paperclip decoration', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="ui-pinned-card__paperclip"]').exists()).toBe(true)
  })
})

describe('UiPinnedCard — slots', () => {
  test('renders the backdrop slot ahead of the card slot in document order', () => {
    const wrapper = makeWrapper(
      {},
      {
        backdrop: '<div data-testid="backdrop-content">back</div>',
        default: '<div data-testid="card-content">front</div>'
      }
    )

    const backdrop = wrapper.find('[data-testid="backdrop-content"]').element
    const card = wrapper.find('[data-testid="card-content"]').element
    expect(!!(backdrop.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  test('renders default slot content inside the card wrapper', () => {
    const wrapper = makeWrapper({}, { default: '<div data-testid="card-content">front</div>' })
    const card_wrapper = wrapper.find('[data-testid="ui-pinned-card__card"]')
    expect(card_wrapper.find('[data-testid="card-content"]').exists()).toBe(true)
  })

  test('renders with no backdrop slot content when omitted', () => {
    const wrapper = makeWrapper({}, { default: '<div>front</div>' })
    expect(wrapper.find('[data-testid="ui-pinned-card"]').element.children.length).toBeGreaterThan(
      0
    )
  })
})

// ── tucked prop [obligation] ────────────────────────────────────────────────────

describe('UiPinnedCard — tucked prop reflected on the paperclip [obligation]', () => {
  test('defaults tucked to false', () => {
    const wrapper = makeWrapper()
    expect(
      wrapper.find('[data-testid="ui-pinned-card__paperclip"]').attributes('data-tucked')
    ).toBe('false')
  })

  test('reflects tucked=true on the paperclip data-tucked attribute', () => {
    const wrapper = makeWrapper({ tucked: true })
    expect(
      wrapper.find('[data-testid="ui-pinned-card__paperclip"]').attributes('data-tucked')
    ).toBe('true')
  })

  test('reflects tucked=false explicitly', () => {
    const wrapper = makeWrapper({ tucked: false })
    expect(
      wrapper.find('[data-testid="ui-pinned-card__paperclip"]').attributes('data-tucked')
    ).toBe('false')
  })

  test('updates data-tucked reactively when the prop changes', async () => {
    const wrapper = makeWrapper({ tucked: false })
    await wrapper.setProps({ tucked: true })
    expect(
      wrapper.find('[data-testid="ui-pinned-card__paperclip"]').attributes('data-tucked')
    ).toBe('true')
  })
})

// ── hover_lift prop [obligation] ────────────────────────────────────────────────
// Opt-in only — member settings and the welcome splash preview never pass
// hover_lift, so the default (unset/false) must render neither the hover
// rotate class nor the ui.hover v-sfx binding.

describe('UiPinnedCard — hover_lift unset or false stays static [obligation]', () => {
  beforeEach(() => mockEmitHoverSfx.mockClear())

  test('the root carries no group/pinned-card class by default', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="ui-pinned-card"]').classes()).not.toContain(
      'group/pinned-card'
    )
  })

  test('the card wrapper carries no hover rotate class by default', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="ui-pinned-card__card"]').classes()).not.toContain(
      'group-hover/pinned-card:rotate-1'
    )
  })

  test('hover_lift: false explicitly renders the same static markup', () => {
    const wrapper = makeWrapper({ hover_lift: false })
    expect(wrapper.find('[data-testid="ui-pinned-card"]').classes()).not.toContain(
      'group/pinned-card'
    )
    expect(wrapper.find('[data-testid="ui-pinned-card__card"]').classes()).not.toContain(
      'group-hover/pinned-card:rotate-1'
    )
  })

  test('hovering the root plays no ui.hover sfx by default', () => {
    const wrapper = makeWrapper()
    pointerEnter(wrapper.find('[data-testid="ui-pinned-card"]').element)
    expect(mockEmitHoverSfx).not.toHaveBeenCalled()
  })
})

describe('UiPinnedCard — hover_lift: true opts the card into the hover lift [obligation]', () => {
  beforeEach(() => mockEmitHoverSfx.mockClear())

  test('the root carries the group/pinned-card class', () => {
    const wrapper = makeWrapper({ hover_lift: true })
    expect(wrapper.find('[data-testid="ui-pinned-card"]').classes()).toContain('group/pinned-card')
  })

  test('the card wrapper carries the transition classes and hover-scoped origin and rotate', () => {
    const wrapper = makeWrapper({ hover_lift: true })
    const classes = wrapper.find('[data-testid="ui-pinned-card__card"]').classes()
    expect(classes).toContain('group-hover/pinned-card:origin-[88%_0%]')
    expect(classes).toContain('transition-transform')
    expect(classes).toContain('duration-200')
    expect(classes).toContain('ease-out')
    expect(classes).toContain('group-hover/pinned-card:rotate-0')
  })

  test('hovering the root plays the ui.hover sfx', () => {
    const wrapper = makeWrapper({ hover_lift: true })
    pointerEnter(wrapper.find('[data-testid="ui-pinned-card"]').element)
    expect(mockEmitHoverSfx).toHaveBeenCalled()
  })
})

// ── tuck × hover_lift [obligation] ──────────────────────────────────────────────
// The tuck animation targets the outer wrapper (deck-settings' preview_el) and
// the paperclip; the hover transform sits on ui-pinned-card__card. Opting into
// hover_lift must not disturb tucking, and tucking must not strip the hover
// classes off the inner card.

describe('UiPinnedCard — tuck still works with hover_lift on [obligation]', () => {
  test('tucking toggles the paperclip while hover_lift is on', async () => {
    const wrapper = makeWrapper({ hover_lift: true, tucked: false })
    const paperclip = () => wrapper.find('[data-testid="ui-pinned-card__paperclip"]')
    expect(paperclip().attributes('data-tucked')).toBe('false')

    await wrapper.setProps({ tucked: true })
    expect(paperclip().attributes('data-tucked')).toBe('true')
    expect(paperclip().classes()).toContain('opacity-0')

    await wrapper.setProps({ tucked: false })
    expect(paperclip().attributes('data-tucked')).toBe('false')
    expect(paperclip().classes()).not.toContain('opacity-0')
  })

  test('the hover classes survive a tuck and untuck', async () => {
    const wrapper = makeWrapper({ hover_lift: true, tucked: false })
    const card = () => wrapper.find('[data-testid="ui-pinned-card__card"]')

    await wrapper.setProps({ tucked: true })
    expect(card().classes()).toContain('group-hover/pinned-card:rotate-0')
    expect(card().classes()).toContain('group-hover/pinned-card:origin-[88%_0%]')

    await wrapper.setProps({ tucked: false })
    expect(card().classes()).toContain('group-hover/pinned-card:rotate-0')
  })

  test('the tuck opacity lives on the paperclip, never on the hover-transformed card', () => {
    const wrapper = makeWrapper({ hover_lift: true, tucked: true })
    expect(wrapper.find('[data-testid="ui-pinned-card__card"]').classes()).not.toContain(
      'opacity-0'
    )
  })
})
