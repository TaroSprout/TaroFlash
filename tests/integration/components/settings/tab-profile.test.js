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
import { windowLayoutKey } from '@/components/layout-kit/paged-window/layout'
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
    supported_palettes: { type: Array, default: () => [] },
    palette: { default: undefined }
  },
  emits: ['update:palette'],
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
    draft: reactive({
      display_name: 'Chris',
      description: 'Hi',
      cover_config: { palette: 'green', pattern: 'bank-note' }
    }),
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
        [windowLayoutKey]: computed(() => layout)
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

  test('design wrapper carries data-palette from cover', () => {
    const { wrapper } = makeTab()
    const design = wrapper.find('[data-testid="tab-profile__design"]')
    expect(design.attributes('data-palette')).toBe('green')
  })

  test('typing into the name input updates editor.draft.display_name', async () => {
    const { wrapper, editor } = makeTab()
    const input = wrapper.findAll('input')[0]
    await input.setValue('Nina')
    expect(editor.draft.display_name).toBe('Nina')
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

  test('typing into the bio textarea updates editor.draft.description', async () => {
    const { wrapper, editor } = makeTab()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('New bio')
    expect(editor.draft.description).toBe('New bio')
  })

  test('theme-picker update:palette event mutates editor.draft.cover_config.palette', async () => {
    const { wrapper, editor } = makeTab()
    const themePicker = wrapper.findComponent(ThemePickerStub)
    themePicker.vm.$emit('update:palette', 'red')
    await wrapper.vm.$nextTick()
    expect(editor.draft.cover_config.palette).toBe('red')
  })

  test('pattern-picker update event mutates editor.draft.cover_config.pattern', async () => {
    const { wrapper, editor } = makeTab()
    wrapper.findComponent(PatternPickerStub).vm.$emit('update:pattern', 'wave')
    await wrapper.vm.$nextTick()
    expect(editor.draft.cover_config.pattern).toBe('wave')
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
    const { wrapper } = makeTab(makeEditor(), 'phone')
    const preview = wrapper.find('[data-testid="tab-profile__preview"]')
    expect(preview.exists()).toBe(true)
    expect(preview.attributes('data-stub')).toBe('member-badge')
  })

  describe('member-badge avatar edit wiring [obligation]', () => {
    afterEach(() => useModal().pop())

    test('passes editable to member-badge', () => {
      const { wrapper } = makeTab(makeEditor(), 'phone', EditableMemberBadgeStub)
      expect(wrapper.find('[data-testid="member-badge-stub"]').attributes('data-editable')).toBe(
        'true'
      )
    })

    test('emitting edit-avatar opens the avatar picker modal', async () => {
      const { wrapper } = makeTab(makeEditor(), 'phone', EditableMemberBadgeStub)

      await wrapper.find('[data-testid="member-badge-stub"]').trigger('click')

      const modal = useModal()
      expect(modal.modal_stack.value).toHaveLength(1)
      expect(modal.modal_stack.value[0].component).toBe(AvatarPickerModal)
    })
  })
})
