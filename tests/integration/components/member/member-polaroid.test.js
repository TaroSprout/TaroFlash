import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MemberPolaroid from '@/components/member/member-polaroid.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

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
  // `relative` lives on the inner positioner so the paperclip sibling's `absolute`
  // positions against it; the root itself carries no position utility of its own,
  // so a caller's own `absolute`/`top-*`/`left-*` lands unopposed.

  test('root carries no position utility of its own, leaving it to a caller-supplied one [obligation]', () => {
    const wrapper = mountPolaroid()
    const classes = wrapper.find('[data-testid="member-polaroid"]').classes()
    expect(classes).not.toContain('relative')
    expect(classes).not.toContain('absolute')
    expect(wrapper.find('[data-testid="member-polaroid__positioner"]').classes()).toContain(
      'relative'
    )
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

  // ── paperclip is an unrotated sibling of the frame [obligation] ───────────
  // The clip used to sit nested inside the rotated frame and inherit its -12°;
  // now it's a sibling with the combined angle baked into its own class, so the
  // frame can swing on hover without dragging the clip along.

  test('the clip is a sibling of the frame, not nested inside it [obligation]', () => {
    const wrapper = mountPolaroid()
    const frame = wrapper.find('[data-testid="member-polaroid__frame"]')
    expect(frame.findComponent(UiIcon).exists()).toBe(false)
    expect(wrapper.findComponent(UiIcon).exists()).toBe(true)
  })

  test.each([
    ['base', { frame: 'w-30 p-2 pb-6', clip: '-top-3 left-12 size-10', origin: '57% 6%' }],
    ['sm', { frame: 'w-24 p-1.5 pb-5', clip: '-top-3 left-11 size-9', origin: '65% 5%' }]
  ])(
    'size=%s reproduces the old geometry algebraically on the frame and the clip [obligation]',
    (size, expected) => {
      const wrapper = mountPolaroid({ size })
      const frame = wrapper.find('[data-testid="member-polaroid__frame"]')
      const clip = wrapper.findComponent(UiIcon)

      expect(frame.classes()).toContain('-rotate-12')
      for (const cls of expected.frame.split(' ')) expect(frame.classes()).toContain(cls)
      expect(frame.attributes('style')).toContain(`transform-origin: ${expected.origin}`)

      expect(clip.classes()).toContain('rotate-188')
      for (const cls of expected.clip.split(' ')) expect(clip.classes()).toContain(cls)
    }
  )

  // ── interactive prop [obligation] ─────────────────────────────────────────
  // `interactive` gates the hover swing; decorative call sites leave it off.

  test('interactive defaults to false — no transition, no group-hover swing class [obligation]', () => {
    const wrapper = mountPolaroid()
    const frame = wrapper.find('[data-testid="member-polaroid__frame"]')
    expect(frame.classes()).not.toContain('group-hover:-rotate-5')
    expect(frame.classes()).not.toContain('transition-transform')
  })

  test('interactive=true adds the group-hover swing class and its transition [obligation]', () => {
    const wrapper = mountPolaroid({ interactive: true })
    const frame = wrapper.find('[data-testid="member-polaroid__frame"]')
    expect(frame.classes()).toContain('group-hover:-rotate-8')
    expect(frame.classes()).toContain('transition-transform')
    expect(frame.classes()).toContain('duration-150')
  })
})
