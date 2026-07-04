import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const MobileDockStub = defineComponent({
  name: 'MobileDock',
  setup:
    (_p, { slots }) =>
    () =>
      h('div', { 'data-testid': 'mobile-dock-stub' }, slots.default?.())
})

const CrossfadeResizeStub = defineComponent({
  name: 'CrossfadeResize',
  setup:
    (_p, { slots, attrs }) =>
    () =>
      h('div', { ...attrs }, slots.default?.())
})

const MobileEditorStub = defineComponent({
  name: 'MobileEditor',
  setup: () => () => h('div', { 'data-testid': 'mobile-editor-stub' })
})

const MobilePageSettingsStub = defineComponent({
  name: 'MobilePageSettings',
  setup: () => () => h('div', { 'data-testid': 'mobile-page-settings-stub' })
})

const FooterActionsStub = defineComponent({
  name: 'FooterActions',
  setup: () => () => h('div', { 'data-testid': 'footer-actions-stub' })
})

const FooterBulkActionsStub = defineComponent({
  name: 'FooterBulkActions',
  setup: () => () => h('div', { 'data-testid': 'footer-bulk-actions-stub' })
})

import MobileFooter from '@/views/deck/mobile-footer/index.vue'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { cardEditorKey } from '@/views/deck/composables'

function mount({ editor_open = false, page_settings_open = false, is_selecting = false } = {}) {
  return shallowMount(MobileFooter, {
    global: {
      provide: {
        [mobileCardEditorKey]: { open: ref(editor_open) },
        [deckViewShellKey]: { is_page_settings_open: ref(page_settings_open) },
        [cardEditorKey]: { selection: { is_selecting: ref(is_selecting) } }
      },
      stubs: {
        MobileDock: MobileDockStub,
        CrossfadeResize: CrossfadeResizeStub,
        MobileEditor: MobileEditorStub,
        MobilePageSettings: MobilePageSettingsStub,
        FooterActions: FooterActionsStub,
        FooterBulkActions: FooterBulkActionsStub
      }
    }
  })
}

describe('mobile-footer/index', () => {
  test('shows footer-actions by default (nothing open)', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="footer-actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mobile-editor-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mobile-page-settings-stub"]').exists()).toBe(false)
  })

  test('shows mobile-editor when the card editor is open, regardless of page settings', () => {
    const wrapper = mount({ editor_open: true, page_settings_open: true })
    expect(wrapper.find('[data-testid="mobile-editor-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mobile-page-settings-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="footer-actions-stub"]').exists()).toBe(false)
  })

  test('shows mobile-page-settings when is_page_settings_open is true and editor is closed [obligation]', () => {
    const wrapper = mount({ editor_open: false, page_settings_open: true })
    expect(wrapper.find('[data-testid="mobile-page-settings-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="footer-actions-stub"]').exists()).toBe(false)
  })

  test('editor takes priority over page settings when both are open [obligation]', () => {
    const wrapper = mount({ editor_open: true, page_settings_open: true })
    expect(wrapper.find('[data-testid="mobile-editor-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mobile-page-settings-stub"]').exists()).toBe(false)
  })

  test('shows footer-bulk-actions when selecting and editor is closed', () => {
    const wrapper = mount({ is_selecting: true })
    expect(wrapper.find('[data-testid="footer-bulk-actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="footer-actions-stub"]').exists()).toBe(false)
  })

  test('editor takes priority over bulk-actions when both are open', () => {
    const wrapper = mount({ editor_open: true, is_selecting: true })
    expect(wrapper.find('[data-testid="mobile-editor-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="footer-bulk-actions-stub"]').exists()).toBe(false)
  })

  test('bulk-actions takes priority over page settings when both are open', () => {
    const wrapper = mount({ is_selecting: true, page_settings_open: true })
    expect(wrapper.find('[data-testid="footer-bulk-actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mobile-page-settings-stub"]').exists()).toBe(false)
  })
})
