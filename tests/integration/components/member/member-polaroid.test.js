import { describe, test, expect } from 'vite-plus/test'
import { mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MemberPolaroid from '@/components/member/member-polaroid.vue'

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

  // ── photo slot [obligation] ────────────────────────────────────────────────
  // The photo is a defaulted slot so a skeleton can borrow the frame's real
  // geometry — every existing caller that never fills it still needs its
  // avatar-image fallback, and a caller that does fill it needs the fallback gone.

  test('with no photo slot content, renders the avatar image inside the photo container [obligation]', () => {
    const wrapper = mountPolaroid({ avatar: 'panda' })
    const photo = wrapper.find('[data-testid="member-polaroid__photo"]')
    expect(photo.find('[data-testid="avatar-image-stub"]').exists()).toBe(true)
  })

  test('photo slot content overrides the default avatar image [obligation]', () => {
    const wrapper = mount(MemberPolaroid, {
      slots: { photo: '<div data-testid="custom-photo">shimmer</div>' },
      global: { stubs: { AvatarImage: AvatarImageStub } }
    })
    const photo = wrapper.find('[data-testid="member-polaroid__photo"]')
    expect(photo.find('[data-testid="custom-photo"]').exists()).toBe(true)
    expect(photo.find('[data-testid="avatar-image-stub"]').exists()).toBe(false)
  })
})
