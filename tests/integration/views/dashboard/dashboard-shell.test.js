import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createApp, h } from 'vue'
import DashboardShell from '@/views/dashboard/dashboard-shell.vue'
import { providePageAnchor } from '@/views/app-shell/composables/page-anchor'

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

  // [obligation] the shell caps its own content narrower than the page column
  // on wide viewports, so it claims the page anchor for the scrollbar to
  // follow it rather than stranding the bar out at the window edge.
  test('[obligation] claims the page anchor with its own root element', async () => {
    let anchor

    const app = createApp({
      setup() {
        anchor = providePageAnchor()
        return () => h(DashboardShell)
      }
    })

    const el = document.createElement('div')
    document.body.appendChild(el)
    app.mount(el)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(anchor.inset.value).not.toBeNull()

    app.unmount()
    el.remove()
  })
})
