import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import RoleSpecimen from '@/views/admin/color-page/role-specimen.vue'
import { colorTunerKey, useColorTuner } from '@/views/admin/color-page/use-color-tuner'

vi.mock('@floating-ui/vue', () => ({
  autoUpdate: vi.fn(() => () => {})
}))

const wrappers = []

function mountSpecimen(props = {}) {
  const Host = defineComponent({
    setup() {
      return () =>
        h(RoleSpecimen, {
          mode: 'light',
          station: 'page',
          active_role: null,
          ...props
        })
    }
  })

  const wrapper = mount(Host, {
    global: { provide: { [colorTunerKey]: useColorTuner() } },
    attachTo: document.body
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('RoleSpecimen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    document.body.innerHTML = ''
  })

  test('renders exactly ten regions', () => {
    const wrapper = mountSpecimen()
    expect(wrapper.findAll('[data-testid="role-specimen__region"]')).toHaveLength(10)
  })

  test('line sits at the outer inset, surface inset inside it', () => {
    const wrapper = mountSpecimen()
    const regions = wrapper.findAll('[data-testid="role-specimen__region"]')

    const line = regions.find((r) => r.attributes('data-role') === 'line')
    const surface = regions.find((r) => r.attributes('data-role') === 'surface')

    expect(line.classes()).toContain('inset-0')
    expect(surface.classes()).toContain('inset-1')
  })

  test('clicking the line region emits pick with role "line" and the element', async () => {
    const wrapper = mountSpecimen()
    const regions = wrapper.findAll('[data-testid="role-specimen__region"]')
    const line = regions.find((r) => r.attributes('data-role') === 'line')

    await line.trigger('click')

    const emitted = wrapper.findComponent(RoleSpecimen).emitted('pick')
    expect(emitted).toHaveLength(1)
    expect(emitted[0][0]).toBe('line')
    expect(emitted[0][1]).toBeInstanceOf(HTMLElement)
  })

  test("each region's hover badge shows its own role name", async () => {
    const wrapper = mountSpecimen()
    const regions = wrapper.findAll('[data-testid="role-specimen__region"]')
    const well = regions.find((r) => r.attributes('data-role') === 'well')

    await well.trigger('pointerenter')

    const badge = document.body.querySelector('[data-testid="role-specimen__region-badge"]')
    expect(badge).not.toBeNull()
    expect(badge.textContent.trim()).toBe('well')
  })
})
