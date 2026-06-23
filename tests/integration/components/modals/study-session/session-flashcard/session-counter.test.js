import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionCounter from '@/components/study-session/session-flashcard/session-counter.vue'

// ── UiIcon stub ───────────────────────────────────────────────────────────────

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: { src: String },
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountCounter(props) {
  return mount(SessionCounter, {
    props: { editing: false, saving: false, current_index: 0, total: 5, is_cover: false, ...props },
    global: { stubs: { UiIcon: UiIconStub } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionCounter', () => {
  // ── Normal display ──────────────────────────────────────────────────────────

  test('shows current_index + 1 / total when not editing', () => {
    const wrapper = mountCounter({ current_index: 0, total: 5 })

    const counter = wrapper.find('[data-testid="study-session__counter"]')
    expect(counter.text()).toContain('1')
    expect(counter.text()).toContain('5')
  })

  test('shows correct index for mid-session card', () => {
    const wrapper = mountCounter({ current_index: 2, total: 5 })

    const counter = wrapper.find('[data-testid="study-session__counter"]')
    expect(counter.text()).toContain('3')
    expect(counter.text()).toContain('5')
  })

  // ── Invisible when is_cover [obligation] ────────────────────────────────────

  test('root element is invisible when is_cover is true [obligation]', () => {
    const wrapper = mountCounter({ is_cover: true })

    const counter = wrapper.find('[data-testid="study-session__counter"]')
    expect(counter.classes()).toContain('invisible')
  })

  test('root element is visible when is_cover is false', () => {
    const wrapper = mountCounter({ is_cover: false })

    const counter = wrapper.find('[data-testid="study-session__counter"]')
    expect(counter.classes()).not.toContain('invisible')
  })

  // ── Editing state ───────────────────────────────────────────────────────────

  test('shows saving status when editing and saving is true [obligation]', () => {
    const wrapper = mountCounter({ editing: true, saving: true })

    expect(wrapper.find('[data-testid="study-session__save-status"]').exists()).toBe(true)
    // The count display should not be shown when editing
    const counter = wrapper.find('[data-testid="study-session__counter"]')
    expect(counter.text()).not.toMatch(/\d+\//)
  })

  test('shows saved status when editing and saving is false [obligation]', () => {
    const wrapper = mountCounter({ editing: true, saving: false })

    expect(wrapper.find('[data-testid="study-session__save-status"]').exists()).toBe(true)
  })

  test('does not show save-status when not editing', () => {
    const wrapper = mountCounter({ editing: false })

    expect(wrapper.find('[data-testid="study-session__save-status"]').exists()).toBe(false)
  })

  test('shows saving icon (loading-dots) when editing and saving', () => {
    const wrapper = mountCounter({ editing: true, saving: true })

    const icon = wrapper.find('[data-testid="ui-icon"]')
    expect(icon.attributes('data-src')).toBe('loading-dots')
  })

  test('shows check icon when editing and not saving', () => {
    const wrapper = mountCounter({ editing: true, saving: false })

    const icon = wrapper.find('[data-testid="ui-icon"]')
    expect(icon.attributes('data-src')).toBe('check')
  })
})
