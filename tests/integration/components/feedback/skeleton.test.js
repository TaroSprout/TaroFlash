import '@/styles/main.css'
import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import FeedbackSkeleton from '@/components/feedback/skeleton.vue'
import MemberPolaroid from '@/components/member/member-polaroid.vue'

const AvatarImageStub = defineComponent({
  name: 'AvatarImage',
  setup: () => () => h('div', { 'data-testid': 'avatar-image-stub' })
})

function mountSkeleton(props = {}) {
  return mount(FeedbackSkeleton, {
    props,
    global: { stubs: { AvatarImage: AvatarImageStub } }
  })
}

describe('FeedbackSkeleton (components/feedback/skeleton.vue)', () => {
  test('defaults to 4 placeholder items', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.findAll('[data-testid="feedback-skeleton__item"]')).toHaveLength(4)
  })

  test('renders the count prop worth of placeholder items', () => {
    const wrapper = mountSkeleton({ count: 2 })
    expect(wrapper.findAll('[data-testid="feedback-skeleton__item"]')).toHaveLength(2)
  })

  test('renders content and vote-wrap placeholders in every item', () => {
    const wrapper = mountSkeleton({ count: 2 })
    expect(wrapper.findAll('[data-testid="feedback-skeleton__content"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="feedback-skeleton__vote-wrap"]')).toHaveLength(2)
  })

  // ── real member-polaroid, not a hand-rolled copy [obligation] ──────────────
  // The regression is a duplicated offset drifting from the real component —
  // guard that every item renders the actual MemberPolaroid instance, sized
  // "sm", not a div reproducing its geometry.

  test('renders the polaroid in every item through the real MemberPolaroid component [obligation]', () => {
    const wrapper = mountSkeleton({ count: 3 })
    expect(wrapper.findAllComponents(MemberPolaroid)).toHaveLength(3)

    // The call site's own data-testid falls through onto the component root,
    // replacing member-polaroid's — so the root is queried by that name here.
    const roots = wrapper.findAll('[data-testid="feedback-skeleton__polaroid"]')
    expect(roots).toHaveLength(3)
    for (const root of roots) {
      expect(root.attributes('data-size')).toBe('sm')
    }
  })

  test('the photo placeholder fills the real member-polaroid photo slot, not the fallback avatar [obligation]', () => {
    const wrapper = mountSkeleton({ count: 1 })
    const photo_container = wrapper.find('[data-testid="member-polaroid__photo"]')
    expect(photo_container.find('[data-testid="avatar-image-stub"]').exists()).toBe(false)
    expect(photo_container.find('[data-testid="feedback-skeleton__photo"]').exists()).toBe(true)
  })

  test('the polaroid stamps the constant data-station="float" via the real component [obligation]', () => {
    const wrapper = mountSkeleton({ count: 1 })
    expect(wrapper.find('[data-testid="member-polaroid__frame"]').attributes('data-station')).toBe(
      'float'
    )
  })
})
