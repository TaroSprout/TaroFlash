import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import DashboardActionsPanelShell from '@/views/dashboard/actions-panel/shell.vue'

function mountShell(props, slots) {
  return mount(DashboardActionsPanelShell, { props, slots })
}

describe('DashboardActionsPanelShell (views/dashboard/actions-panel/shell.vue)', () => {
  test('renders the polaroid slot content', () => {
    const wrapper = mountShell(
      {},
      { polaroid: () => h('div', { 'data-testid': 'polaroid-content' }) }
    )
    expect(wrapper.find('[data-testid="polaroid-content"]').exists()).toBe(true)
  })

  test('renders the header slot content inside the header wrapper', () => {
    const wrapper = mountShell({}, { header: () => h('div', { 'data-testid': 'header-content' }) })
    const header = wrapper.find('[data-testid="dashboard-actions-panel-shell__header"]')
    expect(header.find('[data-testid="header-content"]').exists()).toBe(true)
  })

  test('renders the body slot content inside the body wrapper', () => {
    const wrapper = mountShell({}, { body: () => h('div', { 'data-testid': 'body-content' }) })
    const body = wrapper.find('[data-testid="dashboard-actions-panel-shell__body"]')
    expect(body.find('[data-testid="body-content"]').exists()).toBe(true)
  })

  test('applies the static shape classes on the body wrapper', () => {
    const wrapper = mountShell()
    const body = wrapper.find('[data-testid="dashboard-actions-panel-shell__body"]')
    expect(body.classes()).toEqual(
      expect.arrayContaining(['cloud-top-[40px]', 'rounded-b-8', 'flex', 'flex-col'])
    )
  })

  test('merges body_class onto the body wrapper alongside the static shape classes', () => {
    const wrapper = mountShell({ body_class: 'bg-brown-300 dark:bg-stone-900' })
    const body = wrapper.find('[data-testid="dashboard-actions-panel-shell__body"]')
    expect(body.classes()).toEqual(
      expect.arrayContaining(['cloud-top-[40px]', 'rounded-b-8', 'bg-brown-300'])
    )
  })

  test('omitting body_class does not error and still applies the static shape classes', () => {
    const wrapper = mountShell({})
    const body = wrapper.find('[data-testid="dashboard-actions-panel-shell__body"]')
    expect(body.classes()).toContain('cloud-top-[40px]')
  })
})
