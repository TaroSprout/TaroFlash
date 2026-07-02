import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, inject, nextTick, useAttrs } from 'vue'
import { settingsRecedeKey, SETTINGS_SHEET_BREAKPOINTS } from '@/components/settings/layout'

// ── Hoisted state ─────────────────────────────────────────────────────────────

const { mockEditor, mockDanger, mockEmitSfx, mockAlertWarn, alertResponse, state } = vi.hoisted(
  () => {
    // alertResponse holds a resolve fn so tests control whether the user confirms.
    let _resolve = null
    const alertResponse = {
      resolve: (val) => _resolve?.(val),
      reset: () => {
        _resolve = null
      },
      _setResolve: (fn) => {
        _resolve = fn
      }
    }

    return {
      state: { isSheet: false, isDesktop: false, isPinned: false },
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
      mockEmitSfx: vi.fn(),
      mockAlertWarn: vi.fn(),
      alertResponse
    }
  }
)

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/composables/member/editor', () => ({
  useMemberEditor: () => mockEditor,
  memberEditorKey: Symbol('memberEditor')
}))

vi.mock('@/composables/member/danger-actions', () => ({
  useMemberDangerActions: vi.fn(() => mockDanger),
  memberDangerActionsKey: Symbol('memberDangerActions')
}))

vi.mock('@/composables/storage/session-ref', async () => {
  const { ref } = await import('vue')
  return {
    useSessionRef: (_key, initial) => ref(initial)
  }
})

vi.mock('@/composables/ui/media-query', async () => {
  const { ref } = await import('vue')
  return {
    // sheet_query (useTabModalLayout, 'w<mlg | h<sm') and the settings-only
    // pin check (SETTINGS_SHEET_BREAKPOINTS, 'w<mlg | h<md') are distinct
    // queries on purpose — they resolve from separate state fields so a test
    // can pin the recede/restore animation while layout_mode stays desktop/tablet.
    useMatchMedia: (query) => {
      if (query.includes('&')) return ref(state.isDesktop)
      if (
        query === `w<${SETTINGS_SHEET_BREAKPOINTS.width} | h<${SETTINGS_SHEET_BREAKPOINTS.height}`
      )
        return ref(state.isPinned)
      return ref(state.isSheet)
    }
  }
})

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: mockAlertWarn })
}))

vi.mock('@/components/settings/tab-index/index.vue', async () => {
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

vi.mock('@/utils/animations/fade', () => ({
  fadeEnter: vi.fn((_el, done) => done?.()),
  fadeLeave: vi.fn((_el, done) => done?.())
}))

vi.mock('@/utils/animations/tab-slide', () => ({
  tabSlideEnter: vi.fn(() => vi.fn((_el, done) => done?.())),
  tabSlideLeave: vi.fn(() => vi.fn((_el, done) => done?.()))
}))

const { mockRecedeModal, mockRestoreModal } = vi.hoisted(() => ({
  mockRecedeModal: vi.fn(),
  mockRestoreModal: vi.fn()
}))

vi.mock('@/utils/animations/modal', async (importOriginal) => ({
  ...(await importOriginal()),
  recedeModal: mockRecedeModal,
  restoreModal: mockRestoreModal
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

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
  props: ['active', 'tabs', 'sheetPx'],
  emits: ['close', 'update:active'],
  inheritAttrs: false,
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'tab-sheet-stub',
          'data-active': props.active,
          'data-layout': attrs['data-layout'],
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
          h(
            'button',
            {
              'data-testid': 'tab-sheet__select-subscription',
              onClick: () => emit('update:active', 'subscription')
            },
            'subscription'
          ),
          h('div', { 'data-testid': 'tab-sheet__content' }, slots.default?.()),
          h('div', { 'data-testid': 'tab-sheet__overlay' }, slots.overlay?.()),
          h('div', { 'data-testid': 'tab-sheet__footer' }, slots.footer?.())
        ]
      )
  }
})

import SettingsApp from '@/components/settings/index.vue'

