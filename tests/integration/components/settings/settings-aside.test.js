import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const { memberState } = vi.hoisted(() => ({ memberState: { email: 'chris@example.com' } }))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({
    get email() {
      return memberState.email
    }
  })
}))

const { mockOnAccountAccessClick } = vi.hoisted(() => ({
  mockOnAccountAccessClick: vi.fn()
}))

vi.mock('@/views/settings/use-account-access-click', () => ({
  useAccountAccessClick: () => ({ onAccountAccessClick: mockOnAccountAccessClick })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: vi.fn(), success: vi.fn(), warn: vi.fn() })
}))

import SettingsAside from '@/views/settings/settings-aside.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { settingsCloseKey } from '@/views/settings/layout'

function makeEditor() {
  return {
    settings: { display_name: 'Chris', description: '' },
    cover: { theme: 'green-500', theme_dark: 'green-800', pattern: 'bank-note' },
    is_dirty: ref(false),
    saving: ref(false),
    saveMember: vi.fn().mockResolvedValue(false)
  }
}

function makeWrapper(editor = makeEditor()) {
  const close = vi.fn()
  const wrapper = mount(SettingsAside, {
    global: {
      provide: {
        [memberEditorKey]: editor,
        [settingsCloseKey]: close
      },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, close }
}

describe('SettingsAside', () => {
  test('renders the aside root', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="settings-aside"]').exists()).toBe(true)
  })

  test('renders the save button', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="settings__save-button"]').exists()).toBe(true)
  })

  test('renders the member store email in the account-info row', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="settings-aside__email-row"]').text()).toContain(
      memberState.email
    )
  })

  test('pressing the edit-account button invokes onAccountAccessClick', async () => {
    mockOnAccountAccessClick.mockClear()
    const { wrapper } = makeWrapper()
    await wrapper.find('[data-testid="settings-aside__edit-account-button"]').trigger('click')
    expect(mockOnAccountAccessClick).toHaveBeenCalledOnce()
  })

  test('the edit-account button surfaces its label as a tooltip on focus', async () => {
    const { wrapper } = makeWrapper()
    const button = wrapper.find('[data-testid="settings-aside__edit-account-button"]')
    await button.trigger('focusin')
    const tooltip = document.body.querySelector('[data-testid="ui-tooltip"]')
    expect(tooltip?.textContent).toBe('Edit')
  })
})
