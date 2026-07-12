import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { reactive, defineComponent, h } from 'vue'
import CoverDesigner from '@/views/deck/cover-designer/index.vue'
import { SUPPORTED_ICONS } from '@/utils/cover'

function slotlessStub(name) {
  return defineComponent({
    name,
    inheritAttrs: true,
    props: {
      supported_themes: { type: Array, default: () => [] },
      supported_icons: { type: Array, default: () => [] },
      supported_patterns: { type: Array, default: () => [] },
      theme: { default: undefined },
      theme_dark: { default: undefined },
      icon: { default: undefined },
      selected_pattern: { default: undefined }
    },
    setup(props) {
      return () => h('div', { 'data-testid': `${name}-stub`, 'data-props': JSON.stringify(props) })
    }
  })
}

const UiThemePickerStub = slotlessStub('UiThemePicker')
const IconPickerStub = slotlessStub('IconPicker')
const UiPatternPickerStub = slotlessStub('UiPatternPicker')

const SectionListStub = defineComponent({
  name: 'SectionList',
  setup(_p, { slots }) {
    return () => h('div', { 'data-testid': 'section-list-stub' }, slots.default?.())
  }
})

function makeDesigner(initial = {}) {
  const config = reactive(initial)
  const wrapper = shallowMount(CoverDesigner, {
    props: { config },
    global: {
      stubs: {
        UiThemePicker: UiThemePickerStub,
        IconPicker: IconPickerStub,
        UiPatternPicker: UiPatternPickerStub,
        SectionList: SectionListStub
      }
    }
  })
  return { wrapper, config }
}

describe('CoverDesigner toolbar', () => {
  test('renders all three pickers', () => {
    const { wrapper } = makeDesigner()
    expect(wrapper.find('[data-testid="cover-designer-toolbar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="UiThemePicker-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="IconPicker-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="UiPatternPicker-stub"]').exists()).toBe(true)
  })

  test('forwards config fields to the appropriate picker', () => {
    const { wrapper } = makeDesigner({
      theme: 'pink-400',
      theme_dark: 'pink-700',
      icon: SUPPORTED_ICONS[0],
      pattern: 'wave'
    })

    const bg = wrapper.findComponent(UiThemePickerStub).props()
    expect(bg.theme).toBe('pink-400')
    expect(bg.theme_dark).toBe('pink-700')
    expect(bg.supported_themes.map((option) => option.light)).toEqual(
      expect.arrayContaining(['blue-500', 'green-500', 'purple-500'])
    )

    const iconProps = wrapper.findComponent(IconPickerStub).props()
    expect(iconProps.icon).toBe(SUPPORTED_ICONS[0])
    expect(iconProps.supported_icons).toEqual(
      expect.arrayContaining([SUPPORTED_ICONS[0], SUPPORTED_ICONS[1]])
    )

    const patternProps = wrapper.findComponent(UiPatternPickerStub).props()
    expect(patternProps.selected_pattern).toBe('wave')
    expect(patternProps.supported_patterns).toEqual(expect.arrayContaining(['wave', 'aztec']))
  })

  test('update:theme from UiThemePicker mutates config.theme', async () => {
    const { wrapper, config } = makeDesigner({ theme: 'blue-500' })
    wrapper.findComponent(UiThemePickerStub).vm.$emit('update:theme', 'red-500')
    await wrapper.vm.$nextTick()
    expect(config.theme).toBe('red-500')
  })

  test('update:theme_dark from UiThemePicker mutates config.theme_dark', async () => {
    const { wrapper, config } = makeDesigner({ theme_dark: 'blue-800' })
    wrapper.findComponent(UiThemePickerStub).vm.$emit('update:theme_dark', 'red-800')
    await wrapper.vm.$nextTick()
    expect(config.theme_dark).toBe('red-800')
  })

  test('update:icon from IconPicker mutates config.icon', async () => {
    const { wrapper, config } = makeDesigner()
    wrapper.findComponent(IconPickerStub).vm.$emit('update:icon', 'store')
    await wrapper.vm.$nextTick()
    expect(config.icon).toBe('store')
  })

  test('update:pattern from UiPatternPicker mutates config.pattern', async () => {
    const { wrapper, config } = makeDesigner({ pattern: 'wave' })
    wrapper.findComponent(UiPatternPickerStub).vm.$emit('update:pattern', 'aztec')
    await wrapper.vm.$nextTick()
    expect(config.pattern).toBe('aztec')
  })
})
