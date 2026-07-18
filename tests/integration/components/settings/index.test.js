import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, computed } from 'vue'

// ── Hoisted state ─────────────────────────────────────────────────────────────

const { mockEditor, mockDanger, mockEmitSfx, mockAlertWarn, mockAccountAccessOnChromeBack } =
  vi.hoisted(() => ({
    mockEditor: {
      draft: {
        display_name: 'Chris',
        description: 'hi',
        preferences: { accessibility: { left_hand: false } },
        cover_config: { theme: 'green-500', theme_dark: 'green-800', pattern: 'bank-note' }
      },
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
    mockAccountAccessOnChromeBack: vi.fn()
  }))

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
  return { useSessionRef: (_key, initial) => ref(initial) }
})

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: mockAlertWarn })
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/views/settings/tab-profile/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'TabProfile',
      setup: () => () => h('div', { 'data-testid': 'tab-profile-stub' })
    })
  }
})

vi.mock('@/views/settings/tab-app/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'TabApp',
      setup: () => () => h('div', { 'data-testid': 'tab-app-stub' })
    })
  }
})

vi.mock('@/views/settings/tab-danger-zone/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'TabDangerZone',
      setup: () => () => h('div', { 'data-testid': 'tab-danger-zone-stub' })
    })
  }
})

vi.mock('@/views/settings/tab-subscription/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'TabSubscription',
      setup: () => () => h('div', { 'data-testid': 'tab-subscription-stub' })
    })
  }
})

vi.mock('@/views/settings/tab-account-access/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'TabAccountAccess',
      setup(_p, { expose }) {
        expose({ onChromeBack: mockAccountAccessOnChromeBack })
        return () => h('div', { 'data-testid': 'tab-account-access-stub' })
      }
    })
  }
})

vi.mock('@/views/settings/settings-aside.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ name: 'SettingsAside', setup: () => () => h('div') }) }
})

vi.mock('@/views/settings/settings-save-button.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ name: 'SettingsSaveButton', setup: () => () => h('div') }) }
})

// ── PagedWindow stub ──────────────────────────────────────────────────────────
// Settings' own routing/chrome-back wiring is under test; paged-window's own
// pages/directory/back-mode behavior is covered in
// tests/integration/components/layout-kit/paged-window/index.test.js.

const PagedWindowStub = defineComponent({
  name: 'PagedWindow',
  props: {
    active: { type: String, default: null },
    pages: { type: Array, default: () => [] },
    groups: { type: Array, default: () => [] }
  },
  emits: ['close', 'back', 'select', 'reselect', 'update:active'],
  setup(props, { slots, emit, expose }) {
    const displayed_page = computed(() => props.active ?? 'directory')
    expose({
      layout_mode: computed(() => 'desktop'),
      displayed_page,
      has_sidebar: computed(() => true)
    })

    return () =>
      h('div', { 'data-testid': 'paged-window-stub' }, [
        h('div', { 'data-testid': 'pw__header-content' }, slots['header-content']?.()),
        h('button', { 'data-testid': 'pw__close', onClick: () => emit('close') }, 'close'),
        h('button', { 'data-testid': 'pw__back', onClick: () => emit('back') }, 'back'),
        h(
          'button',
          {
            'data-testid': 'pw__select-account-access',
            onClick: () => emit('update:active', 'account-access')
          },
          'account-access'
        ),
        h('div', { 'data-testid': 'pw__aside' }, slots.aside?.()),
        h('div', { 'data-testid': 'pw__overlay' }, slots.overlay?.()),
        h(
          'div',
          { 'data-testid': 'pw__default' },
          slots.default?.({ displayed_page: displayed_page.value })
        )
      ])
  }
})

import SettingsApp from '@/views/settings/index.vue'
import { useModal } from '@/composables/modal'
import AvatarPickerModal from '@/components/member/avatar-picker-modal.vue'

const MemberCardStub = defineComponent({
  name: 'MemberCard',
  inheritAttrs: false,
  props: { editable: Boolean },
  emits: ['edit-avatar'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        'data-testid': 'member-card-stub',
        'data-editable': String(!!props.editable),
        onClick: () => emit('edit-avatar')
      })
  }
})

// ── Factory ───────────────────────────────────────────────────────────────────

function makeWrapper(closeFn = vi.fn(), member_card_stub) {
  return mount(SettingsApp, {
    props: { close: closeFn },
    global: {
      stubs: {
        PagedWindow: PagedWindowStub,
        ...(member_card_stub ? { MemberCard: member_card_stub } : {})
      }
    }
  })
}

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockEditor.is_dirty.value = false
  mockEditor.saving.value = false
  mockEditor.saveMember.mockReset().mockResolvedValue(true)
  mockEmitSfx.mockReset()
  mockDanger.onDeleteAccount.mockReset()
  mockAlertWarn.mockReset()
  mockAccountAccessOnChromeBack.mockReset()
})

// ── pages composition ───────────────────────────────────────────────────────

describe('settings app — pages composition [obligation]', () => {
  test('exposes the four sidebar pages in the expected order, excluding account-access', () => {
    const wrapper = makeWrapper()
    const pw = wrapper.findComponent({ name: 'PagedWindow' })
    const sidebar_values = pw
      .props('pages')
      .filter((p) => p.sidebar !== false)
      .map((p) => p.value)
    expect(sidebar_values).toEqual(['profile', 'app', 'subscription', 'danger-zone'])
  })

  test('account-access is present in the registry but marked sidebar: false', () => {
    const wrapper = makeWrapper()
    const pw = wrapper.findComponent({ name: 'PagedWindow' })
    const account_access = pw.props('pages').find((p) => p.value === 'account-access')
    expect(account_access).toBeTruthy()
    expect(account_access.sidebar).toBe(false)
  })
})

