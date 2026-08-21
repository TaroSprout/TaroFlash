import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import AppWindow from '@/components/layout-kit/app-window/index.vue'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import FeedbackBoard from '@/components/feedback/feedback-board.vue'
import FeedbackSubmitDialog from '@/components/feedback/feedback-submit-dialog.vue'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockItems = ref([])

const { modalOpenMock, mockEmitSfx } = vi.hoisted(() => ({
  modalOpenMock: vi.fn(),
  mockEmitSfx: vi.fn()
}))

vi.mock('@/api/feedback', () => ({
  useFeedbackItemsQuery: () => ({ data: mockItems }),
  useToggleFeedbackVoteMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useSubmitFeedbackMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

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
        stubs: { AppWindow: false, UiButton: false, FeedbackCard: FeedbackCardStub }
      }
    })
  }
}

beforeEach(() => {
  mockItems.value = []
})

// ── Content ───────────────────────────────────────────────────────────────────

describe('FeedbackBoard — content', () => {
  test('renders the app-window with the feedback-board title', () => {
    const { wrapper } = mountBoard()
    expect(wrapper.findComponent(AppWindow).props('title')).toBe('Feedback')
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

  test('opts the window body into scroll_body [obligation]', () => {
    const { wrapper } = mountBoard()
    expect(wrapper.findComponent(AppWindow).props('scroll_body')).toBe(true)
  })

  test('renders the submit button inside the app-window footer, not the scrolling body [obligation]', () => {
    const { wrapper } = mountBoard()
    const footer = wrapper.find('[data-testid="app-window__footer"]')
    expect(footer.find('[data-testid="feedback-board__submit-button"]').exists()).toBe(true)
    expect(
      wrapper
        .find('[data-testid="app-window__body"]')
        .find('[data-testid="feedback-board__submit-button"]')
        .exists()
    ).toBe(false)
  })
})

// ── Fixed geometry [obligation] ───────────────────────────────────────────────
// The board is the one window that pins its own width and height, so the
// breakpoint that switches those on has to be wider than the width itself —
// gate them any earlier and the window is wider than the screen showing it.
// The utility names are the only signal for this: the sizes never render in
// this environment, and nothing else records which breakpoint owns them.

describe('FeedbackBoard — fixed size [obligation]', () => {
  function rootClasses(wrapper) {
    return wrapper.find('[data-testid="feedback-board"]').classes()
  }

  test('gates every fixed width and height on the same breakpoint', () => {
    const { wrapper } = mountBoard()
    const sized = rootClasses(wrapper).filter((c) => /(^|:)[wh]-\d/.test(c))

    expect(sized.length).toBeGreaterThan(0)
    for (const c of sized) expect(c.startsWith('msm:')).toBe(true)
  })

  test('never turns its fixed size on at a breakpoint narrower than the size itself', () => {
    const { wrapper } = mountBoard()

    expect(rootClasses(wrapper)).toEqual(expect.arrayContaining(['msm:w-170', 'msm:h-196']))
  })

  test('leaves the gap below the wall to the footer, not the body [obligation]', () => {
    const { wrapper } = mountBoard()
    const body = wrapper.find('[data-testid="feedback-board__body"]').classes()

    expect(body.some((c) => /(^|:)pb-/.test(c))).toBe(false)
    expect(wrapper.find('[data-testid="feedback-board__actions"]').classes()).toContain('pb-6')
  })
})

// ── Close wiring ──────────────────────────────────────────────────────────────

describe('FeedbackBoard — close wiring', () => {
  test('app-window close event calls close', async () => {
    const { wrapper, close } = mountBoard()
    await wrapper.findComponent(AppWindow).vm.$emit('close')
    expect(close).toHaveBeenCalledOnce()
  })
})

// ── Submit dialog wiring ─────────────────────────────────────────────────────

describe('FeedbackBoard — submit dialog wiring [obligation]', () => {
  beforeEach(() => {
    modalOpenMock.mockReset()
    mockEmitSfx.mockClear()
  })

  test('pressing the submit button opens FeedbackSubmitDialog as a stacked modal via useModal().open', async () => {
    const { wrapper } = mountBoard()
    await wrapper.find('[data-testid="feedback-board__submit-button"]').trigger('click')
    expect(modalOpenMock).toHaveBeenCalledWith(FeedbackSubmitDialog, {
      backdrop: true,
      mode: 'popup'
    })
  })

  test('pressing the submit button plays dialog.open-chime [obligation]', async () => {
    const { wrapper } = mountBoard()
    await wrapper.find('[data-testid="feedback-board__submit-button"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.open-chime')
  })
})
