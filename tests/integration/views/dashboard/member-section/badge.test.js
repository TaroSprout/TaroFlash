import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({
    display_name: 'Test User',
    description: 'Learner',
    cover: { theme: 'green-500', theme_dark: 'green-800', pattern: 'bank-note' }
  })
}))

const MemberBadgeStub = defineComponent({
  name: 'MemberBadge',
  props: ['displayName', 'description', 'sfx', 'cover'],
  emits: ['click'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'member-badge',
          onClick: () => emit('click')
        },
        [slots.actions?.()]
      )
  }
})

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup() {
    return () => h('span', { 'data-testid': 'ui-icon' })
  }
})

import MemberSectionBadge from '@/views/dashboard/member-section/badge.vue'

function mount(props) {
  return shallowMount(MemberSectionBadge, {
    props,
    global: { stubs: { MemberBadge: MemberBadgeStub, UiIcon: UiIconStub } }
  })
}

describe('MemberSectionBadge — expand button visibility [obligation]', () => {
  test('renders the expand button when show_expand_button is true', () => {
    const wrapper = mount({ due_decks: [], show_expand_button: true })
    expect(wrapper.find('[data-testid="member-badge__expand-button"]').exists()).toBe(true)
  })

  test('does not render the expand button when show_expand_button is false', () => {
    const wrapper = mount({ due_decks: [{ id: 1, due_count: 3 }], show_expand_button: false })
    expect(wrapper.find('[data-testid="member-badge__expand-button"]').exists()).toBe(false)
  })
})

describe('MemberSectionBadge — click emit', () => {
  test('clicking the badge emits click', async () => {
    const wrapper = mount({ due_decks: [], show_expand_button: false })
    await wrapper.find('[data-testid="member-badge"]').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
