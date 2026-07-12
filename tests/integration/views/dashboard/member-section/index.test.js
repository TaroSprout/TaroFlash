import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const showDashboardActionsRef = ref(false)

vi.mock('@/composables/storage/local-ref', () => ({
  useLocalRef: () => showDashboardActionsRef
}))

const BadgeStub = defineComponent({
  name: 'MemberSectionBadge',
  props: ['due_decks', 'show_expand_button'],
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'member-section-badge',
        'data-show-expand-button': String(!!props.show_expand_button),
        onClick: () => emit('click')
      })
  }
})

const ActionsPanelStub = defineComponent({
  name: 'MemberSectionActionsPanel',
  props: ['due_decks', 'open'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'member-section-actions-panel',
        'data-open': String(!!props.open)
      })
  }
})

import MemberSection from '@/views/dashboard/member-section/index.vue'

function makeDeck(id, due_count = 0) {
  return { id, title: `Deck ${id}`, due_count }
}

function mount(props) {
  return shallowMount(MemberSection, {
    props,
    global: {
      stubs: { MemberSectionBadge: BadgeStub, MemberSectionActionsPanel: ActionsPanelStub }
    }
  })
}

beforeEach(() => {
  showDashboardActionsRef.value = false
})

describe('MemberSection — show_expand_button computed from local state and due_decks', () => {
  test('passes show_expand_button=true when actions are collapsed and there are due decks', () => {
    const wrapper = mount({ due_decks: [makeDeck(1, 3)] })
    expect(
      wrapper.find('[data-testid="member-section-badge"]').attributes('data-show-expand-button')
    ).toBe('true')
  })

  test('passes show_expand_button=false when there are no due decks', () => {
    const wrapper = mount({ due_decks: [] })
    expect(
      wrapper.find('[data-testid="member-section-badge"]').attributes('data-show-expand-button')
    ).toBe('false')
  })

  test('passes show_expand_button=false when actions are already expanded', () => {
    showDashboardActionsRef.value = true
    const wrapper = mount({ due_decks: [makeDeck(1, 3)] })
    expect(
      wrapper.find('[data-testid="member-section-badge"]').attributes('data-show-expand-button')
    ).toBe('false')
  })
})

describe('MemberSection — binder rings visibility', () => {
  test('renders binder rings when actions are open and there are due decks', () => {
    showDashboardActionsRef.value = true
    const wrapper = mount({ due_decks: [makeDeck(1, 3)] })
    expect(wrapper.find('[data-testid="dashboard__binder-rings"]').exists()).toBe(true)
  })

  test('does not render binder rings when there are no due decks', () => {
    showDashboardActionsRef.value = true
    const wrapper = mount({ due_decks: [] })
    expect(wrapper.find('[data-testid="dashboard__binder-rings"]').exists()).toBe(false)
  })
})

describe('MemberSection — onBadgeClick toggles show_dashboard_actions', () => {
  test('clicking the badge with due decks toggles show_dashboard_actions to true', async () => {
    const wrapper = mount({ due_decks: [makeDeck(1, 3)] })
    await wrapper.find('[data-testid="member-section-badge"]').trigger('click')
    expect(showDashboardActionsRef.value).toBe(true)
  })

  test('clicking the badge with no due decks does not flip show_dashboard_actions', async () => {
    const wrapper = mount({ due_decks: [] })
    await wrapper.find('[data-testid="member-section-badge"]').trigger('click')
    expect(showDashboardActionsRef.value).toBe(false)
  })
})

describe('MemberSection — actions panel open forwarding', () => {
  test('forwards open=true to the actions panel when show_dashboard_actions is true and there are due decks', () => {
    showDashboardActionsRef.value = true
    const wrapper = mount({ due_decks: [makeDeck(1, 3)] })
    expect(
      wrapper.find('[data-testid="member-section-actions-panel"]').attributes('data-open')
    ).toBe('true')
  })

  test('forwards open=false to the actions panel when there are no due decks even if flag is true', () => {
    showDashboardActionsRef.value = true
    const wrapper = mount({ due_decks: [] })
    expect(
      wrapper.find('[data-testid="member-section-actions-panel"]').attributes('data-open')
    ).toBe('false')
  })
})
