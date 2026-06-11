import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import ActionMenu from '@/components/ui-kit/action-menu.vue'

// gsap mock — synchronously fires onStart + onComplete so the component's
// awaited close() resolves immediately and items mount/unmount predictably.
vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn((_el, opts) => {
      opts?.onStart?.()
      opts?.onComplete?.()
    })
  }
}))

const { emitSfxMock } = vi.hoisted(() => ({ emitSfxMock: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock,
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

const TriggerStub = defineComponent({
  props: ['toggle', 'is_open'],
  setup(props) {
    return () =>
      h('button', {
        'data-testid': 'trigger',
        'data-open': props.is_open,
        onClick: props.toggle
      })
  }
})

const ItemStub = defineComponent({
  name: 'ItemStub',
  setup(_p, { slots }) {
    return () => h('button', { 'data-testid': 'item' }, slots.default?.())
  }
})

function mountMenu(props = {}) {
  return mount(ActionMenu, {
    attachTo: document.body,
    props,
    slots: {
      trigger: (slotProps) => h(TriggerStub, slotProps),
      default: () => [
        h(ItemStub, null, () => 'one'),
        h(ItemStub, null, () => 'two'),
        h(ItemStub, null, () => 'three')
      ]
    }
  })
}

beforeEach(() => {
  emitSfxMock.mockClear()
})

describe('action-menu', () => {
  test('items not rendered when popover is closed', () => {
    const wrapper = mountMenu()
    expect(wrapper.findAll('[data-testid="ui-kit-action-menu__item"]')).toHaveLength(0)
  })

  test('clicking trigger opens popover and renders items', async () => {
    const wrapper = mountMenu()
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await nextTick()
    expect(wrapper.findAll('[data-testid="ui-kit-action-menu__item"]')).toHaveLength(3)
  })

  test('clicking an item closes when closeOnAction is true (default)', async () => {
    const wrapper = mountMenu()
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await nextTick()

    await wrapper.find('[data-testid="ui-kit-action-menu__items"]').trigger('click')
    await nextTick()

    expect(wrapper.findAll('[data-testid="ui-kit-action-menu__item"]')).toHaveLength(0)
  })

  test('item click does not close when closeOnAction=false', async () => {
    const wrapper = mountMenu({ closeOnAction: false })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await nextTick()

    await wrapper.find('[data-testid="ui-kit-action-menu__items"]').trigger('click')
    await nextTick()

    expect(wrapper.findAll('[data-testid="ui-kit-action-menu__item"]').length).toBeGreaterThan(0)
  })

  test('alignment prop drives flex alignment class', async () => {
    const wrapper = mountMenu({ alignment: 'end' })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await nextTick()

    const items_wrapper = wrapper.find('[data-testid="ui-kit-action-menu__items"]')
    expect(items_wrapper.classes()).toContain('items-end')
  })

  test('emits sfx when enterSfx prop is set on open', async () => {
    const wrapper = mountMenu({ enterSfx: 'ui.click_07' })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await nextTick()

    expect(emitSfxMock).toHaveBeenCalled()
  })

  test('emits sfx for each item on close', async () => {
    const wrapper = mountMenu({ enterSfx: 'ui.click_07' })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await nextTick()
    emitSfxMock.mockClear()

    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await nextTick()

    expect(emitSfxMock).toHaveBeenCalledTimes(3)
  })

  test('z-100 class applied on container while open', async () => {
    const wrapper = mountMenu()
    const container = wrapper.find('[data-testid="ui-kit-action-menu"]')

    expect(container.classes()).not.toContain('z-100')
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await nextTick()
    expect(container.classes()).toContain('z-100')
  })
})
