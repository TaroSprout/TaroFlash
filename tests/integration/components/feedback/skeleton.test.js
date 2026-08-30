import '@/styles/main.css'
import { describe, test, expect, vi } from 'vite-plus/test'
import { mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import FeedbackSkeleton from '@/components/feedback/skeleton.vue'
import FeedbackCard from '@/components/feedback/feedback-card.vue'
import MemberPolaroid from '@/components/member/member-polaroid.vue'

// ── Mocks (FeedbackCard's own dependencies, so its real polaroid row renders) ──

vi.mock('@/api/feedback', () => ({
  useToggleFeedbackVoteMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } })
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn() }))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: vi.fn() })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const UiBurstStub = defineComponent({
  name: 'UiBurst',
  setup() {
    return () => h('div', { 'data-testid': 'ui-burst-stub' })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function mountFeedbackCardRow() {
  return shallowMount(FeedbackCard, {
    props: {
      item: {
        id: 1,
        title: 'Add dark mode',
        body: 'Please add a dark theme',
        member_display_name: 'Alice',
        member_avatar: 'frog',
        voted_by_me: false,
        vote_count: 3
      }
    },
    global: { stubs: { UiBurst: UiBurstStub } }
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

  // ── real member-polaroid, not a hand-rolled copy ──────────────
  // The regression is a duplicated offset drifting from the real component —
  // guard that every item renders the actual MemberPolaroid instance, sized
  // "sm", not a div reproducing its geometry.

  test('renders the polaroid in every item through the real MemberPolaroid component', () => {
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

  test('the photo placeholder fills the real member-polaroid photo slot, not the fallback avatar', () => {
    const wrapper = mountSkeleton({ count: 1 })
    const photo_container = wrapper.find('[data-testid="member-polaroid__photo"]')
    expect(photo_container.find('[data-testid="avatar-image-stub"]').exists()).toBe(false)
    expect(photo_container.find('[data-testid="feedback-skeleton__photo"]').exists()).toBe(true)
  })

  test('the polaroid stamps the constant data-station="float" via the real component', () => {
    const wrapper = mountSkeleton({ count: 1 })
    expect(wrapper.find('[data-testid="member-polaroid__frame"]').attributes('data-station')).toBe(
      'float'
    )
  })

  // ── real polaroid, not a duplicated copy ───────────────────────
  // skeleton.vue used to hand-roll a flattened copy of the polaroid's frame
  // markup and offsets, which drifted from feedback-card.vue's real polaroid.
  // The guard has to fail if either side moves independently, so it compares
  // both sides at test time rather than hard-coding either one's offsets.

  test('mounts the real MemberPolaroid component, not a hand-rolled copy', () => {
    const wrapper = mountSkeleton({ count: 1 })
    expect(wrapper.findComponent(MemberPolaroid).exists()).toBe(true)
  })

  test('the skeleton polaroid matches the real feedback row polaroid: same size, same positioning classes', () => {
    const skeleton_polaroid = mountSkeleton({ count: 1 }).findComponent(MemberPolaroid)
    const row_polaroid = mountFeedbackCardRow().findComponent(MemberPolaroid)

    expect(skeleton_polaroid.exists()).toBe(true)
    expect(row_polaroid.exists()).toBe(true)
    expect(skeleton_polaroid.props('size')).toBe(row_polaroid.props('size'))
    // The row is shallow-mounted (stub: caller classes only) while the skeleton
    // renders for real (caller classes plus the component's own), so the
    // guarantee is containment of the caller's positioning, not list equality.
    expect(skeleton_polaroid.classes()).toEqual(expect.arrayContaining(row_polaroid.classes()))
  })

  test('fills the polaroid photo slot with a shimmer placeholder, not the real avatar', () => {
    const wrapper = mount(FeedbackSkeleton, { props: { count: 1 } })
    const photo = wrapper.find('[data-testid="member-polaroid__photo"]')

    expect(photo.find('.shimmer').exists()).toBe(true)
    expect(photo.find('img').exists()).toBe(false)
  })
})
