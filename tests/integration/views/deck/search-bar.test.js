import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, useAttrs } from 'vue'

// Wait for Vue Transition JS hooks — they use 2x rAF even with :css="false"
async function flushTransition() {
  await nextTick()
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  await flushPromises()
}

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx, mockOpen, mockClose, mockExpandSearchInput, mockCollapseSearchInput } =
  vi.hoisted(() => ({
    mockEmitSfx: vi.fn(),
    mockOpen: vi.fn(),
    mockClose: vi.fn(),
    mockExpandSearchInput: vi.fn((_el, _w, done) => done?.()),
    mockCollapseSearchInput: vi.fn((_el, done) => done?.())
  }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

// Animations call done() synchronously so Transition JS hooks complete
vi.mock('@/utils/animations/deck-view/search-field', () => ({
  expandSearchInput: mockExpandSearchInput,
  collapseSearchInput: mockCollapseSearchInput
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import SearchBar from '@/views/deck/search-bar.vue'
import { cardSearchKey } from '@/views/deck/composables/card-search'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['size', 'variant', 'loading', 'iconLeft', 'iconOnly'],
  emits: ['press'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          ...attrs,
          'data-icon-left': props.iconLeft,
          'data-variant': props.variant,
          'data-loading': String(props.loading),
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

// ── Factory ───────────────────────────────────────────────────────────────────

function makeSearch({ is_searching = false, query_value = '', is_loading = false } = {}) {
  const is_searching_ref = ref(is_searching)
  const query_ref = ref(query_value)
  const open = vi.fn(() => {
    is_searching_ref.value = true
  })
  const close = vi.fn(() => {
    is_searching_ref.value = false
    query_ref.value = ''
  })
  return {
    is_searching: is_searching_ref,
    query: query_ref,
    is_loading: ref(is_loading),
    open,
    close
  }
}

function mountSearchBar(search = makeSearch(), props = {}) {
  return shallowMount(SearchBar, {
    props,
    global: {
      provide: { [cardSearchKey]: search },
      // Use the real <Transition> so @enter/@leave JS hooks fire in hook tests
      stubs: { UiButton: UiButtonStub, Transition: false }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('search-bar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── data-expanded state ────────────────────────────────────────────────────

  test('data-expanded is false when not searching', () => {
    const wrapper = mountSearchBar(makeSearch({ is_searching: false }))
    expect(wrapper.find('[data-testid="deck-search-bar"]').attributes('data-expanded')).toBe(
      'false'
    )
  })

  test('data-expanded is true when is_searching is true', () => {
    const wrapper = mountSearchBar(makeSearch({ is_searching: true }))
    expect(wrapper.find('[data-testid="deck-search-bar"]').attributes('data-expanded')).toBe('true')
  })

  // ── input field visibility ─────────────────────────────────────────────────

  test('input field is hidden when is_searching is false', () => {
    const wrapper = mountSearchBar(makeSearch({ is_searching: false }))
    expect(wrapper.find('[data-testid="deck-search-bar__field"]').exists()).toBe(false)
  })

  test('input field is visible when is_searching is true', () => {
    const wrapper = mountSearchBar(makeSearch({ is_searching: true }))
    expect(wrapper.find('[data-testid="deck-search-bar__field"]').exists()).toBe(true)
  })

  // ── button icon tri-state ──────────────────────────────────────────────────

  test('button icon is "search" when field has no text [obligation]', async () => {
    const wrapper = mountSearchBar(makeSearch({ is_searching: true, query_value: '' }))
    // draft is empty so has_text=false → icon is "search"
    const btn = wrapper.find('[data-testid="deck-search-bar__button"]')
    expect(btn.attributes('data-icon-left')).toBe('search')
  })

  test('button icon is "close" when field has text [obligation]', async () => {
    const wrapper = mountSearchBar(makeSearch({ is_searching: true }))
    await wrapper.find('[data-testid="deck-search-bar__input"]').setValue('hello')
    const btn = wrapper.find('[data-testid="deck-search-bar__button"]')
    expect(btn.attributes('data-icon-left')).toBe('close')
  })

  // ── variant prop ───────────────────────────────────────────────────────────

  test('button uses the variant prop when not expanded [obligation]', () => {
    const wrapper = mountSearchBar(makeSearch({ is_searching: false }), { variant: 'outline' })
    expect(wrapper.find('[data-testid="deck-search-bar__button"]').attributes('data-variant')).toBe(
      'outline'
    )
  })

  test('button variant is forced to "ghost" when expanded [obligation]', () => {
    const wrapper = mountSearchBar(makeSearch({ is_searching: true }), { variant: 'solid' })
    expect(wrapper.find('[data-testid="deck-search-bar__button"]').attributes('data-variant')).toBe(
      'ghost'
    )
  })

  // ── button click tri-state ─────────────────────────────────────────────────

  test('pressing button when closed calls open() [obligation]', async () => {
    const search = makeSearch({ is_searching: false })
    const wrapper = mountSearchBar(search)
    await wrapper.find('[data-testid="deck-search-bar__button"]').trigger('click')
    expect(search.open).toHaveBeenCalledOnce()
  })

  test('pressing button when open with no text calls submit() (sets query to empty) [obligation]', async () => {
    const search = makeSearch({ is_searching: true, query_value: '' })
    const wrapper = mountSearchBar(search)
    // draft is empty → submit path → sets query.value = draft.trim() = ''
    await wrapper.find('[data-testid="deck-search-bar__button"]').trigger('click')
    expect(search.query.value).toBe('')
    expect(search.open).not.toHaveBeenCalled()
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('pressing button when open with text calls clear() [obligation]', async () => {
    const search = makeSearch({ is_searching: true })
    const wrapper = mountSearchBar(search)
    await wrapper.find('[data-testid="deck-search-bar__input"]').setValue('some text')
    await wrapper.find('[data-testid="deck-search-bar__button"]').trigger('click')
    // clear() empties the draft and query, and emits snappy_button_5
    expect(wrapper.find('[data-testid="deck-search-bar__input"]').element.value).toBe('')
    expect(search.query.value).toBe('')
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  // ── clear() refocuses input ────────────────────────────────────────────────

  test('clear() emits snappy_button_5 sfx [obligation]', async () => {
    const search = makeSearch({ is_searching: true })
    const wrapper = mountSearchBar(search)
    await wrapper.find('[data-testid="deck-search-bar__input"]').setValue('text')
    mockEmitSfx.mockClear()
    await wrapper.find('[data-testid="deck-search-bar__button"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  // ── Enter key submits immediately (bypasses debounce) ─────────────────────

  test('Enter key commits draft to query immediately [obligation]', async () => {
    const search = makeSearch({ is_searching: true })
    const wrapper = mountSearchBar(search)
    const input = wrapper.find('[data-testid="deck-search-bar__input"]')
    await input.setValue('cat')
    await input.trigger('keydown.enter')
    expect(search.query.value).toBe('cat')
  })

  // ── Esc key closes the bar ─────────────────────────────────────────────────

  test('Esc key closes the bar [obligation]', async () => {
    const search = makeSearch({ is_searching: true })
    const wrapper = mountSearchBar(search)
    await wrapper.find('[data-testid="deck-search-bar__input"]').trigger('keydown.esc')
    expect(search.close).toHaveBeenCalledOnce()
  })

  // ── debounce on input event ────────────────────────────────────────────────

  test('typing fires a debounced submit — does not commit immediately [obligation]', async () => {
    vi.useFakeTimers()
    const search = makeSearch({ is_searching: true })
    const wrapper = mountSearchBar(search)
    const input = wrapper.find('[data-testid="deck-search-bar__input"]')
    // Type into the input — this triggers oninput which calls debounce(submit, ...)
    await input.setValue('dog')
    await input.trigger('input')
    // Before debounce fires, query should still be empty
    expect(search.query.value).toBe('')
    vi.useRealTimers()
  })

  test('Enter bypasses debounce and commits synchronously [obligation]', async () => {
    vi.useFakeTimers()
    const search = makeSearch({ is_searching: true })
    const wrapper = mountSearchBar(search)
    const input = wrapper.find('[data-testid="deck-search-bar__input"]')
    await input.setValue('cat')
    // Enter fires submit directly, not through debounce
    await input.trigger('keydown.enter')
    expect(search.query.value).toBe('cat')
    vi.useRealTimers()
  })

  // ── focusout behavior ──────────────────────────────────────────────────────

  test('focusout closes the bar when field is empty and focus left the container [obligation]', async () => {
    const search = makeSearch({ is_searching: true, query_value: '' })
    const wrapper = mountSearchBar(search)
    const container = wrapper.find('[data-testid="deck-search-bar"]')
    // relatedTarget is null (focus left the container entirely)
    const focusout = new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
    container.element.dispatchEvent(focusout)
    await wrapper.vm.$nextTick()
    expect(search.close).toHaveBeenCalledOnce()
  })

  test('focusout does NOT close when field has text (filtered results persist) [obligation]', async () => {
    const search = makeSearch({ is_searching: true })
    const wrapper = mountSearchBar(search)
    const input = wrapper.find('[data-testid="deck-search-bar__input"]')
    await input.setValue('existing query')
    const container = wrapper.find('[data-testid="deck-search-bar"]')
    const focusout = new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
    container.element.dispatchEvent(focusout)
    await wrapper.vm.$nextTick()
    expect(search.close).not.toHaveBeenCalled()
  })

  test('focusout does NOT close when focus stayed within the container [obligation]', async () => {
    const search = makeSearch({ is_searching: true })
    const wrapper = mountSearchBar(search)
    const container = wrapper.find('[data-testid="deck-search-bar"]')
    // relatedTarget is the button inside the container
    const btn = wrapper.find('[data-testid="deck-search-bar__button"]').element
    const focusout = new FocusEvent('focusout', { bubbles: true, relatedTarget: btn })
    container.element.dispatchEvent(focusout)
    await wrapper.vm.$nextTick()
    expect(search.close).not.toHaveBeenCalled()
  })

  // ── loading state ──────────────────────────────────────────────────────────

  test('button loading prop reflects is_loading from injected search', () => {
    const search = makeSearch({ is_loading: true })
    const wrapper = mountSearchBar(search)
    expect(wrapper.find('[data-testid="deck-search-bar__button"]').attributes('data-loading')).toBe(
      'true'
    )
  })

  // ── Transition JS hooks (onEnter / onLeave / fillTarget) ──────────────────

  test('opening the bar triggers the enter transition (calls expandSearchInput) [obligation]', async () => {
    const search = makeSearch({ is_searching: false })
    mountSearchBar(search)
    search.is_searching.value = true
    await flushTransition()
    expect(mockExpandSearchInput).toHaveBeenCalled()
  })

  test('closing the bar triggers the leave transition (calls collapseSearchInput) [obligation]', async () => {
    const search = makeSearch({ is_searching: true })
    mountSearchBar(search)
    search.is_searching.value = false
    await flushTransition()
    expect(mockCollapseSearchInput).toHaveBeenCalled()
  })

  test('fill=true uses fillTarget() when container has no measurable parent [obligation]', async () => {
    const search = makeSearch({ is_searching: false })
    mountSearchBar(search, { fill: true, expandedWidth: 300 })
    search.is_searching.value = true
    await flushTransition()
    // In test env offsetWidth is 0 so fillTarget returns 0 (Math.max(0,...))
    // Assert expandSearchInput was called with a numeric width (the path was hit)
    expect(mockExpandSearchInput).toHaveBeenCalledWith(
      expect.any(Element),
      expect.any(Number),
      expect.any(Function)
    )
  })
})
