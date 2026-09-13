import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import Stage from '@/components/layout-kit/stage/index.vue'

function mountStage(props = {}, slots = {}) {
  return mount(Stage, {
    props,
    slots: { default: '<div data-testid="stage-content-probe">content</div>', ...slots }
  })
}

const ESCAPE_ANCHORS = [
  'top',
  'bottom',
  'left',
  'right',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right'
]

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

  test('renders the box, surface, and clip layers even with an escape slot present', () => {
    const wrapper = mountStage(
      { inset: '12px' },
      { escape: '<div data-testid="escape-probe">badge</div>' }
    )

    expect(wrapper.find('[data-testid="stage"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stage__surface"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stage__clip"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stage"]').attributes('style')).toContain(
      '--stage-inset: 12px'
    )
  })

  test('omits the escape slot when no escape content is provided', () => {
    const wrapper = mountStage()

    expect(wrapper.find('[data-testid="stage__escape"]').exists()).toBe(false)
  })

  test('renders escape content inside stage__escape when the slot is provided', () => {
    const wrapper = mountStage({}, { escape: '<div data-testid="escape-probe">badge</div>' })

    expect(
      wrapper.find('[data-testid="stage__escape"] [data-testid="escape-probe"]').exists()
    ).toBe(true)
  })

  test('renders the escape slot after stage__content in DOM order', () => {
    const wrapper = mountStage({}, { escape: '<div data-testid="escape-probe">badge</div>' })

    const content = wrapper.find('[data-testid="stage__content"]').element
    const escape = wrapper.find('[data-testid="stage__escape"]').element

    expect(content.compareDocumentPosition(escape) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('defaults the escape anchor to top', () => {
    const wrapper = mountStage({}, { escape: '<div data-testid="escape-probe">badge</div>' })

    expect(wrapper.find('[data-testid="stage__escape"]').attributes('data-anchor')).toBe('top')
  })

  test.each(ESCAPE_ANCHORS)('maps the %s escape_anchor to its data-anchor attribute', (anchor) => {
    const wrapper = mountStage(
      { escape_anchor: anchor },
      { escape: '<div data-testid="escape-probe">badge</div>' }
    )

    expect(wrapper.find('[data-testid="stage__escape"]').attributes('data-anchor')).toBe(anchor)
  })
})
