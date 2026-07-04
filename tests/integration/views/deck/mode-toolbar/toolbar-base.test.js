import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import ToolbarBase from '@/views/deck/mode-toolbar/toolbar-base.vue'

describe('mode-toolbar/toolbar-base', () => {
  test('renders the fallback dot when no left slot is provided', () => {
    const wrapper = mount(ToolbarBase)
    expect(wrapper.find('[data-testid="mode-toolbar__left"]').exists()).toBe(false)
  })

  test('renders the left slot content when provided', () => {
    const wrapper = mount(ToolbarBase, {
      slots: { left: () => h('span', { 'data-testid': 'left-content' }, 'left') }
    })
    const left = wrapper.find('[data-testid="mode-toolbar__left"]')
    expect(left.exists()).toBe(true)
    expect(left.find('[data-testid="left-content"]').exists()).toBe(true)
  })

  test('does not render the right slot wrapper when no right slot is provided', () => {
    const wrapper = mount(ToolbarBase)
    expect(wrapper.find('[data-testid="mode-toolbar__right"]').exists()).toBe(false)
  })

  test('renders the right slot content when provided', () => {
    const wrapper = mount(ToolbarBase, {
      slots: { right: () => h('span', { 'data-testid': 'right-content' }, 'right') }
    })
    const right = wrapper.find('[data-testid="mode-toolbar__right"]')
    expect(right.exists()).toBe(true)
    expect(right.find('[data-testid="right-content"]').exists()).toBe(true)
  })

  test('always renders the divider', () => {
    const wrapper = mount(ToolbarBase)
    expect(wrapper.find('[data-testid="mode-toolbar__divider"]').exists()).toBe(true)
  })
})
