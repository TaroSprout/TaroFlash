import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import DialogCardHeader from '@/components/layout-kit/dialog-card/dialog-card-header.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountHeader(props = {}, slots = {}) {
  return mount(DialogCardHeader, { props, slots })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DialogCardHeader', () => {
  // ── title ───────────────────────────────────────────────────────────────────

  test('renders the title text', () => {
    const wrapper = mountHeader({ title: 'My Deck' })
    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('My Deck')
  })

  test('renders an empty title when none is passed', () => {
    const wrapper = mountHeader()
    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('')
  })

  // ── padded [obligation] ────────────────────────────────────────────────────

  test('[obligation] applies px-(--dialog-px) and pt-(--dialog-px) when padded is omitted (defaults true)', () => {
    const wrapper = mountHeader()
    const classes = wrapper.find('[data-testid="dialog-card-header"]').classes()
    expect(classes).toContain('px-(--dialog-px)')
    expect(classes).toContain('pt-(--dialog-px)')
  })

  test('[obligation] applies px-(--dialog-px) and pt-(--dialog-px) when padded is explicitly true', () => {
    const wrapper = mountHeader({ padded: true })
    const classes = wrapper.find('[data-testid="dialog-card-header"]').classes()
    expect(classes).toContain('px-(--dialog-px)')
    expect(classes).toContain('pt-(--dialog-px)')
  })

  test('[obligation] omits px-(--dialog-px) and pt-(--dialog-px) when padded is false', () => {
    const wrapper = mountHeader({ padded: false })
    const classes = wrapper.find('[data-testid="dialog-card-header"]').classes()
    expect(classes).not.toContain('px-(--dialog-px)')
    expect(classes).not.toContain('pt-(--dialog-px)')
  })

  // ── slots ───────────────────────────────────────────────────────────────────

  test('renders the start slot content', () => {
    const wrapper = mountHeader({}, { start: () => h('button', { 'data-testid': 'start-btn' }) })
    expect(
      wrapper.find('[data-testid="dialog-card-header__start"] [data-testid="start-btn"]').exists()
    ).toBe(true)
  })

  test('renders the end slot content', () => {
    const wrapper = mountHeader({}, { end: () => h('button', { 'data-testid': 'end-btn' }) })
    expect(
      wrapper.find('[data-testid="dialog-card-header__end"] [data-testid="end-btn"]').exists()
    ).toBe(true)
  })

  test('renders nothing in start/end slots when not provided', () => {
    const wrapper = mountHeader()
    expect(wrapper.find('[data-testid="dialog-card-header__start"]').text()).toBe('')
    expect(wrapper.find('[data-testid="dialog-card-header__end"]').text()).toBe('')
  })
})
