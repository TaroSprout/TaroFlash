import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SettingsAside from '@/phone/apps/settings/component/settings-aside.vue'
import { memberEditorKey } from '@/composables/member/editor'

const LOCALE = 'en-us'

function fmt(iso) {
  return new Intl.DateTimeFormat(LOCALE, { month: 'short', year: 'numeric' }).format(new Date(iso))
}

function makeEditor({
  display_name = 'Chris',
  created_at = '2024-04-15T00:00:00Z',
  plan = 'free'
} = {}) {
  return {
    settings: { display_name, description: '' },
    cover: { theme: 'green-500', theme_dark: 'green-800', pattern: 'bank-note' },
    email: ref(''),
    created_at: ref(created_at),
    plan: ref(plan),
    is_dirty: ref(false),
    saving: ref(false),
    saveMember: () => Promise.resolve(false)
  }
}

function makeWrapper(editor = makeEditor()) {
  return mount(SettingsAside, {
    global: { provide: { [memberEditorKey]: editor } }
  })
}

describe('SettingsAside — title', () => {
  test('renders display_name when present', () => {
    const wrapper = makeWrapper(makeEditor({ display_name: 'Chris' }))
    expect(wrapper.find('[data-testid="settings-aside__title"]').text()).toBe('Chris')
  })

  test('falls back to preview.title-fallback locale when display_name empty', () => {
    const wrapper = makeWrapper(makeEditor({ display_name: '' }))
    expect(wrapper.find('[data-testid="settings-aside__title"]').text()).toBe('Member')
  })
})

describe('SettingsAside — meta', () => {
  test('renders plan label from injected editor', () => {
    const wrapper = makeWrapper(makeEditor({ plan: 'paid' }))
    expect(wrapper.find('[data-testid="settings-aside__plan"]').text()).toBe('paid')
  })

  test('renders month + year for valid created_at', () => {
    const iso = '2024-04-15T00:00:00Z'
    const wrapper = makeWrapper(makeEditor({ created_at: iso }))
    expect(wrapper.find('[data-testid="settings-aside__joined-on"]').text()).toBe(fmt(iso))
  })

  test('falls back to title-fallback locale when created_at empty', () => {
    const wrapper = makeWrapper(makeEditor({ created_at: '' }))
    expect(wrapper.find('[data-testid="settings-aside__joined-on"]').text()).toBe('Member')
  })

  test('falls back to title-fallback locale when created_at unparseable', () => {
    const wrapper = makeWrapper(makeEditor({ created_at: 'not-a-date' }))
    expect(wrapper.find('[data-testid="settings-aside__joined-on"]').text()).toBe('Member')
  })
})
