import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, useAttrs } from 'vue'
import TabApp from '@/phone/apps/settings/component/tab-app/index.vue'
import { memberEditorKey } from '@/composables/member/editor'

const SliderStub = defineComponent({
  name: 'UiSlider',
  inheritAttrs: false,
  setup(_props, { slots }) {
    const attrs = useAttrs()
    return () => h('div', { ...attrs, 'data-testid': 'slider-stub' }, slots.default?.())
  }
})

const ToggleStub = defineComponent({
  name: 'UiToggle',
  inheritAttrs: false,
  props: { checked: Boolean },
  emits: ['update:checked'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': 'toggle-stub',
          'data-checked': String(props.checked),
          onClick: () => emit('update:checked', !props.checked)
        },
        slots.default?.()
      )
  }
})

function makeTab(left_hand = false) {
  const editor = {
    preferences: reactive({ accessibility: { left_hand } })
  }
  const wrapper = mount(TabApp, {
    global: {
      stubs: { UiSlider: SliderStub, UiToggle: ToggleStub },
      mocks: { $t: (k) => k },
      provide: { [memberEditorKey]: editor }
    }
  })
  return { wrapper, editor }
}

describe('TabApp', () => {
  test('renders the app container with three volume sliders', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-app"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="slider-stub"]')).toHaveLength(3)
  })

  test('renders the left-hand toggle reflecting editor preferences', () => {
    const { wrapper } = makeTab(true)
    const toggle = wrapper.find('[data-testid="toggle-stub"]')
    expect(toggle.exists()).toBe(true)
    expect(toggle.attributes('data-checked')).toBe('true')
  })

  test('toggling left-hand updates editor preferences', async () => {
    const { wrapper, editor } = makeTab(false)
    await wrapper.find('[data-testid="toggle-stub"]').trigger('click')
    expect(editor.preferences.accessibility.left_hand).toBe(true)
  })
})
