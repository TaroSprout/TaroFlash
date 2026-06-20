import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, reactive, useAttrs } from 'vue'
import TabApp from '@/phone/apps/settings/component/tab-app/index.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { settingsLayoutKey } from '@/phone/apps/settings/layout'

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn(), emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))
// Break config→player→config circular dep.
vi.mock('@/sfx/config', () => ({
  TYPE_SFX: [],
  SOUNDS: {},
  BUS_DEFAULTS: { interface: 5, study: 5, hover: 5 }
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const SpinboxStub = defineComponent({
  name: 'UiSpinbox',
  inheritAttrs: false,
  props: { value: Number, min: Number, max: Number },
  emits: ['update:value'],
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h('div', {
        ...attrs,
        'data-testid': 'spinbox-stub',
        'data-value': String(props.value),
        onClick: () => emit('update:value', (props.value ?? 0) + 1)
      })
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

const SectionListStub = defineComponent({
  name: 'SectionList',
  setup(_p, { slots }) {
    return () => h('div', slots.default?.())
  }
})

const LabeledSectionStub = defineComponent({
  name: 'LabeledSection',
  setup(_p, { slots }) {
    return () => h('div', slots.default?.())
  }
})

const NullStub = defineComponent({ setup: () => () => h('div') })

// ── Factory ───────────────────────────────────────────────────────────────────

function makeTab({ audio = {}, accessibility = {} } = {}) {
  const editor = {
    preferences: reactive({
      accessibility: { left_hand: false, ...accessibility },
      audio: { study_sounds: 5, interface_sounds: 5, hover_sounds: 5, ...audio }
    })
  }

  const wrapper = mount(TabApp, {
    global: {
      stubs: {
        UiSpinbox: SpinboxStub,
        UiToggle: ToggleStub,
        SectionList: SectionListStub,
        LabeledSection: LabeledSectionStub,
        SettingsBackButton: NullStub,
        SettingsSaveButton: NullStub
      },
      directives: { sfx: {} },
      mocks: { $t: (k) => k },
      provide: {
        [memberEditorKey]: editor,
        [settingsLayoutKey]: computed(() => 'sheet')
      }
    }
  })

  return { wrapper, editor }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TabApp', () => {
  test('renders the app container', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-app"]').exists()).toBe(true)
  })

  // Replaced UiSlider with UiSpinbox — three spinboxes must render in the audio section
  test('renders three spinbox controls in the audio section', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-app__audio"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="spinbox-stub"]')).toHaveLength(3)
  })

  test('does not render any slider controls (removed in favour of spinboxes)', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="slider-stub"]').exists()).toBe(false)
  })

  test('spinboxes reflect editor audio values', () => {
    const { wrapper } = makeTab({
      audio: { study_sounds: 3, interface_sounds: 7, hover_sounds: 1 }
    })
    const spinboxes = wrapper.findAll('[data-testid="spinbox-stub"]')
    expect(spinboxes[0].attributes('data-value')).toBe('3')
    expect(spinboxes[1].attributes('data-value')).toBe('7')
    expect(spinboxes[2].attributes('data-value')).toBe('1')
  })

  test('clicking a spinbox increments the corresponding editor audio value', async () => {
    const { wrapper, editor } = makeTab()
    await wrapper.findAll('[data-testid="spinbox-stub"]')[0].trigger('click')
    expect(editor.preferences.audio.study_sounds).toBe(6)
  })

  test('second spinbox (interface_sounds) updates independently', async () => {
    const { wrapper, editor } = makeTab()
    await wrapper.findAll('[data-testid="spinbox-stub"]')[1].trigger('click')
    expect(editor.preferences.audio.interface_sounds).toBe(6)
  })

  test('third spinbox (hover_sounds) updates independently', async () => {
    const { wrapper, editor } = makeTab()
    await wrapper.findAll('[data-testid="spinbox-stub"]')[2].trigger('click')
    expect(editor.preferences.audio.hover_sounds).toBe(6)
  })

  test('renders the left-hand toggle reflecting editor preferences', () => {
    const { wrapper } = makeTab({ accessibility: { left_hand: true } })
    const toggle = wrapper.find('[data-testid="toggle-stub"]')
    expect(toggle.exists()).toBe(true)
    expect(toggle.attributes('data-checked')).toBe('true')
  })

  test('toggling left-hand updates editor preferences', async () => {
    const { wrapper, editor } = makeTab()
    await wrapper.find('[data-testid="toggle-stub"]').trigger('click')
    expect(editor.preferences.accessibility.left_hand).toBe(true)
  })
})
