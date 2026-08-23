import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import CardGridEmpty from '@/views/deck/card-grid/empty-state.vue'
import { cardEditorKey } from '@/views/deck/composables/list-controller'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'

// ── Module-level mocks ────────────────────────────────────────────────────────

const matchMediaMock = vi.fn()

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: (...args) => matchMediaMock(...args)
}))

// Stub GSAP so any animation hooks from child stubs don't throw
vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const CardGridSkeletonStub = defineComponent({
  name: 'CardGridSkeleton',
  props: {
    shimmer: { type: Boolean, default: true },
    size: String,
    count: Number
  },
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'card-grid-skeleton-stub',
        'data-shimmer': String(props.shimmer),
        'data-size': props.size,
        'data-count': String(props.count)
      })
  }
})

// Renders a primary button (@click) plus one button per option (@select), so
// tests can drive both the create-button's own body and its dropdown entries
// without reaching into the real popover/menu machinery.
const UiDropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  inheritAttrs: false,
  props: { options: { type: Array, default: () => [] } },
  emits: ['click', 'select'],
  setup(props, { attrs, slots, emit }) {
    return () => {
      const raw_testid = attrs['data-testid']
      const testid = typeof raw_testid === 'string' ? raw_testid : 'ui-dropdown-button-stub'
      return h('div', { 'data-testid': testid }, [
        h(
          'button',
          { 'data-testid': `${testid}__primary`, onClick: (e) => emit('click', e) },
          slots.default?.()
        ),
        ...props.options.map((option) =>
          h(
            'button',
            {
              'data-testid': `${testid}__option-${option.value}`,
              onClick: () => emit('select', option)
            },
            option.label
          )
        ),
        // Fires with a payload the real options list never offers, so a test
        // can drive the select handler's non-import branch independent of
        // whatever CardGridEmpty currently passes as `options`.
        h(
          'button',
          {
            'data-testid': `${testid}__option-forced-other`,
            onClick: () => emit('select', { label: 'Other', value: 'other' })
          },
          'Other'
        )
      ])
    }
  }
})

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup: (props) => () => h('span', { 'data-testid': 'ui-icon-stub', 'data-src': props.src })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEditor({ newCard } = {}) {
  return { newCard: newCard ?? vi.fn() }
}

function makeMobileEditor({ openNewCard } = {}) {
  return { openNewCard: openNewCard ?? vi.fn() }
}

