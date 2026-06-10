import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, computed } from 'vue'

const { emitSfxMock } = vi.hoisted(() => ({ emitSfxMock: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock, emitHoverSfx: vi.fn() }))

import PageDots from '@/views/deck/page-dots.vue'
import { cardEditorKey } from '@/composables/card-editor/card-list-controller'
import { deckViewShellKey } from '@/composables/card-editor/deck-view-shell'

const UiTooltipStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  props: ['text', 'visible', 'element', 'position', 'gap'],
  setup(props, { attrs }) {
    return () =>
      h(props.element ?? 'span', {
        ...attrs,
        'data-tooltip-text': props.text,
        'data-tooltip-visible': props.visible || undefined
      })
  }
})

function makeEditor({ total_pages = 3, page = 0, can_paginate = true, goToPage = vi.fn() } = {}) {
  return {
    carousel: {
      total_pages: computed(() => total_pages),
      page: ref(page),
      can_paginate: computed(() => can_paginate),
      goToPage
    }
  }
}

function makeShell({ mode = 'view' } = {}) {
  return { mode: ref(mode) }
}

function mount(editor = makeEditor(), shell = makeShell()) {
  return shallowMount(PageDots, {
    global: {
      provide: { [cardEditorKey]: editor, [deckViewShellKey]: shell },
      stubs: { UiTooltip: UiTooltipStub }
    }
  })
}

async function firePointerMove(wrapper, clientX) {
  const el = wrapper.find('[data-testid="deck-view__page-dots"]').element
  const event = new PointerEvent('pointermove', {
    clientX,
    bubbles: true,
    cancelable: true
  })
  el.dispatchEvent(event)
  await wrapper.vm.$nextTick()
}

// rect helper: row spans 0–300px, so 5 dots map to 60px slices.
function stubRowRect(wrapper, { left = 0, width = 300 } = {}) {
  const row = wrapper.find('[data-testid="deck-view__page-dots__row"]').element
  row.getBoundingClientRect = () => ({
    left,
    width,
    right: left + width,
    top: 0,
    bottom: 0,
    height: 0,
    x: left,
    y: 0,
    toJSON: () => ({})
  })
}

