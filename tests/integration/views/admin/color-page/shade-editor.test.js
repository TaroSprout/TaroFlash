import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ShadeEditor from '@/views/admin/color-page/shade-editor.vue'
import { colorTunerKey, useColorTuner } from '@/views/admin/color-page/use-color-tuner'

const wrappers = []

function mountEditor(shade) {
  const Host = defineComponent({
    setup() {
      return () => h(ShadeEditor, { shade })
    }
  })

  const wrapper = mount(Host, {
    global: { provide: { [colorTunerKey]: useColorTuner() } },
    attachTo: document.body
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('ShadeEditor', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    document.body.innerHTML = ''
  })

  // The tuner instance provided here is independent of the shade prop's identity, so bindings look
  // up the shade via a real bound role to exercise the used-in list.
  function boundShade() {
    const tuner = useColorTuner()
    const id = tuner.roleId('light', 'page', 'surface')
    return { tuner, shade: tuner.shadeOf(id) }
  }

  test('shade-editor__bindings is a scroll-region root, not a <ul>, when the shade has usages', () => {
    const { tuner, shade } = boundShade()

    const Host = defineComponent({
      setup() {
        return () => h(ShadeEditor, { shade })
      }
    })
    const wrapper = mount(Host, {
      global: { provide: { [colorTunerKey]: tuner } },
      attachTo: document.body
    })
    wrappers.push(wrapper)

    const bindings_root = wrapper.find('[data-testid="shade-editor__bindings"]')
    expect(bindings_root.exists()).toBe(true)
    expect(bindings_root.element.tagName).not.toBe('UL')

    // The rows sit one level deeper, inside a <ul> nested in the scroll-region root.
    const list = bindings_root.find('ul')
    expect(list.exists()).toBe(true)
    expect(list.findAll('li').length).toBeGreaterThan(0)
  })

  test('an unused shade shows the unused label instead of the bindings region', () => {
    const wrapper = mountEditor({
      id: 'unused-shade',
      name: 'unused-shade',
      family: 'brown',
      hsl: { h: 0, s: 0, l: 50 }
    })

    expect(wrapper.find('[data-testid="shade-editor__bindings"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="shade-editor__unused"]').exists()).toBe(true)
  })
})
