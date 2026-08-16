import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import PalettePage from '@/views/admin/color-page/palette-page.vue'
import { colorTunerKey, useColorTuner } from '@/views/admin/color-page/use-color-tuner'

const wrappers = []

function mountPage() {
  const Host = defineComponent({
    setup() {
      return () => h(PalettePage)
    }
  })

  const wrapper = mount(Host, {
    global: { provide: { [colorTunerKey]: useColorTuner() } },
    attachTo: document.body
  })
  wrappers.push(wrapper)
  return wrapper
}

function firstSwatch(wrapper) {
  return wrapper.findAll('[data-testid="palette-page__swatch"]')[0]
}

describe('PalettePage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    document.body.innerHTML = ''
  })

  test('clicking a swatch opens the shade-editor popover for that shade', async () => {
    const wrapper = mountPage()
    const swatch = firstSwatch(wrapper)
    const name = swatch.find('[data-testid="palette-page__swatch-name"]').text()

    await swatch.trigger('click')

    const editor_name_input = document.body.querySelector(
      '[data-testid="shade-editor__name"] input'
    )
    expect(editor_name_input).not.toBeNull()
    expect(editor_name_input.value).toBe(name)
  })

  test('re-clicking the open swatch closes the popover with no intermediate open state', async () => {
    const wrapper = mountPage()
    const swatch = firstSwatch(wrapper)

    await swatch.trigger('click')
    expect(document.body.querySelector('[data-testid="shade-editor"]')).not.toBeNull()

    await swatch.trigger('click')

    expect(document.body.querySelector('[data-testid="shade-editor"]')).toBeNull()
  })

  test('the add cell mints a new shade into its own family, not another', async () => {
    const wrapper = mountPage()
    const family_section = wrapper.findAll('[data-testid="palette-page__family"]')[0]
    const family_name = family_section.find('[data-testid="palette-page__family-heading"]').text()

    const before = family_section.findAll('[data-testid="palette-page__swatch"]').length
    await family_section.find('[data-testid="palette-page__add-shade"]').trigger('click')

    const after_section = wrapper.findAll('[data-testid="palette-page__family"]')[0]
    expect(after_section.find('[data-testid="palette-page__family-heading"]').text()).toBe(
      family_name
    )
    expect(after_section.findAll('[data-testid="palette-page__swatch"]').length).toBe(before + 1)
  })
})
