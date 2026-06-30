import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SettingsAside from '@/components/settings/settings-aside.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { settingsCloseKey } from '@/components/settings/layout'

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
})
