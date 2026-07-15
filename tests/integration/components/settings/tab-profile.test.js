import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, useAttrs } from 'vue'

vi.mock('@/composables/ui/media-query', async () => {
  const m = await import('../../../helpers/responsive-mock')
  return m.responsiveMockModule
})

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: vi.fn(), success: vi.fn(), warn: vi.fn() })
}))

import { resetResponsive } from '../../../helpers/responsive-mock'
import TabProfile from '@/views/settings/tab-profile/index.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { settingsLayoutKey } from '@/views/settings/layout'
import { useModal } from '@/composables/modal'
import AvatarPickerModal from '@/components/member/avatar-picker-modal.vue'
import { computed } from 'vue'

const InputStub = defineComponent({
  name: 'UiInput',
  props: {
    value: { type: String, default: '' },
    maxLength: { type: Number, default: undefined }
  },
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h('input', {
        ...attrs,
        maxlength: props.maxLength,
        value: props.value,
        onInput: (e) => emit('update:value', e.target.value)
      })
  }
})

const MemberBadgeStub = defineComponent({
  name: 'MemberBadge',
  inheritAttrs: false,
  setup() {
    const attrs = useAttrs()
    // Preserve the outer data-testid (tab-profile__preview) from the source template
    // and add data-stub so tests can also assert the rendered component is member-badge.
    return () => h('div', { ...attrs, 'data-stub': 'member-badge' })
  }
})

const EditableMemberBadgeStub = defineComponent({
  name: 'MemberBadge',
  inheritAttrs: false,
  props: { editable: Boolean },
  emits: ['edit-avatar'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        'data-testid': 'member-badge-stub',
        'data-editable': String(!!props.editable),
        onClick: () => emit('edit-avatar')
      })
  }
})

const ThemePickerStub = defineComponent({
  name: 'UiThemePicker',
  props: {
    label: { type: String, default: '' },
    supported_themes: { type: Array, default: () => [] },
    theme: { default: undefined },
    theme_dark: { default: undefined }
  },
  emits: ['update:theme', 'update:theme_dark'],
  setup(props) {
    return () => h('div', { 'data-testid': 'theme-picker-stub', 'data-label': props.label })
  }
})

const PatternPickerStub = defineComponent({
  name: 'UiPatternPicker',
  props: {
    label: { type: String, default: '' },
    supported_patterns: { type: Array, default: () => [] },
    selected_pattern: { default: undefined }
  },
  emits: ['update:pattern'],
  setup(props) {
    return () => h('div', { 'data-testid': 'pattern-picker-stub', 'data-label': props.label })
  }
})

function makeEditor() {
  return {
    settings: reactive({ display_name: 'Chris', description: 'Hi' }),
    cover: reactive({ theme: 'green-500', theme_dark: 'green-800', pattern: 'bank-note' }),
    email: ref('chris@example.com'),
    created_at: ref('2024-04-15T00:00:00Z'),
    plan: ref('free'),
    is_dirty: ref(false),
    has_name: ref(true),
    name_error: ref(undefined),
    saving: ref(false),
    saveMember: () => Promise.resolve(false)
  }
}

function makeTab(editor = makeEditor(), layout = 'tablet', member_badge_stub = MemberBadgeStub) {
  const wrapper = mount(TabProfile, {
    global: {
      provide: {
        [memberEditorKey]: editor,
        [settingsLayoutKey]: computed(() => layout)
      },
      stubs: {
        UiInput: InputStub,
        MemberBadge: member_badge_stub,
        UiThemePicker: ThemePickerStub,
        UiPatternPicker: PatternPickerStub
      },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, editor }
}

describe('TabProfile', () => {
  beforeEach(() => resetResponsive())

  test('renders the profile container with theme + pattern design section', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-profile"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-profile__design"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="theme-picker-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="pattern-picker-stub"]').exists()).toBe(true)
  })

  test('design wrapper carries data-theme + data-theme-dark from cover', () => {
    const { wrapper } = makeTab()
    const design = wrapper.find('[data-testid="tab-profile__design"]')
    expect(design.attributes('data-theme')).toBe('green-500')
    expect(design.attributes('data-theme-dark')).toBe('green-800')
  })

  test('typing into the name input updates editor.settings.display_name', async () => {
    const { wrapper, editor } = makeTab()
    const input = wrapper.findAll('input')[0]
    await input.setValue('Nina')
    expect(editor.settings.display_name).toBe('Nina')
  })

  test('name input carries MEMBER_DISPLAY_NAME_MAX_LENGTH as maxlength', () => {
    const { wrapper } = makeTab()
    const input = wrapper.findAll('input')[0]
    expect(input.attributes('maxlength')).toBe('12')
  })

  test('name input error reflects editor.name_error.value [obligation]', async () => {
    const editor = makeEditor()
    editor.name_error.value = 'Give this member a name'
    const { wrapper } = makeTab(editor)
    const input = wrapper.findAll('input')[0]
    expect(input.attributes('error')).toBe('Give this member a name')
  })

  test('typing into the bio textarea updates editor.settings.description', async () => {
    const { wrapper, editor } = makeTab()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('New bio')
    expect(editor.settings.description).toBe('New bio')
  })

  test('theme-picker update events mutate editor.cover theme + theme_dark', async () => {
    const { wrapper, editor } = makeTab()
    const themePicker = wrapper.findComponent(ThemePickerStub)
    themePicker.vm.$emit('update:theme', 'red-500')
    themePicker.vm.$emit('update:theme_dark', 'red-700')
    await wrapper.vm.$nextTick()
    expect(editor.cover.theme).toBe('red-500')
    expect(editor.cover.theme_dark).toBe('red-700')
  })

  test('pattern-picker update event mutates editor.cover.pattern', async () => {
    const { wrapper, editor } = makeTab()
    wrapper.findComponent(PatternPickerStub).vm.$emit('update:pattern', 'wave')
    await wrapper.vm.$nextTick()
    expect(editor.cover.pattern).toBe('wave')
  })

  test('hides the inline member-badge preview on desktop', () => {
    const { wrapper } = makeTab(makeEditor(), 'desktop')
    expect(wrapper.find('[data-testid="tab-profile__preview"]').exists()).toBe(false)
  })

  test('hides the inline member-badge preview on tablet', () => {
    const { wrapper } = makeTab(makeEditor(), 'tablet')
    expect(wrapper.find('[data-testid="tab-profile__preview"]').exists()).toBe(false)
  })

  test('shows member-badge (not member-card) preview on sheet layout [obligation]', () => {
    const { wrapper } = makeTab(makeEditor(), 'sheet')
    const preview = wrapper.find('[data-testid="tab-profile__preview"]')
    expect(preview.exists()).toBe(true)
    expect(preview.attributes('data-stub')).toBe('member-badge')
  })

  describe('member-badge avatar edit wiring [obligation]', () => {
    afterEach(() => useModal().pop())

    test('passes editable to member-badge', () => {
      const { wrapper } = makeTab(makeEditor(), 'sheet', EditableMemberBadgeStub)
      expect(wrapper.find('[data-testid="member-badge-stub"]').attributes('data-editable')).toBe(
        'true'
      )
    })

    test('emitting edit-avatar opens the avatar picker modal', async () => {
      const { wrapper } = makeTab(makeEditor(), 'sheet', EditableMemberBadgeStub)

      await wrapper.find('[data-testid="member-badge-stub"]').trigger('click')

      const modal = useModal()
      expect(modal.modal_stack.value).toHaveLength(1)
      expect(modal.modal_stack.value[0].component).toBe(AvatarPickerModal)
    })
  })
})
