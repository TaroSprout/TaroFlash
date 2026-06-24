import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import UiWobbleBox from '@/components/ui-kit/wobble-box.vue'

function mountWobbleBox(props = {}, slotContent = undefined) {
  return mount(UiWobbleBox, {
    props,
    slots: slotContent ? { default: slotContent } : {}
  })
}

describe('UiWobbleBox', () => {
  // ── Root ────────────────────────────────────────────────────────────────────

  test('renders the root element with the default data-testid', () => {
    const wrapper = mountWobbleBox()
    expect(wrapper.find('[data-testid="ui-kit-wobble-box"]').exists()).toBe(true)
  })

  // ── Slot ────────────────────────────────────────────────────────────────────

  test('renders default slot content [obligation]', () => {
    const wrapper = mount(UiWobbleBox, {
      slots: { default: () => h('span', { 'data-testid': 'slot-child' }, 'hello') }
    })
    expect(wrapper.find('[data-testid="slot-child"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="slot-child"]').text()).toBe('hello')
  })

  // ── Seed prop ───────────────────────────────────────────────────────────────

  test('seed defaults to 7 on feTurbulence [obligation]', () => {
    const wrapper = mountWobbleBox()
    expect(wrapper.find('feTurbulence').attributes('seed')).toBe('7')
  })

  test('custom seed is forwarded to feTurbulence [obligation]', () => {
    const wrapper = mountWobbleBox({ seed: 42 })
    expect(wrapper.find('feTurbulence').attributes('seed')).toBe('42')
  })

  // ── Unique filter id per instance ───────────────────────────────────────────
  // Two instances rendered in the same app must have distinct filter ids so
  // that CSS url('#id') references on each ::before pseudo resolve to the
  // correct filter, not a shared one that makes later instances render unfiltered.

  test('two instances in the same app have different filter ids [obligation]', () => {
    // Wrap both instances in a single mount so they share the same Vue app
    // and the same useId() counter — this is the real-world scenario.
    const Host = defineComponent({
      setup() {
        return () =>
          h('div', [
            h(UiWobbleBox, { 'data-testid': 'box-a' }),
            h(UiWobbleBox, { 'data-testid': 'box-b' })
          ])
      }
    })

    const wrapper = mount(Host)

    const boxes = wrapper.findAllComponents(UiWobbleBox)
    expect(boxes).toHaveLength(2)

    const filterId1 = boxes[0].find('filter').attributes('id')
    const filterId2 = boxes[1].find('filter').attributes('id')

    expect(filterId1).toBeTruthy()
    expect(filterId2).toBeTruthy()
    expect(filterId1).not.toBe(filterId2)
  })

  test('each instance --wobble-filter url references only its own filter id [obligation]', () => {
    const Host = defineComponent({
      setup() {
        return () => h('div', [h(UiWobbleBox), h(UiWobbleBox)])
      }
    })

    const wrapper = mount(Host)

    const boxes = wrapper.findAllComponents(UiWobbleBox)
    const filterId1 = boxes[0].find('filter').attributes('id')
    const filterId2 = boxes[1].find('filter').attributes('id')

    const style1 = boxes[0].find('[data-testid="ui-kit-wobble-box"]').attributes('style')
    const style2 = boxes[1].find('[data-testid="ui-kit-wobble-box"]').attributes('style')

    // Each instance's CSS var must point to its own filter id
    expect(style1).toContain(`url('#${filterId1}')`)
    expect(style2).toContain(`url('#${filterId2}')`)

    // And must NOT point to the other instance's id
    expect(style1).not.toContain(`url('#${filterId2}')`)
    expect(style2).not.toContain(`url('#${filterId1}')`)
  })

  // ── SVG structure ───────────────────────────────────────────────────────────

  test('renders an SVG with aria-hidden for the filter definition', () => {
    const wrapper = mountWobbleBox()
    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('aria-hidden')).toBe('true')
  })

  test('filter id on the <filter> element matches the id used in --wobble-filter', () => {
    const wrapper = mountWobbleBox()
    const filterId = wrapper.find('filter').attributes('id')
    const style = wrapper.find('[data-testid="ui-kit-wobble-box"]').attributes('style')
    expect(style).toContain(`url('#${filterId}')`)
  })
})