describe('PageDots', () => {
  let editor

  beforeEach(() => {
    editor = makeEditor()
    emitSfxMock.mockReset()
  })

  test('does not render when can_paginate is false', () => {
    editor = makeEditor({ can_paginate: false })
    const wrapper = mount(editor)
    expect(wrapper.find('[data-testid="deck-view__page-dots"]').exists()).toBe(false)
  })

  test('renders one dot per page', () => {
    editor = makeEditor({ total_pages: 4 })
    const wrapper = mount(editor)
    expect(wrapper.find('[data-testid="deck-view__page-dots__dot-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-view__page-dots__dot-4"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-view__page-dots__dot-5"]').exists()).toBe(false)
  })

  test('marks the current page dot active at rest', () => {
    editor = makeEditor({ total_pages: 3, page: 1 })
    const wrapper = mount(editor)
    expect(
      wrapper.find('[data-testid="deck-view__page-dots__dot-2"]').attributes('data-active')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="deck-view__page-dots__dot-1"]').attributes('data-active')
    ).toBeUndefined()
  })

  test('pointermove keeps the current page dot active and adds the hovered dot', async () => {
    editor = makeEditor({ total_pages: 5, page: 4 })
    const wrapper = mount(editor)
    stubRowRect(wrapper, { left: 0, width: 300 })

    // x=150 → t=0.5 → floor(0.5*5)=2 → dot-3 hovered
    await firePointerMove(wrapper, 150)

    expect(
      wrapper.find('[data-testid="deck-view__page-dots__dot-3"]').attributes('data-active')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="deck-view__page-dots__dot-5"]').attributes('data-active')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="deck-view__page-dots__dot-1"]').attributes('data-active')
    ).toBeUndefined()
  })

  test('pointermove past the right edge clamps to the last dot', async () => {
    editor = makeEditor({ total_pages: 4 })
    const wrapper = mount(editor)
    stubRowRect(wrapper, { left: 0, width: 200 })

    await firePointerMove(wrapper, 9999)

    expect(
      wrapper.find('[data-testid="deck-view__page-dots__dot-4"]').attributes('data-active')
    ).toBe('true')
  })

  test('pointermove sets data-engaged on the container', async () => {
    editor = makeEditor()
    const wrapper = mount(editor)
    stubRowRect(wrapper)

    const container = wrapper.find('[data-testid="deck-view__page-dots"]')
    expect(container.attributes('data-engaged')).toBeUndefined()

    await firePointerMove(wrapper, 50)
    expect(container.attributes('data-engaged')).toBe('true')
  })

  test('pointerleave clears engagement and falls back to the current page', async () => {
    editor = makeEditor({ total_pages: 5, page: 0 })
    const wrapper = mount(editor)
    stubRowRect(wrapper, { left: 0, width: 300 })

    const container = wrapper.find('[data-testid="deck-view__page-dots"]')
    await firePointerMove(wrapper, 150)
    await container.trigger('pointerleave')

    expect(container.attributes('data-engaged')).toBeUndefined()
    expect(
      wrapper.find('[data-testid="deck-view__page-dots__dot-1"]').attributes('data-active')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="deck-view__page-dots__dot-3"]').attributes('data-active')
    ).toBeUndefined()
  })

  test('tooltip becomes visible only on the hovered dot', async () => {
    editor = makeEditor({ total_pages: 3 })
    const wrapper = mount(editor)
    stubRowRect(wrapper, { left: 0, width: 300 })

    await firePointerMove(wrapper, 150)

    expect(
      wrapper.find('[data-testid="deck-view__page-dots__dot-2"]').attributes('data-tooltip-visible')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="deck-view__page-dots__dot-1"]').attributes('data-tooltip-visible')
    ).toBeUndefined()
  })

  test('click invokes goToPage with the hovered index', async () => {
    const goToPage = vi.fn()
    editor = makeEditor({ total_pages: 5, goToPage })
    const wrapper = mount(editor)
    stubRowRect(wrapper, { left: 0, width: 500 })

    const container = wrapper.find('[data-testid="deck-view__page-dots"]')
    await firePointerMove(wrapper, 350) // t=0.7 → idx=3
    await container.trigger('click')

    expect(goToPage).toHaveBeenCalledOnce()
    expect(goToPage).toHaveBeenCalledWith(3)
  })

  test('emits a tick sfx only when the hovered dot index changes', async () => {
    editor = makeEditor({ total_pages: 5 })
    const wrapper = mount(editor)
    stubRowRect(wrapper, { left: 0, width: 500 })

    await firePointerMove(wrapper, 50) // idx 0
    await firePointerMove(wrapper, 60) // still idx 0
    await firePointerMove(wrapper, 150) // idx 1
    await firePointerMove(wrapper, 250) // idx 2

    expect(emitSfxMock).toHaveBeenCalledTimes(3)
    expect(emitSfxMock).toHaveBeenCalledWith('ui.click_07', { debounce: 10 })
  })

  test('click without a prior pointermove is a no-op', async () => {
    const goToPage = vi.fn()
    editor = makeEditor({ goToPage })
    const wrapper = mount(editor)

    await wrapper.find('[data-testid="deck-view__page-dots"]').trigger('click')
    expect(goToPage).not.toHaveBeenCalled()
  })

  // The container is hidden via opacity classes when mode_config.pagination is false.
  // Class assertion is unavoidable here — there is no other state signal exposed
  // on the rendered DOM (the component binds opacity classes directly).
  test('applies hidden classes when shell mode is not view (pagination=false)', () => {
    const wrapper = mount(makeEditor(), makeShell({ mode: 'edit' }))
    const cls = wrapper.find('[data-testid="deck-view__page-dots"]').classes()
    expect(cls).toContain('opacity-0')
    expect(cls).toContain('pointer-events-none')
  })

  test('does not apply hidden classes in view mode (pagination=true)', () => {
    const wrapper = mount(makeEditor(), makeShell({ mode: 'view' }))
    const cls = wrapper.find('[data-testid="deck-view__page-dots"]').classes()
    expect(cls).not.toContain('opacity-0')
  })
})
