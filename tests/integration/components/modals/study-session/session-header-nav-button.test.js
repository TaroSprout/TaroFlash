import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import SessionHeaderNavButton from '@/views/study-session/session-header-nav-button.vue'

const mounted_wrappers = []

function mountButton(props = {}) {
  const wrapper = mount(SessionHeaderNavButton, { props })
  mounted_wrappers.push(wrapper)
  return wrapper
}

function hover(el) {
  el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
}

describe('SessionHeaderNavButton', () => {
  // A hovered icon-only button Teleports its tooltip label to document.body;
  // leaving a wrapper mounted (hover state never resets) leaks that node into
  // the next test, so every wrapper is unmounted between tests.
  afterEach(() => {
    while (mounted_wrappers.length > 0) mounted_wrappers.pop().unmount()
  })

  // ── mode → matching data-testid ──────────────────────────────

  test('mode="close" renders session-header__close only', () => {
    const wrapper = mountButton({ mode: 'close' })
    expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="session-header__back"]').exists()).toBe(false)
  })

  test('mode="stop" renders session-header__stop only', () => {
    const wrapper = mountButton({ mode: 'stop' })
    expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="session-header__back"]').exists()).toBe(false)
  })

  test('mode="back" renders session-header__back only', () => {
    const wrapper = mountButton({ mode: 'back' })
    expect(wrapper.find('[data-testid="session-header__back"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(false)
  })

  test('defaults to "stop" when no mode prop is given', () => {
    const wrapper = mountButton()
    expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(true)
  })

  // ── every mode emits a single "press" ────────────────────────

  test('mode="close" emits "press" on click', async () => {
    const wrapper = mountButton({ mode: 'close' })
    await wrapper.find('[data-testid="session-header__close"]').trigger('click')
    expect(wrapper.emitted('press')).toHaveLength(1)
  })

  test('mode="stop" emits "press" on click', async () => {
    const wrapper = mountButton({ mode: 'stop' })
    await wrapper.find('[data-testid="session-header__stop"]').trigger('click')
    expect(wrapper.emitted('press')).toHaveLength(1)
  })

  test('mode="back" emits "press" on click', async () => {
    const wrapper = mountButton({ mode: 'back' })
    await wrapper.find('[data-testid="session-header__back"]').trigger('click')
    expect(wrapper.emitted('press')).toHaveLength(1)
  })

  // ── icon-only tooltip label text ───────────────────────────────────────────
  // close/back render icon-only, so their label only mounts into the tooltip
  // on hover — hover to exercise the translated label text.

  test('mode="close" tooltip shows the translated close label on hover', async () => {
    const wrapper = mountButton({ mode: 'close' })
    hover(wrapper.find('[data-testid="session-header__close"]').element)
    await wrapper.vm.$nextTick()

    const tooltip = document.querySelector('[data-testid="ui-tooltip"]')
    expect(tooltip?.textContent).toContain('Close')
  })

  test('mode="back" tooltip shows the translated back label on hover', async () => {
    const wrapper = mountButton({ mode: 'back' })
    hover(wrapper.find('[data-testid="session-header__back"]').element)
    await wrapper.vm.$nextTick()

    const tooltip = document.querySelector('[data-testid="ui-tooltip"]')
    expect(tooltip?.textContent).toContain('Back')
  })
})
