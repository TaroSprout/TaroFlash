import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const { studyStartMock } = vi.hoisted(() => ({ studyStartMock: vi.fn() }))

vi.mock('@/views/study-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: studyStartMock })
}))

vi.mock('@/utils/animations/dashboard-actions', () => ({
  actionsSwingBeforeEnter: vi.fn(),
  actionsSwingEnter: vi.fn((_el, done) => done?.()),
  actionsSwingLeave: vi.fn((_el, done) => done?.())
}))

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['iconLeft', 'size'],
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-button',
          onClick: () => emit('press')
        },
        [slots.default?.()]
      )
  }
})

import MemberSectionActionsPanel from '@/views/dashboard/member-section/actions-panel.vue'

function makeDeck(id, due_count = 1) {
  return { id, title: `Deck ${id}`, due_count }
}

function mount(props) {
  return shallowMount(MemberSectionActionsPanel, {
    props,
    global: { stubs: { UiButton: UiButtonStub } }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MemberSectionActionsPanel — visibility driven by open prop [obligation]', () => {
  test('does not render the panel when open is false', () => {
    const wrapper = mount({ due_decks: [makeDeck(1)], open: false })
    expect(wrapper.find('[data-testid="dashboard__actions-panel"]').exists()).toBe(false)
  })

  test('renders the panel when open is true', () => {
    const wrapper = mount({ due_decks: [makeDeck(1)], open: true })
    expect(wrapper.find('[data-testid="dashboard__actions-panel"]').exists()).toBe(true)
  })
})

describe('MemberSectionActionsPanel — study button label', () => {
  test('shows the single-deck study label when there is 1 due deck', () => {
    const wrapper = mount({ due_decks: [makeDeck(1)], open: true })
    expect(wrapper.text()).toContain('Study')
  })

  test('shows the study-all label when there are 3 or more due decks', () => {
    const wrapper = mount({ due_decks: [makeDeck(1), makeDeck(2), makeDeck(3)], open: true })
    expect(wrapper.text()).toContain('Study all')
  })
})

describe('MemberSectionActionsPanel — study button starts a session [obligation]', () => {
  test('pressing the study button calls useStudyModal().start with the full due_decks array', async () => {
    const due_decks = [makeDeck(1), makeDeck(2)]
    const wrapper = mount({ due_decks, open: true })

    await wrapper.find('[data-testid="dashboard__actions-panel"] button').trigger('click')

    expect(studyStartMock).toHaveBeenCalledWith(due_decks)
  })
})
