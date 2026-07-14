import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const { memberCoverRef } = vi.hoisted(() => ({ memberCoverRef: { avatar: undefined } }))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({
    get cover() {
      return memberCoverRef
    }
  })
}))

const AvatarImageStub = defineComponent({
  name: 'AvatarImage',
  props: { avatar: { type: String, default: undefined } },
  setup(props) {
    return () => h('div', { 'data-testid': 'avatar-image-stub', 'data-avatar': props.avatar ?? '' })
  }
})

import DashboardActionsPanelPolaroid from '@/views/dashboard/actions-panel/polaroid.vue'

function mountPolaroid() {
  return shallowMount(DashboardActionsPanelPolaroid, {
    global: { stubs: { AvatarImage: AvatarImageStub } }
  })
}

beforeEach(() => {
  memberCoverRef.avatar = undefined
})

describe('DashboardActionsPanelPolaroid', () => {
  test('renders the polaroid frame and photo placeholder', () => {
    const wrapper = mountPolaroid()
    expect(wrapper.find('[data-testid="dashboard-actions-panel__polaroid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dashboard-actions-panel__polaroid-photo"]').exists()).toBe(
      true
    )
  })

  test('renders the avatar image read-only, sourced from member_store.cover.avatar [obligation]', () => {
    memberCoverRef.avatar = 'panda'
    const wrapper = mountPolaroid()
    expect(wrapper.find('[data-testid="avatar-image-stub"]').attributes('data-avatar')).toBe(
      'panda'
    )
  })

  test('has no edit button or interactive element for the avatar [obligation]', () => {
    memberCoverRef.avatar = 'panda'
    const wrapper = mountPolaroid()
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
