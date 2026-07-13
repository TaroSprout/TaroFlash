import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import ReviewInboxNavButton from '@/views/dashboard/review-inbox/nav-button.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountButton(props) {
  return mount(ReviewInboxNavButton, {
    props,
    global: { directives: { sfx: {} } }
  })
}

afterEach(() => {
  // Teleported tooltip content survives past wrapper.unmount() targeting —
  // clear it explicitly so a stale tooltip from a prior test can't leak in.
  document.body.querySelectorAll('[data-testid="ui-tooltip"]').forEach((el) => el.remove())
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReviewInboxNavButton — direction', () => {
  test('renders review-inbox__prev-btn testid for direction=prev', () => {
    const wrapper = mountButton({ direction: 'prev' })
    expect(wrapper.find('[data-testid="review-inbox__prev-btn"]').exists()).toBe(true)
  })

  test('renders review-inbox__next-btn testid for direction=next', () => {
    const wrapper = mountButton({ direction: 'next' })
    expect(wrapper.find('[data-testid="review-inbox__next-btn"]').exists()).toBe(true)
  })
})

describe('ReviewInboxNavButton — disabled renders nothing [obligation]', () => {
  test('renders no button at all when disabled=true [obligation]', () => {
    const wrapper = mountButton({ direction: 'next', disabled: true })
    expect(wrapper.find('[data-testid="review-inbox__next-btn"]').exists()).toBe(false)
  })

  test('renders the button when disabled=false [obligation]', () => {
    const wrapper = mountButton({ direction: 'next', disabled: false })
    expect(wrapper.find('[data-testid="review-inbox__next-btn"]').exists()).toBe(true)
  })
})

describe('ReviewInboxNavButton — press event', () => {
  test('emits press when tapped [obligation]', async () => {
    const wrapper = mountButton({ direction: 'next' })
    await wrapper.find('[data-testid="review-inbox__next-btn"]').trigger('click')
    expect(wrapper.emitted('press')).toBeTruthy()
    expect(wrapper.emitted('press')).toHaveLength(1)
  })
})

describe('ReviewInboxNavButton — icon-only label surfaces as a tooltip', () => {
  test('surfaces the next-button label as a tooltip on focus', async () => {
    const wrapper = mountButton({ direction: 'next' })
    await wrapper.find('[data-testid="review-inbox__next-btn"]').trigger('focusin')
    const tooltip = document.body.querySelector('[data-testid="ui-tooltip"]')
    expect(tooltip?.textContent).toBe('Next')
  })

  test('surfaces the prev-button label as a tooltip on focus', async () => {
    const wrapper = mountButton({ direction: 'prev' })
    await wrapper.find('[data-testid="review-inbox__prev-btn"]').trigger('focusin')
    const tooltip = document.body.querySelector('[data-testid="ui-tooltip"]')
    expect(tooltip?.textContent).toBe('Previous')
  })
})
