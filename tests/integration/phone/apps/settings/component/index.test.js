import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, useAttrs } from 'vue'
import { useMatchMedia } from '@/composables/use-media-query'

const { mockEditor, mockDanger, mockEmitSfx, state } = vi.hoisted(() => ({
  state: { hasSidebar: true },
  mockEditor: {
    settings: { display_name: 'Chris', description: 'hi' },
    preferences: { accessibility: { left_hand: false } },
    cover: { theme: 'green-500', theme_dark: 'green-800', pattern: 'bank-note' },
    email: { value: 'chris@example.com' },
    created_at: { value: '2026-01-01T00:00:00Z' },
    plan: { value: 'pro' },
    is_dirty: { value: false },
    saving: { value: false },
    saveMember: vi.fn().mockResolvedValue(true)
  },
  mockDanger: {
    onDeleteAccount: vi.fn(),
    deleting_account: { value: false }
  },
  mockEmitSfx: vi.fn()
}))

vi.mock('@/composables/member-editor', () => ({
  useMemberEditor: () => mockEditor,
  memberEditorKey: Symbol('memberEditor')
}))

vi.mock('@/composables/member/use-member-danger-actions', () => ({
  useMemberDangerActions: vi.fn(() => mockDanger),
  memberDangerActionsKey: Symbol('memberDangerActions')
}))

vi.mock('@/composables/use-session-ref', async () => {
  const { ref } = await import('vue')
  return {
    useSessionRef: (_key, initial) => ref(initial)
  }
})

vi.mock('@/composables/use-media-query', async () => {
  const { ref } = await import('vue')
  return {
    useMatchMedia: (query) => ref(query.includes('&') ? state.hasSidebar : false)
  }
})

vi.mock('@/phone/apps/settings/component/tab-index/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'TabIndex',
      emits: ['navigate'],
      setup(_p, { emit }) {
        return () =>
          h(
            'button',
            {
              'data-testid': 'tab-index-stub',
              onClick: () => emit('navigate', 'app')
            },
            'go'
          )
      }
    })
  }
})

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/utils/animations/slide-fade-right', () => ({
  slideFadeRightEnter: vi.fn((_el, done) => done && done()),
  slideFadeRightLeave: vi.fn((_el, done) => done && done())
}))

vi.mock('@/utils/animations/tab-height', () => ({
  tabHeightEnter: () => (_el, done) => done && done(),
  tabHeightLeave: () => (_el, done) => done && done()
}))

const PassthroughStub = defineComponent({
  name: 'PassthroughStub',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('div', { ...attrs }, slots.default?.())
  }
})

const TabIndexStub = defineComponent({
  name: 'TabIndex',
  emits: ['navigate'],
  setup(_p, { emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': 'tab-index-stub',
          onClick: () => emit('navigate', 'app')
        },
        'go'
      )
  }
})

const TabSheetStub = defineComponent({
  name: 'TabSheet',
  props: ['active', 'tabs', 'surface', 'header_border'],
  emits: ['close', 'update:active'],
  inheritAttrs: false,
  setup(props, { slots, emit, expose }) {
    // Mirror the real TabSheet: own sidebar visibility and expose it upward.
    expose({ has_sidebar: useMatchMedia('w>=lg & fine') })
    return () =>
      h(
        'div',
        {
          'data-testid': 'tab-sheet-stub',
          'data-active': props.active,
          'data-surface': props.surface,
          'data-tabs': JSON.stringify(props.tabs?.map((t) => t.value) ?? [])
        },
        [
          h('div', { 'data-testid': 'tab-sheet__header' }, slots['header-content']?.()),
          h(
            'button',
            {
              'data-testid': 'tab-sheet__emit-close',
              onClick: () => emit('close')
            },
            'close'
          ),
          h(
            'button',
            {
              'data-testid': 'tab-sheet__select-app',
              onClick: () => emit('update:active', 'app')
            },
            'app'
          ),
          h('div', { 'data-testid': 'tab-sheet__content' }, slots.default?.()),
          h('div', { 'data-testid': 'tab-sheet__overlay' }, slots.overlay?.()),
          h('div', { 'data-testid': 'tab-sheet__footer' }, slots.footer?.())
        ]
      )
  }
})

import SettingsApp from '@/phone/apps/settings/component/index.vue'

