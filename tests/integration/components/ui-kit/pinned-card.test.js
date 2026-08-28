// The hover-lift assertions below read real computed styles, so the app's
// stylesheet has to be present — without it every Tailwind utility resolves to
// nothing and the geometry checks pass vacuously.
import '@/styles/main.css'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
// `vite-plus/test` has no browser-interaction export; the real pointer that
// drives :hover comes from the browser-mode runtime.
import { userEvent } from 'vitest/browser'
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

// ── Live-DOM harness for the hover assertions ─────────────────────────────────
// Computed styles and a real :hover both need the component in the document,
// laid out at a known width, and the paperclip icon un-stubbed (the pivot is
// measured against the clip's rendered box).

const mounted = []

function mountLive(props = {}) {
  const host = document.createElement('div')
  host.style.cssText = 'width:400px;margin:120px auto'
  document.body.appendChild(host)

  const wrapper = mount(UiPinnedCard, {
    props,
    slots: { default: '<div style="height:220px">card body</div>' },
    global: { directives: { sfx: vSfx } },
    attachTo: host
  })

  mounted.push({ wrapper, host })
  return wrapper
}

afterEach(() => {
  while (mounted.length) {
    const { wrapper, host } = mounted.pop()
    wrapper.unmount()
    host.remove()
  }
})

const el = (wrapper, name) => wrapper.find(`[data-testid="ui-pinned-card__${name}"]`).element
const rootEl = (wrapper) => wrapper.find('[data-testid="ui-pinned-card"]').element

// `rotate: none` is the resting value when nothing sets an angle.
function rotationOf(element) {
  const value = getComputedStyle(element).rotate
  return value === 'none' ? 0 : parseFloat(value)
}

// The visible angle of the card body is the outer wrapper's fixed tilt plus
// whatever the nested swing element contributes.
function renderedAngle(wrapper) {
  return rotationOf(el(wrapper, 'card')) + rotationOf(el(wrapper, 'swing'))
}

// transform-origin resolves to a px pair; return it in the swing's own box.
function pivotOf(wrapper) {
  const [x, y] = getComputedStyle(el(wrapper, 'swing')).transformOrigin.split(' ').map(parseFloat)
  return { x, y }
}

function durationMs(element) {
  return parseFloat(getComputedStyle(element).transitionDuration) * 1000
}

// Hover, then let the 150ms transition land before sampling.
async function hoverAndSettle(wrapper) {
  await userEvent.hover(rootEl(wrapper))
  await new Promise((resolve) => setTimeout(resolve, 400))
}

