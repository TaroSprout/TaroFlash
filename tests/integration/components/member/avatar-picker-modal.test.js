import '@/styles/main.css'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const { mockEmitSfx, mockLoadAvatarUrl } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockLoadAvatarUrl: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

// 12 keys — enough for several full rows plus a partial last row at the
// container widths the layout tests below exercise.
vi.mock('@/components/member/avatars', () => ({
  AVATAR_KEYS: [
    'panda',
    'otter',
    'owl',
    'frog',
    'fox',
    'bear',
    'wolf',
    'deer',
    'seal',
    'crow',
    'hare',
    'lynx'
  ],
  loadAvatarUrl: mockLoadAvatarUrl
}))

const DialogCardStub = defineComponent({
  name: 'DialogCard',
  inheritAttrs: false,
  props: { sfx: { type: Object, default: () => ({}) } },
  emits: ['close'],
  setup(props, { slots, attrs }) {
    return () =>
      h(
        'div',
        { ...attrs, 'data-sfx': JSON.stringify(props.sfx) },
        slots.default?.({ viewport: 'desktop' })
      )
  }
})

const DialogCardBodyStub = defineComponent({
  name: 'DialogCardBody',
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h('div', { ...attrs }, slots.default?.())
  }
})

import AvatarPickerModal from '@/components/member/avatar-picker-modal.vue'
import AvatarImage from '@/components/member/avatar-image.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

function mountModal(props = {}) {
  return shallowMount(AvatarPickerModal, {
    props: { close: vi.fn(), ...props },
    global: {
      stubs: { DialogCard: DialogCardStub, DialogCardBody: DialogCardBodyStub }
    }
  })
}

beforeEach(() => {
  mockEmitSfx.mockClear()
  mockLoadAvatarUrl.mockReset()
})

describe('AvatarPickerModal', () => {
  test('plays dialog.open-chime on mount', () => {
    mountModal()
    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.open-chime')
  })

  test('passes no sfx override to dialog-card, so it falls back to its own default close cue', () => {
    const wrapper = mountModal()
    expect(wrapper.find('[data-testid="avatar-picker-modal"]').attributes('data-sfx')).toBe(
      JSON.stringify({})
    )
  })

  test('renders one option per AVATAR_KEYS entry', () => {
    const wrapper = mountModal()
    expect(wrapper.find('[data-testid="avatar-picker-modal__option-panda"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="avatar-picker-modal__option-otter"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="avatar-picker-modal__option-owl"]').exists()).toBe(true)
  })

  test('clicking an avatar that is not selected calls close with that key and plays ui.toggle-on', async () => {
    const close = vi.fn()
    const wrapper = mountModal({ close, selected: 'owl' })

    await wrapper.find('[data-testid="avatar-picker-modal__option-panda"]').trigger('click')

    expect(close).toHaveBeenCalledWith('panda')
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.toggle-on')
  })

  test('clicking the already-selected avatar is a no-op and plays ui.deselect', async () => {
    const close = vi.fn()
    const wrapper = mountModal({ close, selected: 'owl' })
    mockEmitSfx.mockClear()

    await wrapper.find('[data-testid="avatar-picker-modal__option-owl"]').trigger('click')

    expect(close).not.toHaveBeenCalled()
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.deselect')
  })

  test('marks the selected avatar with data-selected', () => {
    const wrapper = mountModal({ selected: 'otter' })
    expect(
      wrapper.find('[data-testid="avatar-picker-modal__option-otter"]').attributes('data-selected')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="avatar-picker-modal__option-panda"]').attributes('data-selected')
    ).toBeUndefined()
  })

  test('marks the frog avatar as selected when selected is "frog" (default fallback value)', () => {
    const wrapper = mountModal({ selected: 'frog' })
    expect(
      wrapper.find('[data-testid="avatar-picker-modal__option-frog"]').attributes('data-selected')
    ).toBe('true')
  })

  test('dialog-card close emits calls close() with no argument (dismiss)', () => {
    const close = vi.fn()
    const wrapper = mountModal({ close })
    wrapper.findComponent(DialogCardStub).vm.$emit('close')
    expect(close).toHaveBeenCalledWith()
  })

  test('renders avatar-image for every tile unconditionally, with no per-tile skeleton of its own [obligation]', () => {
    mockLoadAvatarUrl.mockReturnValue(new Promise(() => {}))
    const wrapper = mountModal()

    const option = wrapper.find('[data-testid="avatar-picker-modal__option-panda"]')
    expect(option.find('[data-testid="avatar-picker-modal__skeleton"]').exists()).toBe(false)
    expect(option.findComponent(AvatarImage).exists()).toBe(true)
  })

  test("passes each tile's own avatar key through to avatar-image, unresolved or not [obligation]", () => {
    mockLoadAvatarUrl.mockReturnValue(new Promise(() => {}))
    const wrapper = mountModal()

    const option = wrapper.find('[data-testid="avatar-picker-modal__option-panda"]')
    expect(option.findComponent(AvatarImage).props('avatar')).toBe('panda')
  })

  // ── dialog-card-body migration [obligation] ────────────────────────────────
  // Scrolling now belongs to dialog-card-body; the grid itself no longer owns
  // a template ref or a viewport-driven data-full-bleed attribute.

  test('the grid no longer carries a data-full-bleed attribute [obligation]', () => {
    const wrapper = mountModal()
    expect(
      wrapper.find('[data-testid="avatar-picker-modal__grid"]').attributes('data-full-bleed')
    ).toBeUndefined()
  })

  test('the scroll area is rendered by dialog-card-body, not a hand-rolled overflow div [obligation]', () => {
    const wrapper = mountModal()
    expect(wrapper.findComponent(DialogCardBodyStub).exists()).toBe(true)
    expect(wrapper.findComponent(DialogCardBodyStub).attributes('data-testid')).toBe(
      'avatar-picker-modal__scroll-area'
    )
  })


  test('colours the selection tick with the accent-text token, not a fixed neutral [obligation]', () => {
    const wrapper = mountModal({ selected: 'otter' })
    const tick = wrapper
      .find('[data-testid="avatar-picker-modal__option-otter"]')
      .findComponent(UiIcon)
    expect(tick.classes()).toContain('text-(--color-accent-text)')
  })
})

