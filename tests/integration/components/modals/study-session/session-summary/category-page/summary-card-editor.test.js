import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SummaryCardEditor from '@/views/study-session/session-summary/category-page/summary-card-editor.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SummaryCardEditor', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  test('renders the editor root and the card editor for the given card [obligation]', () => {
    const wrapper = mountEditor({ card: makeCard({ id: 42 }) })
    expect(wrapper.find('[data-testid="session-summary__card-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-card-edit-stub"]').exists()).toBe(true)
  })

  test('starts on the front side [obligation]', () => {
    const wrapper = mountEditor()
    expect(wrapper.find('[data-testid="study-card-edit-stub"]').attributes('data-side')).toBe(
      'front'
    )
  })

  // ── flip ──────────────────────────────────────────────────────────────────

  test('flip switches to the back side and plays a transition sfx [obligation]', async () => {
    const wrapper = mountEditor()
    await wrapper.find('[data-testid="session-summary__card-editor-flip"]').trigger('click')

    expect(wrapper.find('[data-testid="study-card-edit-stub"]').attributes('data-side')).toBe(
      'back'
    )
    expect(mockEmitSfx).toHaveBeenCalledWith('transition_up')
  })

  test('flipping twice returns to the front and plays the opposite sfx [obligation]', async () => {
    const wrapper = mountEditor()
    const flip = wrapper.find('[data-testid="session-summary__card-editor-flip"]')

    await flip.trigger('click')
    await flip.trigger('click')

    expect(wrapper.find('[data-testid="study-card-edit-stub"]').attributes('data-side')).toBe(
      'front'
    )
    expect(mockEmitSfx).toHaveBeenLastCalledWith('transition_down')
  })

  // ── update forwarding ─────────────────────────────────────────────────────

  test('forwards the child editor update event unchanged [obligation]', async () => {
    const wrapper = mountEditor()
    await wrapper.find('[data-testid="study-card-edit-stub__emit-update"]').trigger('click')

    expect(wrapper.emitted('update')).toEqual([['front', 'new text']])
  })

  // ── done ──────────────────────────────────────────────────────────────────

  test('done emits "done" and plays its own sfx [obligation]', async () => {
    const wrapper = mountEditor()
    await wrapper.find('[data-testid="session-summary__card-editor-done"]').trigger('click')

    expect(wrapper.emitted('done')).toHaveLength(1)
    expect(mockEmitSfx).toHaveBeenCalledWith('music_plink_ok')
  })
})
