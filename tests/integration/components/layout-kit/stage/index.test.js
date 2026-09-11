import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import Stage from '@/components/layout-kit/stage/index.vue'

function mountStage(props = {}) {
  return mount(Stage, {
    props,
    slots: { default: '<div data-testid="stage-content-probe">content</div>' }
  })
}

describe('Stage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('renders the box, surface, and clip layers', () => {
    const wrapper = mountStage()

    expect(wrapper.find('[data-testid="stage"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stage__surface"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stage__clip"]').exists()).toBe(true)
  })

  test('renders the slot content inside stage__content', () => {
    const wrapper = mountStage()

    expect(
      wrapper.find('[data-testid="stage__content"] [data-testid="stage-content-probe"]').exists()
    ).toBe(true)
  })

  test('maps the inset prop to the --stage-inset custom property', () => {
    const wrapper = mountStage({ inset: '12px' })

    expect(wrapper.find('[data-testid="stage"]').attributes('style')).toContain(
      '--stage-inset: 12px'
    )
  })

  test('defaults --stage-inset to 0px when no inset prop is given', () => {
    const wrapper = mountStage()

    expect(wrapper.find('[data-testid="stage"]').attributes('style')).toContain(
      '--stage-inset: 0px'
    )
  })

  test('maps the surface_class prop onto the surface layer', () => {
    const wrapper = mountStage({ surface_class: 'stage-test-surface-class' })

    expect(wrapper.find('[data-testid="stage__surface"]').classes()).toContain(
      'stage-test-surface-class'
    )
  })

  test('exposes claimHeight, whose release is idempotent', () => {
    const wrapper = mountStage()

    const release = wrapper.vm.claimHeight()
    expect(typeof release).toBe('function')

    expect(() => {
      release()
      release()
    }).not.toThrow()
  })
})
