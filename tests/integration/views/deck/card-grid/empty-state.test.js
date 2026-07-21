import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import CardGridEmpty from '@/views/deck/card-grid/empty-state.vue'
import { cardEditorKey } from '@/views/deck/composables/list-controller'
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

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_props, { attrs, slots, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-button-stub',
          onClick: () => emit('press')
        },
        slots.default?.()
      )
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

function mount({ editor, mobileEditor, isCompact = false, isMobile = false } = {}) {
  // isCompact drives w<sm (base vs md skeleton size); isMobile drives w<md
  // (desktop mode-stack vs mobile editor for the create button).
  matchMediaMock.mockImplementation((token) => {
    if (token === 'w<sm') return ref(isCompact)
    if (token === 'w<md') return ref(isMobile)
    return ref(false)
  })
  return shallowMount(CardGridEmpty, {
    global: {
      provide: {
        [cardEditorKey]: editor ?? makeEditor(),
        [mobileCardEditorKey]: mobileEditor ?? makeMobileEditor()
      },
      stubs: {
        CardGridSkeleton: CardGridSkeletonStub,
        UiButton: UiButtonStub,
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

  test('clicking the create button calls newCard (desktop editor) at desktop width [obligation]', async () => {
    const newCard = vi.fn()
    const openNewCard = vi.fn()
    const wrapper = mount({
      isMobile: false,
      editor: makeEditor({ newCard }),
      mobileEditor: makeMobileEditor({ openNewCard })
    })
    await wrapper.find('[data-testid="card-grid-empty__create-button"]').trigger('click')
    expect(newCard).toHaveBeenCalledOnce()
    expect(openNewCard).not.toHaveBeenCalled()
  })

  test('clicking the create button calls mobile_editor.openNewCard at phone width [obligation]', async () => {
    const newCard = vi.fn()
    const openNewCard = vi.fn()
    const wrapper = mount({
      isMobile: true,
      editor: makeEditor({ newCard }),
      mobileEditor: makeMobileEditor({ openNewCard })
    })
    await wrapper.find('[data-testid="card-grid-empty__create-button"]').trigger('click')
    expect(openNewCard).toHaveBeenCalledOnce()
    expect(newCard).not.toHaveBeenCalled()
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
})
