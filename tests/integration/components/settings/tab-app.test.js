import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, reactive, useAttrs } from 'vue'
import TabApp from '@/views/settings/tab-app/index.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { settingsLayoutKey } from '@/views/settings/layout'

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn(), emitHoverSfx: vi.fn() }))
// Break config→player→config circular dep.
vi.mock('@/sfx/config', () => ({
  TYPE_SFX: [],
  SOUNDS: {},
  BUS_DEFAULTS: { interface: 5, hover: 5 }
}))

const { mockResetSettings, mockPreviewVolumeConfig } = vi.hoisted(() => ({
  mockResetSettings: vi.fn(),
  mockPreviewVolumeConfig: vi.fn()
}))
vi.mock('@/sfx/player', () => ({
  default: {
    resetSettings: mockResetSettings,
    previewVolumeConfig: mockPreviewVolumeConfig
  }
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const SliderStub = defineComponent({
  name: 'UiSlider',
  inheritAttrs: false,
  props: { modelValue: Number, min: Number, max: Number, sfx: Object, label: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h('div', {
        ...attrs,
        'data-testid': 'slider-stub',
        'data-value': String(props.modelValue),
        'data-bus': props.sfx?.bus ?? '',
        onClick: () => emit('update:modelValue', (props.modelValue ?? 0) + 1)
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

let _wrappers = []

function makeTab({ audio = {} } = {}) {
  const editor = {
    draft: reactive({
      preferences: {
        audio: { muted: false, interface_sounds: 5, hover_sounds: 5, ...audio }
      }
    })
  }

  const wrapper = mount(TabApp, {
    global: {
      stubs: {
        UiSlider: SliderStub,
        UiToggle: ToggleStub,
        SectionList: SectionListStub,
        LabeledSection: LabeledSectionStub,
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

  _wrappers.push(wrapper)
  return { wrapper, editor }
}

afterEach(() => {
  for (const w of _wrappers) w.unmount()
  _wrappers = []
  mockResetSettings.mockClear()
  mockPreviewVolumeConfig.mockClear()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TabApp', () => {
  test('renders the app container', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-app"]').exists()).toBe(true)
  })

  test('renders two slider controls in the audio section [obligation]', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-app__audio"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="slider-stub"]')).toHaveLength(2)
  })

  test('sliders reflect editor audio values', () => {
    const { wrapper } = makeTab({ audio: { interface_sounds: 7, hover_sounds: 1 } })
    const sliders = wrapper.findAll('[data-testid="slider-stub"]')
    expect(sliders[0].attributes('data-value')).toBe('7')
    expect(sliders[1].attributes('data-value')).toBe('1')
  })

  test('first slider (interface_sounds) routes sfx through interface bus', () => {
    const { wrapper } = makeTab()
    const sliders = wrapper.findAll('[data-testid="slider-stub"]')
    expect(sliders[0].attributes('data-bus')).toBe('interface')
  })

  test('second slider (hover_sounds) routes sfx through hover bus', () => {
    const { wrapper } = makeTab()
    const sliders = wrapper.findAll('[data-testid="slider-stub"]')
    expect(sliders[1].attributes('data-bus')).toBe('hover')
  })

  test('clicking first slider increments interface_sounds on the editor', async () => {
    const { wrapper, editor } = makeTab()
    await wrapper.findAll('[data-testid="slider-stub"]')[0].trigger('click')
    expect(editor.draft.preferences.audio.interface_sounds).toBe(6)
  })

  test('clicking second slider increments hover_sounds on the editor', async () => {
    const { wrapper, editor } = makeTab()
    await wrapper.findAll('[data-testid="slider-stub"]')[1].trigger('click')
    expect(editor.draft.preferences.audio.hover_sounds).toBe(6)
  })

  // ── Mute-all toggle [obligation] ──────────────────────────────────────────

  test('renders the mute-all toggle reflecting editor preferences [obligation]', () => {
    const { wrapper } = makeTab({ audio: { muted: true } })
    const toggle = wrapper.find('[data-testid="toggle-stub"]')
    expect(toggle.exists()).toBe(true)
    expect(toggle.attributes('data-checked')).toBe('true')
  })

  test('toggling mute-all updates editor preferences [obligation]', async () => {
    const { wrapper, editor } = makeTab()
    await wrapper.find('[data-testid="toggle-stub"]').trigger('click')
    expect(editor.draft.preferences.audio.muted).toBe(true)
  })

  // ── Preview/reset obligation tests ────────────────────────────────────────

  test('changing audio prefs calls previewVolumeConfig with mapped bus volumes [obligation]', async () => {
    const { editor } = makeTab()
    editor.draft.preferences.audio.interface_sounds = 8
    await nextTick()
    await nextTick()
    expect(mockPreviewVolumeConfig).toHaveBeenCalledWith(expect.objectContaining({ interface: 8 }))
  })

  test('previewVolumeConfig receives both buses on audio change, always unmuted for preview [obligation]', async () => {
    const { editor } = makeTab({ audio: { interface_sounds: 7, hover_sounds: 1, muted: true } })
    editor.draft.preferences.audio.hover_sounds = 9
    await nextTick()
    await nextTick()
    // Preview always treats audio as unmuted regardless of the mute toggle —
    // mute is only applied on save via App.vue.
    expect(mockPreviewVolumeConfig).toHaveBeenCalledWith({ interface: 7, hover: 9 })
  })

  test('unmounting the tab calls resetSettings to discard any preview [obligation]', () => {
    const { wrapper } = makeTab()
    wrapper.unmount()
    // remove from _wrappers so afterEach doesn't double-unmount
    _wrappers = _wrappers.filter((w) => w !== wrapper)
    expect(mockResetSettings).toHaveBeenCalledTimes(1)
  })
})
