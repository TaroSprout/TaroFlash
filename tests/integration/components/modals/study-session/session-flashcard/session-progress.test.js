import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionProgress from '@/views/study-session/session-studying/session-progress.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// session-progress.vue no longer takes editing/saving/is_cover/reviewed/total
// as props — it reads editing/saving/is_cover/current_index/cards off the
// injected StudySessionController; `total` is derived locally from cards.length.

const { editing, saving, is_cover, current_index, cards } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    editing: ref(false),
    saving: ref(false),
    is_cover: ref(false),
    current_index: ref(0),
    cards: ref([])
  }
})

vi.mock('@/views/study-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => ({ editing, saving, is_cover, current_index, cards })
}))

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

function mountProgress({ reviewed = 0, total = 50, ...overrides } = {}) {
  capturedBarProps = {}
  editing.value = overrides.editing ?? false
  saving.value = overrides.saving ?? false
  is_cover.value = overrides.is_cover ?? false
  current_index.value = reviewed
  cards.value = Array.from({ length: total })

  return mount(SessionProgress, {
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
  beforeEach(() => {
    editing.value = false
    saving.value = false
    is_cover.value = false
    current_index.value = 0
    cards.value = []
  })

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

    test('bar label is "current_index/total" — "0/50" when current_index=0 [obligation]', () => {
      mountProgress({ editing: false, reviewed: 0, total: 50 })
      expect(capturedBarProps.label).toBe('0/50')
    })

    test('bar label reflects the current_index', () => {
      mountProgress({ editing: false, reviewed: 10, total: 50 })
      expect(capturedBarProps.label).toBe('10/50')
    })

    test('bar :value is current_index', () => {
      mountProgress({ editing: false, reviewed: 7, total: 50 })
      expect(capturedBarProps.value).toBe(7)
    })

    test('bar :max is cards.length', () => {
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

  // ── editing=false, is_cover crossfade [obligation] ─────────────────────────

  describe('editing=false: is_cover crossfade between studying-count and progress bar', () => {
    test('is_cover=true shows the studying-count label as opaque [obligation]', () => {
      const wrapper = mountProgress({ editing: false, is_cover: true })
      const label = wrapper.find('[data-testid="study-session__studying-count"]')
      expect(label.classes()).toContain('opacity-100')
    })

    test('is_cover=true shows the pluralized studying-count for the total [obligation]', () => {
      const wrapper = mountProgress({ editing: false, is_cover: true, total: 1 })
      expect(wrapper.find('[data-testid="study-session__studying-count"]').text()).toBe(
        'Studying 1 Card'
      )
    })

    test('is_cover=true shows the pluralized studying-count for multiple cards [obligation]', () => {
      const wrapper = mountProgress({ editing: false, is_cover: true, total: 50 })
      expect(wrapper.find('[data-testid="study-session__studying-count"]').text()).toBe(
        'Studying 50 Cards'
      )
    })

    test('is_cover=true fades out the progress bar but keeps it mounted in the DOM [obligation]', () => {
      const wrapper = mountProgress({ editing: false, is_cover: true })
      const bar = wrapper.find('[data-testid="progress-bar-stub"]')
      expect(bar.exists()).toBe(true)
      expect(bar.classes()).toContain('opacity-0')
    })

    test('is_cover=false shows the progress bar as opaque [obligation]', () => {
      const wrapper = mountProgress({ editing: false, is_cover: false, reviewed: 10, total: 50 })
      const bar = wrapper.find('[data-testid="progress-bar-stub"]')
      expect(bar.exists()).toBe(true)
      expect(bar.classes()).toContain('opacity-100')
    })

    test('is_cover=false fades out the studying-count label but keeps it mounted in the DOM [obligation]', () => {
      const wrapper = mountProgress({ editing: false, is_cover: false })
      const label = wrapper.find('[data-testid="study-session__studying-count"]')
      expect(label.exists()).toBe(true)
      expect(label.classes()).toContain('opacity-0')
    })

    test('the progress bar carries the blue-500 theme', () => {
      const wrapper = mountProgress({ editing: false, is_cover: false })
      expect(wrapper.find('[data-testid="progress-bar-stub"]').attributes('data-theme')).toBe(
        'blue-500'
      )
    })
  })
})
