import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionProgress from '@/components/study-session/session-flashcard/session-progress.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Captures the last-rendered props so tests can inspect value/max/label.
let capturedBarProps = {}

const ProgressBarStub = defineComponent({
  name: 'UiProgressBar',
  props: ['value', 'max', 'label'],
  setup(props) {
    capturedBarProps = { ...props }
    return () => h('div', { 'data-testid': 'progress-bar-stub' }, props.label ?? '')
  }
})

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountProgress(props = {}) {
  capturedBarProps = {}
  return mount(SessionProgress, {
    props: {
      editing: false,
      saving: false,
      reviewed: 0,
      total: 50,
      ...props
    },
    global: {
      stubs: {
        UiProgressBar: ProgressBarStub,
        UiIcon: UiIconStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionProgress', () => {
  // ── editing=false: renders progress bar [obligation] ──────────────────────

  describe('editing=false: progress bar shown', () => {
    test('renders the progress bar when editing is false [obligation]', () => {
      const wrapper = mountProgress({ editing: false, reviewed: 0, total: 50 })
      expect(wrapper.find('[data-testid="progress-bar-stub"]').exists()).toBe(true)
    })

    test('does not render save-status when editing is false', () => {
      const wrapper = mountProgress({ editing: false })
      expect(wrapper.find('[data-testid="study-session__save-status"]').exists()).toBe(false)
    })

    test('bar label is "reviewed/total" — "0/50" when reviewed=0 [obligation]', () => {
      mountProgress({ editing: false, reviewed: 0, total: 50 })
      expect(capturedBarProps.label).toBe('0/50')
    })

    test('bar label reflects current reviewed count', () => {
      mountProgress({ editing: false, reviewed: 10, total: 50 })
      expect(capturedBarProps.label).toBe('10/50')
    })

    test('bar :value is reviewed', () => {
      mountProgress({ editing: false, reviewed: 7, total: 50 })
      expect(capturedBarProps.value).toBe(7)
    })

    test('bar :max is total', () => {
      mountProgress({ editing: false, reviewed: 0, total: 50 })
      expect(capturedBarProps.max).toBe(50)
    })
  })

  // ── editing=true: renders save-status [obligation] ────────────────────────

  describe('editing=true: save-status shown', () => {
    test('renders save-status region when editing is true [obligation]', () => {
      const wrapper = mountProgress({ editing: true, saving: false })
      expect(wrapper.find('[data-testid="study-session__save-status"]').exists()).toBe(true)
    })

    test('does not render progress bar when editing is true [obligation]', () => {
      const wrapper = mountProgress({ editing: true })
      expect(wrapper.find('[data-testid="progress-bar-stub"]').exists()).toBe(false)
    })

    test('shows loading-dots icon when saving is true', () => {
      const wrapper = mountProgress({ editing: true, saving: true })
      expect(wrapper.find('[data-testid="ui-icon"]').attributes('data-src')).toBe('loading-dots')
    })

    test('shows check icon when saving is false', () => {
      const wrapper = mountProgress({ editing: true, saving: false })
      expect(wrapper.find('[data-testid="ui-icon"]').attributes('data-src')).toBe('check')
    })

    test('save-status contains saving text when saving', () => {
      const wrapper = mountProgress({ editing: true, saving: true })
      expect(wrapper.find('[data-testid="study-session__save-status"]').text()).toContain('Saving')
    })

    test('save-status contains saved text when not saving', () => {
      const wrapper = mountProgress({ editing: true, saving: false })
      expect(wrapper.find('[data-testid="study-session__save-status"]').text()).toContain('Saved')
    })
  })
})
