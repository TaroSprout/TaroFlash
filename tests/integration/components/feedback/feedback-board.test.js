import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import FeedbackBoard from '@/components/feedback/feedback-board.vue'
import FeedbackSubmitDialog from '@/components/feedback/feedback-submit-dialog.vue'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockItems = ref([])

const { modalOpenMock } = vi.hoisted(() => ({ modalOpenMock: vi.fn() }))

vi.mock('@/api/feedback', () => ({
  useFeedbackItemsQuery: () => ({ data: mockItems }),
  useToggleFeedbackVoteMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useSubmitFeedbackMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const FeedbackCardStub = defineComponent({
  name: 'FeedbackCard',
  props: ['item'],
  setup(props) {
    return () => h('div', { 'data-testid': 'feedback-card-stub', 'data-item-id': props.item.id })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountBoard(close = vi.fn()) {
  return {
    close,
    wrapper: shallowMount(FeedbackBoard, {
      props: { close },
      global: {
        renderStubDefaultSlot: true,
        stubs: { MobileSheet: false, UiButton: false, FeedbackCard: FeedbackCardStub }
      }
    })
  }
}

beforeEach(() => {
  mockItems.value = []
})

// ── Content ───────────────────────────────────────────────────────────────────

describe('FeedbackBoard — content', () => {
  test('renders the mobile-sheet with the feedback-board title', () => {
    const { wrapper } = mountBoard()
    expect(wrapper.findComponent({ name: 'MobileSheet' }).props('title')).toBe('Feedback')
  })

  test('renders one feedback-card per item from useFeedbackItemsQuery', () => {
    mockItems.value = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const { wrapper } = mountBoard()
    expect(wrapper.findAllComponents(FeedbackCardStub)).toHaveLength(3)
  })

  test('renders no feedback-cards when the list is empty', () => {
    mockItems.value = []
    const { wrapper } = mountBoard()
    expect(wrapper.findAllComponents(FeedbackCardStub)).toHaveLength(0)
  })

  test('passes each item through to its feedback-card', () => {
    mockItems.value = [{ id: 7 }]
    const { wrapper } = mountBoard()
    expect(wrapper.findComponent(FeedbackCardStub).props('item')).toEqual({ id: 7 })
  })

  test('the submit button reads Leave Feedback', () => {
    const { wrapper } = mountBoard()
    expect(wrapper.find('[data-testid="feedback-board__submit-button"]').text()).toBe(
      'Leave Feedback'
    )
  })
})

// ── Close wiring ──────────────────────────────────────────────────────────────

describe('FeedbackBoard — close wiring', () => {
  test('mobile-sheet close event calls close', async () => {
    const { wrapper, close } = mountBoard()
    await wrapper.findComponent({ name: 'MobileSheet' }).vm.$emit('close')
    expect(close).toHaveBeenCalledOnce()
  })
})

// ── Submit dialog wiring ─────────────────────────────────────────────────────

describe('FeedbackBoard — submit dialog wiring [obligation]', () => {
  beforeEach(() => {
    modalOpenMock.mockReset()
  })

  test('pressing the submit button opens FeedbackSubmitDialog as a stacked modal via useModal().open', async () => {
    const { wrapper } = mountBoard()
    await wrapper.find('[data-testid="feedback-board__submit-button"]').trigger('click')
    expect(modalOpenMock).toHaveBeenCalledWith(FeedbackSubmitDialog, {
      backdrop: true,
      mode: 'popup'
    })
  })
})
