import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import StudyEditFooter from '@/views/study-session/session-studying/study-edit-footer.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// study-edit-footer.vue no longer takes is_starting_side as a prop / emits
// flip+done — it reads is_starting_side and calls flipCurrentCard/stopEdit
// straight off the injected StudySessionController.

const { mockFlipCurrentCard, mockStopEdit } = vi.hoisted(() => ({
  mockFlipCurrentCard: vi.fn(),
  mockStopEdit: vi.fn()
}))

const { is_starting_side } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { is_starting_side: ref(true) }
})

vi.mock('@/views/study-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => ({
    is_starting_side,
    flipCurrentCard: mockFlipCurrentCard,
    stopEdit: mockStopEdit
  })
}))

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

function mountFooter({ starting_side = true } = {}) {
  is_starting_side.value = starting_side
  return mount(StudyEditFooter)
}

describe('StudyEditFooter', () => {
  beforeEach(() => {
    mockFlipCurrentCard.mockClear()
    mockStopEdit.mockClear()
    mockEmitSfx.mockClear()
    is_starting_side.value = true
  })

  test('renders the flip and done buttons', () => {
    const wrapper = mountFooter()
    expect(wrapper.find('[data-testid="study-card-edit__flip"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-card-edit__done"]').exists()).toBe(true)
  })

  test('clicking flip calls flipCurrentCard [obligation]', async () => {
    const wrapper = mountFooter()
    await wrapper.find('[data-testid="study-card-edit__flip"]').trigger('click')
    expect(mockFlipCurrentCard).toHaveBeenCalledOnce()
  })

  test('clicking done calls stopEdit [obligation]', async () => {
    const wrapper = mountFooter()
    await wrapper.find('[data-testid="study-card-edit__done"]').trigger('click')
    expect(mockStopEdit).toHaveBeenCalledOnce()
  })

  test('clicking flip plays transition_up when on the starting side', async () => {
    const wrapper = mountFooter({ starting_side: true })
    await wrapper.find('[data-testid="study-card-edit__flip"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('transition_up', undefined)
  })

  test('clicking flip plays transition_down when not on the starting side', async () => {
    const wrapper = mountFooter({ starting_side: false })
    await wrapper.find('[data-testid="study-card-edit__flip"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('transition_down', undefined)
  })

  test('clicking done plays music_plink_ok', async () => {
    const wrapper = mountFooter()
    await wrapper.find('[data-testid="study-card-edit__done"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('music_plink_ok', undefined)
  })
})
