import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import SessionComplete from '@/components/study-session/session-complete.vue'

function makeSessionComplete(score, total, close = () => {}) {
  return mount(SessionComplete, {
    props: { score, total, secondary_action: 'study-again', close }
  })
}

describe('SessionComplete', () => {
  // ── Heading ──────────────────────────────────────────────────────────────────

  describe('heading', () => {
    test('shows "Perfect!" at 100%', () => {
      const wrapper = makeSessionComplete(5, 5)
      expect(wrapper.find('[data-testid="session-complete__heading"]').text()).toBe('Perfect!')
    })

    test('shows "Great job!" at 80%', () => {
      const wrapper = makeSessionComplete(4, 5)
      expect(wrapper.find('[data-testid="session-complete__heading"]').text()).toBe('Great job!')
    })

    test('shows "Great job!" at exactly 80%', () => {
      const wrapper = makeSessionComplete(8, 10)
      expect(wrapper.find('[data-testid="session-complete__heading"]').text()).toBe('Great job!')
    })

    test('shows "Nice work!" at 60%', () => {
      const wrapper = makeSessionComplete(6, 10)
      expect(wrapper.find('[data-testid="session-complete__heading"]').text()).toBe('Nice work!')
    })

    test('shows "Nice work!" at exactly 60%', () => {
      const wrapper = makeSessionComplete(3, 5)
      expect(wrapper.find('[data-testid="session-complete__heading"]').text()).toBe('Nice work!')
    })

    test('shows "Keep it up!" below 60%', () => {
      const wrapper = makeSessionComplete(2, 5)
      expect(wrapper.find('[data-testid="session-complete__heading"]').text()).toBe('Keep it up!')
    })

    test('shows "Keep it up!" at 0%', () => {
      const wrapper = makeSessionComplete(0, 5)
      expect(wrapper.find('[data-testid="session-complete__heading"]').text()).toBe('Keep it up!')
    })

    test('shows "Keep it up!" when total is 0', () => {
      // total=0 → percentage=0 → "Keep it up!"
      const wrapper = makeSessionComplete(0, 0)
      expect(wrapper.find('[data-testid="session-complete__heading"]').text()).toBe('Keep it up!')
    })
  })

  // ── Score display ─────────────────────────────────────────────────────────────

  test('displays score', () => {
    const wrapper = makeSessionComplete(7, 10)
    expect(wrapper.text()).toContain('7')
  })

  test('displays total', () => {
    const wrapper = makeSessionComplete(7, 10)
    expect(wrapper.text()).toContain('10')
  })

  // ── Done button ───────────────────────────────────────────────────────────────

  test('calls close prop when Done button is clicked', async () => {
    const close = vi.fn()
    const wrapper = makeSessionComplete(3, 5, close)
    await wrapper.find('[data-testid="session-complete__close"]').trigger('click')
    expect(close).toHaveBeenCalledOnce()
  })

  test('Done button calls close with no secondary_action', async () => {
    const close = vi.fn()
    const wrapper = makeSessionComplete(3, 5, close)
    await wrapper.find('[data-testid="session-complete__close"]').trigger('click')
    expect(close).toHaveBeenCalledWith()
  })

  // ── Secondary button ──────────────────────────────────────────────────────────

  describe('secondary button', () => {
    test('calls close with the secondary_action when clicked', async () => {
      const close = vi.fn()
      const wrapper = mount(SessionComplete, {
        props: { score: 3, total: 5, secondary_action: 'study-more', close }
      })
      await wrapper.find('[data-testid="session-complete__secondary"]').trigger('click')
      expect(close).toHaveBeenCalledOnce()
      expect(close).toHaveBeenCalledWith('study-more')
    })

    test('label reflects the "study-again" secondary action', () => {
      const wrapper = mount(SessionComplete, {
        props: { score: 3, total: 5, secondary_action: 'study-again', close: () => {} }
      })
      expect(wrapper.find('[data-testid="session-complete__secondary"]').text()).toBe('Study again')
    })

    test('label reflects the "study-more" secondary action', () => {
      const wrapper = mount(SessionComplete, {
        props: { score: 3, total: 5, secondary_action: 'study-more', close: () => {} }
      })
      expect(wrapper.find('[data-testid="session-complete__secondary"]').text()).toBe('Study more')
    })

    test('label reflects the "study-all" secondary action', () => {
      const wrapper = mount(SessionComplete, {
        props: { score: 3, total: 5, secondary_action: 'study-all', close: () => {} }
      })
      expect(wrapper.find('[data-testid="session-complete__secondary"]').text()).toBe('Study all')
    })
  })
})