// ── tile grid reflow [obligation] ───────────────────────────────────────────
// The tile itself stays a fixed size at every container width; the column
// count is what bends, and the resulting block of tiles centers within the
// leftover width. Asserted against real Chromium layout (getBoundingClientRect),
// never the grid's own class string — see .claude/rules/test-authoring.md.

const OPTION_SELECTOR = '[data-testid^="avatar-picker-modal__option-"]'
const ROW_TOLERANCE_PX = 2

function mountAtWidth(width_px) {
  const host = document.createElement('div')
  host.style.width = `${width_px}px`
  document.body.appendChild(host)

  const wrapper = shallowMount(AvatarPickerModal, {
    props: { close: vi.fn() },
    attachTo: host,
    global: {
      stubs: { DialogCard: DialogCardStub, DialogCardBody: DialogCardBodyStub },
      directives: { sfx: {} }
    }
  })

  return { wrapper, host }
}

function tileRects(wrapper) {
  return wrapper.findAll(OPTION_SELECTOR).map((tile) => tile.element.getBoundingClientRect())
}

function firstRow(rects) {
  const top = rects[0].top
  return rects.filter((rect) => Math.abs(rect.top - top) <= ROW_TOLERANCE_PX)
}

describe('AvatarPickerModal tile grid reflow', () => {
  let hosts = []

  beforeEach(() => {
    hosts = []
  })

  afterEach(() => {
    hosts.forEach((host) => host.remove())
  })

  function mount(width_px) {
    const { wrapper, host } = mountAtWidth(width_px)
    hosts.push(host)
    return wrapper
  }

  test('tile width is identical across container widths while the column count differs [obligation]', () => {
    const narrow = firstRow(tileRects(mount(300)))
    const medium = firstRow(tileRects(mount(600)))
    const wide = firstRow(tileRects(mount(900)))

    expect(narrow.length).toBeLessThan(medium.length)
    expect(medium.length).toBeLessThan(wide.length)

    const narrow_width = narrow[0].width
    expect(medium[0].width).toBeCloseTo(narrow_width, 0)
    expect(wide[0].width).toBeCloseTo(narrow_width, 0)
  })

  test('leftover width splits evenly on either side of the tile block [obligation]', () => {
    const wrapper = mount(600)
    const host = hosts[0]
    const host_rect = host.getBoundingClientRect()
    const row = firstRow(tileRects(wrapper))

    const gap_before = row[0].left - host_rect.left
    const gap_after = host_rect.right - row[row.length - 1].right

    expect(Math.abs(gap_before - gap_after)).toBeLessThanOrEqual(ROW_TOLERANCE_PX)
  })

  test('tiles within a row sit left-to-right, one gap apart, including on a partial last row [obligation]', () => {
    const wrapper = mount(600)
    const rects = tileRects(wrapper)
    const row = firstRow(rects)
    const row_gap = row[1].left - row[0].right

    for (let i = 1; i < row.length; i++) {
      expect(row[i].left - row[i - 1].right).toBeCloseTo(row_gap, 0)
      expect(row[i].left).toBeGreaterThan(row[i - 1].left)
    }

    const last_row_top = rects[rects.length - 1].top
    const last_row = rects.filter((rect) => Math.abs(rect.top - last_row_top) <= ROW_TOLERANCE_PX)

    expect(last_row.length).toBeLessThan(row.length)
    expect(last_row[0].left).toBeCloseTo(row[0].left, 0)

    for (let i = 1; i < last_row.length; i++) {
      expect(last_row[i].left - last_row[i - 1].right).toBeCloseTo(row_gap, 0)
    }
  })

  test('a container narrower than one tile shrinks the tile to fit instead of overflowing [obligation]', () => {
    const wrapper = mount(80)
    const host = hosts[0]
    const row = firstRow(tileRects(wrapper))

    expect(row[0].width).toBeLessThanOrEqual(host.getBoundingClientRect().width + ROW_TOLERANCE_PX)
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + ROW_TOLERANCE_PX)
  })
})
