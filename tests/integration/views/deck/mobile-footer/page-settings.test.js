import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const PageSettingsPanelStub = defineComponent({
  name: 'PageSettingsPanel',
  setup: () => () => h('div', { 'data-testid': 'page-settings-panel-stub' })
})

import MobilePageSettings from '@/views/deck/mobile-footer/page-settings.vue'

function mount() {
  return shallowMount(MobilePageSettings, {
    global: { stubs: { PageSettingsPanel: PageSettingsPanelStub } }
  })
}

describe('mobile-footer/page-settings', () => {
  test('renders the mobile-page-settings container', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="mobile-page-settings"]').exists()).toBe(true)
  })

  test('delegates content to the shared page-settings-panel', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="page-settings-panel-stub"]').exists()).toBe(true)
  })
})