const InjectRecedeStub = defineComponent({
  name: 'InjectRecedeStub',
  setup() {
    const recede = inject(settingsRecedeKey)
    return () =>
      h('div', [
        h('button', { 'data-testid': 'recede-trigger', onClick: () => recede?.recede() }),
        h('button', { 'data-testid': 'restore-trigger', onClick: () => recede?.restore() })
      ])
  }
})

// ── Factory ───────────────────────────────────────────────────────────────────

function makeWrapper(closeFn = vi.fn()) {
  return mount(SettingsApp, {
    props: { close: closeFn },
    global: {
      stubs: {
        TabSheet: TabSheetStub,
        TabIndex: TabIndexStub,
        TabProfile: PassthroughStub,
        TabSubscription: PassthroughStub,
        TabSounds: PassthroughStub,
        TabApp: PassthroughStub,
        TabDangerZone: PassthroughStub,
        SettingsAside: PassthroughStub,
        SettingsSaveButton: PassthroughStub,
        SettingsBackButton: PassthroughStub,
        MemberCard: PassthroughStub,
        UiButton: PassthroughStub,
        UiTagButton: PassthroughStub,
        UiIcon: PassthroughStub
      }
    }
  })
}

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  state.isSheet = false
  state.isDesktop = false
  state.isPinned = false
  mockEditor.is_dirty.value = false
  mockEditor.saving.value = false
  mockEditor.saveMember.mockReset().mockResolvedValue(true)
  mockEmitSfx.mockReset()
  mockDanger.onDeleteAccount.mockReset()
  mockAlertWarn.mockReset()
  alertResponse.reset()
})

// ── Tab routing ───────────────────────────────────────────────────────────────

describe('settings app — tab routing', () => {
  test('exposes the five expected tab values in the correct order', () => {
    const wrapper = makeWrapper()
    const tabs = JSON.parse(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-tabs'))
    expect(tabs).toEqual(['profile', 'app', 'review-preferences', 'subscription', 'danger-zone'])
  })

  test('defaults the active sidebar tab to "profile" on non-sheet layout', () => {
    state.isSheet = false
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-active')).toBe('profile')
  })

  test('sidebar tab updates flip the displayed tab', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="tab-sheet__select-app"]').trigger('click')
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-active')).toBe('app')
  })
})

// ── Header copy ───────────────────────────────────────────────────────────────

describe('settings app — header copy follows displayed tab', () => {
  test('renders index header on tablet layout (no tab selected) [obligation]', async () => {
    state.isSheet = false
    state.isDesktop = false
    const wrapper = makeWrapper()
    await nextTick()
    expect(wrapper.find('[data-testid="settings__header-title"]').text()).toBe('Settings')
  })

  test('renders profile header on desktop layout (no tab selected) [obligation]', async () => {
    state.isSheet = false
    state.isDesktop = true
    const wrapper = makeWrapper()
    await nextTick()
    expect(wrapper.find('[data-testid="settings__header-title"]').text()).toBe('Profile')
  })

  test('switches header copy when the active tab changes', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="tab-sheet__select-app"]').trigger('click')
    expect(wrapper.find('[data-testid="settings__header-title"]').text()).toBe('App Preferences')
  })

  test('shows the index header on sheet layout with no tab selected', () => {
    state.isSheet = true
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="settings__header-title"]').text()).toBe('Settings')
  })
})

// ── Layout mode data attribute ────────────────────────────────────────────────

describe('settings app — data-layout attribute', () => {
  test('sets data-layout="tablet" by default', () => {
    state.isSheet = false
    state.isDesktop = false
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-layout')).toBe('tablet')
  })

  test('sets data-layout="sheet" when sheet query matches', () => {
    state.isSheet = true
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-layout')).toBe('sheet')
  })

  test('sets data-layout="desktop" when desktop query matches', () => {
    state.isSheet = false
    state.isDesktop = true
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-layout')).toBe('desktop')
  })
})

// ── Overlay / aside visibility ────────────────────────────────────────────────

