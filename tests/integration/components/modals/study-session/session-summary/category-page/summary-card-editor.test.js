import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
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

  // ── exposed flip() ──────────────────────────────────────────
  // The Flip button now lives in the session's shared toolbar footer, which
  // reaches this editor's flip() through a template ref — no in-component
  // Flip/Done buttons anymore.

  test('flip() switches to the back side and plays a transition sfx', async () => {
    const wrapper = mountEditor()
    wrapper.vm.flip()
    await nextTick()

    expect(wrapper.find('[data-testid="study-card-edit-stub"]').attributes('data-side')).toBe(
      'back'
    )
    expect(mockEmitSfx).toHaveBeenCalledWith('card.flip-away')
  })

  test('calling flip() twice returns to the front and plays the opposite sfx', async () => {
    const wrapper = mountEditor()

    wrapper.vm.flip()
    await nextTick()
    wrapper.vm.flip()
    await nextTick()

    expect(wrapper.find('[data-testid="study-card-edit-stub"]').attributes('data-side')).toBe(
      'front'
    )
    expect(mockEmitSfx).toHaveBeenLastCalledWith('card.flip-back')
  })

  // ── update forwarding ─────────────────────────────────────────────────────

  test('forwards the child editor update event unchanged', async () => {
    const wrapper = mountEditor()
    await wrapper.find('[data-testid="study-card-edit-stub__emit-update"]').trigger('click')

    expect(wrapper.emitted('update')).toEqual([['front', 'new text']])
  })
})
