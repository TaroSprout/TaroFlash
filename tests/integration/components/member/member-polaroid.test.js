import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MemberPolaroid from '@/components/member/member-polaroid.vue'
import AvatarImageReal from '@/components/member/avatar-image.vue'

const { mockLoadAvatarUrl } = vi.hoisted(() => ({ mockLoadAvatarUrl: vi.fn() }))

vi.mock('@/components/member/avatars', () => ({
  loadAvatarUrl: mockLoadAvatarUrl
}))

vi.mock('@/assets/avatars/frog.svg?url', () => ({
  default: '/mock/frog.svg'
}))

const AvatarImageStub = defineComponent({
  name: 'AvatarImage',
  props: { avatar: { type: String, default: undefined } },
  setup(props) {
    return () => h('div', { 'data-testid': 'avatar-image-stub', 'data-avatar': props.avatar ?? '' })
  }
})

function mountPolaroid(props = {}) {
  return shallowMount(MemberPolaroid, {
    props,
    global: { stubs: { AvatarImage: AvatarImageStub } }
  })
}

describe('MemberPolaroid', () => {
  beforeEach(() => {
    mockLoadAvatarUrl.mockReset()
  })

  test('renders the polaroid frame and photo placeholder', () => {
    const wrapper = mountPolaroid()
    expect(wrapper.find('[data-testid="member-polaroid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="member-polaroid__frame"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="member-polaroid__photo"]').exists()).toBe(true)
  })

  test('passes the avatar prop through to the avatar image', () => {
    const wrapper = mountPolaroid({ avatar: 'panda' })
    expect(wrapper.find('[data-testid="avatar-image-stub"]').attributes('data-avatar')).toBe(
      'panda'
    )
  })

  // Mounts the real avatar-image so the placeholder/frog split lands through
  // this surface, not just the component's own tests.
  test('shows the shimmer placeholder rather than the frog while the avatar is unresolved [obligation]', async () => {
    mockLoadAvatarUrl.mockReturnValue(new Promise(() => {}))
    const wrapper = shallowMount(MemberPolaroid, {
      props: { avatar: 'panda' },
      global: { stubs: { AvatarImage: false } }
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(AvatarImageReal).exists()).toBe(true)
    expect(wrapper.find('[data-testid="avatar-image__placeholder"]').exists()).toBe(true)
    expect(wrapper.find('img').exists()).toBe(false)
  })

  test('the frame stamps the constant data-station="float"', () => {
    const wrapper = mountPolaroid()
    expect(wrapper.find('[data-testid="member-polaroid__frame"]').attributes('data-station')).toBe(
      'float'
    )
  })

  // ── size prop [obligation] ────────────────────────────────────────────────

  test('defaults to size "base" and reflects it on the root data-size attribute [obligation]', () => {
    const wrapper = mountPolaroid()
    expect(wrapper.find('[data-testid="member-polaroid"]').attributes('data-size')).toBe('base')
  })

  test('size="sm" reflects on the root data-size attribute [obligation]', () => {
    const wrapper = mountPolaroid({ size: 'sm' })
    expect(wrapper.find('[data-testid="member-polaroid"]').attributes('data-size')).toBe('sm')
  })

  // ── root positioning [obligation] ─────────────────────────────────────────
  // Both call sites position the root themselves (absolute); a `relative` on
  // the root would silently beat every caller's own positioning class since
  // Vue merges caller and component classes onto the same element.

  test('root carries no positioning utility class of its own [obligation]', () => {
    const wrapper = mountPolaroid()
    const classes = wrapper.find('[data-testid="member-polaroid"]').classes()
    expect(classes).not.toContain('relative')
    expect(classes).not.toContain('absolute')
  })

  test('a caller-supplied positioning class lands on the root untouched [obligation]', () => {
    const wrapper = shallowMount(MemberPolaroid, {
      attrs: { class: 'absolute top-1 -left-1' },
      global: { stubs: { AvatarImage: AvatarImageStub } }
    })
    const classes = wrapper.find('[data-testid="member-polaroid"]').classes()
    expect(classes).toContain('absolute')
    expect(classes).toContain('top-1')
  })
})
