import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref, computed } from 'vue'

vi.mock('@/composables/use-media-query', async () => {
  const { ref } = await import('vue')
  const isMd = ref(true)
  const isSm = ref(true)
  return {
    useMediaQuery: (key) => {
      if (key === 'md') return isMd
      if (key === 'sm') return isSm
      return ref(false)
    },
    __isMd: isMd,
    __isSm: isSm
  }
})

vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn((_el, opts) => opts?.onComplete?.()),
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.())
  }
}))

import * as MediaQueryModule from '@/composables/use-media-query'
import CardGrid from '@/views/deck/card-grid/index.vue'

const isMdRef = MediaQueryModule.__isMd

function makeEditor({
  cards = [],
  visible = cards,
  is_selecting = ref(false),
  isCardSelected = () => false,
  hasNextPage = ref(false),
  isLoading = ref(false),
  is_page_loading = ref(false),
  observeSentinel = vi.fn(),
  setVisibleCapacity = vi.fn(),
  page = ref(0),
  page_size = ref(8),
  page_direction = ref('forward'),
  card_attributes = { front: {}, back: {} }
} = {}) {
  return {
    list: {
      all_cards: computed(() => cards.map((c, i) => ({ ...c, client_id: `cid-${c.id ?? i}` })))
    },
    selection: { is_selecting, isCardSelected },
    carousel: {
      visible_cards: computed(() =>
        visible.map((c, i) => ({ ...c, client_id: `cid-${c.id ?? i}` }))
      ),
      is_page_loading,
      setVisibleCapacity,
      page,
      page_size,
      page_direction
    },
    hasNextPage,
    isLoading,
    observeSentinel,
    card_attributes
  }
}

function mount(options = {}) {
  const editor = options.editor ?? makeEditor(options)
  return shallowMount(CardGrid, {
    global: {
      provide: {
        'card-editor': editor
      }
    }
  })
}

describe('CardGrid (card-grid/index.vue)', () => {
  beforeEach(() => {
    isMdRef.value = true
  })

  // ── Sentinel rendering — only on mobile (below md) ────────────────────────

  test('omits the sentinel on md+ even when hasNextPage is true', () => {
    isMdRef.value = true
    const wrapper = mount({ hasNextPage: ref(true) })
    expect(wrapper.find('[data-testid="card-grid__sentinel"]').exists()).toBe(false)
  })

  test('renders the sentinel below md when hasNextPage is true', () => {
    isMdRef.value = false
    const wrapper = mount({ hasNextPage: ref(true) })
    expect(wrapper.find('[data-testid="card-grid__sentinel"]').exists()).toBe(true)
  })

  test('omits the sentinel below md when hasNextPage is false', () => {
    isMdRef.value = false
    const wrapper = mount({ hasNextPage: ref(false) })
    expect(wrapper.find('[data-testid="card-grid__sentinel"]').exists()).toBe(false)
  })

  test('shows a loading indicator inside the mobile sentinel while fetching', () => {
    isMdRef.value = false
    const wrapper = mount({ hasNextPage: ref(true), isLoading: ref(true) })
    expect(wrapper.find('[data-testid="card-grid__sentinel"]').text()).toContain('Loading')
  })

  // ── observeSentinel wiring ────────────────────────────────────────────────

  test('hands the sentinel ref to observeSentinel on mount', () => {
    const observeSentinel = vi.fn()
    mount({ observeSentinel })
    expect(observeSentinel).toHaveBeenCalledOnce()
  })

  // ── Source switching — visible_cards on md+, all_cards below md ──────────

  test('renders visible_cards (page window) on md+', () => {
    isMdRef.value = true
    const cards = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const visible = [{ id: 2 }, { id: 3 }]
    const wrapper = mount({ editor: makeEditor({ cards, visible }) })
    const items = wrapper.findAllComponents({ name: 'GridItem' })
    expect(items.map((i) => i.props('card').id)).toEqual([2, 3])
  })

  test('renders all_cards below md regardless of visible_cards', () => {
    isMdRef.value = false
    const cards = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const visible = [{ id: 2 }]
    const wrapper = mount({ editor: makeEditor({ cards, visible }) })
    const items = wrapper.findAllComponents({ name: 'GridItem' })
    expect(items.map((i) => i.props('card').id)).toEqual([1, 2, 3, 4])
  })

  // ── Skeleton placeholders ────────────────────────────────────────────────

  test('renders skeleton placeholders instead of grid-items when is_page_loading is true', () => {
    const cards = [{ id: 1 }, { id: 2 }]
    const wrapper = mount({
      editor: makeEditor({
        cards,
        visible: cards,
        is_page_loading: ref(true),
        page_size: ref(4)
      })
    })
    expect(wrapper.findAllComponents({ name: 'GridItem' })).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="card-grid__skeleton"]').length).toBeGreaterThan(0)
  })

  test('skeleton count matches page_size when capacity is unknown', () => {
    const wrapper = mount({
      editor: makeEditor({
        cards: [],
        visible: [],
        is_page_loading: ref(true),
        page_size: ref(6)
      })
    })
    expect(wrapper.findAll('[data-testid="card-grid__skeleton"]')).toHaveLength(6)
  })

  test('renders skeleton (not grid-items) when no visible cards even if not page-loading', () => {
    const wrapper = mount({
      editor: makeEditor({
        cards: [{ id: 1 }],
        visible: [],
        is_page_loading: ref(false),
        page_size: ref(3)
      })
    })
    expect(wrapper.findAllComponents({ name: 'GridItem' })).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="card-grid__skeleton"]').length).toBeGreaterThan(0)
  })

  test('renders grid-items (not skeleton) when visible_cards has content and not page-loading', () => {
    isMdRef.value = true
    const cards = [{ id: 1 }, { id: 2 }]
    const wrapper = mount({
      editor: makeEditor({
        cards,
        visible: cards,
        is_page_loading: ref(false)
      })
    })
    expect(wrapper.findAllComponents({ name: 'GridItem' })).toHaveLength(2)
    expect(wrapper.find('[data-testid="card-grid__skeleton"]').exists()).toBe(false)
  })

  // ── Grid item rendering — client_id + isCardSelected ─────────────────────

  test('forwards isCardSelected(card.id) as the selected prop on each grid-item', () => {
    isMdRef.value = true
    const cards = [{ id: 1 }, { id: 2 }]
    const isCardSelected = vi.fn((id) => id === 1)
    const wrapper = mount({ editor: makeEditor({ cards, visible: cards, isCardSelected }) })
    const items = wrapper.findAllComponents({ name: 'GridItem' })
    expect(items[0].props('selected')).toBe(true)
    expect(items[1].props('selected')).toBe(false)
  })

  test('passes selected=false when card.id is undefined (defensive)', () => {
    isMdRef.value = true
    const cards = [{ id: undefined }]
    const wrapper = mount({ editor: makeEditor({ cards, visible: cards }) })
    expect(wrapper.findAllComponents({ name: 'GridItem' })[0].props('selected')).toBe(false)
  })

  // (selection now flows from grid-item directly into actions.onSelectCard
  // via the injected card-editor — no card-selected emit chain to assert)
})
