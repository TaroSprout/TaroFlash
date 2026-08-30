import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import SummarySelectButton from '@/views/study-session/session-summary/summary-select-button.vue'

const mounted_wrappers = []

function mountButton(props = {}) {
  const wrapper = mount(SummarySelectButton, { props })
  mounted_wrappers.push(wrapper)
  return wrapper
}

function hover(el) {
  el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
}

describe('SummarySelectButton', () => {
  // A hovered icon-only button Teleports its tooltip label to document.body —
  // leave a stale hover mounted and it leaks into the next test.
  afterEach(() => {
    while (mounted_wrappers.length > 0) mounted_wrappers.pop().unmount()
  })

  test('renders the select button', () => {
    const wrapper = mountButton()
    expect(wrapper.find('[data-testid="session-summary__select-button"]').exists()).toBe(true)
  })

  test('defaults to not-selecting (data-check icon, "Select" tooltip)', async () => {
    const wrapper = mountButton()
    const button = wrapper.find('[data-testid="session-summary__select-button"]')
    hover(button.element)
    await wrapper.vm.$nextTick()

    const tooltip = document.querySelector('[data-testid="ui-tooltip"]')
    expect(tooltip?.textContent).toContain('Select')
  })

  test('is_selecting=true shows the "Done" tooltip instead', async () => {
    const wrapper = mountButton({ is_selecting: true })
    const button = wrapper.find('[data-testid="session-summary__select-button"]')
    hover(button.element)
    await wrapper.vm.$nextTick()

    const tooltip = document.querySelector('[data-testid="ui-tooltip"]')
    expect(tooltip?.textContent).toContain('Done')
    expect(tooltip?.textContent).not.toContain('Select')
  })

  test('emits "press" on click regardless of is_selecting', async () => {
    const wrapper = mountButton({ is_selecting: true })
    await wrapper.find('[data-testid="session-summary__select-button"]').trigger('click')
    expect(wrapper.emitted('press')).toHaveLength(1)
  })
})