function makeWrapper() {
  return mount(SettingsApp, {
    props: { close: () => {} },
    global: {
      stubs: {
        TabSheet: TabSheetStub,
        TabIndex: TabIndexStub,
        TabProfile: PassthroughStub,
        TabSubscription: PassthroughStub,
        TabSounds: PassthroughStub,
        TabDangerZone: PassthroughStub,
        SettingsAside: PassthroughStub,
        MemberCard: PassthroughStub,
        UiButton: PassthroughStub,
        UiTagButton: PassthroughStub,
        UiIcon: PassthroughStub
      }
    }
  })
}

beforeEach(() => {
  mockEditor.is_dirty.value = false
  mockEditor.saving.value = false
  mockEditor.saveMember.mockReset().mockResolvedValue(true)
  mockEmitSfx.mockReset()
  mockDanger.onDeleteAccount.mockReset()
  state.hasSidebar = true
})

describe('settings app — tab routing', () => {
  test('forwards surface="inverted" to the underlying tab-sheet', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-surface')).toBe(
      'inverted'
    )
  })

  test('exposes the four expected tab values', () => {
    const wrapper = makeWrapper()
    const tabs = JSON.parse(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-tabs'))
    expect(tabs).toEqual(['profile', 'subscription', 'app', 'danger-zone'])
  })

  test('defaults the active sidebar tab to "profile"', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-active')).toBe('profile')
  })

  test('sidebar tab updates flip the displayed tab', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="tab-sheet__select-app"]').trigger('click')
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-active')).toBe('app')
  })
})

describe('settings app — header copy follows displayed tab', () => {
  test('renders default profile header when no tab has been selected', async () => {
    const wrapper = makeWrapper()
    // has_sidebar arrives from TabSheet via a template ref — one render late.
    await nextTick()
    expect(wrapper.find('[data-testid="settings__header-title"]').text()).toBe('Profile')
  })

  test('switches header copy when the active tab changes', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="tab-sheet__select-app"]').trigger('click')
    expect(wrapper.find('[data-testid="settings__header-title"]').text()).toBe('App')
  })
})

describe('settings app — sidebar visibility (set at mount)', () => {
  test('renders the floating member-card preview alongside the main column', () => {
    state.hasSidebar = true
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="settings__floating-preview"]').exists()).toBe(true)
  })

  test('shows the back button on mobile once a tab is selected', async () => {
    state.hasSidebar = false
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="settings__back-button"]').exists()).toBe(false)

    await wrapper.find('[data-testid="tab-sheet__select-app"]').trigger('click')
    expect(wrapper.find('[data-testid="settings__back-button"]').exists()).toBe(true)
  })

  test('back button click clears the active tab and emits the back sfx', async () => {
    state.hasSidebar = false
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="tab-sheet__select-app"]').trigger('click')

    await wrapper.find('[data-testid="settings__back-button"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.select')
    expect(wrapper.find('[data-testid="settings__back-button"]').exists()).toBe(false)
  })

  test('renders the index tab when collapsed below sidebar with no tab selected', () => {
    state.hasSidebar = false
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="tab-index-stub"]').exists()).toBe(true)
  })

  test('navigate emit from the index swaps the active tab', async () => {
    state.hasSidebar = false
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="tab-index-stub"]').trigger('click')
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-active')).toBe('app')
  })
})

describe('settings app — save footer', () => {
  test('hides the save button when the editor is not dirty', () => {
    mockEditor.is_dirty.value = false
    const wrapper = makeWrapper()
    const footer = wrapper.find('[data-testid="tab-sheet__footer"]')
    expect(footer.text()).not.toContain('Save changes')
  })

  test('shows the save button when the editor is dirty', () => {
    mockEditor.is_dirty.value = true
    const wrapper = makeWrapper()
    const footer = wrapper.find('[data-testid="tab-sheet__footer"]')
    expect(footer.text()).toContain('Save changes')
  })

  test('clicking save calls editor.saveMember and emits close on success', async () => {
    mockEditor.is_dirty.value = true
    mockEditor.saveMember.mockResolvedValue(true)
    const wrapper = makeWrapper()

    const footer = wrapper.find('[data-testid="tab-sheet__footer"]')
    await footer.find('div').trigger('click')
    await flushPromises()

    expect(mockEditor.saveMember).toHaveBeenCalledOnce()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  test('does not emit close when saveMember resolves false', async () => {
    mockEditor.is_dirty.value = true
    mockEditor.saveMember.mockResolvedValue(false)
    const wrapper = makeWrapper()

    const footer = wrapper.find('[data-testid="tab-sheet__footer"]')
    await footer.find('div').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('close')).toBeFalsy()
  })
})

describe('settings app — close', () => {
  test('re-emits close from the underlying tab-sheet', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="tab-sheet__emit-close"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