describe('settings app — overlay and aside visibility', () => {
  test('shows the pinned member-card preview on non-sheet layout', () => {
    state.isSheet = false
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="settings__pinned-preview"]').exists()).toBe(true)
  })

  test('hides the pinned member-card preview on sheet layout', () => {
    state.isSheet = true
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="settings__pinned-preview"]').exists()).toBe(false)
  })

  test('renders the settings-aside on non-sheet layout', () => {
    state.isSheet = false
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="settings__aside"]').exists()).toBe(true)
  })

  test('hides the settings-aside on sheet layout', () => {
    state.isSheet = true
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="settings__aside"]').exists()).toBe(false)
  })
})

// ── active_tab defaults (obligation) ─────────────────────────────────────────

describe('settings app — active_tab is plain ref, not session-persisted [obligation]', () => {
  test('active_tab defaults to null on every mount (sheet mode shows index tab) [obligation]', () => {
    state.isSheet = true
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="tab-index-stub"]').exists()).toBe(true)
  })

  test('active_tab defaults to null on every mount (tablet mode shows index tab) [obligation]', () => {
    state.isSheet = false
    state.isDesktop = false
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="tab-index-stub"]').exists()).toBe(true)
  })

  test('onBack returns to index (sheet mode) [obligation]', async () => {
    state.isSheet = true
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="tab-index-stub"]').trigger('click')
    await wrapper.vm.onBack()
    await nextTick()
    expect(wrapper.find('[data-testid="tab-index-stub"]').exists()).toBe(true)
  })
})

// ── displayed_tab resolution (obligation) ────────────────────────────────────

describe('settings app — displayed_tab resolves correctly per layout [obligation]', () => {
  test('resolves to "index" on sheet layout with no active tab [obligation]', () => {
    state.isSheet = true
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="settings__header-title"]').text()).toBe('Settings')
  })

  test('resolves to "index" on tablet layout with no active tab [obligation]', () => {
    state.isSheet = false
    state.isDesktop = false
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="settings__header-title"]').text()).toBe('Settings')
  })

  test('resolves to "profile" only on desktop layout with no active tab [obligation]', () => {
    state.isSheet = false
    state.isDesktop = true
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="settings__header-title"]').text()).toBe('Profile')
  })
})

// ── Index tab (sheet mobile entry point) ─────────────────────────────────────

describe('settings app — index tab', () => {
  test('renders the index tab on sheet layout with no tab selected', () => {
    state.isSheet = true
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="tab-index-stub"]').exists()).toBe(true)
  })

  test('navigate emit from the index tab swaps the active tab', async () => {
    state.isSheet = true
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="tab-index-stub"]').trigger('click')
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-active')).toBe('app')
  })
})

// ── Back navigation ───────────────────────────────────────────────────────────

describe('settings app — back navigation', () => {
  test('back action clears the active tab (sidebar defaults to profile)', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="tab-sheet__select-app"]').trigger('click')
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-active')).toBe('app')

    await wrapper.vm.onBack()
    await nextTick()
    expect(wrapper.find('[data-testid="tab-sheet-stub"]').attributes('data-active')).toBe('profile')
  })

  test('back action emits the snappy_button_5 sfx', async () => {
    const wrapper = makeWrapper()
    await wrapper.vm.onBack()
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })
})

// ── onClose — unsaved-changes guard ──────────────────────────────────────────

describe('settings app — close with unsaved-changes guard [obligation]', () => {
  test('calls close() immediately when editor is not dirty', async () => {
    mockEditor.is_dirty.value = false
    const close = vi.fn()
    const wrapper = makeWrapper(close)

    await wrapper.find('[data-testid="tab-sheet__emit-close"]').trigger('click')
    await flushPromises()

    expect(mockAlertWarn).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
  })

  test('shows alert when editor is dirty on close', async () => {
    mockEditor.is_dirty.value = true
    let alertResolve
    mockAlertWarn.mockReturnValue({
      response: new Promise((r) => (alertResolve = r))
    })

    const close = vi.fn()
    const wrapper = makeWrapper(close)

    await wrapper.find('[data-testid="tab-sheet__emit-close"]').trigger('click')

    expect(mockAlertWarn).toHaveBeenCalledOnce()
    expect(close).not.toHaveBeenCalled()

    // User confirms
    alertResolve(true)
    await flushPromises()
    expect(close).toHaveBeenCalledOnce()
  })

  test('does NOT call close() when user cancels the alert [obligation]', async () => {
    mockEditor.is_dirty.value = true
    let alertResolve
    mockAlertWarn.mockReturnValue({
      response: new Promise((r) => (alertResolve = r))
    })

    const close = vi.fn()
    const wrapper = makeWrapper(close)

    await wrapper.find('[data-testid="tab-sheet__emit-close"]').trigger('click')

    // User cancels
    alertResolve(false)
    await flushPromises()

    expect(close).not.toHaveBeenCalled()
  })
})

