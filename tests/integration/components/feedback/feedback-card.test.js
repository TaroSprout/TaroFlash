import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import FeedbackCard from '@/components/feedback/feedback-card.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockMutateAsync, mockEmitSfx, mockNoticeError } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
  mockEmitSfx: vi.fn(),
  mockNoticeError: vi.fn()
}))

vi.mock('@/api/feedback', () => ({
  useToggleFeedbackVoteMutation: () => ({
    mutateAsync: mockMutateAsync,
    isLoading: { value: false }
  })
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: mockNoticeError })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const UiBurstStub = defineComponent({
  name: 'UiBurst',
  emits: ['done'],
  setup(_props, { emit }) {
    return () => h('div', { 'data-testid': 'ui-burst-stub', onClick: () => emit('done') })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function item(overrides = {}) {
  return {
    id: 1,
    title: 'Add dark mode',
    body: 'Please add a dark theme',
    member_display_name: 'Alice',
    member_avatar: 'frog',
    voted_by_me: false,
    vote_count: 3,
    ...overrides
  }
}

function mountCard(props = {}) {
  return shallowMount(FeedbackCard, {
    props: { item: item(props) },
    global: { stubs: { UiBurst: UiBurstStub } }
  })
}

beforeEach(() => {
  mockMutateAsync.mockReset()
  mockMutateAsync.mockResolvedValue(true)
  mockEmitSfx.mockClear()
  mockNoticeError.mockClear()
})

// ── Content ───────────────────────────────────────────────────────────────────

describe('FeedbackCard — content', () => {
  test('renders the item title', () => {
    const wrapper = mountCard({ title: 'Import decks' })
    expect(wrapper.find('[data-testid="feedback-card__heading"]').text()).toContain('Import decks')
  })

  test('renders member_display_name when present', () => {
    const wrapper = mountCard({ member_display_name: 'Bob' })
    expect(wrapper.find('[data-testid="feedback-card__heading"]').text()).toContain('Bob')
  })

  test('renders body when present', () => {
    const wrapper = mountCard({ body: 'Some body text' })
    expect(wrapper.find('[data-testid="feedback-card__content"]').text()).toContain(
      'Some body text'
    )
  })

  test('does not render a body paragraph when body is empty', () => {
    const wrapper = mountCard({ body: '' })
    expect(wrapper.find('[data-testid="feedback-card__content"] p:nth-of-type(2)').exists()).toBe(
      false
    )
  })
})

// ── Vote toggle ───────────────────────────────────────────────────────────────

describe('FeedbackCard — vote toggle', () => {
  test('clicking the vote button calls mutateAsync with the item id', async () => {
    const wrapper = mountCard({ id: 42 })
    await wrapper.find('[data-testid="feedback-card__vote"]').trigger('click')
    expect(mockMutateAsync).toHaveBeenCalledWith(42)
  })

  test('plays generic_notification_9 sfx when voting for the first time', async () => {
    const wrapper = mountCard({ voted_by_me: false })
    await wrapper.find('[data-testid="feedback-card__vote"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('generic_notification_9')
  })

  test('plays toggle_off sfx when un-voting [obligation]', async () => {
    const wrapper = mountCard({ voted_by_me: true })
    await wrapper.find('[data-testid="feedback-card__vote"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('toggle_off')
  })

  test('shows a burst effect when voting for the first time', async () => {
    const wrapper = mountCard({ voted_by_me: false })
    await wrapper.find('[data-testid="feedback-card__vote"]').trigger('click')
    expect(wrapper.find('[data-testid="ui-burst-stub"]').exists()).toBe(true)
  })

  test('does not show a burst effect when un-voting', async () => {
    const wrapper = mountCard({ voted_by_me: true })
    await wrapper.find('[data-testid="feedback-card__vote"]').trigger('click')
    expect(wrapper.find('[data-testid="ui-burst-stub"]').exists()).toBe(false)
  })

  test('shows an error notice when the mutation rejects', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('network down'))
    const wrapper = mountCard()
    await wrapper.find('[data-testid="feedback-card__vote"]').trigger('click')
    await flushPromises()
    expect(mockNoticeError).toHaveBeenCalledWith("Couldn't register your vote. Please try again.")
  })

  test('does not show an error notice when the mutation succeeds', async () => {
    const wrapper = mountCard()
    await wrapper.find('[data-testid="feedback-card__vote"]').trigger('click')
    await flushPromises()
    expect(mockNoticeError).not.toHaveBeenCalled()
  })

  test('clears the burst effect once it reports done', async () => {
    const wrapper = mountCard({ voted_by_me: false })
    await wrapper.find('[data-testid="feedback-card__vote"]').trigger('click')
    expect(wrapper.find('[data-testid="ui-burst-stub"]').exists()).toBe(true)

    await wrapper.find('[data-testid="ui-burst-stub"]').trigger('click')
    expect(wrapper.find('[data-testid="ui-burst-stub"]').exists()).toBe(false)
  })
})
