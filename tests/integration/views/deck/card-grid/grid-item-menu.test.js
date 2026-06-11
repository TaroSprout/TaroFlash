import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import GridItemMenu from '@/views/deck/card-grid/grid-item-menu.vue'

vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn((_el, opts) => {
      opts?.onStart?.()
      opts?.onComplete?.()
    })
  }
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn(),
  setSfxPolicy: vi.fn()
}))

vi.mock('@floating-ui/vue', () => ({
  useFloating: vi.fn(() => ({
    placement: { value: 'bottom' },
    middlewareData: { value: {} },
    floatingStyles: { value: {} }
  })),
  shift: vi.fn(),
  flip: vi.fn(),
  autoUpdate: vi.fn(),
  arrow: vi.fn(),
  offset: vi.fn(),
  hide: vi.fn(),
  size: vi.fn()
}))

const ButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots, attrs }) {
    return () =>
      h(
        'button',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-button-stub',
          onClick: attrs.onClick
        },
        slots.default?.()
      )
  }
})

describe('grid-item-menu', () => {
  test('renders the trigger button', () => {
    const wrapper = mount(GridItemMenu, {
      attachTo: document.body,
      global: {
        stubs: { UiButton: ButtonStub },
        mocks: { $t: (k) => k }
      }
    })

    expect(wrapper.find('[data-testid="grid-item__menu-trigger"]').exists()).toBe(true)
  })

  test('opening the menu reveals all five action items', async () => {
    const wrapper = mount(GridItemMenu, {
      attachTo: document.body,
      global: {
        stubs: { UiButton: ButtonStub },
        mocks: { $t: (k) => k }
      }
    })

    await wrapper.find('[data-testid="grid-item__menu-trigger"]').trigger('click')

    const items = wrapper.findAll('[data-testid="ui-kit-action-menu__item"]')
    expect(items).toHaveLength(5)
  })
})
