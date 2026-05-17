import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

import UiTag from '@/components/ui-kit/tag.vue'

describe('ui-kit/tag', () => {
  test('renders default slot content', () => {
    const wrapper = mount(UiTag, { slots: { default: 'hello' } })
    expect(wrapper.text()).toBe('hello')
  })

  test('right-notched (default) uses pl-4 + pr-5 padding bias', () => {
    const wrapper = mount(UiTag, { slots: { default: 'x' } })
    const classes = wrapper.find('[data-testid="ui-kit-tag"]').classes()
    expect(classes).toContain('pl-4')
    expect(classes).toContain('pr-5')
  })

  test('left-notched flips padding to pl-5 + pr-4', () => {
    const wrapper = mount(UiTag, { props: { notchSide: 'left' }, slots: { default: 'x' } })
    const classes = wrapper.find('[data-testid="ui-kit-tag"]').classes()
    expect(classes).toContain('pl-5')
    expect(classes).toContain('pr-4')
  })

  test('applies the mask style for the chosen notch side', () => {
    const right = mount(UiTag, { slots: { default: 'x' } })
    const left = mount(UiTag, { props: { notchSide: 'left' }, slots: { default: 'x' } })
    expect(right.find('[data-testid="ui-kit-tag"]').attributes('style')).toContain('mask')
    expect(left.find('[data-testid="ui-kit-tag"]').attributes('style')).toContain('mask')
    // both render a non-empty mask but the geometry differs
    const rMask = right.find('[data-testid="ui-kit-tag"]').attributes('style')
    const lMask = left.find('[data-testid="ui-kit-tag"]').attributes('style')
    expect(rMask).not.toBe(lMask)
  })
})