async function unhoverAndSettle(wrapper) {
  await userEvent.unhover(rootEl(wrapper))
  await new Promise((resolve) => setTimeout(resolve, 400))
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

  test('renders the nested swing wrapper the hover rotation lives on', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="ui-pinned-card__swing"]').exists()).toBe(true)
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

  test('renders default slot content inside the swing wrapper', () => {
    const wrapper = makeWrapper({}, { default: '<div data-testid="card-content">front</div>' })
    const swing = wrapper.find('[data-testid="ui-pinned-card__swing"]')
    expect(swing.find('[data-testid="card-content"]').exists()).toBe(true)
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

// ── The pivot is unconditional [obligation] ─────────────────────────────────────
// The defect this guards: an origin that only exists in the hovered state.
// transform-origin is not animatable, so the card jumps to a new position in one
// frame the moment the pointer arrives, and only then starts rotating. The
// origin must therefore be identical at rest and while hovered — and must sit at
// the paperclip, not at the swing element's own centre.

describe('UiPinnedCard — the swing pivots at the paperclip, hovered or not [obligation]', () => {
  test('the pivot is the same point at rest as it is while hovered', async () => {
    const wrapper = mountLive({ hover_lift: true })

    const at_rest = pivotOf(wrapper)
    await hoverAndSettle(wrapper)
    const while_hovered = pivotOf(wrapper)

    expect(while_hovered).toEqual(at_rest)
  })

  test('the resting pivot is not the swing element default, so it is genuinely set at rest', () => {
    const wrapper = mountLive({ hover_lift: true })
    const swing = el(wrapper, 'swing')

    // A pivot left unset resolves to the element's own centre.
    expect(pivotOf(wrapper)).not.toEqual({ x: swing.offsetWidth / 2, y: swing.offsetHeight / 2 })
  })

  test('the resting pivot sits on the paperclip, level with the top of the card', () => {
    const wrapper = mountLive({ hover_lift: true })
    const root = rootEl(wrapper)
    const swing = el(wrapper, 'swing')
    const { x, y } = pivotOf(wrapper)

    // The swing is nested inside the tilted card wrapper, so its own rect is
    // rotated; walk the untransformed layout offsets out to the root instead.
    let offset_x = 0
    let offset_y = 0
    for (let node = swing; node && node !== root; node = node.offsetParent) {
      offset_x += node.offsetLeft
      offset_y += node.offsetTop
    }

    const root_box = root.getBoundingClientRect()
    const clip_box = el(wrapper, 'paperclip').getBoundingClientRect()
    const clip_centre_x = clip_box.left + clip_box.width / 2 - root_box.left

    expect(offset_x + x).toBeCloseTo(clip_centre_x, 0)
    expect(offset_y + y).toBe(0)
  })
})

// ── The swing is partial, and quick [obligation] ────────────────────────────────

describe('UiPinnedCard — hover swings the card partway toward upright [obligation]', () => {
  test('hover reduces the tilt without reaching upright or tipping past it', async () => {
    const wrapper = mountLive({ hover_lift: true })

    const at_rest = renderedAngle(wrapper)
    expect(at_rest).not.toBe(0)

    await hoverAndSettle(wrapper)
    const while_hovered = renderedAngle(wrapper)

    expect(Math.abs(while_hovered)).toBeLessThan(Math.abs(at_rest))
    expect(Math.abs(while_hovered)).toBeGreaterThan(0)
    expect(Math.sign(while_hovered)).toBe(Math.sign(at_rest))
  })

  test('the card settles back to its resting tilt when the pointer leaves', async () => {
    const wrapper = mountLive({ hover_lift: true })

    const at_rest = renderedAngle(wrapper)
    await hoverAndSettle(wrapper)
    await unhoverAndSettle(wrapper)

    expect(renderedAngle(wrapper)).toBeCloseTo(at_rest, 5)
  })

  test('the outer wrapper holds the resting tilt, so hover never moves the tuned position', async () => {
    const wrapper = mountLive({ hover_lift: true })

    const resting_tilt = rotationOf(el(wrapper, 'card'))
    expect(resting_tilt).not.toBe(0)

    await hoverAndSettle(wrapper)
    expect(rotationOf(el(wrapper, 'card'))).toBe(resting_tilt)
  })

  test('the swing animates, and is no slower than the app’s other hover rotations', () => {
    const wrapper = mountLive({ hover_lift: true })
    const swing_duration = durationMs(el(wrapper, 'swing'))

    // The app's other hover-driven rotations run at 75ms and 100ms; 150ms is
    // the ceiling this one was tuned down to. Anything above it is the slow
    // drift the tuning removed.
    expect(swing_duration).toBeGreaterThan(0)
    expect(swing_duration).toBeLessThanOrEqual(150)
  })
})

// ── hover_lift is opt-in [obligation] ───────────────────────────────────────────
// Member settings and the welcome splash preview never pass hover_lift, so a
// call site that leaves it unset must get no hover behaviour at all: no angle
// change, no transition, no repositioned pivot, no sound.

describe('UiPinnedCard — hover_lift unset or false stays static [obligation]', () => {
  beforeEach(() => mockEmitHoverSfx.mockClear())

  test('hovering does not change the rendered angle', async () => {
    const wrapper = mountLive()

    const at_rest = renderedAngle(wrapper)
    await hoverAndSettle(wrapper)

    expect(renderedAngle(wrapper)).toBe(at_rest)
  })

  test('the swing element carries no transition at all', () => {
    const wrapper = mountLive()
    expect(durationMs(el(wrapper, 'swing'))).toBe(0)
  })

  test('the swing element keeps its default pivot', () => {
    const wrapper = mountLive()
    const swing = el(wrapper, 'swing')
    expect(pivotOf(wrapper)).toEqual({ x: swing.offsetWidth / 2, y: swing.offsetHeight / 2 })
  })

  test('hover_lift: false explicitly behaves the same as leaving it unset', async () => {
    const wrapper = mountLive({ hover_lift: false })
    const swing = el(wrapper, 'swing')

    const at_rest = renderedAngle(wrapper)
    await hoverAndSettle(wrapper)

    expect(renderedAngle(wrapper)).toBe(at_rest)
    expect(durationMs(swing)).toBe(0)
    expect(pivotOf(wrapper)).toEqual({ x: swing.offsetWidth / 2, y: swing.offsetHeight / 2 })
  })

  test('hovering the root plays no ui.hover sfx by default', () => {
    const wrapper = makeWrapper()
    pointerEnter(wrapper.find('[data-testid="ui-pinned-card"]').element)
    expect(mockEmitHoverSfx).not.toHaveBeenCalled()
  })
})

describe('UiPinnedCard — hover_lift: true opts the card into the hover lift [obligation]', () => {
  beforeEach(() => mockEmitHoverSfx.mockClear())

  test('hovering the root plays the ui.hover sfx', () => {
    const wrapper = makeWrapper({ hover_lift: true })
    pointerEnter(wrapper.find('[data-testid="ui-pinned-card"]').element)
    expect(mockEmitHoverSfx).toHaveBeenCalled()
  })
})

// ── tuck × hover_lift [obligation] ──────────────────────────────────────────────
// The tuck animation targets the outer wrapper (deck-settings' preview_el) and
// the paperclip; the hover swing sits on the nested swing element. Opting into
// hover_lift must not disturb tucking, and tucking must not disarm the swing.

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

  test('the hover swing still runs after a tuck and untuck', async () => {
    const wrapper = mountLive({ hover_lift: true, tucked: false })

    await wrapper.setProps({ tucked: true })
    await wrapper.setProps({ tucked: false })

    const at_rest = renderedAngle(wrapper)
    const pivot_at_rest = pivotOf(wrapper)

    await hoverAndSettle(wrapper)

    expect(Math.abs(renderedAngle(wrapper))).toBeLessThan(Math.abs(at_rest))
    expect(pivotOf(wrapper)).toEqual(pivot_at_rest)
  })

  test('the tuck fade lives on the paperclip, never on the swinging card', () => {
    const wrapper = mountLive({ hover_lift: true, tucked: true })
    expect(getComputedStyle(el(wrapper, 'swing')).opacity).toBe('1')
    expect(getComputedStyle(el(wrapper, 'card')).opacity).toBe('1')
  })
})
