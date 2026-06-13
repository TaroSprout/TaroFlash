import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const { mockEmitHoverSfx } = vi.hoisted(() => ({ mockEmitHoverSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: mockEmitHoverSfx
}))

import UiTagButton from '@/components/ui-kit/tag-button.vue'

// Stub UiIcon with a testid element so we can assert its presence/absence
// without depending on async SVG loading or the internal component name.
const IconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(p) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': p.src })
  }
})

function mountTag(props = {}, slot = 'Back') {
  return mount(UiTagButton, {
    props,
    slots: { default: () => slot },
    global: { stubs: { UiIcon: IconStub } }
  })
}

describe('UiTagButton', () => {
  beforeEach(() => mockEmitHoverSfx.mockClear())

  test('renders the button with slot content', () => {
    const wrapper = mountTag({}, 'Back')
    const btn = wrapper.find('[data-testid="ui-kit-tag-button"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('Back')
  })

  test('applies a CSS mask inline style to clip the tag silhouette', () => {
    const wrapper = mountTag()
    const btn = wrapper.find('[data-testid="ui-kit-tag-button"]')
    const mask = btn.attributes('style') ?? ''
    expect(mask).toContain('mask')
    expect(mask).toContain('linear-gradient')
  })

  test('emits a click event when the button is clicked', async () => {
    const wrapper = mountTag()
    await wrapper.find('[data-testid="ui-kit-tag-button"]').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  test('renders the hover-fx overlay by default (fancyHover enabled)', () => {
    const wrapper = mountTag()
    expect(wrapper.find('[data-testid="ui-kit-tag-button__hover-fx"]').exists()).toBe(true)
  })

  test('omits the hover-fx overlay when fancyHover is false', () => {
    const wrapper = mountTag({ fancyHover: false })
    expect(wrapper.find('[data-testid="ui-kit-tag-button__hover-fx"]').exists()).toBe(false)
  })

  test('asymmetric padding follows the notch side (notch on right → extra padding-left for outset)', () => {
    const right = mountTag({ notchSide: 'right' })
    const left = mountTag({ notchSide: 'left' })
    const rightStyle = right.find('[data-testid="ui-kit-tag-button"]').attributes('style') ?? ''
    const leftStyle = left.find('[data-testid="ui-kit-tag-button"]').attributes('style') ?? ''
    // Both sides include padding; the values mirror across notchSide.
    expect(rightStyle).toMatch(/padding-left:\s*\d+px/)
    expect(rightStyle).toMatch(/padding-right:\s*\d+px/)
    expect(leftStyle).toMatch(/padding-left:\s*\d+px/)
    expect(leftStyle).toMatch(/padding-right:\s*\d+px/)
  })

  test('size="lg" adds py-2.5 and text-xl classes to the button [obligation]', () => {
    const wrapper = mountTag({ size: 'lg' })
    const btn = wrapper.find('[data-testid="ui-kit-tag-button"]')
    expect(btn.classes()).toContain('py-2.5')
    expect(btn.classes()).toContain('text-xl')
  })

  test('size="base" (default) uses py-2 and text-sm classes [obligation]', () => {
    const wrapper = mountTag({ size: 'base' })
    const btn = wrapper.find('[data-testid="ui-kit-tag-button"]')
    expect(btn.classes()).toContain('py-2')
    expect(btn.classes()).toContain('text-sm')
  })

  test('omitting size defaults to base py-2 and text-sm classes [obligation]', () => {
    const wrapper = mountTag()
    const btn = wrapper.find('[data-testid="ui-kit-tag-button"]')
    expect(btn.classes()).toContain('py-2')
    expect(btn.classes()).toContain('text-sm')
    expect(btn.classes()).not.toContain('py-2.5')
    expect(btn.classes()).not.toContain('text-xl')
  })

  test('icon prop renders a ui-icon element before the slot content [obligation]', () => {
    const wrapper = mountTag({ icon: 'star' }, 'Label')
    expect(wrapper.find('[data-testid="ui-icon"]').exists()).toBe(true)
  })

  test('omitting icon renders no ui-icon element [obligation]', () => {
    const wrapper = mountTag({}, 'Label')
    expect(wrapper.find('[data-testid="ui-icon"]').exists()).toBe(false)
  })

  test('icon with size="lg" renders the icon with lg dimensions class', () => {
    const wrapper = mountTag({ icon: 'star', size: 'lg' }, 'Label')
    const icon = wrapper.find('[data-testid="ui-icon"]')
    expect(icon.exists()).toBe(true)
    expect(icon.classes()).toContain('w-5')
    expect(icon.classes()).toContain('h-5')
  })

  test('icon with size="base" renders the icon with base dimensions class', () => {
    const wrapper = mountTag({ icon: 'star', size: 'base' }, 'Label')
    const icon = wrapper.find('[data-testid="ui-icon"]')
    expect(icon.classes()).toContain('w-4')
    expect(icon.classes()).toContain('h-4')
  })
})
