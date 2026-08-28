import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import AppWindow from '@/components/layout-kit/app-window/index.vue'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, nextTick } from 'vue'
import FeedbackBoard from '@/components/feedback/feedback-board.vue'
import FeedbackSubmitDialog from '@/components/feedback/feedback-submit-dialog.vue'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockItems = ref([])
const mockStatus = ref('success')

const { modalOpenMock, mockEmitSfx, mockRefetch, mockShake } = vi.hoisted(() => ({
  modalOpenMock: vi.fn(),
  mockEmitSfx: vi.fn(),
  mockRefetch: vi.fn(),
  mockShake: vi.fn()
}))

vi.mock('@/api/feedback', () => ({
  useFeedbackItemsQuery: () => ({ data: mockItems, status: mockStatus, refetch: mockRefetch }),
  useToggleFeedbackVoteMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useSubmitFeedbackMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/utils/animations/shake', () => ({ shake: mockShake }))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const FeedbackCardStub = defineComponent({
  name: 'FeedbackCard',
  props: ['item'],
  setup(props) {
    return () => h('div', { 'data-testid': 'feedback-card-stub', 'data-item-id': props.item.id })
  }
})

const FeedbackSkeletonStub = defineComponent({
  name: 'FeedbackSkeleton',
  setup() {
    return () => h('div', { 'data-testid': 'feedback-skeleton-stub' })
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
        stubs: {
          AppWindow: false,
          UiButton: false,
          FeedbackCard: FeedbackCardStub,
          FeedbackSkeleton: FeedbackSkeletonStub
        }
      }
    })
  }
}

