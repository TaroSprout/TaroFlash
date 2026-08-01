import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
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

const mounted_wrappers = []

function mountBar(controller) {
  const ctrl = controller ?? makeController()
  capturedController.current = ctrl
  const wrapper = mount(BulkActionsBar)
  mounted_wrappers.push(wrapper)
  return { wrapper, controller: ctrl }
}

function hover(el) {
  el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
}

describe('BulkActionsBar (session-summary/bulk-actions-bar.vue)', () => {
  beforeEach(() => {
    capturedController.current = null
  })

  // A hovered icon-only button Teleports its tooltip label to document.body —
  // leave a stale hover mounted and it leaks into the next test.
  afterEach(() => {
    while (mounted_wrappers.length > 0) mounted_wrappers.pop().unmount()
  })

  test('renders the bar with select-all, move, and delete [obligation]', () => {
    const { wrapper } = mountBar()

    expect(wrapper.find('[data-testid="session-summary__bulk-actions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__bulk-actions-select-all"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="session-summary__bulk-actions-move"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__bulk-actions-delete"]').exists()).toBe(true)
  })

  // Review removed the cancel button + count tag row outright — only
  // select-all/move/delete remain.
  test('does not render a cancel button or a count tag [obligation]', () => {
    const { wrapper } = mountBar()

    expect(wrapper.find('[data-testid="session-summary__bulk-actions-cancel"]').exists()).toBe(
      false
    )
    expect(wrapper.find('[data-testid="session-summary__bulk-actions-count"]').exists()).toBe(false)
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

  test('select-all shows the "Deselect all" tooltip label once everything is selected', async () => {
    const { wrapper } = mountBar(makeController({ all_cards_selected: true }))
    const button = wrapper.find('[data-testid="session-summary__bulk-actions-select-all"]')
    hover(button.element)
    await nextTick()

    const tooltip = document.querySelector('[data-testid="ui-tooltip"]')
    expect(tooltip?.textContent).toContain('Deselect all')
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
