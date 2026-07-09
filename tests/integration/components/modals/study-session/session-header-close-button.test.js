import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import SessionHeaderCloseButton from '@/views/study-session/session-header-close-button.vue'

function mountButton(props = {}) {
  return mount(SessionHeaderCloseButton, { props })
}

describe('SessionHeaderCloseButton', () => {
  // ── is_cover: close vs stop button [obligation] ────────────────────────────

  test('renders the close button when is_cover is true [obligation]', () => {
    const wrapper = mountButton({ is_cover: true })
    expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(false)
  })

  test('renders the stop button when is_cover is false (default) [obligation]', () => {
    const wrapper = mountButton()
    expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(false)
  })

  // ── both variants emit "stop" [obligation] ────────────────────────────────

  test('close button (is_cover=true) emits "stop" on press [obligation]', async () => {
    const wrapper = mountButton({ is_cover: true })
    await wrapper.find('[data-testid="session-header__close"]').trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })

  test('stop button (is_cover=false) emits "stop" on press [obligation]', async () => {
    const wrapper = mountButton({ is_cover: false })
    await wrapper.find('[data-testid="session-header__stop"]').trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })
})