// ── Header copy ───────────────────────────────────────────────────────────────

describe('settings app — header copy is static across tabs [obligation]', () => {
  test('renders the static header title with no tab selected', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="settings__header-title"]').text()).toBe('App Settings')
  })

  test('header copy stays the same when the active tab changes', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="pw__select-account-access"]').trigger('click')
    expect(wrapper.find('[data-testid="settings__header-title"]').text()).toBe('App Settings')
  })
})

// ── active_tab defaults ───────────────────────────────────────────────────────

describe('settings app — active_tab is a plain, non-persisted ref [obligation]', () => {
  test('defaults to null on every mount', () => {
    const wrapper = makeWrapper()
    expect(wrapper.vm.active_tab).toBe(null)
  })

  test('a second mount starts fresh, with no cross-mount state leak', () => {
    const w1 = makeWrapper()
    w1.vm.active_tab = 'app'
    w1.unmount()

    const w2 = makeWrapper()
    expect(w2.vm.active_tab).toBe(null)
  })
})

// ── Back navigation ───────────────────────────────────────────────────────────

describe('settings app — back navigation', () => {
  test('onBack clears the active tab and plays the snappy_button_5 sfx', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    await wrapper.find('[data-testid="pw__select-account-access"]').trigger('click')
    expect(wrapper.vm.active_tab).toBe('account-access')

    await wrapper.vm.onBack()

    expect(wrapper.vm.active_tab).toBe(null)
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  test('the paged-window back emit routes to onChromeBack, clearing the active tab', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    await wrapper.find('[data-testid="pw__select-account-access"]').trigger('click')

    await wrapper.find('[data-testid="pw__back"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.active_tab).toBe(null)
  })
})

// ── onChromeBack delegation [obligation] ──────────────────────────────────────

describe('settings app — onChromeBack delegates to the active tab first [obligation]', () => {
  test('falls through to the default exit when the active tab has no onChromeBack', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    await wrapper.find('[data-testid="pw__select-account-access"]').trigger('click')

    // account-access's onChromeBack defaults to returning false in this suite
    // until a test overrides it — falling through clears active_tab.
    mockAccountAccessOnChromeBack.mockReturnValue(false)
    await wrapper.vm.onChromeBack()

    expect(wrapper.vm.active_tab).toBe(null)
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  test('stays on the tab when the active tab onChromeBack returns true (handled locally)', async () => {
    mockAccountAccessOnChromeBack.mockReturnValue(true)
    const wrapper = makeWrapper()
    await flushPromises()
    await wrapper.find('[data-testid="pw__select-account-access"]').trigger('click')

    mockEmitSfx.mockClear()
    await wrapper.vm.onChromeBack()

    expect(mockAccountAccessOnChromeBack).toHaveBeenCalledOnce()
    expect(wrapper.vm.active_tab).toBe('account-access')
    // Sound still plays even when a nested tab handles its own back-navigation.
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })
})

// ── onClose — unsaved-changes guard ──────────────────────────────────────────

describe('settings app — close with unsaved-changes guard', () => {
  test('calls close() immediately when editor is not dirty', async () => {
    mockEditor.is_dirty.value = false
    const close = vi.fn()
    const wrapper = makeWrapper(close)

    await wrapper.find('[data-testid="pw__close"]').trigger('click')
    await flushPromises()

    expect(mockAlertWarn).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
  })

  test('shows alert when editor is dirty on close, and closes only on confirm', async () => {
    mockEditor.is_dirty.value = true
    let alertResolve
    mockAlertWarn.mockReturnValue({ response: new Promise((r) => (alertResolve = r)) })

    const close = vi.fn()
    const wrapper = makeWrapper(close)

    await wrapper.find('[data-testid="pw__close"]').trigger('click')

    expect(mockAlertWarn).toHaveBeenCalledOnce()
    expect(close).not.toHaveBeenCalled()

    alertResolve(true)
    await flushPromises()
    expect(close).toHaveBeenCalledOnce()
  })

  test('does NOT call close() when the user cancels the alert', async () => {
    mockEditor.is_dirty.value = true
    let alertResolve
    mockAlertWarn.mockReturnValue({ response: new Promise((r) => (alertResolve = r)) })

    const close = vi.fn()
    const wrapper = makeWrapper(close)

    await wrapper.find('[data-testid="pw__close"]').trigger('click')
    alertResolve(false)
    await flushPromises()

    expect(close).not.toHaveBeenCalled()
  })
})

// ── Open / close sfx ──────────────────────────────────────────────────────────

describe('settings app — open/close sfx', () => {
  test('emits snappy_button_3 on mount', () => {
    makeWrapper()
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_3')
  })

  test('emits pop_up_close on unmount', () => {
    const wrapper = makeWrapper()
    mockEmitSfx.mockReset()
    wrapper.unmount()
    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
  })
})

// ── member-card avatar edit wiring ────────────────────────────────────────────

describe('settings app — member-card avatar edit wiring', () => {
  afterEach(() => useModal().pop())

  test('passes editable to member-card', async () => {
    const wrapper = makeWrapper(vi.fn(), MemberCardStub)
    await flushPromises()
    expect(wrapper.find('[data-testid="member-card-stub"]').attributes('data-editable')).toBe(
      'true'
    )
  })

  test('emitting edit-avatar on member-card opens the avatar picker modal', async () => {
    const wrapper = makeWrapper(vi.fn(), MemberCardStub)
    await flushPromises()

    await wrapper.find('[data-testid="member-card-stub"]').trigger('click')

    const modal = useModal()
    expect(modal.modal_stack.value).toHaveLength(1)
    expect(modal.modal_stack.value[0].component).toBe(AvatarPickerModal)
  })
})