function mount({
  editor,
  mobileEditor,
  isCompact = false,
  isMobile = false,
  props = {},
  shell
} = {}) {
  // isCompact drives w<sm (base vs md skeleton size); isMobile drives w<md
  // (desktop mode-stack vs mobile editor for the create button).
  matchMediaMock.mockImplementation((token) => {
    if (token === 'w<sm') return ref(isCompact)
    if (token === 'w<md') return ref(isMobile)
    return ref(false)
  })

  const provide = {
    [cardEditorKey]: editor ?? makeEditor(),
    [mobileCardEditorKey]: mobileEditor ?? makeMobileEditor()
  }
  if (shell !== undefined) provide[deckViewShellKey] = shell

  return shallowMount(CardGridEmpty, {
    props,
    global: {
      provide,
      stubs: {
        CardGridSkeleton: CardGridSkeletonStub,
        UiDropdownButton: UiDropdownButtonStub,
        UiIcon: UiIconStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CardGridEmpty (card-grid/empty-state.vue)', () => {
  beforeEach(() => {
    matchMediaMock.mockReset()
    matchMediaMock.mockReturnValue(ref(false)) // default: wide screen → md
  })

  // ── Structure / testids [obligation] ─────────────────────────────────────

  test('renders card-grid-empty root [obligation]', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="card-grid-empty"]').exists()).toBe(true)
  })

  test('renders card-grid-empty__overlay [obligation]', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="card-grid-empty__overlay"]').exists()).toBe(true)
  })

  test('renders card-grid-empty__content [obligation]', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="card-grid-empty__content"]').exists()).toBe(true)
  })

  test('renders card-grid-empty__message [obligation]', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="card-grid-empty__message"]').exists()).toBe(true)
  })

  test('renders card-grid-empty__create-button [obligation]', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="card-grid-empty__create-button"]').exists()).toBe(true)
  })

  // ── Skeleton backdrop props [obligation] ──────────────────────────────────

  test('skeleton has shimmer=false [obligation]', () => {
    const wrapper = mount()
    const skeleton = wrapper.find('[data-testid="card-grid-skeleton-stub"]')
    expect(skeleton.attributes('data-shimmer')).toBe('false')
  })

  test('skeleton has count=24 [obligation]', () => {
    const wrapper = mount()
    const skeleton = wrapper.find('[data-testid="card-grid-skeleton-stub"]')
    expect(skeleton.attributes('data-count')).toBe('24')
  })

  test('skeleton has size="md" on wider screens (isCompact=false) [obligation]', () => {
    const wrapper = mount({ isCompact: false })
    const skeleton = wrapper.find('[data-testid="card-grid-skeleton-stub"]')
    expect(skeleton.attributes('data-size')).toBe('md')
  })

  test('skeleton has size="base" on narrow screens (isCompact=true) [obligation]', () => {
    const wrapper = mount({ isCompact: true })
    const skeleton = wrapper.find('[data-testid="card-grid-skeleton-stub"]')
    expect(skeleton.attributes('data-size')).toBe('base')
  })

  // ── create button — desktop vs mobile [obligation] ────────────────────────

  test('clicking the create button primary body calls newCard (desktop editor) at desktop width [obligation]', async () => {
    const newCard = vi.fn()
    const openNewCard = vi.fn()
    const wrapper = mount({
      isMobile: false,
      editor: makeEditor({ newCard }),
      mobileEditor: makeMobileEditor({ openNewCard })
    })
    await wrapper.find('[data-testid="card-grid-empty__create-button__primary"]').trigger('click')
    expect(newCard).toHaveBeenCalledOnce()
    expect(openNewCard).not.toHaveBeenCalled()
  })

  test('clicking the create button primary body calls mobile_editor.openNewCard at phone width [obligation]', async () => {
    const newCard = vi.fn()
    const openNewCard = vi.fn()
    const wrapper = mount({
      isMobile: true,
      editor: makeEditor({ newCard }),
      mobileEditor: makeMobileEditor({ openNewCard })
    })
    await wrapper.find('[data-testid="card-grid-empty__create-button__primary"]').trigger('click')
    expect(openNewCard).toHaveBeenCalledOnce()
    expect(newCard).not.toHaveBeenCalled()
  })

  // ── create button — import dropdown entry [obligation] ────────────────────
  // The primary press → openNewCard regression risk is the handler moving from
  // @press to @click during the ui-button → ui-dropdown-button swap; selecting
  // the import option is a separate seam entirely, routed through the shell.

  test('selecting the import option calls the injected shell setMode("import") [obligation]', async () => {
    const setMode = vi.fn()
    const wrapper = mount({ shell: { setMode } })
    await wrapper
      .find('[data-testid="card-grid-empty__create-button__option-import"]')
      .trigger('click')
    expect(setMode).toHaveBeenCalledWith('import')
  })

  test('selecting a non-import option does not call setMode [obligation]', async () => {
    const setMode = vi.fn()
    const wrapper = mount({ shell: { setMode } })
    // Only "import" is offered today, but the handler branches on option.value —
    // this guards against a future second option silently triggering import mode.
    await wrapper
      .find('[data-testid="card-grid-empty__create-button__option-forced-other"]')
      .trigger('click')
    expect(setMode).not.toHaveBeenCalled()
  })

  test('selecting the import option with no shell injected does not throw [obligation]', async () => {
    const wrapper = mount({ shell: null })
    await expect(
      wrapper.find('[data-testid="card-grid-empty__create-button__option-import"]').trigger('click')
    ).resolves.not.toThrow()
  })

  // ── heading uses i18n key [obligation] ────────────────────────────────────
  // Browser tests load real i18n (setup-browser.js). We assert the element
  // exists and contains non-empty translated text — this confirms the key
  // is wired without hard-coding the English value.

  test('message element is non-empty (i18n key deck-view.empty-state.heading is wired) [obligation]', () => {
    const wrapper = mount()
    const msg = wrapper.find('[data-testid="card-grid-empty__message"]')
    expect(msg.text().length).toBeGreaterThan(0)
  })

  // ── icon ──────────────────────────────────────────────────────────────────

  test('renders an icon with src="card-deck" in the content area', () => {
    const wrapper = mount()
    const icon = wrapper.find('[data-testid="ui-icon-stub"]')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('data-src')).toBe('card-deck')
  })

  // ── useMatchMedia called with correct breakpoint ──────────────────────────

  test('calls useMatchMedia with the "w<sm" token to detect compact layout', () => {
    mount()
    expect(matchMediaMock).toHaveBeenCalledWith('w<sm')
  })

  // ── New prop surface (icon/message/show_button/size) [obligation] ────────

  test('defaults are unchanged: card-deck icon, default heading, create button shown, viewport-derived size', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="ui-icon-stub"]').attributes('data-src')).toBe('card-deck')
    expect(wrapper.find('[data-testid="card-grid-empty__create-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-grid-skeleton-stub"]').attributes('data-size')).toBe(
      'md'
    )
  })

  test('renders the icon the import pane asks for', () => {
    const wrapper = mount({ props: { icon: 'card-place' } })
    expect(wrapper.find('[data-testid="ui-icon-stub"]').attributes('data-src')).toBe('card-place')
  })

  test('renders the message the import pane asks for, instead of the default heading', () => {
    const wrapper = mount({ props: { message: 'Nothing imported yet' } })
    expect(wrapper.find('[data-testid="card-grid-empty__message"]').text()).toBe(
      'Nothing imported yet'
    )
  })

  test('show_button=false omits the create button entirely [obligation]', () => {
    const wrapper = mount({ props: { show_button: false } })
    expect(wrapper.find('[data-testid="card-grid-empty__create-button"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'UiDropdownButton' }).exists()).toBe(false)
  })

  test('an explicit size overrides the viewport-derived skeleton size', () => {
    const wrapper = mount({ props: { size: 'base' }, isCompact: false })
    expect(wrapper.find('[data-testid="card-grid-skeleton-stub"]').attributes('data-size')).toBe(
      'base'
    )
  })
})
