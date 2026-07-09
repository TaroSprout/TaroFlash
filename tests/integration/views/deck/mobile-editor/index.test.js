import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import ModalUiKit from '@/components/ui-kit/modal.vue'
import { useModal, request_close_handlers } from '@/composables/modal'
import { useMobileCardEditor } from '@/views/deck/mobile-editor/use-mobile-card-editor'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

// gsap is imported transitively via modal-mode-config → animations/modal.
// The mock must call onComplete so transition-group JS hooks finish in browser mode.
vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: vi.fn(() => ({ register: vi.fn(), dispose: vi.fn(), clearScope: vi.fn() }))
}))

// This suite exercises the real modal system end-to-end — mobile-editor/index.vue
// (and the editor-header/editor-stage/editor-controls it renders) inject
// mobileCardEditorKey via plain inject(), but the modal hosting them is mounted
// by the global modal renderer, which sits OUTSIDE the deck view's own
// provide/inject tree. A shallow inject() mock would hide a regression where the
// context is dropped or the key mismatches — only mounting through the real
// modal-slot proves the wiring holds.

const FaceEditorStub = defineComponent({
  name: 'FaceEditor',
  props: ['card', 'side', 'card_attributes', 'placeholder', 'input_testid'],
  setup(props) {
    return () => h('div', { 'data-testid': 'face-editor-stub' }, props.card?.client_id)
  }
})

const UiDropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  props: ['options'],
  setup() {
    return () => h('div', { 'data-testid': 'mobile-card-editor__menu-stub' })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return {
    id: null,
    client_id: 'cid-1',
    front_text: '',
    back_text: '',
    front_image_path: null,
    back_image_path: null,
    deck_id: 1,
    ...overrides
  }
}

function makeController(cards = []) {
  const all_cards = ref(cards)
  const updateCard = vi.fn().mockResolvedValue(undefined)
  const onMoveCards = vi.fn().mockResolvedValue(undefined)
  const onDeleteCards = vi.fn().mockResolvedValue(undefined)
  return {
    list: { all_cards },
    card_attributes: { front: {}, back: {} },
    saving: ref(false),
    updateCard,
    actions: { onMoveCards, onDeleteCards }
  }
}

// Modal hosts attach real window listeners while open — unmount every mount so
// they don't leak into later tests.
const mounted = []

function mountModal() {
  const wrapper = mount(ModalUiKit, {
    attachTo: document.body,
    global: {
      stubs: { FaceEditor: FaceEditorStub, UiDropdownButton: UiDropdownButtonStub },
      directives: { sfx: {} }
    }
  })
  mounted.push(wrapper)
  return wrapper
}

beforeEach(() => {
  const { modal_stack, pop } = useModal()
  while (modal_stack.value.length > 0) pop()
  request_close_handlers.clear()
  mockEmitSfx.mockClear()
})

afterEach(() => {
  while (mounted.length > 0) mounted.pop().unmount()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('mobile-editor/index (real modal stack) [obligation]', () => {
  test('open_at opens the editor through the real modal system and the context reaches nested descendants [obligation]', async () => {
    const controller = makeController([
      makeCard({ client_id: 'cid-1' }),
      makeCard({ client_id: 'cid-2' })
    ])
    const editor = useMobileCardEditor(controller)

    editor.open_at('cid-1')

    const wrapper = mountModal()
    await nextTick()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(true)
    // dialog-card title comes from index.vue's own inject of `index`/`cards`
    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('1 / 2')
    // editor-header (nested descendant) also resolves the same injected context
    expect(wrapper.find('[data-testid="mobile-card-editor__header-end"]').exists()).toBe(true)
    // editor-stage resolves the current card through the injected context
    expect(wrapper.find('[data-testid="face-editor-stub"]').text()).toBe('cid-1')
    // editor-controls resolves has_prev/has_next through the injected context
    expect(
      wrapper.find('[data-testid="mobile-card-editor__prev"]').attributes('aria-disabled')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="mobile-card-editor__next"]').attributes('aria-disabled')
    ).toBeUndefined()
  })

  test('calling open_at again while open updates the existing modal instead of stacking a second one [obligation]', async () => {
    const controller = makeController([
      makeCard({ client_id: 'cid-1' }),
      makeCard({ client_id: 'cid-2' })
    ])
    const editor = useMobileCardEditor(controller)

    editor.open_at('cid-1')
    const wrapper = mountModal()
    await nextTick()

    editor.open_at('cid-2')
    await nextTick()

    expect(wrapper.findAll('[data-testid="mobile-card-editor"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="face-editor-stub"]').text()).toBe('cid-2')
  })

  test('a full close-then-reopen cycle works: dialog-card close dismisses the modal, and a later open_at reopens it [obligation]', async () => {
    const controller = makeController([makeCard({ client_id: 'cid-1' })])
    const editor = useMobileCardEditor(controller)

    editor.open_at('cid-1')
    const wrapper = mountModal()
    await nextTick()

    await wrapper.find('[data-testid="dialog-card__close"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(false)

    editor.open_at('cid-1')
    await nextTick()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(true)
  })

  test('onClosed fires (resetting internal state) when the modal is dismissed via backdrop, not just via close() [obligation]', async () => {
    const controller = makeController([makeCard({ client_id: 'cid-1' })])
    const editor = useMobileCardEditor(controller)

    editor.open_at('cid-1')
    const wrapper = mountModal()
    await nextTick()

    await wrapper.find('[data-testid="ui-kit-modal"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(false)

    editor.open_at('cid-1')
    await nextTick()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(true)
  })

  test('reconcileCursor still closes the real modal when deleting the last card empties the deck [obligation]', async () => {
    const controller = makeController([makeCard({ id: 1, client_id: 'cid-1' })])
    const editor = useMobileCardEditor(controller)

    editor.open_at('cid-1')
    const wrapper = mountModal()
    await nextTick()

    controller.actions.onDeleteCards.mockImplementationOnce(async () => {
      controller.list.all_cards.value = []
    })

    await editor.deleteCard()
    await nextTick()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(false)
  })
})
