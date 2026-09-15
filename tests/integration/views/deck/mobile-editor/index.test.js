import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import OverlayHost from '@/components/overlay/host.vue'
import { useMobileCardEditor } from '@/views/deck/mobile-editor/use-mobile-card-editor'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/utils/animations/overlay', () => ({
  playEnter: vi.fn((_el, done) => done()),
  playLeave: vi.fn((_el, done) => done())
}))

vi.mock('@/composables/ui/scroll-lock', () => ({
  useScrollLock: () => ({ lock: vi.fn(), unlock: vi.fn() })
}))

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: vi.fn(() => ({ register: vi.fn(), dispose: vi.fn(), clearScope: vi.fn() }))
}))

// This suite exercises the real overlay mechanism end-to-end — mobile-editor's
// api ref bundle is handed to `useOverlay().open()` as `props`, stored on the
// Pinia overlay stack, then spread onto the mounted component via
// `v-bind="entry.props"` in overlay-entry.vue. A shallow fake-context mount
// would hide the regression this guards: without `markRaw` on the stored
// props, Pinia's `reactive()` deep-wraps the bundle and auto-unwraps its
// nested refs (`cards`, `index`, …) at store-write time, so the mounted
// component receives already-unwrapped snapshots instead of live refs and
// `cards.value` reads back `undefined`. Only mounting through the real
// overlay-host/overlay-entry pipeline proves the refs survive live.

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

// Overlay hosts attach real window listeners while open — unmount every mount
// so they don't leak into later tests.
const mounted = []

function mountHost() {
  const wrapper = mount(OverlayHost, {
    attachTo: document.body,
    global: {
      stubs: { FaceEditor: FaceEditorStub, UiDropdownButton: UiDropdownButtonStub }
    }
  })
  mounted.push(wrapper)
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockEmitSfx.mockClear()
})

afterEach(() => {
  while (mounted.length > 0) mounted.pop().unmount()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('mobile-editor/index (real overlay mechanism)', () => {
  test('open_at opens the editor through the real overlay stack, and the api ref bundle reaches nested descendants live', async () => {
    const controller = makeController([
      makeCard({ client_id: 'cid-1' }),
      makeCard({ client_id: 'cid-2' })
    ])
    const editor = useMobileCardEditor(controller)

    editor.open_at('cid-1')

    const wrapper = mountHost()
    await flushPromises()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(true)
    // dialog-card title comes from index.vue's own destructure of `index`/`cards`
    // off the api prop — reading `.value` through both refs.
    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('1 / 2')
    // editor-header (nested descendant) also resolves the same injected context
    expect(wrapper.find('[data-testid="mobile-card-editor__header-end"]').exists()).toBe(true)
    // editor-stage resolves the current card through the injected context —
    // this specifically reads through `cards.value` to find the current card.
    expect(wrapper.find('[data-testid="face-editor-stub"]').text()).toBe('cid-1')
    // editor-controls resolves has_prev/has_next through the injected context
    expect(
      wrapper.find('[data-testid="mobile-card-editor__prev"]').attributes('aria-disabled')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="mobile-card-editor__next"]').attributes('aria-disabled')
    ).toBeUndefined()
  })

  // ── editor-controls lives in dialog-card's #toolbar ──────────

  test('editor-controls is rendered inside the dialog-card toolbar, pinned outside the scrolling body', async () => {
    const controller = makeController([makeCard({ client_id: 'cid-1' })])
    const editor = useMobileCardEditor(controller)
    editor.open_at('cid-1')

    const wrapper = mountHost()
    await flushPromises()

    const toolbar = wrapper.find('[data-testid="dialog-card__toolbar"]')
    expect(toolbar.exists()).toBe(true)
    expect(toolbar.find('[data-testid="mobile-card-editor__prev"]').exists()).toBe(true)
  })

  test('calling open_at again while open updates the existing overlay instead of stacking a second one', async () => {
    const controller = makeController([
      makeCard({ client_id: 'cid-1' }),
      makeCard({ client_id: 'cid-2' })
    ])
    const editor = useMobileCardEditor(controller)

    editor.open_at('cid-1')
    const wrapper = mountHost()
    await flushPromises()

    editor.open_at('cid-2')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="mobile-card-editor"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="face-editor-stub"]').text()).toBe('cid-2')
  })

  test('a full close-then-reopen cycle works: dialog-card close dismisses the overlay, and a later open_at reopens it', async () => {
    const controller = makeController([makeCard({ client_id: 'cid-1' })])
    const editor = useMobileCardEditor(controller)

    editor.open_at('cid-1')
    const wrapper = mountHost()
    await flushPromises()

    await wrapper.find('[data-testid="dialog-card__close"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(false)

    editor.open_at('cid-1')
    await flushPromises()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(true)
  })

  test('onClosed fires (resetting internal state) when the overlay is dismissed via backdrop, not just via close()', async () => {
    const controller = makeController([makeCard({ client_id: 'cid-1' })])
    const editor = useMobileCardEditor(controller)

    editor.open_at('cid-1')
    const wrapper = mountHost()
    await flushPromises()

    await wrapper.find('[data-testid="overlay-backdrop"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(false)

    editor.open_at('cid-1')
    await flushPromises()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(true)
  })

  test('reconcileCursor still closes the real overlay when deleting the last card empties the deck', async () => {
    const controller = makeController([makeCard({ id: 1, client_id: 'cid-1' })])
    const editor = useMobileCardEditor(controller)

    editor.open_at('cid-1')
    const wrapper = mountHost()
    await flushPromises()

    controller.actions.onDeleteCards.mockImplementationOnce(async () => {
      controller.list.all_cards.value = []
    })

    await editor.deleteCard()
    await flushPromises()

    expect(wrapper.find('[data-testid="mobile-card-editor"]').exists()).toBe(false)
  })

  // ── live-ref survival through the stored overlay props ────────
  // Regression guard for the `markRaw(entry.props)` fix in the overlay
  // store's `push` — without it, Pinia's deep `reactive()` unwraps the
  // `cards` ref nested inside `api` the moment it's stored, so a mutation to
  // the controller's underlying ref after open would never reach the
  // mounted component.

  test('a card appended to the controller after open is reflected live, through the ref stored in props', async () => {
    const controller = makeController([makeCard({ client_id: 'cid-1' })])
    const editor = useMobileCardEditor(controller)

    editor.open_at('cid-1')
    const wrapper = mountHost()
    await flushPromises()

    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('1 / 1')

    controller.list.all_cards.value = [
      ...controller.list.all_cards.value,
      makeCard({ client_id: 'cid-2' })
    ]
    await flushPromises()

    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('1 / 2')
  })
})
