import '@/styles/main.css'
import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, shallowMount } from '@vue/test-utils'
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

  test('the root positions statically, leaving placement to the caller [obligation]', () => {
    const wrapper = mount(MemberPolaroid, {
      attachTo: document.body,
      global: { stubs: { AvatarImage: AvatarImageStub } }
    })
    const root = wrapper.find('[data-testid="member-polaroid"]').element
    expect(getComputedStyle(root).position).toBe('static')
    wrapper.unmount()
  })

  test('a caller-supplied positioning class takes effect on the root [obligation]', () => {
    const host = document.createElement('div')
    host.style.position = 'relative'
    document.body.appendChild(host)

    const wrapper = mount(MemberPolaroid, {
      attachTo: host,
      attrs: { class: 'absolute top-1 -left-1' },
      global: { stubs: { AvatarImage: AvatarImageStub } }
    })
    const root = wrapper.find('[data-testid="member-polaroid"]').element
    const style = getComputedStyle(root)

    expect(style.position).toBe('absolute')
    expect(Number.parseFloat(style.top)).toBeGreaterThan(0)

    wrapper.unmount()
    host.remove()
  })

  // ── photo slot [obligation] ─────────────────────────────────────────────────
  // A skeleton borrows this frame's real geometry via the slot instead of
  // hand-rolling a copy of it — the slot content must render inside the same
  // photo container the real avatar occupies, at that container's own size.

  test('falls back to avatar-image when no photo slot content is given', () => {
    const wrapper = mount(MemberPolaroid, { global: { stubs: { AvatarImage: AvatarImageStub } } })
    expect(
      wrapper
        .find('[data-testid="member-polaroid__photo"] [data-testid="avatar-image-stub"]')
        .exists()
    ).toBe(true)
  })

  test('renders photo slot content inside the real photo container instead of the fallback avatar [obligation]', () => {
    const wrapper = mount(MemberPolaroid, {
      global: { stubs: { AvatarImage: AvatarImageStub } },
      slots: { photo: '<div data-testid="custom-photo"></div>' }
    })
    const photo_container = wrapper.find('[data-testid="member-polaroid__photo"]')
    expect(photo_container.find('[data-testid="custom-photo"]').exists()).toBe(true)
    expect(photo_container.find('[data-testid="avatar-image-stub"]').exists()).toBe(false)
  })

  test('the photo slot content is sized by the real photo container, not by itself [obligation]', () => {
    const wrapper = mount(MemberPolaroid, {
      attachTo: document.body,
      global: { stubs: { AvatarImage: AvatarImageStub } },
      slots: { photo: '<div data-testid="custom-photo" class="h-full w-full"></div>' }
    })
    const photo_container = wrapper.find('[data-testid="member-polaroid__photo"]').element
    const custom_photo = wrapper.find('[data-testid="custom-photo"]').element

    const container_rect = photo_container.getBoundingClientRect()
    const photo_rect = custom_photo.getBoundingClientRect()

    expect(photo_rect.width).toBe(container_rect.width)
    expect(photo_rect.height).toBe(container_rect.height)

    wrapper.unmount()
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