// ── Open / close sfx ──────────────────────────────────────────────────────────

describe('settings app — open/close sfx [obligation]', () => {
  test('emits snappy_button_3 on mount (open sound) [obligation]', () => {
    makeWrapper()
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_3')
  })

  test('emits snappy_button_5 on unmount (close sound) [obligation]', () => {
    const wrapper = makeWrapper()
    mockEmitSfx.mockReset()
    wrapper.unmount()
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })
})

// ── Recede/restore provide wiring ───────────────────────────────────────────────

describe('settings app — recede/restore choreography [obligation]', () => {
  function makeWrapperWithRecedeInjector(closeFn = vi.fn()) {
    return mount(SettingsApp, {
      props: { close: closeFn },
      global: {
        stubs: {
          TabSheet: TabSheetStub,
          TabIndex: TabIndexStub,
          TabProfile: PassthroughStub,
          TabSubscription: InjectRecedeStub,
          TabSounds: PassthroughStub,
          TabApp: PassthroughStub,
          TabDangerZone: PassthroughStub,
          SettingsAside: PassthroughStub,
          SettingsSaveButton: PassthroughStub,
          SettingsBackButton: PassthroughStub,
          MemberCard: PassthroughStub,
          UiButton: PassthroughStub,
          UiTagButton: PassthroughStub,
          UiIcon: PassthroughStub
        }
      }
    })
  }

  test('provides recede() calling recedeModal on the tab-sheet root element', async () => {
    mockRecedeModal.mockClear()
    const wrapper = makeWrapperWithRecedeInjector()
    await wrapper.find('[data-testid="tab-sheet__select-subscription"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="recede-trigger"]').trigger('click')

    expect(mockRecedeModal).toHaveBeenCalledOnce()
  })

  test('provides restore() calling restoreModal on the tab-sheet root element', async () => {
    mockRestoreModal.mockClear()
    const wrapper = makeWrapperWithRecedeInjector()
    await wrapper.find('[data-testid="tab-sheet__select-subscription"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="restore-trigger"]').trigger('click')

    expect(mockRestoreModal).toHaveBeenCalledOnce()
  })

  test("[obligation] uses SETTINGS_SHEET_BREAKPOINTS pin check, not layout_mode's own sheet_query — recedes with is_pinned true even while layout_mode resolves tablet/desktop", async () => {
    // sheet_query ('w<mlg | h<sm') resolves false here so layout_mode is tablet/desktop,
    // but the narrower SETTINGS_SHEET_BREAKPOINTS pin query still resolves true.
    state.isSheet = false
    state.isDesktop = false
    state.isPinned = true
    mockRecedeModal.mockClear()

    const wrapper = makeWrapperWithRecedeInjector()
    await wrapper.find('[data-testid="tab-sheet__select-subscription"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="recede-trigger"]').trigger('click')

    expect(mockRecedeModal).toHaveBeenCalledWith(expect.anything(), true)
  })

  test('[obligation] recedes with is_pinned false when below the narrower SETTINGS_SHEET_BREAKPOINTS threshold', async () => {
    state.isSheet = false
    state.isDesktop = false
    state.isPinned = false
    mockRecedeModal.mockClear()

    const wrapper = makeWrapperWithRecedeInjector()
    await wrapper.find('[data-testid="tab-sheet__select-subscription"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="recede-trigger"]').trigger('click')

    expect(mockRecedeModal).toHaveBeenCalledWith(expect.anything(), false)
  })
})
