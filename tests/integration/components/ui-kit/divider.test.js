import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { h } from 'vue'
import UiDivider from '@/components/ui-kit/divider.vue'

function mountDivider(props = {}, slots = {}) {
  return shallowMount(UiDivider, { props, slots })
}

describe('UiDivider', () => {
  describe('structure', () => {
    test('renders the divider root element', () => {
      const wrapper = mountDivider()
      expect(wrapper.find('[data-testid="ui-kit-divider"]').exists()).toBe(true)
    })

    test('always renders a horizontal rule', () => {
      const wrapper = mountDivider()
      expect(wrapper.find('hr').exists()).toBe(true)
    })
  })

  describe('label prop', () => {
    test('renders the label text when provided', () => {
      const wrapper = mountDivider({ label: 'Or' })
      expect(wrapper.text()).toContain('Or')
    })

    test('renders a second hr alongside the label', () => {
      const wrapper = mountDivider({ label: 'Or' })
      expect(wrapper.findAll('hr')).toHaveLength(2)
    })

    test('does NOT render a second hr when label is absent', () => {
      const wrapper = mountDivider()
      expect(wrapper.findAll('hr')).toHaveLength(1)
    })
  })

  describe('dashed prop', () => {
    test('hr does not have border-dashed class when dashed is false', () => {
      const wrapper = mountDivider({ dashed: false })
      expect(wrapper.find('hr').attributes('class') ?? '').not.toContain('border-dashed')
    })
  })

  describe('start/end slots [obligation]', () => {
    test('renders content in the start slot to the left of the rule [obligation]', () => {
      const wrapper = mountDivider(
        {},
        { start: () => h('span', { 'data-testid': 'start-content' }, 'Left') }
      )
      expect(wrapper.find('[data-testid="start-content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="start-content"]').text()).toBe('Left')
    })

    test('renders content in the end slot to the right of the rule [obligation]', () => {
      const wrapper = mountDivider(
        {},
        { end: () => h('span', { 'data-testid': 'end-content' }, 'Right') }
      )
      expect(wrapper.find('[data-testid="end-content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="end-content"]').text()).toBe('Right')
    })

    test('renders both start and end slots simultaneously [obligation]', () => {
      const wrapper = mountDivider(
        {},
        {
          start: () => h('span', { 'data-testid': 'start-content' }, 'Left'),
          end: () => h('span', { 'data-testid': 'end-content' }, 'Right')
        }
      )
      expect(wrapper.find('[data-testid="start-content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="end-content"]').exists()).toBe(true)
    })

    test('label prop still works alongside empty start/end slots', () => {
      const wrapper = mountDivider({ label: 'Or' })
      expect(wrapper.text()).toContain('Or')
      expect(wrapper.findAll('hr')).toHaveLength(2)
    })
  })
})
