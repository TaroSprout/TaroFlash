import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ModeToolbarSkeleton from '@/views/deck/mode-toolbar/skeleton.vue'

vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const ToolbarBaseStub = defineComponent({
  name: 'ToolbarBase',
  setup(_p, { slots }) {
    return () =>
      h('div', { 'data-testid': 'toolbar-base-stub' }, [
        slots.right ? h('div', { 'data-testid': 'toolbar-base-stub__right' }, slots.right()) : null
      ])
  }
})

const UiTagStub = defineComponent({
  name: 'UiTag',
  setup(_p, { slots }) {
    return () => h('div', { 'data-testid': 'ui-tag-stub' }, slots.default ? slots.default() : null)
  }
})

function mountSkeleton() {
  return shallowMount(ModeToolbarSkeleton, {
    global: {
      stubs: {
        ToolbarBase: ToolbarBaseStub,
        UiTag: UiTagStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ModeToolbarSkeleton (mode-toolbar/skeleton.vue)', () => {
  test('renders the ToolbarBase wrapper', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="toolbar-base-stub"]').exists()).toBe(true)
  })

  test('passes content into the right slot of ToolbarBase', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="toolbar-base-stub__right"]').exists()).toBe(true)
  })

  test('renders a UiTag placeholder in the right slot', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="ui-tag-stub"]').exists()).toBe(true)
  })

  test('the placeholder tag contains an invisible span for layout reservation', () => {
    const wrapper = mountSkeleton()
    const span = wrapper.find('[data-testid="ui-tag-stub"] span')
    expect(span.exists()).toBe(true)
    expect(span.classes()).toContain('invisible')
  })
})
