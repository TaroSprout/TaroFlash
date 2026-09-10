import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import SummaryCardEditor from '@/views/study-session/session-summary/category-page/summary-card-editor.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

const { mockRegisterSummaryEditor, mockUnregisterSummaryEditor } = vi.hoisted(() => ({
  mockRegisterSummaryEditor: vi.fn(),
  mockUnregisterSummaryEditor: vi.fn()
}))

vi.mock('@/views/study-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => ({
    registerSummaryEditor: mockRegisterSummaryEditor,
    unregisterSummaryEditor: mockUnregisterSummaryEditor
  })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const StudyCardEditStub = defineComponent({
  name: 'StudyCardEdit',
  props: ['card', 'side'],
  emits: ['update'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'study-card-edit-stub', 'data-side': props.side }, [
        h('button', {
          'data-testid': 'study-card-edit-stub__emit-update',
          onClick: () => emit('update', props.side, 'new text')
        })
      ])
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return {
    id: 1,
    deck_id: 7,
    front_text: 'Front',
    back_text: 'Back',
    state: 'passed',
    ...overrides
  }
}

function mountEditor(props = {}) {
  return mount(SummaryCardEditor, {
    props: { card: makeCard(), ...props },
    global: { stubs: { StudyCardEdit: StudyCardEditStub } }
  })
}

/** Flips the editor through the handle it registered with the controller. */
function flip() {
  const handle = mockRegisterSummaryEditor.mock.calls.at(-1)?.[0]
  handle?.flip()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SummaryCardEditor', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockRegisterSummaryEditor.mockClear()
    mockUnregisterSummaryEditor.mockClear()
  })

  test('renders the editor root and the card editor for the given card', () => {
    const wrapper = mountEditor({ card: makeCard({ id: 42 }) })
    expect(wrapper.find('[data-testid="session-summary__card-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-card-edit-stub"]').exists()).toBe(true)
  })

  test('starts on the front side', () => {
    const wrapper = mountEditor()
    expect(wrapper.find('[data-testid="study-card-edit-stub"]').attributes('data-side')).toBe(
      'front'
    )
  })

  // ── flip via the controller handle ────────────────────────────
  // The Flip button lives in the session's shared toolbar footer, which
  // reaches this editor through the session controller's register/unregister
  // seam — no in-component Flip/Done buttons anymore.

  test('flip() switches to the back side and plays a transition sfx', async () => {
    const wrapper = mountEditor()
    flip()
    await nextTick()

    expect(wrapper.find('[data-testid="study-card-edit-stub"]').attributes('data-side')).toBe(
      'back'
    )
    expect(mockEmitSfx).toHaveBeenCalledWith('card.flip-away')
  })

  test('calling flip() twice returns to the front and plays the opposite sfx', async () => {
    const wrapper = mountEditor()

    flip()
    await nextTick()
    flip()
    await nextTick()

    expect(wrapper.find('[data-testid="study-card-edit-stub"]').attributes('data-side')).toBe(
      'front'
    )
    expect(mockEmitSfx).toHaveBeenLastCalledWith('card.flip-back')
  })

  // ── controller registration ────────────────────────────────────────────────

  test('registers a handle with the controller on mount, exposing flip', () => {
    mountEditor()

    expect(mockRegisterSummaryEditor).toHaveBeenCalledOnce()
    expect(typeof mockRegisterSummaryEditor.mock.calls[0][0].flip).toBe('function')
  })

  test('unregisters the same handle instance from the controller on unmount', () => {
    const wrapper = mountEditor()
    const handle = mockRegisterSummaryEditor.mock.calls[0][0]

    wrapper.unmount()

    expect(mockUnregisterSummaryEditor).toHaveBeenCalledWith(handle)
  })

  // ── update forwarding ─────────────────────────────────────────────────────

  test('forwards the child editor update event unchanged', async () => {
    const wrapper = mountEditor()
    await wrapper.find('[data-testid="study-card-edit-stub__emit-update"]').trigger('click')

    expect(wrapper.emitted('update')).toEqual([['front', 'new text']])
  })
})
