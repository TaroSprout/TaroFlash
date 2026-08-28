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

function mountSkeleton(props = {}) {
  return shallowMount(FeedbackSkeleton, { props })
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
  test('renders 4 placeholder cards by default [obligation]', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.findAll('[data-testid="feedback-skeleton__item"]')).toHaveLength(4)
  })

  test('renders exactly count placeholder cards when count prop is provided [obligation]', () => {
    const wrapper = mountSkeleton({ count: 2 })
    expect(wrapper.findAll('[data-testid="feedback-skeleton__item"]')).toHaveLength(2)
  })

  test('each placeholder card renders a polaroid frame, content bars, and a vote-column', () => {
    const wrapper = mountSkeleton({ count: 1 })
    const item = wrapper.find('[data-testid="feedback-skeleton__item"]')
    expect(item.find('[data-testid="feedback-skeleton__polaroid"]').exists()).toBe(true)
    expect(item.find('[data-testid="feedback-skeleton__content"]').exists()).toBe(true)
    expect(item.find('[data-testid="feedback-skeleton__vote-wrap"]').exists()).toBe(true)
  })

  // ── real polaroid, not a duplicated copy [obligation] ───────────────────────
  // skeleton.vue used to hand-roll a flattened copy of the polaroid's frame
  // markup and offsets, which drifted from feedback-card.vue's real polaroid.
  // The guard has to fail if either side moves independently, so it compares
  // both sides at test time rather than hard-coding either one's offsets.

  test('mounts the real MemberPolaroid component, not a hand-rolled copy [obligation]', () => {
    const wrapper = mountSkeleton({ count: 1 })
    expect(wrapper.findComponent(MemberPolaroid).exists()).toBe(true)
  })

  test('the skeleton polaroid matches the real feedback row polaroid: same size, same positioning classes [obligation]', () => {
    const skeleton_polaroid = mountSkeleton({ count: 1 }).findComponent(MemberPolaroid)
    const row_polaroid = mountFeedbackCardRow().findComponent(MemberPolaroid)

    expect(skeleton_polaroid.exists()).toBe(true)
    expect(row_polaroid.exists()).toBe(true)
    expect(skeleton_polaroid.props('size')).toBe(row_polaroid.props('size'))
    expect(skeleton_polaroid.classes().sort()).toEqual(row_polaroid.classes().sort())
  })

  test('fills the polaroid photo slot with a shimmer placeholder, not the real avatar', () => {
    const wrapper = mount(FeedbackSkeleton, { props: { count: 1 } })
    const photo = wrapper.find('[data-testid="member-polaroid__photo"]')

    expect(photo.find('.shimmer').exists()).toBe(true)
    expect(photo.find('img').exists()).toBe(false)
  })
})