beforeEach(() => {
  mockItems.value = []
  mockStatus.value = 'success'
  mockRefetch.mockReset()
  mockShake.mockReset()
  mockEmitSfx.mockClear()
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

// ── Loading state [obligation] ───────────────────────────────────────────────

describe('FeedbackBoard — loading state [obligation]', () => {
  test('renders feedback-skeleton while the query status is pending, not the card list', () => {
    mockStatus.value = 'pending'
    mockItems.value = [{ id: 1 }]
    const { wrapper } = mountBoard()

    expect(wrapper.findComponent(FeedbackSkeletonStub).exists()).toBe(true)
    expect(wrapper.findAllComponents(FeedbackCardStub)).toHaveLength(0)
  })

  test('swaps to the feedback-card list once the query resolves', () => {
    mockStatus.value = 'success'
    mockItems.value = [{ id: 1 }, { id: 2 }]
    const { wrapper } = mountBoard()

    expect(wrapper.findComponent(FeedbackSkeletonStub).exists()).toBe(false)
    expect(wrapper.findAllComponents(FeedbackCardStub)).toHaveLength(2)
  })

  test('keys the placeholder off query status, not off an empty item list', () => {
    mockStatus.value = 'success'
    mockItems.value = []
    const { wrapper } = mountBoard()

    expect(wrapper.findComponent(FeedbackSkeletonStub).exists()).toBe(false)
  })

  test('renders the title, intro text, and submit button while the query is pending', () => {
    mockStatus.value = 'pending'
    const { wrapper } = mountBoard()

    expect(wrapper.findComponent(AppWindow).props('title')).toBe('Feedback')
    expect(wrapper.find('[data-testid="feedback-board__intro"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="feedback-board__submit-button"]').exists()).toBe(true)
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

// ── Error state [obligation] ─────────────────────────────────────────────────
// The query is mocked wholesale, so the initial pending→error transition is
// driven the same way the pending→success one already is above: by mutating
// the mocked status ref and letting the component's own watcher react to it.

describe('FeedbackBoard — error state [obligation]', () => {
  test('renders the error node and plays notice.error on the initial fetch failure [obligation]', async () => {
    mockStatus.value = 'pending'
    const { wrapper } = mountBoard()

    mockStatus.value = 'error'
    await nextTick()

    expect(wrapper.find('[data-testid="feedback-board__error"]').exists()).toBe(true)
    expect(mockEmitSfx).toHaveBeenCalledWith('notice.error')
  })

  test('retry wires to refetch and swaps the error node for the card list on success [obligation]', async () => {
    mockStatus.value = 'pending'
    const { wrapper } = mountBoard()
    mockStatus.value = 'error'
    await nextTick()

    mockRefetch.mockImplementation(() => {
      mockItems.value = [{ id: 1 }]
      mockStatus.value = 'success'
    })

    await wrapper.find('[data-testid="feedback-board__retry-button"]').trigger('click')
    await flushPromises()

    expect(mockRefetch).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="feedback-board__error"]').exists()).toBe(false)
    expect(wrapper.findAllComponents(FeedbackCardStub)).toHaveLength(1)
  })

  // The query layer holds `status` at 'error' across a repeat failure, so the
  // component's `watch(status, ...)` never re-fires for this case — `onRetry`
  // checks `was_already_error` directly against the pre-refetch value instead
  // of relying on the watcher. →[K:query-status-holds-through-repeat-failure]
  test('retry that fails again shakes the error message and plays ui.rejected, without changing the message text [obligation]', async () => {
    mockStatus.value = 'pending'
    const { wrapper } = mountBoard()
    mockStatus.value = 'error'
    await nextTick()

    const messageBefore = wrapper.find('[data-testid="feedback-board__error-message"]').text()
    mockEmitSfx.mockClear()

    mockRefetch.mockImplementation(() => {
      mockStatus.value = 'error'
    })

    await wrapper.find('[data-testid="feedback-board__retry-button"]').trigger('click')
    await flushPromises()

    // The tap press cue and the repeat-failure rejection are two distinct
    // events at two distinct phases — both are expected on this one press.
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.press')
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.rejected')
    expect(mockShake).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="feedback-board__error-message"]').text()).toBe(messageBefore)
  })

  test('pressing the retry button plays the default press cue [obligation]', async () => {
    mockStatus.value = 'pending'
    const { wrapper } = mountBoard()
    mockStatus.value = 'error'
    await nextTick()

    mockRefetch.mockImplementation(() => {
      mockStatus.value = 'success'
      mockItems.value = [{ id: 1 }]
    })

    await wrapper.find('[data-testid="feedback-board__retry-button"]').trigger('click')
    await flushPromises()

    expect(mockEmitSfx).toHaveBeenCalledWith('ui.press')
  })

  // `was_already_error` is read once, before the refetch, so a failure that
  // follows an intervening success is a genuine 'success' -> 'error'
  // transition — the watcher fires and plays the first-failure cue, not the
  // repeat one.
  test('a failure -> success -> failure sequence replays the first-failure cue, not the repeat one [obligation]', async () => {
    mockStatus.value = 'pending'
    const { wrapper } = mountBoard()
    mockStatus.value = 'error'
    await nextTick()
    expect(mockEmitSfx).toHaveBeenCalledWith('notice.error')

    mockRefetch.mockImplementation(() => {
      mockStatus.value = 'success'
    })
    await wrapper.find('[data-testid="feedback-board__retry-button"]').trigger('click')
    await flushPromises()

    mockEmitSfx.mockClear()
    mockRefetch.mockImplementation(() => {
      mockStatus.value = 'error'
    })
    // Second failure comes from 'success', a genuine value change, so the
    // watcher does fire here — unlike the same-value 'error' -> 'error' case above.
    mockStatus.value = 'error'
    await nextTick()

    expect(mockEmitSfx).toHaveBeenCalledWith('notice.error')
    expect(mockEmitSfx).not.toHaveBeenCalledWith('ui.rejected')
  })

  test('title, intro, and submit button stay available while the board is in the error state [obligation]', async () => {
    mockStatus.value = 'pending'
    const { wrapper } = mountBoard()
    mockStatus.value = 'error'
    await nextTick()

    expect(wrapper.findComponent(AppWindow).props('title')).toBe('Feedback')
    expect(wrapper.find('[data-testid="feedback-board__intro"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="feedback-board__submit-button"]').exists()).toBe(true)
  })
})

// ── Empty state [obligation] ─────────────────────────────────────────────────

describe('FeedbackBoard — empty state [obligation]', () => {
  test('renders the empty state when the query resolves to an empty list, distinct from the error state [obligation]', () => {
    mockStatus.value = 'success'
    mockItems.value = []
    const { wrapper } = mountBoard()

    expect(wrapper.find('[data-testid="feedback-board__empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="feedback-board__error"]').exists()).toBe(false)
  })

  test('renders the empty state when items is undefined rather than an empty array [obligation]', () => {
    mockStatus.value = 'success'
    mockItems.value = undefined
    const { wrapper } = mountBoard()

    expect(wrapper.find('[data-testid="feedback-board__empty"]').exists()).toBe(true)
    expect(wrapper.findAllComponents(FeedbackCardStub)).toHaveLength(0)
  })

  test('title, intro, and submit button stay available while the board is empty [obligation]', () => {
    mockStatus.value = 'success'
    mockItems.value = []
    const { wrapper } = mountBoard()

    expect(wrapper.findComponent(AppWindow).props('title')).toBe('Feedback')
    expect(wrapper.find('[data-testid="feedback-board__intro"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="feedback-board__submit-button"]').exists()).toBe(true)
  })
})

// ── Populated state [obligation] ─────────────────────────────────────────────

describe('FeedbackBoard — populated state [obligation]', () => {
  test('title, intro, and submit button stay available while the board shows cards [obligation]', () => {
    mockStatus.value = 'success'
    mockItems.value = [{ id: 1 }]
    const { wrapper } = mountBoard()

    expect(wrapper.findComponent(AppWindow).props('title')).toBe('Feedback')
    expect(wrapper.find('[data-testid="feedback-board__intro"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="feedback-board__submit-button"]').exists()).toBe(true)
  })
})
