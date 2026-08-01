import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import BulkActionsBar from '@/views/study-session/session-summary/bulk-actions-bar.vue'

const { capturedController } = vi.hoisted(() => ({ capturedController: { current: null } }))

vi.mock('@/views/study-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => capturedController.current
}))

function makeController({
  is_selecting = true,
  selected_count = 0,
  all_cards_selected = false
} = {}) {
  return {
    summary_selection: {
      is_selecting: ref(is_selecting),
      selected_count: ref(selected_count),
      all_cards_selected: ref(all_cards_selected),
      exitSelection: vi.fn(),
      clearSelectedCards: vi.fn()
    },
    selectAllSummaryCards: vi.fn(),
    onDeleteSummarySelected: vi.fn(),
    onMoveSummarySelected: vi.fn()
  }
}

function mountBar(controller) {
  const ctrl = controller ?? makeController()
  capturedController.current = ctrl
  return { wrapper: mount(BulkActionsBar), controller: ctrl }
}

describe('BulkActionsBar (session-summary/bulk-actions-bar.vue)', () => {
  beforeEach(() => {
    capturedController.current = null
  })

  test('renders the bar with cancel, select-all, count, move, and delete [obligation]', () => {
    const { wrapper } = mountBar()

    expect(wrapper.find('[data-testid="session-summary__bulk-actions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__bulk-actions-cancel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__bulk-actions-select-all"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="session-summary__bulk-actions-count"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__bulk-actions-move"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__bulk-actions-delete"]').exists()).toBe(true)
  })

  test('shows the live selected count [obligation]', () => {
    const { wrapper } = mountBar(makeController({ selected_count: 3 }))
    expect(wrapper.find('[data-testid="session-summary__bulk-actions-count"]').text()).toContain(
      '3'
    )
  })

  // ── Cancel ────────────────────────────────────────────────────────────────

  test('pressing cancel calls selection.exitSelection [obligation]', async () => {
    const { wrapper, controller } = mountBar()
    await wrapper.find('[data-testid="session-summary__bulk-actions-cancel"]').trigger('click')
    expect(controller.summary_selection.exitSelection).toHaveBeenCalledOnce()
  })

  // ── Select all / deselect all ────────────────────────────────────────────

  test('pressing select-all calls selectAllSummaryCards when not everything is selected [obligation]', async () => {
    const { wrapper, controller } = mountBar(makeController({ all_cards_selected: false }))
    await wrapper.find('[data-testid="session-summary__bulk-actions-select-all"]').trigger('click')

    expect(controller.selectAllSummaryCards).toHaveBeenCalledOnce()
    expect(controller.summary_selection.clearSelectedCards).not.toHaveBeenCalled()
  })

  test('pressing select-all calls clearSelectedCards when everything is already selected [obligation]', async () => {
    const { wrapper, controller } = mountBar(makeController({ all_cards_selected: true }))
    await wrapper.find('[data-testid="session-summary__bulk-actions-select-all"]').trigger('click')

    expect(controller.summary_selection.clearSelectedCards).toHaveBeenCalledOnce()
    expect(controller.selectAllSummaryCards).not.toHaveBeenCalled()
  })

  // ── Move / Delete: disabled until something is selected [obligation] ────

  test('move and delete are disabled when nothing is selected [obligation]', () => {
    const { wrapper } = mountBar(makeController({ selected_count: 0 }))

    expect(
      wrapper.find('[data-testid="session-summary__bulk-actions-move"]').attributes('aria-disabled')
    ).toBeDefined()
    expect(
      wrapper
        .find('[data-testid="session-summary__bulk-actions-delete"]')
        .attributes('aria-disabled')
    ).toBeDefined()
  })

  test('move and delete are enabled once something is selected [obligation]', () => {
    const { wrapper } = mountBar(makeController({ selected_count: 1 }))

    expect(
      wrapper.find('[data-testid="session-summary__bulk-actions-move"]').attributes('aria-disabled')
    ).toBeUndefined()
    expect(
      wrapper
        .find('[data-testid="session-summary__bulk-actions-delete"]')
        .attributes('aria-disabled')
    ).toBeUndefined()
  })

  test('pressing move calls onMoveSummarySelected [obligation]', async () => {
    const { wrapper, controller } = mountBar(makeController({ selected_count: 1 }))
    await wrapper.find('[data-testid="session-summary__bulk-actions-move"]').trigger('click')
    expect(controller.onMoveSummarySelected).toHaveBeenCalledOnce()
  })

  test('pressing delete calls onDeleteSummarySelected [obligation]', async () => {
    const { wrapper, controller } = mountBar(makeController({ selected_count: 1 }))
    await wrapper.find('[data-testid="session-summary__bulk-actions-delete"]').trigger('click')
    expect(controller.onDeleteSummarySelected).toHaveBeenCalledOnce()
  })
})
