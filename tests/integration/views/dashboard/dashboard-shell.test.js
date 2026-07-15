import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import DashboardShell from '@/views/dashboard/dashboard-shell.vue'

function mountShell(slots) {
  return mount(DashboardShell, { slots })
}

describe('DashboardShell (views/dashboard/dashboard-shell.vue)', () => {
  test('renders the left slot content inside the left column', () => {
    const wrapper = mountShell({ left: () => h('div', { 'data-testid': 'left-content' }) })
    const left_column = wrapper.find('[data-testid="dashboard-shell__left-column"]')
    expect(left_column.find('[data-testid="left-content"]').exists()).toBe(true)
  })

  test('renders the right slot content inside the right column', () => {
    const wrapper = mountShell({ right: () => h('div', { 'data-testid': 'right-content' }) })
    const right_column = wrapper.find('[data-testid="dashboard-shell__right-column"]')
    expect(right_column.find('[data-testid="right-content"]').exists()).toBe(true)
  })

  test('left slot content does not leak into the right column', () => {
    const wrapper = mountShell({ left: () => h('div', { 'data-testid': 'left-content' }) })
    const right_column = wrapper.find('[data-testid="dashboard-shell__right-column"]')
    expect(right_column.find('[data-testid="left-content"]').exists()).toBe(false)
  })
})
