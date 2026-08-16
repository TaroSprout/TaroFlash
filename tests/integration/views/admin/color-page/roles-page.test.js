import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import RolesPage from '@/views/admin/color-page/roles-page.vue'
import { colorTunerKey, useColorTuner } from '@/views/admin/color-page/use-color-tuner'

const wrappers = []

function mountPage() {
  const Host = defineComponent({
    setup() {
      return () => h(RolesPage)
    }
  })

  const wrapper = mount(Host, {
    global: { provide: { [colorTunerKey]: useColorTuner() } },
    attachTo: document.body
  })
  wrappers.push(wrapper)
  return wrapper
}

function firstRegion(wrapper) {
  return wrapper.findAll('[data-testid="role-specimen__region"]')[0]
}

describe('RolesPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    document.body.innerHTML = ''
  })

  test('renders one role-specimen per mode/station combination (2 modes x 4 stations = 8)', () => {
    const wrapper = mountPage()
    expect(wrapper.findAll('[data-testid="role-specimen"]')).toHaveLength(8)
  })

  test('clicking a region opens the role-editor popover for that mode/station/role', async () => {
    const wrapper = mountPage()
    const region = firstRegion(wrapper)
    const role_name = region.attributes('data-role')

    await region.trigger('click')

    const editor = document.body.querySelector('[data-testid="role-editor"]')
    expect(editor).not.toBeNull()
    expect(editor.querySelector('h2').textContent.trim()).toBe(role_name)
  })

  test('re-clicking the open region closes the popover with no intermediate open state', async () => {
    const wrapper = mountPage()
    const region = firstRegion(wrapper)

    await region.trigger('click')
    expect(document.body.querySelector('[data-testid="role-editor"]')).not.toBeNull()

    await region.trigger('click')
    expect(document.body.querySelector('[data-testid="role-editor"]')).toBeNull()
  })

  test('clicking a different region while one is open switches the editor straight to the new role', async () => {
    const wrapper = mountPage()
    const regions = wrapper.findAll('[data-testid="role-specimen__region"]')
    const first = regions[0]
    const second = regions[1]
    const second_role = second.attributes('data-role')

    await first.trigger('click')
    await second.trigger('click')

    const editor = document.body.querySelector('[data-testid="role-editor"]')
    expect(editor).not.toBeNull()
    expect(editor.querySelector('h2').textContent.trim()).toBe(second_role)
  })
})
