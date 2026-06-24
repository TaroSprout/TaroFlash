import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import UiProgressBar from '@/components/ui-kit/progress-bar.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountBar(props = {}) {
  return mount(UiProgressBar, { props: { value: 0, ...props } })
}

function fillWidth(wrapper) {
  return wrapper.find('[data-testid="ui-kit-progress-bar__fill"]').element.style.width
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UiProgressBar', () => {
  // ── Fill width — clamp(value/max) as percent [obligation] ─────────────────

  describe('fill width [obligation]', () => {
    test('value=0 → fill width is "0%" [obligation]', () => {
      const wrapper = mountBar({ value: 0, max: 100 })
      expect(fillWidth(wrapper)).toBe('0%')
    })

    test('value=max → fill width is "100%" [obligation]', () => {
      const wrapper = mountBar({ value: 50, max: 50 })
      expect(fillWidth(wrapper)).toBe('100%')
    })

    test('value > max → fill width is clamped to "100%" [obligation]', () => {
      const wrapper = mountBar({ value: 200, max: 50 })
      expect(fillWidth(wrapper)).toBe('100%')
    })

    test('max <= 0 → fill width is "0%" [obligation]', () => {
      const wrapper = mountBar({ value: 10, max: 0 })
      expect(fillWidth(wrapper)).toBe('0%')
    })

    test('partial 30/50 → fill width is "60%" [obligation]', () => {
      const wrapper = mountBar({ value: 30, max: 50 })
      expect(fillWidth(wrapper)).toBe('60%')
    })

    test('max defaults to 100 when not provided', () => {
      const wrapper = mountBar({ value: 25 })
      expect(fillWidth(wrapper)).toBe('25%')
    })
  })

  // ── Label in both layers [obligation] ─────────────────────────────────────

  describe('label dual-layer [obligation]', () => {
    test('label text appears in ui-kit-progress-bar__label [obligation]', () => {
      const wrapper = mountBar({ value: 30, max: 50, label: '30/50' })
      expect(wrapper.find('[data-testid="ui-kit-progress-bar__label"]').text()).toBe('30/50')
    })

    test('label text appears in ui-kit-progress-bar__label-fill [obligation]', () => {
      const wrapper = mountBar({ value: 30, max: 50, label: '30/50' })
      expect(wrapper.find('[data-testid="ui-kit-progress-bar__label-fill"]').text()).toBe('30/50')
    })

    test('neither label layer renders when label prop is omitted', () => {
      const wrapper = mountBar({ value: 30, max: 50 })
      expect(wrapper.find('[data-testid="ui-kit-progress-bar__label"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="ui-kit-progress-bar__label-fill"]').exists()).toBe(false)
    })
  })

  // ── ARIA attributes ────────────────────────────────────────────────────────

  describe('aria attributes', () => {
    test('root has role=progressbar', () => {
      const wrapper = mountBar({ value: 40, max: 100 })
      expect(wrapper.find('[data-testid="ui-kit-progress-bar"]').attributes('role')).toBe(
        'progressbar'
      )
    })

    test('aria-valuenow reflects value prop', () => {
      const wrapper = mountBar({ value: 40, max: 100 })
      expect(wrapper.find('[data-testid="ui-kit-progress-bar"]').attributes('aria-valuenow')).toBe(
        '40'
      )
    })

    test('aria-valuemax reflects max prop', () => {
      const wrapper = mountBar({ value: 40, max: 80 })
      expect(wrapper.find('[data-testid="ui-kit-progress-bar"]').attributes('aria-valuemax')).toBe(
        '80'
      )
    })
  })
})
