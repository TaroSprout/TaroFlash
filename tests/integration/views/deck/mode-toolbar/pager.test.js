import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['disabled'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        { ...attrs, disabled: props.disabled, onClick: () => emit('click') },
        slots.default?.()
      )
  }
})

const UiTagStub = defineComponent({
  name: 'UiTag',
  setup(_p, { slots }) {
    return () => h('span', { 'data-testid': 'ui-tag-stub' }, slots.default?.())
  }
})

import Pager from '@/views/deck/mode-toolbar/pager.vue'

function makeCarousel({
  page = 0,
  total_pages = 3,
  prev_page_number = 3,
  next_page_number = 2,
  can_paginate = true,
  prevPage = vi.fn(),
  nextPage = vi.fn()
} = {}) {
  return {
    page: ref(page),
    total_pages: ref(total_pages),
    prev_page_number: ref(prev_page_number),
    next_page_number: ref(next_page_number),
    can_paginate: ref(can_paginate),
    prevPage,
    nextPage
  }
}

function mount(carousel = makeCarousel()) {
  return {
    wrapper: shallowMount(Pager, {
      global: {
        stubs: { UiButton: UiButtonStub, UiTag: UiTagStub },
        provide: { 'card-editor': { carousel } }
      }
    }),
    carousel
  }
}

describe('mode-toolbar/pager', () => {
  beforeEach(() => {})

  test('renders the pager root', () => {
    const { wrapper } = mount()
    expect(wrapper.find('[data-testid="pager"]').exists()).toBe(true)
  })

  test('renders page-counter as 1-indexed', () => {
    const { wrapper } = mount(makeCarousel({ page: 2, total_pages: 5 }))
    expect(wrapper.find('[data-testid="pager__counter"]').text()).toContain('3')
    expect(wrapper.find('[data-testid="pager__counter"]').text()).toContain('5')
  })

  test('clicking prev calls carousel.prevPage', async () => {
    const prevPage = vi.fn()
    const { wrapper } = mount(makeCarousel({ prevPage }))
    await wrapper.find('[data-testid="pager__prev"]').trigger('click')
    expect(prevPage).toHaveBeenCalledOnce()
  })

  test('clicking next calls carousel.nextPage', async () => {
    const nextPage = vi.fn()
    const { wrapper } = mount(makeCarousel({ nextPage }))
    await wrapper.find('[data-testid="pager__next"]').trigger('click')
    expect(nextPage).toHaveBeenCalledOnce()
  })

  test('prev + next disabled when can_paginate is false', () => {
    const { wrapper } = mount(makeCarousel({ can_paginate: false }))
    expect(wrapper.find('[data-testid="pager__prev"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="pager__next"]').attributes('disabled')).toBeDefined()
  })
})
